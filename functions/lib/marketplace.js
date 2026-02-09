"use strict";
/**
 * Marketplace - Cloud Functions
 *
 * Open marketplace / bidding system for solar installation services.
 * Handles listings, bids, worker profiles, ratings, and search.
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
exports.getListingsForWorker = exports.getMarketplaceListings = exports.searchWorkers = exports.registerWorker = exports.rateWorker = exports.completeMarketplaceJob = exports.acceptBid = exports.submitBid = exports.createMarketplaceListing = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const smartBidding_1 = require("./smartBidding");
const locationMatching_1 = require("./locationMatching");
const db = admin.firestore();
// Valid service types for marketplace listings
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
/**
 * createMarketplaceListing - Create a new marketplace job listing
 */
exports.createMarketplaceListing = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const { service_type, project_id, requirements, deliverables, budget, deadline, project_context, project_zip, project_lat, project_lng, project_state, auto_created, source_task_id, source_project_id, bid_window_hours, allow_diy, customer_id, } = data;
    if (!service_type || !requirements) {
        throw new functions.https.HttpsError("invalid-argument", "service_type and requirements are required");
    }
    if (!SERVICE_TYPES.includes(service_type)) {
        throw new functions.https.HttpsError("invalid-argument", `Invalid service_type: ${service_type}`);
    }
    if (budget &&
        (typeof budget.min !== "number" || typeof budget.max !== "number")) {
        throw new functions.https.HttpsError("invalid-argument", "budget must have numeric min and max");
    }
    const bidWindowHrs = typeof bid_window_hours === "number" ? bid_window_hours : 24;
    const postedAt = new Date();
    const bidWindowClosesAt = new Date(postedAt.getTime() + bidWindowHrs * 60 * 60 * 1000);
    const listingData = {
        service_type,
        project_id: project_id || null,
        requirements,
        deliverables: deliverables || [],
        budget: budget || null,
        deadline: deadline
            ? admin.firestore.Timestamp.fromDate(new Date(deadline))
            : null,
        project_context: project_context || null,
        project_zip: project_zip || null,
        project_lat: typeof project_lat === "number" ? project_lat : null,
        project_lng: typeof project_lng === "number" ? project_lng : null,
        project_state: project_state || null,
        auto_created: auto_created === true ? true : false,
        source_task_id: source_task_id || null,
        source_project_id: source_project_id || null,
        bid_window_hours: bidWindowHrs,
        bid_window_closes_at: admin.firestore.Timestamp.fromDate(bidWindowClosesAt),
        allow_diy: allow_diy === true ? true : false,
        customer_id: customer_id || null,
        status: "open",
        bid_count: 0,
        winning_bid: null,
        posted_by: {
            userId: context.auth.uid,
            email: context.auth.token.email || null,
        },
        posted_at: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const listingRef = await db
        .collection("marketplace_listings")
        .add(listingData);
    return {
        success: true,
        listingId: listingRef.id,
    };
});
/**
 * submitBid - Submit a bid on a marketplace listing
 */
