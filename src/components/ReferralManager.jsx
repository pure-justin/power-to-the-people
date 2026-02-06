import { useState, useEffect } from "react";
import {
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  Search,
  Filter,
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  db,
} from "../services/firebase";
import { updateReferralStatus } from "../services/referralService";

export default function ReferralManager() {
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    signedUp: 0,
    qualified: 0,
    siteSurvey: 0,
    installed: 0,
    totalEarnings: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      setLoading(true);

      // Load all referral tracking records
      const trackingRef = collection(db, "referralTracking");
      const q = query(trackingRef, orderBy("createdAt", "desc"), limit(100));
      const snapshot = await getDocs(q);

      const trackingData = [];
      let statsData = {
        total: 0,
        signedUp: 0,
        qualified: 0,
        siteSurvey: 0,
        installed: 0,
        totalEarnings: 0,
      };

      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        trackingData.push(data);

        // Update stats
        statsData.total++;
        statsData.totalEarnings += data.earnings || 0;

        if (data.status === "signed_up") statsData.signedUp++;
        else if (data.status === "qualified") statsData.qualified++;
        else if (data.status === "site_survey") statsData.siteSurvey++;
        else if (data.status === "installed") statsData.installed++;
      });

      setReferrals(trackingData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (trackingId, newStatus) => {
    try {
      setUpdating(trackingId);
      await updateReferralStatus(trackingId, newStatus);
      await loadReferralData(); // Reload data
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status: " + error.message);
    } finally {
      setUpdating(null);
    }
  };

  const filteredReferrals = referrals.filter((ref) => {
    const matchesSearch =
      searchTerm === "" ||
      ref.referredName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.referredEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.referrerEmail?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || ref.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const badges = {
      signed_up: { label: "Signed Up", color: "bg-blue-500" },
      qualified: { label: "Qualified", color: "bg-yellow-500" },
      site_survey: { label: "Site Survey", color: "bg-purple-500" },
      installed: { label: "Installed", color: "bg-green-500" },
    };

    const badge = badges[status] || badges.signed_up;
    return (
      <span
        className={`px-2 py-1 rounded text-white text-xs font-semibold ${badge.color}`}
      >
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center text-gray-500">
          Loading referral data...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="text-gray-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Referrals</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <Clock className="text-blue-500" size={20} />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.signedUp}
          </div>
          <div className="text-sm text-gray-500">Signed Up</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="text-yellow-500" size={20} />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.qualified}
          </div>
          <div className="text-sm text-gray-500">Qualified</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="text-green-500" size={20} />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.installed}
          </div>
          <div className="text-sm text-gray-500">Installed</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="text-emerald-500" size={20} />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ${stats.totalEarnings.toFixed(0)}
          </div>
          <div className="text-sm text-gray-500">Total Paid</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="text-gray-400" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="signed_up">Signed Up</option>
              <option value="qualified">Qualified</option>
              <option value="site_survey">Site Survey</option>
              <option value="installed">Installed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Referred Customer
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Referrer
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Status
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Earnings
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Date
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredReferrals.map((ref) => (
              <tr key={ref.id} className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="font-medium text-gray-900">
                    {ref.referredName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {ref.referredEmail}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm text-gray-700">
                    {ref.referrerEmail}
                  </div>
                  <div className="text-xs text-gray-500">
                    Code: {ref.referrerCode}
                  </div>
                </td>
                <td className="py-3 px-4">{getStatusBadge(ref.status)}</td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-emerald-600">
                    ${ref.earnings}
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-gray-500">
                  {ref.createdAt?.toDate
                    ? new Date(ref.createdAt.toDate()).toLocaleDateString()
                    : "N/A"}
                </td>
                <td className="py-3 px-4">
                  <select
                    value={ref.status}
                    onChange={(e) => handleStatusUpdate(ref.id, e.target.value)}
                    disabled={updating === ref.id}
                    className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="signed_up">Signed Up</option>
                    <option value="qualified">Qualified</option>
                    <option value="site_survey">Site Survey</option>
                    <option value="installed">Installed</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredReferrals.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No referrals found
          </div>
        )}
      </div>
    </div>
  );
}
