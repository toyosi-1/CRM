import { NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { NAV_MAP } from './navConfig';

// Reference v12: each portal shows a horizontal tab bar under the topbar
// mirroring the sidebar navigation.
const TAB_LABELS: Record<string, string> = {
  '/fm': 'Overview',
  '/fm/requests': 'Requests',
  '/fm/request/new': '+ New request',
  '/fm/vendors': 'Vendors',
  '/fm/ppm': 'PPM',
  '/fm/assets': 'Assets',
  '/fm/sla': 'SLA',
  '/fm/incidents': 'Incidents',
  '/fm/checklists': 'Checklists',
  '/fm/petty-cash': 'Petty cash',
  '/fm/facility': 'Facility',
  '/fm/technicians': 'Technicians',
  '/procurement': 'Overview',
  '/procurement/queue': 'Queue',
  '/procurement/vendor-onboarding': 'Onboarding',
  '/procurement/scorecard': 'Scorecard',
  '/procurement/pos': 'POs',
  '/supervisor': 'Overview',
  '/supervisor/approvals': 'Approvals',
  '/supervisor/sites': 'Site rules',
  '/supervisor/ppm': 'PPM',
  '/supervisor/facilities': 'Facilities',
  '/supervisor/people': 'People',
  '/supervisor/checklist-builder': 'Checklists',
  '/finance': 'Overview',
  '/finance/ledger': 'Ledger',
  '/finance/payments': 'Payments',
  '/finance/petty-cash': 'Petty cash',
  '/finance/treasury': 'Treasury',
  '/finance/recon': 'Reconciliation',
  '/technician': 'Overview',
  '/technician/tasks': 'My tasks',
  '/technician/checklists': 'Technical checks',
  '/technician/assets': 'Assets',
  '/technician/ppm': 'PPM',
  '/technician/jobs': 'Job completion',
  '/admin': 'Analytics',
  '/admin/facilities': 'Facilities',
  '/admin/people': 'People',
  '/admin/users': 'Staff access',
  '/admin/audit': 'Audit log',
};

export default function PortalTabs() {
  const { currentUser } = useStore();
  const location = useLocation();
  if (!currentUser) return null;
  // Ledger pages navigate via the sidebar groups — a second tab strip is redundant there.
  if (location.pathname.startsWith('/finance/ledger')) return null;
  const items = NAV_MAP[currentUser.role].flatMap(section => section.items).filter(i => !i.children || location.pathname === i.path);
  return (
    <nav className="app-tabbar" aria-label="Portal sections">
      {items.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path.split('/').length <= 2}
          className={({ isActive }) => `app-tab${isActive ? ' active' : ''}`}
        >
          {TAB_LABELS[item.path] ?? item.label}
        </NavLink>
      ))}
    </nav>
  );
}
