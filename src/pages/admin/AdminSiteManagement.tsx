import { useState, type FormEvent } from 'react';
import { Building2, MapPin, Phone, Calendar, AlertTriangle, CheckCircle, TrendingUp, Layers, ChevronRight, DollarSign, Pencil, Plus, XCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate, titleCase } from '../../utils/helpers';
import { FACILITY_TYPES, type Site } from '../../types';

const EMPTY_SITE = (): Site => ({
  id: crypto.randomUUID(), name: '', address: '', size: '', contactName: '', contactPhone: '', contactEmail: '',
  pettyCashEnabled: false, floatLimit: 0, monthlyBudget: 0, currentMonthSpend: 0, slaExpiryDate: '',
  siteType: 'Full commercial building — multiple floors', floors: '', units: '', scope: '',
  electricityBilling: 'postpaid', meterAccountNo: '', emergencyContact: '', securityDesk: '',
  status: 'healthy', createdAt: new Date().toISOString(),
});

export default function AdminSiteManagement() {
  const { sites, saveSite } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Site | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const f = event.currentTarget.elements as unknown as Record<string, HTMLInputElement | HTMLSelectElement>;
    setSaving(true);
    await saveSite({
      ...editing!,
      name: titleCase(f.name.value), address: titleCase(f.address.value), siteType: f.siteType.value as Site['siteType'],
      size: f.size.value, floors: titleCase(f.floors.value), units: f.units.value, scope: f.scope.value,
      contactName: titleCase(f.contactName.value), contactPhone: f.contactPhone.value, contactEmail: f.contactEmail.value.trim(),
      monthlyBudget: Number(f.monthlyBudget.value) || 0, floatLimit: Number(f.floatLimit.value) || 0,
      pettyCashEnabled: (f.pettyCash as HTMLInputElement).checked, slaExpiryDate: f.slaExpiryDate.value,
      electricityBilling: f.electricityBilling.value as Site['electricityBilling'], meterAccountNo: f.meterAccountNo.value,
      emergencyContact: f.emergencyContact.value, securityDesk: f.securityDesk.value,
      status: f.status.value as Site['status'],
    });
    setEditing(null);
    setSaving(false);
  };

  const selectedSite = sites.find(s => s.id === selected);
  const slaExpiredSites = sites.filter(s => new Date(s.slaExpiryDate) < new Date());
  const totalBudget = sites.reduce((s, x) => s + x.monthlyBudget, 0);
  const totalSpend = sites.reduce((s, x) => s + x.currentMonthSpend, 0);
  const overallPct = Math.round((totalSpend / totalBudget) * 100);

  return (
    <div className="space-y-6">

      {/* ── Gradient Hero Header ─────────────────── */}
      <div className="dash-header">
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Administration</p>
            <h1 className="text-2xl font-black text-white tracking-tight">Site Management</h1>
            <p className="text-white/60 text-sm mt-1 font-medium">{sites.length} facility sites across your network</p>
          </div>
          <div className="flex gap-3 items-start">
            <button onClick={() => setEditing(EMPTY_SITE())} className="btn-white-glass"><Plus size={14} />New site</button>
            <div className="text-center px-4 py-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
              <p className="text-2xl font-black text-white animate-count-up">{sites.length}</p>
              <p className="text-white/60 text-[11px] font-semibold mt-0.5">Total Sites</p>
            </div>
            <div className="text-center px-4 py-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
              <p className={`text-2xl font-black animate-count-up ${slaExpiredSites.length > 0 ? 'text-red-300' : 'text-emerald-300'}`}>{slaExpiredSites.length}</p>
              <p className="text-white/60 text-[11px] font-semibold mt-0.5">SLA Expired</p>
            </div>
            <div className="text-center px-4 py-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
              <p className="text-2xl font-black text-white animate-count-up">{overallPct}%</p>
              <p className="text-white/60 text-[11px] font-semibold mt-0.5">Budget Used</p>
            </div>
          </div>
        </div>
        <div className="absolute right-8 top-3 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-20 -top-6 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* ── Site create/edit form ─────────────────── */}
      {editing && (
        <form key={editing.id} onSubmit={submit} className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-900">{sites.some(s => s.id === editing.id) ? `Edit ${editing.name}` : 'New facility'}</h2>
            <button type="button" onClick={() => setEditing(null)}><XCircle size={18} className="text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group"><label className="label">Facility name</label><input name="name" className="input" defaultValue={editing.name} required /></div>
            <div className="form-group"><label className="label">Address</label><input name="address" className="input" defaultValue={editing.address} required /></div>
            <div className="form-group"><label className="label">Facility type</label><select name="siteType" className="select" defaultValue={editing.siteType}>{FACILITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="label">Size</label><input name="size" className="input" defaultValue={editing.size} placeholder="e.g. 12 floors · 48 units" /></div>
            <div className="form-group"><label className="label">Floors / levels</label><input name="floors" className="input" defaultValue={editing.floors} placeholder="e.g. Basement, Ground Floor, First Floor" /></div>
            <div className="form-group"><label className="label">Units</label><input name="units" className="input" defaultValue={editing.units} /></div>
            <div className="form-group md:col-span-3"><label className="label">Scope of services</label><input name="scope" className="input" defaultValue={editing.scope} placeholder="e.g. Cleaning, security, MEP maintenance" /></div>
            <div className="form-group"><label className="label">Contact person</label><input name="contactName" className="input" defaultValue={editing.contactName} /></div>
            <div className="form-group"><label className="label">Contact phone</label><input name="contactPhone" className="input" defaultValue={editing.contactPhone} /></div>
            <div className="form-group"><label className="label">Contact email</label><input name="contactEmail" type="email" className="input" defaultValue={editing.contactEmail} /></div>
            <div className="form-group"><label className="label">Annual budget (₦)</label><input name="monthlyBudget" type="number" min="0" className="input" defaultValue={editing.monthlyBudget || ''} /></div>
            <div className="form-group"><label className="label">Petty cash float limit (₦)</label><input name="floatLimit" type="number" min="0" className="input" defaultValue={editing.floatLimit || ''} /></div>
            <div className="form-group"><label className="label">SLA expiry date</label><input name="slaExpiryDate" type="date" className="input" defaultValue={editing.slaExpiryDate?.slice(0, 10)} /></div>
            <div className="form-group"><label className="label">Electricity billing</label><select name="electricityBilling" className="select" defaultValue={editing.electricityBilling}><option value="postpaid">Postpaid</option><option value="prepaid">Prepaid</option><option value="none">None</option></select></div>
            <div className="form-group"><label className="label">Meter / account no.</label><input name="meterAccountNo" className="input" defaultValue={editing.meterAccountNo} /></div>
            <div className="form-group"><label className="label">Emergency contact</label><input name="emergencyContact" className="input" defaultValue={editing.emergencyContact} /></div>
            <div className="form-group"><label className="label">Security desk</label><input name="securityDesk" className="input" defaultValue={editing.securityDesk} /></div>
            <div className="form-group"><label className="label">Status</label><select name="status" className="select" defaultValue={editing.status}><option value="healthy">Healthy</option><option value="watch">Watch</option><option value="overspent">Overspent</option><option value="inactive">Inactive</option></select></div>
            <div className="form-group flex items-end pb-1"><label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input name="pettyCash" type="checkbox" className="w-4 h-4" defaultChecked={editing.pettyCashEnabled} />Petty cash enabled</label></div>
          </div>
          <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save facility'}</button>
        </form>
      )}

      {/* ── SLA Alert ───────────────────────────── */}
      {slaExpiredSites.length > 0 && (
        <div className="alert-critical">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}>
            <AlertTriangle size={16} className="text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-red-800">{slaExpiredSites.length} SLA Agreement{slaExpiredSites.length > 1 ? 's' : ''} Expired</p>
            <p className="text-sm text-red-600 mt-0.5">{slaExpiredSites.map(s => s.name).join(', ')} — renew immediately to avoid service disruption.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Site Cards ───────────────────────────── */}
        <div className="lg:col-span-2 space-y-3">
          {sites.map((site, idx) => {
            const utilPct = site.monthlyBudget > 0 ? Math.round((site.currentMonthSpend / site.monthlyBudget) * 100) : 0;
            const slaExpired = new Date(site.slaExpiryDate) < new Date();
            const isSelected = selected === site.id;
            const barColor = utilPct >= 90
              ? 'from-red-500 to-rose-600'
              : utilPct >= 75
              ? 'from-amber-400 to-orange-500'
              : 'from-emerald-400 to-teal-500';
            const accentColors = [
              'from-brand-500 to-purple-600',
              'from-teal-500 to-cyan-600',
              'from-rose-500 to-pink-600',
              'from-amber-500 to-orange-600',
            ];
            const accent = accentColors[idx % accentColors.length];

            return (
              <div
                key={site.id}
                onClick={() => setSelected(isSelected ? null : site.id)}
                className={`card overflow-hidden cursor-pointer transition-all duration-300 group
                  ${isSelected
                    ? 'ring-2 ring-brand-500/60 shadow-card-hover -translate-y-1 shadow-glow-brand'
                    : 'hover:shadow-card-hover hover:-translate-y-0.5'}`}
              >
                {/* Top accent gradient bar */}
                <div className={`h-1 bg-gradient-to-r ${accent}`} />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-sm flex-shrink-0`}>
                        <Building2 size={18} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 leading-tight">{site.name}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                          <MapPin size={10} className="flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{site.address}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-3">
                      <span className={`badge ${slaExpired ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                        <span className={`badge-dot ${slaExpired ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        {slaExpired ? 'SLA Expired' : 'SLA Active'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">Exp. {formatDate(site.slaExpiryDate)}</span>
                    </div>
                  </div>

                  {/* Meta grid */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-xl px-3 py-2">
                      <p className="label mb-1">Size</p>
                      <p className="text-sm font-bold text-slate-800">{site.size}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-3 py-2">
                      <p className="label mb-1">Float Limit</p>
                      <p className="text-sm font-bold text-slate-800">{formatCurrency(site.floatLimit)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-3 py-2">
                      <p className="label mb-1">Petty Cash</p>
                      <span className={`badge text-[11px] mt-0.5 ${site.pettyCashEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                        <span className={`badge-dot ${site.pettyCashEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {site.pettyCashEnabled ? 'Enabled' : 'Off'}
                      </span>
                    </div>
                  </div>

                  {/* Budget bar */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-1.5">
                        <DollarSign size={11} className="text-slate-400" />
                        <span className="text-xs text-slate-500 font-semibold">{formatCurrency(site.currentMonthSpend)} <span className="text-slate-400 font-normal">of {formatCurrency(site.monthlyBudget)}</span></span>
                      </div>
                      <span className={`text-xs font-black ${utilPct >= 90 ? 'text-red-600' : utilPct >= 75 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {utilPct}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
                        style={{ width: `${Math.min(utilPct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Expand row */}
                <div className={`flex items-center justify-between px-5 py-2.5 border-t border-slate-100 transition-colors duration-200 ${isSelected ? 'bg-brand-50/60' : 'bg-slate-50/60'}`}>
                  <span className={`text-xs font-bold transition-colors ${isSelected ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                    {isSelected ? 'Hide details' : 'View details'}
                  </span>
                  <ChevronRight size={13} className={`transition-all duration-300 ${isSelected ? 'text-brand-500 rotate-90' : 'text-slate-300 group-hover:text-slate-500'}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Detail Panel ─────────────────────────── */}
        <div className="sticky top-6">
          {selectedSite ? (
            <div className="card overflow-hidden animate-scale-in">
              {/* Panel header */}
              <div className="p-5 border-b border-slate-100"
                style={{ background: 'linear-gradient(135deg, #f8faff 0%, #f1f5ff 100%)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-sm">
                    <Building2 size={17} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">{selectedSite.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                      <MapPin size={9} />
                      <span className="truncate">{selectedSite.address}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <button onClick={() => { setEditing(selectedSite); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="btn-secondary w-full justify-center text-xs"><Pencil size={12} />Edit facility details</button>

                {/* Budget spotlight */}
                <div className="rounded-2xl p-4 border"
                  style={{ background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)', borderColor: 'rgba(99,102,241,0.12)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={13} className="text-brand-500" />
                    <p className="label">Annual Budget</p>
                  </div>
                  <p className="text-2xl font-black text-slate-900">{formatCurrency(selectedSite.monthlyBudget)}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    <span className="font-bold text-brand-600">{formatCurrency(selectedSite.currentMonthSpend)}</span> spent to date
                  </p>
                  <div className="mt-3 w-full bg-white/70 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-purple-600 transition-all duration-700"
                      style={{ width: `${Math.min(selectedSite.monthlyBudget > 0 ? Math.round((selectedSite.currentMonthSpend / selectedSite.monthlyBudget) * 100) : 0, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-1">
                  <p className="label">Contact Person</p>
                  <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                      {selectedSite.contactName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{selectedSite.contactName}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <Phone size={10} />
                        <span>{selectedSite.contactPhone}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 pl-1">{selectedSite.contactEmail}</p>
                </div>

                {/* SLA + Created */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-1.5 mb-1">
                      {new Date(selectedSite.slaExpiryDate) < new Date()
                        ? <AlertTriangle size={12} className="text-red-500" />
                        : <CheckCircle size={12} className="text-emerald-500" />
                      }
                      <p className="label">SLA Expiry</p>
                    </div>
                    <p className="text-xs font-bold text-slate-800">{formatDate(selectedSite.slaExpiryDate)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar size={12} className="text-slate-400" />
                      <p className="label">Created</p>
                    </div>
                    <p className="text-xs font-bold text-slate-800">{formatDate(selectedSite.createdAt)}</p>
                  </div>
                </div>

                {/* Extras */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="label mb-1">Float Limit</p>
                    <p className="text-sm font-black text-slate-800">{formatCurrency(selectedSite.floatLimit)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="label mb-1">Petty Cash</p>
                    <span className={`badge text-[11px] ${selectedSite.pettyCashEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      <span className={`badge-dot ${selectedSite.pettyCashEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {selectedSite.pettyCashEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4 shadow-inner">
                <Layers size={26} className="text-slate-400" />
              </div>
              <p className="text-sm font-black text-slate-600">No site selected</p>
              <p className="text-xs text-slate-400 mt-1.5 max-w-[160px] leading-relaxed">Click any site card to view detailed information</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
