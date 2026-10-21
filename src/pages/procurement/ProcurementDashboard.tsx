import { useNavigate } from 'react-router-dom';
import { ClipboardList, FileText, Clock, TrendingUp, Building2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/helpers';

function poTatHours(r: { createdAt: string; purchaseOrder?: { generatedAt: string } }): number {
  if (!r.purchaseOrder) return 0;
  return Math.max(0, (new Date(r.purchaseOrder.generatedAt).getTime() - new Date(r.createdAt).getTime()) / 3600000);
}

export default function ProcurementDashboard() {
  const navigate = useNavigate();
  const { requests, vendors } = useStore();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const pending = requests.filter(r => r.status === 'REQUEST_CREATED' || r.status === 'PROCUREMENT_REVIEW');
  const urgent = pending.filter(r => r.priority === 'critical' || r.priority === 'high');

  const withPO = requests.filter(r => r.purchaseOrder);
  const posThisMonth = withPO.filter(r => new Date(r.purchaseOrder!.generatedAt) >= monthStart);
  const posLastMonth = withPO.filter(r => {
    const d = new Date(r.purchaseOrder!.generatedAt);
    return d >= lastMonthStart && d < monthStart;
  });
  const monthlySpend = posThisMonth.reduce((sum, r) => sum + r.purchaseOrder!.amount, 0);
  const avgTat = posThisMonth.length ? posThisMonth.reduce((sum, r) => sum + poTatHours(r), 0) / posThisMonth.length : 0;
  const avgTatLast = posLastMonth.length ? posLastMonth.reduce((sum, r) => sum + poTatHours(r), 0) / posLastMonth.length : 0;
  const tatDelta = avgTat - avgTatLast;

  const bySite = pending.reduce<Record<string, number>>((acc, r) => {
    const key = r.siteName || 'Unassigned';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const siteRows = Object.entries(bySite).sort((a, b) => b[1] - a[1]);

  const buckets = [
    { label: '< 1 hour', max: 1, color: 'bg-emerald-500' },
    { label: '1–4 hours', max: 4, color: 'bg-slate-700' },
    { label: '4–8 hours', max: 8, color: 'bg-slate-400' },
    { label: '> 8 hours', max: Infinity, color: 'bg-red-500' },
  ].map((bucket, i, arr) => ({
    ...bucket,
    count: posThisMonth.filter(r => {
      const h = poTatHours(r);
      return h >= (i === 0 ? 0 : arr[i - 1].max) && h < bucket.max;
    }).length,
  }));
  const maxBucket = Math.max(1, ...buckets.map(b => b.count));

  const recentPOs = [...withPO]
    .sort((a, b) => new Date(b.purchaseOrder!.generatedAt).getTime() - new Date(a.purchaseOrder!.generatedAt).getTime())
    .slice(0, 8);

  const poStatusLabel = (status: string) =>
    status === 'PO_GENERATED' || status === 'SUPERVISOR_APPROVAL' ? 'At Supervisor'
    : status === 'PAYMENT_PENDING' ? 'At Finance'
    : status === 'PAID' || status === 'CLOSED' ? 'Executed'
    : status === 'REJECTED' ? 'Rejected' : status;
  const poStatusColor = (status: string) =>
    status === 'PO_GENERATED' || status === 'SUPERVISOR_APPROVAL' ? 'bg-amber-100 text-amber-700'
    : status === 'PAYMENT_PENDING' ? 'bg-blue-100 text-blue-700'
    : status === 'PAID' || status === 'CLOSED' ? 'bg-emerald-100 text-emerald-700'
    : status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600';

  const vendorName = (r: (typeof withPO)[number]) =>
    r.vendorName ?? vendors.find(v => v.id === r.purchaseOrder?.vendorId)?.name ?? '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Procurement dashboard</h1>
          <p className="page-subtitle">Review invoices · validate vendors · generate POs</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
            <ClipboardList size={16} className="text-brand-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 animate-count-up">{pending.length}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Pending POs</p>
          {urgent.length > 0 && <p className="text-[11px] text-red-600 font-semibold mt-0.5">{urgent.length} urgent</p>}
        </div>
        <div className="stat-card">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
            <FileText size={16} className="text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 animate-count-up">{posThisMonth.length}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">POs this month</p>
          <p className={`text-[11px] font-semibold mt-0.5 ${posThisMonth.length - posLastMonth.length >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {posThisMonth.length - posLastMonth.length >= 0 ? '+' : ''}{posThisMonth.length - posLastMonth.length} vs last month
          </p>
        </div>
        <div className="stat-card">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
            <TrendingUp size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 animate-count-up">{formatCurrency(monthlySpend)}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Monthly spend</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Across all sites</p>
        </div>
        <div className="stat-card">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 animate-count-up">{avgTat.toFixed(1)}h</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Avg. PO TAT</p>
          {posLastMonth.length > 0 && (
            <p className={`text-[11px] font-semibold mt-0.5 ${tatDelta <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {tatDelta <= 0 ? '−' : '+'}{Math.abs(tatDelta).toFixed(1)}h {tatDelta <= 0 ? 'faster' : 'slower'}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending queue by site */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="section-title">Pending queue by site</h2>
            <p className="card-sub">Requests awaiting PO</p>
          </div>
          {siteRows.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">No requests waiting for a PO.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {siteRows.map(([site, count]) => (
                <button key={site} onClick={() => navigate('/procurement/queue')} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors text-left">
                  <span className="text-sm font-semibold text-slate-800">{site}</span>
                  <span className="badge bg-brand-50 text-brand-700">{count} pending</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PO generation TAT */}
        <div className="card p-5">
          <h2 className="section-title">PO generation TAT</h2>
          <p className="card-sub mb-4">This month · request received → PO issued</p>
          <div className="space-y-3">
            {buckets.map(b => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="w-16 text-[11px] text-slate-500 font-medium text-right">{b.label}</span>
                <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${b.color}`} style={{ width: `${(b.count / maxBucket) * 100}%` }} />
                </div>
                <span className="w-6 text-xs font-bold text-slate-700">{b.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent POs generated */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="section-title">Recent POs generated</h2>
          <button onClick={() => navigate('/procurement/pos')} className="btn-ghost text-xs text-brand-600 font-bold">View queue</button>
        </div>
        {recentPOs.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No purchase orders generated yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="table-header">PO number</th>
                  <th className="table-header">Request</th>
                  <th className="table-header">Site</th>
                  <th className="table-header">Vendor</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Generated</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPOs.map(r => (
                  <tr key={r.id} className="table-row cursor-pointer" onClick={() => navigate(`/request/${r.id}`)}>
                    <td className="table-cell text-xs font-mono font-bold text-brand-600">{r.purchaseOrder!.poNumber}</td>
                    <td className="table-cell text-xs font-mono">{r.requestNumber}</td>
                    <td className="table-cell text-sm">{r.siteName}</td>
                    <td className="table-cell text-sm">{vendorName(r)}</td>
                    <td className="table-cell text-sm font-semibold">{formatCurrency(r.purchaseOrder!.amount)}</td>
                    <td className="table-cell text-xs text-slate-500">{formatDate(r.purchaseOrder!.generatedAt)}</td>
                    <td className="table-cell"><span className={`badge ${poStatusColor(r.status)}`}>{poStatusLabel(r.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top vendors */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Top vendors</h2>
          <button onClick={() => navigate('/procurement/scorecard')} className="btn-ghost text-xs text-brand-600 font-bold">View all</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {vendors.slice(0, 6).map(v => (
            <button key={v.id} onClick={() => navigate('/procurement/scorecard')} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors text-left">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Building2 size={13} className="text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{v.name}</p>
                  <p className="text-xs text-slate-400">{v.totalJobsCompleted} jobs completed</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p className="text-xs font-bold text-slate-700">{formatCurrency(v.totalAmountPaid)}</p>
                <span className={`badge text-xs mt-0.5 ${
                  v.riskScore === 'low' ? 'bg-emerald-100 text-emerald-700' :
                  v.riskScore === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>
                  {v.riskScore} risk
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
