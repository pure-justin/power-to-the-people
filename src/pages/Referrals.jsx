import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Share2,
  Copy,
  DollarSign,
  Users,
  TrendingUp,
  CheckCircle,
  ArrowLeft,
  Gift,
  Award,
  ExternalLink,
  Mail,
  MessageCircle,
  BarChart3,
  Wallet,
  Clock,
  AlertCircle,
} from "lucide-react";
import { getCurrentUser, onAuthChange } from "../services/firebase";
import {
  getReferralData,
  getUserReferrals,
  getReferralAnalytics,
  generateReferralLink,
  getReferralLeaderboard,
  requestPayout,
  getUserPayouts,
} from "../services/referralService";
import ReferralDashboard from "../components/ReferralDashboard";
import ReferralSocialShare from "../components/ReferralSocialShare";

export default function Referrals() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // overview, dashboard, share, referrals, leaderboard, payouts
  const [payouts, setPayouts] = useState([]);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("direct_deposit");
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutError, setPayoutError] = useState("");
  const [payoutSuccess, setPayoutSuccess] = useState("");

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      loadReferralData(currentUser.uid);
    } else {
      // Listen for auth changes
      const unsubscribe = onAuthChange((user) => {
        if (user) {
          setUser(user);
          loadReferralData(user.uid);
        } else {
          navigate("/portal");
        }
      });
      return () => unsubscribe();
    }
  }, [navigate]);

  const loadReferralData = async (userId) => {
    try {
      setLoading(true);
      const [data, refs, analyticsData, board, userPayouts] = await Promise.all(
        [
          getReferralData(userId),
          getUserReferrals(userId),
          getReferralAnalytics(userId),
          getReferralLeaderboard(10),
          getUserPayouts(userId).catch(() => []),
        ],
      );

      setReferralData(data);
      setReferrals(refs);
      setAnalytics(analyticsData);
      setLeaderboard(board);
      setPayouts(userPayouts);
    } catch (error) {
      console.error("Error loading referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (referralData) {
      const link = generateReferralLink(referralData.referralCode);
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareViaEmail = () => {
    if (referralData) {
      const link = generateReferralLink(referralData.referralCode);
      const subject = encodeURIComponent(
        "Get Free Battery Backup for Your Home!",
      );
      const body = encodeURIComponent(
        `Hey! I just qualified for a free home battery backup through Power to the People. You should check it out too!\n\nUse my referral link to get started: ${link}\n\nIt's completely free and takes just 5 minutes to see if you qualify.`,
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }
  };

  const shareViaSMS = () => {
    if (referralData) {
      const link = generateReferralLink(referralData.referralCode);
      const message = encodeURIComponent(
        `Check this out - free battery backup for your home! Use my link: ${link}`,
      );
      window.location.href = `sms:?body=${message}`;
    }
  };

  const handlePayoutRequest = async (e) => {
    e.preventDefault();
    setPayoutError("");
    setPayoutSuccess("");

    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount < 25) {
      setPayoutError("Minimum payout amount is $25");
      return;
    }

    if (amount > (referralData?.pendingEarnings || 0)) {
      setPayoutError("Amount exceeds your pending earnings");
      return;
    }

    try {
      setPayoutSubmitting(true);
      await requestPayout(user.uid, amount, payoutMethod);
      setPayoutSuccess(
        `Payout of $${amount.toFixed(2)} requested successfully!`,
      );
      setPayoutAmount("");
      // Reload data to reflect updated balances
      await loadReferralData(user.uid);
    } catch (error) {
      setPayoutError(error.message);
    } finally {
      setPayoutSubmitting(false);
    }
  };

  const getPayoutStatusBadge = (status) => {
    const badges = {
      pending: { label: "Pending", color: "bg-yellow-900/30 text-yellow-300" },
      processing: {
        label: "Processing",
        color: "bg-blue-900/30 text-blue-300",
      },
      completed: {
        label: "Completed",
        color: "bg-green-900/30 text-green-300",
      },
      failed: { label: "Failed", color: "bg-red-900/30 text-red-300" },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}
      >
        {badge.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      signed_up: {
        label: "Signed Up",
        color: "bg-blue-100 text-blue-800",
        darkColor: "bg-blue-900/30 text-blue-300",
      },
      qualified: {
        label: "Qualified",
        color: "bg-yellow-100 text-yellow-800",
        darkColor: "bg-yellow-900/30 text-yellow-300",
      },
      site_survey: {
        label: "Site Survey",
        color: "bg-purple-100 text-purple-800",
        darkColor: "bg-purple-900/30 text-purple-300",
      },
      installed: {
        label: "Installed",
        color: "bg-green-100 text-green-800",
        darkColor: "bg-green-900/30 text-green-300",
      },
    };

    const badge = badges[status] || badges.signed_up;
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.darkColor}`}
      >
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading referral data...</p>
        </div>
      </div>
    );
  }

  if (!referralData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Gift className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Referral Program Not Set Up
          </h2>
          <p className="text-gray-400 mb-6">
            Contact support to get your referral account activated.
          </p>
          <Link
            to="/portal"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            <ArrowLeft size={20} />
            Back to Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <style>{`
        .referral-gradient {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05));
        }

        .stat-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.1);
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          border-color: rgba(16, 185, 129, 0.3);
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }

        .tab-button {
          padding: 12px 24px;
          border-bottom: 2px solid transparent;
          color: rgba(255,255,255,0.6);
          font-weight: 600;
          transition: all 0.3s;
        }

        .tab-button:hover {
          color: rgba(255,255,255,0.9);
        }

        .tab-button.active {
          color: #10b981;
          border-bottom-color: #10b981;
        }
      `}</style>

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/portal"
                className="text-gray-400 hover:text-white transition"
              >
                <ArrowLeft size={24} />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Referral Program
                </h1>
                <p className="text-gray-400 mt-1">
                  Earn up to $500 per successful referral
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Your Referral Code</div>
              <div className="text-2xl font-bold text-emerald-500">
                {referralData.referralCode}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="stat-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-900/30 rounded-lg">
                <DollarSign className="text-emerald-500" size={24} />
              </div>
              <TrendingUp className="text-emerald-500" size={20} />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              ${referralData.totalEarnings.toFixed(2)}
            </div>
            <div className="text-gray-400 text-sm">Total Earnings</div>
            <div className="mt-2 text-xs text-gray-500">
              ${referralData.pendingEarnings.toFixed(2)} pending
            </div>
          </div>

          <div className="stat-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-900/30 rounded-lg">
                <Users className="text-blue-400" size={24} />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {referralData.totalReferrals}
            </div>
            <div className="text-gray-400 text-sm">Total Referrals</div>
            <div className="mt-2 text-xs text-gray-500">
              {referralData.qualifiedReferrals} qualified
            </div>
          </div>

          <div className="stat-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-900/30 rounded-lg">
                <CheckCircle className="text-purple-400" size={24} />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {referralData.installedReferrals}
            </div>
            <div className="text-gray-400 text-sm">Installed Systems</div>
            <div className="mt-2 text-xs text-gray-500">
              {analytics?.installRate || 0}% conversion rate
            </div>
          </div>

          <div className="stat-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-900/30 rounded-lg">
                <Award className="text-yellow-400" size={24} />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {analytics?.conversionRate || 0}%
            </div>
            <div className="text-gray-400 text-sm">Qualification Rate</div>
            <div className="mt-2 text-xs text-gray-500">Above average!</div>
          </div>
        </div>

        {/* Share Section */}
        <div className="referral-gradient rounded-xl p-8 mb-8 border border-emerald-900/30">
          <div className="text-center max-w-2xl mx-auto">
            <Share2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Share Your Link
            </h2>
            <p className="text-gray-400 mb-6">
              Earn $500 for every friend who gets a battery system installed
            </p>

            <div className="flex items-center gap-3 bg-gray-900 rounded-lg p-4 mb-6">
              <input
                type="text"
                value={generateReferralLink(referralData.referralCode)}
                readOnly
                className="flex-1 bg-transparent text-white outline-none"
              />
              <button
                onClick={copyReferralLink}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle size={18} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copy
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={shareViaEmail}
                className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
              >
                <Mail size={18} />
                Email
              </button>
              <button
                onClick={shareViaSMS}
                className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
              >
                <MessageCircle size={18} />
                Text
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-800 mb-8">
          <div className="flex items-center gap-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`tab-button ${activeTab === "overview" ? "active" : ""}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`tab-button ${activeTab === "dashboard" ? "active" : ""}`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 size={18} />
                Analytics
              </div>
            </button>
            <button
              onClick={() => setActiveTab("share")}
              className={`tab-button ${activeTab === "share" ? "active" : ""}`}
            >
              <div className="flex items-center gap-2">
                <Share2 size={18} />
                Share
              </div>
            </button>
            <button
              onClick={() => setActiveTab("referrals")}
              className={`tab-button ${activeTab === "referrals" ? "active" : ""}`}
            >
              My Referrals ({referrals.length})
            </button>
            <button
              onClick={() => setActiveTab("payouts")}
              className={`tab-button ${activeTab === "payouts" ? "active" : ""}`}
            >
              <div className="flex items-center gap-2">
                <Wallet size={18} />
                Payouts
              </div>
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`tab-button ${activeTab === "leaderboard" ? "active" : ""}`}
            >
              Leaderboard
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "dashboard" && <ReferralDashboard userId={user.uid} />}

        {activeTab === "share" && (
          <ReferralSocialShare
            referralCode={referralData.referralCode}
            userName={user.displayName || user.email}
          />
        )}

        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Earning Breakdown */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-6">
                How You Earn
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-900/30 rounded-full flex items-center justify-center">
                      <span className="text-blue-400 font-bold">1</span>
                    </div>
                    <div>
                      <div className="text-white font-semibold">
                        Friend Signs Up
                      </div>
                      <div className="text-gray-400 text-sm">
                        They complete the qualification form
                      </div>
                    </div>
                  </div>
                  <div className="text-emerald-500 font-bold">$0</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-yellow-900/30 rounded-full flex items-center justify-center">
                      <span className="text-yellow-400 font-bold">2</span>
                    </div>
                    <div>
                      <div className="text-white font-semibold">
                        Site Survey Scheduled
                      </div>
                      <div className="text-gray-400 text-sm">
                        Technician visits their home
                      </div>
                    </div>
                  </div>
                  <div className="text-emerald-500 font-bold">$50</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-900/30 rounded-full flex items-center justify-center">
                      <span className="text-green-400 font-bold">3</span>
                    </div>
                    <div>
                      <div className="text-white font-semibold">
                        System Installed
                      </div>
                      <div className="text-gray-400 text-sm">
                        Battery system goes live
                      </div>
                    </div>
                  </div>
                  <div className="text-emerald-500 font-bold">$450</div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-emerald-900/20 border border-emerald-800/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-white font-semibold">
                    Total Per Referral
                  </div>
                  <div className="text-2xl font-bold text-emerald-500">
                    $500
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-6">
                Recent Referrals
              </h3>
              {referrals.length > 0 ? (
                <div className="space-y-3">
                  {referrals.slice(0, 5).map((ref) => (
                    <div
                      key={ref.id}
                      className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                    >
                      <div>
                        <div className="text-white font-semibold">
                          {ref.referredName}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {ref.referredEmail}
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(ref.status)}
                        <div className="text-gray-400 text-xs mt-1">
                          ${ref.earnings} earned
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No referrals yet. Start sharing your link!
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "referrals" && (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-6">
              All Referrals ({referrals.length})
            </h3>
            {referrals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">
                        Contact
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">
                        Earnings
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((ref) => (
                      <tr
                        key={ref.id}
                        className="border-b border-gray-800 hover:bg-gray-800/50 transition"
                      >
                        <td className="py-4 px-4 text-white">
                          {ref.referredName}
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-gray-300">
                            {ref.referredEmail}
                          </div>
                          {ref.referredPhone && (
                            <div className="text-gray-500 text-sm">
                              {ref.referredPhone}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(ref.status)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-emerald-500 font-semibold">
                            ${ref.earnings}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-400">
                          {ref.createdAt?.toDate
                            ? new Date(
                                ref.createdAt.toDate(),
                              ).toLocaleDateString()
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No referrals yet</p>
                <p className="text-sm">
                  Share your referral link to start earning!
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-6">
              Top Referrers This Month
            </h3>
            {leaderboard.length > 0 ? (
              <div className="space-y-3">
                {leaderboard.map((entry, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      index === 0
                        ? "bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border border-yellow-700/30"
                        : index === 1
                          ? "bg-gradient-to-r from-gray-700/30 to-gray-600/20 border border-gray-600/30"
                          : index === 2
                            ? "bg-gradient-to-r from-orange-900/30 to-orange-800/20 border border-orange-700/30"
                            : "bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          index === 0
                            ? "bg-yellow-500 text-black"
                            : index === 1
                              ? "bg-gray-400 text-black"
                              : index === 2
                                ? "bg-orange-500 text-black"
                                : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-semibold">
                          {entry.displayName}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {entry.installedReferrals} installed •{" "}
                          {entry.totalReferrals} total
                        </div>
                      </div>
                    </div>
                    <div className="text-emerald-500 font-bold text-lg">
                      ${entry.totalEarnings.toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Award className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No leaderboard data yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "payouts" && (
          <div className="space-y-6">
            {/* Request Payout */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-2">
                Request Payout
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Minimum payout: $25. Available balance: $
                {referralData.pendingEarnings.toFixed(2)}
              </p>

              {payoutError && (
                <div className="flex items-center gap-2 p-4 mb-4 bg-red-900/20 border border-red-800/30 rounded-lg text-red-300 text-sm">
                  <AlertCircle size={18} />
                  {payoutError}
                </div>
              )}

              {payoutSuccess && (
                <div className="flex items-center gap-2 p-4 mb-4 bg-emerald-900/20 border border-emerald-800/30 rounded-lg text-emerald-300 text-sm">
                  <CheckCircle size={18} />
                  {payoutSuccess}
                </div>
              )}

              {referralData.pendingEarnings >= 25 ? (
                <form onSubmit={handlePayoutRequest} className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Amount ($)
                    </label>
                    <input
                      type="number"
                      min="25"
                      max={referralData.pendingEarnings}
                      step="0.01"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Payout Method
                    </label>
                    <select
                      value={payoutMethod}
                      onChange={(e) => setPayoutMethod(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="direct_deposit">
                        Direct Deposit (ACH)
                      </option>
                      <option value="check">Check by Mail</option>
                      <option value="paypal">PayPal</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={payoutSubmitting}
                    className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    {payoutSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <DollarSign size={18} />
                        Request Payout
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>
                    You need at least $25 in pending earnings to request a
                    payout.
                  </p>
                  <p className="text-sm mt-2">
                    Current balance: ${referralData.pendingEarnings.toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {/* Earnings Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <div className="text-gray-400 text-sm mb-1">Total Earned</div>
                <div className="text-2xl font-bold text-white">
                  ${referralData.totalEarnings.toFixed(2)}
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <div className="text-gray-400 text-sm mb-1">Available</div>
                <div className="text-2xl font-bold text-emerald-400">
                  ${referralData.pendingEarnings.toFixed(2)}
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <div className="text-gray-400 text-sm mb-1">Paid Out</div>
                <div className="text-2xl font-bold text-white">
                  ${referralData.paidEarnings.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Payout History */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-6">
                Payout History
              </h3>
              {payouts.length > 0 ? (
                <div className="space-y-3">
                  {payouts.map((payout) => (
                    <div
                      key={payout.id}
                      className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                    >
                      <div>
                        <div className="text-white font-semibold">
                          ${payout.amount.toFixed(2)}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {payout.method === "direct_deposit"
                            ? "Direct Deposit"
                            : payout.method === "check"
                              ? "Check"
                              : "PayPal"}
                          {" · "}
                          {payout.requestedAt?.toDate
                            ? new Date(
                                payout.requestedAt.toDate(),
                              ).toLocaleDateString()
                            : "Pending"}
                        </div>
                      </div>
                      <div className="text-right">
                        {getPayoutStatusBadge(payout.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No payouts yet</p>
                  <p className="text-sm mt-1">
                    Request your first payout when you have $25+ in earnings
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
