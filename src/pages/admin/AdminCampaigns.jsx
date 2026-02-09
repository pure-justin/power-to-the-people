import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  orderBy,
  getDocs,
  limit,
} from "../../services/firebase";
import {
  Megaphone,
  Users,
  BarChart3,
  Search,
  RefreshCw,
  TrendingUp,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  ChevronDown,
} from "lucide-react";
import DataTable from "../../components/ui/DataTable";
import FilterBar from "../../components/ui/FilterBar";

export default function AdminCampaigns() {
  useAuth();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [commercialLeads, setCommercialLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [campaignFilters, setCampaignFilters] = useState({});
  const [activeView, setActiveView] = useState("campaigns");
  const [expandedCampaign, setExpandedCampaign] = useState(null);
  const [leadSearchTerm, setLeadSearchTerm] = useState("");
  const [leadFilters, setLeadFilters] = useState({});

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
        // Try without ordering
        try {
          const campRef = collection(db, "campaigns");
          const campSnap = await getDocs(query(campRef, limit(200)));
          setCampaigns(campSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (e2) {
          setCampaigns([]);
        }
      }

      // Load commercial leads
      try {
        const clRef = collection(db, "commercial_leads");
        const clSnap = await getDocs(query(clRef, limit(500)));
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
      sent: "bg-green-100 text-green-700",
      scheduled: "bg-blue-100 text-blue-700",
    };
    return map[s] || "bg-gray-100 text-gray-600";
  };

  const leadStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "converted" || s === "interested")
      return "bg-green-100 text-green-700";
    if (s === "contacted" || s === "reached")
      return "bg-blue-100 text-blue-700";
    if (s === "declined" || s === "unresponsive")
      return "bg-red-100 text-red-700";
    if (s === "new" || s === "pending") return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-600";
  };

  const formatDate = (ts) => {
    if (!ts) return "N/A";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Campaign stats
  const activeCampaigns = campaigns.filter(
    (c) => (c.status || "").toLowerCase() === "active",
  );
  const totalSent = campaigns.reduce(
    (sum, c) => sum + (c.sent || c.totalSent || 0),
    0,
  );
  const totalResponses = campaigns.reduce(
    (sum, c) => sum + (c.responses || c.totalResponses || 0),
    0,
  );
  const avgEngagement =
    totalSent > 0 ? Math.round((totalResponses / totalSent) * 100) : 0;

  // Lead engagement breakdown
  const leadsByStatus = {};
  commercialLeads.forEach((l) => {
    const s = (l.status || l.engagement || "new").toLowerCase();
    leadsByStatus[s] = (leadsByStatus[s] || 0) + 1;
  });
  const topStatuses = Object.entries(leadsByStatus)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxStatusCount = topStatuses.length > 0 ? topStatuses[0][1] : 1;

  // --- Campaign filter definitions (dynamic from data) ---
  const campaignFilterDefs = useMemo(() => {
    const statuses = [
      ...new Set(campaigns.map((c) => (c.status || "draft").toLowerCase())),
    ].sort();
    return [
      {
        key: "status",
        label: "Status",
        options: statuses.map((s) => ({
          value: s,
          label: s.charAt(0).toUpperCase() + s.slice(1),
        })),
      },
    ];
  }, [campaigns]);

  // --- Filtered campaigns (search + FilterBar) ---
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        (c.name || "").toLowerCase().includes(term) ||
        (c.type || "").toLowerCase().includes(term);
      const matchesStatus =
        !campaignFilters.status ||
        (c.status || "").toLowerCase() === campaignFilters.status;
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, searchTerm, campaignFilters]);

  // --- Campaign columns ---
  const campaignColumns = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        sortable: true,
        render: (val, row) => (
          <span className="text-sm font-semibold text-gray-900">
            {val || row.id}
          </span>
        ),
      },
      {
        key: "type",
        label: "Type",
        sortable: true,
        render: (val, row) => (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
            {val || row.channel || "email"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (val) => (
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${statusBadge(val)}`}
          >
            {val || "draft"}
          </span>
        ),
      },
      {
        key: "sent",
        label: "Sent",
        sortable: true,
        render: (val, row) => (
          <span className="text-sm font-bold text-gray-900">
            {(val || row.totalSent || 0).toLocaleString()}
          </span>
        ),
      },
      {
        key: "responses",
        label: "Responses",
        sortable: true,
        render: (val, row) => (
          <span className="text-sm text-gray-600">
            {(val || row.totalResponses || 0).toLocaleString()}
          </span>
        ),
      },
      {
        key: "_engagement",
        label: "Engagement",
        sortable: false,
        render: (_val, row) => {
          const sent = row.sent || row.totalSent || 0;
          const responses = row.responses || row.totalResponses || 0;
          const rate = sent > 0 ? Math.round((responses / sent) * 100) : 0;
          return (
            <div className="flex items-center gap-2">
              <div className="w-16 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-full rounded-full ${
                    rate >= 20
                      ? "bg-green-500"
                      : rate >= 10
                        ? "bg-amber-500"
                        : "bg-red-400"
                  }`}
                  style={{ width: `${Math.min(rate, 100)}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-900">{rate}%</span>
            </div>
          );
        },
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        render: (val) => (
          <span className="text-sm text-gray-400">{formatDate(val)}</span>
        ),
      },
      {
        key: "_expand",
        label: "Details",
        sortable: false,
        render: (_val, row) => (
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform ${
              expandedCampaign === row.id ? "rotate-180" : ""
            }`}
          />
        ),
      },
    ],
    [expandedCampaign],
  );

  // --- Lead filter definitions (dynamic from data) ---
  const leadFilterDefs = useMemo(() => {
    const statuses = [
      ...new Set(
        commercialLeads.map((l) =>
          (l.status || l.engagement || "new").toLowerCase(),
        ),
      ),
    ].sort();
    return [
      {
        key: "status",
        label: "Status",
        options: statuses.map((s) => ({
          value: s,
          label: s.charAt(0).toUpperCase() + s.slice(1),
        })),
      },
    ];
  }, [commercialLeads]);

  // --- Filtered leads (search + FilterBar, no 100-row cap) ---
  const filteredLeads = useMemo(() => {
    return commercialLeads.filter((l) => {
      const term = leadSearchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        (l.companyName || l.company || "").toLowerCase().includes(term) ||
        (l.contactName || l.name || "").toLowerCase().includes(term) ||
        (l.email || "").toLowerCase().includes(term) ||
        (l.phone || "").includes(term);
      const matchesStatus =
        !leadFilters.status ||
        (l.status || l.engagement || "").toLowerCase() === leadFilters.status;
      return matchesSearch && matchesStatus;
    });
  }, [commercialLeads, leadSearchTerm, leadFilters]);

  // --- Lead columns ---
  const leadColumns = useMemo(
    () => [
      {
        key: "companyName",
        label: "Company",
        sortable: true,
        render: (val, row) => (
          <span className="text-sm font-semibold text-gray-900">
            {val || row.company || row.propertyManager || "N/A"}
          </span>
        ),
      },
      {
        key: "contactName",
        label: "Contact",
        sortable: true,
        render: (val, row) => (
          <span className="text-sm text-gray-700">
            {val || row.name || "N/A"}
          </span>
        ),
      },
      {
        key: "email",
        label: "Email",
        sortable: true,
        render: (val) =>
          val ? (
            <span className="flex items-center gap-1 text-sm text-gray-600">
              <Mail size={12} className="text-gray-400" />
              {val}
            </span>
          ) : (
            <span className="text-sm text-gray-600">N/A</span>
          ),
      },
      {
        key: "phone",
        label: "Phone",
        sortable: true,
        render: (val) =>
          val ? (
            <span className="flex items-center gap-1 text-sm text-gray-600">
              <Phone size={12} className="text-gray-400" />
              {val}
            </span>
          ) : (
            <span className="text-sm text-gray-600">N/A</span>
          ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (val, row) => (
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${leadStatusBadge(val || row.engagement)}`}
          >
            {val || row.engagement || "new"}
          </span>
        ),
      },
      {
        key: "notes",
        label: "Notes",
        sortable: false,
        render: (val, row) => (
          <span className="text-sm text-gray-500 max-w-xs truncate block">
            {val || row.lastNote || "--"}
          </span>
        ),
      },
    ],
    [],
  );

  const metricCards = [
    {
      label: "Total Campaigns",
      value: campaigns.length,
      icon: Megaphone,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Active",
      value: activeCampaigns.length,
      icon: TrendingUp,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Commercial Leads",
      value: commercialLeads.length,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Avg Engagement",
      value: `${avgEngagement}%`,
      icon: BarChart3,
      color: "bg-amber-50 text-amber-600",
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
          </div>
        ))}
      </div>

      {/* Engagement Breakdown */}
      {topStatuses.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target size={20} className="text-purple-500" />
            Lead Engagement Breakdown
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {topStatuses.map(([status, count]) => (
              <div key={status} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-medium capitalize truncate">
                  {status}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{
                        width: `${(count / maxStatusCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-700">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[
          {
            key: "campaigns",
            label: `Campaigns (${campaigns.length})`,
            icon: Megaphone,
          },
          {
            key: "leads",
            label: `Commercial Leads (${commercialLeads.length})`,
            icon: Users,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeView === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Campaigns Table */}
      {activeView === "campaigns" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h3 className="text-lg font-bold text-gray-900">All Campaigns</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <FilterBar
                filters={campaignFilterDefs}
                activeFilters={campaignFilters}
                onChange={setCampaignFilters}
              />
              <button
                onClick={loadData}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            {filteredCampaigns.length} campaign
            {filteredCampaigns.length !== 1 ? "s" : ""}
          </p>

          <DataTable
            columns={campaignColumns}
            data={filteredCampaigns}
            onRowClick={(row) =>
              setExpandedCampaign(expandedCampaign === row.id ? null : row.id)
            }
            emptyMessage="No campaigns found. Campaigns will appear here when created."
          />

          {/* Expanded Campaign Detail */}
          {expandedCampaign && (
            <div className="border-t border-gray-200 px-4 py-4 bg-gray-50 mt-0 rounded-b-xl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {Object.entries(
                  filteredCampaigns.find((c) => c.id === expandedCampaign) ||
                    {},
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
        </div>
      )}

      {/* Commercial Leads Table */}
      {activeView === "leads" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h3 className="text-lg font-bold text-gray-900">
              Commercial Leads
            </h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={leadSearchTerm}
                  onChange={(e) => setLeadSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <FilterBar
                filters={leadFilterDefs}
                activeFilters={leadFilters}
                onChange={setLeadFilters}
              />
              <button
                onClick={loadData}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""}
          </p>

          <DataTable
            columns={leadColumns}
            data={filteredLeads}
            emptyMessage="No commercial leads found. Leads will appear after campaigns are run."
          />
        </div>
      )}
    </div>
  );
}
