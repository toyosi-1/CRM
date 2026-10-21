import { useNavigate } from 'react-router-dom';
import { CheckSquare, Wrench, AlertTriangle, Package, Calendar } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ROLE_LABELS } from '../../utils/helpers';

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const { currentUser, ppmSchedules, incidents, checklists, requests } = useStore();
  const assignedPPM = ppmSchedules.filter(s => s.assignedTo === currentUser?.id && s.status !== 'completed');
  const openIncidents = incidents.filter(i => i.status !== 'closed');
  const myChecklists = checklists.filter(c => c.completedBy === currentUser?.id);
  const completedRequests = requests.filter(r => r.status === 'PAID' || r.status === 'CLOSED');

  const quickActions = [
    { label: 'My Tasks', icon: <Wrench size={16} />, path: '/technician/tasks', value: assignedPPM.length },
    { label: 'Checklists', icon: <CheckSquare size={16} />, path: '/technician/checklists', value: myChecklists.length },
    { label: 'Assets', icon: <Package size={16} />, path: '/technician/assets' },
    { label: 'PPM Schedule', icon: <Calendar size={16} />, path: '/technician/ppm' },
  ];

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <div>
          <p className="text-white/60 text-xs uppercase tracking-widest mb-1">{ROLE_LABELS[currentUser?.role ?? 'technician']}</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Good day, {currentUser?.name.split(' ')[0]}</h1>
          <p className="text-white/70 text-sm mt-1">Assigned PPM, incidents, and daily checks.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map(action => (
          <button key={action.label} onClick={() => navigate(action.path)} className="card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all cursor-pointer">
            <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">{action.icon}</div>
            <span className="text-sm font-bold text-slate-700">{action.label}</span>
            {typeof action.value === 'number' && <span className="text-xl font-black text-slate-900">{action.value}</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-5">
          <h2 className="font-black text-slate-900 mb-3 flex items-center gap-2"><Wrench size={16} className="text-brand-600" />Assigned PPM</h2>
          {assignedPPM.length === 0 ? <p className="text-sm text-slate-500">No active PPM tasks.</p> : <div className="space-y-2">{assignedPPM.slice(0, 5).map(s => <div key={s.id} onClick={() => navigate('/technician/ppm')} className="p-3 bg-slate-50 rounded-xl cursor-pointer"><p className="font-bold text-sm">{s.title}</p><p className="text-xs text-slate-500">Due {s.nextDueDate}</p></div>)}</div>}
        </div>
        <div className="card p-5">
          <h2 className="font-black text-slate-900 mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-red-600" />Open incidents</h2>
          {openIncidents.length === 0 ? <p className="text-sm text-slate-500">No open incidents.</p> : <div className="space-y-2">{openIncidents.slice(0, 5).map(i => <div key={i.id} className="p-3 bg-slate-50 rounded-xl"><p className="font-bold text-sm">{i.title}</p><p className="text-xs text-slate-500">{i.severity}</p></div>)}</div>}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-black text-slate-900 mb-3">Performance</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-xl"><p className="text-2xl font-black text-slate-900">{completedRequests.length}</p><p className="text-xs text-slate-500">Requests completed</p></div>
          <div className="text-center p-4 bg-slate-50 rounded-xl"><p className="text-2xl font-black text-slate-900">{myChecklists.filter(c => c.submittedToAdmin).length}</p><p className="text-xs text-slate-500">Checklists submitted</p></div>
          <div className="text-center p-4 bg-slate-50 rounded-xl"><p className="text-2xl font-black text-slate-900">{assignedPPM.filter(s => s.status === 'completed').length}</p><p className="text-xs text-slate-500">PPM completed</p></div>
        </div>
      </div>
    </div>
  );
}
