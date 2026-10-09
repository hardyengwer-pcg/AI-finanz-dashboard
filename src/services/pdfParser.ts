import * as pdfjsLib from 'pdfjs-dist';
import { Project, CostType } from '../types/project';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Use the local worker from pdfjs-dist bundled by Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface ParsedPDF {
  projectName: string;
  projectNumber: string;
  location?: string;
  dateRange?: string;
  projectLead?: string;
  budgetPlan: number;
  budgetByYear?: Record<string, number>;
  costTypes?: Partial<CostType>[];
  rawText: string;
  uncertainties: string[];
}

export async function parsePDF(buffer: ArrayBuffer): Promise<ParsedPDF> {
  const uncertainties: string[] = [];

  const pdf = await pdfjsLib.getDocument({ data: buffer, verbosity: 0 }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }

  // Extract project name
  const nameMatch = fullText.match(/Projektantrag[:\s]+([^\n\r]+)/i) ||
    fullText.match(/Projekt[:\s]+([^\n\r]+)/i) ||
    fullText.match(/Ausstellung[:\s]+([^\n\r]+)/i);
  
  let projectName = 'Unbekanntes Projekt';
  if (nameMatch) {
    const rawName = nameMatch[1].trim();
    // Split by double space or tab to avoid grabbing subsequent layout fields on the same line
    const parts = rawName.split(/\s{2,}/);
    projectName = parts[0].trim();
    if (projectName.length > 80) {
      projectName = projectName.slice(0, 80) + '...';
    }
  }
  if (!nameMatch) uncertainties.push('Projektname konnte nicht eindeutig ermittelt werden');

  // Extract project number
  const numberMatch = fullText.match(/(?:Projektnummer|Proj[.-]Nr|P\d{2}\.\d{3}\.\d{3})[:\s]*([A-Z0-9.\-/]{4,20})/i) ||
    fullText.match(/\b(P\d{2}\.\d{3}\.\d{3})\b/) ||
    fullText.match(/\b(TPA\.[A-Z]{3}\.\d{3}\.\d{2,3})\b/);
  
  let projectNumber = 'N/A';
  if (numberMatch) {
    const matchedNum = numberMatch[1].trim();
    if (matchedNum.length >= 5) {
      projectNumber = matchedNum;
    }
  }
  if (projectNumber === 'N/A') uncertainties.push('Projektnummer nicht gefunden oder ungültig (zu kurz)');

  // Extract budget (Plan)
  const budgetPatterns = [
    /Gesamtbudget[:\s]*([0-9.,]+)\s*(?:€|EUR|T€|Teur|T\s*€)?/i,
    /Budget[:\s]*([0-9.,]+)\s*(?:€|EUR|T€|Teur|T\s*€)?/i,
    /Plankosten[:\s]*([0-9.,]+)\s*(?:€|EUR|T€|Teur|T\s*€)?/i,
    /Gesamtkosten[:\s]*([0-9.,]+)\s*(?:€|EUR|T€|Teur|T\s*€)?/i,
    /Finanzbedarf[:\s]*([0-9.,]+)\s*(?:€|EUR|T€|Teur|T\s*€)?/i,
    /Finanzvolumen[:\s]*([0-9.,]+)\s*(?:€|EUR|T€|Teur|T\s*€)?/i,
    /Sondermittel[:\s]*([0-9.,]+)\s*(?:€|EUR|T€|Teur|T\s*€)?/i,
    /Budget\s*Plan[:\s]*([0-9.,]+)\s*(?:€|EUR|T€|Teur|T\s*€)?/i,
    /([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)\s*(?:€|EUR|T€|Teur|T\s*€)/i, // Required for fallback to prevent false positives on dates
  ];

  let budgetPlan = 0;
  for (const pattern of budgetPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      let parsed = parseGermanNumber(match[1]);
      
      // If the currency suffix contains "t" or "T" (like T€, Teur, T €), multiply by 1000
      const matchedFullStr = match[0];
      const numberStr = match[1];
      const suffixStartIdx = matchedFullStr.indexOf(numberStr) + numberStr.length;
      const suffixStr = matchedFullStr.slice(suffixStartIdx).toLowerCase();
      
      if (suffixStr.includes('t')) {
        parsed *= 1000;
        console.log(`[PDF Parser] Multiplizierte T-Budget von ${numberStr} auf ${parsed} €`);
      }

      if (parsed < 1000 && parsed > 0) {
        console.warn(`[PDF Budget Debug] Verdächtig kleines Budget (${parsed} €) in PDF erkannt!`);
        console.warn(`Treffer-String: "${match[0]}"`);
        const matchIdx = fullText.indexOf(match[0]);
        console.warn(`Kontext um den Treffer:\n"${fullText.substring(Math.max(0, matchIdx - 100), Math.min(fullText.length, matchIdx + 150))}"`);
      }
      budgetPlan = parsed;
      if (budgetPlan > 1000) break;
    }
  }
  if (budgetPlan === 0) {
    uncertainties.push('Planbudget konnte nicht extrahiert werden – manuelle Überprüfung erforderlich');
    if (fullText.trim().length > 10) {
      console.warn(`[PDF Budget Debug] Budget konnte für PDF "${projectName}" nicht gefunden werden!`);
      console.warn(`--- Erste 1000 Zeichen des PDF-Textes ---`);
      console.warn(fullText.substring(0, 1000));
      console.warn(`--- Zeilen mit Zahlen oder Budget-Stichworten ---`);
      const lines = fullText.split('\n');
      for (const line of lines) {
        const lineLower = line.toLowerCase();
        if (lineLower.includes('budget') || lineLower.includes('kosten') || lineLower.includes('bedarf') || lineLower.includes('€') || lineLower.includes('eur')) {
          console.warn(`Relevante Zeile: "${line.trim()}"`);
        }
      }
    }
  }

  // Extract location
  const locationMatch = fullText.match(/(?:Ort|Standort|Museum|Verkehrszentrum|Deutsches Museum)[:\s]*([^\n\r,]+)/i);
  const location = locationMatch ? locationMatch[1].trim() : undefined;

  // Extract date range
  const dateMatch = fullText.match(/(?:Laufzeit|Zeitraum)[:\s]*((?:Jan|Feb|Mär|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Dez|\d{4})[^\n\r]+)/i);
  const dateRange = dateMatch ? dateMatch[1].trim() : undefined;

  // Extract project lead
  const leadMatch = fullText.match(/(?:Projektleitung|Projektleiter|Projektleiterin)[:\s]*([^\n\r]+)/i);
  const projectLead = leadMatch ? leadMatch[1].trim() : undefined;

  // Extract cost types
  const costTypeNames = [
    'Aufbau', 'Abbau', 'Umbau', 'Transport', 'Logistik',
    'Grafik', 'Druck', 'Catering', 'Veranstaltung', 'Honorar',
    'Extern', 'Leih', 'Miet', 'Reise', 'Gestaltung',
    'Werbung', 'Marketing', 'Material', 'Kleinstinvestition', 'Sonstige'
  ];

  const costTypes: Partial<CostType>[] = [];
  for (const typeName of costTypeNames) {
    const pattern = new RegExp(`${typeName}[^\\n\\r]{0,30}([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)\\s*(?:€|EUR)?`, 'i');
    const match = fullText.match(pattern);
    if (match) {
      costTypes.push({ name: typeName, amount: parseGermanNumber(match[1]) });
    }
  }

  return {
    projectName,
    projectNumber,
    location,
    dateRange,
    projectLead,
    budgetPlan,
    costTypes,
    rawText: fullText,
    uncertainties,
  };
}

