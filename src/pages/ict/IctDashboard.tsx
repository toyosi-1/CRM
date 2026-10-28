import { useNavigate } from 'react-router-dom';
import { Building2, LifeBuoy, UserCheck, Users, UserPlus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ROLE_LABELS, formatDateTime } from '../../utils/helpers';
import type { UserRole } from '../../types';

const STAFF_ROLES: UserRole[] = ['facility_manager', 'procurement', 'supervisor', 'finance', 'technician', 'admin', 'ict_admin'];

export default function IctDashboard() {
  const navigate = useNavigate();
  const { currentUser, users, sites, supportTickets } = useStore();

  const activeStaff = users.filter(u => u.active !== false);
  const openTickets = supportTickets.filter(t => t.status !== 'closed');
  const pendingOnboarding = users.filter(u => u.active === false);

  const stats = [
    { label: 'Active staff', value: activeStaff.length, icon: <UserCheck size={15} /> },
    { label: 'Facilities', value: sites.length, icon: <Building2 size={15} /> },
    { label: 'Open support tickets', value: openTickets.length, icon: <LifeBuoy size={15} />, onClick: () => navigate('/support') },
    { label: 'Inactive accounts', value: pendingOnboarding.length, icon: <Users size={15} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="dash-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">ICT Administration</p>
            <h1 className="text-2xl font-black text-white tracking-tight">System overview</h1>
            <p className="text-white/60 text-sm mt-1">{currentUser?.name} · ICT Administrator — staff accounts, facilities, and technical queue.</p>
          </div>
          <button onClick={() => navigate('/ict/users')} className="btn-white-glass"><UserPlus size={14} />Onboard staff</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <button key={s.label} onClick={s.onClick} className="card p-4 text-left hover:border-brand-300 transition-colors">
            <div className="flex items-center gap-2 text-slate-400 mb-1">{s.icon}<span className="text-[11px] font-bold uppercase tracking-wide">{s.label}</span></div>
            <p className="text-2xl font-black text-slate-900">{s.value}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h2 className="font-black text-slate-900 mb-4">Staff by role</h2>
          <div className="space-y-2">
            {STAFF_ROLES.map(role => {
              const count = activeStaff.filter(u => u.role === role).length;
              return (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{ROLE_LABELS[role]}</span>
                  <span className="badge b-neu">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-black text-slate-900 mb-4">Open support tickets</h2>
          {openTickets.length === 0 ? (
            <p className="text-sm text-slate-400">No open tickets — the queue is clear.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {openTickets.slice(0, 6).map(t => (
                <button key={t.id} onClick={() => navigate('/support')} className="w-full text-left py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
                  <p className="text-sm font-semibold text-slate-700 truncate">{t.subject}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{t.status} · {formatDateTime(t.createdAt)}</p>
                </button>
              ))}
              {openTickets.length > 6 && <p className="text-xs text-slate-400 pt-2">+{openTickets.length - 6} more in Support</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
