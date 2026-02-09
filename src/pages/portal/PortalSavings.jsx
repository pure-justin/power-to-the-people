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
  DollarSign,
  TrendingDown,
  PiggyBank,
  Calendar,
  ArrowRight,
  Zap,
  Sun,
  FolderKanban,
} from "lucide-react";

export default function PortalSavings() {
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
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
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-40 rounded-xl bg-gray-100" />
          <div className="h-40 rounded-xl bg-gray-100" />
        </div>
        <div className="h-48 rounded-xl bg-gray-100" />
      </div>
    );
  }

  // Show empty state if no project or no billing data
  const hasBillingData =
    project && (project.monthlyBillBefore > 0 || project.monthlyBillAfter > 0);

  if (!hasBillingData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Savings Tracker</h1>
          <p className="mt-1 text-sm text-gray-500">
            See how solar is saving you money
          </p>
        </div>

        {/* Empty State */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
            <PiggyBank className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-gray-900">
            Savings Data Coming Soon
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            {project
              ? "Your savings will be calculated once your system design and billing data are finalized. Check back after your installer completes the system design."
              : "Start a solar project to see your estimated savings. Once your system is designed and your current energy costs are entered, we'll calculate your projected savings."}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              to={project ? "/portal/project" : "/qualify"}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <FolderKanban className="h-4 w-4" />
              {project ? "View Project" : "Check Eligibility"}
            </Link>
          </div>
        </div>

        {/* What gets tracked */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            What we'll track for you
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50">
                <Zap className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Before vs. After
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Monthly bill comparison before and after solar installation.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Lifetime Savings
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Projected savings over 25 years of system operation.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Payback Period
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  How quickly your system pays for itself through energy
                  savings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Real data display
  const systemCost = project.systemCost || 0;
  const monthlyBillBefore = project.monthlyBillBefore;
  const monthlyBillAfter = project.monthlyBillAfter;
  const monthlySavings = monthlyBillBefore - monthlyBillAfter;
  const annualSavings = monthlySavings * 12;
  const paybackYears =
    systemCost > 0 && annualSavings > 0
      ? Math.round((systemCost / annualSavings) * 10) / 10
      : 0;
  const lifetimeSavings = annualSavings * 25;
  const paybackPct =
    paybackYears > 0 ? Math.min((paybackYears / 25) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Savings Tracker</h1>
        <p className="mt-1 text-sm text-gray-500">
          See how solar is saving you money
        </p>
      </div>

      {/* Before/After Comparison */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
              <Zap className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-sm font-medium text-gray-500">Before Solar</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${monthlyBillBefore}
          </p>
          <p className="mt-1 text-sm text-gray-500">per month</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <Sun className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-emerald-700">After Solar</p>
          </div>
          <p className="text-3xl font-bold text-emerald-700">
            ${monthlyBillAfter}
          </p>
          <p className="mt-1 text-sm text-emerald-600">per month</p>
        </div>
      </div>

      {/* Savings Highlight */}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-emerald-50 to-white p-6 text-center">
        <TrendingDown className="mx-auto h-8 w-8 text-emerald-600" />
        <p className="mt-2 text-sm text-gray-500">
          You're saving approximately
        </p>
        <p className="mt-1 text-4xl font-bold text-emerald-700">
          ${monthlySavings}/mo
        </p>
        <p className="mt-1 text-lg font-medium text-gray-700">
          ${annualSavings.toLocaleString()}/year
        </p>
      </div>

      {/* Monthly Savings Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Savings Summary
        </h2>
        <div className="space-y-3">
          {[
            {
              label: "Monthly Savings",
              value: `$${monthlySavings}`,
              icon: DollarSign,
              color: "text-emerald-600",
            },
            {
              label: "Annual Savings",
              value: `$${annualSavings.toLocaleString()}`,
              icon: Calendar,
              color: "text-blue-600",
            },
            {
              label: "25-Year Savings",
              value: `$${lifetimeSavings.toLocaleString()}`,
              icon: PiggyBank,
              color: "text-purple-600",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <p className="text-sm font-medium text-gray-700">
                  {item.label}
                </p>
              </div>
              <p className="text-sm font-bold text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Payback Period Gauge */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Payback Period
        </h2>
        {systemCost > 0 ? (
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-500">0 years</span>
              <span className="font-medium text-gray-900">
                {paybackYears} years
              </span>
              <span className="text-gray-500">25 years</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                style={{ width: `${paybackPct}%` }}
              />
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-emerald-50 p-3">
              <ArrowRight className="h-5 w-5 flex-shrink-0 text-emerald-600" />
              <p className="text-sm text-emerald-700">
                Your system pays for itself in{" "}
                <span className="font-bold">{paybackYears} years</span>, then
                generates free electricity for the remaining{" "}
                <span className="font-bold">
                  {Math.max(25 - paybackYears, 0)} years
                </span>{" "}
                of its warranty.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 p-6 text-center">
            <PiggyBank className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              Payback period will be calculated once your system cost is
              finalized.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
