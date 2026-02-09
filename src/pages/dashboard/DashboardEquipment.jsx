import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db, collection, query, getDocs, limit } from "../../services/firebase";
import DataTable from "../../components/ui/DataTable";
import FilterBar from "../../components/ui/FilterBar";
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
  ChevronRight,
  Package,
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
    <div className="bg-gray-50 px-4 py-4 border-t border-gray-200">
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
    </div>
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
  useAuth();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [filters, setFilters] = useState({});

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

  // Build FilterBar definitions from data
  const filterDefs = useMemo(() => {
    const subset =
      typeFilter === "all"
        ? equipment
        : equipment.filter((e) => e.type === typeFilter);

    const manufacturerOptions = [
      ...new Set(subset.map((e) => e.manufacturer).filter(Boolean)),
    ].sort();

    return [
      {
        key: "manufacturer",
        label: "Manufacturer",
        options: manufacturerOptions.map((m) => ({ value: m, label: m })),
      },
      {
        key: "feoc",
        label: "FEOC",
        options: [
          { value: "compliant", label: "FEOC Compliant" },
          { value: "non_compliant", label: "Non-Compliant" },
        ],
      },
      {
        key: "domestic",
        label: "Domestic Content",
        options: [
          { value: "gte50", label: "\u226550% US Content" },
          { value: "lt50", label: "<50% US Content" },
        ],
      },
      {
        key: "tariff",
        label: "Tariff",
        options: [
          { value: "safe", label: "Tariff Safe" },
          { value: "subject", label: "Subject to Tariff" },
        ],
      },
      {
        key: "availability",
        label: "Availability",
        options: [
          { value: "in_stock", label: "In Stock" },
          { value: "backorder", label: "Backorder" },
        ],
      },
    ];
  }, [equipment, typeFilter]);

  // Filter data (sorting is handled by DataTable)
  const filtered = useMemo(() => {
    let result = equipment;

    if (typeFilter !== "all") {
      result = result.filter((e) => e.type === typeFilter);
    }

    if (filters.manufacturer) {
      result = result.filter((e) => e.manufacturer === filters.manufacturer);
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

    if (filters.feoc === "compliant") {
      result = result.filter((e) => e.feoc_compliant === true);
    } else if (filters.feoc === "non_compliant") {
      result = result.filter((e) => e.feoc_compliant === false);
    }

    if (filters.domestic === "gte50") {
      result = result.filter(
        (e) => e.domestic_content_pct != null && e.domestic_content_pct >= 50,
      );
    } else if (filters.domestic === "lt50") {
      result = result.filter(
        (e) => e.domestic_content_pct != null && e.domestic_content_pct < 50,
      );
    }

    if (filters.tariff === "safe") {
      result = result.filter((e) => e.tariff_safe === true);
    } else if (filters.tariff === "subject") {
      result = result.filter((e) => e.tariff_safe === false);
    }

    if (filters.availability === "in_stock") {
      result = result.filter(
        (e) => e.availability && e.availability.toLowerCase().includes("stock"),
      );
    } else if (filters.availability === "backorder") {
      result = result.filter(
        (e) =>
          e.availability && e.availability.toLowerCase().includes("backorder"),
      );
    }

    return result;
  }, [equipment, typeFilter, filters, search]);

  const getTypeIcon = (type) => {
    const found = EQUIPMENT_TYPES.find((t) => t.value === type);
    return found ? found.icon : Package;
  };

  const getSpecValue = (item, col) => {
    const raw = item[col.key] ?? (col.altKey ? item[col.altKey] : null);
    if (raw == null) return null;
    return col.format ? col.format(raw) : String(raw);
  };

  const activeFiltersCount = Object.keys(filters).length;

  const clearAllFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setFilters({});
  };

  // DataTable column definitions
  const columns = useMemo(
    () => [
      {
        key: "_expand",
        label: "",
        sortable: false,
        render: (_val, row) => {
          const isExpanded = expandedId === row.id;
          return isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          );
        },
      },
      {
        key: "type",
        label: "Type",
        sortable: false,
        render: (_val, row) => {
          const TypeIcon = getTypeIcon(row.type);
          return (
            <span className="inline-flex items-center gap-1.5 text-gray-600">
              <TypeIcon className="h-4 w-4" />
              <span className="text-xs capitalize">
                {(row.type || "N/A").replace(/_/g, " ")}
              </span>
            </span>
          );
        },
      },
      {
        key: "manufacturer",
        label: "Manufacturer",
        sortable: true,
        render: (val) => (
          <span className="font-medium text-gray-900">{val || "N/A"}</span>
        ),
      },
      {
        key: "model",
        label: "Model",
        sortable: true,
        render: (val) => <span className="text-gray-700">{val || "N/A"}</span>,
      },
      {
        key: "_specs",
        label: "Specs",
        sortable: false,
        render: (_val, row) => {
          const cols = CATEGORY_COLUMNS[row.type] || [];
          return (
            <div className="flex flex-wrap gap-1">
              {cols.map((col) => {
                const v = getSpecValue(row, col);
                if (!v) return null;
                return (
                  <span
                    key={col.key}
                    className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                  >
                    {v}
                  </span>
                );
              })}
            </div>
          );
        },
      },
      {
        key: "feoc_compliant",
        label: "FEOC",
        sortable: false,
        render: (val) => (
          <ComplianceBadge
            value={val}
            trueLabel="FEOC Safe"
            falseLabel="FEOC Risk"
          />
        ),
      },
      {
        key: "domestic_content_pct",
        label: "Domestic",
        sortable: true,
        render: (val) => <DomesticBadge pct={val} />,
      },
      {
        key: "tariff_safe",
        label: "Tariff",
        sortable: false,
        render: (val) => (
          <ComplianceBadge value={val} trueLabel="Safe" falseLabel="Subject" />
        ),
      },
    ],
    [expandedId],
  );

  // Find the currently expanded item for the detail panel
  const expandedItem = useMemo(
    () => (expandedId ? filtered.find((e) => e.id === expandedId) : null),
    [expandedId, filtered],
  );

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
                setFilters((prev) => {
                  const next = { ...prev };
                  delete next.manufacturer;
                  return next;
                });
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

      {/* Search bar */}
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
        <span className="text-sm text-gray-500">{filtered.length} results</span>
        {(search || typeFilter !== "all" || activeFiltersCount > 0) && (
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {/* FilterBar */}
      <FilterBar
        filters={filterDefs}
        activeFilters={filters}
        onChange={setFilters}
      />

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(row) =>
          setExpandedId((prev) => (prev === row.id ? null : row.id))
        }
        emptyMessage={
          search || typeFilter !== "all" || activeFiltersCount > 0
            ? "No equipment matches your filters"
            : "No equipment data available"
        }
      />

      {/* Expanded detail panel */}
      {expandedItem && <ExpandedRow item={expandedItem} />}
    </div>
  );
}
