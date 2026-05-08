import { useNavigate } from 'react-router-dom';
import { Plus, CheckSquare, Package, AlertTriangle, Clock, TrendingUp, Activity, ArrowRight, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge, PriorityBadge } from '../../components/shared/Badges';
import BudgetWidget from '../../components/shared/BudgetWidget';
import { formatCurrency, getSlaStatus } from '../../utils/helpers';

export default function FMDashboard() {
  const navigate = useNavigate();
  const { currentUser, requests, sites, checklists } = useStore();
  const site = sites.find(s => s.id === currentUser?.siteId);
  const myRequests = requests.filter(r => r.siteId === currentUser?.siteId);
  const openRequests = myRequests.filter(r => !['PAID', 'CLOSED', 'REJECTED'].includes(r.status));
  const critical = myRequests.filter(r => r.priority === 'critical' && !['PAID', 'CLOSED'].includes(r.status));
  const slaBreached = myRequests.filter(r => r.slaBreached && !['PAID', 'CLOSED', 'REJECTED'].includes(r.status));
  const paid = myRequests.filter(r => r.status === 'PAID');
  const mySiteChecklists = checklists.filter(c => c.siteId === currentUser?.siteId);
  const pendingChecklists = mySiteChecklists.filter(c => !c.submittedToAdmin);

  const budgetData = site ? {
    budget: site.monthlyBudget,
    spent: site.currentMonthSpend,
    remaining: site.monthlyBudget - site.currentMonthSpend,
    utilizationPct: Math.round((site.currentMonthSpend / site.monthlyBudget) * 100),
  } : null;

  const firstName = currentUser?.name?.split(' ')[0];
  const today = new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6 max-w-screen-xl">

      {/* ── Hero Header ─────────────── */}
      <div className="dash-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">{today}</p>
            <h1 className="text-xl font-semibold text-white">Good day, {firstName}</h1>
            <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              {site?.name ?? 'No site assigned'}
            </p>
          </div>
          <button onClick={() => navigate('/fm/request/new')} className="btn-white-glass">
            <Plus size={14} /> New Request
          </button>
        </div>
      </div>

      {/* ── Critical Alert Banner ────────────────── */}
      {(critical.length > 0 || slaBreached.length > 0) && (
        <div className="alert-critical">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={15} className="text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-800">Immediate Attention Required</p>
            <p className="text-sm text-red-600 mt-0.5">
              {critical.length > 0 && <span>{critical.length} critical request{critical.length > 1 ? 's' : ''} still open. </span>}
              {slaBreached.length > 0 && <span>{slaBreached.length} SLA breach{slaBreached.length > 1 ? 'es' : ''} detected — escalation may occur.</span>}
            </p>
          </div>
          <button onClick={() => navigate('/fm/requests')} className="flex-shrink-0 text-xs font-bold text-red-700 hover:text-red-900 flex items-center gap-1">
            View <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* ── Quick Actions ────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Create Request', icon: <Plus size={16} />, color: 'text-indigo-600 bg-indigo-50', path: '/fm/request/new', badge: null },
          { label: 'Checklists', icon: <CheckSquare size={16} />, color: 'text-teal-600 bg-teal-50', path: '/fm/checklists', badge: pendingChecklists.length || null },
          { label: 'Assets', icon: <Package size={16} />, color: 'text-purple-600 bg-purple-50', path: '/fm/assets', badge: null },
        ].map(action => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className="card p-4 flex flex-col items-center gap-2.5 hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer group"
          >
            <div className={`w-9 h-9 rounded-lg ${action.color} flex items-center justify-center relative`}>
              {action.icon}
              {action.badge && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                  {action.badge}
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{action.label}</span>
          </button>
        ))}
      </div>

      {/* ── Stat Cards ──────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Open Requests */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 rounded-md bg-indigo-50 flex items-center justify-center">
              <Activity size={14} className="text-indigo-600" />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">Active</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{openRequests.length}</p>
          <p className="text-xs text-slate-500 mt-1">Open Requests</p>
        </div>

        {/* Critical */}
        <div className={`border rounded-lg p-4 ${critical.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${critical.length > 0 ? 'bg-red-100' : 'bg-slate-50'}`}>
              <AlertTriangle size={14} className={critical.length > 0 ? 'text-red-600' : 'text-slate-400'} />
            </div>
            {critical.length > 0
              ? <span className="text-xs font-medium text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded">Urgent</span>
              : <span className="text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">Clear</span>}
          </div>
          <p className={`text-2xl font-bold tabular-nums ${critical.length > 0 ? 'text-red-700' : 'text-slate-900'}`}>{critical.length}</p>
          <p className="text-xs text-slate-500 mt-1">Critical Open</p>
        </div>

        {/* SLA */}
        <div className={`border rounded-lg p-4 ${slaBreached.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${slaBreached.length > 0 ? 'bg-amber-100' : 'bg-emerald-50'}`}>
              <Clock size={14} className={slaBreached.length > 0 ? 'text-amber-600' : 'text-emerald-600'} />
            </div>
            {slaBreached.length > 0
              ? <span className="text-xs font-medium text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded">Breached</span>
              : <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">On Track</span>}
          </div>
          <p className={`text-2xl font-bold tabular-nums ${slaBreached.length > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{slaBreached.length}</p>
          <p className="text-xs text-slate-500 mt-1">SLA Breached</p>
        </div>

        {/* This Month */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 rounded-md bg-emerald-50 flex items-center justify-center">
              <TrendingUp size={14} className="text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">{paid.length} paid</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{myRequests.length}</p>
          <p className="text-xs text-slate-500 mt-1">This Month</p>
        </div>
      </div>

      {/* ── Recent Requests + Sidebar ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Requests — fixed clear layout */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Recent Requests</h2>
            <button onClick={() => navigate('/fm/requests')} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
              View all <ChevronRight size={12} />
            </button>
          </div>

          {myRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center mb-3">
                <Activity size={20} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No requests yet</p>
              <p className="text-xs text-slate-400 mt-1">Tap Create Request to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100/80">
              {myRequests.slice(0, 5).map(req => {
                const sla = getSlaStatus(req.slaDeadline, req.status);
                const priorityBorder =
                  req.priority === 'critical' ? '#ef4444' :
                  req.priority === 'high'     ? '#f97316' :
                  req.priority === 'medium'   ? '#f59e0b' : '#94a3b8';
                return (
                  <div
                    key={req.id}
                    onClick={() => navigate(`/request/${req.id}`)}
                    className="request-row group relative"
                    style={{ borderLeft: `3px solid ${priorityBorder}` }}
                  >
                    {/* Left: ID + Description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-400 font-mono">{req.requestNumber}</span>
                        <PriorityBadge priority={req.priority} />
                      </div>
                      <p className="text-sm font-medium text-slate-800 truncate leading-snug">{req.description}</p>
                    </div>

                    {/* Right: Status + SLA on separate stacked lines */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-3">
                      <StatusBadge status={req.status} />
                      <span className={`text-xs font-semibold ${sla.color} flex items-center gap-1`}>
                        <Clock size={10} />
                        {sla.label}
                      </span>
                    </div>

                    <ChevronRight size={14} className="text-slate-300 flex-shrink-0 group-hover:text-slate-500 transition-colors" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {budgetData && (
            <BudgetWidget
              budget={budgetData.budget}
              spent={budgetData.spent}
              remaining={budgetData.remaining}
              utilizationPct={budgetData.utilizationPct}
            />
          )}

          {site && (
            <div className="card p-5">
              <p className="label mb-3">Petty Cash</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Status</span>
                  <span className={`badge ${site.pettyCashEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    <span className={`badge-dot ${site.pettyCashEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {site.pettyCashEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Float Limit</span>
                  <span className="text-sm font-bold text-slate-800">{formatCurrency(site.floatLimit)}</span>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Pending checklists</span>
                    <span className={`text-xs font-bold ${pendingChecklists.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {pendingChecklists.length > 0 ? `${pendingChecklists.length} pending` : 'All submitted'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
