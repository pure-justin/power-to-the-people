/**
 * Marketplace Automation — Scheduled & triggered Cloud Functions
 *
 * Automates marketplace lifecycle operations:
 *   1. checkSlaDeadlines   — Hourly SLA enforcement for assigned listings
 *   2. closeBidWindows     — Every-15-min bid window expiry + auto-accept
 *   3. notifyMatchingWorkers — Firestore onCreate trigger for new listings
 *   4. notifyBidResult      — Firestore onUpdate trigger for bid status changes
 *   5. notifyTaskReady      — Firestore onUpdate trigger for pipeline task readiness
 *
 * Depends on:
 *   slaEngine.ts        — checkSlaDeadline, recordViolation, autoRequeue
 *   smartBidding.ts      — autoAcceptBestBid
 *   locationMatching.ts  — findWorkersInRange
 *   webhookApi.ts        — deliverWebhookEvent
 *   smsNotifications.ts  — sendSMS
 *
 * @module marketplaceAutomation
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { checkSlaDeadline, recordViolation, autoRequeue } from "./slaEngine";
import { autoAcceptBestBid } from "./smartBidding";
import { findWorkersInRange } from "./locationMatching";
import { deliverWebhookEvent } from "./webhookApi";
import { sendSMS } from "./smsNotifications";

const db = admin.firestore();

// ─── 1. checkSlaDeadlines — Hourly SLA enforcement ─────────────────────────

/**
 * Runs every hour to check SLA deadlines on assigned marketplace listings.
 *
 * For each assigned listing:
 *   - Calls checkSlaDeadline() with the listing's service_type, accepted_at,
 *     and scheduled_at to determine overdue status.
 *   - If overdue but not yet warned: sets sla_warning_sent on the listing and
 *     sends an SMS warning to the assigned worker.
 *   - If overdue AND 24h grace has expired AND warning was already sent:
 *     records an SLA violation, auto-requeues the listing, and fires
 *     a task.sla_violated webhook event.
 *
 * @function checkSlaDeadlines
 * @type pubsub (every 1 hours)
 * @auth none
 * @firestore marketplace_listings, workers, sla_violations
 */
