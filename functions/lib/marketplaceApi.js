"use strict";
/**
 * Marketplace API - HTTP Endpoints
 *
 * Provides REST API endpoints for the SolarOS marketplace, authenticated
 * via API keys (Bearer token). Supports browsing/creating listings,
 * submitting/accepting bids, worker registration/search, and
 * owner-scoped "my items" queries.
 *
 * All endpoints share a single onRequest handler that routes based on
 * URL path segments. API key authentication is enforced on every request
 * via validateApiKeyFromRequest().
 *
 * Collections used:
 *   marketplace_listings  — Job listings
 *   marketplace_bids      — Bids on listings
 *   marketplace_ratings   — Worker ratings
 *   workers               — Worker profiles
 *
 * @module marketplaceApi
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketplaceApi = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const apiKeys_1 = require("./apiKeys");
const smartBidding_1 = require("./smartBidding");
// ─── CORS Helper ───────────────────────────────────────────────────────────────
function setCors(res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
function handleOptions(req, res) {
    if (req.method === "OPTIONS") {
        setCors(res);
        res.status(204).send("");
        return true;
    }
    return false;
}
// ─── Error Helper ──────────────────────────────────────────────────────────────
function errorStatus(error) {
    if (error.code === "unauthenticated")
        return 401;
    if (error.code === "permission-denied")
        return 403;
    if (error.code === "resource-exhausted")
        return 429;
    if (error.code === "not-found")
        return 404;
    return 500;
}
// ─── Valid service types (mirrors marketplace.ts) ──────────────────────────────
const SERVICE_TYPES = [
    "cad_design",
    "engineering_stamp",
    "permit_submission",
    "site_survey",
    "hoa_approval",
    "installation",
    "inspection",
    "electrical",
    "roofing",
    "trenching",
    "battery_install",
    "panel_upgrade",
    "monitoring_setup",
    "maintenance",
    "other",
];
// ─── Route Helpers ─────────────────────────────────────────────────────────────
/**
 * Parse path segments after the function name.
 * Firebase strips the function prefix, so the path starts at "/".
 * Example: /marketplace/listings/abc123/bid -> ["marketplace", "listings", "abc123", "bid"]
 */
function parseSegments(req) {
    const raw = req.path || "/";
    return raw.split("/").filter((s) => s.length > 0);
}
// ─── Listings Handlers ─────────────────────────────────────────────────────────
/**
 * GET /marketplace/listings
 * Browse marketplace listings with optional filters.
 *
 * Query params:
 *   service_type  — Filter by service type
 *   status        — Filter by status (default: "open")
 *   state         — Filter by state (uppercase)
 *   zip           — Filter by project ZIP code
 *   radius_miles  — Radius around ZIP (requires zip; client-side filter)
 *   limit         — Max results (default 20, max 100)
 *   offset        — Pagination offset
 *
 * @scope read_marketplace
 */
async function handleGetListings(req, res) {
    await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.READ_MARKETPLACE);
    const db = admin.firestore();
    let query = db.collection("marketplace_listings");
    // Status filter (default: open)
    const status = req.query.status || "open";
    query = query.where("status", "==", status);
    // Service type filter
    if (req.query.service_type) {
        const st = req.query.service_type;
        if (!SERVICE_TYPES.includes(st)) {
            res.status(400).json({
                success: false,
                error: `Invalid service_type. Must be one of: ${SERVICE_TYPES.join(", ")}`,
            });
            return;
        }
        query = query.where("service_type", "==", st);
    }
    // State filter
    if (req.query.state) {
        query = query.where("project_context.state", "==", req.query.state.toUpperCase());
    }
    // Order by posted_at descending
    query = query.orderBy("posted_at", "desc");
    // Pagination
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    if (offset > 0) {
        query = query.offset(offset);
    }
    query = query.limit(limit + 1);
    const snapshot = await query.get();
    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;
    let listings = docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    // Client-side ZIP filter (exact match on project_zip or project_context.zip)
    if (req.query.zip) {
        const zip = req.query.zip;
        listings = listings.filter((l) => {
            var _a, _b;
            const pZip = l.project_zip ||
                ((_a = l.project_context) === null || _a === void 0 ? void 0 : _a.zip) ||
                ((_b = l.project_context) === null || _b === void 0 ? void 0 : _b.project_zip);
            return pZip === zip;
        });
    }
    res.status(200).json({
        success: true,
        count: listings.length,
        hasMore,
        data: listings,
    });
}
/**
 * GET /marketplace/listings/:id
 * Get a single listing with its bids.
 *
 * @scope read_marketplace
 */
