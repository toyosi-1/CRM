import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Calendar, CheckCircle2, ClipboardList, Wrench } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { instanceId, isDueToday } from '../../lib/checklists';
import { formatDate } from '../../utils/helpers';
import type { Checklist, ChecklistItem } from '../../types';

function statusChip(r: { slaBreached: boolean; status: string }) {
  if (r.slaBreached) return { label: 'Overdue', cls: 'bg-red-100 text-red-700' };
  if (r.status === 'REQUEST_CREATED') return { label: 'Assigned', cls: 'bg-slate-100 text-slate-600' };
  if (r.status === 'PAID' || r.status === 'CLOSED') return { label: 'Done', cls: 'bg-emerald-100 text-emerald-700' };
  return { label: 'In progress', cls: 'bg-amber-100 text-amber-700' };
}

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const { currentUser, ppmSchedules, requests, checklists, checklistTemplates, jobCompletions, activeSiteId } = useStore();
  const siteId = activeSiteId ?? currentUser?.siteId;

  // Today's outstanding technical checks — tech-scoped items on this site's live walk instances
  const dueIds = new Set(checklistTemplates.filter(t => t.siteId === siteId && isDueToday(t)).map(instanceId));
  const todaysWalks = checklists.filter(c => c.siteId === siteId && dueIds.has(c.id) && !c.submittedToAdmin);
  const pendingChecks: { cl: Checklist; item: ChecklistItem }[] = todaysWalks.flatMap(cl =>
    cl.items.filter(i => (i.role === 'tech' || i.role === 'both') && !i.checked).map(item => ({ cl, item }))
  );

  // Work queue — requests routed to me by the FM, and my PPM schedule
  const workOrders = requests
    .filter(r => r.assignedTo === currentUser?.id && !['PAID', 'CLOSED', 'REJECTED'].includes(r.status))
    .sort((a, b) => Number(b.slaBreached) - Number(a.slaBreached) || b.createdAt.localeCompare(a.createdAt));
  const myPpm = ppmSchedules.filter(s => s.assignedTo === currentUser?.id && s.status !== 'completed');
  const overduePpm = myPpm.filter(s => s.nextDueDate < new Date().toISOString().slice(0, 10)).length;
  const openTasks = workOrders.length + myPpm.length;
  const overdueTasks = workOrders.filter(r => r.slaBreached).length + overduePpm;
  const nextPpm = [...myPpm].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))[0];

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartIso = weekStart.toISOString().slice(0, 10);
  const completedThisWeek =
    jobCompletions.filter(j => j.submittedBy === currentUser?.id && j.createdAt.slice(0, 10) >= weekStartIso).length
    + ppmSchedules.filter(s => s.assignedTo === currentUser?.id && s.lastCompletedDate && s.lastCompletedDate >= weekStartIso).length;

  const stats = [
    { label: 'Open tasks', value: openTasks, icon: <ClipboardList size={15} />, sub: overdueTasks > 0 ? `${overdueTasks} overdue` : 'None overdue', warn: overdueTasks > 0 },
    { label: 'Technical checks due', value: pendingChecks.length, icon: <CheckCircle2 size={15} />, sub: "Today's walk" },
    { label: 'Completed this week', value: completedThisWeek, icon: <Wrench size={15} />, sub: 'On target' },
    { label: 'PPM assigned', value: myPpm.length, icon: <Calendar size={15} />, sub: nextPpm ? `Next: ${formatDate(nextPpm.nextDueDate)}` : 'None scheduled' },
  ];

  return (
    <div className="space-y-6">
      {pendingChecks.length > 0 && (
        <div className="warn-banner">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>
            <strong>{pendingChecks.length} technical check{pendingChecks.length === 1 ? '' : 's'}</strong> are outstanding on today's site walk.
            The FM cannot submit the walk until these are completed.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card p-4">
            <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mb-3">{s.icon}</div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{s.value}</p>
            <p className={`text-xs mt-1 font-medium ${s.warn ? 'text-red-600' : 'text-emerald-600'}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-black text-slate-900">Today's technical checks</h2>
            {pendingChecks.length > 0 && <span className="badge b-neu">{pendingChecks.length} pending</span>}
          </div>
          <p className="text-xs text-slate-400 mb-3">Assigned to you on the site walk</p>
          {pendingChecks.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No technical checks outstanding.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingChecks.map(({ cl, item }) => (
                <div key={`${cl.id}-${item.id}`} className="flex items-center gap-3 py-3">
                  <span className="badge bg-slate-100 text-slate-600 flex-shrink-0">{item.zone ?? 'General'}</span>
                  <p className="flex-1 text-sm font-semibold text-slate-700 truncate">{item.label}</p>
                  <button
                    className="btn-success text-xs py-1.5 flex-shrink-0"
                    onClick={() => navigate(`/technician/checklists?checklist=${encodeURIComponent(cl.id)}`)}
                  >Record</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-black text-slate-900 mb-1">Work orders assigned</h2>
          <p className="text-xs text-slate-400 mb-3">Jobs routed to you by the FM</p>
          {workOrders.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No work orders assigned.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {workOrders.slice(0, 8).map(r => {
                const chip = statusChip(r);
                return (
                  <button key={r.id} onClick={() => navigate(`/request/${r.id}`)} className="w-full flex items-center gap-3 py-3 text-left hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
                    <span className="text-xs font-mono font-bold text-brand-600 flex-shrink-0">{r.requestNumber}</span>
                    <p className="flex-1 text-sm font-semibold text-slate-700 truncate">{r.description}</p>
                    <span className={`badge flex-shrink-0 ${chip.cls}`}>{chip.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
