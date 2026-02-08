/**
 * Credit Detail -- Individual credit listing page
 *
 * Shows full audit report, insurance details, verification level,
 * and allows buyers to make offers or purchase at asking price.
 * Sellers see their offer history and can accept/reject/counter.
 */
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  getCreditListing,
  makeOffer,
  respondToOffer,
  initiateCreditTransfer,
} from "../../services/taxCreditService";
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Star,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  DollarSign,
  MapPin,
  Calendar,
  Zap,
  FileText,
  TrendingDown,
  Send,
  Loader2,
  Clock,
  MessageSquare,
} from "lucide-react";

const VERIFICATION_LABELS = {
  1: {
    label: "Bronze",
    color: "border-amber-300 bg-amber-50 text-amber-800",
    desc: "Platform audited",
  },
  2: {
    label: "Silver",
    color: "border-gray-300 bg-gray-50 text-gray-800",
    desc: "Platform + third-party audited",
  },
  3: {
    label: "Gold",
    color: "border-yellow-300 bg-yellow-50 text-yellow-800",
    desc: "Audited + insured",
  },
  4: {
    label: "Platinum",
    color: "border-indigo-300 bg-indigo-50 text-indigo-800",
    desc: "Audited + insured + escrow",
  },
};

function AuditCheckRow({ check }) {
  const statusConfig = {
    pass: { icon: CheckCircle2, color: "text-green-600", label: "Pass" },
    fail: { icon: XCircle, color: "text-red-600", label: "Fail" },
    waived: { icon: AlertTriangle, color: "text-amber-500", label: "Waived" },
    pending: { icon: Clock, color: "text-gray-400", label: "Pending" },
  };
  const config = statusConfig[check.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${config.color}`} />
        <span className="text-sm text-gray-700">
          {check.checkType
            ?.replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>
      </div>
      <span className={`text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
}

export default function CreditDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [audit, setAudit] = useState(null);
  const [insurance, setInsurance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Offer form
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Counter form
  const [counteringOfferId, setCounteringOfferId] = useState(null);
  const [counterAmount, setCounterAmount] = useState("");

  useEffect(() => {
    const loadListing = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const result = await getCreditListing(id);
        setListing(result.listing);
        setAudit(result.audit);
        setInsurance(result.insurance);
      } catch (err) {
        console.error("Failed to load listing:", err);
        setError("Failed to load credit details.");
      } finally {
        setLoading(false);
      }
    };
    loadListing();
  }, [id]);

  const isSeller = listing?.sellerId === user?.uid;
  const level = listing?.verificationLevel?.level || 1;
  const vConfig = VERIFICATION_LABELS[level] || VERIFICATION_LABELS[1];

  const handleMakeOffer = async () => {
    if (!offerAmount) return;
    setSubmitting(true);
    try {
      await makeOffer(id, parseFloat(offerAmount), offerMessage);
      // Reload listing to show new offer
      const result = await getCreditListing(id);
      setListing(result.listing);
      setShowOfferForm(false);
      setOfferAmount("");
      setOfferMessage("");
    } catch (err) {
      console.error("Failed to make offer:", err);
      setError(err.message || "Failed to submit offer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespondToOffer = async (offerId, response, counter) => {
    setSubmitting(true);
    try {
      await respondToOffer(
        id,
        offerId,
        response,
        counter ? parseFloat(counter) : undefined,
      );
      const result = await getCreditListing(id);
      setListing(result.listing);
      setCounteringOfferId(null);
      setCounterAmount("");
    } catch (err) {
      console.error("Failed to respond to offer:", err);
      setError(err.message || "Failed to respond.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuyNow = async () => {
    setSubmitting(true);
    try {
      // Make offer at asking price
      const result = await makeOffer(
        id,
        listing.listing?.askingPrice,
        "Buy now at asking price",
      );
      // If fixed price, auto-accept and initiate transfer
      if (listing.listing?.auctionStyle === "fixed_price") {
        await respondToOffer(id, result.offerId, "accepted");
        await initiateCreditTransfer(id, result.offerId);
      }
      const refreshed = await getCreditListing(id);
      setListing(refreshed.listing);
    } catch (err) {
      console.error("Buy now error:", err);
      setError(err.message || "Failed to purchase.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitiateTransfer = async (offerId) => {
    setSubmitting(true);
    try {
      await initiateCreditTransfer(id, offerId);
      const result = await getCreditListing(id);
      setListing(result.listing);
    } catch (err) {
      console.error("Failed to initiate transfer:", err);
      setError(err.message || "Failed to start transfer.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse space-y-6 px-4 py-8">
        <div className="h-6 w-48 rounded bg-gray-100" />
        <div className="h-64 rounded-xl bg-gray-100" />
        <div className="h-48 rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (error && !listing) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <XCircle className="mx-auto h-10 w-10 text-red-400" />
          <p className="mt-3 text-red-700">{error}</p>
          <Link
            to="/marketplace/credits"
            className="mt-4 inline-block text-sm text-emerald-600 hover:underline"
          >
            Back to marketplace
          </Link>
        </div>
      </div>
    );
  }

  if (!listing) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back link */}
      <Link
        to="/marketplace/credits"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to marketplace
      </Link>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main info card */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {listing.listing?.creditType?.replace(/_/g, " ").toUpperCase()}
              </span>
              <span
                className={`rounded-full border px-3 py-0.5 text-xs font-medium ${vConfig.color}`}
              >
                {Array.from({ length: level }).map((_, i) => (
                  <Star
                    key={i}
                    className="mr-0.5 inline h-3 w-3 fill-current"
                  />
                ))}
                {vConfig.label} Verified
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              ${(listing.listing?.creditAmount || 0).toLocaleString()}
            </p>
            <div className="mt-1 flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 font-medium text-emerald-600">
                <TrendingDown className="h-4 w-4" />
                {listing.listing?.discountRate || 0}% discount
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">
                Asking: ${(listing.listing?.askingPrice || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action buttons (buyer view) */}
          {!isSeller && (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleBuyNow}
                disabled={submitting || listing.status !== "active"}
                className="btn-primary whitespace-nowrap"
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <DollarSign className="mr-2 h-4 w-4" />
                )}
                Buy at ${(listing.listing?.askingPrice || 0).toLocaleString()}
              </button>
              <button
                onClick={() => setShowOfferForm(!showOfferForm)}
                disabled={
                  listing.status !== "active" &&
                  listing.status !== "under_offer"
                }
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Make Offer
              </button>
            </div>
          )}
        </div>

        {/* Project summary */}
        <div className="mt-6 grid gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">State:</span>
            <span className="font-medium">
              {listing.projectSummary?.state || "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">System:</span>
            <span className="font-medium">
              {listing.projectSummary?.systemSizeKw || 0} kW
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Credit Year:</span>
            <span className="font-medium">
              {listing.projectSummary?.creditYear || "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Equipment:</span>
            <span className="font-medium">
              {listing.projectSummary?.equipmentOrigin || "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Type:</span>
            <span className="font-medium">
              {listing.projectSummary?.projectType || "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Style:</span>
            <span className="font-medium">
              {listing.listing?.auctionStyle?.replace(/_/g, " ") || "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Offer form */}
      {showOfferForm && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <h3 className="text-sm font-semibold text-gray-900">Make an Offer</h3>
          <p className="mt-1 text-xs text-gray-500">
            Per IRS Section 6418, transfer must be for cash consideration.
            Minimum bid: ${(listing.listing?.minimumBid || 0).toLocaleString()}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Offer Amount ($)
              </label>
              <input
                type="number"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder={`Min: $${(listing.listing?.minimumBid || 0).toLocaleString()}`}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Message (optional)
              </label>
              <input
                type="text"
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                placeholder="Add a note to the seller"
                className="input-field"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleMakeOffer}
              disabled={submitting || !offerAmount}
              className="btn-primary"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit Offer
            </button>
            <button
              onClick={() => setShowOfferForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Verification Level */}
      <div className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          Verification Level {level}: {vConfig.label}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{vConfig.desc}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              key: "platformAudited",
              label: "Platform Audited",
              desc: "All checks run through SolarOS audit engine",
            },
            {
              key: "thirdPartyAudited",
              label: "Third-Party Audited",
              desc: "Independent verification by certified auditor",
            },
            {
              key: "insured",
              label: "Credit Insured",
              desc: "Recapture risk covered by insurance policy",
            },
            {
              key: "escrowAvailable",
              label: "Escrow Available",
              desc: "Funds held in escrow until transfer completes",
            },
          ].map((item) => {
            const active = listing.verificationLevel?.[item.key];
            return (
              <div
                key={item.key}
                className={`flex items-start gap-2 rounded-lg border p-3 ${active ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}
              >
                {active ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 text-gray-300" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${active ? "text-green-800" : "text-gray-500"}`}
                  >
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audit Report */}
      {audit && (
        <div className="mt-6 rounded-xl border bg-white p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <FileText className="h-5 w-5 text-blue-500" />
            Audit Report
          </h2>
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
            <span>
              Credit Rate:{" "}
              <strong className="text-gray-900">
                {audit.totalCreditRate || 0}%
              </strong>
            </span>
            <span>
              Credit Amount:{" "}
              <strong className="text-gray-900">
                ${(audit.creditAmount || 0).toLocaleString()}
              </strong>
            </span>
            <span>
              Status: <strong className="text-gray-900">{audit.status}</strong>
            </span>
          </div>
          <div className="mt-4 divide-y">
            {(audit.auditChecks || []).map((check, idx) => (
              <AuditCheckRow key={idx} check={check} />
            ))}
          </div>
          {audit.bonuses?.length > 0 && (
            <div className="mt-4 rounded-lg bg-emerald-50 p-3">
              <p className="text-xs font-medium text-emerald-800">
                Qualified Bonuses:
              </p>
              <ul className="mt-1 space-y-1">
                {audit.bonuses.map((b, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-xs text-emerald-700"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {b.type?.replace(/_/g, " ")} (+{b.rate}%)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Insurance */}
      {insurance && (
        <div className="mt-6 rounded-xl border bg-white p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <ShieldAlert className="h-5 w-5 text-purple-500" />
            Credit Insurance
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-purple-50 p-3 text-center">
              <p className="text-xs text-purple-600">Risk Score</p>
              <p className="text-2xl font-bold text-purple-800">
                {insurance.riskAssessment?.riskScore || 0}
              </p>
              <p className="text-xs text-purple-600">
                {insurance.riskAssessment?.overallRisk || "N/A"} risk
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3 text-center">
              <p className="text-xs text-purple-600">Coverage</p>
              <p className="text-2xl font-bold text-purple-800">
                ${(insurance.coverage?.coverageAmount || 0).toLocaleString()}
              </p>
              <p className="text-xs text-purple-600">
                {insurance.coverage?.termMonths || 0} months
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3 text-center">
              <p className="text-xs text-purple-600">Premium</p>
              <p className="text-2xl font-bold text-purple-800">
                ${(insurance.coverage?.premium || 0).toLocaleString()}
              </p>
              <p className="text-xs text-purple-600">
                {((insurance.coverage?.premiumRate || 0) * 100).toFixed(1)}%
                rate
              </p>
            </div>
          </div>
          {insurance.riskAssessment?.factors?.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-gray-600">Risk Factors:</p>
              {insurance.riskAssessment.factors.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  {f.mitigated ? (
                    <CheckCircle2 className="mt-0.5 h-3 w-3 text-green-500" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-3 w-3 text-amber-500" />
                  )}
                  <span className="text-gray-600">
                    {f.factor}: {f.mitigation}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Offers (seller view) */}
      {isSeller && listing.offers?.length > 0 && (
        <div className="mt-6 rounded-xl border bg-white p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            Offers ({listing.offers.length})
          </h2>
          <div className="mt-4 space-y-3">
            {listing.offers.map((offer) => (
              <div
                key={offer.id}
                className={`rounded-lg border p-4 ${offer.status === "pending" ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      ${(offer.offerAmount || 0).toLocaleString()}
                    </p>
                    {offer.message && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        "{offer.message}"
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      offer.status === "pending"
                        ? "bg-blue-100 text-blue-700"
                        : offer.status === "accepted"
                          ? "bg-green-100 text-green-700"
                          : offer.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {offer.status}
                  </span>
                </div>

                {offer.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleRespondToOffer(offer.id, "accepted")}
                      disabled={submitting}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespondToOffer(offer.id, "rejected")}
                      disabled={submitting}
                      className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() =>
                        setCounteringOfferId(
                          counteringOfferId === offer.id ? null : offer.id,
                        )
                      }
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                    >
                      Counter
                    </button>
                  </div>
                )}

                {counteringOfferId === offer.id && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="number"
                      value={counterAmount}
                      onChange={(e) => setCounterAmount(e.target.value)}
                      placeholder="Counter amount"
                      className="input-field flex-1"
                    />
                    <button
                      onClick={() =>
                        handleRespondToOffer(
                          offer.id,
                          "countered",
                          counterAmount,
                        )
                      }
                      disabled={submitting || !counterAmount}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Send Counter
                    </button>
                  </div>
                )}

                {offer.status === "accepted" &&
                  listing.status === "pending_transfer" && (
                    <button
                      onClick={() => handleInitiateTransfer(offer.id)}
                      disabled={submitting}
                      className="btn-primary mt-2"
                    >
                      Initiate Transfer
                    </button>
                  )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
