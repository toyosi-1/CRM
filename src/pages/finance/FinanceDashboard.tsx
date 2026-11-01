import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Pencil, Wallet, Receipt, CheckCircle, BookOpen } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { categoryBalance, saveFacilityBudget, saveFacilityCategory, useFacilityFinance, type FacilityCategory } from '../../lib/facilityFinance';
import { formatCurrency } from '../../utils/helpers';

const months = Array.from({ length: 12 }, (_, i) => new Date(2026, i, 1).toLocaleString('en', { month: 'short' }));
export default function FinanceDashboard() {
  const navigate = useNavigate();
  const { currentUser, sites, requests, financeAdvanced, setFinanceAdvanced } = useStore();
  const { categories, allocations, payments, loading, error, refresh } = useFacilityFinance();
  const [selectedSite, setSelectedSite] = useState('');
  const siteId = selectedSite || sites[0]?.id || '';
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(new Date().getMonth() + 1);
  const [categoryForm, setCategoryForm] = useState<{ id?: string; siteId: string; name: string; active: boolean } | null>(null);
  const [budgetForm, setBudgetForm] = useState<{ category: FacilityCategory; year: number; values: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const siteCategories = categories.filter(c => c.site_id === siteId);
  const rows = siteCategories.map(c => ({ ...c, ...categoryBalance(c.id, year, month, allocations, payments, requests), annual: categoryBalance(c.id, year, null, allocations, payments, requests).allocated }));
  const totals = rows.reduce((s, r) => ({ allocated: s.allocated + r.allocated, pending: s.pending + r.pending, spent: s.spent + r.spent, remaining: s.remaining + r.remaining }), { allocated: 0, pending: 0, spent: 0, remaining: 0 });
  const periodPayments = payments.filter(p => p.site_id === siteId && Number(p.paid_on.slice(0, 4)) === year && (month === null || Number(p.paid_on.slice(5, 7)) === month));
  const missing = periodPayments.filter(p => !p.receipt_url);
  const queue = requests.filter(r => r.siteId === siteId && ['PAYMENT_PENDING', 'ADMIN_APPROVED'].includes(r.status));
  const save = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setSaveError('');
    try {
      if (categoryForm) await saveFacilityCategory(categoryForm.siteId, categoryForm.name, categoryForm.id, categoryForm.active);
      if (budgetForm) await saveFacilityBudget(budgetForm.category.id, budgetForm.year, budgetForm.values.map(Number));
      setCategoryForm(null); setBudgetForm(null); await refresh();
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'Could not save changes'); }
    finally { setBusy(false); }
  };
  const editBudget = (category: FacilityCategory) => {
    setSaveError('');
    setBudgetForm({ category, year, values: months.map((_, i) => String(allocations.find(a => a.category_id === category.id && a.year === year && a.month === i + 1)?.amount ?? 0)) });
  };
  return <div className="space-y-5">
    <header className="dash-header flex items-center justify-between gap-4 flex-wrap">
      <div><p className="text-xs uppercase tracking-widest text-slate-400">Facility finance</p><h1 className="text-xl font-semibold text-white mt-1">Budgets & payments</h1><p className="text-sm text-slate-400 mt-1">{currentUser?.name}<br />Finance · Facility category allocations, approved requests and payment evidence</p></div>
      <div className="flex gap-2 flex-wrap">
        <button className="btn-primary" onClick={() => navigate('/finance/payments')}><Wallet size={15} /> Payment queue</button>
        <button className="btn-secondary" onClick={() => { if (financeAdvanced) setFinanceAdvanced(false); else { setFinanceAdvanced(true); navigate('/finance/ledger'); } }}><BookOpen size={15} /> {financeAdvanced ? 'Standard view' : 'Advanced mode'}</button>
      </div>
    </header>
    <div className="card p-4 flex items-end flex-wrap gap-4">
      <label className="text-xs font-semibold flex-1 min-w-48">Facility<select className="input mt-1" value={siteId} onChange={e => setSelectedSite(e.target.value)}><option value="" disabled>Select facility</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="text-xs font-semibold">Year<input className="input mt-1 w-28" type="number" min="2020" max="2100" value={year} onChange={e => setYear(Number(e.target.value))} /></label>
      <label className="text-xs font-semibold">Period<select className="input mt-1" value={month ?? ''} onChange={e => setMonth(e.target.value ? Number(e.target.value) : null)}><option value="">Full year</option>{months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
      <button disabled={!siteId || loading || !!error} className="btn-primary" onClick={() => { setSaveError(''); setCategoryForm({ siteId, name: '', active: true }); }}><Plus size={14} /> Create category</button>
    </div>
    {error && <div className="card p-4 text-red-700" role="alert">Facility finance could not load: {error}<button className="ml-3 underline" onClick={() => void refresh()}>Retry</button></div>}
    {loading ? <div className="card p-12 text-center">Loading facility budgets…</div> : !error && <>
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">{[
        ['Allocated budget', formatCurrency(totals.allocated), <Building2 size={18} />],
        ['Committed (open requests)', formatCurrency(totals.pending), <Wallet size={18} />],
        ['Paid spending', formatCurrency(totals.spent), <CheckCircle size={18} />],
        ['Available balance', formatCurrency(totals.remaining), <Wallet size={18} />],
        ['Receipts outstanding', String(missing.length), <Receipt size={18} />],
      ].map(([label, value, icon], i) => <div key={i} className="card p-5"><div className="text-brand-600 mb-3">{icon}</div><p className={`text-xl font-bold ${label === 'Available balance' && totals.remaining < 0 ? 'text-red-600' : ''}`}>{value}</p><p className="text-xs text-slate-500 mt-1">{label}</p></div>)}</div>
      <section className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100"><h2 className="font-bold">Facility budget mapping</h2><p className="text-xs text-slate-500 mt-1">Annual budgets are the sum of 12 monthly allocations. Active categories appear in this facility’s FM request list. Open requests commit their amount immediately; payment moves it to paid spending. Overspending is allowed and shown as a negative, exceeded balance.</p></div>
        {rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Category', 'Annual budget', 'Period allocation', 'Committed', 'Paid / spent', 'Available', 'Actions'].map(h => <th className="px-5 py-3" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(r => <tr key={r.id}>
          <td className="px-5 py-4"><p className="font-semibold">{r.name}</p><span className={`text-xs ${r.active ? 'text-emerald-600' : 'text-slate-400'}`}>{r.active ? 'Active in FM requests' : 'Inactive · history retained'}</span></td>
          <td className="px-5 py-4">{formatCurrency(r.annual)}</td><td className="px-5 py-4">{formatCurrency(r.allocated)}</td><td className="px-5 py-4">{formatCurrency(r.pending)}</td><td className="px-5 py-4">{formatCurrency(r.spent)}</td>
          <td className="px-5 py-4 font-semibold"><span className={r.remaining < 0 ? 'text-red-600' : ''}>{formatCurrency(r.remaining)}</span>{r.remaining < 0 && <span className="block text-xs font-semibold text-red-600 mt-0.5">Budget exceeded</span>}</td>
          <td className="px-5 py-4"><div className="flex gap-2"><button className="btn-secondary text-xs" onClick={() => { setSaveError(''); setCategoryForm({ id: r.id, siteId: r.site_id, name: r.name, active: r.active }); }}><Pencil size={12} /> Edit category</button><button className="btn-secondary text-xs" onClick={() => editBudget(r)}>Edit budget</button></div></td>
        </tr>)}</tbody></table></div> : <div className="p-12 text-center"><Building2 className="mx-auto text-brand-600 mb-3" /><h3 className="font-bold">Map this facility’s budget</h3><p className="text-sm text-slate-500 mt-2">Create a category, allocate its annual budget across months, then record approved request payments against it.</p></div>}
      </section>
      <div className="grid md:grid-cols-2 gap-4"><section className="card p-5"><h2 className="font-bold">Approved requests</h2><p className="text-sm text-slate-500 mt-2">{queue.length} requests awaiting payment for this facility.</p><button className="btn-primary mt-4" onClick={() => navigate('/finance/payments')}>Review payment queue</button></section><section className="card p-5"><h2 className="font-bold">Payment evidence</h2><p className="text-sm text-slate-500 mt-2">{periodPayments.length} payments recorded · {missing.length} awaiting receipts in this period.</p><button className="btn-secondary mt-4" onClick={() => navigate('/finance/receipts')}>View paid requests & receipts</button></section></div>
      {requests.some(r => r.siteId === siteId && ['PAID', 'CLOSED'].includes(r.status) && !payments.some(p => p.request_id === r.id)) && <p className="text-xs text-amber-700">Historical paid requests without category mappings are retained in the payment register but excluded from these new category budgets.</p>}
    </>}
    {(categoryForm || budgetForm) && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><form onSubmit={save} className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-auto">
      <h2 className="font-bold text-lg">{categoryForm ? categoryForm.id ? 'Edit category' : 'Create facility category' : `Edit ${budgetForm?.year} budget · ${budgetForm?.category.name}`}</h2>
      {categoryForm && <div className="space-y-4 mt-5"><label className="block text-sm">Category name<input className="input mt-1" required maxLength={100} value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={categoryForm.active} onChange={e => setCategoryForm({ ...categoryForm, active: e.target.checked })} />Available for new FM requests</label></div>}
      {budgetForm && <div className="mt-4 space-y-4"><p className="text-sm text-slate-500">Enter monthly allocations in NGN. Recorded payments cannot be removed by reducing a budget.</p><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{months.map((m, i) => <label key={m} className="text-xs font-semibold">{m}<input className="input mt-1" required type="number" min="0" step="0.01" value={budgetForm.values[i]} onChange={e => setBudgetForm({ ...budgetForm, values: budgetForm.values.map((v, n) => n === i ? e.target.value : v) })} /></label>)}</div><p className="font-bold">Annual total: {formatCurrency(budgetForm.values.reduce((s, v) => s + Number(v || 0), 0))}</p></div>}
      {saveError && <p role="alert" className="text-sm text-red-600 mt-4">{saveError}</p>}
      <div className="flex justify-end gap-3 mt-6"><button type="button" disabled={busy} className="btn-secondary" onClick={() => { setCategoryForm(null); setBudgetForm(null); }}>Cancel</button><button disabled={busy || !!categoryForm && !categoryForm.name.trim()} className="btn-primary">{busy ? 'Saving…' : 'Save changes'}</button></div>
    </form></div>}
  </div>;
}
