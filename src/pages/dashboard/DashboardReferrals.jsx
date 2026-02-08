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
  Gift,
  DollarSign,
  Users,
  Clock,
  Copy,
  Check,
  ExternalLink,
  TrendingUp,
  ArrowRight,
  Link2,
} from "lucide-react";

const REFERRAL_STATUSES = [
  { value: "pending", label: "Pending", color: "bg-amber-100 text-amber-700" },
  {
    value: "qualified",
    label: "Qualified",
    color: "bg-blue-100 text-blue-700",
  },
  {
    value: "installed",
    label: "Installed",
    color: "bg-emerald-100 text-emerald-700",
  },
  { value: "paid", label: "Paid", color: "bg-green-100 text-green-700" },
  { value: "expired", label: "Expired", color: "bg-gray-100 text-gray-500" },
  { value: "canceled", label: "Canceled", color: "bg-red-100 text-red-700" },
];

export default function DashboardReferrals() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const referralLink = `https://power-to-the-people-vpp.web.app/ref/${user?.uid || ""}`;

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const q = query(
          collection(db, "referrals"),
          where("referrerId", "==", user.uid),
          limit(500),
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => {
          const aTime = a.createdAt?.toDate
            ? a.createdAt.toDate()
            : new Date(a.createdAt || 0);
          const bTime = b.createdAt?.toDate
            ? b.createdAt.toDate()
            : new Date(b.createdAt || 0);
          return bTime - aTime;
        });
        setReferrals(data);
      } catch (err) {
        console.error("Failed to load referrals:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate stats
  const totalEarnings = referrals
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + (r.commission || 0), 0);
  const pendingPayouts = referrals
    .filter((r) => ["qualified", "installed"].includes(r.status))
    .reduce((sum, r) => sum + (r.commission || 0), 0);
  const totalReferrals = referrals.length;
  const convertedCount = referrals.filter((r) =>
    ["installed", "paid"].includes(r.status),
  ).length;

  const getStatusStyle = (status) => {
    const found = REFERRAL_STATUSES.find((s) => s.value === status);
    return found?.color || "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status) => {
    const found = REFERRAL_STATUSES.find((s) => s.value === status);
    return found?.label || status || "Unknown";
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-lg bg-gray-100" />
        <div className="h-20 rounded-xl bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
        <Gift className="h-6 w-6 text-emerald-600" />
      </div>

      {/* Referral link */}
      <div className="card-padded">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="h-5 w-5 text-emerald-600" />
          <h2 className="text-sm font-semibold text-gray-900">
            Your Referral Link
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
            <p className="truncate font-mono text-sm text-gray-700">
              {referralLink}
            </p>
          </div>
          <button onClick={copyLink} className="btn-primary shrink-0 gap-2">
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Share this link with homeowners. You earn a commission for every
          installed referral.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-padded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Earnings</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                ${totalEarnings.toLocaleString()}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="card-padded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Payouts</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">
                ${pendingPayouts.toLocaleString()}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="card-padded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Referrals</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {totalReferrals}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="card-padded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Conversion Rate</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {totalReferrals > 0
                  ? Math.round((convertedCount / totalReferrals) * 100)
                  : 0}
                %
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Referral table */}
      <div className="card overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Referral History
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Customer
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Commission
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {referrals.map((ref) => (
                <tr key={ref.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {ref.customerName || ref.referredName || "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyle(ref.status)}`}
                    >
                      {getStatusLabel(ref.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {ref.commission
                      ? `$${ref.commission.toLocaleString()}`
                      : "TBD"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {ref.createdAt?.toDate
                      ? ref.createdAt.toDate().toLocaleDateString()
                      : ref.createdAt
                        ? new Date(ref.createdAt).toLocaleDateString()
                        : "N/A"}
                  </td>
                </tr>
              ))}
              {referrals.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    <Gift className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2">
                      No referrals yet. Share your link to start earning.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* How it works */}
      <div className="card-padded">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">
          How Referrals Work
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">
              1
            </div>
            <p className="text-xs text-gray-600">Share your link</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300" />
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">
              2
            </div>
            <p className="text-xs text-gray-600">Homeowner signs up</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300" />
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">
              3
            </div>
            <p className="text-xs text-gray-600">System installed</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300" />
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 text-sm font-bold">
              $
            </div>
            <p className="text-xs text-gray-600">You get paid</p>
          </div>
        </div>
      </div>
    </div>
  );
}
