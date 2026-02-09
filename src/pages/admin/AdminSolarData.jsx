import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { db, collection, getDocs } from "../../services/firebase";
import DataTable from "../../components/ui/DataTable";
import FilterBar from "../../components/ui/FilterBar";
import {
  Database,
  Search,
  RefreshCw,
  Zap,
  Building2,
  Award,
  FileCheck,
  Download,
  ShieldCheck,
  CheckCircle,
  Flag,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";

const TABS = [
  {
    key: "equipment",
    label: "Equipment",
    collection: "solar_equipment",
    icon: Zap,
  },
  {
    key: "utilities",
    label: "Utilities",
    collection: "solar_utility_rates",
    icon: Building2,
  },
  {
    key: "incentives",
    label: "Incentives",
    collection: "solar_incentives",
    icon: Award,
  },
  {
    key: "permits",
    label: "Permits",
    collection: "solar_permits",
    icon: FileCheck,
  },
];

// --- Rendering helpers ---

const boolBadge = (val) => {
  if (val === true)
    return (
      <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold">
        Yes
      </span>
    );
  if (val === false)
    return (
      <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-semibold">
        No
      </span>
    );
  if (val === "partial")
    return (
      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-semibold">
        Partial
      </span>
    );
  return <span className="text-gray-300">--</span>;
};

const currencyRender = (val) => {
  if (val == null) return <span className="text-gray-300">--</span>;
  if (typeof val === "number")
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return String(val);
};

const statusBadge = (val) => {
  if (!val) return <span className="text-gray-300">--</span>;
  const s = String(val).toLowerCase();
  const color =
    s === "active"
      ? "bg-green-100 text-green-700"
      : s === "expired"
        ? "bg-red-100 text-red-700"
        : "bg-gray-100 text-gray-600";
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${color}`}
    >
      {val}
    </span>
  );
};

const typeBadge = (val) => {
  if (!val) return <span className="text-gray-300">--</span>;
  return (
    <span className="px-2.5 py-1 rounded-md text-xs font-semibold capitalize bg-gray-100 text-gray-700">
      {val}
    </span>
  );
};

// --- Column definitions per tab ---

const TAB_COLUMNS = {
  equipment: [
    { key: "manufacturer", label: "Manufacturer" },
    { key: "model", label: "Model" },
    { key: "type", label: "Type", render: (v) => typeBadge(v) },
    { key: "feoc_compliant", label: "FEOC", render: (v) => boolBadge(v) },
    {
      key: "domestic_content_compliant",
      label: "Domestic",
      render: (v) => boolBadge(v),
    },
    { key: "tariff_safe", label: "Tariff Safe", render: (v) => boolBadge(v) },
    { key: "country_of_origin", label: "Origin" },
  ],
  utilities: [
    { key: "utility_name", label: "Utility" },
    { key: "state", label: "State" },
    { key: "rate_type", label: "Rate Type" },
    {
      key: "has_net_metering",
      label: "Net Metering",
      render: (v) => boolBadge(v),
    },
    { key: "avg_rate", label: "Avg Rate", render: (v) => currencyRender(v) },
  ],
  incentives: [
    { key: "name", label: "Name" },
    { key: "state", label: "State" },
    { key: "incentive_type", label: "Type", render: (v) => typeBadge(v) },
    { key: "amount", label: "Amount", render: (v) => currencyRender(v) },
    { key: "status", label: "Status", render: (v) => statusBadge(v) },
    { key: "sector", label: "Sector", render: (v) => typeBadge(v) },
  ],
  permits: [
    { key: "jurisdiction", label: "Jurisdiction" },
    { key: "state", label: "State" },
    { key: "county", label: "County" },
    { key: "permit_type", label: "Type", render: (v) => typeBadge(v) },
    { key: "fee", label: "Fee", render: (v) => currencyRender(v) },
  ],
};

// --- Extract unique sorted values from data for a given field ---

function uniqueValues(records, field) {
  const set = new Set();
  records.forEach((r) => {
    const v = r[field];
    if (v != null && v !== "")
      set.add(typeof v === "boolean" ? String(v) : String(v));
  });
  return [...set].sort();
}

function boolOptions(label) {
  return [
    { value: "true", label: `${label}: Yes` },
    { value: "false", label: `${label}: No` },
  ];
}

export default function AdminSolarData() {
  useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "equipment",
  );
  const [data, setData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState({});
  const [complianceOpen, setComplianceOpen] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const results = {};
      for (const tab of TABS) {
        try {
          const ref = collection(db, tab.collection);
          const snap = await getDocs(ref);
          results[tab.key] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch {
          results[tab.key] = [];
        }
      }
      setData(results);
    } catch (err) {
      console.error("Error loading solar data:", err);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (key) => {
    setActiveTab(key);
    setSearchTerm("");
    setActiveFilters({});
    setSearchParams({ tab: key });
  };

  const currentData = data[activeTab] || [];

  // --- Build dynamic filter definitions based on loaded data ---

  const filterDefs = useMemo(() => {
    if (!currentData.length) return [];
    const defs = {
      equipment: [
        {
          key: "manufacturer",
          label: "Manufacturer",
          options: uniqueValues(currentData, "manufacturer"),
        },
        {
          key: "type",
          label: "Type",
          options: uniqueValues(currentData, "type"),
        },
        { key: "feoc_compliant", label: "FEOC", options: boolOptions("FEOC") },
        {
          key: "domestic_content_compliant",
          label: "Domestic Content",
          options: boolOptions("Domestic"),
        },
        {
          key: "tariff_safe",
          label: "Tariff Safe",
          options: boolOptions("Tariff"),
        },
        {
          key: "country_of_origin",
          label: "Country",
          options: uniqueValues(currentData, "country_of_origin"),
        },
      ],
      utilities: [
        {
          key: "state",
          label: "State",
          options: uniqueValues(currentData, "state"),
        },
        {
          key: "rate_type",
          label: "Rate Type",
          options: uniqueValues(currentData, "rate_type"),
        },
        {
          key: "has_net_metering",
          label: "Net Metering",
          options: boolOptions("Net Metering"),
        },
      ],
      incentives: [
        {
          key: "state",
          label: "State",
          options: uniqueValues(currentData, "state"),
        },
        {
          key: "incentive_type",
          label: "Type",
          options: uniqueValues(currentData, "incentive_type"),
        },
        {
          key: "status",
          label: "Status",
          options: uniqueValues(currentData, "status"),
        },
        {
          key: "sector",
          label: "Sector",
          options: uniqueValues(currentData, "sector"),
        },
      ],
      permits: [
        {
          key: "state",
          label: "State",
          options: uniqueValues(currentData, "state"),
        },
        {
          key: "county",
          label: "County",
          options: uniqueValues(currentData, "county"),
        },
        {
          key: "permit_type",
          label: "Type",
          options: uniqueValues(currentData, "permit_type"),
        },
      ],
    };
    // Filter out empty option lists
    return (defs[activeTab] || []).filter((f) => f.options.length > 0);
  }, [currentData, activeTab]);

  // --- Apply search + filters ---

  const filtered = useMemo(() => {
    let items = currentData;

    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter((item) =>
        Object.values(item).some(
          (v) => typeof v === "string" && v.toLowerCase().includes(term),
        ),
      );
    }

    // Field-specific filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value == null) return;
      items = items.filter((item) => {
        const fieldVal = item[key];
        // Boolean fields stored as true/false but filter value is "true"/"false" string
        if (value === "true") return fieldVal === true;
        if (value === "false") return fieldVal === false;
        return (
          String(fieldVal ?? "").toLowerCase() === String(value).toLowerCase()
        );
      });
    });

    return items;
  }, [currentData, searchTerm, activeFilters]);

  // --- Compliance summary (Equipment tab only) ---

  const complianceStats = useMemo(() => {
    const eq = data.equipment || [];
    if (!eq.length) return null;
    const total = eq.length;
    const feoc = eq.filter((e) => e.feoc_compliant === true).length;
    const domestic = eq.filter(
      (e) => e.domestic_content_compliant === true,
    ).length;
    const tariff = eq.filter((e) => e.tariff_safe === true).length;
    const flagged = eq.filter(
      (e) => e.feoc_compliant === false || e.tariff_safe === false,
    ).length;
    const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
    return {
      total,
      feoc,
      domestic,
      tariff,
      flagged,
      feocPct: pct(feoc),
      domesticPct: pct(domestic),
      tariffPct: pct(tariff),
    };
  }, [data.equipment]);

  // --- CSV export ---

  const handleExport = () => {
    const cols = TAB_COLUMNS[activeTab] || [];
    const header = cols.map((c) => c.label);
    const rows = filtered.map((item) =>
      cols.map((c) => {
        const v = item[c.key];
        if (typeof v === "boolean") return v ? "Yes" : "No";
        if (v == null) return "";
        return String(v);
      }),
    );
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solar-${activeTab}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Compliance metric click → set filter ---

  const applyComplianceFilter = (key, value) => {
    setActiveFilters({ [key]: value });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded mb-3" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Bar / Count Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = (data[tab.key] || []).length;
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`rounded-xl border p-5 text-left transition-all hover:shadow-md ${
                activeTab === tab.key
                  ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {tab.label}
                </span>
                <Icon
                  size={20}
                  className={
                    activeTab === tab.key ? "text-emerald-600" : "text-gray-400"
                  }
                />
              </div>
              <div className="text-2xl font-extrabold text-gray-900">
                {count.toLocaleString()}
              </div>
              <p className="text-xs text-gray-400 mt-1">records</p>
            </button>
          );
        })}
      </div>

      {/* Compliance Summary Strip (Equipment tab only) */}
      {activeTab === "equipment" && complianceStats && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setComplianceOpen(!complianceOpen)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck size={16} className="text-blue-500" />
              Compliance Summary
            </h3>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${complianceOpen ? "rotate-180" : ""}`}
            />
          </button>
          {complianceOpen && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 pb-4">
              <button
                onClick={() => applyComplianceFilter("feoc_compliant", "true")}
                className="rounded-lg border border-gray-100 p-4 text-left hover:border-emerald-300 hover:bg-emerald-50 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    FEOC
                  </span>
                  <CheckCircle size={16} className="text-green-500" />
                </div>
                <div className="text-2xl font-extrabold text-gray-900">
                  {complianceStats.feocPct}%
                </div>
                <p className="text-xs text-gray-400">
                  {complianceStats.feoc} of {complianceStats.total}
                </p>
              </button>
              <button
                onClick={() =>
                  applyComplianceFilter("domestic_content_compliant", "true")
                }
                className="rounded-lg border border-gray-100 p-4 text-left hover:border-purple-300 hover:bg-purple-50 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    Domestic
                  </span>
                  <Flag size={16} className="text-purple-500" />
                </div>
                <div className="text-2xl font-extrabold text-gray-900">
                  {complianceStats.domesticPct}%
                </div>
                <p className="text-xs text-gray-400">
                  {complianceStats.domestic} of {complianceStats.total}
                </p>
              </button>
              <button
                onClick={() => applyComplianceFilter("tariff_safe", "true")}
                className="rounded-lg border border-gray-100 p-4 text-left hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    Tariff Safe
                  </span>
                  <ShieldCheck size={16} className="text-blue-500" />
                </div>
                <div className="text-2xl font-extrabold text-gray-900">
                  {complianceStats.tariffPct}%
                </div>
                <p className="text-xs text-gray-400">
                  {complianceStats.tariff} of {complianceStats.total}
                </p>
              </button>
              <button
                onClick={() => applyComplianceFilter("feoc_compliant", "false")}
                className="rounded-lg border border-gray-100 p-4 text-left hover:border-red-300 hover:bg-red-50 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    Flagged
                  </span>
                  <AlertTriangle size={16} className="text-red-500" />
                </div>
                <div className="text-2xl font-extrabold text-gray-900">
                  {complianceStats.flagged}
                </div>
                <p className="text-xs text-gray-400">items need attention</p>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter Bar */}
      {filterDefs.length > 0 && (
        <FilterBar
          filters={filterDefs}
          activeFilters={activeFilters}
          onChange={setActiveFilters}
        />
      )}

      {/* Search & Actions */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <button
          onClick={handleExport}
          disabled={!filtered.length}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Download size={16} />
          Export CSV
        </button>
        <button
          onClick={loadAllData}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Record count */}
      <p className="text-sm text-gray-500">
        {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        {Object.keys(activeFilters).length > 0 &&
          ` (filtered from ${currentData.length})`}
      </p>

      {/* Data Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Database size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No {activeTab} data found</p>
          <p className="text-sm text-gray-400 mt-1">
            {currentData.length > 0
              ? "Try adjusting your filters"
              : "Data will appear after import"}
          </p>
        </div>
      ) : (
        <DataTable
          columns={TAB_COLUMNS[activeTab] || []}
          data={filtered}
          emptyMessage={`No ${activeTab} data found`}
        />
      )}
    </div>
  );
}
