import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  DollarSign,
  CreditCard,
  Building2,
  AlertTriangle,
  Info,
  Calculator,
  CheckCircle2,
  XCircle,
} from "lucide-react";

function ComparisonColumn({
  title,
  icon: Icon,
  color,
  items,
  highlight,
  badge,
}) {
  const colorMap = {
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      icon: "bg-emerald-100 text-emerald-600",
      badge: "bg-emerald-100 text-emerald-700",
    },
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "bg-blue-100 text-blue-600",
      badge: "bg-blue-100 text-blue-700",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      icon: "bg-purple-100 text-purple-600",
      badge: "bg-purple-100 text-purple-700",
    },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <div
      className={`rounded-xl border p-6 ${highlight ? `${c.border} ${c.bg}` : "border-gray-200 bg-white"}`}
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.icon}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {badge && (
            <span
              className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${c.badge}`}
            >
              {badge}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2">
            {item.type === "pro" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
            ) : item.type === "con" ? (
              <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
            )}
            <p className="text-sm text-gray-700">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PortalFinancing() {
  useAuth();
  const [systemCost, setSystemCost] = useState(28000);
  const [loanRate, setLoanRate] = useState(6.99);
  const [leaseCostPerMonth, setLeaseCostPerMonth] = useState(125);
  const loanTerm = 25;

  // Calculations
  const monthlyLoanPayment =
    loanRate > 0
      ? (systemCost * (loanRate / 100 / 12)) /
        (1 - Math.pow(1 + loanRate / 100 / 12, -loanTerm * 12))
      : systemCost / (loanTerm * 12);
  const totalLoanCost = monthlyLoanPayment * loanTerm * 12;
  const totalLeaseCost = leaseCostPerMonth * loanTerm * 12;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Financing Comparison
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Compare your options for going solar
        </p>
      </div>

      {/* 2026 ITC Warning */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
        <div>
          <p className="text-sm font-medium text-amber-800">
            2026 Federal Tax Credit Changes
          </p>
          <p className="mt-1 text-sm text-amber-700">
            The residential Investment Tax Credit (ITC) ended on January 1,
            2026. Homeowners purchasing with cash or a loan no longer receive
            the federal tax credit. However, third-party owned systems
            (lease/PPA) can still claim the{" "}
            <span className="font-semibold">commercial ITC</span>, often passing
            savings to you through lower monthly payments.
          </p>
        </div>
      </div>

      {/* Calculator Inputs */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Adjust Your Numbers
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              System Cost
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                $
              </span>
              <input
                type="number"
                value={systemCost}
                onChange={(e) => setSystemCost(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-7 pr-4 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Loan APR (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={loanRate}
              onChange={(e) => setLoanRate(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 py-2.5 px-4 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Lease/PPA Monthly
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                $
              </span>
              <input
                type="number"
                value={leaseCostPerMonth}
                onChange={(e) => setLeaseCostPerMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-7 pr-4 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3-Column Comparison */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ComparisonColumn
          title="Cash Purchase"
          icon={DollarSign}
          color="emerald"
          items={[
            { type: "pro", text: "You own the system outright" },
            { type: "pro", text: "Maximum long-term savings" },
            { type: "pro", text: "Increases home value" },
            { type: "con", text: "No federal tax credit in 2026" },
            {
              type: "con",
              text: `High upfront cost: $${systemCost.toLocaleString()}`,
            },
            {
              type: "info",
              text: "Best for homeowners with available capital",
            },
          ]}
        />
        <ComparisonColumn
          title="Solar Loan"
          icon={CreditCard}
          color="blue"
          items={[
            { type: "pro", text: "No upfront cost" },
            { type: "pro", text: "You own the system" },
            {
              type: "pro",
              text: `~$${Math.round(monthlyLoanPayment)}/mo payment`,
            },
            { type: "con", text: "No federal tax credit in 2026" },
            {
              type: "con",
              text: `Total cost: $${Math.round(totalLoanCost).toLocaleString()} over ${loanTerm} years`,
            },
            {
              type: "info",
              text: "Good for homeowners who want ownership without upfront cost",
            },
          ]}
        />
        <ComparisonColumn
          title="Lease / PPA"
          icon={Building2}
          color="purple"
          highlight
          badge="Best value in 2026"
          items={[
            { type: "pro", text: "No upfront cost" },
            {
              type: "pro",
              text: "Commercial ITC still applies (provider passes savings)",
            },
            {
              type: "pro",
              text: `$${leaseCostPerMonth}/mo - often less than your electric bill`,
            },
            { type: "pro", text: "Maintenance included" },
            { type: "con", text: "You don't own the system" },
            {
              type: "con",
              text: `Total cost: $${totalLeaseCost.toLocaleString()} over ${loanTerm} years`,
            },
            {
              type: "info",
              text: "Now the dominant option post-2026 residential ITC expiration",
            },
          ]}
        />
      </div>

      {/* Cost Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          25-Year Cost Comparison
        </h2>
        <div className="space-y-3">
          {[
            { label: "Cash", amount: systemCost, color: "bg-emerald-500" },
            {
              label: "Loan",
              amount: Math.round(totalLoanCost),
              color: "bg-blue-500",
            },
            {
              label: "Lease/PPA",
              amount: totalLeaseCost,
              color: "bg-purple-500",
            },
          ].map((option) => {
            const maxCost = Math.max(systemCost, totalLoanCost, totalLeaseCost);
            const pct = maxCost > 0 ? (option.amount / maxCost) * 100 : 0;
            return (
              <div key={option.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">
                    {option.label}
                  </span>
                  <span className="font-semibold text-gray-900">
                    ${option.amount.toLocaleString()}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${option.color} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
