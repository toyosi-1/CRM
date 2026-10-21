import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ImagePlus, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { uploadFile } from '../../lib/firestore';
import { workOrderDocument, mailtoVendorWorkOrder } from '../../lib/workOrder';
import Lightbox from '../../components/shared/Lightbox';
import DocPreview from '../../components/shared/DocPreview';
import type { PPMSchedule } from '../../types';
import { formatDate, addMonths, vendorLabel } from '../../utils/helpers';

function daysUntil(date: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(date); due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

type DueState = 'overdue' | 'due' | 'scheduled';
function dueState(next: string): DueState {
  const d = daysUntil(next);
  if (d < 0) return 'overdue';
  if (d <= 30) return 'due';
  return 'scheduled';
}

function countdown(date: string) {
  const d = daysUntil(date);
  if (d < 0) return `${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} overdue`;
  if (d === 0) return 'due today';
  if (d === 1) return 'due tomorrow';
  return `in ${d} days`;
}

// Spec §5.3 — contract intelligence
function contractFlag(s: PPMSchedule): { tone: 'red' | 'amber' | 'grey'; label: string } | null {
  if (!s.contractEnd) return null;
  const days = daysUntil(s.contractEnd);
  if (days < 0) return { tone: 'red', label: `Contract expired ${Math.abs(days)} days ago` };
  if (new Date(s.nextDueDate) > new Date(s.contractEnd))
    return { tone: 'red', label: `Contract ends ${formatDate(s.contractEnd)}, before the next service falls due` };
  if (days <= 60) return { tone: 'amber', label: `Contract ends in ${days} days` };
  return { tone: 'grey', label: `Contract runs to ${formatDate(s.contractEnd)}` };
}

function visitFlag(s: PPMSchedule): { tone: 'amber' | 'grey'; label: string } | null {
  if (!s.visitsIncluded) return null;
  const used = (s.serviceHistory ?? []).filter(d =>
    (!s.contractStart || d >= s.contractStart) && (!s.contractEnd || d <= s.contractEnd)
  ).length;
  const left = s.visitsIncluded - used;
  if (left <= 0) return { tone: 'grey', label: `${used} of ${s.visitsIncluded} contract visits used — entitlement exhausted` };
  return { tone: 'amber', label: `${used} of ${s.visitsIncluded} contract visits used — ${left} still owed before expiry` };
}

const STATE = {
  overdue: { spine: 'border-red-500', chip: 'bg-red-100 text-red-700', pip: 'bg-red-500', label: 'Overdue' },
  due: { spine: 'border-amber-500', chip: 'bg-amber-100 text-amber-700', pip: 'bg-amber-500', label: 'Due soon' },
  scheduled: { spine: 'border-emerald-500', chip: 'bg-emerald-100 text-emerald-700', pip: 'bg-emerald-500', label: 'Scheduled' },
};

type Filter = 'all' | 'overdue' | 'due' | 'scheduled' | 'contract';
const FREQS = [{ label: 'Monthly', m: 1 }, { label: 'Every 2 months', m: 2 }, { label: 'Quarterly', m: 3 }, { label: 'Every 4 months', m: 4 }, { label: 'Every 6 months', m: 6 }, { label: 'Annual', m: 12 }, { label: 'Every 2 years', m: 24 }, { label: 'Per contract schedule', m: 0 }];

export default function FMPPM() {
  const navigate = useNavigate();
  const { ppmSchedules, vendors, assets, sites, activeSiteId, currentUser, updatePPMSchedule, createPPMSchedule, facilityVendorSLAs } = useStore();
  const siteId = activeSiteId ?? currentUser?.siteId;
  const site = sites.find(s => s.id === siteId);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [deferring, setDeferring] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt?: string } | null>(null);
  const [workOrder, setWorkOrder] = useState<{ schedule: PPMSchedule; html: string } | null>(null);

  const schedules = useMemo(() =>
    ppmSchedules.filter(p => p.siteId === siteId)
      .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()),
    [ppmSchedules, siteId]);

  const hasContractAlert = (s: PPMSchedule) => {
    const c = contractFlag(s), v = visitFlag(s);
    return (c && c.tone !== 'grey') || (v && v.tone === 'amber');
  };

  const counts = useMemo(() => ({
    all: schedules.length,
    overdue: schedules.filter(s => s.status !== 'completed' && s.status !== 'deferred' && dueState(s.nextDueDate) === 'overdue').length,
    due: schedules.filter(s => s.status !== 'completed' && s.status !== 'deferred' && dueState(s.nextDueDate) === 'due').length,
    scheduled: schedules.filter(s => s.status !== 'completed' && s.status !== 'deferred' && dueState(s.nextDueDate) === 'scheduled').length,
    contract: schedules.filter(hasContractAlert).length,
  }), [schedules]);

  const stats = useMemo(() => {
    const total = schedules.length;
    const completed = schedules.filter(s => (s.serviceHistory ?? []).length > 0).length;
    const deferred = schedules.filter(s => s.status === 'deferred').length;
    const servicesDone = schedules.reduce((sum, s) => sum + (s.serviceHistory?.length ?? 0), 0);
    const onTimeRate = total ? Math.round(((total - counts.overdue - deferred) / total) * 100) : null;
    return { total, completed, servicesDone, deferred, onTimeRate };
  }, [schedules, counts.overdue]);

  const filtered = schedules.filter(s => {
    if (filter === 'contract') return hasContractAlert(s);
    if (filter === 'all') return true;
    if (s.status === 'completed' || s.status === 'deferred') return false;
    return dueState(s.nextDueDate) === filter;
  });

  // 12-month ribbon pips
  const ribbon = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${m.getFullYear()}-${m.getMonth()}`;
      const pips: { color: string; title: string }[] = [];
      schedules.forEach(s => {
        if (s.status === 'completed' || s.status === 'deferred') return;
        const due = new Date(s.nextDueDate);
        const bucket = i === 0 && dueState(s.nextDueDate) === 'overdue' ? key : `${due.getFullYear()}-${due.getMonth()}`;
        if (bucket === key) pips.push({ color: STATE[dueState(s.nextDueDate)].pip, title: s.title });
        (s.planDates ?? []).forEach(pd => {
          const d = new Date(pd);
          if (`${d.getFullYear()}-${d.getMonth()}` === key && pd >= new Date().toISOString().slice(0, 10))
            pips.push({ color: 'bg-emerald-400', title: `${s.title} (planned)` });
        });
        if (s.contractEnd) {
          const ce = new Date(s.contractEnd);
          if (`${ce.getFullYear()}-${ce.getMonth()}` === key)
            pips.push({ color: 'bg-transparent border-[1.5px] border-slate-400', title: `${s.title} — contract expiry` });
        }
      });
      return { label: m.toLocaleDateString('en-GB', { month: 'short' }), current: i === 0, pips };
    });
  }, [schedules]);

  const markDone = async (s: PPMSchedule, photos: File[], completionForm?: File) => {
    const today = new Date().toISOString().slice(0, 10);
    const history = [...(s.serviceHistory ?? []), today];
    const attachments = [...(s.completionPhotos ?? [])];
    for (const [index, photo] of photos.entries()) {
      const url = await uploadFile(`ppm/${s.id}/${Date.now()}-${index}-${photo.name}`, photo);
      attachments.push({ name: photo.name, url, originalSize: photo.size, compressedSize: photo.size });
    }
    const jobCompletionUrl = completionForm
      ? await uploadFile(`ppm/${s.id}/${Date.now()}-job-completion-${completionForm.name}`, completionForm)
      : undefined;
    const next = s.frequencyMonths > 0
      ? addMonths(today, s.frequencyMonths)
      : (s.planDates ?? []).find(d => d > today) ?? s.nextDueDate;
    await updatePPMSchedule(s.id, {
      lastCompletedDate: today, nextDueDate: next, serviceHistory: history, completionPhotos: attachments,
      ...(jobCompletionUrl && { jobCompletionUrl }),
      approx: false, status: 'scheduled',
    });
  };

  const vendorName = (id?: string) => vendors.find(v => v.id === id)?.name;
  const assetTag = (id?: string) => assets.find(a => a.id === id)?.name ?? id;

  const slaFor = (s: PPMSchedule) => facilityVendorSLAs.find(sla =>
    sla.siteId === s.siteId && sla.vendorId === s.vendorId && !sla.suspended);

  const raiseWorkOrder = (s: PPMSchedule) => {
    const sla = slaFor(s);
    const vendor = vendors.find(v => v.id === s.vendorId);
    setWorkOrder({ schedule: s, html: workOrderDocument({ schedule: s, site, vendor, fmName: currentUser?.name }) });
    if (sla?.paymentModel === 'prepaid') mailtoVendorWorkOrder({ schedule: s, site, vendor });
  };

  const closeWorkOrder = (s: PPMSchedule) => {
    setWorkOrder(null);
    if (slaFor(s)?.paymentModel !== 'prepaid') {
      navigate(`/fm/request/new?prefill=${encodeURIComponent(`PPM: ${s.title}${s.assetId ? ` — asset ${assetTag(s.assetId)}` : ''}`)}`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="dash-header">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Planned preventive maintenance</p>
            <h1 className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>PPM registry</h1>
            <p className="text-white/60 text-sm mt-1">Sorted by next due date. Raise a work order to push a task into the approval chain.</p>
          </div>
          <div className="text-right font-mono text-[11px] uppercase text-white/50">
            <span className="block text-sm text-white">{site?.name}</span>
            <span>{formatDate(new Date().toISOString())}</span>
          </div>
        </div>
      </div>

      {/* Add task */}
      <div className="flex justify-end">
        <button className="btn-acc" onClick={() => setAdding(v => !v)}>+ Add task</button>
      </div>
      {adding && siteId && <NewTaskForm siteId={siteId} onDone={() => setAdding(false)} onCreate={createPPMSchedule} />}

      {/* Performance summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed services</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.servicesDone}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">across {stats.completed} schedule{stats.completed === 1 ? '' : 's'}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deferred</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats.deferred}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">awaiting reschedule</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overdue</p>
          <p className="text-2xl font-black text-red-600 mt-1">{counts.overdue}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">past due date</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">On-time adherence</p>
          <p className={`text-2xl font-black mt-1 ${stats.onTimeRate === null ? 'text-slate-400' : stats.onTimeRate >= 80 ? 'text-emerald-600' : stats.onTimeRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{stats.onTimeRate === null ? '—' : `${stats.onTimeRate}%`}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">of {stats.total} schedules on track</p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {([['all', 'All'], ['overdue', 'Overdue'], ['due', 'Due in 30 days'], ['scheduled', 'Scheduled'], ['contract', 'Contract alerts']] as [Filter, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`chip ${filter === key ? 'active' : ''}`}>
            {label} · {counts[key]}
          </button>
        ))}
      </div>

      {/* 12-month ribbon */}
      <div className="card p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <span className="text-sm font-bold text-slate-800">12-month outlook</span>
          <span className="flex gap-3 text-[11px] text-slate-500 flex-wrap">
            <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Overdue</span>
            <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />Due in 30 days</span>
            <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Scheduled / planned</span>
            <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full border-[1.5px] border-slate-400 inline-block" />Contract expiry</span>
          </span>
        </div>
        <div className="grid grid-cols-12 gap-1.5">
          {ribbon.map((m, i) => (
            <div key={i} className={`text-center rounded-lg py-1.5 ${m.current ? 'bg-brand-50' : ''}`}>
              <div className="flex justify-center gap-1 flex-wrap min-h-[10px] mb-1 px-0.5">
                {m.pips.map((p, j) => <i key={j} title={p.title} className={`w-[7px] h-[7px] rounded-full inline-block ${p.color}`} />)}
              </div>
              <span className={`text-[10px] uppercase ${m.current ? 'text-brand-700 font-bold' : 'text-slate-400'}`}>{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400">Sorted by next due date. Raise a work order to push a task into the approval chain.</p>

      {/* Task rows */}
      <div className="space-y-3">
        {filtered.map(s => {
          const state = s.status === 'completed' || s.status === 'deferred' ? null : dueState(s.nextDueDate);
          const cf = contractFlag(s), vf = visitFlag(s);
          const freq = FREQS.find(f => f.m === s.frequencyMonths)?.label ?? `Every ${s.frequencyMonths} mo`;
          const isEditing = editing === s.id, isDeferring = deferring === s.id, isCompleting = completing === s.id;
          return (
            <div key={s.id} className={`card border-l-[5px] ${state ? STATE[state].spine : 'border-slate-300'} p-4`}>
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-[220px]">
                  <p className="text-base font-bold text-slate-900">{s.title}</p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    <span className="badge bg-slate-100 text-slate-600">{freq}</span>
                    {s.assignedRole && <span className="badge bg-blue-50 text-blue-700">{s.assignedRole}</span>}
                    {vendorName(s.vendorId) && <span className="badge bg-slate-100 text-slate-600 font-mono uppercase">{vendorName(s.vendorId)}</span>}
                    {slaFor(s)?.paymentModel === 'prepaid' && <span className="badge bg-emerald-50 text-emerald-700">Prepaid SLA</span>}
                    {s.assetId && <span className="badge bg-slate-100 text-slate-600 font-mono">{assetTag(s.assetId)}</span>}
                  </div>
                  <div className="flex gap-4 mt-3 text-xs flex-wrap">
                    <div><p className="text-slate-400">Last done</p><p className="font-semibold text-slate-700">{s.lastCompletedDate ? formatDate(s.lastCompletedDate) : '—'}</p></div>
                    <div><p className="text-slate-400">Next due</p><p className="font-semibold text-slate-700">{formatDate(s.nextDueDate)}{s.approx && <span className="badge bg-amber-100 text-amber-700 ml-1">approx</span>}</p></div>
                    <div><p className="text-slate-400">Countdown</p><p className={`font-semibold ${state === 'overdue' ? 'text-red-600' : state === 'due' ? 'text-amber-600' : 'text-slate-600'}`}>{s.status === 'deferred' ? 'deferred' : s.status === 'completed' ? 'completed' : countdown(s.nextDueDate)}</p></div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {cf && <span className={`badge block w-fit ${cf.tone === 'red' ? 'bg-red-100 text-red-700' : cf.tone === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{cf.label}</span>}
                    {vf && <span className={`badge block w-fit ${vf.tone === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{vf.label}</span>}
                  </div>
                  {(s.notes || (s.serviceHistory ?? []).length > 0) && (
                    <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                      {s.notes && <p>{s.notes}</p>}
                      {(s.serviceHistory ?? []).length > 0 && <p className="text-slate-400">Serviced: {s.serviceHistory!.map(formatDate).join(' · ')}</p>}
                    </div>
                  )}
                  {(s.completionPhotos ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {s.completionPhotos!.map((photo, i) => (
                        <button key={i} type="button" onClick={() => setLightbox({ src: photo.url, alt: photo.name })} className="block rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity">
                          <img src={photo.url} alt={photo.name} className="w-14 h-14 object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  {s.jobCompletionUrl && (
                    <a href={s.jobCompletionUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
                      <FileText size={12} />Job completion form
                    </a>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 items-stretch">
                  <button className="btn-primary text-xs" onClick={() => raiseWorkOrder(s)}>Raise work order</button>
                  {s.status !== 'completed' && <button className="btn-secondary text-xs" onClick={() => { setCompleting(isCompleting ? null : s.id); setEditing(null); setDeferring(null); }}>Mark done</button>}
                  <button className="btn-secondary text-xs" onClick={() => { setDeferring(isDeferring ? null : s.id); setEditing(null); }}>Defer</button>
                  <button className="btn-secondary text-xs" onClick={() => { setEditing(isEditing ? null : s.id); setDeferring(null); }}>Edit</button>
                </div>
              </div>
              {isCompleting && <CompleteForm schedule={s} onDone={() => setCompleting(null)} onConfirm={markDone} />}
              {isDeferring && <DeferForm schedule={s} onDone={() => setDeferring(null)} />}
              {isEditing && <EditForm schedule={s} onDone={() => setEditing(null)} />}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="card px-4 py-10 text-center text-sm text-slate-400">No PPM tasks {filter !== 'all' ? 'match this filter' : 'scheduled for this facility'} — supervisors create them from the PPM registry</div>
        )}
      </div>
      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
      {workOrder && <DocPreview html={workOrder.html} title={`Work order — ${workOrder.schedule.title}`} onClose={() => closeWorkOrder(workOrder.schedule)} />}
    </div>
  );
}

function CompleteForm({ schedule, onDone, onConfirm }: { schedule: PPMSchedule; onDone: () => void; onConfirm: (s: PPMSchedule, photos: File[], completionForm?: File) => Promise<void> }) {
  const photosRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await onConfirm(schedule, Array.from(photosRef.current?.files ?? []), formRef.current?.files?.[0]);
      onDone();
    } catch {
      setError('Unable to record completion. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
      {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
      <div className="form-group">
        <label className="label">Work evidence photos <span className="text-slate-400 font-normal">(optional — workers on site, work in progress)</span></label>
        <input ref={photosRef} type="file" accept="image/*" multiple className="input" />
      </div>
      <div className="form-group">
        <label className="label">Job completion form <span className="text-slate-400 font-normal">(optional)</span></label>
        <input ref={formRef} type="file" accept="image/*,.pdf" className="input" />
      </div>
      <button className="btn-primary text-xs" onClick={submit} disabled={saving}>
        {saving ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}Confirm completion
      </button>
    </div>
  );
}

function DeferForm({ schedule, onDone }: { schedule: PPMSchedule; onDone: () => void }) {
  const { updatePPMSchedule } = useStore();
  const [reason, setReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [error, setError] = useState('');
  const submit = async () => {
    if (!reason.trim() || !newDate) { setError('A written reason and a new date are both required.'); return; }
    const stamp = `[Deferred ${formatDate(new Date().toISOString())}: ${reason.trim()}]`;
    await updatePPMSchedule(schedule.id, {
      status: 'deferred', deferralReason: reason.trim(), nextDueDate: newDate,
      notes: schedule.notes ? `${schedule.notes}\n${stamp}` : stamp,
    });
    onDone();
  };
  return (
    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
      {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="form-group"><label className="label">Reason for deferral *</label><input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this being deferred?" /></div>
        <div className="form-group"><label className="label">New due date *</label><input className="input" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} /></div>
      </div>
      <button className="btn-primary text-xs" onClick={submit}>Confirm deferral</button>
    </div>
  );
}

function EditForm({ schedule, onDone }: { schedule: PPMSchedule; onDone: () => void }) {
  const { updatePPMSchedule, vendors, assets } = useStore();
  const [form, setForm] = useState({
    title: schedule.title, lastCompletedDate: schedule.lastCompletedDate ?? '', frequencyMonths: schedule.frequencyMonths,
    nextDueDate: schedule.nextDueDate, approx: schedule.approx ?? false, vendorId: schedule.vendorId ?? '', assetId: schedule.assetId ?? '',
    contractStart: schedule.contractStart ?? '', contractEnd: schedule.contractEnd ?? '', visitsIncluded: schedule.visitsIncluded ?? 0, notes: schedule.notes ?? '',
  });
  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));
  const save = async () => {
    await updatePPMSchedule(schedule.id, {
      ...form,
      vendorId: form.vendorId || undefined, assetId: form.assetId || undefined,
      contractStart: form.contractStart || undefined, contractEnd: form.contractEnd || undefined,
      lastCompletedDate: form.lastCompletedDate || undefined, visitsIncluded: form.visitsIncluded || undefined,
    });
    onDone();
  };
  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="form-group"><label className="label">Task name</label><input className="input" value={form.title} onChange={e => set({ title: e.target.value })} /></div>
        <div className="form-group"><label className="label">Last done</label><input className="input" type="date" value={form.lastCompletedDate} onChange={e => set({ lastCompletedDate: e.target.value })} /></div>
        <div className="form-group"><label className="label">Frequency</label>
          <select className="select" value={form.frequencyMonths} onChange={e => {
            const m = Number(e.target.value);
            set({ frequencyMonths: m, nextDueDate: form.lastCompletedDate && m > 0 ? addMonths(form.lastCompletedDate, m) : form.nextDueDate });
          }}>
            {FREQS.map(f => <option key={f.m} value={f.m}>{f.label}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="label">Next due</label><input className="input" type="date" value={form.nextDueDate} onChange={e => set({ nextDueDate: e.target.value })} /></div>
        <div className="form-group"><label className="label">Vendor</label><select className="select" value={form.vendorId} onChange={e => set({ vendorId: e.target.value })}><option value="">In-house</option>{vendors.map(v => <option key={v.id} value={v.id}>{vendorLabel(v)}</option>)}</select></div>
        <div className="form-group"><label className="label">Linked asset</label><select className="select" value={form.assetId} onChange={e => set({ assetId: e.target.value })}><option value="">Facility-wide</option>{assets.filter(a => a.siteId === schedule.siteId).map(a => <option key={a.id} value={a.id}>{a.name}{a.floor ? ` — ${a.floor}` : ''}{a.location ? `, ${a.location}` : ''}</option>)}</select></div>
        <div className="form-group"><label className="label">Contract start</label><input className="input" type="date" value={form.contractStart} onChange={e => set({ contractStart: e.target.value })} /></div>
        <div className="form-group"><label className="label">Contract end</label><input className="input" type="date" value={form.contractEnd} onChange={e => set({ contractEnd: e.target.value })} /></div>
        <div className="form-group"><label className="label">Visits included</label><input className="input" type="number" min={0} value={form.visitsIncluded} onChange={e => set({ visitsIncluded: Number(e.target.value) })} /></div>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600 mt-2"><input type="checkbox" checked={form.approx} onChange={e => set({ approx: e.target.checked })} className="rounded" />Next due date is approximate (needs confirming)</label>
      <div className="form-group mt-2"><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set({ notes: e.target.value })} /></div>
      <button className="btn-primary text-xs mt-2" onClick={save}>Save changes</button>
    </div>
  );
}

function NewTaskForm({ siteId, onDone, onCreate }: { siteId: string; onDone: () => void; onCreate: (d: Partial<PPMSchedule>) => Promise<void> }) {
  const { vendors, assets } = useStore();
  const [form, setForm] = useState({
    title: '', frequencyMonths: 3, nextDueDate: '', assignedRole: 'FM' as PPMSchedule['assignedRole'],
    vendorId: '', assetId: '', contractStart: '', contractEnd: '', visitsIncluded: 0, notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));
  const save = async () => {
    if (!form.title.trim()) { setError('Task name is required'); return; }
    if (!form.nextDueDate) { setError('Next due date is required'); return; }
    setSaving(true);
    try {
      await onCreate({
        siteId, title: form.title.trim(), frequencyMonths: form.frequencyMonths, nextDueDate: form.nextDueDate,
        assignedRole: form.assignedRole, vendorId: form.vendorId || undefined, assetId: form.assetId || undefined,
        contractStart: form.contractStart || undefined, contractEnd: form.contractEnd || undefined,
        visitsIncluded: form.visitsIncluded || undefined, notes: form.notes || undefined,
      });
      onDone();
    } catch (e) { setError(String(e instanceof Error ? e.message : e)); }
    finally { setSaving(false); }
  };
  return (
    <div className="card" style={{ padding: '14px 15px' }}>
      <div className="card-hd"><div><div className="card-title">New PPM task</div><div className="card-sub">Scheduled for this facility</div></div></div>
      {error && <p className="text-xs font-semibold mb-2" style={{ color: 'var(--red)' }}>{error}</p>}
      <div className="row3">
        <div className="form-field"><label>Task name <span className="req">*</span></label><input className="inp" value={form.title} onChange={e => set({ title: e.target.value })} placeholder="e.g. Generator quarterly service" /></div>
        <div className="form-field"><label>Frequency</label>
          <select className="sel" value={form.frequencyMonths} onChange={e => set({ frequencyMonths: Number(e.target.value) })}>
            {FREQS.map(f => <option key={f.m} value={f.m}>{f.label}</option>)}
          </select></div>
        <div className="form-field"><label>Next due <span className="req">*</span></label><input className="inp" type="date" value={form.nextDueDate} onChange={e => set({ nextDueDate: e.target.value })} /></div>
        <div className="form-field"><label>Assigned to</label>
          <select className="sel" value={form.assignedRole} onChange={e => set({ assignedRole: e.target.value as PPMSchedule['assignedRole'] })}>
            <option value="FM">FM</option><option value="Technician">Technician</option><option value="Vendor">Vendor</option>
          </select></div>
        <div className="form-field"><label>Vendor</label><select className="sel" value={form.vendorId} onChange={e => set({ vendorId: e.target.value })}><option value="">In-house</option>{vendors.map(v => <option key={v.id} value={v.id}>{vendorLabel(v)}</option>)}</select></div>
        <div className="form-field"><label>Linked asset</label><select className="sel" value={form.assetId} onChange={e => set({ assetId: e.target.value })}><option value="">Facility-wide</option>{assets.filter(a => a.siteId === siteId).map(a => <option key={a.id} value={a.id}>{a.name}{a.floor ? ` — ${a.floor}` : ''}{a.location ? `, ${a.location}` : ''}</option>)}</select></div>
        <div className="form-field"><label>Contract start</label><input className="inp" type="date" value={form.contractStart} onChange={e => set({ contractStart: e.target.value })} /></div>
        <div className="form-field"><label>Contract end</label><input className="inp" type="date" value={form.contractEnd} onChange={e => set({ contractEnd: e.target.value })} /></div>
        <div className="form-field"><label>Visits included</label><input className="inp" type="number" min={0} value={form.visitsIncluded} onChange={e => set({ visitsIncluded: Number(e.target.value) })} /></div>
      </div>
      <div className="form-field mt-3"><label>Notes</label><textarea className="inp ta" rows={2} value={form.notes} onChange={e => set({ notes: e.target.value })} /></div>
      <div className="flex gap-2 mt-3">
        <button className="btn-ghost" onClick={onDone}>Cancel</button>
        <button className="btn-acc" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save task'}</button>
      </div>
    </div>
  );
}
