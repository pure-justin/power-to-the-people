import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db, collection, query, where, getDocs } from "../../services/firebase";
import {
  Users,
  DollarSign,
  Copy,
  Check,
  Gift,
  Clock,
  UserPlus,
  Share2,
} from "lucide-react";

const REFERRAL_STATUS = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  qualified: { label: "Qualified", className: "bg-blue-100 text-blue-700" },
  installed: { label: "Installed", className: "bg-green-100 text-green-700" },
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700" },
  expired: { label: "Expired", className: "bg-gray-100 text-gray-600" },
};

export default function PortalReferrals() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const referralCode = user?.uid?.slice(0, 8)?.toUpperCase() || "--------";
  const referralLink = `${window.location.origin}/qualify?ref=${referralCode}`;

  useEffect(() => {
    if (!user) return;
    const loadReferrals = async () => {
      try {
        const q = query(
          collection(db, "referrals"),
          where("referrerId", "==", user.uid),
        );
        const snap = await getDocs(q);
        setReferrals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to load referrals:", err);
      } finally {
        setLoading(false);
      }
    };
    loadReferrals();
  }, [user]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = referralLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const totalEarnings = referrals
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + (r.commission || 0), 0);
  const pendingPayouts = referrals
    .filter((r) => ["installed", "qualified"].includes(r.status))
    .reduce((sum, r) => sum + (r.commission || 0), 0);
  const totalReferrals = referrals.length;

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-32 rounded-xl bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Referral Center</h1>
        <p className="mt-1 text-sm text-gray-500">
          Share solar with friends and earn rewards
        </p>
      </div>

      {/* Referral Link Card */}
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
            <Share2 className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              Your Referral Link
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Share this link with friends and family. You earn a reward when
              they go solar.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5">
                <p className="truncate text-sm font-mono text-gray-700">
                  {referralLink}
                </p>
              </div>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  copied
                    ? "bg-green-100 text-green-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
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
            <p className="mt-2 text-xs text-gray-400">
              Referral code: {referralCode}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Earned</p>
              <p className="text-xl font-bold text-gray-900">
                ${totalEarnings.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Payouts</p>
              <p className="text-xl font-bold text-gray-900">
                ${pendingPayouts.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Referrals</p>
              <p className="text-xl font-bold text-gray-900">
                {totalReferrals}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Your Referrals
          </h2>
        </div>
        {referrals.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Gift className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm font-medium text-gray-900">
              No referrals yet
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Share your link with friends and family to start earning rewards.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Referral
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {referrals.map((ref) => {
                  const statusCfg =
                    REFERRAL_STATUS[ref.status] || REFERRAL_STATUS.pending;
                  return (
                    <tr key={ref.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {ref.referredName || "Referred Customer"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {ref.referredEmail || ""}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {ref.commission
                          ? `$${ref.commission.toLocaleString()}`
                          : "--"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {ref.createdAt?.toDate
                          ? ref.createdAt.toDate().toLocaleDateString()
                          : "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
