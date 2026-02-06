import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Gift, DollarSign, Users, ArrowRight, Loader2 } from "lucide-react";
import {
  getReferralData,
  createReferralRecord,
} from "../services/referralService";
import { getCurrentUser, getUserProfile } from "../services/firebase";

export default function ReferralWidget() {
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      setLoading(true);
      const user = getCurrentUser();

      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      // Try to get existing referral data
      let data = await getReferralData(user.uid);

      // If no referral data exists, create it
      if (!data) {
        const userProfile = await getUserProfile(user.uid);
        const userData = {
          email: user.email,
          displayName: userProfile?.displayName || user.displayName || "",
        };
        await createReferralRecord(user.uid, userData);
        data = await getReferralData(user.uid);
      }

      setReferralData(data);
    } catch (err) {
      console.error("Error loading referral data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 rounded-xl p-6 border border-emerald-800/30">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-emerald-500" size={32} />
        </div>
      </div>
    );
  }

  if (error || !referralData) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 rounded-xl p-6 border border-emerald-800/30">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-900/40 rounded-lg">
            <Gift className="text-emerald-400" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Referral Program</h3>
            <p className="text-gray-400 text-sm">Earn $500 per installation</p>
          </div>
        </div>
        <Link
          to="/referrals"
          className="text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 text-sm font-semibold"
        >
          View All
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-900/50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <DollarSign className="text-emerald-500" size={16} />
            <span className="text-xl font-bold text-white">
              ${referralData.totalEarnings.toFixed(0)}
            </span>
          </div>
          <div className="text-gray-400 text-xs">Earned</div>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="text-blue-400" size={16} />
            <span className="text-xl font-bold text-white">
              {referralData.totalReferrals}
            </span>
          </div>
          <div className="text-gray-400 text-xs">Referrals</div>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-xl font-bold text-emerald-500">
              {referralData.installedReferrals}
            </span>
          </div>
          <div className="text-gray-400 text-xs">Installed</div>
        </div>
      </div>

      <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
        <div className="text-gray-400 text-xs mb-1">Your Referral Code</div>
        <div className="flex items-center justify-between">
          <code className="text-emerald-400 font-mono text-lg font-bold">
            {referralData.referralCode}
          </code>
          <button
            onClick={() => {
              const link = `${window.location.origin}/qualify?ref=${referralData.referralCode}`;
              navigator.clipboard.writeText(link);
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300 transition"
          >
            Copy Link
          </button>
        </div>
      </div>

      <Link
        to="/referrals"
        className="block w-full text-center px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition"
      >
        Share & Earn
      </Link>
    </div>
  );
}
