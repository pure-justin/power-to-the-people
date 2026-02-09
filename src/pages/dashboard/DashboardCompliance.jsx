import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db, collection, query, getDocs, limit } from "../../services/firebase";
import {
  checkEquipmentCompliance,
  getComplianceScore,
  getDomesticContentPercentage,
} from "../../services/complianceService";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Plus,
  X,
  RefreshCw,
  ArrowRightLeft,
  DollarSign,
  Globe,
  Percent,
  Zap,
  Lightbulb,
} from "lucide-react";
import DataTable from "../../components/ui/DataTable";
import FilterBar from "../../components/ui/FilterBar";

const EQUIPMENT_TYPES = [
  { value: "panel", label: "Solar Panel" },
  { value: "inverter", label: "Inverter" },
  { value: "battery", label: "Battery" },
  { value: "optimizer", label: "Optimizer" },
  { value: "racking", label: "Racking" },
  { value: "monitoring", label: "Monitoring" },
];

const PROJECT_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "tpo", label: "TPO (Third-Party Owned)" },
];

const FINANCING_TYPES = [
  { value: "cash", label: "Cash Purchase" },
  { value: "loan", label: "Solar Loan" },
  { value: "lease", label: "Lease" },
  { value: "ppa", label: "PPA (Power Purchase Agreement)" },
];

