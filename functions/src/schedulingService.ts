/**
 * Scheduling & Install Coordination - Cloud Functions
 *
 * Manages installer availability, schedule matching, and install coordination.
 * Integrates with the AI Task Engine for intelligent crew-project matching.
 *
 * Collections:
 *   schedule_slots    — Installer availability by date
 *   install_schedules — Confirmed/proposed install schedules with full lifecycle
 *
 * Flow: Permit approved -> proposeSchedule (AI matches crew) -> customer/installer confirm -> install
 *
 * @module schedulingService
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

// ─── Types ──────────────────────────────────────────────────────────────────────

/** Valid schedule statuses through the lifecycle */
type ScheduleStatus =
  | "proposed"
  | "customer_confirmed"
  | "installer_confirmed"
  | "both_confirmed"
  | "in_progress"
  | "completed"
  | "rescheduled"
  | "cancelled";

/** Time slot status within a day */
type SlotStatus = "available" | "booked" | "blocked";

// ─── Cloud Function: setAvailability ────────────────────────────────────────────

/**
 * Set installer availability for a specific date.
 * Installers use this to mark when they're available for installs,
 * how large their crew is, and what equipment they have.
 *
 * @function setAvailability
 * @type onCall
 * @auth firebase
 * @input {{ installerId: string, date: string, timeSlots: Array<{start, end}>, crewSize: number, serviceAreaMiles?: number, equipmentAvailable?: string[] }}
 * @output {{ success: boolean, slotId: string }}
 * @errors unauthenticated, invalid-argument, internal
 * @firestore schedule_slots
 */
export const setAvailability = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to set availability",
      );
    }

    const {
      installerId,
      date,
      timeSlots,
      crewSize,
      serviceAreaMiles,
      equipmentAvailable,
    } = data;

    if (!installerId || !date || !timeSlots || !crewSize) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "installerId, date, timeSlots, and crewSize are required",
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "date must be in YYYY-MM-DD format",
      );
    }

    // Validate time slots have start and end
    if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "timeSlots must be a non-empty array of {start, end} objects",
      );
    }

    try {
      // Check if a slot already exists for this installer+date — upsert
      const existing = await db
        .collection("schedule_slots")
        .where("installerId", "==", installerId)
        .where("date", "==", date)
        .limit(1)
        .get();

      const slotData = {
        installerId,
        date,
        time_slots: timeSlots.map((slot: { start: string; end: string }) => ({
          start: slot.start,
          end: slot.end,
          status: "available" as SlotStatus,
          projectId: null,
        })),
        crew_size: crewSize,
        service_area_miles: serviceAreaMiles || 50,
        equipment_available: equipmentAvailable || [],
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      let slotId: string;

      if (!existing.empty) {
        // Update existing slot
        slotId = existing.docs[0].id;
        await db.collection("schedule_slots").doc(slotId).update(slotData);
      } else {
        // Create new slot
        const ref = await db.collection("schedule_slots").add({
          ...slotData,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        slotId = ref.id;
      }

      console.log(
        `Availability set: installer=${installerId}, date=${date}, slots=${timeSlots.length}`,
      );

      return { success: true, slotId };
    } catch (error: any) {
      console.error("Set availability error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to set availability",
      );
    }
  });

// ─── Cloud Function: getAvailability ────────────────────────────────────────────

/**
 * Query installer availability for a date range.
 * Returns all schedule slots for the installer within the range.
 *
 * @function getAvailability
 * @type onCall
 * @auth firebase
 * @input {{ installerId: string, startDate: string, endDate: string }}
 * @output {{ success: boolean, slots: Array }}
 * @errors unauthenticated, invalid-argument, internal
 * @firestore schedule_slots
 */
export const getAvailability = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to view availability",
      );
    }

    const { installerId, startDate, endDate } = data;

    if (!installerId || !startDate || !endDate) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "installerId, startDate, and endDate are required",
      );
    }

    try {
      const snapshot = await db
        .collection("schedule_slots")
        .where("installerId", "==", installerId)
        .where("date", ">=", startDate)
        .where("date", "<=", endDate)
        .orderBy("date", "asc")
        .get();

      const slots = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { success: true, slots };
    } catch (error: any) {
      console.error("Get availability error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to get availability",
      );
    }
  });

