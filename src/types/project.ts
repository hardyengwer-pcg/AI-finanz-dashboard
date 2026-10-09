import { OpenOrder } from './openOrder';

export interface Project {
  id: string;
  name: string;
  number: string;
  location?: string;
  dateRange?: string;
  projectLead?: string;
  lastUpdated: string;
  status: 'im_rahmen' | 'ueberschreitung' | 'abgeschlossen' | 'laufend';
  budgetPlan: number;
  budgetIst: number;
  budgetYear?: Record<string, { plan: number; ist: number }>;
  costTypes?: CostType[];
  bookingMatches?: BookingMatch;
  openOrders?: OpenOrder[];
  aiAnalysis?: AIAnalysis;
  driveFileIds?: string[];
}

export interface CostType {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface BookingMatch {
  totalPositions: number;
  vollMatch: number;
  teilMatch: number;
  klaerungsbedarf: number;
  nurSage: number;
  risikovolumen: number;
  topRisks: RiskItem[];
  actionItems: ActionItem[];
}

export interface RiskItem {
  id: string;
  amount: number;
  priority: 'kritisch' | 'hoch' | 'mittel';
}

export interface ActionItem {
  title: string;
  deadline: string;
  timeframe: 'sofort' | 'naechste_woche' | 'monatsende';
  responsible?: string;
  items: string[];
}

export interface AIAnalysis {
  summary: string;
  uncertainties: Uncertainty[];
  confidence: number;
  analyzedAt: string;
}

export interface Uncertainty {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  parents?: string[];
}

export function isOrderForProject(order: OpenOrder, project: Project): boolean {
  const projId = project.id ? project.id.toLowerCase() : '';
  const orderProjId = order.projectId ? order.projectId.toLowerCase() : '';
  
  if (projId && orderProjId === projId) return true;
  
  const projNum = project.number ? project.number.toLowerCase() : '';
  if (!projNum || projNum === 'n/a') return false;
  
  // Clean numbers by removing 'p', all non-alphanumeric chars, and trailing '00'
  const cleanProjNum = projNum.replace(/^p/i, '').replace(/[^a-z0-9]/g, '').replace(/00$/, '');
  const cleanOrderProjId = orderProjId.replace(/^p/i, '').replace(/[^a-z0-9]/g, '').replace(/00$/, '');
  
  if (cleanProjNum && cleanOrderProjId === cleanProjNum) return true;
  
  // Substring match for extra resilience (e.g., project numbers with different formatting or sub-projects)
  if (cleanProjNum.length >= 4 && cleanOrderProjId.includes(cleanProjNum)) return true;
  if (cleanOrderProjId.length >= 4 && cleanProjNum.includes(cleanOrderProjId)) return true;
  
  return false;
}
