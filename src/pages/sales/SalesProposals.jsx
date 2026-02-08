import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  FileText,
  Sparkles,
  MapPin,
  Sun,
  Calculator,
  Clock,
  ArrowRight,
  Zap,
} from "lucide-react";

export default function SalesProposals() {
  const { user } = useAuth();
  const [address, setAddress] = useState("");
  const [systemSize, setSystemSize] = useState("");
  const [estimateResult, setEstimateResult] = useState(null);

  const handleQuickEstimate = (e) => {
    e.preventDefault();
    if (!address || !systemSize) return;

    const size = parseFloat(systemSize);
    if (isNaN(size) || size <= 0) return;

    // Quick estimate calculation
    const annualProduction = Math.round(size * 1350); // kWh per kW in Texas
    const avgRate = 0.12;
    const annualSavings = Math.round(annualProduction * avgRate);
    const estimatedCost = Math.round(size * 2800); // $2.80/W average
    const paybackYears =
      annualSavings > 0
        ? Math.round((estimatedCost / annualSavings) * 10) / 10
        : 0;

    setEstimateResult({
      address,
      systemSize: size,
      annualProduction,
      annualSavings,
      estimatedCost,
      paybackYears,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create and manage solar proposals for your leads
        </p>
      </div>

      {/* Coming Soon Banner */}
      <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
            <Sparkles className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Full Proposal Builder Coming Soon
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              The proposal builder will include automated system design,
              financing options, savings projections, and one-click PDF
              generation. For now, use the quick estimate tool below.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                "Auto system design",
                "Financing comparison",
                "PDF generation",
                "E-signature",
                "Customer portal link",
              ].map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700"
                >
                  <Clock className="h-3 w-3" />
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Estimate */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Quick Estimate
          </h2>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Enter an address and system size for a rough savings estimate.
        </p>
        <form onSubmit={handleQuickEstimate} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Property Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, San Antonio, TX 78201"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              System Size (kW)
            </label>
            <div className="relative">
              <Sun className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                step="0.1"
                value={systemSize}
                onChange={(e) => setSystemSize(e.target.value)}
                placeholder="e.g., 8.5"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!address || !systemSize}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Generate Estimate
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Estimate Result */}
      {estimateResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Quick Estimate Results
            </h2>
          </div>
          <p className="mb-4 text-sm text-gray-600">{estimateResult.address}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-4">
              <p className="text-xs text-gray-500">System Size</p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {estimateResult.systemSize} kW
              </p>
            </div>
            <div className="rounded-lg bg-white p-4">
              <p className="text-xs text-gray-500">Annual Production</p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {estimateResult.annualProduction.toLocaleString()} kWh
              </p>
            </div>
            <div className="rounded-lg bg-white p-4">
              <p className="text-xs text-gray-500">Annual Savings</p>
              <p className="mt-1 text-lg font-bold text-emerald-700">
                ${estimateResult.annualSavings.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-white p-4">
              <p className="text-xs text-gray-500">Est. System Cost</p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                ${estimateResult.estimatedCost.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                Estimated Payback Period
              </p>
              <p className="text-lg font-bold text-emerald-700">
                {estimateResult.paybackYears} years
              </p>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{
                  width: `${Math.min((estimateResult.paybackYears / 25) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Based on $2.80/W system cost and $0.12/kWh utility rate. Actual
              results may vary. No federal ITC included (2026).
            </p>
          </div>
        </div>
      )}

      {/* Recent Proposals Placeholder */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Proposals
          </h2>
        </div>
        <div className="px-6 py-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">
            Your generated proposals will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
