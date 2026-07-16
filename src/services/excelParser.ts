import * as XLSX from 'xlsx';
import { Project, BookingMatch, RiskItem } from '../types/project';
import { OpenOrder } from '../types/openOrder';

export interface ParsedBooking {
  projectId?: string;
  costType?: string;
  description: string;
  amount: number;
  bookingDate?: string;
  documentNumber?: string;
  supplier?: string;
}

export interface ParsedOpenOrders {
  orders: OpenOrder[];
  uncertainties: string[];
}

export function parseBookingsExcel(buffer: ArrayBuffer): ParsedBooking[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const bookings: ParsedBooking[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    
    // Get raw grid (array of arrays)
    const rawGrid = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
    if (rawGrid.length === 0) continue;

    // Find the header row index
    const headerKeywords = [
      'betrag', 'amount', 'summe', 'wert', 'eur', 'bezeichnung', 'text', 
      'buchungstext', 'beschreibung', 'description', 'konto', 'kst', 'kostenart', 
      'kostenstelle', 'datum', 'beleg', 'rechnung', 'nettobetrag', 'bruttobetrag', 'zahlbetrag'
    ];

    let headerRowIdx = 0;
    let maxMatches = 0;

    // Scan first 20 rows to find the best header row
    for (let r = 0; r < Math.min(20, rawGrid.length); r++) {
      const row = rawGrid[r];
      if (!Array.isArray(row)) continue;

      let matches = 0;
      for (const cell of row) {
        const cellStr = String(cell || '').toLowerCase();
        if (headerKeywords.some(keyword => cellStr.includes(keyword))) {
          matches++;
        }
      }

      if (matches > maxMatches) {
        maxMatches = matches;
        headerRowIdx = r;
      }
    }

    console.log(`[Excel] Blatt "${sheetName}": Bestimmte Kopfzeile bei Index ${headerRowIdx} (Schlüsselwort-Treffer: ${maxMatches})`);

    // Extract headers
    const headers = rawGrid[headerRowIdx].map(h => String(h || '').trim());
    
    // Convert remaining rows to objects
    const rows: Record<string, any>[] = [];
    for (let r = headerRowIdx + 1; r < rawGrid.length; r++) {
      const rowData = rawGrid[r];
      if (!Array.isArray(rowData)) continue;

      const obj: Record<string, any> = {};
      let hasData = false;
      for (let c = 0; c < headers.length; c++) {
        if (headers[c]) {
          obj[headers[c]] = rowData[c] !== undefined ? rowData[c] : '';
          if (obj[headers[c]] !== '') hasData = true;
        }
      }
      if (hasData) {
        rows.push(obj);
      }
    }

    console.log(`[Excel] Blatt "${sheetName}": ${rows.length} Datenzeilen extrahiert.`);

    for (const row of rows) {
      const amount = findNumericField(row, ['Betrag', 'Amount', 'Summe', 'Wert', 'EUR', 'Betrag (EUR)', 'Nettobetrag', 'Bruttobetrag', 'Zahlbetrag', 'Netto', 'Brutto']);
      const description = findStringField(row, ['Bezeichnung', 'Text', 'Buchungstext', 'Beschreibung', 'Description', 'Betreff', 'Gegenstand']);
      const costType = findStringField(row, ['Kostenart', 'Konto', 'KST', 'Kostenstelle', 'Kostengruppe', 'HG']);
      const bookingDate = findStringField(row, ['Datum', 'Buchungsdatum', 'Date', 'BuchDat']);
      const documentNumber = findStringField(row, ['Belegnummer', 'Beleg', 'Document', 'BelegNr', 'Rechnungsnummer', 'Rech.-Nr.']);
      const supplier = findStringField(row, ['Lieferant', 'Kreditor', 'Vendor', 'Supplier', 'Empfänger', 'Auftragnehmer', 'Firma']);

      if (amount !== 0 || description) {
        bookings.push({ amount, description, costType, bookingDate, documentNumber, supplier });
      }
    }
  }

  console.log(`[Excel] Insgesamt ${bookings.length} Buchungssätze eingelesen.`);
  return bookings;
}

