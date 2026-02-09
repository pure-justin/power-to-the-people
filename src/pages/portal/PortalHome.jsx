import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "../../services/firebase";
import {
  Sun,
  DollarSign,
  Zap,
  FileText,
  Users,
  Settings,
  ChevronRight,
  Activity,
  BarChart3,
  CreditCard,
} from "lucide-react";

function StatCard({ label, value, icon: Icon, color = "emerald" }) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors[color] || colors.emerald}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

const STATUS_LABELS = {
  qualified: "Qualified",
  designed: "System Designed",
  permitted: "Permitting",
  scheduled: "Scheduled",
  installing: "Installing",
  inspecting: "Inspection",
  pto: "Permission to Operate",
  active: "Active",
};

export default function PortalHome() {
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const loadProject = async () => {
      try {
        const q = query(
          collection(db, "projects"),
          where("userId", "==", user.uid),
          limit(1),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setProject({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
      } catch (err) {
        console.error("Failed to load project:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProject();
  }, [user]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="h-48 rounded-xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.displayName || "Homeowner"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Your solar project at a glance
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Estimated Annual Savings"
          value={
            project?.estimatedSavings
              ? `$${project.estimatedSavings.toLocaleString()}`
              : "$--"
          }
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          label="System Production"
          value={
            project?.annualProduction
              ? `${project.annualProduction.toLocaleString()} kWh`
              : "-- kWh"
          }
          icon={Zap}
          color="amber"
        />
        <StatCard
          label="System Size"
          value={project?.systemSize ? `${project.systemSize} kW` : "-- kW"}
          icon={Sun}
          color="blue"
        />
      </div>

      {/* Project Card */}
      {project ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Your Project
              </h2>
              <Link
                to={`/portal/project/${project.id}`}
                className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                View Details
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <Sun className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {project.address || "Solar Installation"}
                </p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {project.systemSize
                    ? `${project.systemSize} kW System`
                    : "System sizing in progress"}
                </p>
                <div className="mt-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      project.status === "active"
                        ? "bg-green-100 text-green-700"
                        : project.status === "installing"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {STATUS_LABELS[project.status] ||
                      project.status ||
                      "In Progress"}
                  </span>
                </div>
                {/* Next Milestone */}
                {project.status && project.status !== "active" && (
                  <div className="mt-4 rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Next Milestone
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-700">
                      {getNextMilestone(project.status)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sun className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Welcome to SolarOS!
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Your solar journey starts here. Let us help you find the perfect
            system for your home.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/qualify"
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              Check Your Eligibility
            </Link>
            <Link
              to="/get-started"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Invoices",
            icon: CreditCard,
            to: "/portal/invoices",
            desc: "View payments",
          },
          {
            label: "Referrals",
            icon: Users,
            to: "/portal/referrals",
            desc: "Earn rewards",
          },
          {
            label: "Usage",
            icon: BarChart3,
            to: "/portal/usage",
            desc: "Energy data",
          },
          {
            label: "Settings",
            icon: Settings,
            to: "/portal/settings",
            desc: "Your profile",
          },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <link.icon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{link.label}</p>
              <p className="text-xs text-gray-500">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Activity Feed Placeholder */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
        </div>
        <div className="px-6 py-12 text-center">
          <Activity className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">
            Activity updates will appear here as your project progresses.
          </p>
        </div>
      </div>
    </div>
  );
}

function getNextMilestone(currentStatus) {
  const milestones = [
    "qualified",
    "designed",
    "permitted",
    "scheduled",
    "installing",
    "inspecting",
    "pto",
    "active",
  ];
  const idx = milestones.indexOf(currentStatus);
  if (idx === -1 || idx >= milestones.length - 1) return "Project complete";
  return STATUS_LABELS[milestones[idx + 1]] || milestones[idx + 1];
}
