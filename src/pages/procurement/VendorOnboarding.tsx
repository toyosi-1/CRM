import { useState, type FormEvent } from 'react';
import { Award, Pencil, Search, Store, User, XCircle } from 'lucide-react';
import { useStore, reportSaveError } from '../../store/useStore';
import { formatCurrency, vendorMatches } from '../../utils/helpers';
import type { Vendor } from '../../types';

const CATEGORIES = ['Electrical', 'Plumbing', 'HVAC & MEP', 'Lock & access', 'Cleaning & janitorial', 'Pool & water', 'Generator', 'Lift maintenance', 'Horticulture', 'Fumigation', 'Civil / building works', 'Diesel supply', 'Other'];
const BANKS = ['Access Bank', 'First Bank', 'GTBank', 'UBA', 'Zenith Bank', 'Union Bank', 'Fidelity Bank', 'Ecobank'];

export default function VendorOnboarding() {
  const { currentUser, vendors, users, upsertVendor } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const filteredVendors = vendors.filter(v => vendorMatches(v, query));
  const canManage = currentUser?.role === 'procurement' || currentUser?.role === 'admin';

  const openForm = (vendor?: Vendor) => {
    setEditing(vendor ?? null);
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage) return;
    const form = event.currentTarget.elements as unknown as Record<string, HTMLInputElement | HTMLSelectElement>;
    setSaving(true);
    try {
      await upsertVendor({
        ...(editing ?? {
          id: crypto.randomUUID(), type: 'recurring' as const, riskScore: 'low' as const,
          totalJobsCompleted: 0, totalAmountPaid: 0, avgCompletionDays: 0, lastJobDate: '',
          createdAt: new Date().toISOString(),
        }),
        name: form.vendorName.value, category: form.category.value,
        rcNumber: form.rcNumber.value, exemptionNotes: form.exemptionNotes.value,
        bankName: form.bank.value, accountNumber: form.accountNo.value, accountName: form.accountName.value,
        contactPerson: form.contactPerson.value, phone: form.phone.value, email: form.email.value.trim(), alias: form.alias.value.trim(), tin: form.tin.value,
        guarantorProfileId: form.guarantor.value || undefined,
      });
      closeForm();
    } catch (error) {
      reportSaveError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Procurement</p>
            <h1 className="text-2xl font-black text-white tracking-tight">Vendor onboarding</h1>
            <p className="text-white/60 text-sm mt-1">Register vendors and manage their payment details.</p>
          </div>
          {canManage && <button onClick={() => openForm()} className="btn-white-glass"><User size={14} />Register vendor</button>}
        </div>
      </div>

      {showForm && (
        <form key={editing?.id ?? 'new'} onSubmit={submit} className="card p-5 space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-black text-slate-900">{editing ? `Edit ${editing.name}` : 'Register vendor'}</h2><button type="button" onClick={closeForm}><XCircle size={18} className="text-slate-400" /></button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group"><label className="label">Vendor / business name</label><input name="vendorName" className="input" defaultValue={editing?.name} required /></div>
            <div className="form-group"><label className="label">Also known as</label><input name="alias" className="input" defaultValue={editing?.alias} placeholder="Trading name or abbreviation" /></div>
            <div className="form-group"><label className="label">Category</label><select name="category" className="select" defaultValue={editing?.category}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="form-group"><label className="label">Contact person</label><input name="contactPerson" className="input" defaultValue={editing?.contactPerson} /></div>
            <div className="form-group"><label className="label">Phone</label><input name="phone" className="input" defaultValue={editing?.phone} required /></div>
            <div className="form-group"><label className="label">Email</label><input name="email" type="email" className="input" defaultValue={editing?.email} /></div>
            <div className="form-group"><label className="label">RC number</label><input name="rcNumber" className="input" defaultValue={editing?.rcNumber} /></div>
            <div className="form-group"><label className="label">Tax ID / TIN</label><input name="tin" className="input" defaultValue={editing?.tin} /></div>
            <div className="form-group"><label className="label">Exemption notes</label><input name="exemptionNotes" className="input" defaultValue={editing?.exemptionNotes} placeholder="Explain tax or compliance exemption" /></div>
            <div className="form-group"><label className="label">FM guarantor</label><select name="guarantor" className="select" defaultValue={editing?.guarantorProfileId ?? ''}><option value="">Select FM</option>{users.filter(u => u.role === 'facility_manager').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl space-y-3">
            <p className="text-[10px] font-bold text-brand-600 tracking-widest">PAYMENT DETAILS</p>
            <div className="form-group"><label className="label">Account name</label><input name="accountName" className="input" defaultValue={editing?.accountName} required /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group"><label className="label">Bank</label><select name="bank" className="select" defaultValue={editing?.bankName}>{BANKS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
              <div className="form-group"><label className="label">Account number</label><input name="accountNo" className="input" maxLength={10} defaultValue={editing?.accountNumber} required /></div>
            </div>
          </div>
          <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Save vendor'}</button>
        </form>
      )}

      <VendorScorecard vendors={vendors} />

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2"><Store size={18} className="text-brand-600" /><h2 className="font-black text-slate-900">Vendor register</h2></div>
        <div className="p-4 border-b border-slate-100 relative">
          <Search size={15} className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search vendors by name, alias, email, phone or category…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="divide-y divide-slate-100">
          {filteredVendors.map(v => (
            <div key={v.id} className="p-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800">{v.name}</p>
                {v.alias && <p className="text-xs text-slate-500">Also known as {v.alias}</p>}
                {(v.phone || v.email) && <p className="text-xs text-slate-500">{v.phone}{v.phone && v.email ? ' · ' : ''}{v.email && <a className="text-brand-600" href={`mailto:${v.email}`}>{v.email}</a>}</p>}
                <p className="text-xs text-slate-500">{v.category} · {v.bankName} · {v.accountNumber.replace(/^\d{6}/, '******')}</p>
                {(v.rcNumber || v.exemptionNotes) && <p className="text-xs text-slate-400 mt-1">{v.rcNumber ? `RC ${v.rcNumber} · ` : ''}{v.exemptionNotes ?? ''}</p>}
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <div><p className="text-sm font-black">{v.totalJobsCompleted}</p><p className="text-[11px] text-slate-500">jobs</p><p className="text-sm font-bold text-slate-700 mt-1">{formatCurrency(v.totalAmountPaid)}</p></div>
                {canManage && <button onClick={() => openForm(v)} className="btn-secondary !py-1 !px-2 text-xs"><Pencil size={12} />Edit</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VendorScorecard({ vendors }: { vendors: Vendor[] }) {
  const avgTat = vendors.length ? vendors.reduce((s, v) => s + v.avgCompletionDays, 0) / vendors.length : 0;
  return (
    <div className="card p-5">
      <h2 className="font-black text-slate-900 mb-4 flex items-center gap-2"><Award size={16} className="text-brand-600" />Vendor scorecard</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-50 rounded-xl text-center"><p className="text-2xl font-black text-slate-900">{vendors.length}</p><p className="text-xs text-slate-500">Total vendors</p></div>
        <div className="p-4 bg-slate-50 rounded-xl text-center"><p className="text-2xl font-black text-slate-900">{avgTat.toFixed(1)}d</p><p className="text-xs text-slate-500">Avg completion</p></div>
        <div className="p-4 bg-slate-50 rounded-xl text-center"><p className="text-2xl font-black text-slate-900">{formatCurrency(vendors.reduce((s, v) => s + v.totalAmountPaid, 0))}</p><p className="text-xs text-slate-500">Total paid</p></div>
      </div>
    </div>
  );
}
