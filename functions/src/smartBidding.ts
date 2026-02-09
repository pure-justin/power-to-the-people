/**
 * Smart Bidding — Weighted Multi-Factor Bid Scoring for SolarOS Marketplace
 *
 * Ranks marketplace bids using a configurable weighted formula that balances
 * price competitiveness with worker quality, proximity, speed, and reliability.
 *
 * Scoring factors (default weights):
 *   - Price (0.20)        — Lower bid relative to budget = higher score
 *   - Rating (0.20)       — Worker's overall star rating (1-5 scale)
 *   - Proximity (0.15)    — Distance from job site (closer = better, max 100mi)
 *   - Speed (0.15)        — Proposed timeline in days (faster = better, max 30d)
 *   - Availability (0.10) — Fewer concurrent active tasks = higher score
 *   - Experience (0.10)   — Completed jobs of this service type (max 50)
 *   - Reliability (0.10)  — SLA engine reliability score (0-100)
 *
 * This is a pure utility module — no Cloud Functions are exported.
 * Called by marketplace.ts for automated bid ranking and acceptance.
 *
 * Collections read:
 *   marketplace_listings  — Listing details (budget, service_type)
 *   marketplace_bids      — Individual bids on a listing
 *   workers               — Worker profiles (ratings, jobs, reliability)
 *   projects              — Project data (customer ID for block-list checks)
 *   config/bidding_weights — Configurable scoring weights
 *
 * @module smartBidding
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

// ─── Types ──────────────────────────────────────────────────────────────────────

/** Normalized 0-1 scores for each bid scoring factor */
export interface BidScoreBreakdown {
  price: number;
  rating: number;
  proximity: number;
  speed: number;
  availability: number;
  experience: number;
  reliability: number;
}

/** Final computed score for a bid, including factor breakdown and rank */
export interface BidScore {
  totalScore: number;
  breakdown: BidScoreBreakdown;
  rank: number;
}

/** Configurable weights for each scoring factor (must sum to 1.0) */
export interface BiddingWeights {
  price: number;
  rating: number;
  proximity: number;
  speed: number;
  availability: number;
  experience: number;
  reliability: number;
}

