import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import SetPassword from './pages/SetPassword';

import FMDashboard from './pages/fm/FMDashboard';
import FMRequests from './pages/fm/FMRequests';
import CreateRequest from './pages/fm/CreateRequest';
import FMChecklists from './pages/fm/FMChecklists';
import FMAssets from './pages/fm/FMAssets';
import FMIncidents from './pages/fm/FMIncidents';
import FMPettyCash from './pages/fm/FMPettyCash';
import FMFacilityInfo from './pages/fm/FMFacilityInfo';
import FMTechnicians from './pages/fm/FMTechnicians';
import FMVendors from './pages/fm/FMVendors';
import FMPPM from './pages/fm/FMPPM';
import FMSLA from './pages/fm/FMSLA';
import FMReport from './pages/fm/report/FMReport';

import ProcurementDashboard from './pages/procurement/ProcurementDashboard';
import ProcurementQueue from './pages/procurement/ProcurementQueue';
import VendorOnboarding from './pages/procurement/VendorOnboarding';
import PurchaseOrders from './pages/procurement/PurchaseOrders';
import VendorScorecardPage from './pages/procurement/VendorScorecardPage';

import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';
import SupervisorApprovals from './pages/supervisor/SupervisorApprovals';
import SiteRules from './pages/supervisor/SiteRules';
import PPMRegistry from './pages/supervisor/PPMRegistry';
import ChecklistBuilder from './pages/supervisor/ChecklistBuilder';
import FacilitiesManagement from './pages/shared/FacilitiesManagement';
import PeopleRegistry from './pages/shared/PeopleRegistry';

import FinanceDashboard from './pages/finance/FinanceDashboard';
import FinancePettyCash from './pages/finance/FinancePettyCash';
import PaymentQueue from './pages/finance/PaymentQueue';
import TreasuryLedger from './pages/finance/TreasuryLedger';
import Reconciliation from './pages/finance/Reconciliation';

import TechnicianDashboard from './pages/technician/TechnicianDashboard';
import TechnicianTasks from './pages/technician/TechnicianTasks';
import TechnicianChecklists from './pages/technician/TechnicianChecklists';
import TechnicianAssets from './pages/technician/TechnicianAssets';
import JobCompletion from './pages/technician/JobCompletion';

import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import AdminReports from './pages/admin/AdminReports';
import AdminRequests from './pages/admin/AdminRequests';
import AdminSiteManagement from './pages/admin/AdminSiteManagement';
import AdminTreasury from './pages/admin/AdminTreasury';
import AdminUsers from './pages/admin/AdminUsers';
import AdminVendors from './pages/admin/AdminVendors';
import IctDashboard from './pages/ict/IctDashboard';

import RequestDetail from './pages/shared/RequestDetail';
import SupportTickets from './pages/shared/SupportTickets';
import UpdatePrompt from './components/shared/UpdatePrompt';
import SaveErrorToast from './components/shared/SaveErrorToast';
import InstallPrompt from './components/shared/InstallPrompt';
import type { UserRole } from './types';
import { useAuth } from './lib/AuthContext';

