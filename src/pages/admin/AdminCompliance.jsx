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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState([]);

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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
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
      {/* FEOC Compliance Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ShieldCheck size={20} className="text-emerald-500" />
          Equipment FEOC Compliance Audit
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg border border-gray-100">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-600">
              <ShieldCheck size={24} />
            </div>
            <p className="text-2xl font-extrabold text-gray-900">
              {equipment.length}
            </p>
            <p className="text-xs text-gray-500">Total Equipment</p>
          </div>
          <div className="text-center p-4 rounded-lg border border-green-100 bg-green-50">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 text-green-600">
              <CheckCircle size={24} />
            </div>
            <p className="text-2xl font-extrabold text-green-700">
              {feocCompliant}
            </p>
            <p className="text-xs text-green-600">FEOC Compliant</p>
          </div>
          <div className="text-center p-4 rounded-lg border border-amber-100 bg-amber-50">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2 text-amber-600">
              <MinusCircle size={24} />
            </div>
            <p className="text-2xl font-extrabold text-amber-700">
              {feocPartial}
            </p>
            <p className="text-xs text-amber-600">Partial</p>
          </div>
          <div className="text-center p-4 rounded-lg border border-red-100 bg-red-50">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2 text-red-600">
              <XCircle size={24} />
            </div>
            <p className="text-2xl font-extrabold text-red-700">
              {feocNonCompliant}
            </p>
            <p className="text-xs text-red-600">Non-Compliant</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Domestic Content:</span>{" "}
            {dcCompliant} of {equipment.length} equipment items meet the 50% US
            threshold for 2026.
          </p>
        </div>
      </div>

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

      {/* Critical Dates */}
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
    </div>
  );
}
