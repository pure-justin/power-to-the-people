import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { BarChart3, Zap, Settings, ArrowRight, Plug } from "lucide-react";

export default function PortalUsage() {
  useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Energy Usage</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor your energy consumption and solar production
        </p>
      </div>

      {/* Empty State */}
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
          <Plug className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-gray-900">
          Connect Your Smart Meter
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
          Link your Smart Meter Texas (SMT) account to see real-time energy
          usage, solar production, and savings data. Once connected, this page
          will display your actual consumption and generation history.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/portal/settings"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            <Settings className="h-4 w-4" />
            Connect in Settings
          </Link>
        </div>
      </div>

      {/* What You'll See */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          What you'll see once connected
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Monthly Usage Charts
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Compare grid usage vs. solar production month by month.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
              <Zap className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Solar Offset Tracking
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                See what percentage of your energy comes from solar.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50">
              <ArrowRight className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Cost Breakdown
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Detailed breakdown of energy charges, solar credits, and net
                costs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
