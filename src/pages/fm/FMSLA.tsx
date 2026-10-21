import { useState, type FormEvent } from 'react';
import { AlertTriangle, Plus, Pencil, Trash2 } from 'lucide-react';
import { useStore, reportSaveError } from '../../store/useStore';
import { formatDate, vendorLabel } from '../../utils/helpers';

function daysUntil(date: string) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

const SLA_CATEGORIES = ['HVAC', 'Water treatment', 'Generator', 'Electrical', 'Plumbing', 'Cleaning', 'Security', 'Lift maintenance', 'Civil works', 'Other'];

export default function FMSLA() {
  const { vendors, sites, activeSiteId, currentUser, facilityVendorSLAs, createFacilityVendorSLA, updateFacilityVendorSLA, deleteFacilityVendorSLA } = useStore();
  const siteId = activeSiteId ?? currentUser?.siteId;
  const site = sites.find(s => s.id === siteId);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ vendorId: '', category: '', customCategory: '', startDate: '', expiryDate: '', responseSlaHours: '8', paymentModel: 'per_service' as 'prepaid' | 'per_service' });

  const siteSlas = facilityVendorSLAs
    .filter(sla => sla.siteId === siteId)
    .map(sla => {
      const vendor = vendors.find(v => v.id === sla.vendorId);
      const daysLeft = daysUntil(sla.expiryDate ?? '');
      return { ...sla, vendor, daysLeft };
    })
    .sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));

  const expiring = siteSlas.filter(s => s.daysLeft !== null && s.daysLeft <= 60 && s.daysLeft >= 0);

  const resetForm = () => {
    setForm({ vendorId: '', category: '', customCategory: '', startDate: '', expiryDate: '', responseSlaHours: '8', paymentModel: 'per_service' });
    setEditing(null);
  };

  const startEdit = (sla: (typeof siteSlas)[number]) => {
    setForm({
      vendorId: sla.vendorId,
      category: SLA_CATEGORIES.includes(sla.category) ? sla.category : 'Other',
      customCategory: SLA_CATEGORIES.includes(sla.category) ? '' : sla.category,
      startDate: sla.startDate ?? '',
      expiryDate: sla.expiryDate ?? '',
      responseSlaHours: String(sla.responseSlaHours),
      paymentModel: sla.paymentModel ?? 'per_service',
    });
    setEditing(sla.id);
    setShowForm(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !form.vendorId || !siteId) return;
    setSaving(true);
    const category = form.category === 'Other' ? form.customCategory.trim() : form.category;
    const payload = {
      siteId,
      vendorId: form.vendorId,
      category,
      startDate: form.startDate,
      expiryDate: form.expiryDate,
      responseSlaHours: Number(form.responseSlaHours),
      paymentModel: form.paymentModel,
      createdBy: currentUser.id,
    };
    try {
      if (editing) {
        await updateFacilityVendorSLA(editing, payload);
      } else {
        await createFacilityVendorSLA(payload);
      }
      resetForm();
      setShowForm(false);
    } catch (error) {
      reportSaveError(error);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this SLA?')) return;
    await deleteFacilityVendorSLA(id);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Service level agreements — {site?.name ?? '…'}</h1>
          <p className="page-subtitle">Active vendor SLAs covering this facility</p>
        </div>
        <button className="btn-acc" onClick={() => { resetForm(); setShowForm(value => !value); }}><Plus size={13} /> Add SLA</button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card p-5 space-y-4">
          <h2 className="section-title">{editing ? 'Edit SLA' : 'Add SLA'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="form-group"><label className="label">Vendor</label><select className="select" value={form.vendorId} onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))} required disabled={Boolean(editing)}><option value="">Select vendor…</option>{vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendorLabel(vendor)}{vendor.category ? ` — ${vendor.category}` : ''}</option>)}</select></div>
            <div className="form-group"><label className="label">Service category</label><select className="select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required><option value="">Select category…</option>{SLA_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="form-group"><label className="label">Start date</label><input className="input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Expiry date</label><input className="input" type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Response SLA (hours)</label><input className="input" type="number" min={1} value={form.responseSlaHours} onChange={e => setForm(f => ({ ...f, responseSlaHours: e.target.value }))} required /></div>
            <div className="form-group"><label className="label">Billing</label><select className="select" value={form.paymentModel} onChange={e => setForm(f => ({ ...f, paymentModel: e.target.value as 'prepaid' | 'per_service' }))}><option value="per_service">Pay per service</option><option value="prepaid">Annual — prepaid</option></select><p className="text-[11px] text-slate-400 mt-1">Prepaid: PPM visits raise a work order straight to the vendor — no payment request needed.</p></div>
            {form.category === 'Other' && <div className="form-group md:col-span-5"><label className="label">Custom service category</label><input className="input" value={form.customCategory} onChange={e => setForm(f => ({ ...f, customCategory: e.target.value }))} placeholder="Enter category name" required /></div>}
          </div>
          <div className="flex gap-2"><button type="button" className="btn-ghost" onClick={() => { resetForm(); setShowForm(false); }}>Cancel</button><button className="btn-acc" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update SLA' : 'Save SLA'}</button></div>
        </form>
      )}

      {expiring.length > 0 && (
        <div className="alert-warning">
          <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            {expiring.map(s => (
              <p key={s.id}><strong>{s.vendor?.name ?? 'Vendor'}</strong> SLA expires in {s.daysLeft} day{s.daysLeft === 1 ? '' : 's'}</p>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold">Service category</th>
                <th className="px-4 py-3 font-semibold">Start date</th>
                <th className="px-4 py-3 font-semibold">Expiry date</th>
                <th className="px-4 py-3 font-semibold">Days left</th>
                <th className="px-4 py-3 font-semibold">Response SLA</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {siteSlas.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{s.vendor?.name ?? 'Unknown vendor'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.category || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.startDate ? formatDate(s.startDate) : '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{s.expiryDate ? formatDate(s.expiryDate) : '—'}</td>
                  <td className="px-4 py-3">
                    {s.daysLeft === null ? '—' : (
                      <span className={s.daysLeft < 0 ? 'text-red-600 font-semibold' : s.daysLeft <= 60 ? 'text-amber-600 font-semibold' : 'text-slate-600'}>
                        {s.daysLeft < 0 ? 'Expired' : `${s.daysLeft} days`}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.responseSlaHours ? `${s.responseSlaHours} hrs response` : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {s.daysLeft !== null && s.daysLeft < 0
                        ? <span className="badge bg-red-100 text-red-700">Expired</span>
                        : s.daysLeft !== null && s.daysLeft <= 60
                          ? <span className="badge bg-amber-100 text-amber-700">Expiring soon</span>
                          : <span className="badge bg-emerald-100 text-emerald-700">Active</span>}
                      <span className={`badge ${s.paymentModel === 'prepaid' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{s.paymentModel === 'prepaid' ? 'Prepaid' : 'Pay per service'}</span>
                      {s.suspended && <span className="badge bg-red-100 text-red-700">Suspended by Procurement</span>}
                      {s.renewalReview && <span className="badge bg-amber-100 text-amber-700">Renewal review</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => startEdit(s)} className="btn-ghost text-xs"><Pencil size={12} /> Edit</button>
                      <button type="button" onClick={() => remove(s.id)} className="btn-ghost text-xs text-red-600"><Trash2 size={12} /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {siteSlas.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">No SLAs registered — add one for a vendor covering this facility</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
