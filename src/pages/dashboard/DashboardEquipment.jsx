import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db, collection, query, getDocs, limit } from "../../services/firebase";
import {
  Search,
  Sun,
  Zap,
  Battery,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Package,
  SlidersHorizontal,
  ArrowUpDown,
  Cpu,
  Grid3X3,
  ShieldCheck,
  Cable,
  Monitor,
  CarFront,
  X,
} from "lucide-react";

const EQUIPMENT_TYPES = [
  { value: "all", label: "All Types", icon: Package },
  { value: "panel", label: "Panels", icon: Sun },
  { value: "inverter", label: "Inverters", icon: Zap },
  { value: "battery", label: "Batteries", icon: Battery },
  { value: "optimizer", label: "Optimizers", icon: Cpu },
  { value: "racking", label: "Racking", icon: Grid3X3 },
  { value: "rapid_shutdown", label: "Rapid Shutdown", icon: ShieldCheck },
  { value: "electrical_bos", label: "Electrical", icon: Cable },
  { value: "monitoring", label: "Monitoring", icon: Monitor },
  { value: "ev_charger", label: "EV Chargers", icon: CarFront },
];

const CATEGORY_COLUMNS = {
  panel: [
    { key: "wattage", label: "Wattage", format: (v) => (v ? `${v}W` : null) },
    {
      key: "efficiency",
      label: "Efficiency",
      format: (v) => (v ? `${v}%` : null),
    },
    { key: "cell_type", label: "Cell Type", altKey: "panel_type" },
  ],
  inverter: [
    {
      key: "power_rating",
      label: "Power Rating",
      altKey: "capacity",
      format: (v) => (v ? `${v}W` : null),
    },
    { key: "inverter_type", label: "Type" },
    {
      key: "phases",
      label: "Phases",
      format: (v) => (v ? `${v}-phase` : null),
    },
  ],
  battery: [
    {
      key: "capacity_kwh",
      label: "Capacity",
      altKey: "capacity",
      format: (v) => (v ? `${v} kWh` : null),
    },
    { key: "power_kw", label: "Power", format: (v) => (v ? `${v} kW` : null) },
    { key: "chemistry", label: "Chemistry" },
  ],
  optimizer: [
    {
      key: "max_power",
      label: "Max Power",
      format: (v) => (v ? `${v}W` : null),
    },
    { key: "voltage_range", label: "Voltage Range" },
  ],
  racking: [
    { key: "load_capacity", label: "Load Capacity" },
    { key: "racking_type", label: "Type" },
  ],
  rapid_shutdown: [
    { key: "compliance_standard", label: "Compliance Standard" },
  ],
  electrical_bos: [
    { key: "amperage", label: "Amperage", format: (v) => (v ? `${v}A` : null) },
    { key: "voltage", label: "Voltage", format: (v) => (v ? `${v}V` : null) },
  ],
  monitoring: [
    { key: "monitoring_type", label: "Type" },
    { key: "circuits", label: "Circuits" },
  ],
  ev_charger: [
    { key: "amperage", label: "Amperage", format: (v) => (v ? `${v}A` : null) },
    { key: "power_kw", label: "kW", format: (v) => (v ? `${v} kW` : null) },
    { key: "connector_type", label: "Connector" },
  ],
};

function ComplianceBadge({ value, label, trueLabel, falseLabel }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle2 className="h-3 w-3" />
        {trueLabel || label || "Compliant"}
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <XCircle className="h-3 w-3" />
        {falseLabel || "Non-Compliant"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
      <Info className="h-3 w-3" />
      Unknown
    </span>
  );
}

