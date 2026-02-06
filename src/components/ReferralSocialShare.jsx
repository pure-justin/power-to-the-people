import { useState } from "react";
import {
  Share2,
  Copy,
  Mail,
  MessageCircle,
  Facebook,
  Twitter,
  Linkedin,
  CheckCircle,
  Download,
  Link as LinkIcon,
} from "lucide-react";
import { generateReferralLink } from "../services/referralService";

/**
 * Social Sharing Component for Referral Links
 * Supports multiple platforms and custom messaging
 */
export default function ReferralSocialShare({ referralCode, userName }) {
  const [copied, setCopied] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const referralLink = generateReferralLink(referralCode);

  const defaultMessages = {
    short: `Get free battery backup for your home! Use my link: ${referralLink}`,
    medium: `Hey! I just qualified for a free home battery backup through Power to the People. You should check it out too! Use my referral link: ${referralLink}`,
    long: `🔋 Free Battery Backup Alert!\n\nI just signed up for Power to the People and got approved for a FREE home battery system. No catch - they're enrolling homes in a virtual power plant program.\n\nBenefits:\n✅ Free installation & equipment\n✅ Backup power during outages\n✅ Earn money selling power back to the grid\n✅ Lower energy bills\n\nCheck it out here: ${referralLink}\n\nIt takes just 5 minutes to see if you qualify!`,
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text || referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaEmail = (message) => {
    const subject = encodeURIComponent(
      "Get Free Battery Backup for Your Home!",
    );
    const body = encodeURIComponent(message || defaultMessages.long);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const shareViaSMS = (message) => {
    const text = encodeURIComponent(message || defaultMessages.short);
    window.location.href = `sms:?body=${text}`;
  };

  const shareViaFacebook = () => {
    const url = encodeURIComponent(referralLink);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      "_blank",
      "width=600,height=400",
    );
  };

  const shareViaTwitter = () => {
    const text = encodeURIComponent(
      `🔋 Get free battery backup for your home! Just qualified through @PowerToThePeople`,
    );
    const url = encodeURIComponent(referralLink);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank",
      "width=600,height=400",
    );
  };

  const shareViaLinkedIn = () => {
    const url = encodeURIComponent(referralLink);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      "_blank",
      "width=600,height=400",
    );
  };

  const shareViaWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Power to the People - Free Battery Backup",
          text: defaultMessages.medium,
          url: referralLink,
        });
      } catch (error) {
        console.log("Share cancelled or failed:", error);
      }
    }
  };

  const downloadQRCode = async () => {
    // Generate QR code using a free API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(referralLink)}`;
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `power-to-the-people-referral-${referralCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Quick Copy */}
      <div className="bg-gradient-to-r from-emerald-900/30 to-emerald-800/20 border border-emerald-700/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Share2 className="text-emerald-400" size={24} />
          <h3 className="text-xl font-bold text-white">Share Your Link</h3>
        </div>

        <div className="flex items-center gap-3 bg-gray-900 rounded-lg p-4 mb-4">
          <LinkIcon className="text-gray-400" size={20} />
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 bg-transparent text-white outline-none text-sm"
          />
          <button
            onClick={() => copyToClipboard()}
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

        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
          <span>or</span>
        </div>

        {/* Social Platform Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <button
            onClick={() => shareViaEmail()}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
          >
            <Mail size={18} />
            Email
          </button>

          <button
            onClick={() => shareViaSMS()}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
          >
            <MessageCircle size={18} />
            SMS
          </button>

          <button
            onClick={shareViaFacebook}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            <Facebook size={18} />
            Facebook
          </button>

          <button
            onClick={shareViaTwitter}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition"
          >
            <Twitter size={18} />
            Twitter
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <button
            onClick={shareViaLinkedIn}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition"
          >
            <Linkedin size={18} />
            LinkedIn
          </button>

          {navigator.share && (
            <button
              onClick={shareViaWebShare}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
            >
              <Share2 size={18} />
              More
            </button>
          )}
        </div>
      </div>

      {/* Pre-written Messages */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-bold text-white mb-4">
          Pre-written Messages
        </h3>
        <div className="space-y-3">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-emerald-400 text-sm font-semibold">
                Short (SMS)
              </span>
              <button
                onClick={() => copyToClipboard(defaultMessages.short)}
                className="text-gray-400 hover:text-white transition"
              >
                <Copy size={16} />
              </button>
            </div>
            <p className="text-gray-300 text-sm">{defaultMessages.short}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-400 text-sm font-semibold">
                Medium (Email)
              </span>
              <button
                onClick={() => copyToClipboard(defaultMessages.medium)}
                className="text-gray-400 hover:text-white transition"
              >
                <Copy size={16} />
              </button>
            </div>
            <p className="text-gray-300 text-sm">{defaultMessages.medium}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-400 text-sm font-semibold">
                Long (Social Media)
              </span>
              <button
                onClick={() => copyToClipboard(defaultMessages.long)}
                className="text-gray-400 hover:text-white transition"
              >
                <Copy size={16} />
              </button>
            </div>
            <p className="text-gray-300 text-sm whitespace-pre-line">
              {defaultMessages.long}
            </p>
          </div>
        </div>
      </div>

      {/* Custom Message */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Custom Message</h3>
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="text-emerald-400 text-sm hover:text-emerald-300 transition"
          >
            {showCustom ? "Hide" : "Create"}
          </button>
        </div>

        {showCustom && (
          <div className="space-y-3">
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Write your own message..."
              className="w-full bg-gray-800 text-white rounded-lg p-4 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              rows={4}
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => copyToClipboard(customMessage)}
                disabled={!customMessage}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 text-white rounded-lg transition flex items-center gap-2"
              >
                <Copy size={16} />
                Copy
              </button>
              <button
                onClick={() => shareViaEmail(customMessage)}
                disabled={!customMessage}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 text-white rounded-lg transition flex items-center gap-2"
              >
                <Mail size={16} />
                Email
              </button>
              <button
                onClick={() => shareViaSMS(customMessage)}
                disabled={!customMessage}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 text-white rounded-lg transition flex items-center gap-2"
              >
                <MessageCircle size={16} />
                SMS
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Download */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-bold text-white mb-4">
          Print & Share QR Code
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Download a QR code that links directly to your referral page. Perfect
          for business cards, flyers, or social media posts.
        </p>
        <button
          onClick={downloadQRCode}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition flex items-center gap-2"
        >
          <Download size={18} />
          Download QR Code
        </button>
      </div>
    </div>
  );
}
