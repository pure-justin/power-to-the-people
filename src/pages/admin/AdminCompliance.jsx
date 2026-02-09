import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db, collection, getDocs } from "../../services/firebase";
import {
  ShieldCheck,
  AlertTriangle,
  Calendar,
  CheckCircle,
  XCircle,
  MinusCircle,
  Search,
  Download,
  BarChart3,
  Flag,
} from "lucide-react";

const CRITICAL_DATES = [
  {
    date: "Feb 23, 2026",
    event: "Preliminary CVD Determination",
    status: "upcoming",
  },
  {
    date: "Mar 27, 2026",
    event: "Preliminary AD Determination",
    status: "upcoming",
  },
  { date: "Jun 1, 2026", event: "TDLR Licensing Deadline", status: "upcoming" },
  {
    date: "Dec 31, 2026",
    event: "Safe Harbor Deadline (IRA)",
    status: "upcoming",
  },
];

const TARIFF_RATES = [
  { country: "Cambodia", adRate: "125.37%", cvdRate: "0-8.25%" },
  { country: "Malaysia", adRate: "20.58-81.24%", cvdRate: "3.47-22.41%" },
  { country: "Thailand", adRate: "70.35-271.28%", cvdRate: "0.95-44.09%" },
  { country: "Vietnam", adRate: "56.49-3,403.96%", cvdRate: "2.85-292.61%" },
];

