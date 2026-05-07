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
      <div className={`relative hidden md:flex items-center transition-all duration-300 ${searchFocused ? 'w-72' : 'w-56'}`}>
        <Search size={14} className={`absolute left-3 pointer-events-none transition-colors ${searchFocused ? 'text-brand-500' : 'text-slate-400'}`} />
        <input
          type="text"
          placeholder="Search requests, vendors…"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="w-full pl-8 pr-4 py-2 text-sm rounded-2xl border-0 focus:outline-none focus:ring-2 focus:ring-brand-400/30 transition-all placeholder:text-slate-400"
          style={{
            background: searchFocused
              ? 'color-mix(in srgb, #4f46e5 10%, #ffffff)'
              : 'color-mix(in srgb, #4f46e5 5%, #f0f2f7)',
          }}
        />
      </div>

      {/* SLA Breach tonal chip */}
      {slaBreached > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full animate-fade-in font-bold text-xs"
          style={{ background: 'rgba(239,68,68,0.12)', color: '#b91c1c' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot flex-shrink-0" />
          {slaBreached} SLA Breach{slaBreached > 1 ? 'es' : ''}
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
          <div className="absolute right-0 top-12 w-76 z-50 overflow-hidden animate-scale-in"
            style={{
              width: '288px',
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(16px)',
              borderRadius: '20px',
              border: '1px solid rgba(226,232,240,0.8)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(79,70,229,0.1)',
            }}>
            <div className="flex items-center justify-between px-4 py-3.5"
              style={{ borderBottom: '1px solid color-mix(in srgb, #4f46e5 8%, #e2e8f0)' }}>
              <span className="text-sm font-black text-slate-800">Notifications</span>
              <button onClick={() => setShowBell(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'rgba(100,116,139,0.1)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(100,116,139,0.2)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(100,116,139,0.1)'}>
                <X size={12} className="text-slate-500" />
              </button>
            </div>
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="w-10 h-10 rounded-2xl mx-auto mb-2 flex items-center justify-center"
                  style={{ background: 'color-mix(in srgb, #4f46e5 8%, #f0f2f7)' }}>
                  <Bell size={16} className="text-brand-500" />
                </div>
                <p className="text-sm font-bold text-slate-600">All clear</p>
                <p className="text-xs text-slate-400 mt-0.5">No pending actions</p>
              </div>
            ) : (
              <div>
                {notifications.map((n, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3.5 transition-colors"
                    style={{ borderBottom: i < notifications.length - 1 ? '1px solid rgba(226,232,240,0.6)' : 'none' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, #4f46e5 4%, transparent)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <div className="mt-0.5 w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: n!.type === 'critical' ? 'rgba(239,68,68,0.12)' : 'rgba(79,70,229,0.1)' }}>
                      <span className={`w-2 h-2 rounded-full ${n!.type === 'critical' ? 'bg-red-500' : 'bg-brand-500'}`} />
                    </div>
                    <p className="text-sm text-slate-700 leading-snug">{n!.msg}</p>
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
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white text-xs font-black shadow-sm ring-2 ring-white`}
          style={{ boxShadow: '0 0 0 2px white, 0 0 0 3px rgba(99,102,241,0.3)' }}>
          {initials}
        </div>
      </div>
    </header>
  );
}