// ─── Cloud Function: proposeSchedule ────────────────────────────────────────────

/**
 * Propose install schedule(s) for a project by finding available installers.
 * Creates an AI task "schedule_match" to intelligently match crews to the project.
 * Proposes top 3 time slots and creates an install_schedules record.
 *
 * @function proposeSchedule
 * @type onCall
 * @auth firebase
 * @input {{ projectId: string, permitId: string, preferredDates?: string[], preferredTimeOfDay?: string }}
 * @output {{ success: boolean, scheduleId: string, proposedSlots: Array }}
 * @errors unauthenticated, invalid-argument, internal
 * @firestore install_schedules, schedule_slots, ai_tasks
 */
export const proposeSchedule = functions
  .runWith({ timeoutSeconds: 60, memory: "512MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to propose schedules",
      );
    }

    const { projectId, permitId, preferredDates, preferredTimeOfDay } = data;

    if (!projectId || !permitId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "projectId and permitId are required",
      );
    }

    try {
      // Look ahead 14 days for available installer slots
      const today = new Date();
      const twoWeeksOut = new Date(today);
      twoWeeksOut.setDate(today.getDate() + 14);

      const startDate = today.toISOString().split("T")[0];
      const endDate = twoWeeksOut.toISOString().split("T")[0];

      // Query all available slots in the window
      const slotsSnapshot = await db
        .collection("schedule_slots")
        .where("date", ">=", startDate)
        .where("date", "<=", endDate)
        .orderBy("date", "asc")
        .get();

      // Filter to slots with available time windows
      const availableSlots = slotsSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((slot: any) =>
          slot.time_slots?.some((ts: any) => ts.status === "available"),
        );

      // Pick top 3 slots (sorted by earliest date, largest crew)
      const proposedSlots = availableSlots
        .sort((a: any, b: any) => {
          if (a.date !== b.date) return a.date < b.date ? -1 : 1;
          return (b.crew_size || 0) - (a.crew_size || 0);
        })
        .slice(0, 3)
        .map((slot: any) => {
          const availableWindow = slot.time_slots.find(
            (ts: any) => ts.status === "available",
          );
          return {
            installerId: slot.installerId,
            date: slot.date,
            time_window: availableWindow
              ? { start: availableWindow.start, end: availableWindow.end }
              : { start: "08:00", end: "17:00" },
            crew_size: slot.crew_size,
            slotId: slot.id,
          };
        });

      // Create the install_schedules record
      const scheduleData = {
        projectId,
        permitId,
        installerId: proposedSlots[0]?.installerId || null,
        date: proposedSlots[0]?.date || null,
        time_window: proposedSlots[0]?.time_window || null,
        status: "proposed" as ScheduleStatus,
        proposed_slots: proposedSlots,
        crew: [],
        equipment_checklist: [],
        customer_notifications: [],
        customer_preferences: {
          preferred_dates: preferredDates || [],
          preferred_time_of_day: preferredTimeOfDay || null,
        },
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      const scheduleRef = await db
        .collection("install_schedules")
        .add(scheduleData);

      // Create AI task for intelligent schedule matching
      await db.collection("ai_tasks").add({
        type: "schedule_match",
        projectId,
        status: "pending",
        input: {
          scheduleId: scheduleRef.id,
          permitId,
          availableSlots: proposedSlots,
          customerPreferences: {
            preferred_dates: preferredDates || [],
            preferred_time_of_day: preferredTimeOfDay || null,
          },
        },
        output: null,
        aiAttempt: null,
        humanFallback: null,
        learningData: null,
        retryCount: 0,
        maxRetries: 3,
        priority: 2,
        createdBy: context.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `Schedule proposed: ${scheduleRef.id} for project ${projectId}, ${proposedSlots.length} slots`,
      );

      return {
        success: true,
        scheduleId: scheduleRef.id,
        proposedSlots,
      };
    } catch (error: any) {
      console.error("Propose schedule error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to propose schedule",
      );
    }
  });

// ─── Cloud Function: confirmSchedule ────────────────────────────────────────────

