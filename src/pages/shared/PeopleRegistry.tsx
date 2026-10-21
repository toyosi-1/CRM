import { useMemo, useState } from 'react';
import { Filter, Mail, Phone, ShieldCheck, UserCheck, Users, Wrench, UserCog, XCircle } from 'lucide-react';
import { useStore, reportSaveError } from '../../store/useStore';
import { ROLE_LABELS, formatDate, formatCurrency } from '../../utils/helpers';
import { assignActingFM, clearActingFM } from '../../lib/db';
import type { User, UserRole } from '../../types';

function isActingActive(u: User) {
  if (!u.actingForProfileId || !u.actingStart || !u.actingEnd) return false;
  const today = new Date().toISOString().slice(0, 10);
  return u.actingStart <= today && u.actingEnd >= today;
}

export default function PeopleRegistry() {
  const { currentUser, users, sites, requests, pettyCash, ppmSchedules, vendors, assets, facilityVendorSLAs } = useStore();
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [assignFor, setAssignFor] = useState<User | null>(null);
  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'ict_admin' || currentUser?.role === 'supervisor';
  const filtered = useMemo(() => {
    if (roleFilter === 'all') return users.filter(u => u.active !== false);
    return users.filter(u => u.role === roleFilter && u.active !== false);
  }, [users, roleFilter]);

  const stats = [
    { label: 'Facility managers', value: users.filter(u => u.role === 'facility_manager').length, icon: <ShieldCheck size={14} /> },
    { label: 'Technicians', value: users.filter(u => u.role === 'technician').length, icon: <Wrench size={14} /> },
    { label: 'Supervisors', value: users.filter(u => u.role === 'supervisor').length, icon: <UserCheck size={14} /> },
    { label: 'Admins', value: users.filter(u => u.role === 'admin').length, icon: <Users size={14} /> },
  ];

  const buildHandover = (coveringFm: User) => {
    const siteIds = coveringFm.siteIds?.length ? coveringFm.siteIds : [coveringFm.siteId].filter(Boolean);
    const openRequests = requests.filter(r => siteIds.includes(r.siteId) && !['PAID', 'CLOSED', 'REJECTED'].includes(r.status));
    const float = pettyCash.filter(p => siteIds.includes(p.siteId) && p.status === 'approved')
      .reduce((sum, e) => sum + (e.type === 'top_up' ? e.amount : -e.amount), 0);
    const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const ppmDue = ppmSchedules.filter(p => siteIds.includes(p.siteId) && p.status !== 'completed' && p.nextDueDate <= soon);
    const slaSoon = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
    const slaExpiring = facilityVendorSLAs.filter(s => siteIds.includes(s.siteId) && s.expiryDate && s.expiryDate <= slaSoon);
    const criticalAssets = assets.filter(a => siteIds.includes(a.siteId) && a.status === 'under_repair');
    return {
      generatedAt: new Date().toISOString(),
      sites: siteIds.map(id => sites.find(s => s.id === id)?.name ?? id),
      openRequests: openRequests.map(r => ({ number: r.requestNumber, description: r.description.slice(0, 80), status: r.status })),
      floatBalance: float,
      ppmDueIn30Days: ppmDue.map(p => ({ title: p.title, nextDueDate: p.nextDueDate })),
      slasExpiring: slaExpiring.map(s => ({ vendor: vendors.find(v => v.id === s.vendorId)?.name ?? s.vendorId, expiry: s.expiryDate })),
      criticalAssets: criticalAssets.map(a => a.name),
    };
  };

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <div>
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Directory</p>
          <h1 className="text-2xl font-black text-white tracking-tight">People &amp; assignments</h1>
          <p className="text-white/60 text-sm mt-1">Staff, contractors and role assignments.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{stats.map(s => <div key={s.label} className="card p-4"><div className="flex items-center gap-2 text-brand-600 mb-2">{s.icon}<span className="text-[10px] font-bold uppercase text-slate-500">{s.label}</span></div><p className="text-2xl font-black text-slate-900">{s.value}</p></div>)}</div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-slate-900 flex items-center gap-2"><Users size={16} className="text-brand-600" />Registered staff</h2>
          <div className="flex items-center gap-2"><Filter size={14} className="text-slate-400" /><select className="select text-xs" value={roleFilter} onChange={e => setRoleFilter(e.target.value as UserRole | 'all')}><option value="all">All roles</option><option value="facility_manager">Facility managers</option><option value="technician">Technicians</option><option value="supervisor">Supervisors</option><option value="finance">Finance</option><option value="admin">Admins</option></select></div>
        </div>
        {filtered.length === 0 ? <p className="text-sm text-slate-500">No staff match this filter.</p> : (
          <div className="divide-y divide-slate-100">
            {filtered.map(user => (
              <PersonRow
                key={user.id}
                user={user}
                sites={sites}
                users={users}
                canManage={canManage}
                onAssignActing={() => setAssignFor(user)}
              />
            ))}
          </div>
        )}
      </div>

      {assignFor && (
        <ActingFMModal
          coveringFm={assignFor}
          users={users}
          buildHandover={buildHandover}
          onClose={() => setAssignFor(null)}
        />
      )}
    </div>
  );
}

