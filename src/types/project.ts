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
