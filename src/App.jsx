import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import AppShell from "./layouts/AppShell";

// Public pages
import Home from "./pages/Home";
import Qualify from "./pages/Qualify";
import SmtCallback from "./pages/SmtCallback";
import Success from "./pages/Success";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ApiDocs from "./pages/ApiDocs";
import InstallerComparison from "./pages/InstallerComparison";
import SubHubCompare from "./pages/SubHubCompare";

// Portal (customer)
import PortalHome from "./pages/portal/PortalHome";
import PortalProject from "./pages/portal/PortalProject";
import PortalInvoices from "./pages/portal/PortalInvoices";
import PortalReferrals from "./pages/portal/PortalReferrals";
import PortalUsage from "./pages/portal/PortalUsage";
import PortalSettings from "./pages/portal/PortalSettings";
import PortalSavings from "./pages/portal/PortalSavings";
import PortalFinancing from "./pages/portal/PortalFinancing";

// Dashboard (installer)
import DashboardHome from "./pages/dashboard/DashboardHome";
import DashboardLeads from "./pages/dashboard/DashboardLeads";
import DashboardProjects from "./pages/dashboard/DashboardProjects";
import DashboardCompliance from "./pages/dashboard/DashboardCompliance";
import DashboardEstimates from "./pages/dashboard/DashboardEstimates";
import DashboardInvoices from "./pages/dashboard/DashboardInvoices";
import DashboardApiKeys from "./pages/dashboard/DashboardApiKeys";
import DashboardBilling from "./pages/dashboard/DashboardBilling";
import DashboardReferrals from "./pages/dashboard/DashboardReferrals";
import DashboardEquipment from "./pages/dashboard/DashboardEquipment";
import DashboardProjectDetail from "./pages/dashboard/DashboardProjectDetail";
import DashboardMarketplace from "./pages/dashboard/DashboardMarketplace";
import DashboardWorkerProfile from "./pages/dashboard/DashboardWorkerProfile";

// Sales
import SalesHome from "./pages/sales/SalesHome";
import SalesLeads from "./pages/sales/SalesLeads";
import SalesAssignments from "./pages/sales/SalesAssignments";
import SalesPerformance from "./pages/sales/SalesPerformance";
import SalesProposals from "./pages/sales/SalesProposals";
import SalesTerritory from "./pages/sales/SalesTerritory";

// Admin
import AdminOverview from "./pages/admin/AdminOverview";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminBilling from "./pages/admin/AdminBilling";
import AdminInvoices from "./pages/admin/AdminInvoices";
import AdminSms from "./pages/admin/AdminSms";
import AdminReferrals from "./pages/admin/AdminReferrals";
import AdminApiKeys from "./pages/admin/AdminApiKeys";
import AdminSolarData from "./pages/admin/AdminSolarData";
import AdminCompliance from "./pages/admin/AdminCompliance";
import AdminConfig from "./pages/admin/AdminConfig";
import AdminAva from "./pages/admin/AdminAva";
import AdminCampaigns from "./pages/admin/AdminCampaigns";
import AdminAnalytics from "./pages/admin/AdminAnalytics";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/qualify" element={<Qualify />} />
          <Route path="/qualify/smt-callback" element={<SmtCallback />} />
          <Route path="/success" element={<Success />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/api-docs" element={<ApiDocs />} />
          <Route path="/compare" element={<SubHubCompare />} />
          <Route path="/installers" element={<InstallerComparison />} />

          {/* Homeowner Portal */}
          <Route element={<AppShell requiredRole="customer" />}>
            <Route path="/portal" element={<PortalHome />} />
            <Route path="/portal/project" element={<PortalProject />} />
            <Route path="/portal/project/:id" element={<PortalProject />} />
            <Route path="/portal/invoices" element={<PortalInvoices />} />
            <Route path="/portal/referrals" element={<PortalReferrals />} />
            <Route path="/portal/usage" element={<PortalUsage />} />
            <Route path="/portal/settings" element={<PortalSettings />} />
            <Route path="/portal/savings" element={<PortalSavings />} />
            <Route path="/portal/financing" element={<PortalFinancing />} />
          </Route>

          {/* Installer Dashboard */}
          <Route element={<AppShell requiredRole="installer" />}>
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/dashboard/leads" element={<DashboardLeads />} />
            <Route path="/dashboard/projects" element={<DashboardProjects />} />
            <Route
              path="/dashboard/projects/:projectId"
              element={<DashboardProjectDetail />}
            />
            <Route
              path="/dashboard/compliance"
              element={<DashboardCompliance />}
            />
            <Route
              path="/dashboard/estimates"
              element={<DashboardEstimates />}
            />
            <Route path="/dashboard/invoices" element={<DashboardInvoices />} />
            <Route path="/dashboard/api-keys" element={<DashboardApiKeys />} />
            <Route path="/dashboard/billing" element={<DashboardBilling />} />
            <Route
              path="/dashboard/referrals"
              element={<DashboardReferrals />}
            />
            <Route
              path="/dashboard/equipment"
              element={<DashboardEquipment />}
            />
            <Route
              path="/dashboard/marketplace"
              element={<DashboardMarketplace />}
            />
            <Route
              path="/dashboard/workers/:workerId"
              element={<DashboardWorkerProfile />}
            />
          </Route>

          {/* Sales Dashboard */}
          <Route element={<AppShell requiredRole="sales" />}>
            <Route path="/sales" element={<SalesHome />} />
            <Route path="/sales/leads" element={<SalesLeads />} />
            <Route path="/sales/assignments" element={<SalesAssignments />} />
            <Route path="/sales/performance" element={<SalesPerformance />} />
            <Route path="/sales/proposals" element={<SalesProposals />} />
            <Route path="/sales/territory" element={<SalesTerritory />} />
          </Route>

          {/* Admin Dashboard */}
          <Route element={<AppShell requiredRole="admin" />}>
            <Route path="/admin/overview" element={<AdminOverview />} />
            <Route path="/admin/leads" element={<AdminLeads />} />
            <Route path="/admin/projects" element={<AdminProjects />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/billing" element={<AdminBilling />} />
            <Route path="/admin/invoices" element={<AdminInvoices />} />
            <Route path="/admin/sms" element={<AdminSms />} />
            <Route path="/admin/referrals" element={<AdminReferrals />} />
            <Route path="/admin/api-keys" element={<AdminApiKeys />} />
            <Route path="/admin/solar-data" element={<AdminSolarData />} />
            <Route path="/admin/compliance" element={<AdminCompliance />} />
            <Route path="/admin/config" element={<AdminConfig />} />
            <Route path="/admin/ava" element={<AdminAva />} />
            <Route path="/admin/campaigns" element={<AdminCampaigns />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
          </Route>

          {/* Legacy redirect */}
          <Route
            path="/admin"
            element={<Navigate to="/admin/overview" replace />}
          />
          <Route
            path="/referrals"
            element={<Navigate to="/portal/referrals" replace />}
          />
          <Route
            path="/project/:id"
            element={<Navigate to="/portal/project/:id" replace />}
          />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