export default function AdminCompliance() {
  useAuth();
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    try {
      setLoading(true);
      const ref = collection(db, "solar_equipment");
      const snap = await getDocs(ref);
      setEquipment(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error loading equipment:", err);
    } finally {
      setLoading(false);
    }
  };

  const feocCompliant = equipment.filter(
    (e) => e.feoc_compliant === true,
  ).length;
  const feocPartial = equipment.filter(
    (e) => e.feoc_compliant === "partial",
  ).length;
  const feocNonCompliant = equipment.filter(
    (e) =>
      e.feoc_compliant === false ||
      (!e.feoc_compliant &&
        e.feoc_compliant !== true &&
        e.feoc_compliant !== "partial"),
  ).length;
  const dcCompliant = equipment.filter(
    (e) => e.domestic_content_compliant === true,
  ).length;
  const tariffSafe = equipment.filter((e) => e.tariff_safe === true).length;
  const flagged = equipment.filter(
    (e) => e.feoc_compliant === false || e.tariff_safe === false,
  ).length;

  const equipmentTypes = [
    ...new Set(
      equipment.map((e) => (e.type || "").toLowerCase()).filter(Boolean),
    ),
  ];

  const filtered = equipment.filter((e) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      (e.manufacturer || "").toLowerCase().includes(term) ||
      (e.model || "").toLowerCase().includes(term) ||
      (e.type || "").toLowerCase().includes(term);

    let matchesCompliance = true;
    if (complianceFilter === "feoc_pass")
      matchesCompliance = e.feoc_compliant === true;
    if (complianceFilter === "feoc_fail")
      matchesCompliance = e.feoc_compliant === false;
    if (complianceFilter === "domestic_pass")
      matchesCompliance = e.domestic_content_compliant === true;
    if (complianceFilter === "tariff_safe")
      matchesCompliance = e.tariff_safe === true;
    if (complianceFilter === "flagged")
      matchesCompliance = e.feoc_compliant === false || e.tariff_safe === false;

    const matchesType =
      typeFilter === "all" || (e.type || "").toLowerCase() === typeFilter;

    return matchesSearch && matchesCompliance && matchesType;
  });

  // Compliance breakdown by manufacturer
  const mfrBreakdown = {};
  equipment.forEach((e) => {
    const mfr = e.manufacturer || "Unknown";
    if (!mfrBreakdown[mfr])
      mfrBreakdown[mfr] = { total: 0, feoc: 0, domestic: 0, tariff: 0 };
    mfrBreakdown[mfr].total++;
    if (e.feoc_compliant) mfrBreakdown[mfr].feoc++;
    if (e.domestic_content_compliant) mfrBreakdown[mfr].domestic++;
    if (e.tariff_safe) mfrBreakdown[mfr].tariff++;
  });
  const topMfrs = Object.entries(mfrBreakdown)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8);

  const pct = (pass, total) => (total ? Math.round((pass / total) * 100) : 0);

  const handleExport = () => {
    const rows = [
      [
        "Manufacturer",
        "Model",
        "Type",
        "FEOC Compliant",
        "Domestic Content",
        "Tariff Safe",
      ],
      ...filtered.map((e) => [
        e.manufacturer || "",
        e.model || "",
        e.type || "",
        e.feoc_compliant ? "Yes" : "No",
        e.domestic_content_compliant ? "Yes" : "No",
        e.tariff_safe ? "Yes" : "No",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-audit-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const complianceIcon = (val) => {
    if (val === true)
      return <CheckCircle size={16} className="text-green-500" />;
    if (val === false) return <XCircle size={16} className="text-red-500" />;
    return <AlertTriangle size={16} className="text-amber-500" />;
  };

  const metricCards = [
    {
      label: "Total Equipment",
      value: equipment.length.toLocaleString(),
      icon: ShieldCheck,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "FEOC Compliant",
      value: `${pct(feocCompliant, equipment.length)}%`,
      sub: `${feocCompliant} of ${equipment.length}`,
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Domestic Content",
      value: `${pct(dcCompliant, equipment.length)}%`,
      sub: `${dcCompliant} of ${equipment.length}`,
      icon: Flag,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Flagged Items",
      value: flagged.toLocaleString(),
      icon: AlertTriangle,
      color: "bg-red-50 text-red-600",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {metricCards.map((m) => (
          <div
            key={m.label}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {m.label}
              </span>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.color}`}
              >
                <m.icon size={20} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-gray-900">
              {m.value}
            </div>
            {m.sub && <p className="text-xs text-gray-400 mt-1">{m.sub}</p>}
          </div>
        ))}
      </div>

      {/* Manufacturer Compliance Breakdown */}
      {topMfrs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-500" />
            Compliance by Manufacturer
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Manufacturer
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Products
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    FEOC
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Domestic
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Tariff Safe
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topMfrs.map(([mfr, d]) => (
                  <tr key={mfr} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">
                      {mfr}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">
                      {d.total}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${pct(d.feoc, d.total)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          {pct(d.feoc, d.total)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${pct(d.domestic, d.total)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          {pct(d.domestic, d.total)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${pct(d.tariff, d.total)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          {pct(d.tariff, d.total)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AD/CVD Tariff Tracker */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-500" />
          AD/CVD Tariff Rates (SE Asia)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Country
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  AD Rate
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  CVD Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {TARIFF_RATES.map((t) => (
                <tr key={t.country} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {t.country}
                  </td>
                  <td className="px-4 py-3 text-sm text-red-600 font-mono">
                    {t.adRate}
                  </td>
                  <td className="px-4 py-3 text-sm text-amber-600 font-mono">
                    {t.cvdRate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Critical Compliance Dates */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-purple-500" />
          Critical Compliance Dates
        </h3>
        <div className="space-y-3">
          {CRITICAL_DATES.map((d) => (
            <div
              key={d.event}
              className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
            >
              <div className="w-20 text-center">
                <p className="text-xs font-bold text-purple-600 bg-purple-50 rounded px-2 py-1">
                  {d.date.split(",")[0]}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{d.event}</p>
              </div>
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-700 capitalize">
                {d.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Equipment Audit Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h3 className="text-lg font-bold text-gray-900">Equipment Audit</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <select
              value={complianceFilter}
              onChange={(e) => setComplianceFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Compliance</option>
              <option value="feoc_pass">FEOC Compliant</option>
              <option value="feoc_fail">FEOC Non-Compliant</option>
              <option value="domestic_pass">Domestic Content</option>
              <option value="tariff_safe">Tariff Safe</option>
              <option value="flagged">Flagged</option>
            </select>
            {equipmentTypes.length > 0 && (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Types</option>
                {equipmentTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <ShieldCheck size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No equipment found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Manufacturer
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Model
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    FEOC
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Domestic
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Tariff Safe
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {e.manufacturer || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {e.model || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold capitalize bg-gray-100 text-gray-700">
                        {e.type || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {complianceIcon(e.feoc_compliant)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {complianceIcon(e.domestic_content_compliant)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {complianceIcon(e.tariff_safe)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
