import { useState, type FormEvent } from 'react';
import { Calendar, CheckCircle, Clock, Loader2, Plus, Wrench, XCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatDate, vendorLabel } from '../../utils/helpers';
import type { PPMSchedule } from '../../types';

const STATUS_COLORS: Record<PPMSchedule['status'], string> = {
  scheduled: 'bg-slate-100 text-slate-700',
  due: 'bg-blue-100 text-blue-700',
  overdue: 'bg-red-100 text-red-700',
  completed: 'bg-emerald-100 text-emerald-700',
  deferred: 'bg-amber-100 text-amber-700',
};

export default function PPMRegistry() {
  const { currentUser, sites, assets, vendors, users, ppmSchedules, createPPMSchedule, updatePPMSchedule } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [siteId, setSiteId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [frequency, setFrequency] = useState('3');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const canManage = currentUser?.role === 'supervisor' || currentUser?.role === 'admin';
  const siteAssets = assets.filter(a => a.siteId === siteId);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !siteId || !dueDate) return;
    setSaving(true);
    await createPPMSchedule({
      title, description, siteId, assetId: assetId || undefined, vendorId: vendorId || undefined,
      frequencyMonths: Number(frequency), nextDueDate: dueDate, assignedTo: assignedTo || undefined,
    });
    setTitle(''); setDescription(''); setSiteId(''); setAssetId(''); setVendorId(''); setFrequency('3'); setDueDate(''); setAssignedTo('');
    setShowForm(false);
    setSaving(false);
  };

  const complete = (schedule: PPMSchedule) => {
    const next = new Date(schedule.nextDueDate);
    next.setMonth(next.getMonth() + schedule.frequencyMonths);
    void updatePPMSchedule(schedule.id, {
      status: 'completed', lastCompletedDate: new Date().toISOString().slice(0, 10), nextDueDate: next.toISOString().slice(0, 10),
    });
  };

  const defer = (schedule: PPMSchedule) => {
    const next = new Date(schedule.nextDueDate);
    next.setDate(next.getDate() + 7);
    void updatePPMSchedule(schedule.id, { status: 'deferred', deferralReason: 'Rescheduled by supervisor', nextDueDate: next.toISOString().slice(0, 10) });
  };

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Planned Maintenance</p>
            <h1 className="text-2xl font-black text-white tracking-tight">PPM registry</h1>
            <p className="text-white/60 text-sm mt-1 font-medium">Preventive schedules, assignments, and completions.</p>
          </div>
          {canManage && <button onClick={() => setShowForm(true)} className="btn-white-glass"><Plus size={14} />Add schedule</button>}
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card p-5 space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-black text-slate-900">Add PPM schedule</h2><button type="button" onClick={() => setShowForm(false)}><XCircle size={18} className="text-slate-400" /></button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group"><label className="label">Title</label><input className="input" value={title} onChange={e => setTitle(e.target.value)} required /></div>
            <div className="form-group"><label className="label">Site</label><select className="select" value={siteId} onChange={e => { setSiteId(e.target.value); setAssetId(''); }} required><option value="">Select site</option>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select></div>
            <div className="form-group"><label className="label">Asset</label><select className="select" value={assetId} onChange={e => setAssetId(e.target.value)}><option value="">Optional asset</option>{siteAssets.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></div>
            <div className="form-group"><label className="label">Vendor / Service provider</label><select className="select" value={vendorId} onChange={e => setVendorId(e.target.value)}><option value="">Optional vendor</option>{vendors.map(v => <option key={v.id} value={v.id}>{vendorLabel(v)}</option>)}</select></div>
            <div className="form-group"><label className="label">Frequency (months)</label><input className="input" type="number" min={1} value={frequency} onChange={e => setFrequency(e.target.value)} required /></div>
            <div className="form-group"><label className="label">Next due date</label><input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required /></div>
            <div className="form-group"><label className="label">Assign technician</label><select className="select" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}><option value="">Unassigned</option>{users.filter(u => u.role === 'technician').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
            <div className="form-group md:col-span-2"><label className="label">Description / scope</label><textarea className="input" rows={2} value={description} onChange={e => setDescription(e.target.value)} /></div>
          </div>
          <button className="btn-primary" disabled={saving}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Save schedule</button>
        </form>
      )}

      {ppmSchedules.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">No PPM schedules yet.</div>
      ) : (
        sites
          .map(site => ({ site, schedules: ppmSchedules.filter(s => s.siteId === site.id) }))
          .filter(group => group.schedules.length > 0)
          .map(({ site, schedules: siteSchedules }) => (
            <div key={site.id} className="card overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2"><Calendar size={18} className="text-brand-600" /><h2 className="font-black text-slate-900">{site.name}</h2></div>
                <span className="badge bg-slate-100 text-slate-600">{siteSchedules.length} schedule{siteSchedules.length === 1 ? '' : 's'}</span>
              </div>
              <div className="divide-y divide-slate-100">{siteSchedules.map(schedule => <div key={schedule.id} className="p-4 flex items-start justify-between gap-3"><div><p className="font-bold text-slate-800">{schedule.title}</p><p className="text-xs text-slate-500">{schedule.assetId ? assets.find(a => a.id === schedule.assetId)?.name : 'Site-wide'}</p><p className="text-xs text-slate-400 mt-1">{schedule.description}</p><div className="flex gap-2 mt-2"><span className={`badge ${STATUS_COLORS[schedule.status]}`}>{schedule.status}</span><span className="badge bg-slate-100 text-slate-600"><Clock size={10} />{formatDate(schedule.nextDueDate)}</span></div></div><div className="text-right space-y-1"><p className="text-xs text-slate-500">{schedule.frequencyMonths} month{schedule.frequencyMonths === 1 ? '' : 's'}</p>{schedule.assignedTo && <p className="text-xs text-brand-600 flex items-center justify-end gap-1"><Wrench size={10} />{users.find(u => u.id === schedule.assignedTo)?.name}</p>}{(canManage || currentUser?.id === schedule.assignedTo) && schedule.status !== 'completed' && <div className="flex gap-2 mt-2"><button onClick={() => complete(schedule)} className="btn-success text-xs py-1"><CheckCircle size={12} />Complete</button><button onClick={() => defer(schedule)} className="btn-secondary text-xs py-1">Defer</button></div>}</div></div>)}</div>
            </div>
          ))
      )}
    </div>
  );
}
