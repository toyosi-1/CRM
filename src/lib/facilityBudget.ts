import type { MaintenanceRequest } from '../types';

export interface FacilityCategory { id: string; site_id: string; name: string; active: boolean; account_id?: string }
export interface FacilityAllocation { category_id: string; year: number; month: number; amount: number }
export interface FacilityPayment {
  id: string; request_id: string; category_id: string; site_id: string; paid_on: string;
  gross_amount: number; tax_amount: number; net_amount: number; reference: string; receipt_url?: string; recorded_by: string;
}
export type BudgetRequest = Pick<MaintenanceRequest, 'id' | 'budgetCategoryId' | 'status' | 'invoiceAmount' | 'createdAt'>;

export function categoryBalance(categoryId: string, year: number, month: number | null, allocations: FacilityAllocation[], payments: FacilityPayment[], requests: BudgetRequest[] = []) {
  const inPeriod = (date: string) => Number(date.slice(0, 4)) === year && (month === null || Number(date.slice(5, 7)) === month);
  const allocatedCents = allocations.filter(a => a.category_id === categoryId && a.year === year && (month === null || a.month === month)).reduce((sum, a) => sum + Math.round(a.amount * 100), 0);
  const spentCents = payments.filter(p => p.category_id === categoryId && inPeriod(p.paid_on)).reduce((sum, p) => sum + Math.round(p.gross_amount * 100), 0);
  const paidRequestIds = new Set(payments.map(p => p.request_id));
  const pendingCents = requests.filter(r => r.budgetCategoryId === categoryId && !['REJECTED', 'PAID', 'CLOSED'].includes(r.status) && !paidRequestIds.has(r.id) && inPeriod(r.createdAt)).reduce((sum, r) => sum + Math.round((r.invoiceAmount ?? 0) * 100), 0);
  return { allocated: allocatedCents / 100, spent: spentCents / 100, pending: pendingCents / 100, remaining: (allocatedCents - spentCents - pendingCents) / 100 };
}
