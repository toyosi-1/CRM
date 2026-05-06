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
      <div className="dash-header" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)' }}>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white tracking-tight">Analytics Center</h1>
          <p className="text-white/70 text-sm mt-1">Real-time operational intelligence across all sites</p>
        </div>
        <div className="absolute right-10 top-2 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-24 -top-4 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
              <Activity size={16} className="text-brand-600" />
            </div>
            <span className="trend-neutral">{openRequests} open</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 animate-count-up">{totalRequests}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Total Requests</p>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <span className="trend-up">WHT {formatCurrency(totalWHT)}</span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 animate-count-up">{formatCurrency(totalDisbursed)}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Total Disbursed</p>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-500" />
            </div>
            {slaBreached > 0 ? <span className="trend-down">Active</span> : <span className="trend-up">All clear</span>}
          </div>
          <p className="text-3xl font-extrabold text-red-600 animate-count-up">{slaBreached}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">SLA Breaches</p>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <Zap size={16} className="text-purple-600" />
            </div>
            <span className="trend-neutral">Overrides</span>
          </div>
          <p className="text-3xl font-extrabold text-purple-600 animate-count-up">{emergencyBypasses}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Emergency Bypasses</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Spend vs Budget */}
        <div className="card p-5">
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
        <div className="card p-5">
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
        <div className="card p-5">
          <h2 className="section-title mb-4">Department TAT Performance</h2>
          <div className="space-y-3">
            {tatData.sort((a, b) => a.avgHours - b.avgHours).map((t, i) => (
              <div key={t.dept} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-amber-500' : 'bg-red-500'}`}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-700">{t.dept}</span>
                </div>
                <span className={`text-sm font-bold ${t.avgHours < 24 ? 'text-emerald-600' : t.avgHours < 72 ? 'text-amber-600' : 'text-red-600'}`}>
                  {t.avgHours}h avg
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
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

        <div className="card p-5">
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
          { label: 'All Requests', path: '/admin/requests', icon: <Activity size={16} />, color: 'bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white' },
          { label: 'Site Management', path: '/admin/sites', icon: <TrendingUp size={16} />, color: 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white' },
          { label: 'Full Audit Log', path: '/admin/audit', icon: <Clock size={16} />, color: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white' },
          { label: 'Vendor Scores', path: '/admin/vendors', icon: <CheckCircle size={16} />, color: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' },
        ].map(a => (
          <button key={a.path} onClick={() => navigate(a.path)}
            className="card p-4 flex items-center gap-3 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${a.color}`}>
              {a.icon}
            </div>
            <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
