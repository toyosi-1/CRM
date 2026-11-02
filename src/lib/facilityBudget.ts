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
  // Available = annual budget − all year spending − open commitments. Monthly
  // allocations pace the year; spend in one month is not fenced to that month's plan.
  const annualCents = allocations.filter(a => a.category_id === categoryId && a.year === year).reduce((sum, a) => sum + Math.round(a.amount * 100), 0);
  const yearSpentCents = payments.filter(p => p.category_id === categoryId && Number(p.paid_on.slice(0, 4)) === year).reduce((sum, p) => sum + Math.round(p.gross_amount * 100), 0);
  const paidByRequest = new Map<string, number>();
  for (const p of payments) paidByRequest.set(p.request_id, (paidByRequest.get(p.request_id) ?? 0) + Math.round(p.gross_amount * 100));
  const pendingCents = requests.filter(r => r.budgetCategoryId === categoryId && !['REJECTED', 'PAID', 'CLOSED'].includes(r.status))
    .reduce((sum, r) => sum + Math.max(0, Math.round((r.invoiceAmount ?? 0) * 100) - (paidByRequest.get(r.id) ?? 0)), 0);
  return { allocated: allocatedCents / 100, spent: spentCents / 100, pending: pendingCents / 100, remaining: (annualCents - yearSpentCents - pendingCents) / 100 };
}