const US_STATES = [
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

// Known FEOC entities for client-side flagging
const KNOWN_FEOC_ENTITIES = [
  "catl",
  "byd",
  "longi",
  "ja solar",
  "trina",
  "jinko",
  "risen",
  "canadian solar",
  "csi solar",
  "tongwei",
  "apsystems",
  "growatt",
  "sungrow",
  "huawei",
];

// Type weights for domestic content calculation
const TYPE_WEIGHTS = {
  panel: 0.5,
  inverter: 0.2,
  battery: 0.2,
  optimizer: 0.05,
  racking: 0.03,
  monitoring: 0.02,
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

function ComplianceBadge({ status, label, size = "sm" }) {
  const styles = {
    compliant: "bg-green-100 text-green-700",
    partial: "bg-amber-100 text-amber-700",
    "non-compliant": "bg-red-100 text-red-700",
    non_compliant: "bg-red-100 text-red-700",
    unknown: "bg-gray-100 text-gray-500",
  };
  const icons = {
    compliant: CheckCircle2,
    partial: AlertTriangle,
    "non-compliant": XCircle,
    non_compliant: XCircle,
    unknown: Info,
  };
  const Icon = icons[status] || icons.unknown;
  const sizeClasses =
    size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses} ${styles[status] || styles.unknown}`}
    >
      <Icon className={size === "lg" ? "h-4 w-4" : "h-3 w-3"} />
      {label}
    </span>
  );
}

function FEOCStatusBadge({ status }) {
  const config = {
    compliant: {
      color: "border-green-200 bg-green-50",
      label: "FEOC Compliant",
      Icon: ShieldCheck,
      iconColor: "text-green-600",
    },
    partial: {
      color: "border-amber-200 bg-amber-50",
      label: "Partially Compliant",
      Icon: ShieldAlert,
      iconColor: "text-amber-600",
    },
    non_compliant: {
      color: "border-red-200 bg-red-50",
      label: "FEOC Non-Compliant",
      Icon: ShieldX,
      iconColor: "text-red-600",
    },
    unknown: {
      color: "border-gray-200 bg-gray-50",
      label: "Unknown Status",
      Icon: Info,
      iconColor: "text-gray-500",
    },
  };
  const c = config[status] || config.unknown;
  return (
    <div className={`rounded-xl border-2 p-6 text-center ${c.color}`}>
      <c.Icon className={`mx-auto h-14 w-14 ${c.iconColor}`} />
      <p className="mt-2 text-lg font-bold text-gray-900">{c.label}</p>
    </div>
  );
}

function ProgressBar({ value, threshold, label }) {
  const pct = Math.min(100, Math.max(0, value));
  const thresholdPct = Math.min(100, Math.max(0, threshold));
  const passes = value >= threshold;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span
          className={
            passes
              ? "font-semibold text-green-600"
              : "font-semibold text-red-600"
          }
        >
          {value}%
        </span>
      </div>
      <div className="relative h-4 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${passes ? "bg-green-500" : "bg-red-400"}`}
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-gray-800"
          style={{ left: `${thresholdPct}%` }}
          title={`${threshold}% threshold`}
        />
      </div>
      <p className="mt-0.5 text-xs text-gray-500">
        Threshold: {threshold}% {passes ? "(met)" : "(not met)"}
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DashboardCompliance() {
  useAuth();

  // Equipment catalog from Firestore
  const [allEquipment, setAllEquipment] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // Equipment selector state
  const [selectorType, setSelectorType] = useState("panel");
  const [selectorMfr, setSelectorMfr] = useState("");
  const [selectorModel, setSelectorModel] = useState("");
  const [filteredModels, setFilteredModels] = useState([]);

  // System builder — selected equipment list
  const [selectedItems, setSelectedItems] = useState([]);

  // Project context
  const [projectType, setProjectType] = useState("residential");
  const [financingType, setFinancingType] = useState("lease");
  const [state, setState] = useState("TX");
  const [systemCost, setSystemCost] = useState("");

  // Compliance report
  const [report, setReport] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // What-if replacement state
  const [replacingIndex, setReplacingIndex] = useState(null);

  // ── Load equipment catalog ──
  useEffect(() => {
    const loadEquipment = async () => {
      try {
        const q = query(collection(db, "solar_equipment"), limit(1000));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllEquipment(data);
        const mfrs = [
          ...new Set(data.map((e) => e.manufacturer).filter(Boolean)),
        ].sort();
        setManufacturers(mfrs);
      } catch (err) {
        console.error("Failed to load equipment:", err);
      } finally {
        setInitialLoading(false);
      }
    };
    loadEquipment();
  }, []);

  // ── Filter models when selector type/manufacturer change ──
  useEffect(() => {
    let filtered = allEquipment;
    if (selectorType)
      filtered = filtered.filter((e) => e.type === selectorType);
    if (selectorMfr)
      filtered = filtered.filter((e) => e.manufacturer === selectorMfr);
    setFilteredModels(filtered);
    setSelectorModel("");
  }, [selectorType, selectorMfr, allEquipment]);

  // ── Add equipment to system ──
  const addEquipment = useCallback(() => {
    if (!selectorModel) return;
    const found = allEquipment.find(
      (e) =>
        e.type === selectorType &&
        e.manufacturer === selectorMfr &&
        e.model === selectorModel,
    );
    if (found && !selectedItems.some((s) => s.id === found.id)) {
      setSelectedItems((prev) => [...prev, found]);
      setSelectorModel("");
      setReport(null); // Clear previous report
    }
  }, [selectorModel, selectorType, selectorMfr, allEquipment, selectedItems]);

  // ── Remove equipment from system ──
  const removeEquipment = useCallback((index) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
    setReport(null);
  }, []);

  // ── Replace equipment (what-if) ──
  const replaceEquipment = useCallback((index, newItem) => {
    setSelectedItems((prev) => {
      const updated = [...prev];
      updated[index] = newItem;
      return updated;
    });
    setReplacingIndex(null);
    setReport(null);
  }, []);

  // ── Run compliance analysis (client-side using complianceService) ──
  const runAnalysis = useCallback(() => {
    if (selectedItems.length === 0) return;
    setAnalyzing(true);

    // Use a timeout to avoid blocking UI
    setTimeout(() => {
      try {
        // Build components array for compliance service
        const components = selectedItems.map((item) => ({
          manufacturer: item.manufacturer || "",
          country: extractCountryCode(item),
          type: item.type || "unknown",
          cost:
            item.pricing?.wholesale_per_unit || item.price_estimate_usd || 0,
        }));

        // Get overall compliance score
        const scoreResult = getComplianceScore(components);

        // Get domestic content details
        const domesticResult = getDomesticContentPercentage(components);

        // Per-equipment analysis
        const perEquipment = selectedItems.map((item) => {
          const comp = checkEquipmentCompliance({
            manufacturer: item.manufacturer || "",
            country: extractCountryCode(item),
            type: item.type || "unknown",
            cost:
              item.pricing?.wholesale_per_unit || item.price_estimate_usd || 0,
          });
          return {
            ...comp,
            id: item.id,
            model: item.model,
            name: item.name || item.model,
          };
        });

        // Calculate ITC eligibility
        const itc = calculateITC(
          projectType,
          financingType,
          scoreResult.feoc_all_pass,
          domesticResult.meets_threshold,
          parseFloat(systemCost) || 0,
        );

        // Calculate tariff exposure
        const tariffExposure = perEquipment
          .filter((e) => !e.tariff_safe && e.tariff_details?.tariff_rate > 0)
          .map((e) => ({
            id: e.id,
            name: `${e.manufacturer} ${e.name || e.model}`,
            country: e.tariff_details?.country_name || e.country,
            tariff_type: e.tariff_details?.notes || "AD/CVD",
            rate: e.tariff_details?.tariff_rate || 0,
            cost_impact: e.cost_impact || 0,
          }));

        // Generate recommendations
        const recommendations = generateRecommendations(
          perEquipment,
          scoreResult,
          domesticResult,
          itc,
          tariffExposure,
          projectType,
          financingType,
        );

        // Determine FEOC status
        let feocStatus = "unknown";
        if (scoreResult.feoc_all_pass) feocStatus = "compliant";
        else if (
          perEquipment.some((e) => e.feoc_compliant) &&
          perEquipment.some((e) => !e.feoc_compliant)
        )
          feocStatus = "partial";
        else if (perEquipment.some((e) => !e.feoc_compliant))
          feocStatus = "non_compliant";

        setReport({
          feocStatus,
          feocDetails: perEquipment,
          domesticContent: {
            score: domesticResult.percentage,
            threshold: 50,
            eligible: domesticResult.meets_threshold,
          },
          itc,
          tariffExposure,
          recommendations,
          overallScore: scoreResult,
        });
      } catch (err) {
        console.error("Compliance analysis error:", err);
      } finally {
        setAnalyzing(false);
      }
    }, 100);
  }, [selectedItems, projectType, financingType, state, systemCost]);

  // ── FEOC table filters, columns, filtered data ──
  const [feocFilters, setFeocFilters] = useState({});

  const feocFilterDefs = useMemo(() => {
    const details = report?.feocDetails || [];
    const types = [
      ...new Set(details.map((d) => d.type).filter(Boolean)),
    ].sort();
    const feocStatuses = [
      { value: "pass", label: "Pass" },
      { value: "fail", label: "Fail" },
    ];
    const tariffStatuses = [
      { value: "safe", label: "Safe" },
      { value: "exposed", label: "Exposed" },
    ];
    return [
      {
        key: "type",
        label: "Type",
        options: types.map((t) => ({
          value: t,
          label: t.charAt(0).toUpperCase() + t.slice(1),
        })),
      },
      { key: "feoc", label: "FEOC", options: feocStatuses },
      { key: "tariff", label: "Tariff", options: tariffStatuses },
    ];
  }, [report?.feocDetails]);

  const filteredFeocDetails = useMemo(() => {
    let items = report?.feocDetails || [];
    if (feocFilters.type) {
      items = items.filter((d) => d.type === feocFilters.type);
    }
    if (feocFilters.feoc) {
      items = items.filter((d) =>
        feocFilters.feoc === "pass" ? d.feoc_compliant : !d.feoc_compliant,
      );
    }
    if (feocFilters.tariff) {
      items = items.filter((d) =>
        feocFilters.tariff === "safe" ? d.tariff_safe : !d.tariff_safe,
      );
    }
    return items;
  }, [report?.feocDetails, feocFilters]);

  const feocColumns = useMemo(
    () => [
      {
        key: "manufacturer",
        label: "Equipment",
        sortable: true,
        render: (_val, row) => (
          <div>
            <p className="font-medium text-gray-900">{row.manufacturer}</p>
            <p className="text-xs text-gray-500">{row.name || row.model}</p>
            <span className="rounded bg-gray-100 px-1 text-[10px] uppercase text-gray-500">
              {row.type}
            </span>
          </div>
        ),
      },
      {
        key: "feoc_compliant",
        label: "FEOC",
        sortable: true,
        render: (_val, row) => (
          <ComplianceBadge
            status={row.feoc_compliant ? "compliant" : "non-compliant"}
            label={row.feoc_compliant ? "Pass" : "Fail"}
          />
        ),
      },
      {
        key: "domestic_content_pct",
        label: "Domestic %",
        sortable: true,
        render: (val) => (
          <span
            className={`font-medium ${val >= 50 ? "text-green-600" : "text-amber-600"}`}
          >
            {val}%
          </span>
        ),
      },
      {
        key: "tariff_safe",
        label: "Tariff",
        sortable: true,
        render: (_val, row) => (
          <ComplianceBadge
            status={row.tariff_safe ? "compliant" : "non-compliant"}
            label={row.tariff_safe ? "Safe" : "Exposed"}
          />
        ),
      },
      {
        key: "feoc_details",
        label: "Details",
        sortable: false,
        render: (_val, row) => (
          <span className="text-xs text-gray-500">
            {row.feoc_details?.reason ||
              (row.feoc_compliant
                ? "FEOC-compliant"
                : "FEOC entity or manufactured in FEOC country")}
          </span>
        ),
      },
    ],
    [],
  );

  // ── Tariff Exposure table filters, columns, filtered data ──
  const [tariffFilters, setTariffFilters] = useState({});

  const tariffFilterDefs = useMemo(() => {
    const items = report?.tariffExposure || [];
    const countries = [
      ...new Set(items.map((t) => t.country).filter(Boolean)),
    ].sort();
    const tariffTypes = [
      ...new Set(items.map((t) => t.tariff_type).filter(Boolean)),
    ].sort();
    return [
      {
        key: "country",
        label: "Origin",
        options: countries.map((c) => ({ value: c, label: c })),
      },
      {
        key: "tariff_type",
        label: "Tariff Type",
        options: tariffTypes.map((t) => ({ value: t, label: t })),
      },
    ];
  }, [report?.tariffExposure]);

  const filteredTariffExposure = useMemo(() => {
    let items = report?.tariffExposure || [];
    if (tariffFilters.country) {
      items = items.filter((t) => t.country === tariffFilters.country);
    }
    if (tariffFilters.tariff_type) {
      items = items.filter((t) => t.tariff_type === tariffFilters.tariff_type);
    }
    return items;
  }, [report?.tariffExposure, tariffFilters]);

  const tariffColumns = useMemo(
    () => [
      {
        key: "name",
        label: "Equipment",
        sortable: true,
        render: (val) => (
          <span className="font-medium text-gray-900">{val}</span>
        ),
      },
      {
        key: "country",
        label: "Origin",
        sortable: true,
        render: (val) => <span className="text-gray-600">{val}</span>,
      },
      {
        key: "tariff_type",
        label: "Tariff Type",
        sortable: true,
        render: (val) => <span className="text-gray-600">{val}</span>,
      },
      {
        key: "rate",
        label: "Rate",
        sortable: true,
        render: (val) => (
          <span className="font-medium text-red-600">{val}%</span>
        ),
      },
      {
        key: "cost_impact",
        label: "Est. Cost Impact",
        sortable: true,
        render: (val) => (
          <span className="font-medium text-red-600">
            {val > 0 ? `$${val.toLocaleString()}` : "-"}
          </span>
        ),
      },
    ],
    [],
  );

  // ── Loading state ──
  if (initialLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 rounded-lg bg-gray-100" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 rounded-xl bg-gray-100" />
          <div className="h-64 rounded-xl bg-gray-100" />
        </div>
        <div className="h-48 rounded-xl bg-gray-100" />
      </div>
    );
  }

  // Get compliant alternatives for a given equipment type
  const getCompliantAlternatives = (type) => {
    return allEquipment
      .filter(
        (e) =>
          e.type === type &&
          e.feoc_compliant === true &&
          !selectedItems.some((s) => s.id === e.id),
      )
      .slice(0, 5);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Engine</h1>
        <ShieldCheck className="h-6 w-6 text-emerald-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Equipment System Builder ── */}
        <div className="card-padded space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900">
            System Builder
          </h2>
          <p className="text-xs text-gray-500">
            Select equipment for your solar system to analyze compliance.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Type
              </label>
              <select
                value={selectorType}
                onChange={(e) => {
                  setSelectorType(e.target.value);
                  setSelectorMfr("");
                }}
                className="input-field"
              >
                {EQUIPMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Manufacturer
              </label>
              <select
                value={selectorMfr}
                onChange={(e) => setSelectorMfr(e.target.value)}
                className="input-field"
              >
                <option value="">All manufacturers</option>
                {manufacturers
                  .filter(
                    (m) =>
                      !selectorType ||
                      allEquipment.some(
                        (e) => e.manufacturer === m && e.type === selectorType,
                      ),
                  )
                  .map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Model
              </label>
              <div className="flex gap-2">
                <select
                  value={selectorModel}
                  onChange={(e) => setSelectorModel(e.target.value)}
                  className="input-field"
                  disabled={filteredModels.length === 0}
                >
                  <option value="">Select model...</option>
                  {[
                    ...new Set(
                      filteredModels.map((e) => e.model).filter(Boolean),
                    ),
                  ]
                    .sort()
                    .map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </select>
                <button
                  onClick={addEquipment}
                  disabled={!selectorModel}
                  className="btn-primary shrink-0 px-3"
                  title="Add to system"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Selected equipment chips */}
          {selectedItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">
                Selected Equipment ({selectedItems.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${
                      item.feoc_compliant === false
                        ? "border-red-200 bg-red-50"
                        : item.feoc_compliant === true
                          ? "border-green-200 bg-green-50"
                          : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <span className="font-medium">{item.manufacturer}</span>
                    <span className="text-gray-500">{item.model}</span>
                    <span className="rounded bg-gray-200 px-1 text-[10px] uppercase text-gray-600">
                      {item.type}
                    </span>
                    <button
                      onClick={() =>
                        setReplacingIndex(replacingIndex === idx ? null : idx)
                      }
                      className="ml-1 text-gray-400 hover:text-blue-500"
                      title="Replace"
                    >
                      <ArrowRightLeft className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => removeEquipment(idx)}
                      className="text-gray-400 hover:text-red-500"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Replacement panel */}
              {replacingIndex !== null && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="mb-2 text-xs font-medium text-blue-800">
                    Replace: {selectedItems[replacingIndex]?.manufacturer}{" "}
                    {selectedItems[replacingIndex]?.model}
                  </p>
                  <p className="mb-2 text-xs text-blue-600">
                    Compliant alternatives:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {getCompliantAlternatives(
                      selectedItems[replacingIndex]?.type,
                    ).map((alt) => (
                      <button
                        key={alt.id}
                        onClick={() => replaceEquipment(replacingIndex, alt)}
                        className="rounded border border-green-300 bg-white px-2 py-1 text-xs hover:bg-green-50"
                      >
                        {alt.manufacturer} {alt.model}
                      </button>
                    ))}
                    {getCompliantAlternatives(
                      selectedItems[replacingIndex]?.type,
                    ).length === 0 && (
                      <p className="text-xs text-gray-500">
                        No compliant alternatives found for this type.
                      </p>
                    )}
                    <button
                      onClick={() => setReplacingIndex(null)}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Project Context ── */}
        <div className="card-padded space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Project Details
          </h2>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Project Type
            </label>
            <select
              value={projectType}
              onChange={(e) => {
                setProjectType(e.target.value);
                setReport(null);
              }}
              className="input-field"
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Financing
            </label>
            <select
              value={financingType}
              onChange={(e) => {
                setFinancingType(e.target.value);
                setReport(null);
              }}
              className="input-field"
            >
              {FINANCING_TYPES.map((t) => (
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
              onChange={(e) => {
                setState(e.target.value);
                setReport(null);
              }}
              className="input-field"
            >
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              System Cost Estimate ($)
            </label>
            <input
              type="number"
              value={systemCost}
              onChange={(e) => {
                setSystemCost(e.target.value);
                setReport(null);
              }}
              placeholder="e.g. 35000"
              className="input-field"
            />
          </div>

          <button
            onClick={runAnalysis}
            disabled={selectedItems.length === 0 || analyzing}
            className="btn-primary w-full"
          >
            {analyzing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" /> Run Compliance Analysis
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Compliance Report ── */}
      {report && (
        <div className="space-y-6">
          {/* FEOC Status + Domestic Content */}
          <div className="grid gap-6 lg:grid-cols-3">
            <FEOCStatusBadge status={report.feocStatus} />

            <div className="card-padded space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Globe className="h-4 w-4 text-blue-500" />
                Domestic Content
              </h3>
              <ProgressBar
                value={report.domesticContent.score}
                threshold={report.domesticContent.threshold}
                label="US Content Score"
              />
              <ComplianceBadge
                status={
                  report.domesticContent.eligible
                    ? "compliant"
                    : "non-compliant"
                }
                label={
                  report.domesticContent.eligible
                    ? "+10% ITC Adder Eligible"
                    : "Below 50% Threshold"
                }
              />
            </div>

            {/* ITC Breakdown */}
            <div className="card-padded space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <DollarSign className="h-4 w-4 text-green-500" />
                ITC Eligibility
              </h3>
              {report.itc.eligible ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Base rate</span>
                    <span className="font-medium">{report.itc.baseRate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">+ Domestic content</span>
                    <span
                      className={`font-medium ${report.itc.dcAdder > 0 ? "text-green-600" : "text-gray-400"}`}
                    >
                      {report.itc.dcAdder > 0
                        ? `+${report.itc.dcAdder}%`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">+ Energy community*</span>
                    <span className="font-medium text-amber-600">
                      +{report.itc.ecAdder}%*
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span>Total rate</span>
                      <span className="text-green-700">
                        {report.itc.totalRate}%
                      </span>
                    </div>
                    {report.itc.estimatedValue > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Estimated value</span>
                        <span className="font-semibold text-green-700">
                          ${report.itc.estimatedValue.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400">
                    *Energy community adder requires location verification
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-red-50 p-3">
                  <p className="text-xs text-red-700">{report.itc.reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Per-Equipment FEOC Details */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Equipment FEOC Analysis
            </h2>
            <FilterBar
              filters={feocFilterDefs}
              activeFilters={feocFilters}
              onChange={setFeocFilters}
            />
            <DataTable
              columns={feocColumns}
              data={filteredFeocDetails}
              emptyMessage="No equipment to display."
            />
          </div>

          {/* Tariff Exposure */}
          {report.tariffExposure.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Percent className="h-5 w-5 text-red-500" />
                Tariff Exposure
              </h2>
              <FilterBar
                filters={tariffFilterDefs}
                activeFilters={tariffFilters}
                onChange={setTariffFilters}
              />
              <DataTable
                columns={tariffColumns}
                data={filteredTariffExposure}
                emptyMessage="No tariff exposure found."
              />
            </div>
          )}

          {/* Recommendations */}
          <div className="card-padded">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Recommendations
            </h2>
            <ul className="mt-3 space-y-2">
              {report.recommendations.map((rec, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <Zap className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── 2026 Compliance Notes ── */}
      <div className="card-padded">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              2026 Compliance Notes
            </h3>
            <ul className="mt-2 space-y-1 text-xs text-gray-600">
              <li>
                Residential ITC (Section 25D) ended January 1, 2026. Only TPO
                (lease/PPA) qualifies for 48E commercial ITC.
              </li>
              <li>
                FEOC: 40% PFE threshold for manufactured products in 2026
                (increases 5%/yr to 60% by 2029). No components from China,
                Russia, North Korea, or Iran for IRA eligibility.
              </li>
              <li>
                Battery FEOC: 55% critical minerals threshold in 2026 (increases
                to 75% by 2029). CATL-sourced cells are non-compliant.
              </li>
              <li>
                Domestic content bonus: +10% ITC adder for systems with 50%+
                US-manufactured content by cost.
              </li>
              <li>
                Energy community bonus: +10% ITC adder for installations in
                designated energy communities (requires location verification).
              </li>
              <li>
                Tariffs: Up to 3,400% on SE Asian panels (AD/CVD duties).
                US-manufactured equipment is tariff-free.
              </li>
              <li>
                Markets without credits (e.g., San Antonio CPS Energy): Cheaper
                non-compliant panels may be acceptable when no ITC is being
                claimed.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Utility Functions ─────────────────────────────────────────────────────────

function extractCountryCode(equipment) {
  if (equipment.country_of_origin) return equipment.country_of_origin;
  if (equipment.supply_chain?.country_of_origin)
    return equipment.supply_chain.country_of_origin;

  const location = (
    equipment.manufacturing_location ||
    equipment.supply_chain?.manufacturing_location ||
    ""
  ).toLowerCase();
  if (
    location.includes("usa") ||
    location.includes("united states") ||
    location.match(/\b[a-z]+,\s*[a-z]{2},?\s*usa?\b/i)
  )
    return "US";
  if (location.includes("china")) return "CN";
  if (location.includes("vietnam")) return "VN";
  if (location.includes("thailand")) return "TH";
  if (location.includes("malaysia")) return "MY";
  if (location.includes("cambodia")) return "KH";
  if (location.includes("mexico")) return "MX";
  if (location.includes("singapore")) return "SG";
  if (location.includes("korea")) return "KR";
  if (location.includes("india")) return "IN";
  if (location.includes("germany")) return "DE";
  if (location.includes("austria")) return "AT";
  if (location.includes("japan")) return "JP";
  if (location.includes("canada")) return "CA";

  // Check manufacturer against known FEOC list
  const mfr = (equipment.manufacturer || "").toLowerCase();
  if (KNOWN_FEOC_ENTITIES.some((e) => mfr.includes(e))) return "CN";

  return "UNKNOWN";
}

function calculateITC(
  projectType,
  financingType,
  feocCompliant,
  domesticContentMet,
  systemCost,
) {
  let eligible = false;
  let reason = "";
  let baseRate = 0;

  if (
    projectType === "residential" &&
    (financingType === "cash" || financingType === "loan")
  ) {
    eligible = false;
    reason =
      "Residential ITC (25D) expired Jan 1, 2026. Cash/loan purchases no longer qualify. Switch to lease/PPA for 48E ITC.";
  } else if (
    projectType === "residential" &&
    (financingType === "lease" || financingType === "ppa")
  ) {
    eligible = feocCompliant;
    baseRate = 30;
    reason = eligible
      ? "Eligible for 48E ITC via TPO. All equipment FEOC-compliant."
      : "TPO structure available but equipment has FEOC issues.";
  } else if (projectType === "commercial" || projectType === "tpo") {
    eligible = feocCompliant;
    baseRate = 30;
    reason = eligible
      ? "Eligible for 48E commercial ITC at 30% base rate."
      : "Commercial project but equipment has FEOC issues.";
  } else {
    reason = "Specify project type and financing to determine ITC eligibility.";
  }

  const dcAdder = eligible && domesticContentMet ? 10 : 0;
  const ecAdder = eligible ? 10 : 0; // Flagged as requires verification
  const totalRate = eligible ? baseRate + dcAdder + ecAdder : 0;
  const estimatedValue =
    systemCost > 0 ? Math.round(systemCost * (totalRate / 100)) : 0;

  return {
    eligible,
    baseRate: eligible ? baseRate : 0,
    dcAdder,
    ecAdder,
    totalRate,
    estimatedValue,
    reason,
  };
}

function generateRecommendations(
  perEquipment,
  scoreResult,
  domesticResult,
  itc,
  tariffExposure,
  projectType,
  financingType,
) {
  const recs = [];

  // FEOC issues
  const feocFails = perEquipment.filter((e) => !e.feoc_compliant);
  if (feocFails.length > 0) {
    const names = feocFails.map((e) => e.manufacturer).join(", ");
    recs.push(
      `Replace FEOC non-compliant equipment (${names}) with US-manufactured alternatives: QCells, Silfab, First Solar, Mission Solar, Heliene, or Enphase.`,
    );

    feocFails.forEach((item) => {
      if (item.type === "panel") {
        recs.push(
          `Replace ${item.manufacturer} panel with QCells Q.TRON (Dalton, GA), Silfab Prime (Fort Mill, SC), or Mission Solar (San Antonio, TX).`,
        );
      } else if (item.type === "inverter") {
        recs.push(
          `Replace ${item.manufacturer} inverter with Enphase IQ8+ (US-made) or SolarEdge Home Hub (Austin, TX).`,
        );
      } else if (item.type === "battery") {
        recs.push(
          `Replace ${item.manufacturer} battery with Enphase IQ Battery 5P (FEOC-verified) or SolarEdge Home Battery (US-made).`,
        );
      }
    });
  }

  // Domestic content
  if (!domesticResult.meets_threshold && itc.eligible) {
    recs.push(
      `Domestic content is ${domesticResult.percentage}%, below 50% threshold for +10% ITC adder. Substituting imported components with US-made alternatives would add $${itc.baseRate > 0 && parseFloat(itc.estimatedValue) > 0 ? Math.round((itc.estimatedValue * 10) / itc.totalRate).toLocaleString() : "significant"} in additional credits.`,
    );
  }

  // Tariff exposure
  if (tariffExposure.length > 0) {
    const total = tariffExposure.reduce(
      (sum, t) => sum + (t.cost_impact || 0),
      0,
    );
    if (total > 0) {
      recs.push(
        `Estimated tariff cost impact: $${total.toLocaleString()}. US-manufactured equipment eliminates tariff exposure.`,
      );
    }
  }

  // Financing recommendation
  if (
    projectType === "residential" &&
    (financingType === "cash" || financingType === "loan")
  ) {
    recs.push(
      "Switch to lease or PPA (TPO) to access 48E commercial ITC. The TPO provider claims the credit and passes savings to the homeowner.",
    );
  }

  // Energy community note
  if (itc.eligible) {
    recs.push(
      "Verify energy community eligibility at energycommunities.gov for an additional +10% ITC adder.",
    );
  }

  // No-credit markets
  if (!itc.eligible && feocFails.length > 0) {
    recs.push(
      "In markets without ITC (e.g., San Antonio CPS Energy), FEOC compliance is not required. Cheaper non-compliant panels may reduce project cost.",
    );
  }

  if (recs.length === 0) {
    recs.push(
      "System is fully compliant. All equipment meets FEOC requirements and qualifies for maximum available tax credits.",
    );
  }

  return recs;
}
