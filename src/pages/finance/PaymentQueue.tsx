import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DollarSign, Eye, CheckCircle, Receipt } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { uploadFile } from '../../lib/db';
import { attachFacilityReceipt, categoryBalance, useFacilityFinance } from '../../lib/facilityFinance';
import { PriorityBadge, StatusBadge } from '../../components/shared/Badges';
import { formatCurrency, TAX_LABELS } from '../../utils/helpers';
import type { MaintenanceRequest, TaxType } from '../../types';

const today = () => new Date().toLocaleDateString('en-CA');
export default function PaymentQueue() {
  const navigate = useNavigate();
  const location = useLocation();
  const register = location.pathname.endsWith('/receipts');
  const { currentUser, requests, sites, vendors, markPaid, updateRequest } = useStore();
  const { categories, allocations, payments, error, loading, refresh } = useFacilityFinance();
  const [siteId, setSiteId] = useState('');
  const [missingOnly, setMissingOnly] = useState(false);
  const [form, setForm] = useState<{ request: MaintenanceRequest; categoryId: string; paidOn: string; reference: string; taxType: TaxType; receipt: File | null; amount: string } | null>(null);
  const [saving, setSaving] = useState('');
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState('');
  const queue = requests.filter(r => (!siteId || r.siteId === siteId) && (register ? ['PAID', 'CLOSED'].includes(r.status) && (!missingOnly || !r.paymentReceiptUrl) : ['PAYMENT_PENDING', 'ADMIN_APPROVED'].includes(r.status)));
  const openPayment = (request: MaintenanceRequest) => {
    setSaveError(''); setSuccess('');
    const match = categories.find(c => c.site_id === request.siteId && c.name.toLowerCase() === request.category?.toLowerCase());
    setForm({ request, categoryId: request.budgetCategoryId ?? match?.id ?? '', paidOn: today(), reference: '', taxType: request.taxType ?? 'exempt', receipt: null, amount: String(Math.max(0, (request.invoiceAmount ?? 0) - (request.amountPaid ?? 0))) });
  };
  const uploadReceipt = async (requestId: string, file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('Choose a JPG, PNG, WebP or PDF receipt under 10 MB.');
    return uploadFile(`receipts/${requestId}/${crypto.randomUUID()}.${file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1]}`, file);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!form || !currentUser) return;
    setSaving(form.request.id); setSaveError('');
    try {
      const gross = Number(form.amount);
      const rate = form.taxType === '5pct_wht' ? 0.05 : form.taxType === '10pct_wht' ? 0.10 : 0;
      const tax = Math.round(gross * rate * 100) / 100;
      await updateRequest(form.request.id, { taxType: form.taxType, grossAmount: form.request.invoiceAmount, taxAmount: tax, netPayment: gross - tax });
      const receiptUrl = form.receipt ? await uploadReceipt(form.request.id, form.receipt) : undefined;
      await markPaid(form.request.id, form.categoryId, form.paidOn, form.reference, receiptUrl, gross);
      setForm(null); setSuccess('Payment recorded and category budget updated.'); await refresh();
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'Payment could not be recorded'); }
    finally { setSaving(''); }
  };
  const attach = async (request: MaintenanceRequest, file: File) => {
    setSaving(request.id); setSaveError(''); setSuccess('');
    try {
      const url = await uploadReceipt(request.id, file);
      const payment = payments.find(p => p.request_id === request.id);
      if (payment) await attachFacilityReceipt(payment.id, url);
      else await updateRequest(request.id, { paymentReceiptUrl: url });
      await refresh(); setSuccess('Receipt attached. No additional budget debit was made.');
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'Receipt could not be attached'); }
    finally { setSaving(''); }
  };
  const balance = form ? categoryBalance(form.categoryId, Number(form.paidOn.slice(0, 4)), Number(form.paidOn.slice(5, 7)), allocations, payments, requests) : null;
  const remainingDue = form ? Math.max(0, (form.request.invoiceAmount ?? 0) - (form.request.amountPaid ?? 0)) : 0;
  const gross = form ? (Number(form.amount) || 0) : 0;
  const tax = form ? Math.round(gross * (form.taxType === '5pct_wht' ? 0.05 : form.taxType === '10pct_wht' ? 0.10 : 0) * 100) / 100 : 0;
  return <div className="space-y-5">
    <header className="flex items-center justify-between gap-4"><div><h1 className="page-title">{register ? 'Paid requests & receipts' : 'Payment queue'}</h1><p className="page-subtitle">{register ? 'Payment history, budget debits and supporting evidence' : 'Record approved payments against the correct facility budget category'}</p></div><button className="btn-secondary" onClick={() => navigate(register ? '/finance/payments' : '/finance/receipts')}>{register ? 'Payment queue' : 'Payment register'}</button></header>
    <div className="card p-4 flex gap-4 items-center flex-wrap"><select aria-label="Filter facility" className="input max-w-xs" value={siteId} onChange={e => setSiteId(e.target.value)}><option value="">All facilities</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>{register && <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={missingOnly} onChange={e => setMissingOnly(e.target.checked)} />Missing receipts only</label>}<span className="text-xs text-slate-500">{queue.length} requests</span></div>
    {(error || saveError) && <div role="alert" className="card p-4 text-red-600">{saveError || error}</div>}
    {success && <div role="status" className="card p-4 text-emerald-700">{success}</div>}
    {loading ? <div className="card p-10 text-center">Loading payment information…</div> : queue.map(req => {
      const payment = payments.find(p => p.request_id === req.id);
      const category = categories.find(c => c.id === (payment?.category_id ?? req.budgetCategoryId));
      const receipt = payment?.receipt_url || req.paymentReceiptUrl;
      const vendor = vendors.find(v => v.id === req.vendorId);
      return <section className="card p-5" key={req.id}>
        <div className="flex justify-between items-start gap-4 flex-wrap"><div><div className="flex items-center gap-2 flex-wrap"><span className="font-bold text-brand-600">{req.requestNumber}</span><PriorityBadge priority={req.priority} /><StatusBadge status={req.status} />{register && !receipt && <span className="text-xs font-semibold text-amber-700">Receipt outstanding</span>}</div><p className="text-sm mt-2">{req.description}</p><p className="text-xs text-slate-500 mt-2">{req.siteName} · {category?.name ?? req.category ?? 'Category mapping required'} · {req.vendorName ?? 'Vendor not specified'}</p></div>
          <div className="flex gap-2"><button className="btn-secondary text-xs" onClick={() => navigate(`/request/${req.id}`)}><Eye size={12} />View request</button>{!register && <button className="btn-primary text-xs" disabled={!!error || !!saving} onClick={() => openPayment(req)}><DollarSign size={12} />Record payment</button>}</div></div>
                {req.internalNote && <p className="mt-3 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2"><span className="font-bold">FM note:</span> {req.internalNote}</p>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-5"><div><p className="text-xs text-slate-400">Invoice total</p><p className="font-bold">{formatCurrency(req.invoiceAmount ?? payment?.gross_amount ?? 0)}</p></div><div><p className="text-xs text-slate-400">Paid / outstanding</p><p className="font-bold">{formatCurrency(req.amountPaid ?? 0)} <span className="text-amber-700">· {formatCurrency(Math.max(0, (req.invoiceAmount ?? 0) - (req.amountPaid ?? 0)))} due</span></p></div><div><p className="text-xs text-slate-400">Payment date</p><p>{payment?.paid_on ?? req.paidAt?.slice(0, 10) ?? 'Not yet paid'}</p></div><div><p className="text-xs text-slate-400">Reference</p><p>{payment?.reference ?? '—'}</p></div></div>
        {!register && <div className="mt-3 flex items-center gap-4 flex-wrap"><p className="text-xs text-slate-500">Vendor bank: {vendor?.bankName || req.oneTimeVendor?.bankName || 'Not supplied'} · {vendor?.accountNumber || req.oneTimeVendor?.accountNumber || 'No account number'}</p>{req.jobCompletionUrl && <a className="text-xs font-bold text-brand-600 underline" href={req.jobCompletionUrl} target="_blank" rel="noreferrer">View job completion evidence (JCF)</a>}</div>}
        {register && <div className="mt-4 flex items-center gap-3 flex-wrap">{receipt ? <a className="btn-secondary text-xs" href={receipt} target="_blank" rel="noreferrer"><Receipt size={12} /> View receipt</a> : <p className="text-xs text-amber-700">Paid · receipt still required</p>}<label className="btn-secondary text-xs cursor-pointer">{saving === req.id ? 'Uploading…' : receipt ? 'Replace receipt' : 'Upload receipt'}<input className="sr-only" disabled={!!saving || !!error} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => { const file = e.target.files?.[0]; if (file) void attach(req, file); e.target.value = ''; }} /></label>{!payment && <span className="text-xs text-slate-400">Historical payment · not mapped to the new category budget</span>}</div>}
      </section>;
    })}
    {!loading && queue.length === 0 && <div className="card p-16 text-center"><CheckCircle className="mx-auto text-emerald-600 mb-4" /><h2 className="font-bold">{register ? 'No matching paid requests' : 'No payments waiting'}</h2></div>}
    {form && <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center"><form onSubmit={submit} className="card p-6 w-full max-w-xl max-h-[90vh] overflow-auto space-y-4"><h2 className="font-bold text-lg">Record payment · {form.request.requestNumber}</h2><p className="text-sm text-slate-500">This records a payment already made outside the platform. It does not transfer money.</p>
      <label className="block text-sm">Facility budget category<select required className="input mt-1" value={form.categoryId} disabled={!!form.request.budgetCategoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}><option value="">Select category</option>{categories.filter(c => c.site_id === form.request.siteId && (c.active || c.id === form.request.budgetCategoryId)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm">Payment date<input className="input mt-1" type="date" required max={today()} value={form.paidOn} onChange={e => setForm({ ...form, paidOn: e.target.value })} /></label><label className="text-sm">Tax treatment<select className="input mt-1" value={form.taxType} onChange={e => setForm({ ...form, taxType: e.target.value as TaxType })}>{(['exempt', '5pct_wht', '10pct_wht'] as TaxType[]).map(t => <option key={t} value={t}>{TAX_LABELS[t]}</option>)}</select></label></div>
      <label className="block text-sm">Payment amount (₦) — {formatCurrency(remainingDue)} outstanding<input className="input mt-1" type="number" required min="0.01" max={remainingDue} step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
      <label className="block text-sm">Payment reference<input required maxLength={200} className="input mt-1" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></label>
      <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-2"><p>Budget debit: <strong>{formatCurrency(gross)}</strong>{gross < remainingDue - 0.005 && <span className="text-amber-700 font-semibold"> · part payment — {formatCurrency(remainingDue - gross)} will remain committed</span>}</p><p>WHT: {formatCurrency(tax)} · Net paid: <strong>{formatCurrency(gross - tax)}</strong></p><p>Category balance (annual): <strong>{formatCurrency(balance?.remaining ?? 0)}</strong></p></div>
      <label className="block text-sm">Receipt (optional now)<input className="input mt-1" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setForm({ ...form, receipt: e.target.files?.[0] ?? null })} /></label><p className="text-xs text-slate-500">No receipt yet? The request will show Paid · Receipt outstanding until you attach it in the payment register.</p>
      {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
      {balance && balance.remaining < 0 && <p className="text-sm text-amber-700">This payment exceeds the category budget. It will show a negative, exceeded balance — the payment will still be recorded.</p>}
      <div className="flex justify-end gap-3"><button type="button" disabled={!!saving} className="btn-secondary" onClick={() => setForm(null)}>Cancel</button><button className="btn-success" disabled={!!saving || !form.categoryId || !form.reference.trim() || gross <= 0 || gross > remainingDue + 0.005}>{saving ? 'Recording…' : gross < remainingDue - 0.005 ? 'Record part payment' : 'Confirm paid & debit budget'}</button></div>
    </form></div>}
  </div>;
}