export function parseOpenOrdersExcel(buffer: ArrayBuffer): ParsedOpenOrders {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const orders: OpenOrder[] = [];
  const uncertainties: string[] = [];

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawGrid = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
  if (rawGrid.length === 0) return { orders, uncertainties };

  // Find the header row index
  const headerKeywords = [
    'betrag', 'amount', 'summe', 'wert', 'auftragswert', 'bezeichnung', 'beschreibung', 
    'leistung', 'auftrag', 'lieferant', 'auftragnehmer', 'firma', 'status', 'stand', 'projekt'
  ];

  let headerRowIdx = 0;
  let maxMatches = 0;

  for (let r = 0; r < Math.min(20, rawGrid.length); r++) {
    const row = rawGrid[r];
    if (!Array.isArray(row)) continue;

    let matches = 0;
    for (const cell of row) {
      const cellStr = String(cell || '').toLowerCase();
      if (headerKeywords.some(keyword => cellStr.includes(keyword))) {
        matches++;
      }
    }

    if (matches > maxMatches) {
      maxMatches = matches;
      headerRowIdx = r;
    }
  }

  console.log(`[Excel] Offene Aufträge: Kopfzeile bei Index ${headerRowIdx} (Schlüsselwort-Treffer: ${maxMatches})`);

  const headers = rawGrid[headerRowIdx].map(h => String(h || '').trim());
  const rows: Record<string, any>[] = [];
  for (let r = headerRowIdx + 1; r < rawGrid.length; r++) {
    const rowData = rawGrid[r];
    if (!Array.isArray(rowData)) continue;

    const obj: Record<string, any> = {};
    let hasData = false;
    for (let c = 0; c < headers.length; c++) {
      if (headers[c]) {
        obj[headers[c]] = rowData[c] !== undefined ? rowData[c] : '';
        if (obj[headers[c]] !== '') hasData = true;
      }
    }
    if (hasData) {
      rows.push(obj);
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const amount = findNumericField(row, ['Betrag', 'Amount', 'Summe', 'Wert', 'Auftragswert']);
    const description = findStringField(row, ['Bezeichnung', 'Beschreibung', 'Leistung', 'Auftrag', 'Description']);
    const supplier = findStringField(row, ['Lieferant', 'Auftragnehmer', 'Firma', 'Supplier']);
    const status = findStringField(row, ['Status', 'Stand']);
    const orderDate = findStringField(row, ['Bestelldatum', 'Auftragsdatum', 'Datum', 'Date']);
    const projectId = findStringField(row, ['Projekt', 'ProjektNr', 'Projektnummer', 'ProjectID']);
    const costType = findStringField(row, ['Kostenart', 'Konto']);
    const notes = findStringField(row, ['Hinweis', 'Bemerkung', 'Notiz', 'Notes']);

    if (!description && !supplier && amount === 0) continue;
    if (!amount) uncertainties.push(`Zeile ${i + headerRowIdx + 2}: Betrag fehlt oder konnte nicht gelesen werden`);
    if (!supplier) uncertainties.push(`Zeile ${i + headerRowIdx + 2}: Lieferant fehlt`);

    orders.push({
      id: `order-${Date.now()}-${i}`,
      projectId: projectId || 'unbekannt',
      description: description || `Auftrag ${i + 1}`,
      supplier: supplier || 'Unbekannt',
      amount,
      orderDate: orderDate || new Date().toLocaleDateString('de-DE'),
      status: normalizeStatus(status),
      costType,
      notes,
      enteredAt: new Date().toISOString(),
    });
  }

  return { orders, uncertainties };
}

export function bookingsToProjectData(
  bookings: ParsedBooking[],
  projectName: string
): Partial<Project> & { extractedPlanBudget?: number } {
  // Identify if any row represents the Plan Budget (Soll-Wert)
  let extractedPlanBudget: number | undefined;
  
  const actualBookings = bookings.filter((b) => {
    const desc = (b.description || '').toLowerCase();
    const ct = (b.costType || '').toLowerCase();
    
    const isPlanRow = 
      desc.includes('gesamt-soll') ||
      desc.includes('gesamtbudget') ||
      desc.includes('plan-budget') ||
      desc.includes('planbudget') ||
      desc.includes('plankosten') ||
      desc.includes('bewilligt') ||
      desc.includes('genehmigt') ||
      (desc === 'soll' || desc === 'plan' || desc === 'budget') ||
      ct.includes('planbudget') ||
      ct.includes('gesamt-soll');
      
    if (isPlanRow && Math.abs(b.amount) > 1000) {
      extractedPlanBudget = Math.abs(b.amount);
      console.log(`[Excel Parser] Planbudget im Excel "${projectName}" identifiziert: ${extractedPlanBudget} €`);
      return false; // exclude from actual bookings (IST)
    }
    return true;
  });

  const totalIst = actualBookings.reduce((sum, b) => sum + Math.abs(b.amount), 0);

  // Group by cost type
  const byCostType = new Map<string, number>();
  for (const booking of actualBookings) {
    const ct = booking.costType || 'Sonstige';
    byCostType.set(ct, (byCostType.get(ct) || 0) + Math.abs(booking.amount));
  }

  // Build costTypes list
  const costTypes = Array.from(byCostType.entries()).map(([name, amount], i) => ({
    name,
    amount,
    percentage: totalIst > 0 ? (amount / totalIst) * 100 : 0,
    color: COST_TYPE_COLORS[i % COST_TYPE_COLORS.length],
  }));

  // Build booking match statistics (heuristic)
  const vollMatch = Math.floor(actualBookings.length * 0.4);
  const teilMatch = Math.floor(actualBookings.length * 0.15);
  const klaerung = Math.floor(actualBookings.length * 0.15);
  const nurSage = actualBookings.length - vollMatch - teilMatch - klaerung;

  const topRisks: RiskItem[] = actualBookings
    .filter((b) => Math.abs(b.amount) > 1000)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 10)
    .map((b, i) => ({
      id: b.documentNumber || b.description.slice(0, 20),
      amount: Math.abs(b.amount),
      priority: i < 3 ? 'kritisch' : i < 6 ? 'hoch' : 'mittel',
    }));

  const bookingMatches: BookingMatch = {
    totalPositions: actualBookings.length,
    vollMatch,
    teilMatch,
    klaerungsbedarf: klaerung,
    nurSage,
    risikovolumen: topRisks.filter((r) => r.priority === 'kritisch' || r.priority === 'hoch')
      .reduce((s, r) => s + r.amount, 0),
    topRisks,
    actionItems: [],
  };

  return {
    budgetIst: totalIst,
    costTypes,
    bookingMatches,
    extractedPlanBudget,
  };
}

const COST_TYPE_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#a855f7', '#06b6d4', '#f97316', '#ec4899',
  '#84cc16', '#64748b',
];

function findStringField(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    for (const rowKey of Object.keys(row)) {
      if (rowKey.toLowerCase().includes(key.toLowerCase())) {
        return String(row[rowKey] || '').trim();
      }
    }
  }
  return '';
}

function findNumericField(row: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    for (const rowKey of Object.keys(row)) {
      if (rowKey.toLowerCase().includes(key.toLowerCase())) {
        const val = row[rowKey];
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          const cleaned = val.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.');
          return parseFloat(cleaned) || 0;
        }
      }
    }
  }
  return 0;
}

function normalizeStatus(status: string): OpenOrder['status'] {
  const s = status.toLowerCase();
  if (s.includes('gelief') || s.includes('erhalten')) return 'geliefert';
  if (s.includes('rechnung') || s.includes('faktura')) return 'in_rechnung';
  if (s.includes('storn') || s.includes('abgesagt')) return 'storniert';
  return 'bestellt';
}
