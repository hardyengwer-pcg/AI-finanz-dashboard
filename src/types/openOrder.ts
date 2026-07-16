export interface OpenOrder {
  id: string;
  projectId: string;
  description: string;
  supplier: string;
  amount: number;
  orderDate: string;
  expectedDate?: string;
  status: 'bestellt' | 'geliefert' | 'in_rechnung' | 'storniert';
  costType?: string;
  notes?: string;
  enteredBy?: string;
  enteredAt?: string;
}
