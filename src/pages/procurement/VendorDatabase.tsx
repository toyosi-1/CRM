import { useState } from 'react';
import { Building2, AlertTriangle, Star } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/helpers';
import type { Vendor } from '../../types';

export default function VendorDatabase() {
  const { vendors } = useStore();
  const [selected, setSelected] = useState<Vendor | null>(null);

  const RISK_COLORS = {
    low: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Vendor Database</h1>
        <p className="page-subtitle">{vendors.length} vendors registered · {vendors.filter(v => v.riskScore === 'high').length} high-risk</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Vendor List */}
        <div className="lg:col-span-2 card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="table-header">Vendor</th>
                <th className="table-header">Category</th>
                <th className="table-header">Jobs</th>
                <th className="table-header">Total Paid</th>
                <th className="table-header">Avg TAT</th>
                <th className="table-header">Risk</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map(v => (
                <tr
                  key={v.id}
                  className={`table-row cursor-pointer ${selected?.id === v.id ? 'bg-brand-50' : ''}`}
                  onClick={() => setSelected(selected?.id === v.id ? null : v)}
                >
                  <td className="table-cell">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <Building2 size={13} className="text-slate-500" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{v.name}</div>
                        <div className="text-xs text-slate-400">{v.type === 'recurring' ? 'Recurring' : 'One-Time'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-sm">{v.category}</td>
                  <td className="table-cell text-sm font-semibold">{v.totalJobsCompleted}</td>
                  <td className="table-cell text-sm font-semibold">{formatCurrency(v.totalAmountPaid)}</td>
                  <td className="table-cell">
                    <span className={`text-sm font-semibold ${v.avgCompletionDays > 7 ? 'text-red-600' : v.avgCompletionDays > 3 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {v.avgCompletionDays}d
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${RISK_COLORS[v.riskScore]}`}>
                      <span className={`badge-dot ${v.riskScore === 'low' ? 'bg-emerald-500' : v.riskScore === 'medium' ? 'bg-amber-500' : 'bg-red-500'}`} />
                      {v.riskScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Vendor Detail Panel */}
        <div>
          {selected ? (
            <div className="card p-5 sticky top-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Building2 size={20} className="text-slate-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selected.name}</h3>
                  <p className="text-xs text-slate-500">{selected.category}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Type</span>
                  <span className="font-semibold">{selected.type === 'recurring' ? 'Recurring' : 'One-Time'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Total Jobs</span>
                  <span className="font-semibold">{selected.totalJobsCompleted}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Total Paid</span>
                  <span className="font-semibold">{formatCurrency(selected.totalAmountPaid)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Avg Completion</span>
                  <span className={`font-semibold ${selected.avgCompletionDays > 7 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {selected.avgCompletionDays} days
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Last Job</span>
                  <span className="font-semibold">{formatDate(selected.lastJobDate)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Risk Score</span>
                  <span className={`badge ${RISK_COLORS[selected.riskScore]}`}>{selected.riskScore}</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Bank Details</p>
                <p className="text-sm font-semibold text-slate-800">{selected.bankName}</p>
                <p className="text-sm text-slate-600">{selected.accountNumber}</p>
                <p className="text-xs text-slate-400">{selected.accountName}</p>
              </div>

              {selected.riskScore === 'high' && (
                <div className="alert-critical">
                  <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-medium">High-risk vendor. Review usage frequency and pricing before approving new POs.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-8 flex flex-col items-center text-center sticky top-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <Star size={20} className="text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-600">Select a vendor</p>
              <p className="text-xs text-slate-400 mt-1">Click any row to view scorecard</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
