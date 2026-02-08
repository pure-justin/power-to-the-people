import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  orderBy,
  getDocs,
} from "../../services/firebase";
import { Megaphone, Users, BarChart3, ListTodo } from "lucide-react";

export default function AdminCampaigns() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [commercialLeads, setCommercialLeads] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load campaigns
      try {
        const campRef = collection(db, "campaigns");
        const campSnap = await getDocs(
          query(campRef, orderBy("createdAt", "desc")),
        );
        setCampaigns(campSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        setCampaigns([]);
      }

      // Load commercial leads
      try {
        const clRef = collection(db, "commercial_leads");
        const clSnap = await getDocs(clRef);
        setCommercialLeads(clSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        setCommercialLeads([]);
      }
    } catch (err) {
      console.error("Error loading campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status) => {
    const s = (status || "").toLowerCase();
    const map = {
      active: "bg-green-100 text-green-700",
      draft: "bg-gray-100 text-gray-500",
      paused: "bg-amber-100 text-amber-700",
      completed: "bg-blue-100 text-blue-700",
      failed: "bg-red-100 text-red-700",
    };
    return map[s] || "bg-gray-100 text-gray-600";
  };

  const formatDate = (ts) => {
    if (!ts) return "N/A";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
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
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Campaigns
            </span>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
              <Megaphone size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            {campaigns.length}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Commercial Leads
            </span>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <Users size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            {commercialLeads.length}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Avg Engagement
            </span>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
              <BarChart3 size={20} />
            </div>
          </div>
          <div className="h-8 bg-gray-50 rounded border-2 border-dashed border-gray-200 flex items-center justify-center">
            <p className="text-xs text-gray-400">Calculating...</p>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">All Campaigns</h3>

        {campaigns.length === 0 ? (
          <div className="text-center py-16">
            <Megaphone size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No campaigns found</p>
            <p className="text-sm text-gray-400 mt-1">
              Campaigns will appear here when created
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Sent
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Responses
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Engagement
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map((c) => {
                  const sent = c.sent || c.totalSent || 0;
                  const responses = c.responses || c.totalResponses || 0;
                  const rate =
                    sent > 0 ? Math.round((responses / sent) * 100) : 0;
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {c.name || c.id}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${statusBadge(c.status)}`}
                        >
                          {c.status || "draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {sent}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {responses}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">
                        {rate}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Queue Management Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ListTodo size={20} className="text-blue-500" />
          Queue Management
        </h3>
        <div className="h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
          <p className="text-gray-400 text-sm">Queue management coming soon</p>
        </div>
      </div>
    </div>
  );
}
