import { useState, type FormEvent } from 'react';
import { Camera, CheckCircle, ClipboardCheck, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { uploadFile } from '../../lib/firestore';
import { formatDate } from '../../utils/helpers';

function addMonths(date: string, months: number) {
  const next = new Date(`${date}T00:00:00`);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().slice(0, 10);
}

export default function JobCompletion() {
  const navigate = useNavigate();
  const { currentUser, ppmSchedules, assets, createJobCompletion, updatePPMSchedule } = useStore();
  const assignedSchedules = ppmSchedules.filter(schedule => schedule.assignedTo === currentUser?.id && schedule.status !== 'completed');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [narrative, setNarrative] = useState('');
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const schedule = ppmSchedules.find(item => item.id === selectedScheduleId);
  const asset = schedule?.assetId ? assets.find(item => item.id === schedule.assetId) : undefined;

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>, setter: (file: File | null) => void) => {
    if (event.target.files?.[0]) setter(event.target.files[0]);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !schedule) return;
    setSaving(true);
    const beforeUrl = beforeFile ? await uploadFile(`completions/${schedule.id}/before-${crypto.randomUUID()}-${beforeFile.name}`, beforeFile) : undefined;
    const afterUrl = afterFile ? await uploadFile(`completions/${schedule.id}/after-${crypto.randomUUID()}-${afterFile.name}`, afterFile) : undefined;
    const completedDate = new Date().toISOString().slice(0, 10);
    await createJobCompletion({ ppmScheduleId: schedule.id, submittedBy: currentUser.id, narrative, beforePhotoUrl: beforeUrl, afterPhotoUrl: afterUrl });
    await updatePPMSchedule(schedule.id, {
      status: 'completed',
      lastCompletedDate: completedDate,
      nextDueDate: addMonths(completedDate, schedule.frequencyMonths),
    });
    setSelectedScheduleId(''); setNarrative(''); setBeforeFile(null); setAfterFile(null);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2"><ClipboardCheck size={20} />Job Completion Form</h1>
        <p className="text-white/70 text-sm mt-1">Submit before/after evidence for tasks assigned to you.</p>
      </div>

      <div className="card p-5">
        <label className="label">Select assigned task</label>
        <select className="select" value={selectedScheduleId} onChange={e => setSelectedScheduleId(e.target.value)}>
          <option value="">Choose a task</option>
          {assignedSchedules.map(item => {
            const itemAsset = item.assetId ? assets.find(assetItem => assetItem.id === item.assetId) : undefined;
            return <option key={item.id} value={item.id}>{item.title} — due {formatDate(item.nextDueDate)}{itemAsset ? ` · ${itemAsset.name}` : ''}</option>;
          })}
        </select>
        {assignedSchedules.length === 0 && <p className="mt-2 text-xs text-slate-500">No assigned tasks are awaiting completion.</p>}
      </div>

      {schedule && (
        <form onSubmit={submit} className="card p-5 space-y-4">
          {asset && <p className="text-sm text-slate-600"><span className="font-semibold">Asset:</span> {asset.name}{asset.floor ? ` — ${asset.floor}` : ''}{asset.location ? `, ${asset.location}` : ''}</p>}
          <div className="form-group"><label className="label">Work completed narrative</label><textarea className="input" rows={4} value={narrative} onChange={e => setNarrative(e.target.value)} placeholder="Describe what was done — this text appears verbatim in the monthly client report" required /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50">
              <Camera size={24} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-600">{beforeFile ? beforeFile.name : 'Before photo'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => handleFile(e, setBeforeFile)} />
            </label>
            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50">
              <Camera size={24} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-600">{afterFile ? afterFile.name : 'After photo'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => handleFile(e, setAfterFile)} />
            </label>
          </div>
          <p className="text-xs text-slate-500">Both photos are recommended. They auto-populate the operations section of the monthly report.</p>
          <div className="flex gap-3">
            <button className="btn-primary" disabled={saving || !narrative}>{saving ? <Loader2 size={15} className="animate-spin" /> : <><CheckCircle size={14} />Submit JCF</>}</button>
            <button type="button" onClick={() => navigate('/technician')} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
