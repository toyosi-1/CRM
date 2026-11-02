import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Plus, Search, Pencil, X, Paperclip } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { uploadFile } from '../../lib/db';
import { formatDate, formatCurrency, vendorMatches } from '../../utils/helpers';
import type { Vendor } from '../../types';

function maskAccount(account: string) {
  if (!account) return '—';
  return `****${account.slice(-4)}`;
}

type VendorForm = {
  name: string; category: string; type: Vendor['type']; bankName: string; accountNumber: string; accountName: string;
  contactPerson: string; phone: string; email: string; tin: string; rcNumber: string; exemptionNotes: string;
  totalJobsCompleted: number; totalAmountPaid: number; avgCompletionDays: number; lastJobDate: string;
  riskScore: Vendor['riskScore']; tier: Vendor['tier']; verified: boolean; approvalStatus: Vendor['approvalStatus'];
};

const EMPTY_VENDOR: VendorForm = {
  name: '', category: '', type: 'recurring', bankName: '', accountNumber: '', accountName: '',
  contactPerson: '', phone: '', email: '', tin: '', rcNumber: '', exemptionNotes: '',
  totalJobsCompleted: 0, totalAmountPaid: 0, avgCompletionDays: 0, lastJobDate: '',
  riskScore: 'low', tier: '3', verified: false, approvalStatus: 'approved',
};

