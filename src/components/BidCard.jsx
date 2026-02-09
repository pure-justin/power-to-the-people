import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Star,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  MessageSquare,
  User,
  Award,
  ShieldCheck,
  Briefcase,
  Loader2,
} from "lucide-react";

function formatCurrency(val) {
  if (val == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(val);
}

function StarRating({ rating, size = "sm" }) {
  const starSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${starSize} ${
            n <= Math.round(rating || 0)
              ? "fill-amber-400 text-amber-400"
              : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

/** Circular score indicator rendered with CSS conic-gradient */
function CircularScore({ score, max = 100, size = 48 }) {
  const pct = Math.min((score / max) * 100, 100);
  const color = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div
      className="relative flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} ${pct * 3.6}deg, #e5e7eb ${pct * 3.6}deg)`,
      }}
    >
      <div
        className="flex items-center justify-center rounded-full bg-white"
        style={{ width: size - 8, height: size - 8 }}
      >
        <span className="text-xs font-bold text-gray-900">{score}</span>
      </div>
    </div>
  );
}

/**
 * BidCard -- Compact card showing a worker's bid with expandable details.
 *
 * Props:
 *   bid            - bid object { id, price, timeline, notes, score, score_breakdown, certifications, bidder, distance, status }
 *   onAccept       - (bidId) => void  (optional, only for listing owner)
 *   onReject       - (bidId) => void  (optional)
 *   onMessage      - (bidId) => void  (optional)
 *   accepting      - boolean | string (bidId currently being accepted)
 *   rejecting      - boolean | string
 *   showActions    - boolean (default false)
 *   badges         - string[] optional e.g. ["Best Value", "Lowest Price", "Closest"]
 */
export default function BidCard({
  bid,
  onAccept,
  onReject,
  onMessage,
  accepting,
  rejecting,
  showActions = false,
  badges = [],
}) {
  const [expanded, setExpanded] = useState(false);

  const bidderName =
    bid.bidder?.displayName || bid.bidder?.email || "Anonymous";
  const rating = bid.bidder?.rating || bid.worker_rating || 0;
  const completedJobs =
    bid.bidder?.completed_jobs || bid.worker_completed_jobs || 0;
  const score = bid.score ?? bid.total_score ?? null;
  const breakdown = bid.score_breakdown || bid.breakdown || [];

  const isAccepting = accepting === bid.id;
  const isRejecting = rejecting === bid.id;

  const badgeColors = {
    "Best Value": "bg-emerald-100 text-emerald-700 border-emerald-300",
    "Lowest Price": "bg-blue-100 text-blue-700 border-blue-300",
    Closest: "bg-purple-100 text-purple-700 border-purple-300",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Badges row */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-gray-100 px-4 py-2">
          {badges.map((badge) => (
            <span
              key={badge}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                badgeColors[badge] ||
                "bg-gray-100 text-gray-600 border-gray-200"
              }`}
            >
              <Award className="h-3 w-3" />
              {badge}
            </span>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Score circle */}
          {score != null && <CircularScore score={score} />}

          {/* Worker info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {bidderName}
              </h3>
              {bid.status && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    bid.status === "accepted"
                      ? "bg-emerald-100 text-emerald-700"
                      : bid.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {bid.status}
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <StarRating rating={rating} />
              {completedJobs > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {completedJobs} jobs
                </span>
              )}
              {bid.distance != null && (
                <span className="inline-flex items-center gap-1 text-blue-600">
                  <MapPin className="h-3 w-3" />
                  {typeof bid.distance === "number"
                    ? `${bid.distance.toFixed(1)} mi`
                    : bid.distance}
                </span>
              )}
            </div>
          </div>

          {/* Price + timeline */}
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(bid.price)}
            </p>
            {bid.timeline && (
              <p className="mt-0.5 flex items-center justify-end gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {bid.timeline}
              </p>
            )}
          </div>
        </div>

        {/* Certifications preview */}
        {bid.certifications?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {bid.certifications.map((cert) => (
              <span
                key={cert}
                className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700"
              >
                <ShieldCheck className="h-2.5 w-2.5" />
                {cert.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
        >
          {expanded ? (
            <>
              Less <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Score Breakdown <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>

        {/* Expanded breakdown */}
        {expanded && (
          <div className="mt-3 space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
            {breakdown.length > 0 ? (
              breakdown.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-32 text-xs text-gray-600">
                    {item.label || item.factor}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-gray-200">
                    <div
                      className="h-1.5 rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${((item.score || item.value || 0) / (item.max || item.weight || 20)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs font-medium text-gray-700">
                    {item.score ?? item.value ?? 0}/
                    {item.max ?? item.weight ?? 20}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400">No breakdown available</p>
            )}

            {bid.notes && (
              <div className="border-t border-gray-200 pt-2">
                <p className="text-xs text-gray-500">{bid.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        {showActions && bid.status === "pending" && (
          <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
            {onAccept && (
              <button
                onClick={() => onAccept(bid.id)}
                disabled={isAccepting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isAccepting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Accept
              </button>
            )}
            {onReject && (
              <button
                onClick={() => onReject(bid.id)}
                disabled={isRejecting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
              >
                {isRejecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Reject"
                )}
              </button>
            )}
            {onMessage && (
              <button
                onClick={() => onMessage(bid.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Message
              </button>
            )}
            {bid.bidder?.userId && (
              <Link
                to={`/dashboard/workers/${bid.bidder.workerId || bid.bidder.userId}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
              >
                <User className="h-3.5 w-3.5" />
                Profile
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { CircularScore, StarRating, formatCurrency };
