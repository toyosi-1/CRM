import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, CheckCircle, Clock, Receipt } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge, PriorityBadge } from '../../components/shared/Badges';
import { formatCurrency, TAX_LABELS, getSlaStatus } from '../../utils/helpers';

export default function FinanceDashboard() {
  const navigate = useNavigate();
  const { requests, treasury } = useStore();

  const paymentQueue = requests.filter(r => r.status === 'PAYMENT_PENDING' || r.status === 'ADMIN_APPROVED');
  const paid = requests.filter(r => r.status === 'PAID');
  const totalPaid = paid.reduce((s, r) => s + (r.netPayment ?? r.invoiceAmount ?? 0), 0);
  const totalTaxWithheld = paid.reduce((s, r) => s + (r.taxAmount ?? 0), 0);
  const totalTreasuryInflow = treasury.filter(t => t.type === 'inflow').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="dash-header" style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #0284c7 100%)' }}>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white tracking-tight">Finance Dashboard</h1>
          <p className="text-white/70 text-sm mt-1">Execute vendor payments · manage WHT · track treasury</p>
        </div>
        <div className="absolute right-10 top-2 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <Clock size={16} className="text-orange-500" />
            </div>
            {paymentQueue.length > 0 ? <span className="trend-down">Pending</span> : <span className="trend-up">Clear</span>}
          </div>
          <p className="text-3xl font-extrabold text-orange-600 animate-count-up">{paymentQueue.length}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Payment Queue</p>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <DollarSign size={16} className="text-emerald-600" />
            </div>
            <span className="trend-up">{paid.length} paid</span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 animate-count-up">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Total Disbursed</p>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <Receipt size={16} className="text-red-500" />
            </div>
            <span className="trend-neutral">WHT</span>
          </div>
          <p className="text-2xl font-extrabold text-red-600 animate-count-up">{formatCurrency(totalTaxWithheld)}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Tax Withheld</p>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-blue-600" />
            </div>
            <span className="trend-up">Inflow</span>
          </div>
          <p className="text-2xl font-extrabold text-blue-600 animate-count-up">{formatCurrency(totalTreasuryInflow)}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Treasury Inflow</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="section-title">Payment Queue</h2>
            <button onClick={() => navigate('/finance/payments')} className="btn-ghost text-xs text-brand-600 font-bold">Process All →</button>
          </div>
          <div className="divide-y divide-slate-100">
            {paymentQueue.slice(0, 5).map(req => {
              const sla = getSlaStatus(req.slaDeadline, req.status);
              return (
                <div key={req.id} onClick={() => navigate(`/request/${req.id}`)} className="request-row group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-brand-600 font-mono">{req.requestNumber}</span>
                      <PriorityBadge priority={req.priority} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">{req.vendorName} · <span className="font-bold text-slate-900">{formatCurrency(req.invoiceAmount ?? 0)}</span></p>
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
            {paymentQueue.length === 0 && (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                  <CheckCircle size={20} className="text-emerald-500" />
                </div>
                <p className="text-sm font-bold text-slate-600">Queue clear</p>
                <p className="text-xs text-slate-400 mt-1">No pending payments</p>
              </div>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="section-title">Recent Payments</h2>
            <button onClick={() => navigate('/finance/payments')} className="btn-ghost text-xs text-brand-600 font-bold">View all</button>
          </div>
          <div className="divide-y divide-slate-100">
            {paid.slice(0, 5).map(req => (
              <div key={req.id} onClick={() => navigate(`/request/${req.id}`)} className="request-row group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-500 font-mono">{req.requestNumber}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-700">{req.vendorName} · <span className="text-xs text-slate-400">{req.taxType ? TAX_LABELS[req.taxType] : 'No tax'}</span></p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <div className="text-sm font-extrabold text-emerald-600">{formatCurrency(req.netPayment ?? 0)}</div>
                  {req.taxAmount ? <div className="text-xs text-red-500 font-semibold mt-0.5">-{formatCurrency(req.taxAmount)} WHT</div> : null}
                </div>
              </div>
            ))}
            {paid.length === 0 && (
              <div className="flex flex-col items-center py-10 text-center">
                <p className="text-sm font-bold text-slate-600">No payments yet</p>
                <p className="text-xs text-slate-400 mt-1">Processed payments will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