const ROLE_ROUTES: Record<UserRole, string> = {
  facility_manager: '/fm',
  procurement: '/procurement',
  supervisor: '/supervisor',
  finance: '/finance',
  admin: '/admin',
  ict_admin: '/ict',
  technician: '/technician',
};

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: UserRole }) {
  const { currentUser } = useStore();
  const { loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-slate-500">Loading your workspace...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (role && currentUser.role !== role) return <Navigate to={ROLE_ROUTES[currentUser.role]} replace />;
  return <>{children}</>;
}

function HomeRoute() {
  const { currentUser } = useStore();
  const { loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-slate-500">Loading your workspace...</div>;
  return <Navigate to={currentUser ? ROLE_ROUTES[currentUser.role] : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/" element={<HomeRoute />} />

        {/* Shared — Request Detail (Master Audit Screen) */}
        <Route path="/request/:id" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<RequestDetail />} />
        </Route>

        {/* Facility Manager */}
        <Route path="/fm" element={
          <ProtectedRoute role="facility_manager"><Layout /></ProtectedRoute>
        }>
          <Route index element={<FMDashboard />} />
          <Route path="requests" element={<FMRequests />} />
          <Route path="request/new" element={<CreateRequest />} />
          <Route path="vendors" element={<FMVendors />} />
          <Route path="ppm" element={<FMPPM />} />
          <Route path="sla" element={<FMSLA />} />
          <Route path="daily-walk" element={<Navigate to="/fm/checklists" replace />} />
          <Route path="checklist-builder" element={<Navigate to="/fm/checklists" replace />} />
          <Route path="checklists" element={<FMChecklists />} />
          <Route path="assets" element={<FMAssets />} />
          <Route path="incidents" element={<FMIncidents />} />
          <Route path="petty-cash" element={<FMPettyCash />} />
          <Route path="facility" element={<FMFacilityInfo />} />
          <Route path="technicians" element={<FMTechnicians />} />
          <Route path="report" element={<FMReport />} />
        </Route>

        {/* Procurement */}
        <Route path="/procurement" element={
          <ProtectedRoute role="procurement"><Layout /></ProtectedRoute>
        }>
          <Route index element={<ProcurementDashboard />} />
          <Route path="queue" element={<ProcurementQueue />} />
          <Route path="vendor-onboarding" element={<VendorOnboarding />} />
          <Route path="pos" element={<PurchaseOrders />} />
          <Route path="scorecard" element={<VendorScorecardPage />} />
        </Route>

        {/* Supervisor */}
        <Route path="/supervisor" element={
          <ProtectedRoute role="supervisor"><Layout /></ProtectedRoute>
        }>
          <Route index element={<SupervisorDashboard />} />
          <Route path="approvals" element={<SupervisorApprovals />} />
          <Route path="sites" element={<SiteRules />} />
          <Route path="ppm" element={<PPMRegistry />} />
          <Route path="facilities" element={<FacilitiesManagement />} />
          <Route path="people" element={<PeopleRegistry />} />
          <Route path="technicians" element={<FMTechnicians />} />
          <Route path="checklist-builder" element={<ChecklistBuilder />} />
        </Route>

        {/* Finance */}
        <Route path="/finance" element={
          <ProtectedRoute role="finance"><Layout /></ProtectedRoute>
        }>
          <Route index element={<FinanceDashboard />} />
          <Route path="payments" element={<PaymentQueue />} />
          <Route path="petty-cash" element={<FinancePettyCash />} />
          <Route path="treasury" element={<TreasuryLedger />} />
          <Route path="recon" element={<Reconciliation />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute role="admin"><Layout /></ProtectedRoute>
        }>
          <Route index element={<AdminAnalytics />} />
          <Route path="requests" element={<AdminRequests />} />
          <Route path="audit" element={<AdminAuditLog />} />
          <Route path="treasury" element={<AdminTreasury />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="vendors" element={<AdminVendors />} />
          <Route path="facilities" element={<FacilitiesManagement />} />
          <Route path="site-management" element={<AdminSiteManagement />} />
          <Route path="sites" element={<SiteRules />} />
          <Route path="ppm" element={<PPMRegistry />} />
          <Route path="people" element={<PeopleRegistry />} />
          <Route path="technicians" element={<FMTechnicians />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="checklist-builder" element={<ChecklistBuilder />} />
        </Route>

        {/* ICT Admin — staff onboarding, system & facility settings; no business data */}
        <Route path="/ict" element={
          <ProtectedRoute role="ict_admin"><Layout /></ProtectedRoute>
        }>
          <Route index element={<IctDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="people" element={<PeopleRegistry />} />
          <Route path="facilities" element={<FacilitiesManagement />} />
          <Route path="sites" element={<SiteRules />} />
          <Route path="checklist-builder" element={<ChecklistBuilder />} />
        </Route>

        {/* Support tickets — accessible to all authenticated roles */}
        <Route path="/support" element={
          <ProtectedRoute><Layout /></ProtectedRoute>
        }>
          <Route index element={<SupportTickets />} />
        </Route>

        {/* Technician */}
        <Route path="/technician" element={
          <ProtectedRoute role="technician"><Layout /></ProtectedRoute>
        }>
          <Route index element={<TechnicianDashboard />} />
          <Route path="tasks" element={<TechnicianTasks />} />
          <Route path="checklists" element={<TechnicianChecklists />} />
          <Route path="assets" element={<TechnicianAssets />} />
          <Route path="ppm" element={<PPMRegistry />} />
          <Route path="jobs" element={<JobCompletion />} />
        </Route>

        <Route path="*" element={<HomeRoute />} />
      </Routes>
      <UpdatePrompt />
      <SaveErrorToast />
      <InstallPrompt />
    </BrowserRouter>
  );
}
