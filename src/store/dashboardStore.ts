import { create } from 'zustand';
import { Project, DriveFile, BookingMatch, isOrderForProject } from '../types/project';
import { OpenOrder } from '../types/openOrder';
import {
  listAllFilesRecursive,
  downloadFileAsArrayBuffer,
  exportGoogleSheetAsXlsx,
  getFileType,
  isAuthenticated,
} from '../services/googleDrive';
import { parsePDF, pdfDataToProject, extractProjectInfoFromFilename } from '../services/pdfParser';
import { parseBookingsExcel, parseOpenOrdersExcel, bookingsToProjectData } from '../services/excelParser';
import { analyzeProjectWithGemini } from '../services/geminiService';

interface DashboardState {
  projects: Project[];
  openOrders: OpenOrder[];
  isLoading: boolean;
  isPolling: boolean;
  lastSync: Date | null;
  syncError: string | null;
  knownFileIds: Set<string>;
  knownFileMTimes: Map<string, string>;
  selectedProjectId: string | null;
  pollingIntervalId: any;

  // Actions
  setSelectedProject: (id: string | null) => void;
  startPolling: () => void;
  stopPolling: () => void;
  syncNow: () => Promise<void>;
  updateOpenOrder: (order: OpenOrder) => void;
  addOpenOrder: (order: Omit<OpenOrder, 'id'>) => void;
  deleteOpenOrder: (id: string) => void;
}

const POLL_INTERVAL_MS = Math.max(300, Number(import.meta.env.VITE_POLL_INTERVAL) || 300) * 1000;

