"use strict";
/**
 * SLA Engine — Service Level Agreement enforcement for the marketplace
 *
 * The "Uber penalty system" for solar installation marketplace workers.
 * Tracks deadlines, enforces penalties for violations, calculates reliability
 * scores, and auto-requeues jobs when workers fail to deliver.
 *
 * Strike system:
 *   1st strike — Warning + reliability -10
 *   2nd strike — 7-day suspension + reliability -20
 *   3rd strike — 30-day suspension
 *   4th+      — Permanent deactivation (admin review required)
 *
 * Collections:
 *   sla_violations         — Individual violation records with details
 *   workers/{id}           — Worker profiles (strikes, reliability, suspension)
 *   marketplace_listings   — Listings that may be requeued on violation
 *   config/sla_rules       — Configurable SLA time limits (optional override)
 *
 * @module slaEngine
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
exports.checkSlaDeadline = checkSlaDeadline;
exports.recordViolation = recordViolation;
exports.applyStrikePenalty = applyStrikePenalty;
exports.calculateReliabilityScore = calculateReliabilityScore;
exports.autoRequeue = autoRequeue;
exports.getWorkerSlaStatus = getWorkerSlaStatus;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// ─── SLA Time Limits (defaults, overridable via config/sla_rules) ───────────────
/**
 * Default SLA time limits in hours per task type.
 * These represent the maximum allowed time from acceptance (or scheduled time
 * for installation tasks) to completion.
 */
const DEFAULT_SLA_HOURS = {
    site_survey: 48, // 2 days from acceptance
    cad_design: 120, // 5 business days
    engineering_stamp: 72, // 3 business days
    permit_preparation: 72, // 3 business days
    permit_submission: 48, // 2 days
    roof_installation: 24, // 1 day grace from scheduled time
    electrical_installation: 24, // 1 day grace from scheduled time
    battery_installation: 24, // 1 day grace from scheduled time
    inspection_coordination: 72, // 3 business days
    pto_submission: 48, // 2 days
};
/** Task types that use scheduled time instead of acceptance time for SLA */
const SCHEDULED_TASK_TYPES = new Set([
    "roof_installation",
    "electrical_installation",
    "battery_installation",
]);
// ─── Functions ──────────────────────────────────────────────────────────────────
/**
 * Check whether a task has exceeded its SLA deadline.
 *
 * For most tasks, the deadline is calculated from the acceptance time plus the
 * SLA hours for that task type. For installation tasks, the deadline is
 * calculated from the scheduled time plus a 24-hour grace period.
 *
 * @function checkSlaDeadline
 * @param taskType - The pipeline task type (e.g. "site_survey")
 * @param acceptedAt - When the worker accepted the task
 * @param scheduledAt - When the task is scheduled (for installation tasks)
 * @returns Overdue status, hours past deadline, and whether grace period expired
 */
function checkSlaDeadline(taskType, acceptedAt, scheduledAt) {
    const slaHours = DEFAULT_SLA_HOURS[taskType];
    if (!slaHours) {
        // Unknown task type — not overdue by default
        return { overdue: false, hoursOverdue: 0, graceExpired: false };
    }
    const now = new Date();
    let deadlineDate;
    let graceExpired = false;
    if (SCHEDULED_TASK_TYPES.has(taskType) && scheduledAt) {
        // For scheduled tasks, deadline is scheduledAt + SLA grace hours
        deadlineDate = new Date(scheduledAt.getTime() + slaHours * 60 * 60 * 1000);
        graceExpired = now > deadlineDate;
    }
    else {
        // For non-scheduled tasks, deadline is acceptedAt + SLA hours
        deadlineDate = new Date(acceptedAt.getTime() + slaHours * 60 * 60 * 1000);
        graceExpired = now > deadlineDate;
    }
    const diffMs = now.getTime() - deadlineDate.getTime();
    const hoursOverdue = Math.max(0, diffMs / (1000 * 60 * 60));
    return {
        overdue: diffMs > 0,
        hoursOverdue: Math.round(hoursOverdue * 100) / 100, // 2 decimal places
        graceExpired,
    };
}
/**
 * Load SLA hours from Firestore config, falling back to hardcoded defaults.
 *
 * Reads from `config/sla_rules` document. If the document doesn't exist or
 * lacks a particular task type, the default is used.
 *
 * @returns Record of task type to SLA hours
 */
