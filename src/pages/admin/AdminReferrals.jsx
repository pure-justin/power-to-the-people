import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  orderBy,
  getDocs,
} from "../../services/firebase";
import { Gift, DollarSign, Users, Clock } from "lucide-react";

export default function AdminReferrals() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState([]);

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      const ref = collection(db, "referrals");
      const snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
      setReferrals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error loading referrals:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "N/A";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const statusBadge = (status) => {
    const s = (status || "").toLowerCase();
    const map = {
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-green-100 text-green-700",
      paid: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      expired: "bg-gray-100 text-gray-500",
    };
    return map[s] || "bg-gray-100 text-gray-600";
  };

  const pendingPayouts = referrals.filter(
    (r) => r.status === "approved" || r.status === "pending",
  );
  const totalCommission = referrals
    .filter((r) => r.status === "paid" || r.status === "approved")
    .reduce((sum, r) => sum + (r.commission || 0), 0);

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
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Total Referrals
            </span>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
              <Gift size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            {referrals.length}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Total Commission
            </span>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            {formatCurrency(totalCommission)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Pending Payouts
            </span>
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
              <Clock size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            {pendingPayouts.length}
          </p>
        </div>
      </div>

      {/* Payout Queue */}
      {pendingPayouts.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
          <h3 className="text-lg font-bold text-amber-800 mb-3 flex items-center gap-2">
            <Clock size={20} />
            Payout Queue ({pendingPayouts.length})
          </h3>
          <div className="space-y-2">
            {pendingPayouts.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {r.referrerId || "Unknown"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Referred: {r.referredName || r.projectId || "N/A"}
                  </p>
                </div>
                <span className="text-sm font-bold text-amber-700">
                  {formatCurrency(r.commission)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commission Settings Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Commission Settings
        </h3>
        <div className="h-24 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
          <p className="text-gray-400 text-sm">
            Commission settings configuration coming soon
          </p>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">All Referrals</h3>

        {referrals.length === 0 ? (
          <div className="text-center py-16">
            <Gift size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No referrals found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Referrer
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Referred
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Commission
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {r.referrerId || r.referrerName || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {r.referredName || r.projectId || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${statusBadge(r.status)}`}
                      >
                        {r.status || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      {formatCurrency(r.commission)}
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
