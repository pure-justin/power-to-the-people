import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { lazy, Suspense } from "react";
import AppShell from "./layouts/AppShell";

/**
 * Code-split all page components with React.lazy()
 * This reduces initial bundle from ~1.7MB to ~400KB.
 * Each page loads on-demand when the user navigates to it.
 */

// Public pages (eager load Home + Login for fast first paint)
import Home from "./pages/Home";
import Login from "./pages/Login";
const Qualify = lazy(() => import("./pages/Qualify"));
const SmtCallback = lazy(() => import("./pages/SmtCallback"));
const Success = lazy(() => import("./pages/Success"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Signup = lazy(() => import("./pages/Signup"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const InstallerComparison = lazy(() => import("./pages/InstallerComparison"));
const SubHubCompare = lazy(() => import("./pages/SubHubCompare"));
const CreditMarketplace = lazy(
  () => import("./pages/marketplace/CreditMarketplace"),
);
const CreditDetail = lazy(() => import("./pages/marketplace/CreditDetail"));

// Portal (customer) — lazy loaded
const PortalHome = lazy(() => import("./pages/portal/PortalHome"));
const PortalProject = lazy(() => import("./pages/portal/PortalProject"));
const PortalInvoices = lazy(() => import("./pages/portal/PortalInvoices"));
const PortalReferrals = lazy(() => import("./pages/portal/PortalReferrals"));
const PortalUsage = lazy(() => import("./pages/portal/PortalUsage"));
const PortalSettings = lazy(() => import("./pages/portal/PortalSettings"));
const PortalSavings = lazy(() => import("./pages/portal/PortalSavings"));
const PortalFinancing = lazy(() => import("./pages/portal/PortalFinancing"));
const PortalSurvey = lazy(() => import("./pages/portal/PortalSurvey"));
const PortalSchedule = lazy(() => import("./pages/portal/PortalSchedule"));
const PortalCredits = lazy(() => import("./pages/portal/PortalCredits"));

// Dashboard (installer) — lazy loaded
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const DashboardLeads = lazy(() => import("./pages/dashboard/DashboardLeads"));
const DashboardProjects = lazy(
  () => import("./pages/dashboard/DashboardProjects"),
);
const DashboardCompliance = lazy(
  () => import("./pages/dashboard/DashboardCompliance"),
);
const DashboardEstimates = lazy(
  () => import("./pages/dashboard/DashboardEstimates"),
);
const DashboardInvoices = lazy(
  () => import("./pages/dashboard/DashboardInvoices"),
);
const DashboardApiKeys = lazy(
  () => import("./pages/dashboard/DashboardApiKeys"),
);
const DashboardBilling = lazy(
  () => import("./pages/dashboard/DashboardBilling"),
);
const DashboardReferrals = lazy(
  () => import("./pages/dashboard/DashboardReferrals"),
);
const DashboardEquipment = lazy(
  () => import("./pages/dashboard/DashboardEquipment"),
);
const DashboardProjectDetail = lazy(
  () => import("./pages/dashboard/DashboardProjectDetail"),
);
const DashboardMarketplace = lazy(
  () => import("./pages/dashboard/DashboardMarketplace"),
);
const DashboardWorkerProfile = lazy(
  () => import("./pages/dashboard/DashboardWorkerProfile"),
);
const DashboardTasks = lazy(() => import("./pages/dashboard/DashboardTasks"));
const DashboardSurvey = lazy(() => import("./pages/dashboard/DashboardSurvey"));
const DashboardPermits = lazy(
  () => import("./pages/dashboard/DashboardPermits"),
);
const DashboardDesigns = lazy(
  () => import("./pages/dashboard/DashboardDesigns"),
);
const DashboardSchedule = lazy(
  () => import("./pages/dashboard/DashboardSchedule"),
);
const DashboardInstall = lazy(
  () => import("./pages/dashboard/DashboardInstall"),
);
const DashboardFunding = lazy(
  () => import("./pages/dashboard/DashboardFunding"),
);
const DashboardCredits = lazy(
  () => import("./pages/dashboard/DashboardCredits"),
);
const DashboardDocuments = lazy(
  () => import("./pages/dashboard/DashboardDocuments"),
);

// Sales — lazy loaded
const SalesHome = lazy(() => import("./pages/sales/SalesHome"));
const SalesLeads = lazy(() => import("./pages/sales/SalesLeads"));
const SalesAssignments = lazy(() => import("./pages/sales/SalesAssignments"));
const SalesPerformance = lazy(() => import("./pages/sales/SalesPerformance"));
const SalesProposals = lazy(() => import("./pages/sales/SalesProposals"));
const SalesTerritory = lazy(() => import("./pages/sales/SalesTerritory"));

// Admin — lazy loaded
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads"));
const AdminProjects = lazy(() => import("./pages/admin/AdminProjects"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling"));
const AdminInvoices = lazy(() => import("./pages/admin/AdminInvoices"));
const AdminSms = lazy(() => import("./pages/admin/AdminSms"));
const AdminReferrals = lazy(() => import("./pages/admin/AdminReferrals"));
const AdminApiKeys = lazy(() => import("./pages/admin/AdminApiKeys"));
const AdminSolarData = lazy(() => import("./pages/admin/AdminSolarData"));
const AdminCompliance = lazy(() => import("./pages/admin/AdminCompliance"));
const AdminConfig = lazy(() => import("./pages/admin/AdminConfig"));
const AdminAva = lazy(() => import("./pages/admin/AdminAva"));
const AdminCampaigns = lazy(() => import("./pages/admin/AdminCampaigns"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminTasks = lazy(() => import("./pages/admin/AdminTasks"));
const AdminCredits = lazy(() => import("./pages/admin/AdminCredits"));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-screen">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          }
        >
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
            <Route
              path="/marketplace/credits"
              element={<CreditMarketplace />}
            />
            <Route path="/marketplace/credits/:id" element={<CreditDetail />} />

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
              <Route path="/portal/survey" element={<PortalSurvey />} />
              <Route
                path="/portal/survey/:projectId"
                element={<PortalSurvey />}
              />
              <Route path="/portal/schedule" element={<PortalSchedule />} />
              <Route path="/portal/credits" element={<PortalCredits />} />
            </Route>

            {/* Installer Dashboard */}
            <Route element={<AppShell requiredRole="installer" />}>
              <Route path="/dashboard" element={<DashboardHome />} />
              <Route path="/dashboard/leads" element={<DashboardLeads />} />
              <Route
                path="/dashboard/projects"
                element={<DashboardProjects />}
              />
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
              <Route
                path="/dashboard/invoices"
                element={<DashboardInvoices />}
              />
              <Route
                path="/dashboard/api-keys"
                element={<DashboardApiKeys />}
              />
              <Route path="/dashboard/billing" element={<DashboardBilling />} />
              <Route
                path="/dashboard/referrals"
                element={<DashboardReferrals />}
              />
              <Route
                path="/dashboard/equipment"
                element={<DashboardEquipment />}
              />
              <Route path="/dashboard/tasks" element={<DashboardTasks />} />
              <Route
                path="/dashboard/survey/:projectId"
                element={<DashboardSurvey />}
              />
              <Route path="/dashboard/permits" element={<DashboardPermits />} />
              <Route path="/dashboard/designs" element={<DashboardDesigns />} />
              <Route
                path="/dashboard/schedule"
                element={<DashboardSchedule />}
              />
              <Route path="/dashboard/install" element={<DashboardInstall />} />
              <Route path="/dashboard/funding" element={<DashboardFunding />} />
              <Route path="/dashboard/credits" element={<DashboardCredits />} />
              <Route
                path="/dashboard/documents"
                element={<DashboardDocuments />}
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
              <Route path="/admin/tasks" element={<AdminTasks />} />
              <Route path="/admin/credits" element={<AdminCredits />} />
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
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
