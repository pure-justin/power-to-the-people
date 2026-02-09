import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  db,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "../services/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  Award,
  DollarSign,
  Star,
  MapPin,
  Clock,
  Zap,
  ShieldCheck,
  Briefcase,
  User,
  Loader2,
  BarChart3,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from "lucide-react";
import BidCard from "./BidCard";

const functions = getFunctions(undefined, "us-central1");

/**
 * CSS Radar Chart -- 7-axis score visualization using pure CSS/SVG.
 *
 * axes: [{ label: string, value: number (0-100) }]
 */
function RadarChart({ axes, size = 180 }) {
  if (!axes || axes.length === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 30;
  const n = axes.length;
  const angleStep = (2 * Math.PI) / n;

  // Helper: polar to cartesian
  const polar = (angle, r) => ({
    x: cx + r * Math.sin(angle),
    y: cy - r * Math.cos(angle),
  });

  // Background grid rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Data polygon points
  const dataPoints = axes.map((axis, i) => {
    const pct = Math.min((axis.value || 0) / 100, 1);
    return polar(i * angleStep, radius * pct);
  });
  const dataPath =
    dataPoints
      .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
      .join(" ") + "Z";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
    >
      {/* Background rings */}
      {rings.map((pct) => {
        const ringPoints = Array.from({ length: n }, (_, i) =>
          polar(i * angleStep, radius * pct),
        );
        const ringPath =
          ringPoints
            .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
            .join(" ") + "Z";
        return (
          <path
            key={pct}
            d={ringPath}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        );
      })}

      {/* Axis lines */}
      {axes.map((_, i) => {
        const end = polar(i * angleStep, radius);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={end.x}
            y2={end.y}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <path
        d={dataPath}
        fill="rgba(16, 185, 129, 0.2)"
        stroke="#10b981"
        strokeWidth="2"
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="3"
          fill="#10b981"
          stroke="white"
          strokeWidth="1"
        />
      ))}

      {/* Labels */}
      {axes.map((axis, i) => {
        const labelPos = polar(i * angleStep, radius + 18);
        const textAnchor =
          Math.abs(labelPos.x - cx) < 5
            ? "middle"
            : labelPos.x > cx
              ? "start"
              : "end";
        return (
          <text
            key={i}
            x={labelPos.x}
            y={labelPos.y}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            className="fill-gray-500"
            fontSize="9"
            fontWeight="500"
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}

/**
 * BidComparison -- Side-by-side analysis of all bids for a listing.
 *
 * Props:
 *   listingId      - Firestore listing ID
 *   listing        - listing object (optional, for budget context)
 *   onAccepted     - callback after a bid is accepted
 *   onClose        - callback to close/dismiss (optional)
 *   showActions    - whether Accept/Reject buttons are shown (listing owner)
 */
export default function BidComparison({
  listingId,
  listing,
  onAccepted,
  onClose,
  showActions = false,
}) {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "table" | "radar"
  const [selectedBid, setSelectedBid] = useState(null);

  useEffect(() => {
    if (!listingId) return;
    const loadBids = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "marketplace_bids"),
          where("listing_id", "==", listingId),
          orderBy("price", "asc"),
        );
        const snap = await getDocs(q);
        setBids(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to load bids for comparison:", err);
      } finally {
        setLoading(false);
      }
    };
    loadBids();
  }, [listingId]);

  // Derive badges
  const bidBadges = useMemo(() => {
    if (bids.length === 0) return {};
    const badges = {};

    // Best Value = highest total score
    const scored = bids.filter((b) => (b.score ?? b.total_score) != null);
    if (scored.length > 0) {
      const best = scored.reduce((a, b) =>
        (a.score ?? a.total_score ?? 0) >= (b.score ?? b.total_score ?? 0)
          ? a
          : b,
      );
      badges[best.id] = [...(badges[best.id] || []), "Best Value"];
    }

    // Lowest Price
    const priced = bids.filter((b) => b.price != null);
    if (priced.length > 0) {
      const cheapest = priced.reduce((a, b) => (a.price <= b.price ? a : b));
      badges[cheapest.id] = [...(badges[cheapest.id] || []), "Lowest Price"];
    }

    // Closest
    const distanced = bids.filter(
      (b) => b.distance != null && typeof b.distance === "number",
    );
    if (distanced.length > 0) {
      const closest = distanced.reduce((a, b) =>
        a.distance <= b.distance ? a : b,
      );
      badges[closest.id] = [...(badges[closest.id] || []), "Closest"];
    }

    return badges;
  }, [bids]);

  const handleAccept = async (bidId) => {
    setAccepting(bidId);
    try {
      const acceptFn = httpsCallable(functions, "acceptBid");
      await acceptFn({ listing_id: listingId, bid_id: bidId });
      onAccepted?.();
    } catch (err) {
      console.error("Failed to accept bid:", err);
    } finally {
      setAccepting(null);
    }
  };

  const handleReject = async (bidId) => {
    setRejecting(bidId);
    try {
      // If there's a rejectBid function, call it; otherwise just update locally
      const rejectFn = httpsCallable(functions, "rejectBid");
      await rejectFn({ listing_id: listingId, bid_id: bidId });
      setBids((prev) =>
        prev.map((b) => (b.id === bidId ? { ...b, status: "rejected" } : b)),
      );
    } catch (err) {
      console.error("Failed to reject bid:", err);
      // Optimistically update UI anyway
      setBids((prev) =>
        prev.map((b) => (b.id === bidId ? { ...b, status: "rejected" } : b)),
      );
    } finally {
      setRejecting(null);
    }
  };

  // Build radar data for a specific bid
  const radarAxesForBid = (bid) => {
    const breakdown = bid.score_breakdown || bid.breakdown || [];
    if (breakdown.length > 0) {
      return breakdown.map((item) => ({
        label: item.label || item.factor || "?",
        value:
          ((item.score ?? item.value ?? 0) / (item.max ?? item.weight ?? 20)) *
          100,
      }));
    }
    // Fallback: construct from available data
    const rating = bid.bidder?.rating || bid.worker_rating || 0;
    const jobs = bid.bidder?.completed_jobs || bid.worker_completed_jobs || 0;
    return [
      {
        label: "Price",
        value:
          bid.price && listing?.budget
            ? Math.max(
                0,
                100 -
                  (bid.price / ((listing.budget.min + listing.budget.max) / 2) -
                    0.5) *
                    100,
              )
            : 50,
      },
      { label: "Rating", value: (rating / 5) * 100 },
      {
        label: "Distance",
        value: bid.distance != null ? Math.max(0, 100 - bid.distance * 2) : 50,
      },
      { label: "Speed", value: bid.timeline ? 70 : 50 },
      { label: "Experience", value: Math.min(jobs * 10, 100) },
      { label: "Reliability", value: bid.reliability_score ?? 70 },
      {
        label: "Certs",
        value: Math.min((bid.certifications?.length || 0) * 25, 100),
      },
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading bids...</span>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="py-12 text-center">
        <BarChart3 className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">No bids to compare yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          Bid Comparison ({bids.length} bid{bids.length !== 1 ? "s" : ""})
        </h3>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
          {[
            { id: "cards", label: "Cards" },
            { id: "table", label: "Table" },
            { id: "radar", label: "Radar" },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === mode.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
          <p className="text-lg font-bold text-gray-900">
            $
            {Math.min(
              ...bids.filter((b) => b.price).map((b) => b.price),
            ).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">Lowest Price</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
          <p className="text-lg font-bold text-gray-900">
            $
            {Math.round(
              bids.reduce((s, b) => s + (b.price || 0), 0) / bids.length,
            ).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">Average Price</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
          <p className="text-lg font-bold text-emerald-600">
            {Math.max(...bids.map((b) => b.score ?? b.total_score ?? 0))}
          </p>
          <p className="text-xs text-gray-500">Top Score</p>
        </div>
      </div>

      {/* Cards View */}
      {viewMode === "cards" && (
        <div className="space-y-3">
          {bids.map((bid) => (
            <BidCard
              key={bid.id}
              bid={bid}
              badges={bidBadges[bid.id] || []}
              showActions={showActions}
              onAccept={handleAccept}
              onReject={handleReject}
              accepting={accepting}
              rejecting={rejecting}
            />
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                <th className="px-4 py-3">Worker</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Distance</th>
                <th className="px-4 py-3">Timeline</th>
                <th className="px-4 py-3">Certs</th>
                <th className="px-4 py-3">Badges</th>
                {showActions && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bids.map((bid) => {
                const badges = bidBadges[bid.id] || [];
                return (
                  <tr
                    key={bid.id}
                    className={`hover:bg-gray-50 ${
                      bid.status === "rejected" ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {bid.bidder?.displayName ||
                          bid.bidder?.email ||
                          "Anonymous"}
                      </div>
                      <div className="text-xs text-gray-400">
                        {bid.bidder?.completed_jobs ||
                          bid.worker_completed_jobs ||
                          0}{" "}
                        jobs
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                        {bid.score ?? bid.total_score ?? "--"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      ${bid.price?.toLocaleString() || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-gray-700">
                          {(
                            bid.bidder?.rating ||
                            bid.worker_rating ||
                            0
                          ).toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {bid.distance != null
                        ? `${typeof bid.distance === "number" ? bid.distance.toFixed(1) : bid.distance} mi`
                        : "--"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {bid.timeline || "--"}
                    </td>
                    <td className="px-4 py-3">
                      {bid.certifications?.length || 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {badges.map((b) => (
                          <span
                            key={b}
                            className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </td>
                    {showActions && (
                      <td className="px-4 py-3">
                        {bid.status === "pending" && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleAccept(bid.id)}
                              disabled={accepting === bid.id}
                              className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {accepting === bid.id ? "..." : "Accept"}
                            </button>
                            <button
                              onClick={() => handleReject(bid.id)}
                              disabled={rejecting === bid.id}
                              className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-50"
                            >
                              {rejecting === bid.id ? "..." : "Reject"}
                            </button>
                          </div>
                        )}
                        {bid.status !== "pending" && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              bid.status === "accepted"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {bid.status}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Radar View */}
      {viewMode === "radar" && (
        <div className="space-y-4">
          {/* Bid selector */}
          <div className="flex flex-wrap gap-2">
            {bids.map((bid) => (
              <button
                key={bid.id}
                onClick={() => setSelectedBid(bid.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  (selectedBid || bids[0]?.id) === bid.id
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {bid.bidder?.displayName || bid.bidder?.email || "Anonymous"}
                {" -- "}${bid.price?.toLocaleString() || "N/A"}
                {(bidBadges[bid.id] || []).length > 0 && (
                  <Award className="ml-1 inline h-3 w-3 text-amber-500" />
                )}
              </button>
            ))}
          </div>

          {/* Radar chart for selected bid */}
          {(() => {
            const activeBid = bids.find(
              (b) => b.id === (selectedBid || bids[0]?.id),
            );
            if (!activeBid) return null;
            const axes = radarAxesForBid(activeBid);
            return (
              <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-6">
                <h4 className="mb-1 text-sm font-semibold text-gray-900">
                  {activeBid.bidder?.displayName ||
                    activeBid.bidder?.email ||
                    "Anonymous"}
                </h4>
                <p className="mb-4 text-xs text-gray-500">
                  Score: {activeBid.score ?? activeBid.total_score ?? "N/A"} |
                  Price: ${activeBid.price?.toLocaleString() || "N/A"}
                </p>
                <RadarChart axes={axes} size={220} />
                {(bidBadges[activeBid.id] || []).length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(bidBadges[activeBid.id] || []).map((badge) => (
                      <span
                        key={badge}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
                      >
                        <Award className="h-3 w-3" />
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
                {showActions && activeBid.status === "pending" && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleAccept(activeBid.id)}
                      disabled={accepting === activeBid.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {accepting === activeBid.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Accept Bid
                    </button>
                    <button
                      onClick={() => handleReject(activeBid.id)}
                      disabled={rejecting === activeBid.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
