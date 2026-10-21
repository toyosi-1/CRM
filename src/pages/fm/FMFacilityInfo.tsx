import { useState, type FormEvent } from 'react';
import { Building2, MapPin, Pencil, Zap } from 'lucide-react';
import { useStore, reportSaveError } from '../../store/useStore';
import { formatCurrency } from '../../utils/helpers';
import { FACILITY_TYPES, type FacilityType } from '../../types';

export default function FMFacilityInfo() {
  const { currentUser, sites, users, activeSiteId, updateSite, getSiteMonthSpend } = useStore();
  const site = sites.find(s => s.id === (activeSiteId ?? currentUser?.siteId));
  const fm = users.find(u => u.id === site?.contactName || u.siteId === site?.id && u.role === 'facility_manager');
  const technicians = users.filter(u => u.role === 'technician' && u.siteId === site?.id);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', address: '', size: '', floors: '', units: '', scope: '', siteType: '' as FacilityType | '',
    contactName: '', contactPhone: '', contactEmail: '', electricityBilling: 'none' as 'postpaid' | 'prepaid' | 'none',
    meterAccountNo: '', emergencyContact: '', securityDesk: '',
  });

  const openEdit = () => {
    if (!site) return;
    setForm({
      name: site.name, address: site.address, size: site.size, floors: site.floors, units: site.units, scope: site.scope,
      siteType: site.siteType, contactName: site.contactName, contactPhone: site.contactPhone, contactEmail: site.contactEmail,
      electricityBilling: site.electricityBilling, meterAccountNo: site.meterAccountNo,
      emergencyContact: site.emergencyContact, securityDesk: site.securityDesk,
    });
    setEditing(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!site || !form.siteType) return;
    setSaving(true);
    try {
      await updateSite(site.id, {
        name: form.name, address: form.address, size: form.size, floors: form.floors, units: form.units, scope: form.scope,
        siteType: form.siteType, contactName: form.contactName, contactPhone: form.contactPhone, contactEmail: form.contactEmail,
        electricityBilling: form.electricityBilling, meterAccountNo: form.meterAccountNo,
        emergencyContact: form.emergencyContact, securityDesk: form.securityDesk,
      });
      setEditing(false);
    } catch (error) {
      reportSaveError(error);
    } finally {
      setSaving(false);
    }
  };

  if (!site) return <div className="card p-10 text-center text-slate-500">No facility assigned.</div>;

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <div>
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">My facility</p>
          <h1 className="text-2xl font-black text-white tracking-tight">{site.name}</h1>
          <p className="text-white/60 text-sm mt-1">{site.scope || 'Facility information and contacts'}</p>
        </div>
        <button className="btn-white-glass" onClick={openEdit}><Pencil size={14} />Edit facility information</button>
      </div>

      {editing && (
        <form onSubmit={submit} className="card p-5 space-y-4">
          <h2 className="section-title">Edit facility information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="form-group"><label className="label">Facility name</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="form-group"><label className="label">Facility type</label><select className="select" value={form.siteType} onChange={e => setForm(f => ({ ...f, siteType: e.target.value as FacilityType }))} required>{FACILITY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select></div>
            <div className="form-group"><label className="label">Site area</label><input className="input" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} /></div>
            <div className="form-group md:col-span-3"><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required /></div>
            <div className="form-group"><label className="label">Floors</label><input className="input" value={form.floors} onChange={e => setForm(f => ({ ...f, floors: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Units managed</label><input className="input" value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Scope</label><input className="input" value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Contact name</label><input className="input" value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Contact phone</label><input className="input" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Contact email</label><input className="input" type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Electricity billing</label><select className="select" value={form.electricityBilling} onChange={e => setForm(f => ({ ...f, electricityBilling: e.target.value as 'postpaid' | 'prepaid' | 'none' }))}><option value="postpaid">Postpaid</option><option value="prepaid">Prepaid</option><option value="none">None</option></select></div>
            <div className="form-group"><label className="label">Meter/account number</label><input className="input" value={form.meterAccountNo} onChange={e => setForm(f => ({ ...f, meterAccountNo: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Emergency contact</label><input className="input" value={form.emergencyContact} onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Security desk</label><input className="input" value={form.securityDesk} onChange={e => setForm(f => ({ ...f, securityDesk: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2"><button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button><button className="btn-acc" disabled={saving}>{saving ? 'Saving…' : 'Save facility information'}</button></div>
        </form>
      )}

      <div className="card">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center"><Building2 size={18} /></div><div><h2 className="font-black text-slate-900">{site.name}</h2><p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10} />{site.address}</p></div></div>
          <span className="badge bg-emerald-100 text-emerald-700">Active</span>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoBlock title="SITE" rows={[
            ['Address', site.address], ['Site area', site.size], ['Facility type', site.siteType], ['Floors', site.floors || '—'], ['Units managed', site.units || '—'],
            ['FM', fm?.name || site.contactName || '—'],
            ['Technicians', technicians.map(t => t.name).join(', ') || '—'],
          ]} />
          <InfoBlock title="ELECTRICITY & CONTACTS" rows={[
            ['Electricity', <span key="e" className="badge bg-amber-100 text-amber-700">{site.electricityBilling}</span>],
            ['Meter / account no.', site.meterAccountNo || '—'],
            ['Emergency contact', site.emergencyContact || '—'],
            ['Security desk', site.securityDesk || '—'],
            ['Contact email', site.contactEmail],
            ['Contact phone', site.contactPhone],
          ]} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Annual budget" value={formatCurrency(site.monthlyBudget)} icon={<Zap size={14} />} />
        <Kpi label="Spent this month" value={formatCurrency(getSiteMonthSpend(site.id))} icon={<Zap size={14} />} />
        <Kpi label="Float limit" value={formatCurrency(site.floatLimit)} icon={<Zap size={14} />} />
        <Kpi label="SLA expiry" value={site.slaExpiryDate} icon={<Zap size={14} />} />
      </div>
    </div>
  );
}

function InfoBlock({ title, rows }: { title: string; rows: [string, React.ReactNode][] }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-brand-600 tracking-widest">{title}</p>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between py-2 border-b border-slate-100 last:border-0"><span className="text-xs text-slate-500">{label}</span><span className="text-sm font-medium text-slate-800 text-right">{value}</span></div>
      ))}
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-slate-400 mb-2">{icon}<span className="text-[10px] font-bold uppercase tracking-wider">{label}</span></div>
      <p className="text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}
