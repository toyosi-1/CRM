import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import Layout from './components/layout/Layout';
import Login from './pages/Login';

import FMDashboard from './pages/fm/FMDashboard';
import FMRequests from './pages/fm/FMRequests';
import CreateRequest from './pages/fm/CreateRequest';
import FMChecklists from './pages/fm/FMChecklists';
import FMAssets from './pages/fm/FMAssets';

import ProcurementDashboard from './pages/procurement/ProcurementDashboard';
import ProcurementQueue from './pages/procurement/ProcurementQueue';
import VendorDatabase from './pages/procurement/VendorDatabase';
import PurchaseOrders from './pages/procurement/PurchaseOrders';

import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';
import SupervisorApprovals from './pages/supervisor/SupervisorApprovals';
import SiteRules from './pages/supervisor/SiteRules';

import FinanceDashboard from './pages/finance/FinanceDashboard';
import PaymentQueue from './pages/finance/PaymentQueue';
import TreasuryLedger from './pages/finance/TreasuryLedger';

import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminRequests from './pages/admin/AdminRequests';
import AdminSiteManagement from './pages/admin/AdminSiteManagement';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import AdminVendors from './pages/admin/AdminVendors';
import AdminTreasury from './pages/admin/AdminTreasury';
import AdminReports from './pages/admin/AdminReports';

import RequestDetail from './pages/shared/RequestDetail';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useStore();
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

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
          <ProtectedRoute><Layout /></ProtectedRoute>
        }>
          <Route index element={<FMDashboard />} />
          <Route path="requests" element={<FMRequests />} />
          <Route path="request/new" element={<CreateRequest />} />
          <Route path="checklists" element={<FMChecklists />} />
          <Route path="assets" element={<FMAssets />} />
        </Route>

        {/* Procurement */}
        <Route path="/procurement" element={
          <ProtectedRoute><Layout /></ProtectedRoute>
        }>
          <Route index element={<ProcurementDashboard />} />
          <Route path="queue" element={<ProcurementQueue />} />
          <Route path="vendors" element={<VendorDatabase />} />
          <Route path="pos" element={<PurchaseOrders />} />
        </Route>

        {/* Supervisor */}
        <Route path="/supervisor" element={
          <ProtectedRoute><Layout /></ProtectedRoute>
        }>
          <Route index element={<SupervisorDashboard />} />
          <Route path="approvals" element={<SupervisorApprovals />} />
          <Route path="sites" element={<SiteRules />} />
        </Route>

        {/* Finance */}
        <Route path="/finance" element={
          <ProtectedRoute><Layout /></ProtectedRoute>
        }>
          <Route index element={<FinanceDashboard />} />
          <Route path="payments" element={<PaymentQueue />} />
          <Route path="treasury" element={<TreasuryLedger />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute><Layout /></ProtectedRoute>
        }>
          <Route index element={<AdminAnalytics />} />
          <Route path="requests" element={<AdminRequests />} />
          <Route path="sites" element={<AdminSiteManagement />} />
          <Route path="audit" element={<AdminAuditLog />} />
          <Route path="vendors" element={<AdminVendors />} />
          <Route path="treasury" element={<AdminTreasury />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
