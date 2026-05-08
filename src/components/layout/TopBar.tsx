import { useState } from 'react';
import { Bell, Search, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ROLE_LABELS } from '../../utils/helpers';
import type { UserRole } from '../../types';


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
  const avatarGrad = ROLE_AVATAR_GRADIENT[currentUser.role];

  const notifications = [
    slaBreached > 0 ? { type: 'critical', msg: `${slaBreached} SLA breach${slaBreached > 1 ? 'es' : ''} active` } : null,
    pendingCount > 0 ? { type: 'info', msg: `${pendingCount} item${pendingCount > 1 ? 's' : ''} pending your action` } : null,
  ].filter(Boolean);

  return (
    <header className="h-12 flex items-center px-5 gap-3 flex-shrink-0 bg-white border-b border-slate-200">

      <div className="flex-1" />

      {/* Search */}
      <div className={`relative hidden md:flex items-center transition-all duration-200 ${searchFocused ? 'w-64' : 'w-48'}`}>
        <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search…"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-400 transition-colors placeholder:text-slate-400"
        />
      </div>

      {/* SLA Breach */}
      {slaBreached > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
          {slaBreached} SLA breach{slaBreached > 1 ? 'es' : ''}
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
          <div className="absolute right-0 top-10 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-800">Notifications</span>
              <button onClick={() => setShowBell(false)} className="text-slate-400 hover:text-slate-600 p-0.5">
                <X size={13} />
              </button>
            </div>
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">No pending actions</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((n, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${n!.type === 'critical' ? 'bg-red-500' : 'bg-indigo-500'}`} />
                    <p className="text-sm text-slate-600">{n!.msg}</p>
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
        <div className={`w-7 h-7 rounded bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white text-xs font-semibold`}>
          {initials}
        </div>
      </div>
    </header>
  );
}