async function loadSlaRules() {
    const configSnap = await db.doc("config/sla_rules").get();
    if (!configSnap.exists) {
        return { ...DEFAULT_SLA_HOURS };
    }
    const configData = configSnap.data() || {};
    const merged = { ...DEFAULT_SLA_HOURS };
    // Override defaults with any configured values
    for (const [key, value] of Object.entries(configData)) {
        if (typeof value === "number" && value > 0) {
            merged[key] = value;
        }
    }
    return merged;
}
/**
 * Record an SLA violation against a worker.
 *
 * Creates a record in the `sla_violations` collection, increments the worker's
 * strike count, recalculates their reliability score, and applies the
 * appropriate penalty based on the new strike count.
 *
 * @function recordViolation
 * @param data - Violation details including worker, listing, project, and type
 * @returns The violation document ID
 */
async function recordViolation(data) {
    const { workerId, listingId, projectId, taskId, type, reportedBy, details } = data;
    // Create violation record
    const violationData = {
        worker_id: workerId,
        listing_id: listingId,
        project_id: projectId,
        task_id: taskId,
        type,
        reported_by: reportedBy,
        details,
        status: "active",
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        resolved_at: null,
    };
    const violationRef = await db.collection("sla_violations").add(violationData);
    // Get current worker data
    const workerRef = db.collection("workers").doc(workerId);
    const workerSnap = await workerRef.get();
    if (!workerSnap.exists) {
        functions.logger.error(`Worker ${workerId} not found when recording SLA violation`);
        return violationRef.id;
    }
    const workerData = workerSnap.data() || {};
    const currentStrikes = workerData.sla_strikes || 0;
    const newStrikeCount = currentStrikes + 1;
    // Increment violation-type-specific counter
    const counterField = `sla_${type}_count`;
    const currentTypeCount = workerData[counterField] || 0;
    // Apply strike penalty
    const penalty = await applyStrikePenalty(workerId, newStrikeCount);
    // Update worker document with new strike info
    const workerUpdate = {
        sla_strikes: newStrikeCount,
        [counterField]: currentTypeCount + 1,
        last_violation_at: admin.firestore.FieldValue.serverTimestamp(),
        last_violation_type: type,
        last_penalty: penalty.penalty,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (penalty.suspendedUntil) {
        workerUpdate.suspended = true;
        workerUpdate.suspended_until = admin.firestore.Timestamp.fromDate(penalty.suspendedUntil);
    }
    await workerRef.update(workerUpdate);
    // Recalculate reliability score
    const newScore = await calculateReliabilityScore(workerId);
    await workerRef.update({ reliability_score: newScore });
    // Update the violation record with the penalty applied
    await violationRef.update({
        strike_number: newStrikeCount,
        penalty_applied: penalty.penalty,
        suspended_until: penalty.suspendedUntil
            ? admin.firestore.Timestamp.fromDate(penalty.suspendedUntil)
            : null,
        new_reliability_score: newScore,
    });
    functions.logger.info(`SLA violation recorded for worker ${workerId}: ${type} (strike #${newStrikeCount}, ` +
        `penalty: ${penalty.penalty}, reliability: ${newScore})`);
    return violationRef.id;
}
/**
 * Apply a strike penalty to a worker based on their cumulative strike count.
 *
 * Penalty escalation:
 *   1st strike — Warning, reliability -10
 *   2nd strike — 7-day suspension, reliability -20
 *   3rd strike — 30-day suspension
 *   4th+      — Permanent deactivation (requires admin review to reinstate)
 *
 * @function applyStrikePenalty
 * @param workerId - The worker's Firestore document ID
 * @param strikeNumber - The cumulative strike number (1-based)
 * @returns The penalty applied and optional suspension end date
 */
async function applyStrikePenalty(workerId, strikeNumber) {
    const workerRef = db.collection("workers").doc(workerId);
    const now = new Date();
    switch (strikeNumber) {
        case 1: {
            // 1st strike: Warning only
            await workerRef.update({
                sla_warning_issued: true,
                sla_warning_at: admin.firestore.FieldValue.serverTimestamp(),
            });
            return { penalty: "warning" };
        }
        case 2: {
            // 2nd strike: 7-day suspension
            const suspendedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            await workerRef.update({
                suspended: true,
                suspended_until: admin.firestore.Timestamp.fromDate(suspendedUntil),
                suspension_reason: "2nd SLA strike — 7-day suspension",
            });
            return { penalty: "7_day_suspension", suspendedUntil };
        }
        case 3: {
            // 3rd strike: 30-day suspension
            const suspendedUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            await workerRef.update({
                suspended: true,
                suspended_until: admin.firestore.Timestamp.fromDate(suspendedUntil),
                suspension_reason: "3rd SLA strike — 30-day suspension",
            });
            return { penalty: "30_day_suspension", suspendedUntil };
        }
        default: {
            // 4th+ strike: Permanent deactivation
            await workerRef.update({
                suspended: true,
                deactivated: true,
                deactivated_at: admin.firestore.FieldValue.serverTimestamp(),
                deactivation_reason: `${strikeNumber}th SLA strike — permanent deactivation`,
                requires_admin_review: true,
            });
            return { penalty: "permanent_deactivation" };
        }
    }
}
/**
 * Calculate the reliability score for a worker.
 *
 * Formula:
 *   base_100
 *   - (no_show_count * 25)
 *   - (deadline_missed * 10)
 *   - (abandoned * 20)
 *   + (on_time_completions * 2)
 *
 * Only counts violations from the last 90 days — older strikes expire and
 * stop affecting the score. Result is capped at 0-100.
 *
 * @function calculateReliabilityScore
 * @param workerId - The worker's Firestore document ID
 * @returns The calculated reliability score (0-100)
 */
async function calculateReliabilityScore(workerId) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(ninetyDaysAgo);
    // Get recent violations (last 90 days)
    const violationsSnap = await db
        .collection("sla_violations")
        .where("worker_id", "==", workerId)
        .where("created_at", ">=", cutoffTimestamp)
        .where("status", "==", "active")
        .get();
    let noShowCount = 0;
    let deadlineMissedCount = 0;
    let abandonedCount = 0;
    violationsSnap.forEach((doc) => {
        const violation = doc.data();
        switch (violation.type) {
            case "no_show":
                noShowCount++;
                break;
            case "deadline_missed":
                deadlineMissedCount++;
                break;
            case "abandoned":
                abandonedCount++;
                break;
            // quality_failure and customer_complaint don't directly affect score
        }
    });
    // Get on-time completion count from worker document
    const workerSnap = await db.collection("workers").doc(workerId).get();
    const workerData = workerSnap.exists ? workerSnap.data() || {} : {};
    const onTimeCompletions = workerData.on_time_completions || 0;
    // Calculate score
    let score = 100;
    score -= noShowCount * 25;
    score -= deadlineMissedCount * 10;
    score -= abandonedCount * 20;
    score += onTimeCompletions * 2;
    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));
    return score;
}
/**
 * Auto-requeue a marketplace listing when a worker fails to deliver.
 *
 * Cancels the current assignment, blocks the worker from this customer's
 * future projects, resets the listing to "open" status with a shortened
 * 12-hour bid window, and logs the requeue event.
 *
 * @function autoRequeue
 * @param listingId - The marketplace listing document ID
 * @param workerId - The failing worker's document ID
 * @param reason - Human-readable reason for the requeue
 * @returns Resolves when the listing is requeued
 */
