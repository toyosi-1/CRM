import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

import type { FacilityCategory, FacilityAllocation, FacilityPayment } from './facilityBudget';
export { categoryBalance } from './facilityBudget';
export type { FacilityCategory, FacilityAllocation, FacilityPayment } from './facilityBudget';
interface FacilityFinanceData { categories: FacilityCategory[]; allocations: FacilityAllocation[]; payments: FacilityPayment[] }
const empty: FacilityFinanceData = { categories: [], allocations: [], payments: [] };
export function useFacilityFinance() {
  const [data, setData] = useState<FacilityFinanceData>(empty);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const [categories, allocations, payments] = await Promise.all([
      supabase.from('facility_budget_categories').select('*').order('name'),
      supabase.from('facility_budget_allocations').select('*'),
      supabase.from('facility_budget_payments').select('*').order('paid_on', { ascending: false }),
    ]);
    const err = categories.error ?? allocations.error ?? payments.error;
    if (err) { setError(err.message); setLoading(false); return; }
    setData({ categories: categories.data ?? [], allocations: (allocations.data ?? []).map(a => ({ ...a, amount: Number(a.amount) })), payments: (payments.data ?? []).map(p => ({ ...p, gross_amount: Number(p.gross_amount), tax_amount: Number(p.tax_amount), net_amount: Number(p.net_amount) })) });
    setError(''); setLoading(false);
  }, []);
  useEffect(() => {
    let active = true;
    const load = () => { if (active) void refresh(); };
    load();
    const channel = supabase.channel(`facility-finance-${crypto.randomUUID()}`);
    for (const table of ['facility_budget_categories', 'facility_budget_allocations', 'facility_budget_payments']) channel.on('postgres_changes', { event: '*', schema: 'public', table }, load);
    channel.subscribe();
    const timer = window.setInterval(load, 30000);
    return () => { active = false; window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [refresh]);
  return { ...data, error, loading, refresh };
}
export async function saveFacilityCategory(siteId: string, name: string, id?: string, active = true, accountId?: string) {
  const { error } = await supabase.from('facility_budget_categories').upsert({ ...(id ? { id } : {}), site_id: siteId, name: name.trim(), active, account_id: accountId || null });
  if (error) throw new Error(error.message);
}
export async function saveFacilityBudget(categoryId: string, year: number, months: number[]) {
  const { error } = await supabase.rpc('save_facility_budget', { p_category_id: categoryId, p_year: year, p_months: months });
  if (error) throw new Error(error.message);
}
export async function recordFacilityPayment(requestId: string, categoryId: string, paidOn: string, reference: string, receiptUrl?: string, amount?: number) {
  const { error } = await supabase.rpc('record_facility_payment', { p_request_id: requestId, p_category_id: categoryId, p_paid_on: paidOn, p_reference: reference, p_receipt_url: receiptUrl ?? null, p_amount: amount ?? null });
  if (error) throw new Error(error.message);
}
export async function attachFacilityReceipt(paymentId: string, receiptUrl: string) {
  const { error } = await supabase.rpc('attach_facility_payment_receipt', { p_payment_id: paymentId, p_receipt_url: receiptUrl });
  if (error) throw new Error(error.message);
}
