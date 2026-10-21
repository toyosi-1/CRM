import { CheckCircle, Wrench } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatDate } from '../../utils/helpers';

export default function TechnicianTasks() {
  const { currentUser, ppmSchedules, updatePPMSchedule } = useStore();
  const assigned = ppmSchedules.filter(s => s.assignedTo === currentUser?.id);

  const complete = (id: string, frequencyMonths: number, nextDueDate: string) => {
    const next = new Date(nextDueDate);
    next.setMonth(next.getMonth() + frequencyMonths);
    void updatePPMSchedule(id, { status: 'completed', lastCompletedDate: new Date().toISOString().slice(0, 10), nextDueDate: next.toISOString().slice(0, 10) });
  };

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <h1 className="text-2xl font-black text-white tracking-tight">My tasks</h1>
        <p className="text-white/70 text-sm mt-1">PPM work orders assigned to you.</p>
      </div>
      <div className="card overflow-hidden">
        {assigned.length === 0 ? <div className="p-10 text-center text-slate-500">No tasks assigned.</div> : <div className="divide-y divide-slate-100">{assigned.map(task => <div key={task.id} className="p-4 flex items-start justify-between gap-3"><div className="flex gap-3"><div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0"><Wrench size={16} /></div><div><p className="font-bold text-slate-800">{task.title}</p><p className="text-xs text-slate-500">Due {formatDate(task.nextDueDate)} · {task.status}</p><p className="text-sm text-slate-600 mt-1">{task.description}</p></div></div><div>{task.status !== 'completed' && <button onClick={() => complete(task.id, task.frequencyMonths, task.nextDueDate)} className="btn-success text-xs py-1"><CheckCircle size={12} />Complete</button>}</div></div>)}</div>}
      </div>
    </div>
  );
}