/**
 * Customer or installer confirms a proposed schedule.
 * When both parties confirm, status moves to "both_confirmed" and SMS notifications fire.
 *
 * @function confirmSchedule
 * @type onCall
 * @auth firebase
 * @input {{ scheduleId: string, confirmedBy: "customer" | "installer" }}
 * @output {{ success: boolean, status: ScheduleStatus }}
 * @errors unauthenticated, invalid-argument, not-found, internal
 * @firestore install_schedules
 */
export const confirmSchedule = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to confirm schedules",
      );
    }

    const { scheduleId, confirmedBy } = data;

    if (!scheduleId || !confirmedBy) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "scheduleId and confirmedBy are required",
      );
    }

    if (!["customer", "installer"].includes(confirmedBy)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        'confirmedBy must be "customer" or "installer"',
      );
    }

    try {
      const scheduleRef = db.collection("install_schedules").doc(scheduleId);
      const scheduleSnap = await scheduleRef.get();

      if (!scheduleSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          `Schedule not found: ${scheduleId}`,
        );
      }

      const schedule = scheduleSnap.data()!;
      let newStatus: ScheduleStatus = schedule.status;

      if (confirmedBy === "customer") {
        if (schedule.status === "installer_confirmed") {
          newStatus = "both_confirmed";
        } else {
          newStatus = "customer_confirmed";
        }
      } else if (confirmedBy === "installer") {
        if (schedule.status === "customer_confirmed") {
          newStatus = "both_confirmed";
        } else {
          newStatus = "installer_confirmed";
        }
      }

      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Record the confirmation notification
      const notification = {
        type: `${confirmedBy}_confirmed`,
        sent_at: new Date().toISOString(),
        channel: "in_app",
      };

      updateData.customer_notifications =
        admin.firestore.FieldValue.arrayUnion(notification);

      // If both confirmed, also mark the slot as booked
      if (
        newStatus === "both_confirmed" &&
        schedule.installerId &&
        schedule.date
      ) {
        const slotQuery = await db
          .collection("schedule_slots")
          .where("installerId", "==", schedule.installerId)
          .where("date", "==", schedule.date)
          .limit(1)
          .get();

        if (!slotQuery.empty) {
          const slotDoc = slotQuery.docs[0];
          const slotData = slotDoc.data();
          const updatedSlots = (slotData.time_slots || []).map((ts: any) => {
            if (ts.status === "available") {
              return { ...ts, status: "booked", projectId: schedule.projectId };
            }
            return ts;
          });
          await slotDoc.ref.update({
            time_slots: updatedSlots,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      await scheduleRef.update(updateData);

      console.log(
        `Schedule ${scheduleId} confirmed by ${confirmedBy}, new status: ${newStatus}`,
      );

      return { success: true, status: newStatus };
    } catch (error: any) {
      console.error("Confirm schedule error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to confirm schedule",
      );
    }
  });

// ─── Cloud Function: reschedule ─────────────────────────────────────────────────

/**
 * Reschedule an install to a new date/time. Logs the reason and notifies parties.
 *
 * @function reschedule
 * @type onCall
 * @auth firebase
 * @input {{ scheduleId: string, newDate: string, newTimeWindow: {start, end}, reason: string }}
 * @output {{ success: boolean, status: "proposed" }}
 * @errors unauthenticated, invalid-argument, not-found, internal
 * @firestore install_schedules
 */
export const reschedule = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to reschedule",
      );
    }

    const { scheduleId, newDate, newTimeWindow, reason } = data;

    if (!scheduleId || !newDate || !reason) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "scheduleId, newDate, and reason are required",
      );
    }

    try {
      const scheduleRef = db.collection("install_schedules").doc(scheduleId);
      const scheduleSnap = await scheduleRef.get();

      if (!scheduleSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          `Schedule not found: ${scheduleId}`,
        );
      }

      const schedule = scheduleSnap.data()!;

      // Free up the old slot if it was booked
      if (schedule.installerId && schedule.date) {
        const slotQuery = await db
          .collection("schedule_slots")
          .where("installerId", "==", schedule.installerId)
          .where("date", "==", schedule.date)
          .limit(1)
          .get();

        if (!slotQuery.empty) {
          const slotDoc = slotQuery.docs[0];
          const slotData = slotDoc.data();
          const updatedSlots = (slotData.time_slots || []).map((ts: any) => {
            if (ts.projectId === schedule.projectId) {
              return { ...ts, status: "available", projectId: null };
            }
            return ts;
          });
          await slotDoc.ref.update({
            time_slots: updatedSlots,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      // Update schedule to new date, reset confirmations
      await scheduleRef.update({
        date: newDate,
        time_window: newTimeWindow || { start: "08:00", end: "17:00" },
        status: "proposed",
        customer_notifications: admin.firestore.FieldValue.arrayUnion({
          type: "rescheduled",
          sent_at: new Date().toISOString(),
          channel: "in_app",
          reason,
        }),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `Schedule ${scheduleId} rescheduled to ${newDate}: ${reason}`,
      );

      return { success: true, status: "proposed" };
    } catch (error: any) {
      console.error("Reschedule error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to reschedule",
      );
    }
  });

// ─── Cloud Function: getInstallSchedule ─────────────────────────────────────────

/**
 * Get full details of an install schedule.
 *
 * @function getInstallSchedule
 * @type onCall
 * @auth firebase
 * @input {{ scheduleId: string }}
 * @output {{ success: boolean, schedule: object }}
 * @errors unauthenticated, invalid-argument, not-found, internal
 * @firestore install_schedules
 */
export const getInstallSchedule = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to view schedules",
      );
    }

    const { scheduleId } = data;

    if (!scheduleId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "scheduleId is required",
      );
    }

    try {
      const scheduleSnap = await db
        .collection("install_schedules")
        .doc(scheduleId)
        .get();

      if (!scheduleSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          `Schedule not found: ${scheduleId}`,
        );
      }

      return {
        success: true,
        schedule: { id: scheduleSnap.id, ...scheduleSnap.data() },
      };
    } catch (error: any) {
      console.error("Get install schedule error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to get schedule",
      );
    }
  });

