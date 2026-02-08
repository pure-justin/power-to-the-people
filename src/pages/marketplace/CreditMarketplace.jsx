/**
 * Credit Marketplace -- Public credit listing browser
 *
 * IRA Section 6418 transferable tax credit marketplace.
 * Buyers can search, filter, and browse anonymized credits for purchase.
 * No seller identity revealed until a deal is agreed upon.
 */
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { searchCreditListings } from "../../services/taxCreditService";
import {
  Search,
  Filter,
  Star,
  Zap,
  MapPin,
  Calendar,
  ArrowUpDown,
  Shield,
  ShieldCheck,
  ChevronDown,
  RefreshCw,
  TrendingDown,
  DollarSign,
  Sun,
} from "lucide-react";

const CREDIT_TYPES = [
  { value: "", label: "All Types" },
  { value: "itc_commercial", label: "Commercial ITC (48E)" },
  { value: "ptc", label: "Production Tax Credit" },
  { value: "domestic_content_bonus", label: "Domestic Content Bonus" },
  { value: "energy_community_bonus", label: "Energy Community Bonus" },
];

const US_STATES = [
  "",
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
];

const VERIFICATION_LABELS = {
  1: { label: "Bronze", color: "text-amber-700 bg-amber-100", stars: 1 },
  2: { label: "Silver", color: "text-gray-600 bg-gray-100", stars: 2 },
  3: { label: "Gold", color: "text-yellow-700 bg-yellow-100", stars: 3 },
  4: { label: "Platinum", color: "text-indigo-700 bg-indigo-100", stars: 4 },
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "discount", label: "Best Discount" },
  { value: "verification", label: "Highest Verification" },
  { value: "largest", label: "Largest Credit" },
];

function VerificationBadge({ level }) {
  const config = VERIFICATION_LABELS[level] || VERIFICATION_LABELS[1];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}
    >
      {Array.from({ length: config.stars }).map((_, i) => (
        <Star key={i} className="h-3 w-3 fill-current" />
      ))}
      {config.label}
    </span>
  );
}

function CreditTypeLabel({ type }) {
  const labels = {
    itc_commercial: "Commercial ITC",
    itc_residential: "Residential ITC",
    ptc: "PTC",
    domestic_content_bonus: "DC Bonus",
    energy_community_bonus: "EC Bonus",
    low_income_bonus: "LI Bonus",
  };
  return (
    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
      {labels[type] || type}
    </span>
  );
}

