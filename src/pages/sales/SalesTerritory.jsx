import { useAuth } from "../../contexts/AuthContext";
import {
  MapPin,
  Clock,
  Target,
  Users,
  TrendingUp,
  Layers,
  Navigation,
} from "lucide-react";

export default function SalesTerritory() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Territory Map</h1>
        <p className="mt-1 text-sm text-gray-500">
          View your assigned territory and lead locations
        </p>
      </div>

      {/* Coming Soon Banner */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
            <Navigation className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Territory Map Coming Soon
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              The territory map will show your assigned areas, lead locations,
              and help optimize your route planning. This feature is currently
              in development.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                "Interactive map view",
                "Lead pin locations",
                "Route optimization",
                "Territory boundaries",
                "Heat map overlay",
              ].map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
                >
                  <Clock className="h-3 w-3" />
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Map View</h2>
        </div>
        <div
          className="relative flex items-center justify-center bg-gray-50"
          style={{ minHeight: 400 }}
        >
          <div className="absolute inset-0 opacity-10">
            <div className="grid h-full w-full grid-cols-8 grid-rows-6">
              {Array.from({ length: 48 }).map((_, i) => (
                <div key={i} className="border border-gray-300" />
              ))}
            </div>
          </div>
          <div className="relative z-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <MapPin className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-lg font-medium text-gray-700">
              Map integration in progress
            </p>
            <p className="mt-1 text-sm text-gray-500">
              This will display an interactive map with your leads and territory
              boundaries
            </p>
          </div>
        </div>
      </div>

      {/* Territory Stats Placeholder */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Layers className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Territories</p>
              <p className="text-lg font-bold text-gray-400">--</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <MapPin className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Mapped Leads</p>
              <p className="text-lg font-bold text-gray-400">--</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Target className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Coverage</p>
              <p className="text-lg font-bold text-gray-400">--</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Density Score</p>
              <p className="text-lg font-bold text-gray-400">--</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
