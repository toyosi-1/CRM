import { useNavigate } from 'react-router-dom';
import { CheckCircle, ClipboardList, Wrench } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatDate } from '../../utils/helpers';

export default function TechnicianTasks() {
  const navigate = useNavigate();
  const { currentUser, ppmSchedules, requests, updatePPMSchedule } = useStore();
  const assigned = ppmSchedules.filter(s => s.assignedTo === currentUser?.id);
  const workOrders = requests
    .filter(r => r.assignedTo === currentUser?.id && !['PAID', 'CLOSED', 'REJECTED'].includes(r.status))
    .sort((a, b) => Number(b.slaBreached) - Number(a.slaBreached) || b.createdAt.localeCompare(a.createdAt));

  const complete = (id: string, frequencyMonths: number, nextDueDate: string) => {
    const next = new Date(nextDueDate);
    next.setMonth(next.getMonth() + frequencyMonths);
    void updatePPMSchedule(id, { status: 'completed', lastCompletedDate: new Date().toISOString().slice(0, 10), nextDueDate: next.toISOString().slice(0, 10) });
  };

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <h1 className="text-2xl font-black text-white tracking-tight">My tasks</h1>
        <p className="text-white/70 text-sm mt-1">Work orders and PPM jobs assigned to you.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <ClipboardList size={16} className="text-brand-600" />
          <h2 className="font-black text-slate-900">Work orders</h2>
          <p className="text-xs text-slate-400 ml-1">Requests routed to you by the FM</p>
        </div>
        {workOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No work orders assigned.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {workOrders.map(r => (
              <button key={r.id} onClick={() => navigate(`/request/${r.id}`)} className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors">
                <span className="text-xs font-mono font-bold text-brand-600 flex-shrink-0">{r.requestNumber}</span>
                <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{r.description}</span>
                {r.slaBreached
                  ? <span className="badge bg-red-100 text-red-700 flex-shrink-0">Overdue</span>
                  : <span className="badge bg-slate-100 text-slate-600 flex-shrink-0">{r.status === 'REQUEST_CREATED' ? 'Assigned' : 'In progress'}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <Wrench size={16} className="text-orange-600" />
          <h2 className="font-black text-slate-900">PPM jobs</h2>
        </div>
        {assigned.length === 0 ? <div className="p-8 text-center text-slate-500 text-sm">No PPM tasks assigned.</div> : <div className="divide-y divide-slate-100">{assigned.map(task => <div key={task.id} className="p-4 flex items-start justify-between gap-3"><div className="flex gap-3"><div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0"><Wrench size={16} /></div><div><p className="font-bold text-slate-800">{task.title}</p><p className="text-xs text-slate-500">Due {formatDate(task.nextDueDate)} · {task.status}</p><p className="text-sm text-slate-600 mt-1">{task.description}</p></div></div><div>{task.status !== 'completed' && <button onClick={() => complete(task.id, task.frequencyMonths, task.nextDueDate)} className="btn-success text-xs py-1"><CheckCircle size={12} />Complete</button>}</div></div>)}</div>}
      </div>
    </div>
  );
}
