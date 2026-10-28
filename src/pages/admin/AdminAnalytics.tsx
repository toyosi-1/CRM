import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import {
  Activity, AlertTriangle, Building2, Clock, DollarSign, FileText,
  Users, Zap, ShieldCheck, Timer,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PRIORITY_LABELS, formatCurrency } from '../../utils/helpers';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function hoursBetween(a: string, b: string) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 3600000;
}

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const { currentUser, requests, checklists, sites, users, facilityVendorSLAs, pettyCash, getSiteMonthSpend } = useStore();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = requests.filter(r => new Date(r.createdAt) >= monthStart);

  const paid = requests.filter(r => r.status === 'PAID');
  const totalSpend = paid.reduce((s, r) => s + (r.netPayment ?? r.invoiceAmount ?? 0), 0);
  const slaBreached = requests.filter(r => r.slaBreached).length;
  const emergencyBypasses = requests.filter(r => r.isEmergencyBypass).length;

  // Average full cycle time (created → paid), in hours
  const completedCycle = paid.filter(r => r.paidAt);
  const avgCycleHrs = completedCycle.length
    ? completedCycle.reduce((s, r) => s + hoursBetween(r.createdAt, r.paidAt!), 0) / completedCycle.length
    : 0;
  const avgCycleLabel = avgCycleHrs >= 24 ? `${(avgCycleHrs / 24).toFixed(1)}d` : `${avgCycleHrs.toFixed(1)}h`;

  // SLAs expiring within 90 days
  const in90 = new Date(now.getTime() + 90 * 86400000);
  const slasExpiring = facilityVendorSLAs.filter(s => s.expiryDate && !s.suspended && new Date(s.expiryDate) <= in90);

  const statusDist = [
    { name: 'New', value: requests.filter(r => r.status === 'REQUEST_CREATED').length },
    { name: 'Procurement', value: requests.filter(r => r.status === 'PROCUREMENT_REVIEW').length },
    { name: 'PO Generated', value: requests.filter(r => r.status === 'PO_GENERATED').length },
    { name: 'Approval', value: requests.filter(r => r.status === 'SUPERVISOR_APPROVAL' || r.status === 'PAYMENT_PENDING' || r.status === 'ADMIN_APPROVED').length },
    { name: 'Paid', value: paid.length },
    { name: 'Rejected', value: requests.filter(r => r.status === 'REJECTED').length },
  ].filter(d => d.value > 0);

  const tatData = (['procurement', 'supervisor', 'finance'] as const).map(dept => ({
    dept: dept[0].toUpperCase() + dept.slice(1),
    avgHours: Math.round(
      requests.flatMap(r => r.auditTrail.filter(a => a.userRole === dept && (a.tatHours ?? 0) > 0).map(a => a.tatHours ?? 0))
        .reduce((s, v, _, arr) => arr.length ? s + v / arr.length : 0, 0)
    ),
  }));

  const slaStats = (['critical', 'high', 'medium', 'low'] as const).map(priority => {
    const reqs = requests.filter(r => r.priority === priority);
    const onTime = reqs.filter(r => !r.slaBreached).length;
    return { priority: PRIORITY_LABELS[priority], compliance: reqs.length > 0 ? Math.round((onTime / reqs.length) * 100) : 100 };
  });

  const checklistCompliance = Math.round(
    (checklists.filter(c => c.submittedToAdmin).length / Math.max(checklists.length, 1)) * 100
  );

  // Site health map — month spend vs monthly budget, remaining balance + live petty cash float
  const siteHealth = sites.map(s => {
    const spent = getSiteMonthSpend(s.id);
    const pct = s.monthlyBudget > 0 ? Math.round((spent / s.monthlyBudget) * 100) : 0;
    const health = pct >= 90 ? 'overspent' : pct >= 75 ? 'watch' : 'healthy';
    const balance = s.monthlyBudget - spent;
    const float = pettyCash
      .filter(p => p.siteId === s.id && p.status === 'approved')
      .reduce((sum, p) => sum + (p.type === 'top_up' ? p.amount : -p.amount), 0);
    return { ...s, spent, pct, health, balance, float };
  });

  const statCards = [
    { label: 'Active sites', value: sites.length, icon: <Building2 size={14} className="text-indigo-600" />, chip: `${sites.filter(s => s.status === 'healthy').length} healthy` },
    { label: 'Staff', value: users.filter(u => u.active !== false).length, icon: <Users size={14} className="text-teal-600" />, chip: 'active accounts' },
    { label: `Requests ${now.toLocaleDateString('en-NG', { month: 'short' })}`, value: thisMonth.length, icon: <Activity size={14} className="text-brand-600" />, chip: `${requests.length} total` },
    { label: 'Total spend', value: formatCurrency(totalSpend), icon: <DollarSign size={14} className="text-emerald-600" />, chip: `${paid.length} paid` },
    { label: 'Avg cycle TAT', value: completedCycle.length ? avgCycleLabel : '—', icon: <Timer size={14} className="text-blue-600" />, chip: 'request → paid' },
    { label: 'SLAs expiring', value: slasExpiring.length, icon: <ShieldCheck size={14} className={slasExpiring.length ? 'text-amber-600' : 'text-emerald-600'} />, chip: '< 90 days' },
  ];

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Administration</p>
            <h1 className="text-2xl font-black text-white tracking-tight">Executive dashboard</h1>
            <p className="text-white/60 text-sm mt-1">{currentUser?.name} · Managing Director — operational intelligence across all sites</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-white tabular-nums">{requests.length}</p>
            <p className="text-white/60 text-xs mt-0.5">Total Requests</p>
          </div>
        </div>
      </div>

      {/* Executive stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-md bg-slate-50 flex items-center justify-center">{s.icon}</div>
            </div>
            <p className="text-xl font-bold text-slate-900 tabular-nums truncate">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-slate-400 mt-1">{s.chip}</p>
          </div>
        ))}
      </div>

      {/* Alert chips row */}
      {(slaBreached > 0 || emergencyBypasses > 0) && (
        <div className="flex flex-wrap gap-2">
          {slaBreached > 0 && <span className="badge bg-red-100 text-red-700"><AlertTriangle size={11} /> {slaBreached} SLA breach{slaBreached === 1 ? '' : 'es'} active</span>}
          {emergencyBypasses > 0 && <span className="badge bg-violet-100 text-violet-700"><Zap size={11} /> {emergencyBypasses} emergency bypass{emergencyBypasses === 1 ? '' : 'es'} used</span>}
        </div>
      )}

      {/* Main intelligence grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Site health map */}
        <div className="card-elevated p-5">
          <h2 className="section-title mb-4">Site health map</h2>
          <div className="space-y-3">
            {siteHealth.map(s => (
              <div key={s.id} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.health === 'healthy' ? 'bg-emerald-500' : s.health === 'watch' ? 'bg-amber-400' : 'bg-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700 truncate">{s.name}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.health === 'healthy' ? 'bg-emerald-50 text-emerald-700' : s.health === 'watch' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                      {s.health === 'healthy' ? 'Healthy' : s.health === 'watch' ? 'Watch' : 'Overspent'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(s.spent)} / {formatCurrency(s.monthlyBudget)} · {s.pct}%</p>
                  <p className="text-xs mt-0.5">
                    <span className={`font-semibold ${s.balance < 0 ? 'text-red-600' : 'text-emerald-700'}`}>Balance {formatCurrency(s.balance)}</span>
                    {s.pettyCashEnabled && <span className="text-slate-400"> · Float {formatCurrency(s.float)}</span>}
                  </p>
                </div>
              </div>
            ))}
            {siteHealth.length === 0 && <p className="text-sm text-slate-400">No sites configured</p>}
          </div>
        </div>

        {/* Request status donut */}
        <div className="card-elevated p-5">
          <h2 className="section-title mb-2">Request status</h2>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={statusDist} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" label={({ name, value }) => `${name} ${value}`} labelLine={false} fontSize={10}>
                {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* TAT leaderboard */}
        <div className="card-elevated p-5">
          <h2 className="section-title mb-4">TAT leaderboard</h2>
          <div className="space-y-2.5">
            {tatData.sort((a, b) => a.avgHours - b.avgHours).map((t, i) => (
              <div key={t.dept} className={`flex items-center gap-3 p-2.5 rounded-md ${i === 0 ? 'bg-emerald-50' : ''}`}>
                <span className="text-sm font-bold text-slate-700 flex-1">{t.dept}</span>
                <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full rounded-full ${i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min((t.avgHours / 72) * 100, 100)}%` }} />
                </div>
                <span className={`badge-tonal-${t.avgHours < 24 ? 'success' : t.avgHours < 72 ? 'warning' : 'danger'}`}>{t.avgHours}h</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Compliance row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card-elevated p-5">
          <h2 className="section-title mb-4">SLA compliance by priority</h2>
          <div className="space-y-3">
            {slaStats.map(s => (
              <div key={s.priority}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-600">{s.priority}</span>
                  <span className={`text-xs font-extrabold ${s.compliance >= 80 ? 'text-emerald-600' : s.compliance >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{s.compliance}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${s.compliance >= 80 ? 'from-emerald-400 to-emerald-500' : s.compliance >= 60 ? 'from-amber-400 to-orange-400' : 'from-red-400 to-red-500'}`} style={{ width: `${s.compliance}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card-elevated p-5">
          <h2 className="section-title mb-4">Operational compliance</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-600">Checklist submission rate</span>
                <span className={`text-xs font-extrabold ${checklistCompliance >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{checklistCompliance}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700" style={{ width: `${checklistCompliance}%` }} />
              </div>
            </div>
            <p className="text-xs text-slate-400">{checklists.filter(c => c.submittedToAdmin).length} of {checklists.length} checklists submitted</p>
          </div>
        </div>
      </div>

      {/* Quick navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'All requests', path: '/admin/requests', icon: <FileText size={14} />, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Facilities', path: '/admin/facilities', icon: <Building2 size={14} />, color: 'text-teal-600 bg-teal-50' },
          { label: 'Staff access', path: '/admin/users', icon: <Users size={14} />, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Audit log', path: '/admin/audit', icon: <Clock size={14} />, color: 'text-violet-600 bg-violet-50' },
        ].map(a => (
          <button key={a.path} onClick={() => navigate(a.path)}
            className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3 hover:border-slate-300 hover:shadow-sm transition-all duration-150 text-left">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${a.color}`}>{a.icon}</div>
            <span className="text-sm font-medium text-slate-700">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

