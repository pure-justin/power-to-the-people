import { useState, useEffect } from "react";
import {
  DollarSign,
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  Award,
  Gift,
  Target,
  Zap,
  MousePointer,
} from "lucide-react";
import {
  getReferralAnalytics,
  getUserReferrals,
  getReferralClickStats,
  getReferralData,
} from "../services/referralService";

/**
 * Enhanced Referral Dashboard Component
 * Shows detailed metrics, progress tracking, and earnings breakdown
 */
export default function ReferralDashboard({ userId }) {
  const [analytics, setAnalytics] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [clickStats, setClickStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("all"); // all, month, week

  useEffect(() => {
    loadDashboardData();
  }, [userId, timeframe]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsData, referralsData, referralData] = await Promise.all([
        getReferralAnalytics(userId),
        getUserReferrals(userId),
        getReferralData(userId),
      ]);

      setAnalytics(analyticsData);
      setReferrals(filterByTimeframe(referralsData, timeframe));

      // Load click stats if we have a referral code
      if (referralData?.referralCode) {
        try {
          const clicks = await getReferralClickStats(referralData.referralCode);
          setClickStats(clicks);
        } catch {
          // Click stats are non-critical
        }
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterByTimeframe = (data, timeframe) => {
    if (timeframe === "all") return data;

    const now = new Date();
    const cutoff = new Date();

    if (timeframe === "week") {
      cutoff.setDate(now.getDate() - 7);
    } else if (timeframe === "month") {
      cutoff.setMonth(now.getMonth() - 1);
    }

    return data.filter((item) => {
      const date = item.createdAt?.toDate?.() || new Date(item.createdAt);
      return date >= cutoff;
    });
  };

  const getNextMilestone = () => {
    if (!analytics) return null;

    const milestones = [
      { count: 1, reward: "First Referral Badge", icon: Gift },
      { count: 5, reward: "$100 Bonus", icon: DollarSign },
      { count: 10, reward: "Bronze Status", icon: Award },
      { count: 25, reward: "$500 Bonus", icon: DollarSign },
      { count: 50, reward: "Silver Status", icon: Award },
      { count: 100, reward: "$2,000 Bonus", icon: DollarSign },
    ];

    const current = analytics.installedReferrals;
    const next = milestones.find((m) => m.count > current);

    if (!next) return null;

    return {
      ...next,
      progress: (current / next.count) * 100,
      remaining: next.count - current,
    };
  };

  const getStatusProgress = () => {
    if (!referrals.length) return [];

    const funnel = [
      { status: "signed_up", label: "Signed Up", count: 0 },
      { status: "qualified", label: "Qualified", count: 0 },
      { status: "site_survey", label: "Site Survey", count: 0 },
      { status: "installed", label: "Installed", count: 0 },
    ];

    referrals.forEach((ref) => {
      const step = funnel.find((f) => f.status === ref.status);
      if (step) step.count++;
    });

    return funnel;
  };

  const nextMilestone = getNextMilestone();
  const statusProgress = getStatusProgress();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>Unable to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeframe Selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTimeframe("all")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            timeframe === "all"
              ? "bg-emerald-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          All Time
        </button>
        <button
          onClick={() => setTimeframe("month")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            timeframe === "month"
              ? "bg-emerald-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          This Month
        </button>
        <button
          onClick={() => setTimeframe("week")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            timeframe === "week"
              ? "bg-emerald-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          This Week
        </button>
      </div>

      {/* Next Milestone */}
      {nextMilestone && (
        <div className="bg-gradient-to-r from-emerald-900/30 to-emerald-800/20 border border-emerald-700/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-600 rounded-lg">
                <nextMilestone.icon size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold">Next Milestone</h3>
                <p className="text-emerald-300 text-sm">
                  {nextMilestone.reward}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {nextMilestone.remaining}
              </div>
              <div className="text-emerald-300 text-sm">more installs</div>
            </div>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3">
            <div
              className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${nextMilestone.progress}%` }}
            ></div>
          </div>
          <p className="text-emerald-300 text-sm mt-2">
            {Math.round(nextMilestone.progress)}% complete
          </p>
        </div>
      )}

      {/* Conversion Funnel */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="text-xl font-bold text-white mb-6">Conversion Funnel</h3>
        <div className="space-y-4">
          {statusProgress.map((step, index) => {
            const total = referrals.length;
            const percentage = total > 0 ? (step.count / total) * 100 : 0;

            return (
              <div key={step.status}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0
                          ? "bg-blue-600 text-white"
                          : index === 1
                            ? "bg-yellow-600 text-white"
                            : index === 2
                              ? "bg-purple-600 text-white"
                              : "bg-green-600 text-white"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="text-white font-medium">{step.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">
                      {Math.round(percentage)}%
                    </span>
                    <span className="text-white font-bold">{step.count}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      index === 0
                        ? "bg-blue-500"
                        : index === 1
                          ? "bg-yellow-500"
                          : index === 2
                            ? "bg-purple-500"
                            : "bg-green-500"
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-900/30 rounded-lg">
              <Target size={24} className="text-blue-400" />
            </div>
            <div>
              <div className="text-gray-400 text-sm">Conversion Rate</div>
              <div className="text-2xl font-bold text-white">
                {analytics.conversionRate}%
              </div>
            </div>
          </div>
          <p className="text-gray-500 text-sm">
            {analytics.conversionRate >= 50
              ? "Excellent! Above average"
              : "Keep improving your pitch"}
          </p>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-900/30 rounded-lg">
              <Zap size={24} className="text-purple-400" />
            </div>
            <div>
              <div className="text-gray-400 text-sm">Install Rate</div>
              <div className="text-2xl font-bold text-white">
                {analytics.installRate}%
              </div>
            </div>
          </div>
          <p className="text-gray-500 text-sm">
            {analytics.installRate >= 40
              ? "Outstanding results!"
              : "Good progress"}
          </p>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-900/30 rounded-lg">
              <DollarSign size={24} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-gray-400 text-sm">Avg Earnings</div>
              <div className="text-2xl font-bold text-white">
                $
                {referrals.length > 0
                  ? Math.round(analytics.totalEarnings / referrals.length)
                  : 0}
              </div>
            </div>
          </div>
          <p className="text-gray-500 text-sm">Per referral</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="text-xl font-bold text-white mb-6">Quick Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-gray-400 text-sm mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-500">
              {analytics.statusCounts.signed_up}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-sm mb-1">Qualified</div>
            <div className="text-2xl font-bold text-blue-500">
              {analytics.qualifiedReferrals}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-sm mb-1">In Progress</div>
            <div className="text-2xl font-bold text-purple-500">
              {analytics.statusCounts.site_survey}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-sm mb-1">Completed</div>
            <div className="text-2xl font-bold text-green-500">
              {analytics.installedReferrals}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
