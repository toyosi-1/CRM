import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, AlertTriangle, Activity } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge, PriorityBadge } from '../../components/shared/Badges';
import BudgetWidget from '../../components/shared/BudgetWidget';
import { formatCurrency, getSlaStatus } from '../../utils/helpers';

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const { currentUser, requests, sites, getBudgetSummaries } = useStore();

  const pendingAction = requests.filter(r => r.status === 'PO_GENERATED' || r.status === 'SUPERVISOR_APPROVAL');
  const approved = requests.filter(r => ['PAYMENT_PENDING', 'PAID', 'CLOSED'].includes(r.status));
  const rejected = requests.filter(r => r.status === 'REJECTED');
  const budgetWarnings = requests.filter(r => r.isBudgetWarning && !['PAID', 'CLOSED'].includes(r.status));
  const budgets = getBudgetSummaries();

  const totalApprovedValue = approved.reduce((s, r) => s + (r.invoiceAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Supervisor dashboard</h1>
          <p className="text-sm mt-1">{currentUser?.name} · Supervisor — review approvals · manage site rules · monitor budgets</p>
        </div>
      </div>

      {budgetWarnings.length > 0 && (
        <div className="alert-warning">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={15} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800">Budget Override Requests</p>
            <p className="text-sm text-amber-700 mt-0.5">{budgetWarnings.length} request{budgetWarnings.length > 1 ? 's' : ''} will exceed site budget. Review carefully before approving.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock size={16} className="text-amber-500" />
            </div>
            {pendingAction.length > 0 ? <span className="trend-down">Action needed</span> : <span className="trend-up">Clear</span>}
          </div>
          <p className="text-3xl font-extrabold text-amber-600 animate-count-up">{pendingAction.length}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Pending Action</p>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle size={16} className="text-emerald-500" />
            </div>
            <span className="trend-up">{formatCurrency(totalApprovedValue)}</span>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 animate-count-up">{approved.length}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Approved</p>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <XCircle size={16} className="text-red-500" />
            </div>
            <span className="trend-neutral">Returned</span>
          </div>
          <p className="text-3xl font-extrabold text-red-600 animate-count-up">{rejected.length}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Rejected</p>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
              <Activity size={16} className="text-brand-600" />
            </div>
            <span className="trend-neutral">Active</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 animate-count-up">{sites.length}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Sites Managed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Approval Queue */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="section-title">Approval queue</h2>
            <button onClick={() => navigate('/supervisor/approvals')} className="btn-ghost text-xs text-brand-600 font-bold">View all</button>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingAction.slice(0, 5).map(req => {
              const sla = getSlaStatus(req.slaDeadline, req.status);
              return (
                <div key={req.id} onClick={() => navigate(`/request/${req.id}`)} className="request-row group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold text-brand-600 font-mono">{req.requestNumber}</span>
                      <PriorityBadge priority={req.priority} />
                      {req.isBudgetWarning && (
                        <span className="badge bg-red-100 text-red-600"><AlertTriangle size={9} /> Budget</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-700 truncate">{req.siteName} — {req.description.slice(0, 60)}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <StatusBadge status={req.status} />
                      {req.invoiceAmount && <span className="text-xs font-bold text-slate-600">{formatCurrency(req.invoiceAmount)}</span>}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold ${sla.color} flex-shrink-0 ml-3 flex items-center gap-1`}>
                    <Clock size={10} />{sla.label}
                  </span>
                </div>
              );
            })}
            {pendingAction.length === 0 && (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                  <CheckCircle size={20} className="text-emerald-500" />
                </div>
                <p className="text-sm font-bold text-slate-600">No pending approvals</p>
                <p className="text-xs text-slate-400 mt-1">All submissions have been reviewed</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Site Budget Health</h2>
            <button onClick={() => navigate('/supervisor/sites')} className="btn-ghost text-xs text-brand-600 font-bold">Manage</button>
          </div>
          {budgets.map(b => (
            <BudgetWidget key={b.siteId} budget={b.monthlyBudget} spent={b.spent} remaining={b.remaining} utilizationPct={b.utilizationPct} compact />
          ))}
        </div>
      </div>
    </div>
  );
}
