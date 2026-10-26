import { useState, type FormEvent } from 'react';
import { Building2, MapPin, Plus, Save, Users, Wallet } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/helpers';
import type { Site, Tenant } from '../../types';
import { FACILITY_TYPES } from '../../types';

const STATUS_COLORS: Record<Site['status'], string> = {
  healthy: 'bg-emerald-100 text-emerald-700',
  watch: 'bg-amber-100 text-amber-700',
  overspent: 'bg-red-100 text-red-700',
  inactive: 'bg-slate-100 text-slate-500',
};

export default function FacilitiesManagement() {
  const { currentUser, sites, users, tenants, updateSite, createTenant, updateTenant } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [showTenant, setShowTenant] = useState(false);
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'ict_admin' || currentUser?.role === 'supervisor';
  const canManageTenants = currentUser?.role === 'admin';

  const site = sites.find(s => s.id === selected);
  const siteTenants = tenants.filter(t => t.siteId === selected);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!site) return;
    const form = event.currentTarget.elements as unknown as Record<string, HTMLInputElement | HTMLSelectElement>;
    await updateSite(site.id, {
      address: form.address.value, size: form.size.value, scope: form.scope.value,
      siteType: form.siteType.value as Site['siteType'],
      floors: form.floors.value, units: form.units.value,
      electricityBilling: form.electricityBilling.value as Site['electricityBilling'],
      meterAccountNo: form.meterAccountNo.value, emergencyContact: form.emergencyContact.value,
      securityDesk: form.securityDesk.value, status: form.status.value as Site['status'],
    });
  };

  const addTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!site) return;
    const form = event.currentTarget.elements as unknown as Record<string, HTMLInputElement>;
    await createTenant({
      siteId: site.id, name: form.tenantName.value, unit: form.unit.value, email: form.email.value,
      phone: form.phone.value, monthlyRent: Number(form.monthlyRent.value), serviceCharge: Number(form.serviceCharge.value) || 0, leaseExpiry: form.leaseExpiry.value,
      serviceChargeBilling: form.serviceChargeBilling.value as 'included' | 'separate',
      serviceChargeInvoiceDate: form.serviceChargeInvoiceDate.value || undefined,
      lastPaymentDate: form.lastPaymentDate.value, status: 'paid',
    });
    setShowTenant(false);
  };

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Configuration</p>
            <h1 className="text-2xl font-black text-white tracking-tight">Facility settings</h1>
            <p className="text-white/60 text-sm mt-1 font-medium">Configure scope, utilities, people and petty cash per facility.</p>
          </div>
          <div className="text-center px-4 py-2 rounded-2xl border border-white/20 bg-white/10"><p className="text-2xl font-black text-white">{sites.length}</p><p className="text-white/60 text-[11px]">Facilities</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-3">
          {sites.map(s => (
            <button key={s.id} onClick={() => setSelected(s.id)} className={`card w-full text-left p-4 ${selected === s.id ? 'ring-2 ring-brand-500' : ''}`}>
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Building2 size={16} className="text-brand-600" /><span className="font-bold text-slate-800">{s.name}</span></div><span className={`badge ${STATUS_COLORS[s.status]}`}>{s.status}</span></div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin size={10} />{s.address}</div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-5">
          {site ? (
            <>
              <form onSubmit={save} className="card p-5 space-y-4">
                <div className="flex items-center justify-between"><h2 className="font-black text-slate-900">{site.name}</h2>{canEdit && <button className="btn-primary"><Save size={14} />Save changes</button>}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group"><label className="label">Facility type</label><select name="siteType" className="select" defaultValue={site.siteType} disabled={!canEdit}>{FACILITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div className="form-group"><label className="label">Address</label><input name="address" className="input" defaultValue={site.address} readOnly={!canEdit} /></div>
                  <div className="form-group"><label className="label">Site area</label><input name="size" className="input" defaultValue={site.size} readOnly={!canEdit} /></div>
                  <div className="form-group"><label className="label">Scope</label><input name="scope" className="input" defaultValue={site.scope} readOnly={!canEdit} /></div>
                  <div className="form-group"><label className="label">Floors</label><input name="floors" className="input" defaultValue={site.floors} readOnly={!canEdit} /></div>
                  <div className="form-group"><label className="label">Units managed</label><input name="units" className="input" defaultValue={site.units} readOnly={!canEdit} /></div>
                  <div className="form-group"><label className="label">Facility manager</label><select name="fm" className="select" disabled={!canEdit} defaultValue={site.contactName}><option value="">{site.contactName}</option>{users.filter(u => u.role === 'facility_manager').map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
                  <div className="form-group"><label className="label">Electricity billing</label><select name="electricityBilling" className="select" defaultValue={site.electricityBilling} disabled={!canEdit}><option value="postpaid">Postpaid</option><option value="prepaid">Prepaid</option><option value="none">None</option></select></div>
                  <div className="form-group"><label className="label">Meter / account no.</label><input name="meterAccountNo" className="input" defaultValue={site.meterAccountNo} readOnly={!canEdit} /></div>
                  <div className="form-group"><label className="label">Emergency contact</label><input name="emergencyContact" className="input" defaultValue={site.emergencyContact} readOnly={!canEdit} /></div>
                  <div className="form-group"><label className="label">Security desk</label><input name="securityDesk" className="input" defaultValue={site.securityDesk} readOnly={!canEdit} /></div>
                  <div className="form-group"><label className="label">Operational status</label><select name="status" className="select" defaultValue={site.status} disabled={!canEdit}><option value="healthy">Healthy</option><option value="watch">Watch</option><option value="overspent">Overspent</option><option value="inactive">Inactive</option></select></div>
                </div>
              </form>

              <div className="card p-5">
                <div className="flex items-center justify-between mb-4"><h2 className="font-black text-slate-900 flex items-center gap-2"><Users size={16} className="text-brand-600" />Tenancy registry</h2>{canManageTenants && <button onClick={() => setShowTenant(true)} className="btn-primary"><Plus size={14} />Add tenant</button>}</div>
                {showTenant && canManageTenants && (
                  <form onSubmit={addTenant} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
                    <input className="input" name="tenantName" placeholder="Tenant name" required />
                    <input className="input" name="unit" placeholder="Unit" />
                    <input className="input" name="email" type="email" placeholder="Email" />
                    <input className="input" name="phone" placeholder="Phone" />
                    <input className="input" name="monthlyRent" type="number" min={0} placeholder="Monthly rent (₦)" required />
                    <input className="input" name="serviceCharge" type="number" min={0} placeholder="Service charge (₦, if applicable)" />
                    <select className="select" name="serviceChargeBilling" defaultValue="separate" title="Service charge billing"><option value="separate">Service charge: billed separately</option><option value="included">Service charge: included in rent</option></select>
                    <input className="input" name="serviceChargeInvoiceDate" type="date" title="Next service-charge invoice date" />
                    <input className="input" name="leaseExpiry" type="date" placeholder="Lease expiry" />
                    <input className="input" name="lastPaymentDate" type="date" placeholder="Last payment" />
                    <div className="md:col-span-2 flex gap-2"><button className="btn-primary">Save tenant</button><button type="button" onClick={() => setShowTenant(false)} className="btn-secondary">Cancel</button></div>
                  </form>
                )}
                {siteTenants.length === 0 ? <p className="text-sm text-slate-500">No tenants recorded.</p> : <div className="divide-y divide-slate-100">{siteTenants.map(t => <TenantRow key={t.id} tenant={t} canEdit={canManageTenants} onUpdate={updateTenant} />)}</div>}
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between mb-3"><h2 className="font-black text-slate-900 flex items-center gap-2"><Wallet size={16} className="text-brand-600" />Petty cash settings</h2></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl"><p className="label">Float limit</p><p className="text-lg font-black">{formatCurrency(site.floatLimit)}</p></div>
                  <div className="p-3 bg-slate-50 rounded-xl"><p className="label">Enabled</p><p className="text-lg font-black">{site.pettyCashEnabled ? 'Yes' : 'No'}</p></div>
                </div>
                <p className="text-xs text-slate-500 mt-2">Edit the float limit and enable/disable petty cash in Site Management.</p>
              </div>
            </>
          ) : (
            <div className="card p-10 text-center text-slate-500">Select a facility to configure.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TenantRow({ tenant, canEdit, onUpdate }: { tenant: Tenant; canEdit: boolean; onUpdate: (id: string, data: Partial<Tenant>) => Promise<void> }) {
  const { sites, issueServiceCharge, serviceChargeInvoices } = useStore();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(tenant.status);
  const [sending, setSending] = useState(false);
  const saveStatus = async () => { await onUpdate(tenant.id, { status }); setEditing(false); };
  const separate = (tenant.serviceChargeBilling ?? 'separate') === 'separate' && (tenant.serviceCharge ?? 0) > 0;
  const siteName = sites.find(s => s.id === tenant.siteId)?.name ?? 'your facility';
  const lastIssued = serviceChargeInvoices.find(i => i.tenantId === tenant.id);

  const requestCharge = async () => {
    const period = window.prompt('Billing period for this invoice (e.g. "Q1 2027" or "January 2027"):', 'Annual 2027');
    if (period === null) return;
    const due = window.prompt('Payment due date (YYYY-MM-DD), or leave blank:', tenant.serviceChargeInvoiceDate ?? '');
    if (due === null) return;
    setSending(true);
    try {
      await issueServiceCharge({ tenantId: tenant.id, siteId: tenant.siteId, amount: tenant.serviceCharge!, periodLabel: period.trim() || 'Service charge', dueDate: due.trim() || undefined });
      const subject = `Service Charge Invoice — ${siteName} — ${period.trim() || 'Service charge'}`;
      const body = [
        `Dear ${tenant.name},`,
        '',
        `This is your service charge invoice for ${period.trim() || 'the current period'} at ${siteName}, ${tenant.unit}.`,
        '',
        `Service charge: ₦${(tenant.serviceCharge ?? 0).toLocaleString('en-NG')}`,
        due.trim() ? `Payment due: ${new Date(due.trim()).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}` : '',
        '',
        'Please remit payment to the facility account. Contact the facility manager with any questions.',
        '',
        'Propel Properties & Facilities Services Ltd.',
      ].filter(Boolean).join('\n');
      window.location.href = `mailto:${tenant.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-3 flex items-center justify-between gap-3">
      <div>
        <p className="font-bold text-sm text-slate-800">{tenant.name}</p>
        <p className="text-xs text-slate-500">{tenant.unit} · {tenant.phone} · {formatCurrency(tenant.monthlyRent)}/month{(tenant.serviceCharge ?? 0) > 0 && ` + ${formatCurrency(tenant.serviceCharge!)} service charge${tenant.serviceChargeBilling === 'included' ? ' (in rent)' : ''}`}</p>
        {separate && (tenant.serviceChargeInvoiceDate || lastIssued) && (
          <p className="text-[11px] text-slate-400 mt-0.5">
            {tenant.serviceChargeInvoiceDate && `Next service-charge invoice: ${new Date(tenant.serviceChargeInvoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
            {lastIssued && ` · last issued ${new Date(lastIssued.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
          </p>
        )}
      </div>
      <div className="text-right">
        {editing ? <div className="flex gap-2"><select className="select text-xs" value={status} onChange={e => setStatus(e.target.value as Tenant['status'])}><option value="paid">Paid</option><option value="expiring_soon">Expiring soon</option><option value="overdue">Overdue</option></select><button onClick={saveStatus} className="btn-success text-xs py-1">Save</button></div> : <span className={`badge ${tenant.status === 'overdue' ? 'bg-red-100 text-red-700' : tenant.status === 'expiring_soon' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{tenant.status.replace('_', ' ')}</span>}
        {canEdit && !editing && <button onClick={() => setEditing(true)} className="block text-[11px] text-brand-600 mt-1">Change status</button>}
        {canEdit && !editing && separate && (
          <button onClick={() => void requestCharge()} disabled={sending} className="block text-[11px] text-brand-600 mt-1 font-semibold">
            {sending ? 'Issuing…' : 'Request service charge →'}
          </button>
        )}
      </div>
    </div>
  );
}