function PersonRow({ user, sites, users, canManage, onAssignActing }: { user: User; sites: { id: string; name: string }[]; users: User[]; canManage: boolean; onAssignActing: () => void }) {
  const siteNames = (user.siteIds?.length ? user.siteIds : [user.siteId].filter(Boolean))
    .map(id => sites.find(s => s.id === id)?.name ?? id);
  const coveringFor = user.actingForProfileId ? users.find(u => u.id === user.actingForProfileId) : undefined;
  const acting = isActingActive(user);
  return (
    <div className="p-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs">{user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
        <div>
          <p className="font-bold text-slate-800">{user.name}</p>
          <p className="text-xs text-slate-500 flex items-center gap-2"><Mail size={10} />{user.email}{user.phone && <><span className="text-slate-300">|</span><Phone size={10} />{user.phone}</>}</p>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className="badge bg-slate-100 text-slate-700">{ROLE_LABELS[user.role]}</span>
            {siteNames.map(n => <span key={n} className="badge bg-emerald-50 text-emerald-700">{n}</span>)}
            {user.trade && <span className="badge bg-blue-50 text-blue-700 flex items-center gap-1"><Wrench size={10} />{user.trade}</span>}
            {coveringFor && (
              <span className={`badge ${acting ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                Acting for {coveringFor.name} · {user.actingStart ? formatDate(user.actingStart) : ''} → {user.actingEnd ? formatDate(user.actingEnd) : ''}
                {user.actingAcknowledgedAt ? ' · acknowledged' : ' · awaiting acknowledgement'}
              </span>
            )}
          </div>
        </div>
      </div>
      {canManage && user.role === 'facility_manager' && (
        <div className="flex gap-2">
          <button className="btn-ghost text-xs flex items-center gap-1" onClick={onAssignActing}><UserCog size={12} />{user.actingForProfileId ? 'Change acting FM' : 'Assign acting FM'}</button>
          {user.actingForProfileId && <button className="btn-ghost text-xs text-red-600" onClick={() => clearActingFM(user.id).catch(reportSaveError)}><XCircle size={12} />Clear</button>}
        </div>
      )}
    </div>
  );
}

function ActingFMModal({ coveringFm, users, buildHandover, onClose }: { coveringFm: User; users: User[]; buildHandover: (u: User) => Record<string, unknown>; onClose: () => void }) {
  const [actingId, setActingId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const candidates = users.filter(u => u.role === 'facility_manager' && u.id !== coveringFm.id && u.active !== false);

  const submit = async () => {
    if (!actingId) { setError('Select the acting FM.'); return; }
    if (!start || !end) { setError('An acting FM needs both a start and end date.'); return; }
    if (new Date(end) <= new Date(start)) { setError('End date must be after the start date.'); return; }
    setSaving(true);
    try {
      await assignActingFM({ actingProfileId: actingId, coveringProfileId: coveringFm.id, start, end, handover: buildHandover(coveringFm) });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const handover = buildHandover(coveringFm);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="font-black text-slate-900">Acting FM for {coveringFm.name}</h2>
        <p className="text-xs text-slate-500">Temporary coverage. Access to the covered facilities reverts automatically after the end date.</p>
        {error && <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="form-group"><label className="label">Acting FM *</label><select className="select" value={actingId} onChange={e => setActingId(e.target.value)}><option value="">Select FM</option>{candidates.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          <div className="form-group"><label className="label">Start *</label><input type="date" className="input" value={start} onChange={e => setStart(e.target.value)} /></div>
          <div className="form-group"><label className="label">End *</label><input type="date" className="input" value={end} onChange={e => setEnd(e.target.value)} /></div>
        </div>

        {/* Handover pack preview (spec §5.8) */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">Auto-generated handover pack</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
            <span>Sites covered: {(handover.sites as string[]).join(', ') || '—'}</span>
            <span>Open requests: {(handover.openRequests as unknown[]).length}</span>
            <span>Float balance: {formatCurrency(handover.floatBalance as number)}</span>
            <span>PPM due in 30 days: {(handover.ppmDueIn30Days as unknown[]).length}</span>
            <span>SLAs expiring: {(handover.slasExpiring as unknown[]).length}</span>
            <span>Assets under repair: {(handover.criticalAssets as unknown[]).length}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={submit} disabled={saving}>{saving ? 'Assigning…' : 'Assign acting FM'}</button>
        </div>
      </div>
    </div>
  );
}