export default function FMVendors() {
  const { vendors, requests, activeSiteId, currentUser, upsertVendor } = useStore();
  const siteId = activeSiteId ?? currentUser?.siteId;
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_VENDOR });
  const [docBusy, setDocBusy] = useState(false);
  const attachDoc = async (vendor: Vendor, file: File) => {
    setDocBusy(true);
    try {
      const url = await uploadFile(`vendor-docs/${vendor.id}/${crypto.randomUUID()}-${file.name}`, file);
      const documents = [...(vendor.documents ?? []), { name: file.name, url }];
      await upsertVendor({ id: vendor.id, documents });
      setEditing(v => v ? { ...v, documents } : v);
    } finally { setDocBusy(false); }
  };
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (showForm) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [showForm]);

  const siteRequests = requests.filter(r => r.siteId === siteId);
  const oneOffs = useMemo(() => siteRequests
    .filter(r => r.oneTimeVendor?.name)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(req => ({ req, v: req.oneTimeVendor! })), [siteRequests]);
  const lastUsed = useMemo(() => {
    const map = new Map<string, string>();
    siteRequests.forEach(r => {
      if (!r.vendorId) return;
      const existing = map.get(r.vendorId);
      if (!existing || new Date(r.createdAt) > new Date(existing)) map.set(r.vendorId, r.createdAt);
    });
    return map;
  }, [siteRequests]);

  const filtered = vendors.filter(v => vendorMatches(v, query));

  const startEdit = (vendor: Vendor) => {
    setEditing(vendor);
    setForm({
      name: vendor.name, category: vendor.category, type: vendor.type,
      bankName: vendor.bankName, accountNumber: vendor.accountNumber, accountName: vendor.accountName,
      contactPerson: vendor.contactPerson, phone: vendor.phone, email: vendor.email ?? '',
      tin: vendor.tin, rcNumber: vendor.rcNumber ?? '', exemptionNotes: vendor.exemptionNotes ?? '',
      totalJobsCompleted: vendor.totalJobsCompleted, totalAmountPaid: vendor.totalAmountPaid,
      avgCompletionDays: vendor.avgCompletionDays, lastJobDate: vendor.lastJobDate,
      riskScore: vendor.riskScore, tier: vendor.tier, verified: vendor.verified,
      approvalStatus: vendor.approvalStatus ?? 'approved',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ ...EMPTY_VENDOR });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    try {
      await upsertVendor({
        id: editing?.id ?? crypto.randomUUID(),
        name: form.name.trim(),
        category: form.category.trim(),
        type: form.type,
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        accountName: form.accountName.trim(),
        tin: form.tin.trim(),
        rcNumber: form.rcNumber.trim(),
        exemptionNotes: form.exemptionNotes.trim(),
        tier: form.tier,
        verified: form.verified,
        approvalStatus: 'approved',
      });
      resetForm();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Vendor directory</h1>
          <p className="page-subtitle">Shared vendor pool · {filtered.length} vendors</p>
        </div>
        <button className="btn-acc" onClick={() => { resetForm(); setShowForm(value => !value); }}><Plus size={13} /> Add new vendor</button>
      </div>

      {showForm && (
        <form ref={formRef} className="card p-5 space-y-4" onSubmit={submit}>
          <div className="flex items-center justify-between">
            <h2 className="section-title">{editing ? 'Edit vendor' : 'Add vendor'}</h2>
            <button type="button" className="btn-ghost" onClick={() => { resetForm(); setShowForm(false); }}><X size={14} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="form-group"><label className="label">Vendor name <span className="req">*</span></label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="form-group"><label className="label">Category <span className="req">*</span></label><input className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. HVAC, Electrical" required /></div>
            <div className="form-group"><label className="label">Type</label><select className="select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Vendor['type'] }))}><option value="recurring">Recurring</option><option value="one_time">One-time</option></select></div>
            <div className="form-group"><label className="label">Contact person</label><input className="input" value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Bank <span className="req">*</span></label><input className="input" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} required /></div>
            <div className="form-group"><label className="label">Account number <span className="req">*</span></label><input className="input" value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} required /></div>
            <div className="form-group"><label className="label">Account name <span className="req">*</span></label><input className="input" value={form.accountName} onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))} required /></div>
            <div className="form-group"><label className="label">TIN</label><input className="input" value={form.tin} onChange={e => setForm(f => ({ ...f, tin: e.target.value }))} /></div>
            <div className="form-group"><label className="label">RC number</label><input className="input" value={form.rcNumber} onChange={e => setForm(f => ({ ...f, rcNumber: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Exemption / notes</label><input className="input" value={form.exemptionNotes} onChange={e => setForm(f => ({ ...f, exemptionNotes: e.target.value }))} /></div>
          </div>
          {editing && (
            <div className="border-t border-slate-100 pt-4">
              <p className="label mb-2">Certifications & documents</p>
              <div className="flex flex-wrap items-center gap-2">
                {(editing.documents ?? []).map(doc => (
                  <a key={doc.url} href={doc.url} target="_blank" rel="noreferrer" className="btn-secondary text-xs"><Paperclip size={12} /> {doc.name}</a>
                ))}
                <label className="btn-ghost text-xs cursor-pointer">{docBusy ? 'Uploading…' : 'Attach document'}
                  <input type="file" className="hidden" disabled={docBusy} onChange={e => { const file = e.target.files?.[0]; if (file) void attachDoc(editing, file); e.target.value = ''; }} />
                </label>
              </div>
            </div>
          )}
          <div className="flex gap-2"><button type="button" className="btn-ghost" onClick={() => { resetForm(); setShowForm(false); }}>Cancel</button><button className="btn-acc" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update vendor' : 'Save vendor'}</button></div>
        </form>
      )}

      <div className="card p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search vendors by name, alias, email, phone or category…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Bank</th>
                <th className="px-4 py-3 font-semibold">Last used</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{v.name}
                    {v.alias && <div className="text-xs font-normal text-slate-500">Also known as {v.alias}</div>}
                    {(v.phone || v.email) && <div className="text-xs font-normal text-slate-500">{v.phone}{v.phone && v.email ? ' · ' : ''}{v.email && <a className="text-brand-600" href={`mailto:${v.email}`}>{v.email}</a>}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.category || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{v.bankName ? `${v.bankName} · ${maskAccount(v.accountNumber)}` : '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{lastUsed.get(v.id) ? formatDate(lastUsed.get(v.id)!) : '—'}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => startEdit(v)} className="btn-ghost text-xs"><Pencil size={12} /> Edit</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">No vendors match your search</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {oneOffs.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-slate-100"><h2 className="font-bold">One-off vendor history</h2><p className="text-xs text-slate-500 mt-1">Vendors used once on requests — payment details recorded per job</p></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100"><th className="px-4 py-3 font-semibold">Vendor</th><th className="px-4 py-3 font-semibold">Bank</th><th className="px-4 py-3 font-semibold">Request</th><th className="px-4 py-3 font-semibold">Amount</th><th className="px-4 py-3 font-semibold">Used</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {oneOffs.map(({ req, v }) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{v.name}{v.contactPerson && <div className="text-xs font-normal text-slate-500">{v.contactPerson}{v.phone ? ` · ${v.phone}` : ''}</div>}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{v.bankName ? `${v.bankName} · ${maskAccount(v.accountNumber ?? '')}` : '—'}</td>
                    <td className="px-4 py-3 text-brand-600 font-bold text-xs">{req.requestNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(req.invoiceAmount ?? 0)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(req.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
