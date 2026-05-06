import { useState } from 'react';
import { Bell, Search, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ROLE_LABELS } from '../../utils/helpers';
import type { UserRole } from '../../types';

const ROLE_ACCENT: Record<UserRole, string> = {
  facility_manager: 'bg-teal-500',
  procurement:      'bg-blue-500',
  supervisor:       'bg-purple-500',
  finance:          'bg-emerald-500',
  admin:            'bg-brand-600',
};

const ROLE_AVATAR_GRADIENT: Record<UserRole, string> = {
  facility_manager: 'from-teal-500 to-teal-600',
  procurement:      'from-blue-500 to-blue-600',
  supervisor:       'from-purple-500 to-purple-600',
  finance:          'from-emerald-500 to-emerald-600',
  admin:            'from-brand-500 to-brand-700',
};

export default function TopBar() {
  const { currentUser, requests } = useStore();
  const [searchFocused, setSearchFocused] = useState(false);
  const [showBell, setShowBell] = useState(false);
  if (!currentUser) return null;

  const slaBreached = requests.filter(r =>
    r.slaBreached && !['PAID', 'CLOSED', 'REJECTED'].includes(r.status)
  ).length;

  const role = currentUser.role;
  const pendingCount =
    role === 'procurement' ? requests.filter(r => r.status === 'REQUEST_CREATED').length
    : role === 'supervisor' ? requests.filter(r => ['PO_GENERATED', 'SUPERVISOR_APPROVAL'].includes(r.status)).length
    : role === 'finance'   ? requests.filter(r => ['PAYMENT_PENDING', 'ADMIN_APPROVED'].includes(r.status)).length
    : role === 'admin'     ? requests.filter(r => !['PAID', 'CLOSED', 'REJECTED'].includes(r.status)).length
    : 0;

  const initials = currentUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const accentBar = ROLE_ACCENT[currentUser.role];
  const avatarGrad = ROLE_AVATAR_GRADIENT[currentUser.role];

  const notifications = [
    slaBreached > 0 ? { type: 'critical', msg: `${slaBreached} SLA breach${slaBreached > 1 ? 'es' : ''} active` } : null,
    pendingCount > 0 ? { type: 'info', msg: `${pendingCount} item${pendingCount > 1 ? 's' : ''} pending your action` } : null,
  ].filter(Boolean);

  return (
    <header className="h-14 flex items-center px-6 gap-3 flex-shrink-0 relative border-b"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderColor: 'rgba(226,232,240,0.8)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
      }}>
      {/* Role accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accentBar}`} />

      <div className="flex-1" />

      {/* Search */}
      <div className={`relative hidden md:flex items-center transition-all duration-200 ${searchFocused ? 'w-72' : 'w-56'}`}>
        <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search requests, vendors…"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="w-full pl-8 pr-4 py-1.5 text-sm border border-slate-200 rounded-xl bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all placeholder:text-slate-400"
        />
      </div>

      {/* SLA Breach pill */}
      {slaBreached > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" />
          <span className="text-xs font-bold text-red-600">{slaBreached} SLA Breached</span>
        </div>
      )}

      {/* Bell */}
      <div className="relative">
        <button
          onClick={() => setShowBell(!showBell)}
          className="relative btn-icon"
        >
          <Bell size={15} className="text-slate-500" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 text-white text-[9px] rounded-full flex items-center justify-center font-black shadow-sm">
              {notifications.length}
            </span>
          )}
        </button>

        {showBell && (
          <div className="absolute right-0 top-11 w-72 bg-white rounded-2xl border border-slate-200 shadow-card-hover z-50 overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-800">Notifications</span>
              <button onClick={() => setShowBell(false)} className="text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            </div>
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">All clear — no pending actions</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((n, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${n!.type === 'critical' ? 'bg-red-500' : 'bg-brand-500'}`} />
                    <p className="text-sm text-slate-700">{n!.msg}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-slate-200" />

      {/* User chip */}
      <div className="flex items-center gap-2.5">
        <div className="text-right hidden sm:block">
          <div className="text-xs font-bold text-slate-800 leading-tight">{currentUser.name}</div>
          <div className="text-[10px] text-slate-400 font-medium">{ROLE_LABELS[currentUser.role]}</div>
        </div>
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white`}>
          {initials}
        </div>
      </div>
    </header>
  );
}