export default function CreditMarketplace() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [creditType, setCreditType] = useState("");
  const [state, setState] = useState("");
  const [verificationLevel, setVerificationLevel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (creditType) filters.creditType = creditType;
      if (state) filters.state = state;
      if (verificationLevel)
        filters.verificationLevel = parseInt(verificationLevel);

      const result = await searchCreditListings(filters);
      setListings(result.listings || []);
    } catch (err) {
      console.error("Failed to load marketplace listings:", err);
      setError("Failed to load listings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [creditType, state, verificationLevel]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Client-side sort
  const sortedListings = [...listings].sort((a, b) => {
    switch (sortBy) {
      case "discount":
        return (b.listing?.discountRate || 0) - (a.listing?.discountRate || 0);
      case "verification":
        return (
          (b.verificationLevel?.level || 0) - (a.verificationLevel?.level || 0)
        );
      case "largest":
        return (b.listing?.creditAmount || 0) - (a.listing?.creditAmount || 0);
      case "newest":
      default:
        return 0; // Already sorted by createdAt desc from server
    }
  });

  // Client-side search filter
  const filteredListings = searchQuery
    ? sortedListings.filter((l) => {
        const q = searchQuery.toLowerCase();
        return (
          (l.projectSummary?.state || "").toLowerCase().includes(q) ||
          (l.listing?.creditType || "").toLowerCase().includes(q) ||
          (l.projectSummary?.projectType || "").toLowerCase().includes(q)
        );
      })
    : sortedListings;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Tax Credit Marketplace
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                IRA Section 6418 transferable clean energy tax credits
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-emerald-600" />
            </div>
          </div>

          {/* Search + Sort bar */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search credits by state, type, project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${
                  showFilters
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Filter className="h-4 w-4" />
                Filters
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${showFilters ? "rotate-180" : ""}`}
                />
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchListings}
                className="rounded-lg border border-gray-300 bg-white p-2 text-gray-500 hover:bg-gray-50"
                title="Refresh"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* Expandable filters */}
          {showFilters && (
            <div className="mt-3 grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Credit Type
                </label>
                <select
                  value={creditType}
                  onChange={(e) => setCreditType(e.target.value)}
                  className="input-field"
                >
                  {CREDIT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  State
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="input-field"
                >
                  <option value="">All States</option>
                  {US_STATES.filter(Boolean).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Verification Level
                </label>
                <select
                  value={verificationLevel}
                  onChange={(e) => setVerificationLevel(e.target.value)}
                  className="input-field"
                >
                  <option value="">Any Level</option>
                  <option value="4">Platinum (Level 4)</option>
                  <option value="3">Gold (Level 3)</option>
                  <option value="2">Silver (Level 2)</option>
                  <option value="1">Bronze (Level 1)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Results count */}
        <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            {filteredListings.length} credit
            {filteredListings.length !== 1 ? "s" : ""} available
          </span>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border bg-white p-6"
              >
                <div className="h-4 w-24 rounded bg-gray-100" />
                <div className="mt-4 h-8 w-32 rounded bg-gray-100" />
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full rounded bg-gray-100" />
                  <div className="h-3 w-2/3 rounded bg-gray-100" />
                </div>
                <div className="mt-4 h-10 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center">
            <Sun className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No credits listed yet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Check back soon or adjust your filters to see available credits.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((item) => (
              <Link
                key={item.id}
                to={`/marketplace/credits/${item.id}`}
                className="group rounded-xl border bg-white p-6 transition-shadow hover:shadow-md"
              >
                {/* Type + Verification */}
                <div className="flex items-center justify-between">
                  <CreditTypeLabel type={item.listing?.creditType} />
                  <VerificationBadge
                    level={item.verificationLevel?.level || 1}
                  />
                </div>

                {/* Credit amount + discount */}
                <div className="mt-4">
                  <p className="text-2xl font-bold text-gray-900">
                    ${(item.listing?.creditAmount || 0).toLocaleString()}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                      <TrendingDown className="h-3.5 w-3.5" />
                      {item.listing?.discountRate || 0}% discount
                    </span>
                    <span className="text-sm text-gray-400">|</span>
                    <span className="text-sm text-gray-500">
                      ${(item.listing?.askingPrice || 0).toLocaleString()}{" "}
                      asking
                    </span>
                  </div>
                </div>

                {/* Project details */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MapPin className="h-3.5 w-3.5" />
                    {item.projectSummary?.state || "Unknown"} --{" "}
                    {item.projectSummary?.systemSizeKw || 0} kW{" "}
                    {item.projectSummary?.projectType || ""}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    Credit Year:{" "}
                    {item.projectSummary?.creditYear ||
                      new Date().getFullYear()}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Shield className="h-3.5 w-3.5" />
                    Equipment:{" "}
                    {item.projectSummary?.equipmentOrigin || "Unknown"}
                  </div>
                </div>

                {/* Offers indicator */}
                {item.offerCount > 0 && (
                  <div className="mt-3 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                    {item.offerCount} active offer
                    {item.offerCount !== 1 ? "s" : ""}
                  </div>
                )}

                {/* CTA */}
                <div className="mt-4 rounded-lg bg-emerald-50 py-2 text-center text-sm font-medium text-emerald-700 group-hover:bg-emerald-100">
                  View Details
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
