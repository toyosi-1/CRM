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
      <div className="dash-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Finance</p>
            <h1 className="text-xl font-semibold text-white">Finance dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">Vendor payments · WHT management · treasury</p>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-xl font-bold text-emerald-400 tabular-nums">{formatCurrency(totalPaid)}</p>
              <p className="text-slate-500 text-xs mt-0.5">Total Disbursed</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-right">
              <p className="text-xl font-bold text-white tabular-nums">{paymentQueue.length}</p>
              <p className="text-slate-500 text-xs mt-0.5">In Queue</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`border rounded-lg p-4 ${paymentQueue.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${paymentQueue.length > 0 ? 'bg-amber-100' : 'bg-slate-50'}`}>
              <Clock size={14} className={paymentQueue.length > 0 ? 'text-amber-600' : 'text-slate-400'} />
            </div>
            {paymentQueue.length > 0
              ? <span className="text-xs font-medium text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded">Pending</span>
              : <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Clear</span>}
          </div>
          <p className={`text-2xl font-bold tabular-nums ${paymentQueue.length > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{paymentQueue.length}</p>
          <p className="text-xs text-slate-500 mt-1">Payment queue</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 rounded-md bg-emerald-50 flex items-center justify-center">
              <DollarSign size={14} className="text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">{paid.length} paid</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-slate-500 mt-1">Total Disbursed</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 rounded-md bg-red-50 flex items-center justify-center">
              <Receipt size={14} className="text-red-500" />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">WHT</span>
          </div>
          <p className="text-2xl font-bold text-red-700 tabular-nums">{formatCurrency(totalTaxWithheld)}</p>
          <p className="text-xs text-slate-500 mt-1">Tax Withheld</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center">
              <TrendingUp size={14} className="text-blue-600" />
            </div>
            <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">Inflow</span>
          </div>
          <p className="text-2xl font-bold text-blue-700 tabular-nums">{formatCurrency(totalTreasuryInflow)}</p>
          <p className="text-xs text-slate-500 mt-1">Treasury Inflow</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="section-title">Payment queue</h2>
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