/** A bid with its computed score, ready for ranked display */
export interface RankedBid {
  bidId: string;
  workerId: string;
  workerName: string;
  bidAmount: number;
  score: BidScore;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

/** Default scoring weights — balanced between cost and quality */
const DEFAULT_WEIGHTS: BiddingWeights = {
  price: 0.2,
  rating: 0.2,
  proximity: 0.15,
  speed: 0.15,
  availability: 0.1,
  experience: 0.1,
  reliability: 0.1,
};

/** Maximum distance in miles before proximity score bottoms out */
const MAX_DISTANCE_MILES = 100;

/** Maximum proposed timeline in days before speed score bottoms out */
const MAX_PROPOSED_DAYS = 30;

/** Maximum concurrent tasks before availability score bottoms out */
const MAX_ACTIVE_TASKS = 5;

/** Maximum completed jobs of a type before experience score caps out */
const MAX_EXPERIENCE_JOBS = 50;

// ─── Weight Management ──────────────────────────────────────────────────────────

/**
 * Return the default bidding weights.
 *
 * Used as a fallback when no custom weights are configured in Firestore,
 * and as a reference for the config UI.
 *
 * @function getDefaultWeights
 * @returns {BiddingWeights} Default weight configuration
 */
export function getDefaultWeights(): BiddingWeights {
  return { ...DEFAULT_WEIGHTS };
}

/**
 * Load bidding weights from Firestore config, falling back to defaults.
 *
 * Reads from `config/bidding_weights` in Firestore. If the document does
 * not exist or any fields are missing, the corresponding default values
 * are used. This allows partial overrides (e.g., only changing price weight).
 *
 * @function loadWeights
 * @returns {Promise<BiddingWeights>} Resolved weight configuration
 */
export async function loadWeights(): Promise<BiddingWeights> {
  try {
    const configSnap = await db
      .collection("config")
      .doc("bidding_weights")
      .get();

    if (!configSnap.exists) {
      return getDefaultWeights();
    }

    const configData = configSnap.data()!;

    return {
      price:
        typeof configData.price === "number"
          ? configData.price
          : DEFAULT_WEIGHTS.price,
      rating:
        typeof configData.rating === "number"
          ? configData.rating
          : DEFAULT_WEIGHTS.rating,
      proximity:
        typeof configData.proximity === "number"
          ? configData.proximity
          : DEFAULT_WEIGHTS.proximity,
      speed:
        typeof configData.speed === "number"
          ? configData.speed
          : DEFAULT_WEIGHTS.speed,
      availability:
        typeof configData.availability === "number"
          ? configData.availability
          : DEFAULT_WEIGHTS.availability,
      experience:
        typeof configData.experience === "number"
          ? configData.experience
          : DEFAULT_WEIGHTS.experience,
      reliability:
        typeof configData.reliability === "number"
          ? configData.reliability
          : DEFAULT_WEIGHTS.reliability,
    };
  } catch (err) {
    functions.logger.warn(
      "Failed to load bidding weights from Firestore, using defaults:",
      err,
    );
    return getDefaultWeights();
  }
}

// ─── Scoring ────────────────────────────────────────────────────────────────────

/**
 * Clamp a value between 0 and 1.
 */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Score a single bid against a listing using the weighted multi-factor formula.
 *
 * Each factor produces a normalized 0-1 score, then factors are combined
 * using the configured weights to produce a final totalScore (also 0-1).
 *
 * Factor calculations:
 *   - **Price**: Inverted linear scale within the listing's budget range.
 *     A bid at budget_min scores 1.0, at budget_max scores 0.0.
 *     Bids outside the range are clamped.
 *   - **Rating**: Worker's overall rating divided by 5. New workers
 *     without ratings default to 0.5 (neutral).
 *   - **Proximity**: Linear decay from 1.0 at 0 miles to 0.0 at 100 miles.
 *   - **Speed**: Linear decay from 1.0 at 0 days to 0.0 at 30 days.
 *   - **Availability**: Fewer active tasks = higher score. 0 tasks = 1.0,
 *     5+ tasks = 0.0.
 *   - **Experience**: Completed jobs of this listing's service_type,
 *     capped at 50. More jobs = higher score.
 *   - **Reliability**: SLA engine score (0-100), normalized to 0-1.
 *     Defaults to 0.5 for workers without a reliability score.
 *
 * @function scoreBid
 * @param bid - The bid document data (from marketplace_bids)
 * @param listing - The listing document data (from marketplace_listings)
 * @param worker - The worker profile document data (from workers)
 * @param weights - Scoring weights to use
 * @returns {BidScore} Computed score with breakdown (rank is set to 0; caller assigns rank)
 */
export function scoreBid(
  bid: Record<string, any>,
  listing: Record<string, any>,
  worker: Record<string, any>,
  weights: BiddingWeights,
): BidScore {
  // --- Price ---
  let priceScore = 0.5; // default if no budget range set
  if (
    listing.budget &&
    typeof listing.budget.min === "number" &&
    typeof listing.budget.max === "number"
  ) {
    const range = listing.budget.max - listing.budget.min;
    if (range > 0) {
      priceScore = clamp01(1 - (bid.price - listing.budget.min) / range);
    } else {
      // min === max: exact match = perfect, any deviation = 0
      priceScore = bid.price <= listing.budget.min ? 1.0 : 0.0;
    }
  }

  // --- Rating ---
  const overallRating = worker.ratings?.overall;
  const ratingScore =
    typeof overallRating === "number" && overallRating > 0
      ? clamp01(overallRating / 5.0)
      : 0.5;

  // --- Proximity ---
  const distanceMiles =
    typeof bid.worker_distance_miles === "number"
      ? bid.worker_distance_miles
      : MAX_DISTANCE_MILES;
  const proximityScore = clamp01(
    1 - Math.min(distanceMiles, MAX_DISTANCE_MILES) / MAX_DISTANCE_MILES,
  );

  // --- Speed ---
  const proposedDays =
    typeof bid.proposed_days === "number"
      ? bid.proposed_days
      : MAX_PROPOSED_DAYS;
  const speedScore = clamp01(
    1 - Math.min(proposedDays, MAX_PROPOSED_DAYS) / MAX_PROPOSED_DAYS,
  );

  // --- Availability ---
  const activeTasks =
    typeof worker.active_tasks === "number" ? worker.active_tasks : 0;
  const availabilityScore = clamp01(
    1 - Math.min(activeTasks, MAX_ACTIVE_TASKS) / MAX_ACTIVE_TASKS,
  );

  // --- Experience ---
  const serviceType = listing.service_type || "";
  let completedOfType = 0;
  if (
    worker.completed_jobs &&
    typeof worker.completed_jobs === "object" &&
    !Array.isArray(worker.completed_jobs)
  ) {
    // completed_jobs is a map keyed by service_type
    completedOfType =
      typeof worker.completed_jobs[serviceType] === "number"
        ? worker.completed_jobs[serviceType]
        : 0;
  } else if (typeof worker.completed_jobs === "number") {
    // Fallback: if completed_jobs is a flat number (legacy), treat as general experience
    completedOfType = worker.completed_jobs;
  }
  const experienceScore = clamp01(
    Math.min(completedOfType, MAX_EXPERIENCE_JOBS) / MAX_EXPERIENCE_JOBS,
  );

  // --- Reliability ---
  const reliabilityRaw =
    typeof worker.reliability_score === "number"
      ? worker.reliability_score
      : 50;
  const reliabilityScore = clamp01(reliabilityRaw / 100);

  // --- Weighted Total ---
  const breakdown: BidScoreBreakdown = {
    price: Math.round(priceScore * 1000) / 1000,
    rating: Math.round(ratingScore * 1000) / 1000,
    proximity: Math.round(proximityScore * 1000) / 1000,
    speed: Math.round(speedScore * 1000) / 1000,
    availability: Math.round(availabilityScore * 1000) / 1000,
    experience: Math.round(experienceScore * 1000) / 1000,
    reliability: Math.round(reliabilityScore * 1000) / 1000,
  };

  const totalScore =
    breakdown.price * weights.price +
    breakdown.rating * weights.rating +
    breakdown.proximity * weights.proximity +
    breakdown.speed * weights.speed +
    breakdown.availability * weights.availability +
    breakdown.experience * weights.experience +
    breakdown.reliability * weights.reliability;

  return {
    totalScore: Math.round(totalScore * 1000) / 1000,
    breakdown,
    rank: 0, // Assigned by rankBids after sorting
  };
}

// ─── Ranking ────────────────────────────────────────────────────────────────────

/**
 * Fetch all bids for a listing, score each, and return a sorted array.
 *
 * Filters out bids from suspended workers and workers who have the
 * project's customer in their blocked_customers list. Only bids with
 * status "pending" are scored.
 *
 * The returned array is sorted by totalScore descending (best bid first),
 * with rank assigned starting at 1.
 *
 * @function rankBids
 * @param listingId - The marketplace_listings document ID
 * @returns {Promise<RankedBid[]>} Sorted array of scored bids (highest first)
 */
export async function rankBids(listingId: string): Promise<RankedBid[]> {
  // Load listing
  const listingSnap = await db
    .collection("marketplace_listings")
    .doc(listingId)
    .get();

  if (!listingSnap.exists) {
    throw new Error(`Listing not found: ${listingId}`);
  }

  const listing = listingSnap.data()!;

  // Determine customer ID for block-list filtering
  let customerId: string | null = null;
  if (listing.project_id) {
    const projectSnap = await db
      .collection("projects")
      .doc(listing.project_id)
      .get();
    if (projectSnap.exists) {
      const projectData = projectSnap.data()!;
      customerId = projectData.customerId || projectData.customer_id || null;
    }
  }

  // Load weights
  const weights = await loadWeights();

  // Fetch all pending bids for this listing
  const bidsSnap = await db
    .collection("marketplace_bids")
    .where("listing_id", "==", listingId)
    .where("status", "==", "pending")
    .get();

  if (bidsSnap.empty) {
    return [];
  }

  // Collect unique worker IDs to batch-fetch worker profiles
  const workerIds = new Set<string>();
  const bidsWithIds: Array<{ bidId: string; data: Record<string, any> }> = [];

  bidsSnap.forEach((doc) => {
    const bidData = doc.data();
    const workerId = bidData.bidder?.userId;
    if (workerId) {
      workerIds.add(workerId);
    }
    bidsWithIds.push({ bidId: doc.id, data: bidData });
  });

  // Batch-fetch worker profiles
  const workerMap = new Map<string, Record<string, any>>();
  const workerIdArray = Array.from(workerIds);

  // Firestore 'in' queries are limited to 30 items per batch
  for (let i = 0; i < workerIdArray.length; i += 30) {
    const batch = workerIdArray.slice(i, i + 30);
    const workersSnap = await db
      .collection("workers")
      .where("user_id", "in", batch)
      .get();

    workersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.user_id) {
        workerMap.set(data.user_id, { ...data, _workerId: doc.id });
      }
    });
  }

  // Score each bid, filtering out ineligible workers
  const rankedBids: RankedBid[] = [];

  for (const { bidId, data: bidData } of bidsWithIds) {
    const workerId = bidData.bidder?.userId;
    if (!workerId) continue;

    const worker = workerMap.get(workerId);
    if (!worker) continue;

    // Filter: skip suspended workers
    if (worker.status === "suspended" || worker.availability === "suspended") {
      continue;
    }

    // Filter: skip workers who have blocked this customer
    if (
      customerId &&
      Array.isArray(worker.blocked_customers) &&
      worker.blocked_customers.includes(customerId)
    ) {
      continue;
    }

    const score = scoreBid(bidData, listing, worker, weights);

    rankedBids.push({
      bidId,
      workerId: worker._workerId || workerId,
      workerName: worker.name || bidData.bidder?.displayName || "Unknown",
      bidAmount: bidData.price,
      score,
    });
  }

  // Sort by totalScore descending
  rankedBids.sort((a, b) => b.score.totalScore - a.score.totalScore);

  // Assign ranks (1-based)
  rankedBids.forEach((bid, index) => {
    bid.score.rank = index + 1;
  });

  return rankedBids;
}