export const useDashboardStore = create<DashboardState>((set, get) => ({
  projects: [],
  openOrders: [],
  isLoading: false,
  isPolling: false,
  lastSync: null,
  syncError: null,
  knownFileIds: new Set(),
  knownFileMTimes: new Map(),
  selectedProjectId: null,
  pollingIntervalId: null,

  setSelectedProject: (id) => set({ selectedProjectId: id }),

  startPolling: () => {
    const { pollingIntervalId, syncNow } = get();
    
    // Safety: Clear any existing active interval before starting a new one
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
    }

    // Immediate first sync
    syncNow();

    const intervalId = setInterval(() => {
      if (isAuthenticated()) {
        syncNow();
      }
    }, POLL_INTERVAL_MS);

    set({ isPolling: true, pollingIntervalId: intervalId });
  },

  stopPolling: () => {
    const { pollingIntervalId } = get();
    if (pollingIntervalId) clearInterval(pollingIntervalId);
    set({ isPolling: false, pollingIntervalId: null });
  },

  syncNow: async () => {
    if (get().isLoading) {
      console.log('[Sync] Synchronisierung läuft bereits. Überspringe diesen Durchlauf.');
      return;
    }
    console.log('[Sync] Synchronisierungs-Prozess gestartet...');
    if (!isAuthenticated()) {
      console.log('[Sync] Abgebrochen: Nicht authentifiziert.');
      return;
    }
    set({ isLoading: true, syncError: null });

    try {
      const allFiles = await listAllFilesRecursive();
      console.log('[Sync] Google Drive Dateien gefunden:', allFiles.map(f => ({ name: f.name, id: f.id, mime: f.mimeType })));
      
      let { knownFileIds, knownFileMTimes } = get();

      // Detect if any known files were deleted, or if mock data is still present
      const currentFileIds = new Set(allFiles.map((f) => f.id));
      const hasDeletions = [...knownFileIds].some((id) => !currentFileIds.has(id));
      const hasMockData = get().projects.some((p) => p.id.startsWith('mock-'));

      const forceFullRebuild = hasDeletions || hasMockData;
      console.log('[Sync] forceFullRebuild:', forceFullRebuild, '(hasDeletions:', hasDeletions, 'hasMockData:', hasMockData, ')');

      if (forceFullRebuild) {
        // Clear caches to force a full re-download and re-parse of remaining files
        knownFileIds = new Set<string>();
        knownFileMTimes = new Map<string, string>();
      }

      const newOrChanged: DriveFile[] = allFiles.filter(
        (f) => !knownFileIds.has(f.id) || knownFileMTimes.get(f.id) !== f.modifiedTime
      );
      console.log('[Sync] Neue oder geänderte Dateien:', newOrChanged.map(f => f.name));

      if (newOrChanged.length === 0 && !forceFullRebuild) {
        console.log('[Sync] Keine Änderungen erkannt. Beende Sync.');
        set({ isLoading: false, lastSync: new Date() });
        return;
      }

      // Update known files
      const updatedIds = new Set(knownFileIds);
      const updatedMTimes = new Map(knownFileMTimes);
      for (const f of newOrChanged) {
        updatedIds.add(f.id);
        updatedMTimes.set(f.id, f.modifiedTime);
      }
      set({ knownFileIds: updatedIds, knownFileMTimes: updatedMTimes });

      // Process files - only create projects for actual proposals (Antrag / Projektantrag)
      const pdfs = newOrChanged.filter((f) => 
        getFileType(f) === 'pdf' && 
        (f.name.toLowerCase().startsWith('antrag') || f.name.toLowerCase().startsWith('projektantrag'))
      );
      const excels = newOrChanged.filter((f) => getFileType(f) === 'excel' || getFileType(f) === 'gsheet');
      console.log('[Sync] Alle neuen oder geänderten Excel/GSheet-Dateien:', excels.map(f => f.name));
      const openOrderFile = excels.find((f) =>
        f.name.toLowerCase().includes('offen') || f.name.toLowerCase().includes('auftrag') || f.name.toLowerCase().includes('bestell')
      );
      if (openOrderFile) {
        console.log('[Sync] Datei für offene Aufträge identifiziert:', openOrderFile.name);
      } else {
        console.warn('[Sync] Keine neue/geänderte Datei für offene Aufträge identifiziert (Stichworte: "offen", "auftrag", "bestell").');
      }
      const bookingFiles = excels.filter((f) => f.id !== openOrderFile?.id);

      let updatedProjects = forceFullRebuild
        ? []
        : get().projects.filter((p) => !p.id.startsWith('mock-'));
      let updatedOpenOrders = forceFullRebuild ? [] : get().openOrders;

      // Process PDFs → new projects
      for (const pdf of pdfs) {
        try {
          const buffer = await downloadFileAsArrayBuffer(pdf.id);
          const parsed = await parsePDF(buffer);
          const projectData = pdfDataToProject(parsed, pdf.id, pdf.name);

          let budgetPlan = projectData.budgetPlan || 0;
          
          // 1. Check if budget is in filename (e.g. (250T €))
          if (budgetPlan === 0 && pdf.name) {
            const fileBudgetMatch = pdf.name.match(/\((\d+(?:\.\d+)?)\s*(T)?\s*€\)/i);
            if (fileBudgetMatch) {
              budgetPlan = parseFloat(fileBudgetMatch[1].replace(/\./g, ''));
              if (fileBudgetMatch[2]) {
                budgetPlan *= 1000;
              }
              console.log(`[Sync] Budget aus PDF-Dateiname "${pdf.name}" extrahiert: ${budgetPlan} €`);
            }
          }

          // 2. Use fallback map if still 0
          if (budgetPlan === 0 && projectData.number && projectData.number !== 'N/A') {
            budgetPlan = getFallbackBudget(projectData.number, projectData.name || '');
            if (budgetPlan > 0) {
              console.log(`[Sync] Fallback-Budget für Projekt "${projectData.name}" (${projectData.number}) verwendet: ${budgetPlan} €`);
            }
          }

          projectData.budgetPlan = budgetPlan;

          const existing = updatedProjects.findIndex(
            (p) => (projectData.number && projectData.number !== 'N/A' && projectData.number.length >= 10 && p.number === projectData.number) || 
                   p.driveFileIds?.includes(pdf.id)
          );

          if (existing >= 0) {
            updatedProjects[existing] = {
              ...updatedProjects[existing],
              ...projectData,
              id: updatedProjects[existing].id,
            };
          } else {
            updatedProjects.push({
              id: `proj-${pdf.id}`,
              budgetIst: 0,
              status: 'laufend',
              ...projectData,
            } as Project);
          }
        } catch (err) {
          console.error(`Failed to parse PDF ${pdf.name}:`, err);
        }
        // Yield to browser event loop to avoid blocking and stay responsive
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      console.log('[Sync] Extrahierte Projekte aus PDFs:', updatedProjects.map(p => ({
        name: p.name,
        number: p.number,
        costTypesCount: p.costTypes?.length || 0,
        id: p.id
      })));

      // Process booking Excels → update IST values
      const isGlobalFile = (name: string) => 
        name.toLowerCase().includes('tp ausstellungen') ||
        name.toLowerCase().includes('gesamt') ||
        name.toLowerCase().includes('coor') ||
        name.toLowerCase().includes('sage');

      const specificFiles = bookingFiles.filter((f) => !isGlobalFile(f.name));
      const globalFiles = bookingFiles.filter((f) => isGlobalFile(f.name));

      // 1. Process specific files FIRST to resolve project numbers & specific budgetIst
      for (const excel of specificFiles) {
        try {
          const buffer = excel.mimeType.includes('google-apps')
            ? await exportGoogleSheetAsXlsx(excel.id)
            : await downloadFileAsArrayBuffer(excel.id);
          const bookings = parseBookingsExcel(buffer);

          // Specific project file
          const bookingData = bookingsToProjectData(bookings, excel.name);
          const targetIdx = updatedProjects.findIndex((p) => {
            const pNum = p.number ? p.number.toLowerCase() : 'n/a';
            const pName = p.name ? p.name.toLowerCase() : 'unbekannt';
            
            // Extract core numbers for comparison (remove leading p/P and trailing .00)
            const pNumCore = pNum.replace(/^p/i, '').replace(/\.00$/, '');
            const excelNameLower = excel.name.toLowerCase();
            
            // 1. Check project number match (must be length >= 5)
            const hasNumMatch = pNum !== 'n/a' && pNum.length >= 5 && (
              excelNameLower.includes(pNum) ||
              (pNumCore.length >= 5 && excelNameLower.includes(pNumCore))
            );
            if (hasNumMatch) return true;
            
            // 2. Check name match using our robust word overlap logic
            const hasNameMatch = pName !== 'unbekannt' && matchesProjectName(pName, excel.name);
            return hasNameMatch;
          });
          
          if (targetIdx >= 0) {
            console.log(`[Sync] Spezifische Datei ${excel.name}: Zuordnung zu Projekt ${updatedProjects[targetIdx].name}`);

            // Extract project number from Excel name if the project doesn't have one yet
            let updatedNum = updatedProjects[targetIdx].number;
            if (!updatedNum || updatedNum === 'N/A') {
              const excelInfo = extractProjectInfoFromFilename(excel.name);
              if (excelInfo.projectNumber) {
                updatedNum = excelInfo.projectNumber;
                console.log(`[Sync] Projektnummer für ${updatedProjects[targetIdx].name} aktualisiert auf: ${updatedNum}`);
              }
            }

            // Resolve Plan Budget if currently 0
            let updatedBudget = updatedProjects[targetIdx].budgetPlan || 0;
            if (updatedBudget === 0 && bookingData.extractedPlanBudget) {
              updatedBudget = bookingData.extractedPlanBudget;
              console.log(`[Sync] Planbudget für ${updatedProjects[targetIdx].name} aus Excel extrahiert: ${updatedBudget} €`);
            }
            if (updatedBudget === 0 && updatedNum) {
              updatedBudget = getFallbackBudget(updatedNum, updatedProjects[targetIdx].name || '');
              if (updatedBudget > 0) {
                console.log(`[Sync] Fallback-Budget für ${updatedProjects[targetIdx].name} (${updatedNum}) geladen: ${updatedBudget} €`);
              }
            }

            // Group costTypes and calculate percentages using the resolved budgetPlan
            const costTypes = bookingData.costTypes?.map((ct) => ({
              ...ct,
              percentage: updatedBudget > 0 ? (ct.amount / updatedBudget) * 100 : 0
            })) || updatedProjects[targetIdx].costTypes;

            updatedProjects[targetIdx] = {
              ...updatedProjects[targetIdx],
              number: updatedNum,
              budgetPlan: updatedBudget,
              budgetIst: bookingData.budgetIst || 0,
              costTypes,
              bookingMatches: bookingData.bookingMatches
            };
          } else {
            console.log(`[Sync] Spezifische Datei ${excel.name} konnte keinem Projekt zugeordnet werden.`);
          }
        } catch (err) {
          console.error(`Failed to parse Excel ${excel.name}:`, err);
        }
        // Yield to browser event loop to avoid blocking and stay responsive
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // 2. Process global files SECOND to distribute global Sage/COOR bookings to fully resolved projects
      for (const excel of globalFiles) {
        try {
          const buffer = excel.mimeType.includes('google-apps')
            ? await exportGoogleSheetAsXlsx(excel.id)
            : await downloadFileAsArrayBuffer(excel.id);
          const bookings = parseBookingsExcel(buffer);

          console.log(`[Sync] Verteile globale Buchungsdatei ${excel.name}...`);
          // Distribute bookings across ALL projects based on matches
          updatedProjects = updatedProjects.map((p) => {
            const pNum = p.number ? p.number.toLowerCase() : 'n/a';
            const pName = p.name ? p.name.toLowerCase() : 'unbekannt';
            
            // Core number (e.g. "03.021.191") for more robust matching
            const pNumCore = pNum.replace(/^p/i, '').replace(/\.00$/, '');
            
            const projectBookings = bookings.filter((b) => {
              const docNum = b.documentNumber ? b.documentNumber.toLowerCase() : '';
              const desc = b.description ? b.description.toLowerCase() : '';
              const costType = b.costType ? b.costType.toLowerCase() : '';
              
              const hasNumMatch = pNum !== 'n/a' && pNum.length >= 5 && (
                docNum.includes(pNum) ||
                desc.includes(pNum) ||
                costType.includes(pNum) ||
                (pNumCore.length >= 5 && (
                  docNum.includes(pNumCore) ||
                  desc.includes(pNumCore) ||
                  costType.includes(pNumCore)
                ))
              );
              
              const hasNameMatch = pName !== 'unbekannt' && pName.length > 5 && (
                desc.includes(pName.slice(0, 10)) ||
                docNum.includes(pName.slice(0, 10))
              );
              
              return hasNumMatch || hasNameMatch;
            });

            if (projectBookings.length > 0) {
              const bookingData = bookingsToProjectData(projectBookings, p.name);
              console.log(`[Sync] Globale Datei ${excel.name}: ${projectBookings.length} Zeilen zugeordnet zu Projekt ${p.name}`);
              
              // Merge bookingData
              return {
                ...p,
                budgetIst: (p.budgetIst || 0) + (bookingData.budgetIst || 0),
                bookingMatches: p.bookingMatches
                  ? mergeBookingMatches(p.bookingMatches, bookingData.bookingMatches!)
                  : bookingData.bookingMatches
              };
            }
            return p;
          });
        } catch (err) {
          console.error(`Failed to parse Global Excel ${excel.name}:`, err);
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // Process open orders file
      if (openOrderFile) {
        try {
          console.log('[Sync] Lade offene Aufträge aus:', openOrderFile.name);
          const buffer = openOrderFile.mimeType.includes('google-apps')
            ? await exportGoogleSheetAsXlsx(openOrderFile.id)
            : await downloadFileAsArrayBuffer(openOrderFile.id);
          const { orders } = parseOpenOrdersExcel(buffer);
          console.log(`[Sync] ${orders.length} offene Aufträge erfolgreich aus Excel eingelesen:`, orders.map(o => ({ description: o.description, amount: o.amount, projectId: o.projectId })));
          updatedOpenOrders = orders;
        } catch (err) {
          console.error('[Sync] Fehler beim Parsen der offenen Aufträge:', err);
        }
      }

      set({ projects: updatedProjects, openOrders: updatedOpenOrders });
      console.log('[Sync] Zustand aktualisiert mit Projekten:', updatedProjects.map(p => ({ name: p.name, id: p.id, ist: p.budgetIst })));

      // Run AI analysis on changed projects (async, non-blocking)
      for (const proj of updatedProjects) {
        const projOrders = updatedOpenOrders.filter((o) => isOrderForProject(o, proj));
        console.log(`[Sync] Projekt "${proj.name}" (${proj.number}) -> ${projOrders.length} zugeordnete offene Aufträge:`, projOrders.map(o => o.description));
        
        if (import.meta.env.VITE_GEMINI_API_KEY) {
          const enrichedProject = {
            ...proj,
            openOrders: projOrders
          };
          analyzeProjectWithGemini(enrichedProject).then((analysis) => {
            set((state) => ({
              projects: state.projects.map((p) =>
                p.id === proj.id ? { ...p, aiAnalysis: analysis } : p
              ),
            }));
          }).catch(console.error);
        }
      }

      set({ isLoading: false, lastSync: new Date() });
    } catch (err) {
      set({
        isLoading: false,
        syncError: err instanceof Error ? err.message : 'Sync-Fehler',
      });
    }
  },

  updateOpenOrder: (order) =>
    set((state) => ({
      openOrders: state.openOrders.map((o) => (o.id === order.id ? order : o)),
    })),

  addOpenOrder: (order) =>
    set((state) => ({
      openOrders: [...state.openOrders, { ...order, id: `order-${Date.now()}` }],
    })),

  deleteOpenOrder: (id) =>
    set((state) => ({
      openOrders: state.openOrders.filter((o) => o.id !== id),
    })),
}));

function mergeBookingMatches(a: BookingMatch, b: BookingMatch): BookingMatch {
  return {
    totalPositions: a.totalPositions + b.totalPositions,
    vollMatch: a.vollMatch + b.vollMatch,
    teilMatch: a.teilMatch + b.teilMatch,
    klaerungsbedarf: a.klaerungsbedarf + b.klaerungsbedarf,
    nurSage: a.nurSage + b.nurSage,
    risikovolumen: a.risikovolumen + b.risikovolumen,
    topRisks: [...(a.topRisks || []), ...(b.topRisks || [])]
      .sort((x, y) => y.amount - x.amount)
      .slice(0, 10),
    actionItems: [...(a.actionItems || []), ...(b.actionItems || [])],
  };
}

function matchesProjectName(pName: string, targetName: string): boolean {
  const n1 = pName.toLowerCase();
  const n2 = targetName.toLowerCase();
  
  // Clean prefix/suffix or generic characters
  const cleanStr = (s: string) => s.replace(/[^a-z0-9äöüß\s]/g, ' ');
  
  const words1 = cleanStr(n1).split(/\s+/).filter(w => w.length >= 4);
  const words2 = cleanStr(n2).split(/\s+/).filter(w => w.length >= 4);
  
  const stopWords = new Set([
    'antrag', 'projekt', 'projektantrag', 'tabelle', 'eingangsrechnungen',
    'buchungsdaten', 'umsetzung', 'anleitung', 'pruefung', 'abgleich', 'auf',
    'unter', 'über', 'nach', 'inkl', 'fuer', 'für', 'und', 'mit', 'der', 'die', 'das'
  ]);
  
  for (const w1 of words1) {
    if (stopWords.has(w1)) continue;
    
    // Check direct match in words2 or substring match
    for (const w2 of words2) {
      if (stopWords.has(w2)) continue;
      if (w1 === w2 || (w1.length >= 5 && (w2.includes(w1) || w1.includes(w2)))) {
        return true;
      }
    }
  }
  return false;
}

function getFallbackBudget(projectNumber: string, projectName: string): number {
  const num = projectNumber.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const name = projectName.toLowerCase();
  
  if (num.includes('03111122') || name.includes('netze') || name.includes('gelaende')) return 15000;
  if (num.includes('03111222') || name.includes('brandschutz') || name.includes('sicherheits')) return 100000;
  if (num.includes('03777999') || name.includes('sicherheitsplan')) return 50000;
  if (num.includes('03333555') || name.includes('photovoltaik')) return 100000;
  if (num.includes('03444666') || name.includes('putzsanierung') || name.includes('fassaden')) return 150000;
  if (num.includes('07888999') || name.includes('eampro') || name.includes('erp') || name.includes('anlagenmanagement')) return 210000;
  if (num.includes('06777888') || name.includes('kinetik') || name.includes('simulationsanlage')) return 250000;
  if (num.includes('03999001') || name.includes('modernisierung') || name.includes('client') || name.includes('refresh') || name.includes('hardware')) return 30000;
  if (num.includes('10333444') || name.includes('polarforschung') || name.includes('arktis')) return 210000;
  
  return 0;
}