async function handleGetListing(req, res, listingId) {
    await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.READ_MARKETPLACE);
    const db = admin.firestore();
    const listingSnap = await db
        .collection("marketplace_listings")
        .doc(listingId)
        .get();
    if (!listingSnap.exists) {
        res.status(404).json({ success: false, error: "Listing not found" });
        return;
    }
    // Fetch bids for this listing
    const bidsSnap = await db
        .collection("marketplace_bids")
        .where("listing_id", "==", listingId)
        .orderBy("submitted_at", "desc")
        .get();
    const bids = bidsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    res.status(200).json({
        success: true,
        data: {
            id: listingSnap.id,
            ...listingSnap.data(),
            bids,
        },
    });
}
/**
 * POST /marketplace/listings
 * Create a new marketplace listing.
 *
 * Body:
 *   service_type   — Required. One of SERVICE_TYPES.
 *   title          — Required. Short title.
 *   description    — Required. Full description.
 *   budget_min     — Optional. Minimum budget ($).
 *   budget_max     — Optional. Maximum budget ($).
 *   project_zip    — Optional. Project ZIP code.
 *   deadline       — Optional. ISO date string.
 *   requirements   — Optional. Array of requirement strings.
 *
 * @scope write_marketplace
 */
async function handleCreateListing(req, res, apiKeyData) {
    const { service_type, title, description, budget_min, budget_max, project_zip, deadline, requirements, } = req.body;
    if (!service_type || !title || !description) {
        res.status(400).json({
            success: false,
            error: "service_type, title, and description are required",
        });
        return;
    }
    if (!SERVICE_TYPES.includes(service_type)) {
        res.status(400).json({
            success: false,
            error: `Invalid service_type. Must be one of: ${SERVICE_TYPES.join(", ")}`,
        });
        return;
    }
    const budget = typeof budget_min === "number" && typeof budget_max === "number"
        ? { min: budget_min, max: budget_max }
        : null;
    const db = admin.firestore();
    const listingData = {
        service_type,
        title,
        description,
        budget,
        project_zip: project_zip || null,
        project_context: project_zip ? { zip: project_zip } : null,
        deadline: deadline
            ? admin.firestore.Timestamp.fromDate(new Date(deadline))
            : null,
        requirements: requirements || [],
        status: "open",
        bid_count: 0,
        winning_bid: null,
        posted_by: {
            userId: apiKeyData.userId,
            apiKeyId: apiKeyData.id,
        },
        posted_at: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const listingRef = await db
        .collection("marketplace_listings")
        .add(listingData);
    res.status(201).json({
        success: true,
        data: { listingId: listingRef.id },
    });
}
/**
 * POST /marketplace/listings/:id/bid
 * Submit a bid on a listing.
 *
 * Body:
 *   amount          — Required. Bid amount ($).
 *   timeline_hours  — Optional. Proposed timeline in hours.
 *   message         — Optional. Message to listing poster.
 *   worker_id       — Required. Worker document ID.
 *
 * Auto-computes bid_score using scoreBid() from smartBidding.
 *
 * @scope write_marketplace
 */
async function handleSubmitBid(req, res, listingId, apiKeyData) {
    var _a;
    const { amount, timeline_hours, message, worker_id } = req.body;
    if (amount === undefined || !worker_id) {
        res.status(400).json({
            success: false,
            error: "amount and worker_id are required",
        });
        return;
    }
    if (typeof amount !== "number" || amount <= 0) {
        res.status(400).json({
            success: false,
            error: "amount must be a positive number",
        });
        return;
    }
    const db = admin.firestore();
    // Verify listing exists and is open
    const listingRef = db.collection("marketplace_listings").doc(listingId);
    const listingSnap = await listingRef.get();
    if (!listingSnap.exists) {
        res.status(404).json({ success: false, error: "Listing not found" });
        return;
    }
    const listing = listingSnap.data();
    if (listing.status !== "open") {
        res.status(409).json({
            success: false,
            error: "Listing is no longer accepting bids",
        });
        return;
    }
    // Prevent bidding on own listing
    if (((_a = listing.posted_by) === null || _a === void 0 ? void 0 : _a.userId) === apiKeyData.userId) {
        res.status(409).json({
            success: false,
            error: "Cannot bid on your own listing",
        });
        return;
    }
    // Fetch worker profile for scoring
    const workerSnap = await db.collection("workers").doc(worker_id).get();
    const workerData = workerSnap.exists ? workerSnap.data() : {};
    // Compute bid score
    const weights = await (0, smartBidding_1.loadWeights)();
    const proposedDays = typeof timeline_hours === "number" ? timeline_hours / 24 : undefined;
    const bidDataForScoring = {
        price: amount,
        proposed_days: proposedDays,
    };
    const bidScore = (0, smartBidding_1.scoreBid)(bidDataForScoring, listing, workerData, weights);
    const bidData = {
        listing_id: listingId,
        price: amount,
        timeline_hours: timeline_hours || null,
        proposed_days: proposedDays || null,
        notes: message || "",
        status: "pending",
        bid_score: bidScore.totalScore,
        bid_score_breakdown: bidScore.breakdown,
        bidder: {
            userId: apiKeyData.userId,
            apiKeyId: apiKeyData.id,
            workerId: worker_id,
        },
        submitted_at: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const bidRef = await db.collection("marketplace_bids").add(bidData);
    // Increment bid count on listing
    await listingRef.update({
        bid_count: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(201).json({
        success: true,
        data: {
            bidId: bidRef.id,
            bid_score: bidScore.totalScore,
            bid_score_breakdown: bidScore.breakdown,
        },
    });
}
/**
 * POST /marketplace/listings/:id/accept
 * Accept a bid on a listing.
 *
 * Body:
 *   bid_id — Required. The bid document ID to accept.
 *
 * @scope write_marketplace
 */
async function handleAcceptBid(req, res, listingId, apiKeyData) {
    var _a, _b, _c;
    const { bid_id } = req.body;
    if (!bid_id) {
        res.status(400).json({ success: false, error: "bid_id is required" });
        return;
    }
    const db = admin.firestore();
    const listingRef = db.collection("marketplace_listings").doc(listingId);
    const listingSnap = await listingRef.get();
    if (!listingSnap.exists) {
        res.status(404).json({ success: false, error: "Listing not found" });
        return;
    }
    const listing = listingSnap.data();
    // Only the listing poster can accept bids
    if (((_a = listing.posted_by) === null || _a === void 0 ? void 0 : _a.userId) !== apiKeyData.userId) {
        res.status(403).json({
            success: false,
            error: "Only the listing poster can accept bids",
        });
        return;
    }
    if (listing.status !== "open") {
        res.status(409).json({
            success: false,
            error: "Listing is no longer open",
        });
        return;
    }
    // Verify bid exists and belongs to this listing
    const bidRef = db.collection("marketplace_bids").doc(bid_id);
    const bidSnap = await bidRef.get();
    if (!bidSnap.exists) {
        res.status(404).json({ success: false, error: "Bid not found" });
        return;
    }
    const bidData = bidSnap.data();
    if (bidData.listing_id !== listingId) {
        res.status(400).json({
            success: false,
            error: "Bid does not belong to this listing",
        });
        return;
    }
    // Batch update: accept bid, reject others, update listing
    const batch = db.batch();
    batch.update(listingRef, {
        status: "assigned",
        winning_bid: {
            bidId: bid_id,
            bidderId: ((_b = bidData.bidder) === null || _b === void 0 ? void 0 : _b.userId) || ((_c = bidData.bidder) === null || _c === void 0 ? void 0 : _c.workerId),
            price: bidData.price,
            accepted_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(bidRef, {
        status: "accepted",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Reject other pending bids
    const otherBids = await db
        .collection("marketplace_bids")
        .where("listing_id", "==", listingId)
        .where("status", "==", "pending")
        .get();
    otherBids.forEach((doc) => {
        if (doc.id !== bid_id) {
            batch.update(doc.ref, {
                status: "rejected",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });
    await batch.commit();
    res.status(200).json({
        success: true,
        data: {
            listingId,
            acceptedBidId: bid_id,
        },
    });
}
/**
 * POST /marketplace/listings/:id/complete
 * Mark a job as complete.
 *
 * Body:
 *   completion_notes — Optional. Notes about the completed work.
 *   deliverables     — Optional. Array of deliverable descriptions.
 *
 * @scope write_marketplace
 */
async function handleCompleteListing(req, res, listingId, apiKeyData) {
    var _a, _b;
    const { completion_notes, deliverables } = req.body;
    const db = admin.firestore();
    const listingRef = db.collection("marketplace_listings").doc(listingId);
    const listingSnap = await listingRef.get();
    if (!listingSnap.exists) {
        res.status(404).json({ success: false, error: "Listing not found" });
        return;
    }
    const listing = listingSnap.data();
    // Only poster or assigned worker can complete
    const isPosted = ((_a = listing.posted_by) === null || _a === void 0 ? void 0 : _a.userId) === apiKeyData.userId;
    const isWorker = ((_b = listing.winning_bid) === null || _b === void 0 ? void 0 : _b.bidderId) === apiKeyData.userId;
    if (!isPosted && !isWorker) {
        res.status(403).json({
            success: false,
            error: "Only the listing poster or assigned worker can complete the job",
        });
        return;
    }
    if (listing.status !== "assigned") {
        res.status(409).json({
            success: false,
            error: "Job must be in assigned status to complete",
        });
        return;
    }
    await listingRef.update({
        status: "completed",
        completion_notes: completion_notes || null,
        deliverables: deliverables || [],
        completed_at: admin.firestore.FieldValue.serverTimestamp(),
        completed_by: apiKeyData.userId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(200).json({
        success: true,
        data: { listingId },
    });
}
// ─── Workers Handlers ──────────────────────────────────────────────────────────
/**
 * GET /marketplace/workers
 * Search worker profiles.
 *
 * Query params:
 *   skill          — Filter by skill (client-side, array-contains workaround)
 *   state          — Filter by state in service_areas
 *   zip            — Filter by zip_code
 *   radius_miles   — Radius around zip (client-side)
 *   min_rating     — Minimum overall rating
 *   limit          — Max results (default 50, max 100)
 *
 * @scope read_workers
 */
async function handleGetWorkers(req, res) {
    await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.READ_WORKERS);
    const db = admin.firestore();
    let query = db.collection("workers");
    // Min rating filter (Firestore server-side)
    const minRating = parseFloat(req.query.min_rating);
    if (!isNaN(minRating)) {
        query = query.where("ratings.overall", ">=", minRating);
    }
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    query = query.limit(limit);
    const snapshot = await query.get();
    let workers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    // Client-side skill filter
    if (req.query.skill) {
        const skill = req.query.skill;
        workers = workers.filter((w) => Array.isArray(w.skills) && w.skills.includes(skill));
    }
    // Client-side state filter
    if (req.query.state) {
        const state = req.query.state.toUpperCase();
        workers = workers.filter((w) => Array.isArray(w.service_areas) && w.service_areas.includes(state));
    }
    // Client-side zip filter
    if (req.query.zip) {
        const zip = req.query.zip;
        workers = workers.filter((w) => w.zip_code === zip);
    }
    res.status(200).json({
        success: true,
        count: workers.length,
        data: workers,
    });
}
/**
 * GET /marketplace/workers/:id
 * Get a single worker profile.
 *
 * @scope read_workers
 */
async function handleGetWorker(req, res, workerId) {
    await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.READ_WORKERS);
    const db = admin.firestore();
    const workerSnap = await db.collection("workers").doc(workerId).get();
    if (!workerSnap.exists) {
        res.status(404).json({ success: false, error: "Worker not found" });
        return;
    }
    res.status(200).json({
        success: true,
        data: { id: workerSnap.id, ...workerSnap.data() },
    });
}
/**
 * POST /marketplace/workers
 * Register or update a worker profile.
 *
 * Body:
 *   skills               — Required. Array of skill strings.
 *   zip_code             — Optional. Worker's ZIP code.
 *   service_radius_miles — Optional. Service radius in miles.
 *   bio                  — Optional. Short bio.
 *   certifications       — Optional. Array of certification strings.
 *
 * @scope write_workers
 */
async function handleRegisterWorker(req, res, apiKeyData) {
    const { skills, zip_code, service_radius_miles, bio, certifications } = req.body;
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
        res.status(400).json({
            success: false,
            error: "skills array with at least one entry is required",
        });
        return;
    }
    const db = admin.firestore();
    // Check if worker already exists for this user
    const existing = await db
        .collection("workers")
        .where("user_id", "==", apiKeyData.userId)
        .limit(1)
        .get();
    if (!existing.empty) {
        // Update existing worker
        const docRef = existing.docs[0].ref;
        const updateData = {
            skills,
            zip_code: zip_code || null,
            service_radius_miles: service_radius_miles || null,
            bio: bio || null,
            certifications: certifications || [],
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await docRef.update(updateData);
        res.status(200).json({
            success: true,
            data: { workerId: docRef.id, updated: true },
        });
        return;
    }
    // Create new worker
    const workerData = {
        user_id: apiKeyData.userId,
        skills,
        zip_code: zip_code || null,
        service_radius_miles: service_radius_miles || null,
        bio: bio || null,
        certifications: certifications || [],
        availability: "available",
        ratings: { overall: 0 },
        completed_jobs: 0,
        registered_at: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const workerRef = await db.collection("workers").add(workerData);
    res.status(201).json({
        success: true,
        data: { workerId: workerRef.id, updated: false },
    });
}
/**
 * POST /marketplace/workers/:id/rate
 * Rate a worker after job completion.
 *
 * Body:
 *   listing_id — Required. The listing that was completed.
 *   rating     — Required. Score 1-5.
 *   review     — Optional. Text review.
 *
 * @scope write_marketplace
 */
async function handleRateWorker(req, res, workerId, apiKeyData) {
    var _a, _b;
    const { listing_id, rating, review } = req.body;
    if (!listing_id || rating === undefined) {
        res.status(400).json({
            success: false,
            error: "listing_id and rating are required",
        });
        return;
    }
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
        res.status(400).json({
            success: false,
            error: "rating must be a number between 1 and 5",
        });
        return;
    }
    const db = admin.firestore();
    // Verify listing is completed
    const listingSnap = await db
        .collection("marketplace_listings")
        .doc(listing_id)
        .get();
    if (!listingSnap.exists) {
        res.status(404).json({ success: false, error: "Listing not found" });
        return;
    }
    const listing = listingSnap.data();
    if (listing.status !== "completed") {
        res.status(409).json({
            success: false,
            error: "Can only rate after job completion",
        });
        return;
    }
    // Only the listing poster can rate
    if (((_a = listing.posted_by) === null || _a === void 0 ? void 0 : _a.userId) !== apiKeyData.userId) {
        res.status(403).json({
            success: false,
            error: "Only the listing poster can rate the worker",
        });
        return;
    }
    // Create rating
    await db.collection("marketplace_ratings").add({
        listing_id,
        worker_id: workerId,
        rated_by: apiKeyData.userId,
        score: rating,
        review: review || "",
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Update worker's rolling average
    const workerRef = db.collection("workers").doc(workerId);
    const workerSnap = await workerRef.get();
    if (workerSnap.exists) {
        const worker = workerSnap.data();
        const currentRating = ((_b = worker.ratings) === null || _b === void 0 ? void 0 : _b.overall) || 0;
        const completedJobs = worker.completed_jobs || 0;
        const newAvg = completedJobs === 0
            ? rating
            : (currentRating * completedJobs + rating) / (completedJobs + 1);
        await workerRef.update({
            "ratings.overall": Math.round(newAvg * 100) / 100,
            completed_jobs: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    res.status(200).json({
        success: true,
        data: { listing_id, worker_id: workerId, rating },
    });
}
// ─── My Items Handlers ─────────────────────────────────────────────────────────
/**
 * GET /marketplace/my/listings
 * Get listings posted by the authenticated API key owner.
 *
 * @scope read_marketplace
 */
async function handleMyListings(req, res, apiKeyData) {
    const db = admin.firestore();
    const snapshot = await db
        .collection("marketplace_listings")
        .where("posted_by.userId", "==", apiKeyData.userId)
        .orderBy("posted_at", "desc")
        .limit(100)
        .get();
    const listings = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    res.status(200).json({
        success: true,
        count: listings.length,
        data: listings,
    });
}
/**
 * GET /marketplace/my/bids
 * Get bids submitted by the authenticated API key owner.
 *
 * @scope read_marketplace
 */
async function handleMyBids(req, res, apiKeyData) {
    const db = admin.firestore();
    const snapshot = await db
        .collection("marketplace_bids")
        .where("bidder.userId", "==", apiKeyData.userId)
        .orderBy("submitted_at", "desc")
        .limit(100)
        .get();
    const bids = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    res.status(200).json({
        success: true,
        count: bids.length,
        data: bids,
    });
}
/**
 * GET /marketplace/my/active-tasks
 * Get listings currently assigned to the authenticated API key owner.
 *
 * @scope read_marketplace
 */
async function handleMyActiveTasks(req, res, apiKeyData) {
    const db = admin.firestore();
    const snapshot = await db
        .collection("marketplace_listings")
        .where("winning_bid.bidderId", "==", apiKeyData.userId)
        .where("status", "==", "assigned")
        .orderBy("updatedAt", "desc")
        .limit(100)
        .get();
    const tasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    res.status(200).json({
        success: true,
        count: tasks.length,
        data: tasks,
    });
}
// ─── Main Router ───────────────────────────────────────────────────────────────
/**
 * Single onRequest handler that routes marketplace API calls based on URL path.
 *
 * Routes:
 *   GET    /marketplace/listings            — Browse listings
 *   GET    /marketplace/listings/:id        — Get single listing + bids
 *   POST   /marketplace/listings            — Create listing
 *   POST   /marketplace/listings/:id/bid    — Submit bid
 *   POST   /marketplace/listings/:id/accept — Accept a bid
 *   POST   /marketplace/listings/:id/complete — Mark complete
 *
 *   GET    /marketplace/workers             — Search workers
 *   GET    /marketplace/workers/:id         — Get worker profile
 *   POST   /marketplace/workers             — Register/update worker
 *   POST   /marketplace/workers/:id/rate    — Rate a worker
 *
 *   GET    /marketplace/my/listings         — My posted listings
 *   GET    /marketplace/my/bids             — My submitted bids
 *   GET    /marketplace/my/active-tasks     — My active tasks
 *
 * @function marketplaceApi
 * @type onRequest
 * @auth api_key
 */
async function marketplaceApiHandler(req, res) {
    if (handleOptions(req, res))
        return;
    setCors(res);
    try {
        const segments = parseSegments(req);
        // Segments: ["marketplace", "listings", ...] or just ["listings", ...]
        // Strip leading "marketplace" if present (depends on how Firebase routes)
        let pathSegments = [...segments];
        if (pathSegments[0] === "marketplace") {
            pathSegments = pathSegments.slice(1);
        }
        const resource = pathSegments[0]; // "listings", "workers", "my"
        const resourceId = pathSegments[1]; // ID or sub-resource name
        const action = pathSegments[2]; // "bid", "accept", "complete", "rate"
        // ── My Items ──
        if (resource === "my") {
            if (req.method !== "GET") {
                res.status(405).json({ success: false, error: "Method not allowed" });
                return;
            }
            const apiKeyData = await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.READ_MARKETPLACE);
            if (resourceId === "listings") {
                await handleMyListings(req, res, apiKeyData);
                return;
            }
            if (resourceId === "bids") {
                await handleMyBids(req, res, apiKeyData);
                return;
            }
            if (resourceId === "active-tasks") {
                await handleMyActiveTasks(req, res, apiKeyData);
                return;
            }
            res.status(404).json({ success: false, error: "Unknown my/ endpoint" });
            return;
        }
        // ── Listings ──
        if (resource === "listings") {
            // POST /listings (create)
            if (!resourceId && req.method === "POST") {
                const apiKeyData = await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.WRITE_MARKETPLACE);
                await handleCreateListing(req, res, apiKeyData);
                return;
            }
            // GET /listings (browse)
            if (!resourceId && req.method === "GET") {
                await handleGetListings(req, res);
                return;
            }
            // Actions on a specific listing
            if (resourceId) {
                // POST /listings/:id/bid
                if (action === "bid" && req.method === "POST") {
                    const apiKeyData = await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.WRITE_MARKETPLACE);
                    await handleSubmitBid(req, res, resourceId, apiKeyData);
                    return;
                }
                // POST /listings/:id/accept
                if (action === "accept" && req.method === "POST") {
                    const apiKeyData = await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.WRITE_MARKETPLACE);
                    await handleAcceptBid(req, res, resourceId, apiKeyData);
                    return;
                }
                // POST /listings/:id/complete
                if (action === "complete" && req.method === "POST") {
                    const apiKeyData = await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.WRITE_MARKETPLACE);
                    await handleCompleteListing(req, res, resourceId, apiKeyData);
                    return;
                }
                // GET /listings/:id (single listing)
                if (!action && req.method === "GET") {
                    await handleGetListing(req, res, resourceId);
                    return;
                }
            }
            res.status(405).json({ success: false, error: "Method not allowed" });
            return;
        }
        // ── Workers ──
        if (resource === "workers") {
            // POST /workers (register)
            if (!resourceId && req.method === "POST") {
                const apiKeyData = await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.WRITE_WORKERS);
                await handleRegisterWorker(req, res, apiKeyData);
                return;
            }
            // GET /workers (search)
            if (!resourceId && req.method === "GET") {
                await handleGetWorkers(req, res);
                return;
            }
            // Actions on a specific worker
            if (resourceId) {
                // POST /workers/:id/rate
                if (action === "rate" && req.method === "POST") {
                    const apiKeyData = await (0, apiKeys_1.validateApiKeyFromRequest)(req, apiKeys_1.ApiKeyScope.WRITE_MARKETPLACE);
                    await handleRateWorker(req, res, resourceId, apiKeyData);
                    return;
                }
                // GET /workers/:id
                if (!action && req.method === "GET") {
                    await handleGetWorker(req, res, resourceId);
                    return;
                }
            }
            res.status(405).json({ success: false, error: "Method not allowed" });
            return;
        }
        // ── Unknown route ──
        res.status(404).json({
            success: false,
            error: "Unknown endpoint. Available: /listings, /workers, /my",
        });
    }
    catch (error) {
        console.error("Marketplace API error:", error);
        const status = errorStatus(error);
        res.status(status).json({
            success: false,
            error: error.message || "Internal server error",
        });
    }
}
// ─── Export ────────────────────────────────────────────────────────────────────
/**
 * marketplaceApi — Single HTTP endpoint for all marketplace operations.
 *
 * @function marketplaceApi
 * @type onRequest
 * @auth api_key (Bearer token)
 * @scope read_marketplace, write_marketplace, read_workers, write_workers
 */
exports.marketplaceApi = functions
    .runWith({ timeoutSeconds: 60, memory: "512MB" })
    .https.onRequest(marketplaceApiHandler);
//# sourceMappingURL=marketplaceApi.js.map