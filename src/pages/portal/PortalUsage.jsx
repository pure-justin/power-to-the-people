import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  BarChart3,
  Zap,
  DollarSign,
  TrendingDown,
  Sun,
  Plug,
  Info,
} from "lucide-react";

// Static sample data for the placeholder chart
const SAMPLE_MONTHLY_DATA = [
  { month: "Jan", usage: 1150, solar: 820 },
  { month: "Feb", usage: 1020, solar: 880 },
  { month: "Mar", usage: 980, solar: 1050 },
  { month: "Apr", usage: 890, solar: 1200 },
  { month: "May", usage: 1050, solar: 1380 },
  { month: "Jun", usage: 1420, solar: 1450 },
  { month: "Jul", usage: 1680, solar: 1520 },
  { month: "Aug", usage: 1720, solar: 1480 },
  { month: "Sep", usage: 1350, solar: 1320 },
  { month: "Oct", usage: 1080, solar: 1100 },
  { month: "Nov", usage: 950, solar: 890 },
  { month: "Dec", usage: 1100, solar: 780 },
];

const MAX_KWH = 1800;

function BarChart({ data }) {
  return (
    <div className="flex items-end gap-2">
      {data.map((item) => (
        <div
          key={item.month}
          className="flex flex-1 flex-col items-center gap-1"
        >
          <div
            className="relative flex w-full flex-col items-center gap-0.5"
            style={{ height: 160 }}
          >
            {/* Solar bar */}
            <div
              className="w-full max-w-[24px] rounded-t bg-emerald-400"
              style={{ height: `${(item.solar / MAX_KWH) * 100}%` }}
              title={`Solar: ${item.solar} kWh`}
            />
            {/* Usage bar (behind) */}
            <div
              className="absolute bottom-0 w-full max-w-[32px] rounded-t bg-gray-200 opacity-40"
              style={{ height: `${(item.usage / MAX_KWH) * 100}%` }}
              title={`Usage: ${item.usage} kWh`}
            />
          </div>
          <span className="text-xs text-gray-500">{item.month}</span>
        </div>
      ))}
    </div>
  );
}

export default function PortalUsage() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("12m");

  const totalUsage = SAMPLE_MONTHLY_DATA.reduce((s, d) => s + d.usage, 0);
  const totalSolar = SAMPLE_MONTHLY_DATA.reduce((s, d) => s + d.solar, 0);
  const offsetPct = Math.round((totalSolar / totalUsage) * 100);
  const avgMonthlyRate = 0.12;
  const estimatedSavings = Math.round(totalSolar * avgMonthlyRate);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Energy Usage</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor your energy consumption and solar production
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <Info className="h-5 w-5 flex-shrink-0 text-blue-500" />
        <div>
          <p className="text-sm font-medium text-blue-800">
            SMT Data Integration Coming Soon
          </p>
          <p className="mt-0.5 text-sm text-blue-600">
            Connect your Smart Meter Texas account in Settings to see real usage
            data. The chart below shows sample data for illustration.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Plug className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Usage</p>
              <p className="text-lg font-bold text-gray-900">
                {totalUsage.toLocaleString()} kWh
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Sun className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Solar Production</p>
              <p className="text-lg font-bold text-gray-900">
                {totalSolar.toLocaleString()} kWh
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Zap className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Solar Offset</p>
              <p className="text-lg font-bold text-gray-900">{offsetPct}%</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Est. Savings</p>
              <p className="text-lg font-bold text-gray-900">
                ${estimatedSavings.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Monthly Overview
          </h2>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
            {["6m", "12m"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  timeRange === range
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {range === "6m" ? "6 Months" : "12 Months"}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mb-4 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-gray-200" />
            <span className="text-xs text-gray-500">Grid Usage</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-emerald-400" />
            <span className="text-xs text-gray-500">Solar Production</span>
          </div>
        </div>

        <BarChart
          data={
            timeRange === "6m"
              ? SAMPLE_MONTHLY_DATA.slice(6)
              : SAMPLE_MONTHLY_DATA
          }
        />
      </div>

      {/* Cost Breakdown */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Cost Breakdown
        </h2>
        <div className="space-y-3">
          {[
            {
              label: "Energy charges",
              amount: totalUsage * avgMonthlyRate,
              note: "Based on avg $0.12/kWh",
            },
            {
              label: "Solar credit",
              amount: -(totalSolar * avgMonthlyRate),
              note: "Net metering credits",
            },
            {
              label: "TDU delivery charges",
              amount: 480,
              note: "Estimated annual",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500">{item.note}</p>
              </div>
              <p
                className={`text-sm font-semibold ${item.amount < 0 ? "text-green-600" : "text-gray-900"}`}
              >
                {item.amount < 0 ? "-" : ""}$
                {Math.abs(item.amount).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-gray-200 px-4 pt-3">
            <p className="text-sm font-semibold text-gray-900">
              Estimated Net Annual Cost
            </p>
            <p className="text-sm font-bold text-gray-900">
              $
              {Math.round(
                totalUsage * avgMonthlyRate - totalSolar * avgMonthlyRate + 480,
              ).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