async function autoRequeue(listingId, workerId, reason) {
    const listingRef = db.collection("marketplace_listings").doc(listingId);
    const listingSnap = await listingRef.get();
    if (!listingSnap.exists) {
        functions.logger.error(`Marketplace listing ${listingId} not found for requeue`);
        return;
    }
    const listingData = listingSnap.data() || {};
    const projectId = listingData.project_id;
    // Cancel the current assignment and reset listing to open
    const now = new Date();
    const shortenedDeadline = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12h bid window
    await listingRef.update({
        status: "open",
        winning_bid: null,
        assigned_worker: null,
        requeued: true,
        requeued_at: admin.firestore.FieldValue.serverTimestamp(),
        requeue_reason: reason,
        requeued_from_worker: workerId,
        bid_deadline: admin.firestore.Timestamp.fromDate(shortenedDeadline),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Block this worker from the customer's future projects
    if (projectId) {
        const projectSnap = await db.collection("projects").doc(projectId).get();
        if (projectSnap.exists) {
            const projectData = projectSnap.data() || {};
            const customerId = projectData.customer_id || projectData.leadId;
            if (customerId) {
                // Add worker to blocked list for this customer
                const workerRef = db.collection("workers").doc(workerId);
                await workerRef.update({
                    blocked_customers: admin.firestore.FieldValue.arrayUnion(customerId),
                });
                functions.logger.info(`Blocked worker ${workerId} from customer ${customerId}'s future projects`);
            }
        }
        // Log the requeue in the project timeline
        await db
            .collection("projects")
            .doc(projectId)
            .collection("timeline")
            .add({
            event: "task_requeued",
            listing_id: listingId,
            worker_id: workerId,
            reason,
            new_bid_deadline: admin.firestore.Timestamp.fromDate(shortenedDeadline),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    // Log the requeue (SMS notification handled by smsNotifications module)
    functions.logger.info(`Auto-requeued listing ${listingId}: removed worker ${workerId} ` +
        `(reason: ${reason}). New 12h bid window until ${shortenedDeadline.toISOString()}`);
}
/**
 * Get the full SLA status for a worker.
 *
 * Returns strike count, reliability score, suspension status, and
 * recent violations (last 90 days).
 *
 * @function getWorkerSlaStatus
 * @param workerId - The worker's Firestore document ID
 * @returns Full SLA status including strikes, score, and recent violations
 */
async function getWorkerSlaStatus(workerId) {
    // Get worker document
    const workerSnap = await db.collection("workers").doc(workerId).get();
    if (!workerSnap.exists) {
        return {
            strikes: 0,
            reliabilityScore: 100,
            suspended: false,
            recentViolations: [],
        };
    }
    const workerData = workerSnap.data() || {};
    // Check if suspension has expired
    let suspended = workerData.suspended === true;
    let suspendedUntil;
    if (suspended && workerData.suspended_until) {
        const suspendedUntilTs = workerData.suspended_until;
        suspendedUntil = suspendedUntilTs.toDate();
        if (new Date() > suspendedUntil && !workerData.deactivated) {
            // Suspension expired — clear it
            suspended = false;
            suspendedUntil = undefined;
            await db.collection("workers").doc(workerId).update({
                suspended: false,
                suspended_until: null,
                suspension_reason: null,
            });
        }
    }
    // Get recent violations (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(ninetyDaysAgo);
    const violationsSnap = await db
        .collection("sla_violations")
        .where("worker_id", "==", workerId)
        .where("created_at", ">=", cutoffTimestamp)
        .orderBy("created_at", "desc")
        .limit(20)
        .get();
    const recentViolations = [];
    violationsSnap.forEach((doc) => {
        recentViolations.push({ id: doc.id, ...doc.data() });
    });
    // Calculate fresh reliability score
    const reliabilityScore = await calculateReliabilityScore(workerId);
    return {
        strikes: workerData.sla_strikes || 0,
        reliabilityScore,
        suspended,
        suspendedUntil,
        recentViolations,
    };
}
//# sourceMappingURL=slaEngine.js.map