import { NavLink } from 'react-router-dom';
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
  '/finance/payments': 'Payments',
  '/finance/treasury': 'Ledger',
  '/finance/recon': 'Reconciliation',
  '/technician': 'Overview',
  '/technician/tasks': 'Tasks',
  '/technician/checklists': 'Checklists',
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
  if (!currentUser) return null;
  const items = NAV_MAP[currentUser.role].flatMap(section => section.items);
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