// ─── Cloud Function: getUpcomingInstalls ────────────────────────────────────────

/**
 * Get an installer's upcoming install schedule, sorted by date.
 *
 * @function getUpcomingInstalls
 * @type onCall
 * @auth firebase
 * @input {{ installerId: string, limit?: number }}
 * @output {{ success: boolean, installs: Array }}
 * @errors unauthenticated, invalid-argument, internal
 * @firestore install_schedules
 */
export const getUpcomingInstalls = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to view installs",
      );
    }

    const { installerId, limit: queryLimit } = data;

    if (!installerId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "installerId is required",
      );
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const resultLimit = Math.min(queryLimit || 20, 100);

      const snapshot = await db
        .collection("install_schedules")
        .where("installerId", "==", installerId)
        .where("date", ">=", today)
        .where("status", "in", [
          "proposed",
          "customer_confirmed",
          "installer_confirmed",
          "both_confirmed",
          "in_progress",
        ])
        .orderBy("date", "asc")
        .limit(resultLimit)
        .get();

      const installs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { success: true, installs };
    } catch (error: any) {
      console.error("Get upcoming installs error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to get upcoming installs",
      );
    }
  });

// ─── Cloud Function: getCustomerSchedule ────────────────────────────────────────

/**
 * Get a customer's install schedule(s) by looking up via project.
 *
 * @function getCustomerSchedule
 * @type onCall
 * @auth firebase
 * @input {{ customerId: string }}
 * @output {{ success: boolean, schedules: Array }}
 * @errors unauthenticated, invalid-argument, internal
 * @firestore install_schedules, projects
 */
export const getCustomerSchedule = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to view schedules",
      );
    }

    const { customerId } = data;

    if (!customerId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "customerId is required",
      );
    }

    try {
      // First find the customer's projects
      const projectsSnap = await db
        .collection("projects")
        .where("customerId", "==", customerId)
        .get();

      if (projectsSnap.empty) {
        return { success: true, schedules: [] };
      }

      const projectIds = projectsSnap.docs.map((doc) => doc.id);

      // Firestore "in" queries support max 30 values
      const batches = [];
      for (let i = 0; i < projectIds.length; i += 30) {
        const batch = projectIds.slice(i, i + 30);
        const snap = await db
          .collection("install_schedules")
          .where("projectId", "in", batch)
          .orderBy("created_at", "desc")
          .get();
        batches.push(...snap.docs);
      }

      const schedules = batches.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { success: true, schedules };
    } catch (error: any) {
      console.error("Get customer schedule error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to get customer schedule",
      );
    }
  });