export const checkSlaDeadlines = functions.pubsub
  .schedule("every 1 hours")
  .timeZone("America/Chicago")
  .onRun(async () => {
    const snapshot = await db
      .collection("marketplace_listings")
      .where("status", "==", "assigned")
      .get();

    if (snapshot.empty) {
      functions.logger.info("checkSlaDeadlines: no assigned listings found");
      return null;
    }

    let warned = 0;
    let violated = 0;
    let skipped = 0;

    for (const doc of snapshot.docs) {
      const listing = doc.data();
      const listingId = doc.id;

      // Determine timestamps for SLA check
      const serviceType: string = listing.service_type || "";
      const acceptedAt = listing.accepted_at
        ? (listing.accepted_at as admin.firestore.Timestamp).toDate()
        : null;
      const scheduledAt = listing.scheduled_at
        ? (listing.scheduled_at as admin.firestore.Timestamp).toDate()
        : undefined;

      if (!acceptedAt) {
        skipped++;
        continue;
      }

      const slaResult = checkSlaDeadline(serviceType, acceptedAt, scheduledAt);

      if (!slaResult.overdue) {
        continue;
      }

      const workerId: string =
        listing.assigned_worker || listing.winning_bid?.bidderId || "";

      if (!workerId) {
        skipped++;
        continue;
      }

      // Overdue but not yet warned — send first warning
      if (!listing.sla_warning_sent) {
        await doc.ref.update({
          sla_warning_sent: true,
          sla_warning_sent_at: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // SMS the worker
        const workerSnap = await db.collection("workers").doc(workerId).get();
        const workerData = workerSnap.exists ? workerSnap.data() : null;
        const workerPhone = workerData?.phone;

        if (workerPhone) {
          await sendSMS(
            workerPhone,
            `SLA Warning: Your ${serviceType} task is ${slaResult.hoursOverdue}h overdue. ` +
              `Complete it within 24h to avoid a strike. Check your dashboard for details.`,
          );
        }

        warned++;
        functions.logger.info(
          `SLA warning sent for listing ${listingId}, worker ${workerId} ` +
            `(${slaResult.hoursOverdue}h overdue)`,
        );
        continue;
      }

      // Already warned — check if 24h grace has expired
      const warningSentAt = listing.sla_warning_sent_at
        ? (listing.sla_warning_sent_at as admin.firestore.Timestamp).toDate()
        : null;

      const graceExpired = warningSentAt
        ? new Date().getTime() - warningSentAt.getTime() > 24 * 60 * 60 * 1000
        : slaResult.graceExpired;

      if (!graceExpired) {
        continue;
      }

      // Grace expired — record violation, requeue, fire webhook
      try {
        await recordViolation({
          workerId,
          listingId,
          projectId: listing.project_id || "",
          taskId: listing.task_id || "",
          type: "deadline_missed",
          reportedBy: "system:sla_automation",
          details:
            `Deadline missed by ${slaResult.hoursOverdue}h for ${serviceType}. ` +
            `Warning sent, 24h grace expired.`,
        });

        await autoRequeue(
          listingId,
          workerId,
          `SLA deadline missed by ${slaResult.hoursOverdue}h — auto-requeued`,
        );

        await deliverWebhookEvent("task.sla_violated", {
          listing_id: listingId,
          worker_id: workerId,
          service_type: serviceType,
          hours_overdue: slaResult.hoursOverdue,
          action: "auto_requeued",
        });

        violated++;
        functions.logger.info(
          `SLA violation recorded for listing ${listingId}, worker ${workerId} ` +
            `(${slaResult.hoursOverdue}h overdue, requeued)`,
        );
      } catch (err) {
        functions.logger.error(
          `Error processing SLA violation for listing ${listingId}:`,
          err,
        );
      }
    }

    functions.logger.info(
      `checkSlaDeadlines complete: ${snapshot.size} checked, ` +
        `${warned} warned, ${violated} violated, ${skipped} skipped`,
    );

    return null;
  });

// ─── 2. closeBidWindows — Every 15 minutes ─────────────────────────────────

/**
 * Runs every 15 minutes to close expired bid windows on open listings.
 *
 * For each open listing whose bid_window_closes_at has passed:
 *   - Calls autoAcceptBestBid() to score and accept the top bid.
 *   - If a bid was accepted: delivers a bid.accepted webhook.
 *   - If no bids exist: extends the bid window by 24 hours and notifies
 *     the listing poster.
 *
 * @function closeBidWindows
 * @type pubsub (every 15 minutes)
 * @auth none
 * @firestore marketplace_listings, marketplace_bids, workers
 */
export const closeBidWindows = functions.pubsub
  .schedule("every 15 minutes")
  .timeZone("America/Chicago")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();

    const snapshot = await db
      .collection("marketplace_listings")
      .where("status", "==", "open")
      .where("bid_window_closes_at", "<=", now)
      .get();

    if (snapshot.empty) {
      functions.logger.info("closeBidWindows: no expired bid windows found");
      return null;
    }

    let accepted = 0;
    let extended = 0;
    let errors = 0;

    for (const doc of snapshot.docs) {
      const listing = doc.data();
      const listingId = doc.id;

      try {
        const result = await autoAcceptBestBid(listingId);

        if (result.accepted) {
          await deliverWebhookEvent("bid.accepted", {
            listing_id: listingId,
            bid_id: result.bidId,
            score: result.score,
            auto_accepted: true,
          });

          accepted++;
          functions.logger.info(
            `Bid window closed for listing ${listingId}: accepted bid ${result.bidId} ` +
              `(score: ${result.score})`,
          );
        } else {
          // No bids — extend window by 24 hours
          const newDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

          await doc.ref.update({
            bid_window_closes_at:
              admin.firestore.Timestamp.fromDate(newDeadline),
            bid_window_extended: true,
            bid_window_extensions: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Notify listing poster
          const posterId: string =
            listing.posted_by || listing.created_by || "";
          if (posterId) {
            const posterSnap = await db.collection("users").doc(posterId).get();
            const posterData = posterSnap.exists ? posterSnap.data() : null;
            const posterPhone = posterData?.phone;

            if (posterPhone) {
              await sendSMS(
                posterPhone,
                `Your ${listing.service_type || "marketplace"} listing received no bids. ` +
                  `We've extended the window by 24h. Consider adjusting the budget to attract workers.`,
              );
            }
          }

          extended++;
          functions.logger.info(
            `Bid window extended for listing ${listingId}: no bids, ` +
              `new deadline ${newDeadline.toISOString()}`,
          );
        }
      } catch (err) {
        errors++;
        functions.logger.error(
          `Error closing bid window for listing ${listingId}:`,
          err,
        );
      }
    }

    functions.logger.info(
      `closeBidWindows complete: ${snapshot.size} processed, ` +
        `${accepted} accepted, ${extended} extended, ${errors} errors`,
    );

    return null;
  });

// ─── 3. notifyMatchingWorkers — Firestore onCreate trigger ──────────────────

/**
 * Triggered when a new marketplace listing is created.
 *
 * Finds workers matching the listing's service_type within the listing's
 * search radius (or default 50mi), then sends SMS notifications to the
 * top 10 closest workers. Also fires a listing.created webhook event.
 *
 * @function notifyMatchingWorkers
 * @type trigger (marketplace_listings onCreate)
 * @auth none
 * @firestore marketplace_listings, workers
 */
export const notifyMatchingWorkers = functions.firestore
  .document("marketplace_listings/{listingId}")
  .onCreate(async (snapshot, context) => {
    const listing = snapshot.data();
    const listingId = context.params.listingId;

    const serviceType: string = listing.service_type || "job";
    const projectZip: string = listing.zip_code || listing.project_zip || "";
    const radiusMiles: number = listing.search_radius_miles || 50;
    const budgetMin: number = listing.budget?.min || listing.budget_min || 0;
    const budgetMax: number = listing.budget?.max || listing.budget_max || 0;

    // Deliver webhook event
    await deliverWebhookEvent("listing.created", {
      listing_id: listingId,
      service_type: serviceType,
      zip_code: projectZip,
      budget_min: budgetMin,
      budget_max: budgetMax,
    });

    if (!projectZip) {
      functions.logger.warn(
        `notifyMatchingWorkers: listing ${listingId} has no zip code, skipping worker notifications`,
      );
      return;
    }

    // Find matching workers
    let matches;
    try {
      matches = await findWorkersInRange(projectZip, serviceType, radiusMiles);
    } catch (err) {
      functions.logger.error(
        `notifyMatchingWorkers: error finding workers for listing ${listingId}:`,
        err,
      );
      return;
    }

    if (!matches || matches.length === 0) {
      functions.logger.info(
        `notifyMatchingWorkers: no matching workers for listing ${listingId} ` +
          `(${serviceType}, zip ${projectZip}, ${radiusMiles}mi)`,
      );
      return;
    }

    // Take top 10 closest workers
    const topWorkers = matches.slice(0, 10);
    let notified = 0;

    for (const match of topWorkers) {
      const workerPhone = (match.worker as Record<string, any>).phone || "";

      if (!workerPhone) {
        continue;
      }

      const budgetStr =
        budgetMin > 0 && budgetMax > 0
          ? `$${budgetMin}-$${budgetMax}`
          : budgetMax > 0
            ? `up to $${budgetMax}`
            : "negotiable";

      const message =
        `New ${serviceType} job posted ${match.distance}mi from you! ` +
        `Budget: ${budgetStr}. Reply to view.`;

      try {
        await sendSMS(workerPhone, message);
        notified++;
      } catch (err) {
        functions.logger.error(
          `Failed to SMS worker ${match.workerId} for listing ${listingId}:`,
          err,
        );
      }
    }

    functions.logger.info(
      `notifyMatchingWorkers: listing ${listingId} — ` +
        `${matches.length} matches found, ${notified} notified (top 10)`,
    );
  });

// ─── 4. notifyBidResult — Firestore onUpdate trigger ────────────────────────

/**
 * Triggered when a marketplace bid document is updated.
 *
 * If the bid status changed to "accepted": sends a congratulatory SMS
 * to the winning bidder and fires a bid.accepted webhook event.
 *
 * If the bid status changed to "rejected": sends a consolation SMS
 * to the bidder and fires a bid.rejected webhook event.
 *
 * @function notifyBidResult
 * @type trigger (marketplace_bids onUpdate)
 * @auth none
 * @firestore marketplace_bids, workers
 */
export const notifyBidResult = functions.firestore
  .document("marketplace_bids/{bidId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const bidId = context.params.bidId;

    // Only act on status changes
    if (before.status === after.status) {
      return;
    }

    const workerId: string = after.bidder?.userId || after.worker_id || "";
    const listingId: string = after.listing_id || "";

    // Look up worker phone
    let workerPhone = "";
    if (workerId) {
      const workerSnap = await db.collection("workers").doc(workerId).get();
      if (workerSnap.exists) {
        workerPhone = workerSnap.data()?.phone || "";
      }
    }

    if (after.status === "accepted") {
      // Look up listing details for a richer notification
      let serviceType = "";
      let projectZip = "";
      let deadlineStr = "";

      if (listingId) {
        const listingSnap = await db
          .collection("marketplace_listings")
          .doc(listingId)
          .get();

        if (listingSnap.exists) {
          const listingData = listingSnap.data()!;
          serviceType = listingData.service_type || "";
          projectZip = listingData.zip_code || listingData.project_zip || "";

          if (listingData.deadline) {
            const deadlineDate = (
              listingData.deadline as admin.firestore.Timestamp
            ).toDate();
            deadlineStr = deadlineDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
          }
        }
      }

      // Notify winner with job details
      if (workerPhone) {
        const taskLabel = serviceType
          ? serviceType.replace(/_/g, " ")
          : "marketplace job";

        const locationPart = projectZip ? ` Location: ${projectZip}.` : "";

        const deadlinePart = deadlineStr ? ` Deadline: ${deadlineStr}.` : "";

        const pricePart =
          typeof after.price === "number"
            ? ` Bid: $${after.price.toLocaleString()}.`
            : "";

        await sendSMS(
          workerPhone,
          `Congrats! Your bid for ${taskLabel} was accepted.${pricePart}${locationPart}${deadlinePart} ` +
            `Log in to your dashboard to view full details and get started.`,
        );
      }

      await deliverWebhookEvent("bid.accepted", {
        bid_id: bidId,
        listing_id: listingId,
        worker_id: workerId,
        price: after.price,
      });

      functions.logger.info(
        `notifyBidResult: bid ${bidId} accepted, worker ${workerId} notified`,
      );
    } else if (after.status === "rejected") {
      // Notify rejected bidder with encouragement
      if (workerPhone) {
        // Look up service type for context
        let serviceType = "";
        if (listingId) {
          const listingSnap = await db
            .collection("marketplace_listings")
            .doc(listingId)
            .get();

          if (listingSnap.exists) {
            serviceType = listingSnap.data()?.service_type || "";
          }
        }

        const taskLabel = serviceType
          ? serviceType.replace(/_/g, " ")
          : "marketplace";

        await sendSMS(
          workerPhone,
          `Your ${taskLabel} bid was not selected this time. ` +
            `Don't be discouraged — new jobs are posted daily. ` +
            `Check your dashboard for open listings that match your skills.`,
        );
      }

      await deliverWebhookEvent("bid.rejected", {
        bid_id: bidId,
        listing_id: listingId,
        worker_id: workerId,
      });

      functions.logger.info(
        `notifyBidResult: bid ${bidId} rejected, worker ${workerId} notified`,
      );
    }
  });

// ─── 5. notifyTaskReady — Firestore onUpdate trigger ──────────────────────────

/**
 * Triggered when a pipeline task document is updated.
 *
 * When a task's dependency_status changes to "ready" (dependencies met),
 * finds workers whose skills match the task's service type and are within
 * range, then sends SMS notifications alerting them that a new task is
 * available for bidding on the marketplace.
 *
 * @function notifyTaskReady
 * @type trigger (projects/{projectId}/pipeline_tasks/{taskId} onUpdate)
 * @auth none
 * @firestore pipeline_tasks, marketplace_listings, workers
 */
export const notifyTaskReady = functions.firestore
  .document("projects/{projectId}/pipeline_tasks/{taskId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const projectId = context.params.projectId;
    const taskId = context.params.taskId;

    // Only act when dependency_status transitions to "ready"
    if (
      before.dependency_status === after.dependency_status ||
      after.dependency_status !== "ready"
    ) {
      return;
    }

    const taskType: string = after.type || taskId;

    // Map pipeline task types to marketplace service types (same mapping
    // as pipelineAutoTasks.ts createMarketplaceListingForTask)
    const serviceTypeMap: Record<string, string> = {
      site_survey: "site_survey",
      cad_design: "cad_design",
      engineering_stamp: "engineering_stamp",
      permit_preparation: "permit_submission",
      permit_submission: "permit_submission",
      roof_installation: "roofing",
      electrical_installation: "electrical",
      battery_installation: "battery_install",
      inspection_coordination: "inspection",
      pto_submission: "other",
    };

    const serviceType = serviceTypeMap[taskType] || taskType;

    // Get project data for location info
    const projectSnap = await db.collection("projects").doc(projectId).get();
    if (!projectSnap.exists) {
      functions.logger.warn(
        `notifyTaskReady: project ${projectId} not found, skipping notifications`,
      );
      return;
    }

    const projectData = projectSnap.data()!;
    const projectZip: string =
      projectData.zip_code ||
      projectData.project_zip ||
      projectData.address?.zip ||
      "";

    if (!projectZip) {
      functions.logger.warn(
        `notifyTaskReady: project ${projectId} has no zip code, skipping worker notifications`,
      );
      return;
    }

    // Find matching workers within range
    const radiusMiles = 50;
    let matches;

    try {
      matches = await findWorkersInRange(projectZip, serviceType, radiusMiles);
    } catch (err) {
      functions.logger.error(
        `notifyTaskReady: error finding workers for task ${taskId} ` +
          `on project ${projectId}:`,
        err,
      );
      return;
    }

    if (!matches || matches.length === 0) {
      functions.logger.info(
        `notifyTaskReady: no matching workers for task ${taskType} ` +
          `(${serviceType}, zip ${projectZip}, ${radiusMiles}mi)`,
      );
      return;
    }

    // Format the task name for the SMS
    const taskLabel = taskType
      .split("_")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Notify top 10 closest workers
    const topWorkers = matches.slice(0, 10);
    let notified = 0;

    for (const match of topWorkers) {
      const workerPhone = (match.worker as Record<string, any>).phone || "";

      if (!workerPhone) {
        continue;
      }

      const message =
        `New task available: ${taskLabel} (${serviceType.replace(/_/g, " ")}) ` +
        `${match.distance}mi from you. ` +
        `Dependencies are met — ready for bidding now. Log in to place your bid.`;

      try {
        await sendSMS(workerPhone, message);
        notified++;
      } catch (err) {
        functions.logger.error(
          `Failed to SMS worker ${match.workerId} for task ${taskId} ` +
            `on project ${projectId}:`,
          err,
        );
      }
    }

    // Fire webhook event
    await deliverWebhookEvent("task.ready", {
      project_id: projectId,
      task_id: taskId,
      task_type: taskType,
      service_type: serviceType,
      workers_notified: notified,
    });

    functions.logger.info(
      `notifyTaskReady: task ${taskType} on project ${projectId} — ` +
        `${matches.length} matches found, ${notified} notified (top 10)`,
    );
  });