function ExpandedRow({ item }) {
  const supplyChain = [
    { label: "Country of Origin", value: item.country_of_origin },
    { label: "Assembly Location", value: item.assembly_location },
    { label: "PFE %", value: item.pfe_pct != null ? `${item.pfe_pct}%` : null },
    {
      label: "US Content %",
      value:
        item.domestic_content_pct != null
          ? `${item.domestic_content_pct}%`
          : null,
    },
  ].filter((s) => s.value);

  const pricing = [
    {
      label: "Wholesale",
      value: item.wholesale_price != null ? `$${item.wholesale_price}` : null,
    },
    {
      label: "Unit Price",
      value: item.unit_price != null ? `$${item.unit_price}` : null,
    },
    { label: "MSRP", value: item.msrp != null ? `$${item.msrp}` : null },
    { label: "Availability", value: item.availability },
  ].filter((s) => s.value);

  const allSpecs = Object.entries(item)
    .filter(
      ([k, v]) =>
        v != null &&
        ![
          "id",
          "type",
          "manufacturer",
          "model",
          "search_text",
          "feoc_compliant",
          "domestic_content_pct",
          "tariff_safe",
          "country_of_origin",
          "assembly_location",
          "pfe_pct",
          "wholesale_price",
          "unit_price",
          "msrp",
          "availability",
          "tags",
        ].includes(k),
    )
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <tr>
      <td colSpan={8} className="bg-gray-50 px-4 py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Specs */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase text-gray-400">
              Full Specs
            </h4>
            <dl className="space-y-1">
              {allSpecs.map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <dt className="text-gray-500">
                    {k
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </dt>
                  <dd className="font-medium text-gray-700">
                    {typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Supply Chain */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase text-gray-400">
              Supply Chain
            </h4>
            {supplyChain.length > 0 ? (
              <dl className="space-y-1">
                {supplyChain.map((s) => (
                  <div key={s.label} className="flex justify-between text-xs">
                    <dt className="text-gray-500">{s.label}</dt>
                    <dd className="font-medium text-gray-700">{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-xs text-gray-400">No supply chain data</p>
            )}
          </div>

          {/* Pricing & Tags */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase text-gray-400">
              Pricing
            </h4>
            {pricing.length > 0 ? (
              <dl className="space-y-1">
                {pricing.map((s) => (
                  <div key={s.label} className="flex justify-between text-xs">
                    <dt className="text-gray-500">{s.label}</dt>
                    <dd className="font-medium text-gray-700">{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-xs text-gray-400">No pricing data</p>
            )}
            {item.tags && item.tags.length > 0 && (
              <div className="mt-3">
                <h4 className="mb-1 text-xs font-semibold uppercase text-gray-400">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function DomesticBadge({ pct }) {
  if (pct == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
        <Info className="h-3 w-3" />
        N/A
      </span>
    );
  }
  const color =
    pct >= 50
      ? "bg-green-100 text-green-700"
      : pct >= 20
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";
  const Icon = pct >= 50 ? CheckCircle2 : pct >= 20 ? AlertTriangle : XCircle;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      <Icon className="h-3 w-3" />
      {pct}%
    </span>
  );
}

export default function DashboardEquipment() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [manufacturerFilter, setManufacturerFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [complianceFilters, setComplianceFilters] = useState({
    feoc: false,
    domestic: false,
    tariff: false,
  });
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  useEffect(() => {
    const loadEquipment = async () => {
      try {
        const q = query(collection(db, "solar_equipment"), limit(2000));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEquipment(data);
      } catch (err) {
        console.error("Failed to load equipment:", err);
      } finally {
        setLoading(false);
      }
    };
    loadEquipment();
  }, []);

  // Compute type counts from all equipment
  const typeCounts = useMemo(() => {
    const counts = { all: equipment.length };
    EQUIPMENT_TYPES.forEach((t) => {
      if (t.value !== "all") {
        counts[t.value] = equipment.filter((e) => e.type === t.value).length;
      }
    });
    return counts;
  }, [equipment]);

  // Compute manufacturers for current type filter
  const manufacturers = useMemo(() => {
    const subset =
      typeFilter === "all"
        ? equipment
        : equipment.filter((e) => e.type === typeFilter);
    return [
      ...new Set(subset.map((e) => e.manufacturer).filter(Boolean)),
    ].sort();
  }, [equipment, typeFilter]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = equipment;

    if (typeFilter !== "all") {
      result = result.filter((e) => e.type === typeFilter);
    }

    if (manufacturerFilter !== "all") {
      result = result.filter((e) => e.manufacturer === manufacturerFilter);
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (e) =>
          (e.search_text || "").toLowerCase().includes(s) ||
          (e.manufacturer || "").toLowerCase().includes(s) ||
          (e.model || "").toLowerCase().includes(s) ||
          (e.type || "").toLowerCase().includes(s) ||
          (e.country_of_origin || "").toLowerCase().includes(s),
      );
    }

    if (complianceFilters.feoc) {
      result = result.filter((e) => e.feoc_compliant === true);
    }
    if (complianceFilters.domestic) {
      result = result.filter(
        (e) => e.domestic_content_pct != null && e.domestic_content_pct >= 50,
      );
    }
    if (complianceFilters.tariff) {
      result = result.filter((e) => e.tariff_safe === true);
    }

    if (availabilityFilter === "in_stock") {
      result = result.filter(
        (e) => e.availability && e.availability.toLowerCase().includes("stock"),
      );
    } else if (availabilityFilter === "backorder") {
      result = result.filter(
        (e) =>
          e.availability && e.availability.toLowerCase().includes("backorder"),
      );
    }

    if (sortField) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortField] ?? "";
        const bVal = b[sortField] ?? "";
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        }
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [
    equipment,
    typeFilter,
    manufacturerFilter,
    search,
    complianceFilters,
    availabilityFilter,
    sortField,
    sortDir,
  ]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortHeader = ({ field, children }) => (
    <th
      className="cursor-pointer select-none px-4 py-3 text-left font-medium text-gray-500 hover:text-gray-700"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-gray-300" />
        )}
      </span>
    </th>
  );

  const getTypeIcon = (type) => {
    const found = EQUIPMENT_TYPES.find((t) => t.value === type);
    return found ? found.icon : Package;
  };

  const getSpecValue = (item, col) => {
    const raw = item[col.key] ?? (col.altKey ? item[col.altKey] : null);
    if (raw == null) return null;
    return col.format ? col.format(raw) : String(raw);
  };

  const activeFiltersCount =
    (complianceFilters.feoc ? 1 : 0) +
    (complianceFilters.domestic ? 1 : 0) +
    (complianceFilters.tariff ? 1 : 0) +
    (availabilityFilter !== "all" ? 1 : 0);

  const clearAllFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setManufacturerFilter("all");
    setComplianceFilters({ feoc: false, domestic: false, tariff: false });
    setAvailabilityFilter("all");
    setSortField(null);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded-lg bg-gray-100" />
        <div className="flex gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-24 rounded-lg bg-gray-100" />
          ))}
        </div>
        <div className="h-10 w-80 rounded-lg bg-gray-100" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Equipment Catalog</h1>
        <span className="text-sm text-gray-500">
          {equipment.length} items total
        </span>
      </div>

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-2">
        {EQUIPMENT_TYPES.map((type) => {
          const TypeIcon = type.icon;
          const count = typeCounts[type.value] || 0;
          return (
            <button
              key={type.value}
              onClick={() => {
                setTypeFilter(type.value);
                setManufacturerFilter("all");
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                typeFilter === type.value
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <TypeIcon className="h-4 w-4" />
              {type.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  typeFilter === type.value
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search equipment..."
            className="input-field pl-9"
          />
        </div>
        <select
          value={manufacturerFilter}
          onChange={(e) => setManufacturerFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All manufacturers</option>
          {manufacturers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            showFilters || activeFiltersCount > 0
              ? "bg-emerald-50 text-emerald-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-xs text-white">
              {activeFiltersCount}
            </span>
          )}
        </button>
        <span className="text-sm text-gray-500">{filtered.length} results</span>
        {(search ||
          typeFilter !== "all" ||
          manufacturerFilter !== "all" ||
          activeFiltersCount > 0) && (
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Filter sidebar panel */}
      {showFilters && (
        <div className="card space-y-4 border border-gray-200 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Compliance toggles */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-gray-400">
                Compliance
              </h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={complianceFilters.feoc}
                    onChange={(e) =>
                      setComplianceFilters((f) => ({
                        ...f,
                        feoc: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-gray-700">FEOC Compliant</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={complianceFilters.domestic}
                    onChange={(e) =>
                      setComplianceFilters((f) => ({
                        ...f,
                        domestic: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-gray-700">
                    Domestic Content &ge;50%
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={complianceFilters.tariff}
                    onChange={(e) =>
                      setComplianceFilters((f) => ({
                        ...f,
                        tariff: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-gray-700">Tariff Safe</span>
                </label>
              </div>
            </div>

            {/* Availability */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-gray-400">
                Availability
              </h4>
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="input-field w-full"
              >
                <option value="all">All</option>
                <option value="in_stock">In Stock</option>
                <option value="backorder">Backorder</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="w-8 px-2 py-3" />
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Type
                </th>
                <SortHeader field="manufacturer">Manufacturer</SortHeader>
                <SortHeader field="model">Model</SortHeader>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Specs
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  FEOC
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Domestic
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Tariff
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => {
                const TypeIcon = getTypeIcon(item.type);
                const isExpanded = expandedId === item.id;
                const cols = CATEGORY_COLUMNS[item.type] || [];
                return (
                  <>
                    <tr
                      key={item.id}
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-2 py-3 text-gray-400">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-gray-600">
                          <TypeIcon className="h-4 w-4" />
                          <span className="text-xs capitalize">
                            {(item.type || "N/A").replace(/_/g, " ")}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {item.manufacturer || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {item.model || "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {cols.map((col) => {
                            const val = getSpecValue(item, col);
                            if (!val) return null;
                            return (
                              <span
                                key={col.key}
                                className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                              >
                                {val}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ComplianceBadge
                          value={item.feoc_compliant}
                          trueLabel="FEOC Safe"
                          falseLabel="FEOC Risk"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <DomesticBadge pct={item.domestic_content_pct} />
                      </td>
                      <td className="px-4 py-3">
                        <ComplianceBadge
                          value={item.tariff_safe}
                          trueLabel="Safe"
                          falseLabel="Subject"
                        />
                      </td>
                    </tr>
                    {isExpanded && (
                      <ExpandedRow key={`${item.id}-detail`} item={item} />
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    <Package className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2">
                      {search ||
                      typeFilter !== "all" ||
                      manufacturerFilter !== "all" ||
                      activeFiltersCount > 0
                        ? "No equipment matches your filters"
                        : "No equipment data available"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
