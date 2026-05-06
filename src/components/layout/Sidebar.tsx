import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, ShoppingCart, CheckSquare,
  Package, DollarSign, Settings, BarChart3, Building2,
  BookOpen, LogOut, Zap, ShieldCheck, FileText, Store
} from 'lucide-react';
import type { UserRole } from '../../types';
import { ROLE_LABELS } from '../../utils/helpers';
import { useStore } from '../../store/useStore';

interface NavItem { label: string; path: string; icon: React.ReactNode; }
interface NavSection { section?: string; items: NavItem[]; }

const FM_NAV: NavSection[] = [
  { section: 'Workspace', items: [
    { label: 'Dashboard', path: '/fm', icon: <LayoutDashboard size={15} /> },
    { label: 'New Request', path: '/fm/request/new', icon: <ClipboardList size={15} /> },
    { label: 'My Requests', path: '/fm/requests', icon: <ShoppingCart size={15} /> },
  ]},
  { section: 'Operations', items: [
    { label: 'Checklists', path: '/fm/checklists', icon: <CheckSquare size={15} /> },
    { label: 'Assets', path: '/fm/assets', icon: <Package size={15} /> },
  ]},
];

const PROCUREMENT_NAV: NavSection[] = [
  { section: 'Workspace', items: [
    { label: 'Dashboard', path: '/procurement', icon: <LayoutDashboard size={15} /> },
    { label: 'Request Queue', path: '/procurement/queue', icon: <ClipboardList size={15} /> },
  ]},
  { section: 'Management', items: [
    { label: 'Vendor Database', path: '/procurement/vendors', icon: <Store size={15} /> },
    { label: 'Purchase Orders', path: '/procurement/pos', icon: <FileText size={15} /> },
  ]},
];

const SUPERVISOR_NAV: NavSection[] = [
  { section: 'Workspace', items: [
    { label: 'Dashboard', path: '/supervisor', icon: <LayoutDashboard size={15} /> },
    { label: 'Approval Queue', path: '/supervisor/approvals', icon: <ShieldCheck size={15} /> },
  ]},
  { section: 'Configuration', items: [
    { label: 'Site Rules', path: '/supervisor/sites', icon: <Settings size={15} /> },
  ]},
];

const FINANCE_NAV: NavSection[] = [
  { section: 'Workspace', items: [
    { label: 'Dashboard', path: '/finance', icon: <LayoutDashboard size={15} /> },
    { label: 'Payment Queue', path: '/finance/payments', icon: <DollarSign size={15} /> },
    { label: 'Treasury Ledger', path: '/finance/treasury', icon: <BookOpen size={15} /> },
  ]},
];

const ADMIN_NAV: NavSection[] = [
  { section: 'Intelligence', items: [
    { label: 'Analytics', path: '/admin', icon: <BarChart3 size={15} /> },
    { label: 'All Requests', path: '/admin/requests', icon: <ClipboardList size={15} /> },
  ]},
  { section: 'Management', items: [
    { label: 'Site Management', path: '/admin/sites', icon: <Building2 size={15} /> },
    { label: 'Vendor Scores', path: '/admin/vendors', icon: <Store size={15} /> },
    { label: 'Treasury', path: '/admin/treasury', icon: <DollarSign size={15} /> },
  ]},
  { section: 'Governance', items: [
    { label: 'Audit Log', path: '/admin/audit', icon: <BookOpen size={15} /> },
    { label: 'Reports', path: '/admin/reports', icon: <FileText size={15} /> },
  ]},
];

const NAV_MAP: Record<UserRole, NavSection[]> = {
  facility_manager: FM_NAV,
  procurement: PROCUREMENT_NAV,
  supervisor: SUPERVISOR_NAV,
  finance: FINANCE_NAV,
  admin: ADMIN_NAV,
};

const ROLE_CONFIG: Record<UserRole, { gradient: string; dot: string; initials?: string }> = {
  facility_manager: { gradient: 'from-teal-500 to-teal-600', dot: 'bg-teal-400' },
  procurement:      { gradient: 'from-blue-500 to-blue-600',  dot: 'bg-blue-400' },
  supervisor:       { gradient: 'from-purple-500 to-purple-600', dot: 'bg-purple-400' },
  finance:          { gradient: 'from-emerald-500 to-emerald-600', dot: 'bg-emerald-400' },
  admin:            { gradient: 'from-brand-500 to-brand-700', dot: 'bg-brand-400' },
};

export default function Sidebar() {
  const { currentUser, logout } = useStore();
  if (!currentUser) return null;

  const sections = NAV_MAP[currentUser.role];
  const rc = ROLE_CONFIG[currentUser.role];
  const initials = currentUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className="w-60 min-h-screen flex flex-col flex-shrink-0 border-r border-white/[0.04]"
      style={{ background: 'linear-gradient(180deg, #090e1c 0%, #0b1120 50%, #080c18 100%)' }}>

      {/* Subtle top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)' }} />

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-glow-brand"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
              <Zap size={16} className="text-white" fill="currentColor" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#090e1c]" />
          </div>
          <div>
            <div className="text-white font-black text-sm leading-tight tracking-tight">FacilityOps</div>
            <div className="text-slate-600 text-[9px] font-bold tracking-[0.15em] uppercase mt-0.5">Enterprise Suite</div>
          </div>
        </div>
      </div>

      {/* User card */}
      <div className="px-3 pt-3 pb-2">
        <div className="px-3 py-3 rounded-2xl border"
          style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2.5">
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full p-[2px]"
                style={{ background: `linear-gradient(135deg, ${rc.gradient.includes('teal') ? '#14b8a6' : rc.gradient.includes('blue') ? '#3b82f6' : rc.gradient.includes('purple') ? '#8b5cf6' : rc.gradient.includes('emerald') ? '#10b981' : '#6366f1'}, #1e1b4b)` }}>
                <div className={`w-full h-full rounded-full bg-gradient-to-br ${rc.gradient} flex items-center justify-center text-white text-xs font-black`}>
                  {initials}
                </div>
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#090e1c] ${rc.dot} animate-pulse-dot`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-bold truncate leading-tight">{currentUser.name}</div>
              <div className="text-slate-500 text-[10px] font-semibold mt-0.5 truncate">{ROLE_LABELS[currentUser.role]}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto pb-2">
        {sections.map((section, si) => (
          <div key={si}>
            {section.section && (
              <p className="sidebar-section-label">{section.section}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path.split('/').length <= 2}
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                >
                  <span className="flex-shrink-0 opacity-60 group-[.active]:opacity-100">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Sign Out */}
      <div className="px-3 py-3 border-t border-white/[0.05]">
        <button
          onClick={logout}
          className="sidebar-link w-full group hover:text-red-400"
          style={{ '--hover-bg': 'rgba(239,68,68,0.08)' } as React.CSSProperties}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <LogOut size={15} className="text-slate-600 group-hover:text-red-400 transition-colors" />
          <span className="text-slate-500 group-hover:text-red-400 transition-colors">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
