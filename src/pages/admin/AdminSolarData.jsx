import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db, collection, getDocs } from "../../services/firebase";
import {
  Database,
  Search,
  RefreshCw,
  Zap,
  Building2,
  Award,
  FileCheck,
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
        "manufacturer",
        "model",
        "type",
        "feoc_compliant",
        "domestic_content_compliant",
      ],
      utilities: ["utility_name", "state", "has_net_metering", "avg_rate"],
      incentives: ["incentive_type", "state", "status", "sector", "amount"],
      permits: ["state", "jurisdiction_id", "county", "requirements"],
    };
    return colMap[tab] || ["id"];
  };

  const renderValue = (val) => {
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
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-12" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-1.5 flex gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = (data[tab.key] || []).length;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSearchTerm("");
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-emerald-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon size={16} />
              {tab.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key
                    ? "bg-emerald-700 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {count}
              </span>
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
        <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500 mb-4">{filtered.length} records</p>

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
                      key={col}
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      {col.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.slice(0, 100).map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {getColumns(activeTab).map((col) => (
                      <td key={col} className="px-4 py-3 text-sm text-gray-700">
                        {renderValue(item[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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
