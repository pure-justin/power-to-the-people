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
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Factory,
  Search,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  MapPin,
} from "lucide-react";

const FEOC_COMPLIANT_MANUFACTURERS = [
  {
    name: "First Solar",
    locations: "Perrysburg, OH",
    country: "US",
    feoc: true,
    notes: "CdTe thin-film, fully US-manufactured",
  },
  {
    name: "Qcells",
    locations: "Dalton, GA",
    country: "US",
    feoc: true,
    notes: "Korean-owned, US factory",
  },
  {
    name: "Mission Solar",
    locations: "San Antonio, TX",
    country: "US",
    feoc: true,
    notes: "US-owned and manufactured",
  },
  {
    name: "SolarEdge",
    locations: "FL, TX, UT",
    country: "US",
    feoc: true,
    notes: "Inverters and optimizers, US assembly",
  },
  {
    name: "Silfab Solar",
    locations: "Burlington, WA & Fort Mill, SC",
    country: "US",
    feoc: true,
    notes: "Canadian-owned, US factories",
  },
  {
    name: "Heliene",
    locations: "Rogers, MN",
    country: "US",
    feoc: true,
    notes: "Canadian-owned, US factory",
  },
];

const EQUIPMENT_TYPES = [
  { value: "panel", label: "Solar Panel" },
  { value: "inverter", label: "Inverter" },
  { value: "battery", label: "Battery" },
];

function ComplianceBadge({ status, label }) {
  const styles = {
    compliant: "bg-green-100 text-green-700",
    partial: "bg-amber-100 text-amber-700",
    "non-compliant": "bg-red-100 text-red-700",
    unknown: "bg-gray-100 text-gray-500",
  };
  const icons = {
    compliant: CheckCircle2,
    partial: AlertTriangle,
    "non-compliant": XCircle,
    unknown: Info,
  };
  const Icon = icons[status] || icons.unknown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.unknown}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function OverallScore({ feoc, domesticContent, tariff }) {
  const scores = [feoc, domesticContent >= 50, tariff];
  const passing = scores.filter(Boolean).length;
  const total = scores.length;

  let color, label, Icon;
  if (passing === total) {
    color = "border-green-200 bg-green-50";
    label = "Fully Compliant";
    Icon = ShieldCheck;
  } else if (passing >= 1) {
    color = "border-amber-200 bg-amber-50";
    label = "Partially Compliant";
    Icon = ShieldAlert;
  } else {
    color = "border-red-200 bg-red-50";
    label = "Non-Compliant";
    Icon = ShieldX;
  }

  return (
    <div className={`rounded-xl border-2 p-6 text-center ${color}`}>
      <Icon className="mx-auto h-12 w-12" />
      <p className="mt-2 text-lg font-bold text-gray-900">{label}</p>
      <p className="text-sm text-gray-600">
        {passing}/{total} criteria met
      </p>
    </div>
  );
}

