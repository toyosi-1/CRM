import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Activity, TrendingUp, AlertTriangle, Clock, CheckCircle, Zap } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, PRIORITY_LABELS } from '../../utils/helpers';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const { requests, sites, checklists, getBudgetSummaries } = useStore();

  const budgets = getBudgetSummaries();
  const totalRequests = requests.length;
  const openRequests = requests.filter(r => !['PAID', 'CLOSED', 'REJECTED'].includes(r.status)).length;
  const slaBreached = requests.filter(r => r.slaBreached).length;
  const paid = requests.filter(r => r.status === 'PAID');
  const totalDisbursed = paid.reduce((s, r) => s + (r.netPayment ?? r.invoiceAmount ?? 0), 0);
  const totalWHT = paid.reduce((s, r) => s + (r.taxAmount ?? 0), 0);
  const emergencyBypasses = requests.filter(r => r.isEmergencyBypass).length;

  // Request status distribution
  const statusDist = [
    { name: 'New', value: requests.filter(r => r.status === 'REQUEST_CREATED').length },
    { name: 'Procurement', value: requests.filter(r => r.status === 'PROCUREMENT_REVIEW').length },
    { name: 'PO Generated', value: requests.filter(r => r.status === 'PO_GENERATED').length },
    { name: 'Approval', value: requests.filter(r => r.status === 'SUPERVISOR_APPROVAL' || r.status === 'PAYMENT_PENDING').length },
    { name: 'Paid', value: paid.length },
    { name: 'Rejected', value: requests.filter(r => r.status === 'REJECTED').length },
  ].filter(d => d.value > 0);

  // Spend by site
  const spendBySite = sites.map(s => ({
    name: s.name.split(' ')[0],
    spent: s.currentMonthSpend,
    budget: s.monthlyBudget,
  }));

  // TAT performance by department
  const tatData = [
    {
      dept: 'Procurement',
      avgHours: Math.round(
        requests.flatMap(r => r.auditTrail.filter(a => a.userRole === 'procurement' && (a.tatHours ?? 0) > 0).map(a => a.tatHours ?? 0))
          .reduce((s, v, _, arr) => s + v / arr.length, 0) || 0
      ),
    },
    {
      dept: 'Supervisor',
      avgHours: Math.round(
        requests.flatMap(r => r.auditTrail.filter(a => a.userRole === 'supervisor' && (a.tatHours ?? 0) > 0).map(a => a.tatHours ?? 0))
          .reduce((s, v, _, arr) => s + v / arr.length, 0) || 0
      ),
    },
    {
      dept: 'Finance',
      avgHours: Math.round(
        requests.flatMap(r => r.auditTrail.filter(a => a.userRole === 'finance' && (a.tatHours ?? 0) > 0).map(a => a.tatHours ?? 0))
          .reduce((s, v, _, arr) => s + v / arr.length, 0) || 0
      ),
    },
  ];

  // SLA compliance
  const slaStats = (['critical', 'high', 'medium', 'low'] as const).map(priority => {
    const reqs = requests.filter(r => r.priority === priority);
    const onTime = reqs.filter(r => !r.slaBreached).length;
    return {
      priority: PRIORITY_LABELS[priority],
      total: reqs.length,
      onTime,
      compliance: reqs.length > 0 ? Math.round((onTime / reqs.length) * 100) : 100,
    };
  });

  const checklistCompliance = Math.round(
    (checklists.filter(c => c.submittedToAdmin).length / Math.max(checklists.length, 1)) * 100
  );

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Administration</p>
            <h1 className="text-xl font-semibold text-white">Analytics Center</h1>
            <p className="text-slate-400 text-sm mt-0.5">Operational intelligence across all sites</p>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-xl font-bold text-white tabular-nums">{totalRequests}</p>
              <p className="text-slate-500 text-xs mt-0.5">Total Requests</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-right">
              <p className="text-xl font-bold text-emerald-400 tabular-nums">{formatCurrency(totalDisbursed)}</p>
              <p className="text-slate-500 text-xs mt-0.5">Disbursed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 rounded-md bg-indigo-50 flex items-center justify-center">
              <Activity size={14} className="text-indigo-600" />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">{openRequests} open</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{totalRequests}</p>
          <p className="text-xs text-slate-500 mt-1">Total Requests</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 rounded-md bg-emerald-50 flex items-center justify-center">
              <TrendingUp size={14} className="text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">WHT {formatCurrency(totalWHT)}</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums">{formatCurrency(totalDisbursed)}</p>
          <p className="text-xs text-slate-500 mt-1">Total Disbursed</p>
        </div>
        <div className={`border rounded-lg p-4 ${slaBreached > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${slaBreached > 0 ? 'bg-red-100' : 'bg-slate-50'}`}>
              <AlertTriangle size={14} className={slaBreached > 0 ? 'text-red-600' : 'text-slate-400'} />
            </div>
            {slaBreached > 0
              ? <span className="text-xs font-medium text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded">Active</span>
              : <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">All clear</span>}
          </div>
          <p className={`text-2xl font-bold tabular-nums ${slaBreached > 0 ? 'text-red-700' : 'text-slate-900'}`}>{slaBreached}</p>
          <p className="text-xs text-slate-500 mt-1">SLA Breaches</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 rounded-md bg-violet-50 flex items-center justify-center">
              <Zap size={14} className="text-violet-600" />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">Overrides</span>
          </div>
          <p className="text-2xl font-bold text-violet-700 tabular-nums">{emergencyBypasses}</p>
          <p className="text-xs text-slate-500 mt-1">Emergency Bypasses</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Spend vs Budget */}
        <div className="card-elevated p-5">
          <h2 className="section-title mb-4">Spend vs Budget by Site</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={spendBySite}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₦${(v / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v: unknown) => formatCurrency(Number(v ?? 0))} />
              <Bar dataKey="budget" name="Budget" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="spent" name="Spent" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Request Status Distribution */}
        <div className="card-elevated p-5">
          <h2 className="section-title mb-4">Request Pipeline Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusDist} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {statusDist.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* TAT Leaderboard */}
        <div className="card-elevated p-5">
          <h2 className="section-title mb-4">Department TAT Performance</h2>
          <div className="space-y-2.5">
            {tatData.sort((a, b) => a.avgHours - b.avgHours).map((t, i) => (
              <div key={t.dept} className={`flex items-center gap-3 p-2.5 rounded-md transition-colors ${i === 0 ? 'bg-emerald-50' : ''}`}>
                <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? 'bg-emerald-100 text-emerald-700' :
                  i === 1 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {i + 1}
                </div>
                <span className="text-sm font-bold text-slate-700 flex-1">{t.dept}</span>
                <span className={`badge-tonal-${t.avgHours < 24 ? 'success' : t.avgHours < 72 ? 'warning' : 'danger'}`}>
                  {t.avgHours}h
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-5">
          <h2 className="section-title mb-4">SLA Compliance by Priority</h2>
          <div className="space-y-3">
            {slaStats.map(s => (
              <div key={s.priority}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-600">{s.priority}</span>
                  <span className={`text-xs font-extrabold ${s.compliance >= 80 ? 'text-emerald-600' : s.compliance >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                    {s.compliance}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${
                      s.compliance >= 80 ? 'from-emerald-400 to-emerald-500' :
                      s.compliance >= 60 ? 'from-amber-400 to-orange-400' : 'from-red-400 to-red-500'
                    }`}
                    style={{ width: `${s.compliance}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-5">
          <h2 className="section-title mb-4">Operational Compliance</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-600">Checklist Compliance</span>
                <span className={`text-xs font-extrabold ${checklistCompliance >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{checklistCompliance}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700" style={{ width: `${checklistCompliance}%` }} />
              </div>
            </div>
            {budgets.map(b => (
              <div key={b.siteId}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-500 truncate max-w-32">{b.siteName.split(' ')[0]}</span>
                  <span className={`text-xs font-extrabold ${b.utilizationPct >= 90 ? 'text-red-600' : b.utilizationPct >= 75 ? 'text-amber-600' : 'text-emerald-600'}`}>{b.utilizationPct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${
                      b.utilizationPct >= 90 ? 'from-red-400 to-red-500' :
                      b.utilizationPct >= 75 ? 'from-amber-400 to-orange-400' : 'from-emerald-400 to-emerald-500'
                    }`}
                    style={{ width: `${Math.min(b.utilizationPct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'All Requests', path: '/admin/requests', icon: <Activity size={14} />, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Site Management', path: '/admin/sites', icon: <TrendingUp size={14} />, color: 'text-teal-600 bg-teal-50' },
          { label: 'Full Audit Log', path: '/admin/audit', icon: <Clock size={14} />, color: 'text-violet-600 bg-violet-50' },
          { label: 'Vendor Scores', path: '/admin/vendors', icon: <CheckCircle size={14} />, color: 'text-emerald-600 bg-emerald-50' },
        ].map(a => (
          <button key={a.path} onClick={() => navigate(a.path)}
            className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3 hover:border-slate-300 hover:shadow-sm transition-all duration-150 text-left">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${a.color}`}>
              {a.icon}
            </div>
            <span className="text-sm font-medium text-slate-700">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
