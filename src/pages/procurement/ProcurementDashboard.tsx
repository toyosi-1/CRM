import { useNavigate } from 'react-router-dom';
import { ClipboardList, FileText, Building2, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge, PriorityBadge } from '../../components/shared/Badges';
import { formatCurrency, getSlaStatus } from '../../utils/helpers';

export default function ProcurementDashboard() {
  const navigate = useNavigate();
  const { requests, vendors } = useStore();

  const inQueue = requests.filter(r => r.status === 'REQUEST_CREATED');
  const inReview = requests.filter(r => r.status === 'PROCUREMENT_REVIEW');
  const poGenerated = requests.filter(r => r.status === 'PO_GENERATED');
  const allPOs = requests.filter(r => r.purchaseOrder);
  const totalPOValue = allPOs.reduce((sum, r) => sum + (r.invoiceAmount ?? 0), 0);
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="dash-header" style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #4f46e5 50%, #7c3aed 100%)' }}>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white tracking-tight">Procurement Dashboard</h1>
          <p className="text-white/70 text-sm mt-1">Review invoices · validate vendors · generate POs</p>
        </div>
        <div className="absolute right-10 top-2 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
              <ClipboardList size={16} className="text-brand-600" />
            </div>
            {inQueue.length > 0 ? <span className="trend-down">Action needed</span> : <span className="trend-neutral">Clear</span>}
          </div>
          <p className="text-3xl font-extrabold text-slate-900 animate-count-up">{inQueue.length}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">New Requests</p>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock size={16} className="text-amber-500" />
            </div>
            <span className="trend-neutral">In Progress</span>
          </div>
          <p className="text-3xl font-extrabold text-amber-600 animate-count-up">{inReview.length}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">In Review</p>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <FileText size={16} className="text-emerald-600" />
            </div>
            <span className="trend-up">Generated</span>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 animate-count-up">{poGenerated.length}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">POs Generated</p>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-purple-600" />
            </div>
            <span className="trend-neutral">Period</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 animate-count-up">{formatCurrency(totalPOValue)}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Total PO Value</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Queue */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="section-title">Incoming Queue</h2>
            <button onClick={() => navigate('/procurement/queue')} className="btn-ghost text-xs text-brand-600 font-bold">
              View all ({inQueue.length + inReview.length})
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {[...inQueue, ...inReview].slice(0, 6).map(req => {
              const sla = getSlaStatus(req.slaDeadline, req.status);
              return (
                <div key={req.id} onClick={() => navigate(`/request/${req.id}`)} className="request-row group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-brand-600 font-mono">{req.requestNumber}</span>
                      <PriorityBadge priority={req.priority} />
                    </div>
                    <p className="text-sm font-medium text-slate-700 truncate">{req.siteName} — {req.description.slice(0, 55)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-3">
                    <StatusBadge status={req.status} />
                    <span className={`text-xs font-semibold ${sla.color} flex items-center gap-1`}>
                      <Clock size={10} />{sla.label}
                    </span>
                  </div>
                </div>
              );
            })}
            {inQueue.length + inReview.length === 0 && (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                  <CheckCircle size={20} className="text-emerald-500" />
                </div>
                <p className="text-sm font-bold text-slate-600">Queue clear</p>
                <p className="text-xs text-slate-400 mt-1">All requests have been processed</p>
              </div>
            )}
          </div>
        </div>

        {/* Vendor Summary */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Top Vendors</h2>
            <button onClick={() => navigate('/procurement/vendors')} className="btn-ghost text-xs text-brand-600 font-bold">View all</button>
          </div>
          <div className="space-y-2">
            {vendors.slice(0, 5).map(v => (
              <div key={v.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Building2 size={13} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 truncate max-w-28">{v.name}</p>
                    <p className="text-xs text-slate-400">{v.totalJobsCompleted} jobs completed</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-700">{formatCurrency(v.totalAmountPaid)}</p>
                  <span className={`badge text-xs mt-0.5 ${
                    v.riskScore === 'low' ? 'bg-emerald-100 text-emerald-700' :
                    v.riskScore === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    <span className={`badge-dot ${
                      v.riskScore === 'low' ? 'bg-emerald-500' :
                      v.riskScore === 'medium' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                    {v.riskScore} risk
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