export default function DashboardCompliance() {
  const { user } = useAuth();
  const [equipmentType, setEquipmentType] = useState("panel");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [equipment, setEquipment] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load equipment data from Firestore
  useEffect(() => {
    const loadEquipment = async () => {
      try {
        const q = query(collection(db, "solar_equipment"), limit(1000));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEquipment(data);

        // Extract unique manufacturers
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

  // Filter models when type or manufacturer changes
  useEffect(() => {
    let filtered = equipment;
    if (equipmentType) {
      filtered = filtered.filter((e) => e.type === equipmentType);
    }
    if (manufacturer) {
      filtered = filtered.filter((e) => e.manufacturer === manufacturer);
    }
    const modelList = [
      ...new Set(filtered.map((e) => e.model).filter(Boolean)),
    ].sort();
    setModels(modelList);
    setModel("");
    setSelectedEquipment(null);
  }, [equipmentType, manufacturer, equipment]);

  // Select equipment when model is chosen
  useEffect(() => {
    if (!model) {
      setSelectedEquipment(null);
      return;
    }
    const found = equipment.find(
      (e) =>
        e.type === equipmentType &&
        e.manufacturer === manufacturer &&
        e.model === model,
    );
    setSelectedEquipment(found || null);
  }, [model, equipmentType, manufacturer, equipment]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Equipment Compliance
        </h1>
        <ShieldCheck className="h-6 w-6 text-emerald-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Equipment Selector */}
        <div className="card-padded space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Check Equipment
          </h2>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Equipment Type
            </label>
            <select
              value={equipmentType}
              onChange={(e) => {
                setEquipmentType(e.target.value);
                setManufacturer("");
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
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Manufacturer
            </label>
            <select
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              className="input-field"
            >
              <option value="">Select manufacturer...</option>
              {manufacturers
                .filter((m) => {
                  if (!equipmentType) return true;
                  return equipment.some(
                    (e) => e.manufacturer === m && e.type === equipmentType,
                  );
                })
                .map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="input-field"
              disabled={!manufacturer}
            >
              <option value="">Select model...</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Results */}
          {selectedEquipment && (
            <div className="space-y-3 rounded-lg bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">
                {selectedEquipment.manufacturer} {selectedEquipment.model}
              </h3>
              <div className="flex flex-wrap gap-2">
                <ComplianceBadge
                  status={
                    selectedEquipment.feoc_compliant
                      ? "compliant"
                      : selectedEquipment.feoc_compliant === false
                        ? "non-compliant"
                        : "unknown"
                  }
                  label={
                    selectedEquipment.feoc_compliant
                      ? "FEOC Compliant"
                      : selectedEquipment.feoc_compliant === false
                        ? "FEOC Non-Compliant"
                        : "FEOC Unknown"
                  }
                />
                <ComplianceBadge
                  status={
                    (selectedEquipment.domestic_content_pct || 0) >= 50
                      ? "compliant"
                      : (selectedEquipment.domestic_content_pct || 0) >= 20
                        ? "partial"
                        : "non-compliant"
                  }
                  label={`${selectedEquipment.domestic_content_pct || 0}% Domestic`}
                />
                <ComplianceBadge
                  status={
                    selectedEquipment.tariff_safe
                      ? "compliant"
                      : selectedEquipment.tariff_safe === false
                        ? "non-compliant"
                        : "unknown"
                  }
                  label={
                    selectedEquipment.tariff_safe
                      ? "Tariff Safe"
                      : selectedEquipment.tariff_safe === false
                        ? "Subject to Tariffs"
                        : "Tariff Unknown"
                  }
                />
              </div>
              {selectedEquipment.country_of_origin && (
                <p className="text-xs text-gray-500">
                  Origin: {selectedEquipment.country_of_origin}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Overall Score */}
        <div className="space-y-4">
          {selectedEquipment ? (
            <OverallScore
              feoc={selectedEquipment.feoc_compliant === true}
              domesticContent={selectedEquipment.domestic_content_pct || 0}
              tariff={selectedEquipment.tariff_safe === true}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-6">
              <div className="text-center">
                <ShieldCheck className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">
                  Select equipment to see compliance score
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FEOC-Compliant Manufacturers Reference */}
      <div className="card">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            FEOC-Compliant US Manufacturers
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Manufacturers meeting Foreign Entity of Concern exclusion
            requirements for IRA tax credits
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Manufacturer
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  US Facility
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {FEOC_COMPLIANT_MANUFACTURERS.map((mfr) => (
                <tr key={mfr.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {mfr.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      {mfr.locations}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ComplianceBadge status="compliant" label="FEOC Safe" />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {mfr.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2026 Compliance Notes */}
      <div className="card-padded">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              2026 Compliance Notes
            </h3>
            <ul className="mt-2 space-y-1 text-xs text-gray-600">
              <li>
                Residential ITC ended January 1, 2026. Only TPO (lease/PPA)
                qualifies for commercial ITC.
              </li>
              <li>
                Domestic content threshold: 50% US-manufactured components
                required for bonus credit.
              </li>
              <li>
                FEOC: No components from China, Russia, North Korea, or Iran for
                IRA eligibility.
              </li>
              <li>Tariffs: Up to 3,400% on SE Asian panels (AD/CVD duties).</li>
              <li>
                Markets without credits (e.g., San Antonio): Cheaper
                non-compliant panels may be acceptable.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
