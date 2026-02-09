import { useState, useEffect } from "react";
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
  CreditCard,
  TrendingUp,
  Crown,
  Zap,
  ArrowUpRight,
  Users,
  Activity,
  ShieldCheck,
  ExternalLink,
  Check,
  Star,
  Search,
  Sun,
  Store,
} from "lucide-react";

const TIERS = [
  {
    name: "Starter",
    price: 79,
    priceId: "price_1SyMrCQhgZdyZ7qRyWDGrr9U",
    limits: {
      leads: 50,
      apiCalls: 1000,
      compliance: 25,
      equipmentLookups: 100,
      solarEstimates: 10,
      marketplaceListings: 10,
    },
    features: [
      "50 leads/month",
      "1,000 API calls",
      "25 compliance checks",
      "100 equipment lookups",
      "Email support",
    ],
  },
  {
    name: "Professional",
    price: 149,
    priceId: "price_1SyMrEQhgZdyZ7qRYLfqv0Ds",
    limits: {
      leads: 200,
      apiCalls: 10000,
      compliance: 200,
      equipmentLookups: 999999,
      solarEstimates: 100,
      marketplaceListings: 999999,
    },
    features: [
      "200 leads/month",
      "10,000 API calls",
      "200 compliance checks",
      "Unlimited equipment lookups",
      "Priority support",
      "Referral program",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: 299,
    priceId: "price_1SyMrFQhgZdyZ7qRcQk9fAqh",
    limits: {
      leads: 999999,
      apiCalls: 100000,
      compliance: 999999,
      equipmentLookups: 999999,
      solarEstimates: 999999,
      marketplaceListings: 999999,
    },
    features: [
      "Unlimited leads",
      "100,000 API calls",
      "Unlimited compliance",
      "Unlimited equipment & estimates",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
    ],
  },
];

function UsageGauge({ label, current, max, icon: Icon, color = "emerald" }) {
  const isUnlimited = max >= 999999;
  const pct = isUnlimited
    ? 0
    : max > 0
      ? Math.min((current / max) * 100, 100)
      : 0;
  const colorMap = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    orange: "bg-orange-500",
    purple: "bg-purple-500",
  };
  const barColor =
    pct > 90
      ? "bg-red-500"
      : pct > 75
        ? "bg-amber-500"
        : colorMap[color] || colorMap.emerald;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-sm text-gray-600">
          {current.toLocaleString()} /{" "}
          {isUnlimited ? "Unlimited" : max.toLocaleString()}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: isUnlimited ? "0%" : `${pct}%` }}
        />
      </div>
      {pct > 90 && !isUnlimited && (
        <p className="text-xs text-red-600">
          Approaching limit. Consider upgrading your plan.
        </p>
      )}
    </div>
  );
}

export default function DashboardBilling() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState({
    leads: 0,
    apiCalls: 0,
    compliance: 0,
    equipmentLookups: 0,
    solarEstimates: 0,
    marketplaceListings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        // Fetch subscription
        const subQ = query(
          collection(db, "subscriptions"),
          where("userId", "==", user.uid),
          limit(1),
        );
        const subSnap = await getDocs(subQ);
        if (!subSnap.empty) {
          setSubscription({
            id: subSnap.docs[0].id,
            ...subSnap.docs[0].data(),
          });
        }

        // Fetch current month usage
        const month = new Date().toISOString().slice(0, 7);
        const usageQ = query(
          collection(db, "usage_records"),
          where("userId", "==", user.uid),
          where("month", "==", month),
          limit(1),
        );
        const usageSnap = await getDocs(usageQ);
        if (!usageSnap.empty) {
          const u = usageSnap.docs[0].data();
          setUsage({
            leads: u.lead_count || 0,
            apiCalls: u.api_call_count || 0,
            compliance: u.compliance_check_count || 0,
            equipmentLookups: u.equipment_lookup_count || 0,
            solarEstimates: u.solar_estimate_count || 0,
            marketplaceListings: u.marketplace_listing_count || 0,
          });
        }
      } catch (err) {
        console.error("Failed to load billing:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const currentTier = subscription
    ? TIERS.find(
        (t) => t.name.toLowerCase() === (subscription.tier || "").toLowerCase(),
      ) || TIERS[0]
    : null;

  const nextBillingDate = subscription?.currentPeriodEnd?.toDate
    ? subscription.currentPeriodEnd.toDate().toLocaleDateString()
    : subscription?.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
      : null;

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-lg bg-gray-100" />
        <div className="h-40 rounded-xl bg-gray-100" />
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Billing</h1>

      {/* Current plan card */}
      {subscription ? (
        <div className="card-padded">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {subscription.tier || "Free"} Plan
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    subscription.status === "active"
                      ? "bg-green-100 text-green-700"
                      : subscription.status === "trialing"
                        ? "bg-blue-100 text-blue-700"
                        : subscription.status === "past_due"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {subscription.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                ${currentTier?.price || 0}/month
                {nextBillingDate && ` - Next billing: ${nextBillingDate}`}
              </p>
            </div>
            <a
              href="https://dashboard.stripe.com/test"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Manage Billing
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      ) : (
        <div className="card-padded text-center">
          <CreditCard className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No active subscription</p>
          <p className="text-xs text-gray-400">
            Choose a plan below to get started
          </p>
        </div>
      )}

      {/* Usage gauges */}
      <div className="card-padded">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Monthly Usage
        </h2>

        <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
          Data & Analysis
        </h3>
        <div className="mb-6 space-y-5">
          <UsageGauge
            label="Equipment Lookups"
            current={usage.equipmentLookups}
            max={currentTier?.limits.equipmentLookups || 10}
            icon={Search}
            color="blue"
          />
          <UsageGauge
            label="Compliance Checks"
            current={usage.compliance}
            max={currentTier?.limits.compliance || 3}
            icon={ShieldCheck}
            color="amber"
          />
          <UsageGauge
            label="Solar Estimates"
            current={usage.solarEstimates}
            max={currentTier?.limits.solarEstimates || 1}
            icon={Sun}
            color="orange"
          />
        </div>

        <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
          Operations
        </h3>
        <div className="space-y-5">
          <UsageGauge
            label="Leads"
            current={usage.leads}
            max={currentTier?.limits.leads || 5}
            icon={Users}
            color="emerald"
          />
          <UsageGauge
            label="API Calls"
            current={usage.apiCalls}
            max={currentTier?.limits.apiCalls || 50}
            icon={Activity}
            color="blue"
          />
          <UsageGauge
            label="Marketplace Listings"
            current={usage.marketplaceListings}
            max={currentTier?.limits.marketplaceListings || 1}
            icon={Store}
            color="purple"
          />
        </div>
      </div>

      {/* Plan comparison */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Plans</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {TIERS.map((tier) => {
            const isCurrent =
              subscription &&
              tier.name.toLowerCase() ===
                (subscription.tier || "").toLowerCase();
            return (
              <div
                key={tier.name}
                className={`relative rounded-xl border-2 p-6 ${
                  tier.popular
                    ? "border-emerald-500 shadow-lg"
                    : isCurrent
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-gray-200"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-medium text-white">
                      <Star className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {tier.name}
                  </h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">
                      ${tier.price}
                    </span>
                    <span className="text-sm text-gray-500">/month</span>
                  </div>
                </div>

                <ul className="mt-6 space-y-3">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    isCurrent
                      ? "cursor-default bg-gray-100 text-gray-500"
                      : tier.popular
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                  disabled={isCurrent}
                >
                  {isCurrent
                    ? "Current Plan"
                    : subscription
                      ? "Switch Plan"
                      : "Get Started"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