exports.submitBid = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const { listing_id, price, timeline, notes, certifications } = data;
    if (!listing_id || price === undefined) {
        throw new functions.https.HttpsError("invalid-argument", "listing_id and price are required");
    }
    if (typeof price !== "number" || price <= 0) {
        throw new functions.https.HttpsError("invalid-argument", "price must be a positive number");
    }
    // Verify listing exists and is open
    const listingRef = db.collection("marketplace_listings").doc(listing_id);
    const listingSnap = await listingRef.get();
    if (!listingSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Listing not found");
    }
    const listing = listingSnap.data();
    if (listing.status !== "open") {
        throw new functions.https.HttpsError("failed-precondition", "Listing is no longer accepting bids");
    }
    // Prevent bidding on own listing
    if (((_a = listing.posted_by) === null || _a === void 0 ? void 0 : _a.userId) === context.auth.uid) {
        throw new functions.https.HttpsError("failed-precondition", "Cannot bid on your own listing");
    }
    // Get bidder info
    const userSnap = await db.collection("users").doc(context.auth.uid).get();
    const userData = userSnap.exists ? userSnap.data() : {};
    const bidData = {
        listing_id,
        price,
        timeline: timeline || null,
        notes: notes || "",
        certifications: certifications || [],
        status: "pending",
        bidder: {
            userId: context.auth.uid,
            email: context.auth.token.email || null,
            displayName: (userData === null || userData === void 0 ? void 0 : userData.displayName) || context.auth.token.name || null,
        },
        submitted_at: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Compute worker distance if listing has location data
    let workerDistanceMiles = null;
    if (listing.project_lat != null && listing.project_lng != null) {
        // Try to get worker location from worker profile
        const workerQuery = await db
            .collection("workers")
            .where("user_id", "==", context.auth.uid)
            .limit(1)
            .get();
        if (!workerQuery.empty) {
            const workerDoc = workerQuery.docs[0].data();
            let wLat;
            let wLng;
            if (typeof workerDoc.lat === "number" &&
                typeof workerDoc.lng === "number") {
                wLat = workerDoc.lat;
                wLng = workerDoc.lng;
            }
            else if (workerDoc.zip_code) {
                const coords = await (0, locationMatching_1.getZipCoordinates)(workerDoc.zip_code);
                if (coords) {
                    wLat = coords.lat;
                    wLng = coords.lng;
                }
            }
            if (wLat !== undefined && wLng !== undefined) {
                workerDistanceMiles =
                    Math.round((0, locationMatching_1.haversineDistance)(listing.project_lat, listing.project_lng, wLat, wLng) * 100) / 100;
            }
        }
    }
    if (workerDistanceMiles !== null) {
        bidData.worker_distance_miles = workerDistanceMiles;
    }
    const bidRef = await db.collection("marketplace_bids").add(bidData);
    // Compute bid score using smart bidding engine
    try {
        const weights = await (0, smartBidding_1.loadWeights)();
        const workerQuery = await db
            .collection("workers")
            .where("user_id", "==", context.auth.uid)
            .limit(1)
            .get();
        const workerData = workerQuery.empty ? {} : workerQuery.docs[0].data();
        const bidScore = (0, smartBidding_1.scoreBid)(bidData, listing, workerData, weights);
        await bidRef.update({
            bid_score: bidScore.totalScore,
            bid_score_breakdown: bidScore.breakdown,
        });
    }
    catch (err) {
        console.warn("Failed to compute bid score, continuing without it:", err);
    }
    // Increment bid count on listing
    await listingRef.update({
        bid_count: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        success: true,
        bidId: bidRef.id,
    };
});
/**
 * acceptBid - Accept a bid on a marketplace listing (listing poster only)
 */
