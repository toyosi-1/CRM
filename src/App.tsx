import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useStore } from './store/useStore';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import SetPassword from './pages/SetPassword';

// Route-level code splitting: each portal downloads only what it uses
const FMDashboard = lazy(() => import('./pages/fm/FMDashboard'));
const FMRequests = lazy(() => import('./pages/fm/FMRequests'));
const CreateRequest = lazy(() => import('./pages/fm/CreateRequest'));
const FMChecklists = lazy(() => import('./pages/fm/FMChecklists'));
const FMAssets = lazy(() => import('./pages/fm/FMAssets'));
const FMIncidents = lazy(() => import('./pages/fm/FMIncidents'));
const FMPettyCash = lazy(() => import('./pages/fm/FMPettyCash'));
const FMFacilityInfo = lazy(() => import('./pages/fm/FMFacilityInfo'));
const FMTechnicians = lazy(() => import('./pages/fm/FMTechnicians'));
const FMVendors = lazy(() => import('./pages/fm/FMVendors'));
const FMPPM = lazy(() => import('./pages/fm/FMPPM'));
const FMSLA = lazy(() => import('./pages/fm/FMSLA'));
const FMReport = lazy(() => import('./pages/fm/report/FMReport'));

const ProcurementDashboard = lazy(() => import('./pages/procurement/ProcurementDashboard'));
const ProcurementQueue = lazy(() => import('./pages/procurement/ProcurementQueue'));
const VendorOnboarding = lazy(() => import('./pages/procurement/VendorOnboarding'));
const PurchaseOrders = lazy(() => import('./pages/procurement/PurchaseOrders'));
const VendorScorecardPage = lazy(() => import('./pages/procurement/VendorScorecardPage'));

const SupervisorDashboard = lazy(() => import('./pages/supervisor/SupervisorDashboard'));
const SupervisorApprovals = lazy(() => import('./pages/supervisor/SupervisorApprovals'));
const SiteRules = lazy(() => import('./pages/supervisor/SiteRules'));
const PPMRegistry = lazy(() => import('./pages/supervisor/PPMRegistry'));
const ChecklistBuilder = lazy(() => import('./pages/supervisor/ChecklistBuilder'));
const FacilitiesManagement = lazy(() => import('./pages/shared/FacilitiesManagement'));
const PeopleRegistry = lazy(() => import('./pages/shared/PeopleRegistry'));

const FinanceDashboard = lazy(() => import('./pages/finance/FinanceDashboard'));
const FinancePettyCash = lazy(() => import('./pages/finance/FinancePettyCash'));
const PaymentQueue = lazy(() => import('./pages/finance/PaymentQueue'));
const TreasuryLedger = lazy(() => import('./pages/finance/TreasuryLedger'));
const Reconciliation = lazy(() => import('./pages/finance/Reconciliation'));
const FinanceLedger = lazy(() => import('./pages/finance/FinanceLedger'));

const TechnicianDashboard = lazy(() => import('./pages/technician/TechnicianDashboard'));
const TechnicianTasks = lazy(() => import('./pages/technician/TechnicianTasks'));
const TechnicianChecklists = lazy(() => import('./pages/technician/TechnicianChecklists'));
const TechnicianAssets = lazy(() => import('./pages/technician/TechnicianAssets'));
const JobCompletion = lazy(() => import('./pages/technician/JobCompletion'));

const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminAuditLog = lazy(() => import('./pages/admin/AdminAuditLog'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminRequests = lazy(() => import('./pages/admin/AdminRequests'));
const AdminSiteManagement = lazy(() => import('./pages/admin/AdminSiteManagement'));
const AdminTreasury = lazy(() => import('./pages/admin/AdminTreasury'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminVendors = lazy(() => import('./pages/admin/AdminVendors'));
const IctDashboard = lazy(() => import('./pages/ict/IctDashboard'));

const RequestDetail = lazy(() => import('./pages/shared/RequestDetail'));
const SupportTickets = lazy(() => import('./pages/shared/SupportTickets'));
import AutoUpdate from './components/shared/AutoUpdate';
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
      <Suspense fallback={<div className="min-h-screen grid place-items-center text-sm text-slate-500">Loading…</div>}>
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
          <Route path="ledger" element={<FinanceLedger />} />
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
      </Suspense>
      <AutoUpdate />
      <SaveErrorToast />
      <InstallPrompt />
    </BrowserRouter>
  );
}
