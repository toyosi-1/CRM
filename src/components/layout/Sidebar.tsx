import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { LogOut, KeyRound, ChevronDown } from 'lucide-react';
import type { UserRole } from '../../types';
import { ROLE_LABELS } from '../../utils/helpers';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../lib/AuthContext';
import { NAV_MAP } from './navConfig';
import { instanceId, isDueToday } from '../../lib/checklists';

const ROLE_COLOR: Record<UserRole, string> = {
  facility_manager: '#7a8c3c',
  procurement:      '#5a7a3c',
  supervisor:       '#4a6a2c',
  finance:          '#6b7c34',
  admin:            '#8a9c44',
  ict_admin:        '#2a7a8c',
  technician:       '#5c8f1a',
};

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentUser, logout: clearSession, sites, requests, checklists, checklistTemplates, ppmSchedules, activeSiteId } = useStore();
  const { supabaseUser, logout } = useAuth();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  if (!currentUser) return null;

  const sections = NAV_MAP[currentUser.role];
  const initials = currentUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const siteName = sites.find(s => s.id === currentUser.siteId)?.name;
  const roleColor = ROLE_COLOR[currentUser.role];

  // Technician live nav badges (open tasks / technical checks / PPM assigned)
  const navBadges: Record<string, number> = {};
  if (currentUser.role === 'technician') {
    const siteId = activeSiteId ?? currentUser.siteId;
    const dueIds = new Set(checklistTemplates.filter(t => t.siteId === siteId && isDueToday(t)).map(instanceId));
    const pendingChecks = checklists
      .filter(c => c.siteId === siteId && dueIds.has(c.id) && !c.submittedToAdmin)
      .reduce((n, c) => n + c.items.filter(i => (i.role === 'tech' || i.role === 'both') && !i.checked).length, 0);
    const openWorkOrders = requests.filter(r => r.assignedTo === currentUser.id && !['PAID', 'CLOSED', 'REJECTED'].includes(r.status)).length;
    const myPpm = ppmSchedules.filter(s => s.assignedTo === currentUser.id && s.status !== 'completed').length;
    navBadges['/technician/tasks'] = openWorkOrders + myPpm;
    navBadges['/technician/checklists'] = pendingChecks;
    navBadges['/technician/ppm'] = myPpm;
  }
  const handleLogout = async () => {
    if (supabaseUser) await logout();
    else clearSession();
  };

  return (
    <aside className={`app-sidebar ${open ? 'open' : ''}`}>

      {/* Logo */}
      <div className="px-4 py-4 border-b" style={{ borderColor: '#2d3318' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 p-0.5">
            <img src="/favicon-64.png" alt="" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-white font-semibold text-[11px] leading-tight">Propel Works Management Systems</div>
            <div className="text-[10px] tracking-wide" style={{ color: '#a8cf45' }}>Propel Properties &amp; Facilities</div>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="px-3 py-3 border-b" style={{ borderColor: '#2d3318' }}>
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
            style={{ background: roleColor }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-slate-200 text-xs font-medium truncate">{currentUser.name}</div>
            <div className="text-slate-500 text-[10px] truncate">{ROLE_LABELS[currentUser.role]}{siteName ? ` · ${siteName}` : ''}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        {sections.map((section, si) => (
          <div key={si}>
            {section.section && (
              <p className="sidebar-section-label">{section.section}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => item.children ? (() => {
                const isOpen = collapsed[item.path] === false ? false : true;
                return (
                  <div key={item.path}>
                    <button
                      className="sidebar-link w-full text-left"
                      onClick={() => setCollapsed(c => ({ ...c, [item.path]: c[item.path] === false ? true : false }))}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      <ChevronDown size={13} className={`transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                    </button>
                    {isOpen && (
                      <div className="pl-7 space-y-0.5 mt-0.5">
                        {item.children.map(child => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            end
                            className={({ isActive }) => `sidebar-link text-[11px]${isActive ? ' active' : ''}`}
                            onClick={onClose}
                          >
                            <span>{child.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path.split('/').length <= 2}
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  onClick={onClose}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                  {(navBadges[item.path] ?? 0) > 0 && <span className="sidebar-badge">{navBadges[item.path]}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Sign Out */}
      <div className="px-2 py-3 border-t space-y-0.5" style={{ borderColor: '#2d3318' }}>
        {supabaseUser && (
          <NavLink to="/set-password" className="sidebar-link w-full text-left" onClick={onClose}>
            <KeyRound size={14} />
            <span>Change password</span>
          </NavLink>
        )}
        <button onClick={handleLogout} className="sidebar-link w-full text-left hover:text-red-400">
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
