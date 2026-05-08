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

const ROLE_COLOR: Record<UserRole, string> = {
  facility_manager: '#14b8a6',
  procurement:      '#3b82f6',
  supervisor:       '#8b5cf6',
  finance:          '#10b981',
  admin:            '#6366f1',
};

export default function Sidebar() {
  const { currentUser, logout } = useStore();
  if (!currentUser) return null;

  const sections = NAV_MAP[currentUser.role];
  const initials = currentUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const roleColor = ROLE_COLOR[currentUser.role];

  return (
    <aside className="w-56 min-h-screen flex flex-col flex-shrink-0 border-r" style={{ background: '#111827', borderColor: '#1f2937' }}>

      {/* Logo */}
      <div className="px-4 py-4 border-b" style={{ borderColor: '#1f2937' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded flex items-center justify-center bg-indigo-600">
            <Zap size={14} className="text-white" fill="currentColor" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">FacilityOps</div>
            <div className="text-slate-500 text-[10px] tracking-wider uppercase">Enterprise CRM</div>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="px-3 py-3 border-b" style={{ borderColor: '#1f2937' }}>
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
            style={{ background: roleColor }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-slate-200 text-xs font-medium truncate">{currentUser.name}</div>
            <div className="text-slate-500 text-[10px] truncate">{ROLE_LABELS[currentUser.role]}</div>
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
              {section.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path.split('/').length <= 2}
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Sign Out */}
      <div className="px-2 py-3 border-t" style={{ borderColor: '#1f2937' }}>
        <button onClick={logout} className="sidebar-link w-full text-left hover:text-red-400">
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
