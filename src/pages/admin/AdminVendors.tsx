import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Award } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/helpers';

export default function AdminVendors() {
  const { vendors } = useStore();

  const sorted = [...vendors].sort((a, b) => b.totalAmountPaid - a.totalAmountPaid);

  const spendData = sorted.map(v => ({
    name: v.name.split(' ')[0],
    spent: v.totalAmountPaid,
    jobs: v.totalJobsCompleted,
  }));

  const RISK_CONFIG = {
    low: { color: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', label: 'Low Risk' },
    medium: { color: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500', label: 'Medium Risk' },
    high: { color: 'bg-red-100 text-red-700', bar: 'bg-red-500', label: 'High Risk — Review Required' },
  };

  const highRisk = vendors.filter(v => v.riskScore === 'high');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Vendor Scorecards</h1>
        <p className="page-subtitle">Automated vendor scorecards · spending, TAT, and risk indicators</p>
      </div>

      {/* Risk Alerts */}
      {highRisk.length > 0 && (
        <div className="alert-critical">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={15} className="text-red-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-red-800">High-Risk Vendor Alert</p>
            <p className="text-sm text-red-700 mt-0.5">
              {highRisk.map(v => v.name).join(', ')} — flagged for unusual cost patterns or long completion times. Review before issuing new POs.
              </p>
            </div>
        </div>
      )}

      {/* Spend Chart */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Vendor Spend Ranking</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={spendData} layout="vertical">
            <XAxis type="number" tickFormatter={v => `₦${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
            <Tooltip formatter={(v: unknown) => formatCurrency(Number(v ?? 0))} />
            <Bar dataKey="spent" name="Total Paid" fill="#6366f1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Vendor Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map((vendor, idx) => {
          const riskCfg = RISK_CONFIG[vendor.riskScore];
          const avgJobValue = vendor.totalJobsCompleted > 0
            ? Math.round(vendor.totalAmountPaid / vendor.totalJobsCompleted)
            : 0;

          return (
            <div key={vendor.id} className={`card p-5 border-l-4 ${vendor.riskScore === 'high' ? 'border-l-red-500' : vendor.riskScore === 'medium' ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    {idx === 0 ? <Award size={16} className="text-amber-500" /> : <span className="text-sm font-bold text-slate-500">#{idx + 1}</span>}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{vendor.name}</h3>
                    <p className="text-xs text-slate-500">{vendor.category} · {vendor.type === 'recurring' ? 'Recurring' : 'One-Time'}</p>
                  </div>
                </div>
                <span className={`badge ${riskCfg.color}`}>{riskCfg.label}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-lg font-bold text-slate-800">{vendor.totalJobsCompleted}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Total Jobs</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-sm font-bold text-slate-800">{formatCurrency(avgJobValue)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Avg Job Value</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className={`text-lg font-bold ${vendor.avgCompletionDays > 7 ? 'text-red-600' : vendor.avgCompletionDays > 3 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {vendor.avgCompletionDays}d
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Avg TAT</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Total paid: <strong className="text-slate-700">{formatCurrency(vendor.totalAmountPaid)}</strong></span>
                <span>Last job: <strong className="text-slate-700">{formatDate(vendor.lastJobDate)}</strong></span>
              </div>

              {vendor.riskScore === 'high' && (
                <div className="mt-3 p-2 bg-red-50 rounded-lg flex items-center gap-2">
                  <AlertTriangle size={12} className="text-red-500" />
                  <span className="text-xs text-red-700 font-medium">Flag: Unusually high costs or slow completion times</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