exports.acceptBid = functions.https.onCall(async (data, context) => {
    var _a, _b, _c;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const { listing_id, bid_id } = data;
    if (!listing_id || !bid_id) {
        throw new functions.https.HttpsError("invalid-argument", "listing_id and bid_id are required");
    }
    const listingRef = db.collection("marketplace_listings").doc(listing_id);
    const listingSnap = await listingRef.get();
    if (!listingSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Listing not found");
    }
    const listing = listingSnap.data();
    // Only the poster can accept bids
    if (((_a = listing.posted_by) === null || _a === void 0 ? void 0 : _a.userId) !== context.auth.uid) {
        throw new functions.https.HttpsError("permission-denied", "Only the listing poster can accept bids");
    }
    if (listing.status !== "open") {
        throw new functions.https.HttpsError("failed-precondition", "Listing is no longer open");
    }
    // Verify bid exists
    const bidRef = db.collection("marketplace_bids").doc(bid_id);
    const bidSnap = await bidRef.get();
    if (!bidSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Bid not found");
    }
    const bidData = bidSnap.data();
    if (bidData.listing_id !== listing_id) {
        throw new functions.https.HttpsError("invalid-argument", "Bid does not belong to this listing");
    }
    // Use a batch to atomically update everything
    const batch = db.batch();
    // Update listing
    batch.update(listingRef, {
        status: "assigned",
        winning_bid: {
            bidId: bid_id,
            bidderId: (_b = bidData.bidder) === null || _b === void 0 ? void 0 : _b.userId,
            price: bidData.price,
            accepted_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Accept the winning bid
    batch.update(bidRef, {
        status: "accepted",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Reject all other bids for this listing
    const otherBids = await db
        .collection("marketplace_bids")
        .where("listing_id", "==", listing_id)
        .get();
    otherBids.forEach((doc) => {
        if (doc.id !== bid_id && doc.data().status === "pending") {
            batch.update(doc.ref, {
                status: "rejected",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });
    // If there's a linked project, update the project task
    if (listing.project_id) {
        const projectRef = db.collection("projects").doc(listing.project_id);
        batch.update(projectRef, {
            "marketplace.listing_id": listing_id,
            "marketplace.assigned_worker": (_c = bidData.bidder) === null || _c === void 0 ? void 0 : _c.userId,
            "marketplace.price": bidData.price,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();
    return {
        success: true,
        listingId: listing_id,
        acceptedBidId: bid_id,
    };
});
/**
 * completeMarketplaceJob - Mark a marketplace job as completed
 */
exports.completeMarketplaceJob = functions.https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const { listing_id } = data;
    if (!listing_id) {
        throw new functions.https.HttpsError("invalid-argument", "listing_id is required");
    }
    const listingRef = db.collection("marketplace_listings").doc(listing_id);
    const listingSnap = await listingRef.get();
    if (!listingSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Listing not found");
    }
    const listing = listingSnap.data();
    // Only poster or assigned worker can complete
    const isPosted = ((_a = listing.posted_by) === null || _a === void 0 ? void 0 : _a.userId) === context.auth.uid;
    const isWorker = ((_b = listing.winning_bid) === null || _b === void 0 ? void 0 : _b.bidderId) === context.auth.uid;
    if (!isPosted && !isWorker) {
        throw new functions.https.HttpsError("permission-denied", "Only the listing poster or assigned worker can complete the job");
    }
    if (listing.status !== "assigned") {
        throw new functions.https.HttpsError("failed-precondition", "Job must be in assigned status to complete");
    }
    await listingRef.update({
        status: "completed",
        completed_at: admin.firestore.FieldValue.serverTimestamp(),
        completed_by: context.auth.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        success: true,
        listingId: listing_id,
    };
});
/**
 * rateWorker - Rate a worker after job completion
 */
exports.rateWorker = functions.https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const { listing_id, worker_id, score, review } = data;
    if (!listing_id || !worker_id || !score) {
        throw new functions.https.HttpsError("invalid-argument", "listing_id, worker_id, and score are required");
    }
    if (typeof score !== "number" || score < 1 || score > 5) {
        throw new functions.https.HttpsError("invalid-argument", "score must be between 1 and 5");
    }
    // Verify listing exists and is completed
    const listingSnap = await db
        .collection("marketplace_listings")
        .doc(listing_id)
        .get();
    if (!listingSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Listing not found");
    }
    const listing = listingSnap.data();
    if (listing.status !== "completed") {
        throw new functions.https.HttpsError("failed-precondition", "Can only rate after job completion");
    }
    // Only the poster can rate
    if (((_a = listing.posted_by) === null || _a === void 0 ? void 0 : _a.userId) !== context.auth.uid) {
        throw new functions.https.HttpsError("permission-denied", "Only the listing poster can rate the worker");
    }
    // Create rating
    await db.collection("marketplace_ratings").add({
        listing_id,
        worker_id,
        rated_by: context.auth.uid,
        score,
        review: review || "",
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Update worker's rolling average rating
    const workerRef = db.collection("workers").doc(worker_id);
    const workerSnap = await workerRef.get();
    if (workerSnap.exists) {
        const worker = workerSnap.data();
        const currentRating = ((_b = worker.ratings) === null || _b === void 0 ? void 0 : _b.overall) || 0;
        const completedJobs = worker.completed_jobs || 0;
        // Calculate new rolling average
        const newAvg = completedJobs === 0
            ? score
            : (currentRating * completedJobs + score) / (completedJobs + 1);
        await workerRef.update({
            "ratings.overall": Math.round(newAvg * 100) / 100,
            completed_jobs: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    return {
        success: true,
        listing_id,
        worker_id,
        score,
    };
});
/**
 * registerWorker - Register or update a worker profile
 */
exports.registerWorker = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const { name, skills, certifications, licenses, service_areas, insurance, background_check, zip_code, service_radius_miles, } = data;
    if (!name || !skills || skills.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "name and at least one skill are required");
    }
    // Resolve zip code to coordinates if provided
    let resolvedLat = null;
    let resolvedLng = null;
    let resolvedState = null;
    if (zip_code && typeof zip_code === "string") {
        const coords = await (0, locationMatching_1.getZipCoordinates)(zip_code);
        if (coords) {
            resolvedLat = coords.lat;
            resolvedLng = coords.lng;
            resolvedState = coords.state;
        }
    }
    const workerData = {
        user_id: context.auth.uid,
        email: context.auth.token.email || null,
        name,
        skills: skills || [],
        certifications: certifications || [],
        licenses: licenses || [],
        service_areas: service_areas || [],
        insurance: insurance || null,
        background_check: background_check || null,
        zip_code: zip_code || null,
        service_radius_miles: typeof service_radius_miles === "number" ? service_radius_miles : 50,
        lat: resolvedLat,
        lng: resolvedLng,
        state: resolvedState,
        active_tasks: 0,
        max_concurrent_tasks: 3,
        strikes: { count: 0, history: [], blocked_customers: [] },
        reliability_score: 100,
        suspended_until: null,
        availability: "available",
        ratings: { overall: 0 },
        completed_jobs: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Check if worker already exists for this user
    const existing = await db
        .collection("workers")
        .where("user_id", "==", context.auth.uid)
        .limit(1)
        .get();
    if (!existing.empty) {
        // Update existing
        const docRef = existing.docs[0].ref;
        // Preserve accumulated fields on update
        const current = existing.docs[0].data();
        delete workerData.ratings;
        delete workerData.completed_jobs;
        delete workerData.active_tasks;
        delete workerData.strikes;
        delete workerData.reliability_score;
        delete workerData.suspended_until;
        workerData.ratings = current.ratings;
        workerData.completed_jobs = current.completed_jobs;
        workerData.active_tasks = (_a = current.active_tasks) !== null && _a !== void 0 ? _a : 0;
        workerData.strikes = (_b = current.strikes) !== null && _b !== void 0 ? _b : {
            count: 0,
            history: [],
            blocked_customers: [],
        };
        workerData.reliability_score = (_c = current.reliability_score) !== null && _c !== void 0 ? _c : 100;
        workerData.suspended_until = (_d = current.suspended_until) !== null && _d !== void 0 ? _d : null;
        await docRef.update(workerData);
        return { success: true, workerId: docRef.id, updated: true };
    }
    // Create new
    workerData.registered_at = admin.firestore.FieldValue.serverTimestamp();
    const workerRef = await db.collection("workers").add(workerData);
    return { success: true, workerId: workerRef.id, updated: false };
});
/**
 * searchWorkers - Search/browse worker profiles
 */
exports.searchWorkers = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
    const { skill, state, availability, min_rating, limit: queryLimit, } = data || {};
    let q = db.collection("workers");
    if (availability) {
        q = q.where("availability", "==", availability);
    }
    if (min_rating && typeof min_rating === "number") {
        q = q.where("ratings.overall", ">=", min_rating);
    }
    const resultsLimit = Math.min(queryLimit || 50, 100);
    q = q.limit(resultsLimit);
    const snapshot = await q.get();
    let workers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    // Client-side filtering for array fields (Firestore limitation)
    if (skill) {
        workers = workers.filter((w) => Array.isArray(w.skills) && w.skills.includes(skill));
    }
    if (state) {
        workers = workers.filter((w) => Array.isArray(w.service_areas) &&
            w.service_areas.includes(state));
    }
    return {
        success: true,
        workers,
        count: workers.length,
    };
});
/**
 * getMarketplaceListings - Get paginated marketplace listings
 */
exports.getMarketplaceListings = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
    const { service_type, status, limit: queryLimit, startAfter } = data || {};
    let q = db.collection("marketplace_listings");
    // Filter by status (default: open)
    q = q.where("status", "==", status || "open");
    if (service_type) {
        q = q.where("service_type", "==", service_type);
    }
    q = q.orderBy("posted_at", "desc");
    // Pagination
    if (startAfter) {
        const startDoc = await db
            .collection("marketplace_listings")
            .doc(startAfter)
            .get();
        if (startDoc.exists) {
            q = q.startAfter(startDoc);
        }
    }
    const resultsLimit = Math.min(queryLimit || 20, 50);
    q = q.limit(resultsLimit);
    const snapshot = await q.get();
    const listings = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    return {
        success: true,
        listings,
        count: listings.length,
        hasMore: listings.length === resultsLimit,
        lastId: listings.length > 0 ? listings[listings.length - 1].id : null,
    };
});
/**
 * getListingsForWorker - Get open listings matching a worker's skills within their service radius
 */
exports.getListingsForWorker = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const { worker_id } = data;
    if (!worker_id) {
        throw new functions.https.HttpsError("invalid-argument", "worker_id is required");
    }
    // Get the worker profile
    const workerSnap = await db.collection("workers").doc(worker_id).get();
    if (!workerSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Worker not found");
    }
    const worker = workerSnap.data();
    const workerSkills = Array.isArray(worker.skills)
        ? worker.skills
        : [];
    const workerRadiusMiles = typeof worker.service_radius_miles === "number"
        ? worker.service_radius_miles
        : 50;
    // Determine worker coordinates
    let workerLat;
    let workerLng;
    if (typeof worker.lat === "number" && typeof worker.lng === "number") {
        workerLat = worker.lat;
        workerLng = worker.lng;
    }
    else if (worker.zip_code && typeof worker.zip_code === "string") {
        const coords = await (0, locationMatching_1.getZipCoordinates)(worker.zip_code);
        if (coords) {
            workerLat = coords.lat;
            workerLng = coords.lng;
        }
    }
    // Query open listings
    const listingsSnap = await db
        .collection("marketplace_listings")
        .where("status", "==", "open")
        .orderBy("posted_at", "desc")
        .limit(200)
        .get();
    if (listingsSnap.empty) {
        return { success: true, listings: [], count: 0 };
    }
    // Filter and score listings
    const matchedListings = [];
    for (const doc of listingsSnap.docs) {
        const listing = doc.data();
        // Check if listing matches any of worker's skills
        const skillMatch = workerSkills.includes(listing.service_type);
        // Calculate distance if both have coordinates
        let distance = null;
        if (workerLat !== undefined &&
            workerLng !== undefined &&
            typeof listing.project_lat === "number" &&
            typeof listing.project_lng === "number") {
            distance =
                Math.round((0, locationMatching_1.haversineDistance)(workerLat, workerLng, listing.project_lat, listing.project_lng) * 100) / 100;
            // Skip if outside worker's service radius
            if (distance > workerRadiusMiles) {
                continue;
            }
        }
        matchedListings.push({
            id: doc.id,
            ...listing,
            distance,
            skill_match: skillMatch,
        });
    }
    // Sort: skill matches first, then by distance (closest first)
    matchedListings.sort((a, b) => {
        // Skill matches come first
        if (a.skill_match && !b.skill_match)
            return -1;
        if (!a.skill_match && b.skill_match)
            return 1;
        // Then by distance (null distance = at the end)
        if (a.distance === null && b.distance === null)
            return 0;
        if (a.distance === null)
            return 1;
        if (b.distance === null)
            return -1;
        return a.distance - b.distance;
    });
    return {
        success: true,
        listings: matchedListings,
        count: matchedListings.length,
    };
});
//# sourceMappingURL=marketplace.js.map