// ─── Auto-Accept ────────────────────────────────────────────────────────────────

/**
 * Score all bids for a listing and automatically accept the highest-scored one.
 *
 * Performs a full ranking via `rankBids`, then accepts the top bid by:
 *   1. Updating the winning bid status to "accepted"
 *   2. Rejecting all other pending bids
 *   3. Setting the listing status to "assigned" with winning_bid details
 *   4. Creating a notification for the winning worker
 *
 * All updates are performed in a single Firestore batch for atomicity.
 *
 * Returns `{ accepted: false }` if there are no eligible bids to accept.
 *
 * @function autoAcceptBestBid
 * @param listingId - The marketplace_listings document ID
 * @returns {Promise<{ accepted: boolean; bidId?: string; score?: number }>}
 *   Result indicating whether a bid was accepted, and if so, which one
 */
export async function autoAcceptBestBid(
  listingId: string,
): Promise<{ accepted: boolean; bidId?: string; score?: number }> {
  const ranked = await rankBids(listingId);

  if (ranked.length === 0) {
    return { accepted: false };
  }

  const bestBid = ranked[0];
  const batch = db.batch();

  // Accept the winning bid
  const winningBidRef = db.collection("marketplace_bids").doc(bestBid.bidId);
  batch.update(winningBidRef, {
    status: "accepted",
    score: bestBid.score.totalScore,
    score_breakdown: bestBid.score.breakdown,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Reject all other pending bids for this listing
  const otherBidsSnap = await db
    .collection("marketplace_bids")
    .where("listing_id", "==", listingId)
    .where("status", "==", "pending")
    .get();

  otherBidsSnap.forEach((doc) => {
    if (doc.id !== bestBid.bidId) {
      batch.update(doc.ref, {
        status: "rejected",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

  // Update listing to assigned
  const listingRef = db.collection("marketplace_listings").doc(listingId);
  batch.update(listingRef, {
    status: "assigned",
    winning_bid: {
      bidId: bestBid.bidId,
      bidderId: bestBid.workerId,
      workerName: bestBid.workerName,
      price: bestBid.bidAmount,
      score: bestBid.score.totalScore,
      score_breakdown: bestBid.score.breakdown,
      accepted_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Create notification for the winning worker
  const notificationRef = db.collection("notifications").doc();
  batch.set(notificationRef, {
    userId: bestBid.workerId,
    type: "bid_accepted",
    title: "Your bid was accepted!",
    message: `Your bid of $${bestBid.bidAmount.toLocaleString()} has been accepted.`,
    listingId,
    bidId: bestBid.bidId,
    read: false,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    accepted: true,
    bidId: bestBid.bidId,
    score: bestBid.score.totalScore,
  };
}