function parseGermanNumber(str: string): number {
  // Handle German number format: 1.234,56 → 1234.56
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function extractProjectInfoFromFilename(filename: string): { projectNumber: string | null; projectName: string | null } {
  // Remove file extension
  const clean = filename.replace(/\.(pdf|xlsx)$/i, '').trim();
  
  // Match project number like P03.021.238.00 or P03.021.238 or P06.030.180.00
  const pNumMatch = clean.match(/\b(P\d{2}\.\d{3}\.\d{3}(?:\.\d{2})?)\b/i) ||
                    clean.match(/\b(\d{2}\.\d{3}\.\d{3})\b/);
                    
  let projectNumber = pNumMatch ? pNumMatch[1] : null;
  if (projectNumber && !projectNumber.toLowerCase().startsWith('p')) {
    projectNumber = 'P' + projectNumber;
  }
  
  // Match subproject style "812 01" or similar
  if (!projectNumber) {
    const subMatch = clean.match(/\b(8\d{2}\s\d{2})\b/);
    if (subMatch) {
      projectNumber = subMatch[1];
    }
  }
  
  // Clean up name by removing Antrag, Projektantrag, P03..., VZ etc.
  let projectName = clean
    .replace(/^Antrag\s*-\s*/i, '')
    .replace(/^Projektantrag\s*_\s*/i, '')
    .replace(/\b(P\d{2}\.\d{3}\.\d{3}(?:\.\d{2})?)\b/gi, '')
    .replace(/\b(8\d{2}\s\d{2})\b/g, '')
    .replace(/\s*-\s*VZ\s*-\s*/gi, ' ')
    .replace(/\b\d{8}\b/g, '') // e.g. 20230817
    .replace(/_Sevinc|_Wurzer_Veicht|_Zimmermann/gi, '')
    .replace(/[-_]+/g, ' ')
    .trim();
    
  projectName = projectName.replace(/\s+/g, ' ');
  
  return { projectNumber, projectName: projectName || null };
}

export function pdfDataToProject(parsed: ParsedPDF, fileId: string, filename?: string): Partial<Project> {
  let name = parsed.projectName;
  let number = parsed.projectNumber;

  if (filename) {
    const filenameInfo = extractProjectInfoFromFilename(filename);
    
    // Fallback if parsed name is too generic, short or missing
    const isGenericName = !name || 
                          name === 'Unbekanntes Projekt' || 
                          name.toLowerCase().includes('auftraggeber') || 
                          name.toLowerCase().includes('auftrag') || 
                          name.toLowerCase().includes('projektantrag') ||
                          name.length < 5;
                          
    if (isGenericName && filenameInfo.projectName) {
      name = filenameInfo.projectName;
    }
    
    // Fallback if parsed number is missing or invalid
    if ((!number || number === 'N/A') && filenameInfo.projectNumber) {
      number = filenameInfo.projectNumber;
    }
  }

  // Double-check: If name contains "auftraggeber:", clean it up using filename
  if (name.toLowerCase().includes('auftraggeber') && filename) {
    const filenameInfo = extractProjectInfoFromFilename(filename);
    if (filenameInfo.projectName) {
      name = filenameInfo.projectName;
    }
  }

  return {
    name,
    number,
    location: parsed.location,
    dateRange: parsed.dateRange,
    projectLead: parsed.projectLead,
    budgetPlan: parsed.budgetPlan,
    lastUpdated: new Date().toLocaleDateString('de-DE'),
    status: 'laufend',
    costTypes: parsed.costTypes?.map((ct, i) => ({
      name: ct.name || 'Unbekannt',
      amount: ct.amount || 0,
      percentage: parsed.budgetPlan > 0 ? ((ct.amount || 0) / parsed.budgetPlan) * 100 : 0,
      color: COST_TYPE_COLORS[i % COST_TYPE_COLORS.length],
    })),
    driveFileIds: [fileId],
    aiAnalysis: parsed.uncertainties.length > 0 ? {
      summary: 'PDF-Analyse abgeschlossen',
      uncertainties: parsed.uncertainties.map((msg) => ({
        field: 'PDF-Extraktion',
        message: msg,
        severity: 'medium' as const,
      })),
      confidence: Math.max(0.4, 1 - parsed.uncertainties.length * 0.15),
      analyzedAt: new Date().toISOString(),
    } : undefined,
  };
}

const COST_TYPE_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#a855f7', '#06b6d4', '#f97316', '#ec4899',
  '#84cc16', '#64748b',
];
