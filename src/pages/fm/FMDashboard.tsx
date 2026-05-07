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

      {/* ── Gradient Hero Header ─────────────── */}
      <div className="dash-header">
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1.5">{today}</p>
            <h1 className="text-2xl font-black text-white tracking-tight">Good day, {firstName} 👋</h1>
            <p className="text-white/60 text-sm mt-1.5 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              {site?.name ?? 'No site assigned'}
            </p>
          </div>
          <button onClick={() => navigate('/fm/request/new')} className="btn-white-glass flex items-center gap-2 shadow-lg">
            <Plus size={15} /> New Request
          </button>
        </div>
        {/* decorative orbs */}
        <div className="absolute right-6 top-2 w-36 h-36 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)' }} />
        <div className="absolute right-28 -top-8 w-24 h-24 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)' }} />
        <div className="absolute left-1/2 bottom-0 w-48 h-12 pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)' }} />
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
          { label: 'Create Request', icon: <Plus size={20} />, gradient: 'from-brand-500 to-purple-600', shadow: 'shadow-[0_4px_16px_rgba(99,102,241,0.35)]', path: '/fm/request/new', badge: null },
          { label: 'Checklists', icon: <CheckSquare size={20} />, gradient: 'from-teal-500 to-cyan-600', shadow: 'shadow-[0_4px_16px_rgba(20,184,166,0.35)]', path: '/fm/checklists', badge: pendingChecklists.length || null },
          { label: 'Assets', icon: <Package size={20} />, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-[0_4px_16px_rgba(139,92,246,0.35)]', path: '/fm/assets', badge: null },
        ].map(action => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className="card p-5 flex flex-col items-center gap-3 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
          >
            <div className={`w-13 h-13 w-12 h-12 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center ${action.shadow} group-hover:scale-110 transition-transform duration-300 relative`}>
              <span className="text-white">{action.icon}</span>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ animationDelay: '0.1s' }}>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Activity size={15} className="text-white" />
            </div>
            <span className="trend-neutral">Active</span>
          </div>
          <p className="text-3xl font-black text-slate-900 animate-count-up">{openRequests.length}</p>
          <p className="text-xs text-slate-400 mt-1 font-semibold">Open Requests</p>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${critical.length > 0 ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-slate-200 to-slate-300'}`}>
              <AlertTriangle size={15} className="text-white" />
            </div>
            {critical.length > 0 ? <span className="trend-down">Urgent</span> : <span className="trend-neutral">Clear</span>}
          </div>
          <p className={`text-3xl font-black animate-count-up ${critical.length > 0 ? 'text-red-600' : 'text-slate-900'}`}>{critical.length}</p>
          <p className="text-xs text-slate-400 mt-1 font-semibold">Critical Open</p>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${slaBreached.length > 0 ? 'bg-gradient-to-br from-orange-400 to-amber-500' : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>
              <Clock size={15} className="text-white" />
            </div>
            {slaBreached.length > 0 ? <span className="trend-down">⚠ Breached</span> : <span className="trend-up">On Track</span>}
          </div>
          <p className={`text-3xl font-black animate-count-up ${slaBreached.length > 0 ? 'text-orange-600' : 'text-slate-900'}`}>{slaBreached.length}</p>
          <p className="text-xs text-slate-400 mt-1 font-semibold">SLA Breached</p>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
              <TrendingUp size={15} className="text-white" />
            </div>
            <span className="trend-up">↑ {paid.length} paid</span>
          </div>
          <p className="text-3xl font-black text-slate-900 animate-count-up">{myRequests.length}</p>
          <p className="text-xs text-slate-400 mt-1 font-semibold">This Month</p>
        </div>
      </div>

      {/* ── Recent Requests + Sidebar ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Requests — fixed clear layout */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="section-title">Recent Requests</h2>
            <button onClick={() => navigate('/fm/requests')} className="btn-ghost text-brand-600 hover:text-brand-700 hover:bg-brand-50 text-xs font-bold">
              View all <ChevronRight size={13} />
            </button>
          </div>

          {myRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
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
