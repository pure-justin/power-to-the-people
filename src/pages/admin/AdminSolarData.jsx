import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db, collection, getDocs, limit, query } from "../../services/firebase";
import {
  Database,
  Search,
  RefreshCw,
  Zap,
  Building2,
  Award,
  FileCheck,
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

export default function AdminSolarData() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("equipment");
  const [data, setData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);

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
          const snap = await getDocs(query(ref, limit(200)));
          results[tab.key] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch (e) {
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

  const currentData = data[activeTab] || [];
  const filtered = currentData.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(item).some(
      (v) => typeof v === "string" && v.toLowerCase().includes(term),
    );
  });

  const getColumns = (tab) => {
    const colMap = {
      equipment: [
        { key: "manufacturer", label: "Manufacturer" },
        { key: "model", label: "Model" },
        { key: "type", label: "Type" },
        { key: "feoc_compliant", label: "FEOC" },
        { key: "domestic_content_compliant", label: "Domestic" },
        { key: "tariff_safe", label: "Tariff Safe" },
      ],
      utilities: [
        { key: "utility_name", label: "Utility" },
        { key: "state", label: "State" },
        { key: "rate_type", label: "Rate Type" },
        { key: "has_net_metering", label: "Net Metering" },
        { key: "avg_rate", label: "Avg Rate" },
      ],
      incentives: [
        { key: "name", label: "Name" },
        { key: "state", label: "State" },
        { key: "incentive_type", label: "Type" },
        { key: "amount", label: "Amount" },
        { key: "status", label: "Status" },
        { key: "sector", label: "Sector" },
      ],
      permits: [
        { key: "jurisdiction", label: "Jurisdiction" },
        { key: "state", label: "State" },
        { key: "county", label: "County" },
        { key: "permit_type", label: "Type" },
        { key: "fee", label: "Fee" },
      ],
    };
    return colMap[tab] || [];
  };

  const renderValue = (val, key) => {
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
    if (val === null || val === undefined)
      return <span className="text-gray-300">--</span>;
    if (typeof val === "number") {
      if (key === "avg_rate" || key === "fee" || key === "amount")
        return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      return val.toLocaleString();
    }
    if (typeof val === "object")
      return (
        <span className="text-xs text-gray-500">
          {JSON.stringify(val).substring(0, 50)}
        </span>
      );
    return String(val);
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
      {/* Count Cards / Tab Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = (data[tab.key] || []).length;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSearchTerm("");
                setExpandedRow(null);
              }}
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

      {/* Search & Refresh */}
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
          onClick={loadAllData}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500 mb-4">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Database size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">
              No {activeTab} data found
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Data will appear after import
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {getColumns(activeTab).map((col) => (
                    <th
                      key={col.key}
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.slice(0, 100).map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() =>
                      setExpandedRow(expandedRow === item.id ? null : item.id)
                    }
                  >
                    {getColumns(activeTab).map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-3 text-sm text-gray-700"
                      >
                        {renderValue(item[col.key], col.key)}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <ChevronDown
                        size={16}
                        className={`text-gray-400 transition-transform ${expandedRow === item.id ? "rotate-180" : ""}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Expanded Row Detail */}
            {expandedRow && (
              <div className="border-t border-gray-200 px-4 py-4 bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {Object.entries(
                    filtered.find((i) => i.id === expandedRow) || {},
                  )
                    .filter(([k]) => k !== "id")
                    .map(([k, v]) => (
                      <div key={k}>
                        <span className="text-xs text-gray-500 font-medium">
                          {k}
                        </span>
                        <p className="text-gray-900 font-medium truncate">
                          {typeof v === "boolean"
                            ? v
                              ? "Yes"
                              : "No"
                            : typeof v === "object"
                              ? JSON.stringify(v)
                              : String(v ?? "N/A")}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {filtered.length > 100 && (
              <p className="text-center text-sm text-gray-400 mt-4">
                Showing first 100 of {filtered.length} records
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
