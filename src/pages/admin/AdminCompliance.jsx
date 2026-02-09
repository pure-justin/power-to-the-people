import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { db, collection, getDocs } from "../../services/firebase";
import DataTable from "../../components/ui/DataTable";
import FilterBar from "../../components/ui/FilterBar";
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
  ExternalLink,
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

  // Build filter definitions for FilterBar
  const auditFilterDefs = useMemo(() => {
    const defs = [
      {
        key: "compliance",
        label: "Compliance",
        options: [
          { value: "feoc_pass", label: "FEOC Compliant" },
          { value: "feoc_fail", label: "FEOC Non-Compliant" },
          { value: "domestic_pass", label: "Domestic Content" },
          { value: "tariff_safe", label: "Tariff Safe" },
          { value: "flagged", label: "Flagged" },
        ],
      },
    ];
    if (equipmentTypes.length > 0) {
      defs.push({
        key: "type",
        label: "Type",
        options: equipmentTypes.map((t) => ({
          value: t,
          label: t.charAt(0).toUpperCase() + t.slice(1),
        })),
      });
    }
    return defs;
  }, [equipmentTypes]);

  const [auditFilters, setAuditFilters] = useState({});

  const filtered = useMemo(() => {
    return equipment.filter((e) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        (e.manufacturer || "").toLowerCase().includes(term) ||
        (e.model || "").toLowerCase().includes(term) ||
        (e.type || "").toLowerCase().includes(term);

      let matchesCompliance = true;
      const cf = auditFilters.compliance;
      if (cf === "feoc_pass") matchesCompliance = e.feoc_compliant === true;
      if (cf === "feoc_fail") matchesCompliance = e.feoc_compliant === false;
      if (cf === "domestic_pass")
        matchesCompliance = e.domestic_content_compliant === true;
      if (cf === "tariff_safe") matchesCompliance = e.tariff_safe === true;
      if (cf === "flagged")
        matchesCompliance =
          e.feoc_compliant === false || e.tariff_safe === false;

      const tf = auditFilters.type;
      const matchesType = !tf || (e.type || "").toLowerCase() === tf;

      return matchesSearch && matchesCompliance && matchesType;
    });
  }, [equipment, searchTerm, auditFilters]);

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
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download size={14} />
              Export
            </button>
            <Link
              to="/admin/solar-data?tab=equipment"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              Full catalog
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>

        <FilterBar
          filters={auditFilterDefs}
          activeFilters={auditFilters}
          onChange={setAuditFilters}
        />

        <p className="text-sm text-gray-500">
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
        </p>

        <DataTable
          columns={[
            {
              key: "manufacturer",
              label: "Manufacturer",
              render: (v) => (
                <span className="font-semibold">{v || "N/A"}</span>
              ),
            },
            { key: "model", label: "Model" },
            {
              key: "type",
              label: "Type",
              render: (v) => (
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold capitalize bg-gray-100 text-gray-700">
                  {v || "N/A"}
                </span>
              ),
            },
            {
              key: "feoc_compliant",
              label: "FEOC",
              render: (v) => complianceIcon(v),
            },
            {
              key: "domestic_content_compliant",
              label: "Domestic",
              render: (v) => complianceIcon(v),
            },
            {
              key: "tariff_safe",
              label: "Tariff Safe",
              render: (v) => complianceIcon(v),
            },
          ]}
          data={filtered}
          emptyMessage="No equipment found"
        />
      </div>
    </div>
  );
}
