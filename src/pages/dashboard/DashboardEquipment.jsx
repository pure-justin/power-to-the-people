import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "../../services/firebase";
import {
  Search,
  Filter,
  Sun,
  Zap,
  Battery,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
  Package,
} from "lucide-react";

const EQUIPMENT_TYPES = [
  { value: "all", label: "All Types", icon: Package },
  { value: "panel", label: "Panels", icon: Sun },
  { value: "inverter", label: "Inverters", icon: Zap },
  { value: "battery", label: "Batteries", icon: Battery },
];

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

export default function DashboardEquipment() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [manufacturerFilter, setManufacturerFilter] = useState("all");
  const [manufacturers, setManufacturers] = useState([]);

  useEffect(() => {
    const loadEquipment = async () => {
      try {
        const q = query(collection(db, "solar_equipment"), limit(2000));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEquipment(data);

        const mfrs = [
          ...new Set(data.map((e) => e.manufacturer).filter(Boolean)),
        ].sort();
        setManufacturers(mfrs);
      } catch (err) {
        console.error("Failed to load equipment:", err);
      } finally {
        setLoading(false);
      }
    };
    loadEquipment();
  }, []);

  useEffect(() => {
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
          (e.manufacturer || "").toLowerCase().includes(s) ||
          (e.model || "").toLowerCase().includes(s) ||
          (e.type || "").toLowerCase().includes(s) ||
          (e.country_of_origin || "").toLowerCase().includes(s),
      );
    }

    setFiltered(result);
  }, [equipment, search, typeFilter, manufacturerFilter]);

  // Get specs columns based on equipment type
  const getSpecs = (item) => {
    if (item.type === "panel") {
      return {
        Wattage: item.wattage ? `${item.wattage}W` : null,
        Efficiency: item.efficiency ? `${item.efficiency}%` : null,
        Type: item.panel_type || item.cell_type || null,
      };
    }
    if (item.type === "inverter") {
      return {
        Power: item.power_rating
          ? `${item.power_rating}W`
          : item.capacity
            ? `${item.capacity}W`
            : null,
        Type: item.inverter_type || null,
        Phases: item.phases ? `${item.phases}-phase` : null,
      };
    }
    if (item.type === "battery") {
      return {
        Capacity: item.capacity_kwh
          ? `${item.capacity_kwh} kWh`
          : item.capacity
            ? `${item.capacity} kWh`
            : null,
        Power: item.power_kw ? `${item.power_kw} kW` : null,
        Chemistry: item.chemistry || null,
      };
    }
    return {};
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "panel":
        return Sun;
      case "inverter":
        return Zap;
      case "battery":
        return Battery;
      default:
        return Package;
    }
  };

  // Count by type
  const panelCount = equipment.filter((e) => e.type === "panel").length;
  const inverterCount = equipment.filter((e) => e.type === "inverter").length;
  const batteryCount = equipment.filter((e) => e.type === "battery").length;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded-lg bg-gray-100" />
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
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
          const count =
            type.value === "all"
              ? equipment.length
              : type.value === "panel"
                ? panelCount
                : type.value === "inverter"
                  ? inverterCount
                  : batteryCount;
          return (
            <button
              key={type.value}
              onClick={() => setTypeFilter(type.value)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
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

      {/* Search and manufacturer filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by manufacturer, model..."
            className="input-field pl-9"
          />
        </div>
        <select
          value={manufacturerFilter}
          onChange={(e) => setManufacturerFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All manufacturers</option>
          {manufacturers
            .filter((m) => {
              if (typeFilter === "all") return true;
              return equipment.some(
                (e) => e.manufacturer === m && e.type === typeFilter,
              );
            })
            .map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
        </select>
        <span className="text-sm text-gray-500">{filtered.length} results</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Manufacturer
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Model
                </th>
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
                const specs = getSpecs(item);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-gray-600">
                        <TypeIcon className="h-4 w-4" />
                        <span className="capitalize text-xs">
                          {item.type || "N/A"}
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
                        {Object.entries(specs)
                          .filter(([, v]) => v)
                          .map(([k, v]) => (
                            <span
                              key={k}
                              className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                            >
                              {v}
                            </span>
                          ))}
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
                      {item.domestic_content_pct !== undefined ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.domestic_content_pct >= 50
                              ? "bg-green-100 text-green-700"
                              : item.domestic_content_pct >= 20
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.domestic_content_pct >= 50 ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : item.domestic_content_pct >= 20 ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {item.domestic_content_pct}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          <Info className="h-3 w-3" />
                          N/A
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ComplianceBadge
                        value={item.tariff_safe}
                        trueLabel="Safe"
                        falseLabel="Subject"
                      />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    <Package className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2">
                      {search ||
                      typeFilter !== "all" ||
                      manufacturerFilter !== "all"
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
