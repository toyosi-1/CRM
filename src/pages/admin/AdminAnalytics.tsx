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
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Administration</p>
            <h1 className="text-2xl font-black text-white tracking-tight">Analytics Center</h1>
            <p className="text-white/60 text-sm mt-1 font-medium">Real-time operational intelligence across all sites</p>
          </div>
          <div className="flex gap-3">
            <div className="text-center px-4 py-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
              <p className="text-2xl font-black text-white animate-count-up">{totalRequests}</p>
              <p className="text-white/60 text-[11px] font-semibold mt-0.5">Requests</p>
            </div>
            <div className="text-center px-4 py-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
              <p className="text-2xl font-black text-emerald-300 animate-count-up">{formatCurrency(totalDisbursed)}</p>
              <p className="text-white/60 text-[11px] font-semibold mt-0.5">Disbursed</p>
            </div>
          </div>
        </div>
        <div className="absolute right-6 top-2 w-36 h-36 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)' }} />
        <div className="absolute right-28 -top-8 w-24 h-24 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)' }} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Activity size={15} className="text-white" />
            </div>
            <span className="trend-neutral">{openRequests} open</span>
          </div>
          <p className="text-3xl font-black text-slate-900 animate-count-up">{totalRequests}</p>
          <p className="text-xs text-slate-400 mt-1 font-semibold">Total Requests</p>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
              <TrendingUp size={15} className="text-white" />
            </div>
            <span className="trend-up">WHT {formatCurrency(totalWHT)}</span>
          </div>
          <p className="text-2xl font-black text-emerald-600 animate-count-up">{formatCurrency(totalDisbursed)}</p>
          <p className="text-xs text-slate-400 mt-1 font-semibold">Total Disbursed</p>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${slaBreached > 0 ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>
              <AlertTriangle size={15} className="text-white" />
            </div>
            {slaBreached > 0 ? <span className="trend-down">Active</span> : <span className="trend-up">All clear</span>}
          </div>
          <p className={`text-3xl font-black animate-count-up ${slaBreached > 0 ? 'text-red-600' : 'text-slate-900'}`}>{slaBreached}</p>
          <p className="text-xs text-slate-400 mt-1 font-semibold">SLA Breaches</p>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Zap size={15} className="text-white" />
            </div>
            <span className="trend-neutral">Overrides</span>
          </div>
          <p className="text-3xl font-black text-purple-600 animate-count-up">{emergencyBypasses}</p>
          <p className="text-xs text-slate-400 mt-1 font-semibold">Emergency Bypasses</p>
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
              <div key={t.dept} className="flex items-center gap-3 p-2.5 rounded-2xl transition-colors"
                style={{ background: i === 0 ? 'rgba(16,185,129,0.07)' : 'transparent' }}>
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${
                  i === 0 ? 'bg-gradient-to-br from-emerald-400 to-teal-500' :
                  i === 1 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                  'bg-gradient-to-br from-red-400 to-rose-500'
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
          { label: 'All Requests', path: '/admin/requests', icon: <Activity size={16} />, gradient: 'from-brand-500 to-purple-600' },
          { label: 'Site Management', path: '/admin/sites', icon: <TrendingUp size={16} />, gradient: 'from-teal-500 to-cyan-600' },
          { label: 'Full Audit Log', path: '/admin/audit', icon: <Clock size={16} />, gradient: 'from-violet-500 to-purple-600' },
          { label: 'Vendor Scores', path: '/admin/vendors', icon: <CheckCircle size={16} />, gradient: 'from-emerald-400 to-teal-500' },
        ].map(a => (
          <button key={a.path} onClick={() => navigate(a.path)}
            className="card-elevated p-4 flex items-center gap-3 cursor-pointer group">
            <div className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${a.gradient} flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform duration-200`}>
              {a.icon}
            </div>
            <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
