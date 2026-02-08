import { Link } from "react-router-dom";
import { Sun, Check, Zap, Shield, BarChart3 } from "lucide-react";

const TIERS = [
  {
    name: "Starter",
    price: 79,
    description: "For 1-2 person solar shops",
    features: [
      "50 leads/month",
      "1,000 API calls/month",
      "25 compliance checks/month",
      "Lead management CRM",
      "Mercury ACH invoicing",
      "SMS notifications",
      "Equipment compliance checker",
      "Referral tracking",
    ],
    cta: "Start free trial",
    popular: false,
  },
  {
    name: "Professional",
    price: 149,
    description: "For growing installers",
    features: [
      "200 leads/month",
      "10,000 API calls/month",
      "200 compliance checks/month",
      "Everything in Starter",
      "Solar estimate builder",
      "API key management",
      "Advanced lead scoring",
      "Bulk SMS campaigns",
      "Priority support",
    ],
    cta: "Start free trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: 299,
    description: "For large companies",
    features: [
      "Unlimited leads",
      "100,000 API calls/month",
      "Unlimited compliance checks",
      "Everything in Professional",
      "Custom API integrations",
      "White-label proposals",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom reporting",
    ],
    cta: "Contact sales",
    popular: false,
  },
];

const COMPARISON = [
  {
    feature: "Aurora Solar",
    price: "$220-259/mo/user",
    gap: "Design only, no CRM or compliance",
  },
  { feature: "Enerflo", price: "Volume-based", gap: "No compliance tools" },
  { feature: "OpenSolar", price: "Free", gap: "Limited features, no API" },
  {
    feature: "SolarOS",
    price: "$79-299/mo",
    gap: "Full-stack: CRM + compliance + API + invoicing",
    highlight: true,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Sun className="h-8 w-8 text-emerald-500" />
            <span className="text-xl font-bold">SolarOS</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Sign in
            </Link>
            <Link to="/signup" className="btn-primary text-sm">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          The only solar CRM with
          <br />
          <span className="text-emerald-500">built-in FEOC compliance</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
          Stop using 5 tools. CRM + design + compliance + invoicing + API in one
          platform. Built for the post-ITC 2026 solar market.
        </p>
      </section>

      {/* Tier Cards */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="grid gap-8 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border p-8 ${
                tier.popular
                  ? "border-emerald-500 ring-2 ring-emerald-500 shadow-lg"
                  : "border-gray-200"
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-xs font-medium text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-gray-900">
                {tier.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500">{tier.description}</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">
                  ${tier.price}
                </span>
                <span className="text-gray-500">/mo</span>
              </div>
              <Link
                to="/signup"
                className={`mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-medium transition-colors ${
                  tier.popular
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                }`}
              >
                {tier.cta}
              </Link>
              <ul className="mt-8 space-y-3">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Key Differentiators */}
      <section className="border-t border-gray-100 bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Why SolarOS?
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                <Shield className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">
                FEOC Compliance Engine
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Real-time equipment compliance tracking. Nobody else does this.
                FEOC, domestic content, AD/CVD tariffs — all automated.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">
                Full-Stack Platform
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                CRM, estimates, invoicing, API, SMS, referrals — all in one.
                Replace Aurora + Podio + QuickBooks + spreadsheets.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100">
                <BarChart3 className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">
                2026-Ready Economics
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Post-ITC savings calculations, lease/PPA comparisons, battery
                ROI with VPP revenue — accurate for today's market.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Competitive Comparison */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-gray-900">
          How we compare
        </h2>
        <div className="mt-8 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left font-medium text-gray-500">
                  Platform
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">
                  Price
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">
                  Coverage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {COMPARISON.map((row) => (
                <tr
                  key={row.feature}
                  className={row.highlight ? "bg-emerald-50" : ""}
                >
                  <td
                    className={`px-6 py-4 font-medium ${row.highlight ? "text-emerald-700" : "text-gray-900"}`}
                  >
                    {row.feature}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{row.price}</td>
                  <td
                    className={`px-6 py-4 ${row.highlight ? "font-medium text-emerald-700" : "text-gray-500"}`}
                  >
                    {row.gap}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-gray-100 bg-gray-900 py-16 text-center">
        <h2 className="text-3xl font-bold text-white">
          Ready to modernize your solar business?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-gray-400">
          Join the installers already using SolarOS to manage leads, check
          compliance, and close deals faster.
        </p>
        <Link
          to="/signup"
          className="btn-primary mt-8 inline-flex px-8 py-3 text-base"
        >
          Start your free trial
        </Link>
      </section>
    </div>
  );
}
