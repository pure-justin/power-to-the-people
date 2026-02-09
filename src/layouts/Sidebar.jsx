import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ShieldCheck,
  Calculator,
  FileText,
  Key,
  CreditCard,
  Gift,
  Package,
  BarChart3,
  Settings,
  MessageSquare,
  Megaphone,
  Activity,
  Database,
  Bot,
  Mail,
  Home,
  ClipboardList,
  Map,
  Trophy,
  FileSpreadsheet,
  Zap,
  Sun,
  X,
  Store,
  Brain,
  FileCheck,
  Ruler,
  Calendar,
  Hammer,
  DollarSign,
  BadgeDollarSign,
  Camera,
  ClipboardCheck,
  Webhook,
} from "lucide-react";

const NAV_ITEMS = {
  admin: [
    { to: "/admin/overview", label: "Overview", icon: LayoutDashboard },
    { to: "/admin/leads", label: "Leads", icon: Users },
    { to: "/admin/projects", label: "Projects", icon: FolderKanban },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/billing", label: "Billing", icon: CreditCard },
    { to: "/admin/invoices", label: "Invoices", icon: FileText },
    { to: "/admin/sms", label: "SMS", icon: MessageSquare },
    { to: "/admin/referrals", label: "Referrals", icon: Gift },
    { to: "/admin/api-keys", label: "API Keys", icon: Key },
    { to: "/admin/webhooks", label: "Webhooks", icon: Webhook },
    { to: "/admin/solar-data", label: "Solar Data", icon: Database },
    { to: "/admin/compliance", label: "Compliance", icon: ShieldCheck },
    { to: "/admin/config", label: "Config", icon: Settings },
    { to: "/admin/ava", label: "Ava", icon: Bot },
    { to: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/admin/tasks", label: "AI Tasks", icon: Brain },
    { to: "/admin/credits", label: "Tax Credits", icon: BadgeDollarSign },
    { to: "/dashboard/marketplace", label: "Marketplace", icon: Store },
  ],
  installer: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/dashboard/leads", label: "Leads", icon: Users },
    { to: "/dashboard/projects", label: "Projects", icon: FolderKanban },
    { to: "/dashboard/permits", label: "Permits", icon: FileCheck },
    { to: "/dashboard/designs", label: "Designs", icon: Ruler },
    { to: "/dashboard/schedule", label: "Schedule", icon: Calendar },
    { to: "/dashboard/install", label: "Install QC", icon: Hammer },
    { to: "/dashboard/funding", label: "Funding", icon: DollarSign },
    { to: "/dashboard/credits", label: "Tax Credits", icon: BadgeDollarSign },
    { to: "/dashboard/documents", label: "Documents", icon: FileText },
    { to: "/dashboard/compliance", label: "Compliance", icon: ShieldCheck },
    { to: "/dashboard/estimates", label: "Estimates", icon: Calculator },
    { to: "/dashboard/invoices", label: "Invoices", icon: CreditCard },
    { to: "/dashboard/equipment", label: "Equipment", icon: Package },
    { to: "/dashboard/tasks", label: "Tasks", icon: ClipboardList },
    { to: "/dashboard/marketplace", label: "Marketplace", icon: Store },
    { to: "/dashboard/referrals", label: "Referrals", icon: Gift },
    { to: "/dashboard/api-keys", label: "API Keys", icon: Key },
    { to: "/dashboard/billing", label: "Billing", icon: CreditCard },
  ],
  sales: [
    { to: "/sales", label: "Overview", icon: LayoutDashboard },
    { to: "/sales/leads", label: "Leads", icon: Users },
    { to: "/sales/assignments", label: "My Leads", icon: ClipboardList },
    { to: "/sales/performance", label: "Performance", icon: Trophy },
    { to: "/sales/proposals", label: "Proposals", icon: FileSpreadsheet },
    { to: "/sales/territory", label: "Territory", icon: Map },
  ],
  customer: [
    { to: "/portal", label: "Home", icon: Home },
    { to: "/portal/project", label: "My Project", icon: FolderKanban },
    { to: "/portal/tasks", label: "My Tasks", icon: ClipboardList },
    { to: "/portal/survey", label: "Site Survey", icon: Camera },
    { to: "/portal/schedule", label: "Schedule", icon: Calendar },
    { to: "/portal/credits", label: "Tax Credits", icon: BadgeDollarSign },
    { to: "/portal/invoices", label: "Invoices", icon: FileText },
    { to: "/portal/referrals", label: "Referrals", icon: Gift },
    { to: "/portal/usage", label: "Usage", icon: Zap },
    { to: "/portal/savings", label: "Savings", icon: BarChart3 },
    { to: "/portal/financing", label: "Financing", icon: CreditCard },
    { to: "/portal/settings", label: "Settings", icon: Settings },
  ],
};

export default function Sidebar({ open, onClose }) {
  const { role } = useAuth();
  const items = NAV_ITEMS[role] || NAV_ITEMS.customer;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gray-900 transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Sun className="h-7 w-7 text-emerald-400" />
            <span className="text-lg font-bold text-white">SolarOS</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={
                    item.to === "/dashboard" ||
                    item.to === "/sales" ||
                    item.to === "/portal"
                  }
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    }`
                  }
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-800 px-4 py-3">
          <p className="text-xs text-gray-500">SolarOS v1.0</p>
        </div>
      </aside>
    </>
  );
}
