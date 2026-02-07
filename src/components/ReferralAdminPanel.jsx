import { useState, useEffect } from "react";
import {
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
  Mail,
  AlertCircle,
} from "lucide-react";
import { collection, getDocs, query, orderBy, db } from "../services/firebase";
import {
  updateReferralStatus,
  getAllPayouts,
  updatePayoutStatus,
} from "../services/referralService";

/**
 * Admin Panel for Managing Referrals
 * Allows admins to view, filter, and update referral statuses
 */
export default function ReferralAdminPanel() {
  const [referrals, setReferrals] = useState([]);
  const [allReferrers, setAllReferrers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [payouts, setPayouts] = useState([]);
  const [adminSubTab, setAdminSubTab] = useState("referrals"); // referrals, payouts

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);

      // Load all referral tracking records
      const trackingQuery = query(
        collection(db, "referralTracking"),
        orderBy("createdAt", "desc"),
      );
      const trackingSnapshot = await getDocs(trackingQuery);
      const trackingData = trackingSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Load all referrers
      const referrersQuery = query(
        collection(db, "referrals"),
        orderBy("totalEarnings", "desc"),
      );
      const referrersSnapshot = await getDocs(referrersQuery);
      const referrersData = referrersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setReferrals(trackingData);
      setAllReferrers(referrersData);
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
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

  const handleStatusUpdate = async (referralId, newStatus) => {
    try {
      setUpdating(true);
      await updateReferralStatus(referralId, newStatus);
      await loadAllData(); // Reload data
      setSelectedReferral(null);
      alert("Status updated successfully!");
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Referrer Email",
      "Referrer Code",
      "Referred Name",
      "Referred Email",
      "Status",
      "Earnings",
      "Created Date",
    ];

    const rows = filteredReferrals.map((ref) => [
      ref.referrerEmail,
      ref.referrerCode,
      ref.referredName,
      ref.referredEmail,
      ref.status,
      ref.earnings,
      ref.createdAt?.toDate?.().toLocaleDateString() || "N/A",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((row) => row.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `referrals-${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    const badges = {
      signed_up: { label: "Signed Up", color: "bg-blue-600" },
      qualified: { label: "Qualified", color: "bg-yellow-600" },
      site_survey: { label: "Site Survey", color: "bg-purple-600" },
      installed: { label: "Installed", color: "bg-green-600" },
    };
    const badge = badges[status] || badges.signed_up;
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${badge.color}`}
      >
        {badge.label}
      </span>
    );
  };

  const getStatusStats = () => {
    const stats = {
      total: referrals.length,
      signed_up: 0,
      qualified: 0,
      site_survey: 0,
      installed: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
    };

    referrals.forEach((ref) => {
      if (stats[ref.status] !== undefined) {
        stats[ref.status]++;
      }
      stats.totalEarnings += ref.earnings || 0;
    });

    allReferrers.forEach((referrer) => {
      stats.pendingEarnings += referrer.pendingEarnings || 0;
    });

    return stats;
  };

  const stats = getStatusStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-blue-400" size={24} />
            <div className="text-gray-400 text-sm">Total Referrals</div>
          </div>
          <div className="text-3xl font-bold text-white">{stats.total}</div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="text-green-400" size={24} />
            <div className="text-gray-400 text-sm">Installed</div>
          </div>
          <div className="text-3xl font-bold text-white">{stats.installed}</div>
          <div className="text-gray-500 text-sm mt-1">
            {stats.total > 0
              ? Math.round((stats.installed / stats.total) * 100)
              : 0}
            % conversion
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="text-emerald-400" size={24} />
            <div className="text-gray-400 text-sm">Total Paid Out</div>
          </div>
          <div className="text-3xl font-bold text-white">
            ${stats.totalEarnings.toFixed(0)}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-yellow-400" size={24} />
            <div className="text-gray-400 text-sm">Pending Payouts</div>
          </div>
          <div className="text-3xl font-bold text-white">
            ${stats.pendingEarnings.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 w-full">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 text-white rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-gray-800 text-white rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="signed_up">Signed Up</option>
              <option value="qualified">Qualified</option>
              <option value="site_survey">Site Survey</option>
              <option value="installed">Installed</option>
            </select>
          </div>

          <button
            onClick={exportToCSV}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition flex items-center gap-2"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left py-4 px-6 text-gray-400 font-semibold">
                  Referrer
                </th>
                <th className="text-left py-4 px-6 text-gray-400 font-semibold">
                  Referred Customer
                </th>
                <th className="text-left py-4 px-6 text-gray-400 font-semibold">
                  Status
                </th>
                <th className="text-left py-4 px-6 text-gray-400 font-semibold">
                  Earnings
                </th>
                <th className="text-left py-4 px-6 text-gray-400 font-semibold">
                  Date
                </th>
                <th className="text-left py-4 px-6 text-gray-400 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredReferrals.map((ref) => (
                <tr
                  key={ref.id}
                  className="border-t border-gray-800 hover:bg-gray-800/50 transition"
                >
                  <td className="py-4 px-6">
                    <div>
                      <div className="text-white font-medium">
                        {ref.referrerCode}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {ref.referrerEmail}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <div className="text-white font-medium">
                        {ref.referredName}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {ref.referredEmail}
                      </div>
                      {ref.referredPhone && (
                        <div className="text-gray-500 text-xs">
                          {ref.referredPhone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">{getStatusBadge(ref.status)}</td>
                  <td className="py-4 px-6">
                    <div className="text-emerald-400 font-semibold">
                      ${ref.earnings || 0}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-400">
                    {ref.createdAt?.toDate?.().toLocaleDateString() || "N/A"}
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => setSelectedReferral(ref)}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition"
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredReferrals.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No referrals found</p>
            </div>
          )}
        </div>
      </div>

      {/* Update Status Modal */}
      {selectedReferral && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-4">
              Update Referral Status
            </h3>

            <div className="mb-4">
              <div className="text-gray-400 text-sm mb-2">Customer</div>
              <div className="text-white font-medium">
                {selectedReferral.referredName}
              </div>
              <div className="text-gray-500 text-sm">
                {selectedReferral.referredEmail}
              </div>
            </div>

            <div className="mb-6">
              <div className="text-gray-400 text-sm mb-2">Current Status</div>
              {getStatusBadge(selectedReferral.status)}
            </div>

            <div className="mb-6">
              <div className="text-gray-400 text-sm mb-3">Update to:</div>
              <div className="space-y-2">
                {[
                  { value: "signed_up", label: "Signed Up", earnings: 0 },
                  { value: "qualified", label: "Qualified", earnings: 0 },
                  {
                    value: "site_survey",
                    label: "Site Survey",
                    earnings: 50,
                  },
                  { value: "installed", label: "Installed", earnings: 450 },
                ].map((status) => (
                  <button
                    key={status.value}
                    onClick={() =>
                      handleStatusUpdate(selectedReferral.id, status.value)
                    }
                    disabled={
                      updating || selectedReferral.status === status.value
                    }
                    className={`w-full px-4 py-3 rounded-lg font-medium transition ${
                      selectedReferral.status === status.value
                        ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                        : "bg-gray-800 hover:bg-gray-700 text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{status.label}</span>
                      {status.earnings > 0 && (
                        <span className="text-emerald-400 text-sm">
                          +${status.earnings}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedReferral(null)}
                disabled={updating}
                className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Referrers */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="text-xl font-bold text-white mb-6">Top Referrers</h3>
        <div className="space-y-3">
          {allReferrers.slice(0, 10).map((referrer, index) => (
            <div
              key={referrer.id}
              className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-400 font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <div className="text-white font-medium">
                    {referrer.displayName || referrer.email}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {referrer.referralCode}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold">
                  {referrer.installedReferrals} installed
                </div>
                <div className="text-emerald-400 text-sm">
                  ${referrer.totalEarnings.toFixed(0)} earned
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
