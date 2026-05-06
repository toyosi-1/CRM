import { useState } from 'react';
import { FileText, Download, TrendingUp, Clock, CheckSquare, Activity, DollarSign } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, PRIORITY_LABELS } from '../../utils/helpers';

export default function AdminReports() {
  const { requests, checklists, treasury, getBudgetSummaries } = useStore();
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const budgets = getBudgetSummaries();
  const paid = requests.filter(r => r.status === 'PAID');
  const totalDisbursed = paid.reduce((s, r) => s + (r.netPayment ?? r.invoiceAmount ?? 0), 0);
  const totalWHT = paid.reduce((s, r) => s + (r.taxAmount ?? 0), 0);
  const slaBreached = requests.filter(r => r.slaBreached).length;
  const checklistCompliance = Math.round(
    (checklists.filter(c => c.submittedToAdmin).length / Math.max(checklists.length, 1)) * 100
  );
  const treasuryInflow = treasury.filter(t => t.type === 'inflow').reduce((s, t) => s + t.amount, 0);

  const tatByDept = [
    {
      dept: 'Procurement',
      avgHours: Math.round(
        requests.flatMap(r => r.auditTrail.filter(a => a.userRole === 'procurement' && (a.tatHours ?? 0) > 0).map(a => a.tatHours ?? 0))
          .reduce((s, v, _, arr) => arr.length ? s + v / arr.length : 0, 0)
      ),
    },
    {
      dept: 'Supervisor',
      avgHours: Math.round(
        requests.flatMap(r => r.auditTrail.filter(a => a.userRole === 'supervisor' && (a.tatHours ?? 0) > 0).map(a => a.tatHours ?? 0))
          .reduce((s, v, _, arr) => arr.length ? s + v / arr.length : 0, 0)
      ),
    },
    {
      dept: 'Finance',
      avgHours: Math.round(
        requests.flatMap(r => r.auditTrail.filter(a => a.userRole === 'finance' && (a.tatHours ?? 0) > 0).map(a => a.tatHours ?? 0))
          .reduce((s, v, _, arr) => arr.length ? s + v / arr.length : 0, 0)
      ),
    },
  ];

  const priorityBreakdown = (['critical', 'high', 'medium', 'low'] as const).map(p => ({
    priority: p,
    label: PRIORITY_LABELS[p],
    count: requests.filter(r => r.priority === p).length,
    breached: requests.filter(r => r.priority === p && r.slaBreached).length,
  }));

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Report Factory</h1>
          <p className="page-subtitle">Monthly Facility Operations Report · {new Date().toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn-primary"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download size={16} />
              {generated ? 'Re-generate PDF' : 'Generate PDF Report'}
            </>
          )}
        </button>
      </div>

      {generated && (
        <div className="alert-success">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <FileText size={15} className="text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-800">Report Generated Successfully</p>
            <p className="text-xs text-emerald-600 mt-0.5">FacilityOps_Monthly_Report_{new Date().toISOString().slice(0, 7)}.pdf</p>
          </div>
          <button className="btn-success text-xs py-1.5">
            <Download size={12} /> Download
          </button>
        </div>
      )}

      {/* Report Preview */}
      <div className="space-y-5">

        {/* Section 1: Executive Summary */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center text-white text-xs font-bold">1</div>
            <h2 className="section-title">Executive Summary</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Requests', value: requests.length, icon: <Activity size={14} className="text-brand-500" /> },
              { label: 'Total Disbursed', value: formatCurrency(totalDisbursed), icon: <DollarSign size={14} className="text-emerald-500" /> },
              { label: 'WHT Withheld', value: formatCurrency(totalWHT), icon: <TrendingUp size={14} className="text-red-500" /> },
              { label: 'Treasury Inflow', value: formatCurrency(treasuryInflow), icon: <TrendingUp size={14} className="text-blue-500" /> },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{s.label}</span>
                  {s.icon}
                </div>
                <p className="text-xl font-bold text-slate-800">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Spend vs Budget */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center text-white text-xs font-bold">2</div>
            <h2 className="section-title">Spend vs Budget</h2>
          </div>
          <div className="space-y-4">
            {budgets.map(b => (
              <div key={b.siteId} className="flex items-center gap-4">
                <div className="w-44 flex-shrink-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{b.siteName}</p>
                  <p className="text-xs text-slate-400">{formatCurrency(b.spent)} / {formatCurrency(b.monthlyBudget)}</p>
                </div>
                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full bg-gradient-to-r transition-all duration-700 ${
                      b.utilizationPct >= 90 ? 'from-red-400 to-red-500' :
                      b.utilizationPct >= 75 ? 'from-amber-400 to-orange-400' : 'from-emerald-400 to-emerald-500'
                    }`}
                    style={{ width: `${Math.min(b.utilizationPct, 100)}%` }}
                  />
                </div>
                <span className={`text-sm font-bold w-10 text-right ${b.utilizationPct >= 90 ? 'text-red-600' : b.utilizationPct >= 75 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {b.utilizationPct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Incident Log */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center text-white text-xs font-bold">3</div>
            <h2 className="section-title">Incident Log by Priority</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {priorityBreakdown.map(p => (
              <div key={p.priority} className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{p.label}</p>
                <p className="text-3xl font-extrabold text-slate-800">{p.count}</p>
                <p className="text-xs text-red-500 mt-1">{p.breached} SLA breached</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Checklist Compliance */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center text-white text-xs font-bold">4</div>
            <h2 className="section-title">Checklist Compliance</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Checklists', value: checklists.length },
              { label: 'Submitted', value: checklists.filter(c => c.submittedToAdmin).length },
              { label: 'Compliance Rate', value: `${checklistCompliance}%` },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">{s.label}</p>
                <p className={`text-2xl font-bold ${typeof s.value === 'string' && s.value.endsWith('%') ? (checklistCompliance >= 80 ? 'text-emerald-600' : 'text-amber-600') : 'text-slate-800'}`}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {checklists.map(cl => (
              <div key={cl.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2">
                  <CheckSquare size={13} className={cl.submittedToAdmin ? 'text-emerald-500' : 'text-slate-300'} />
                  <span className="text-sm text-slate-700">{cl.title}</span>
                </div>
                <span className={`badge ${cl.submittedToAdmin ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {cl.submittedToAdmin ? 'Submitted' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Department TAT */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center text-white text-xs font-bold">5</div>
            <h2 className="section-title">Department TAT Performance</h2>
          </div>
          <div className="space-y-4">
            {tatByDept.sort((a, b) => a.avgHours - b.avgHours).map((dept, i) => (
              <div key={dept.dept} className="flex items-center gap-4">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-amber-500' : 'bg-red-500'}`}>
                  {i + 1}
                </div>
                <div className="w-32 flex-shrink-0">
                  <p className="text-sm font-semibold text-slate-700">{dept.dept}</p>
                </div>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${dept.avgHours < 24 ? 'bg-emerald-500' : dept.avgHours < 72 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min((dept.avgHours / 120) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex items-center gap-1 w-20 justify-end">
                  <Clock size={12} className="text-slate-400" />
                  <span className={`text-sm font-bold ${dept.avgHours < 24 ? 'text-emerald-600' : dept.avgHours < 72 ? 'text-amber-600' : 'text-red-600'}`}>
                    {dept.avgHours}h avg
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 6: SLA Compliance */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center text-white text-xs font-bold">6</div>
            <h2 className="section-title">SLA Compliance Summary</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Requests', value: requests.length },
              { label: 'SLA Breaches', value: slaBreached, danger: true },
              {
                label: 'Compliance Rate',
                value: `${Math.round(((requests.length - slaBreached) / Math.max(requests.length, 1)) * 100)}%`,
              },
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-4 text-center ${s.danger ? 'bg-red-50' : 'bg-slate-50'}`}>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">{s.label}</p>
                <p className={`text-2xl font-bold ${s.danger ? 'text-red-600' : 'text-slate-800'}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
