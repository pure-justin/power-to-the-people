import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db, collection, getDocs } from "../../services/firebase";
import { BarChart3, TrendingUp, MapPin, Users, Layers } from "lucide-react";

const FUNNEL_STAGES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
];

export default function AdminAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const ref = collection(db, "leads");
      const snap = await getDocs(ref);
      setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error loading analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Conversion funnel
  const stageCounts = {};
  FUNNEL_STAGES.forEach((s) => {
    stageCounts[s] = 0;
  });
  leads.forEach((l) => {
    const s = (l.status || "new").toLowerCase();
    if (stageCounts[s] !== undefined) stageCounts[s]++;
  });
  const total = leads.length || 1;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-48" />
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Conversion Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-emerald-500" />
          Conversion Funnel
        </h3>
        <div className="space-y-3">
          {FUNNEL_STAGES.map((stage, idx) => {
            const count = stageCounts[stage] || 0;
            const pct = Math.round((count / total) * 100);
            const barWidth = Math.max(pct, 3);
            const barColor =
              stage === "lost"
                ? "bg-red-400"
                : stage === "won"
                  ? "bg-green-500"
                  : "bg-emerald-400";
            return (
              <div key={stage} className="flex items-center gap-4">
                <span className="w-20 text-sm font-medium text-gray-600 capitalize text-right">
                  {stage}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-full flex items-center px-3 transition-all`}
                    style={{ width: `${barWidth}%` }}
                  >
                    <span className="text-xs font-bold text-white whitespace-nowrap">
                      {count} ({pct}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lead Source Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={20} className="text-blue-500" />
            Lead Source Breakdown
          </h3>
          <div className="h-40 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-400 text-sm">Data collecting...</p>
            </div>
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-red-500" />
            Geographic Distribution
          </h3>
          <div className="h-40 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
            <div className="text-center">
              <MapPin size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-400 text-sm">Data collecting...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cohort Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Layers size={20} className="text-purple-500" />
          Cohort Analysis
        </h3>
        <div className="h-40 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
          <div className="text-center">
            <Layers size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400 text-sm">Data collecting...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
