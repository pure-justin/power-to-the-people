/**
 * AHJ (Authority Having Jurisdiction) Database & Permit Knowledge Base
 *
 * Cloud Functions for managing the nationwide AHJ registry and permit SOPs.
 * This is the knowledge base that permit bots use to automate permit submissions.
 *
 * Collections:
 *   - ahj_registry: AHJ records with jurisdiction info, portal details, requirements, fees
 *   - permit_sops: Step-by-step permit submission procedures per AHJ
 *
 * All admin functions require the caller to have role "admin" in the users collection.
 * All authenticated functions require Firebase Auth.
 *
 * @module ahjDatabase
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Verify the calling user has admin role in the users collection.
 * Throws HttpsError("permission-denied") if not admin.
 *
 * @param uid - Firebase Auth UID of the caller
 */
async function requireAdmin(uid: string): Promise<void> {
  const userDoc = await admin.firestore().collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "This action requires admin privileges.",
    );
  }
}

// ─── createAhj ──────────────────────────────────────────────────────────────────

/**
 * Create or update an AHJ record in the ahj_registry collection.
 *
 * If an `id` field is provided in the data, it will update that document.
 * Otherwise a new document is created with an auto-generated ID.
 *
 * @function createAhj
 * @type onCall
 * @auth admin
 * @input AHJ record fields (name, state, county, city, zip_codes, contact, portal, requirements, fees, turnaround, etc.)
 * @output {{ success: boolean, ahjId: string }}
 * @errors unauthenticated, permission-denied, invalid-argument, internal
 * @firestore ahj_registry
 */
export const createAhj = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data: any, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated.",
      );
    }

    await requireAdmin(context.auth.uid);

    if (!data.name || !data.state) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "AHJ record requires at least 'name' and 'state' fields.",
      );
    }

    const db = admin.firestore();

    try {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const ahjData = {
        name: data.name,
        jurisdiction_type: data.jurisdiction_type || "city",
        state: data.state,
        county: data.county || "",
        city: data.city || "",
        zip_codes: data.zip_codes || [],
        contact: data.contact || {},
        portal: data.portal || {},
        requirements: data.requirements || {},
        fees: data.fees || {},
        turnaround: data.turnaround || {},
        solarapp_participant: data.solarapp_participant || false,
        notes: data.notes || "",
        last_verified: data.last_verified || null,
        verified_by: data.verified_by || "",
        data_source: data.data_source || "manual",
        updated_at: now,
      };

      let ahjId: string;

      if (data.id) {
        // Update existing
        ahjId = data.id;
        await db
          .collection("ahj_registry")
          .doc(ahjId)
          .set({ ...ahjData }, { merge: true });
      } else {
        // Create new
        const docRef = db.collection("ahj_registry").doc();
        ahjId = docRef.id;
        await docRef.set({
          ...ahjData,
          created_at: now,
        });
      }

      return { success: true, ahjId };
    } catch (error: any) {
      console.error("createAhj error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to create/update AHJ record.",
      );
    }
  });

// ─── getAhj ─────────────────────────────────────────────────────────────────────

/**
 * Get a single AHJ record by its document ID.
 *
 * @function getAhj
 * @type onCall
 * @auth firebase
 * @input {{ ahjId: string }}
 * @output AHJ record data with id field
 * @errors unauthenticated, invalid-argument, not-found, internal
 * @firestore ahj_registry
 */
export const getAhj = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data: { ahjId: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated.",
      );
    }

    if (!data.ahjId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "ahjId is required.",
      );
    }

    try {
      const doc = await admin
        .firestore()
        .collection("ahj_registry")
        .doc(data.ahjId)
        .get();

      if (!doc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          `AHJ with ID "${data.ahjId}" not found.`,
        );
      }

      return { id: doc.id, ...doc.data() };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error("getAhj error:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to retrieve AHJ record.",
      );
    }
  });

// ─── searchAhj ──────────────────────────────────────────────────────────────────

/**
 * Search AHJ records by state, county, city, or ZIP code array.
 * Supports partial text match on name field (case-insensitive prefix match).
 *
 * Firestore does not support native full-text search, so name matching
 * uses a lowercase `name_lower` field with >= / < range queries for
 * prefix matching. This covers "City of Aus" -> "City of Austin" style lookups.
 *
 * @function searchAhj
 * @type onCall
 * @auth firebase
 * @input {{ state?: string, county?: string, city?: string, zip_code?: string, name?: string, limit?: number }}
 * @output {{ results: AHJ[], count: number }}
 * @errors unauthenticated, invalid-argument, internal
 * @firestore ahj_registry
 */
export const searchAhj = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(
    async (
      data: {
        state?: string;
        county?: string;
        city?: string;
        zip_code?: string;
        name?: string;
        limit?: number;
      },
      context,
    ) => {
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Must be authenticated.",
        );
      }

      if (
        !data.state &&
        !data.county &&
        !data.city &&
        !data.zip_code &&
        !data.name
      ) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "At least one search filter is required (state, county, city, zip_code, or name).",
        );
      }

      const db = admin.firestore();
      const maxResults = Math.min(data.limit || 50, 200);

      try {
        // ZIP code search is handled separately because it uses array-contains
        // and Firestore only allows one array-contains per query
        if (data.zip_code) {
          // Search by ZIP code — find the AHJ whose zip_codes array contains this ZIP
          let query: admin.firestore.Query = db
            .collection("ahj_registry")
            .where("zip_codes", "array-contains", data.zip_code);

          if (data.state) {
            query = query.where("state", "==", data.state.toUpperCase());
          }

          const snapshot = await query.limit(maxResults).get();
          const results = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          return { results, count: results.length };
        }

        // Non-ZIP search: filter by state, county, city with optional name prefix match
        let query: admin.firestore.Query = db.collection("ahj_registry");

        if (data.state) {
          query = query.where("state", "==", data.state.toUpperCase());
        }
        if (data.county) {
          query = query.where("county", "==", data.county);
        }
        if (data.city) {
          query = query.where("city", "==", data.city);
        }

        const snapshot = await query.limit(maxResults).get();
        let results = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Client-side name filtering (Firestore doesn't support case-insensitive contains)
        // For a production system with thousands of AHJs, consider Algolia or Typesense
        if (data.name) {
          const searchTerm = data.name.toLowerCase();
          results = results.filter((r: any) =>
            (r.name || "").toLowerCase().includes(searchTerm),
          );
        }

        return { results, count: results.length };
      } catch (error: any) {
        console.error("searchAhj error:", error);
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to search AHJ records.",
        );
      }
    },
  );

// ─── findAhjForAddress ──────────────────────────────────────────────────────────

/**
 * Find the governing AHJ for a given address by ZIP code lookup.
 *
 * THIS IS THE CRITICAL PATH FUNCTION for permit automation.
 *
 * How it works:
 * 1. Extract the ZIP code from the provided address string.
 *    - Tries regex patterns: 5-digit ZIP, 9-digit ZIP+4, and state+ZIP combos.
 *    - If no ZIP found, returns an error asking for a valid address.
 *
 * 2. Query ahj_registry where zip_codes array-contains the extracted ZIP.
 *    - Each AHJ record has a zip_codes[] array listing all ZIP codes it covers.
 *    - In most cases this returns exactly one AHJ (one jurisdiction per ZIP).
 *    - Some ZIPs span multiple jurisdictions (e.g., unincorporated county + city).
 *
 * 3. If multiple AHJs match:
 *    - Prefer city-level AHJ over county-level (city permitting supersedes county).
 *    - If still ambiguous, return all matches and let the caller decide.
 *
 * 4. If no AHJ matches:
 *    - Return a helpful message indicating the ZIP is not yet in our database.
 *    - Include the ZIP code so the caller can request data enrichment.
 *
 * Why ZIP-based lookup?
 *   - ZIP codes are the most reliable address component for AHJ mapping.
 *   - Street addresses can be ambiguous at jurisdictional boundaries.
 *   - ZIP codes map cleanly to Census tracts and municipal boundaries.
 *   - The USPS ZIP-to-jurisdiction mapping is well-established.
 *
 * Future improvements:
 *   - Geocode the address and use point-in-polygon against municipal boundaries.
 *   - Fall back to county-level AHJ when city-level is not found.
 *   - Use Google Maps Geocoding API to extract structured address components.
 *
 * @function findAhjForAddress
 * @type onCall
 * @auth firebase
 * @input {{ address: string }}
 * @output {{ found: boolean, ahj?: AHJ, candidates?: AHJ[], zip_code: string }}
 * @errors unauthenticated, invalid-argument, internal
 * @firestore ahj_registry
 */
export const findAhjForAddress = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data: { address: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated.",
      );
    }

    if (!data.address || data.address.trim().length < 5) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "A valid address string is required (must include ZIP code).",
      );
    }

    try {
      // Step 1: Extract ZIP code from the address string
      // Match 5-digit ZIP codes, optionally followed by -XXXX (ZIP+4)
      // Also handles formats like "TX 78701" or "Austin, TX 78701-1234"
      const zipMatch = data.address.match(/\b(\d{5})(?:-\d{4})?\b/);

      if (!zipMatch) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Could not extract a ZIP code from the provided address. " +
            "Please include a 5-digit ZIP code (e.g., '123 Main St, Austin, TX 78701').",
        );
      }

      const zipCode = zipMatch[1]; // The 5-digit ZIP

      // Step 2: Query ahj_registry for AHJs covering this ZIP code
      const db = admin.firestore();
      const snapshot = await db
        .collection("ahj_registry")
        .where("zip_codes", "array-contains", zipCode)
        .get();

      if (snapshot.empty) {
        // No AHJ found for this ZIP — it's not yet in our database
        return {
          found: false,
          ahj: null,
          candidates: [],
          zip_code: zipCode,
          message:
            `No AHJ found for ZIP code ${zipCode}. ` +
            "This jurisdiction may not yet be in our database. " +
            "Request data enrichment to add coverage for this area.",
        };
      }

      const matches = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Step 3: If exactly one match, return it directly
      if (matches.length === 1) {
        return {
          found: true,
          ahj: matches[0],
          candidates: [],
          zip_code: zipCode,
        };
      }

      // Step 4: Multiple AHJs cover this ZIP — rank by jurisdiction type
      // City-level permitting takes precedence over county-level in most states.
      // This is because incorporated cities typically handle their own building permits,
      // while the county only covers unincorporated areas.
      const cityLevel = matches.filter(
        (m: any) => m.jurisdiction_type === "city",
      );
      const countyLevel = matches.filter(
        (m: any) => m.jurisdiction_type === "county",
      );

      if (cityLevel.length === 1) {
        // One city-level AHJ — this is almost certainly the right one
        return {
          found: true,
          ahj: cityLevel[0],
          candidates: countyLevel, // Include county as alternative
          zip_code: zipCode,
          message:
            "Matched city-level AHJ. County-level AHJ also covers this ZIP " +
            "(applies to unincorporated areas only).",
        };
      }

      // Ambiguous: multiple city-level or only county-level AHJs
      // Return the first match as primary, rest as candidates
      return {
        found: true,
        ahj: matches[0],
        candidates: matches.slice(1),
        zip_code: zipCode,
        message:
          `Multiple AHJs (${matches.length}) cover ZIP ${zipCode}. ` +
          "Primary match returned; review candidates if the address is near a jurisdictional boundary.",
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error("findAhjForAddress error:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to find AHJ for address.",
      );
    }
  });

// ─── updateAhjRequirements ──────────────────────────────────────────────────────

/**
 * Update the permit requirements for an existing AHJ record.
 *
 * Requirements describe what documents/approvals are needed for a solar permit:
 * structural engineering, electrical diagrams, site plans, etc.
 *
 * @function updateAhjRequirements
 * @type onCall
 * @auth admin
 * @input {{ ahjId: string, requirements: object }}
 * @output {{ success: boolean, ahjId: string }}
 * @errors unauthenticated, permission-denied, invalid-argument, not-found, internal
 * @firestore ahj_registry
 */
export const updateAhjRequirements = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data: { ahjId: string; requirements: any }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated.",
      );
    }

    await requireAdmin(context.auth.uid);

    if (!data.ahjId || !data.requirements) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "ahjId and requirements are required.",
      );
    }

    const db = admin.firestore();
    const docRef = db.collection("ahj_registry").doc(data.ahjId);

    try {
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          `AHJ with ID "${data.ahjId}" not found.`,
        );
      }

      await docRef.update({
        requirements: data.requirements,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, ahjId: data.ahjId };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error("updateAhjRequirements error:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to update AHJ requirements.",
      );
    }
  });

// ─── createPermitSop ────────────────────────────────────────────────────────────

/**
 * Create or update SOP (Standard Operating Procedure) steps for an AHJ's permit process.
 *
 * Each step describes one action in the permit submission workflow:
 * what to do, how to automate it (puppeteer, API, email, manual),
 * field mappings, wait conditions, and common errors.
 *
 * Steps are stored in the permit_sops collection with the ahjId as a foreign key.
 * Existing steps for the AHJ are replaced entirely (delete + recreate).
 *
 * @function createPermitSop
 * @type onCall
 * @auth admin
 * @input {{ ahjId: string, steps: Array<{ step_number, action, details, automation?, screenshots?, common_errors? }> }}
 * @output {{ success: boolean, ahjId: string, stepCount: number }}
 * @errors unauthenticated, permission-denied, invalid-argument, not-found, internal
 * @firestore permit_sops, ahj_registry
 */
export const createPermitSop = functions
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .https.onCall(async (data: { ahjId: string; steps: any[] }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated.",
      );
    }

    await requireAdmin(context.auth.uid);

    if (!data.ahjId || !Array.isArray(data.steps) || data.steps.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "ahjId and a non-empty steps array are required.",
      );
    }

    const db = admin.firestore();

    try {
      // Verify the AHJ exists
      const ahjDoc = await db.collection("ahj_registry").doc(data.ahjId).get();
      if (!ahjDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          `AHJ with ID "${data.ahjId}" not found.`,
        );
      }

      // Delete existing SOP steps for this AHJ (replace strategy)
      const existingSteps = await db
        .collection("permit_sops")
        .where("ahjId", "==", data.ahjId)
        .get();

      const batch = db.batch();

      // Remove old steps
      existingSteps.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      const now = admin.firestore.FieldValue.serverTimestamp();

      // Create new steps
      for (const step of data.steps) {
        const stepRef = db.collection("permit_sops").doc();
        batch.set(stepRef, {
          ahjId: data.ahjId,
          step_number: step.step_number,
          action: step.action || "",
          details: step.details || "",
          automation: step.automation || {
            script_type: "manual",
            script_path: "",
            selector: "",
            field_mapping: {},
            wait_conditions: [],
          },
          screenshots: step.screenshots || [],
          common_errors: step.common_errors || [],
          last_successful_run: null,
          success_rate: 0,
          created_at: now,
          updated_at: now,
        });
      }

      await batch.commit();

      return {
        success: true,
        ahjId: data.ahjId,
        stepCount: data.steps.length,
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error("createPermitSop error:", error);
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to create permit SOP.",
      );
    }
  });

// ─── getPermitSop ───────────────────────────────────────────────────────────────

/**
 * Get all SOP steps for an AHJ, ordered by step_number ascending.
 *
 * Returns the full step-by-step procedure a permit bot would follow
 * to submit a solar permit application for this jurisdiction.
 *
 * @function getPermitSop
 * @type onCall
 * @auth firebase
 * @input {{ ahjId: string }}
 * @output {{ ahjId: string, steps: Array, stepCount: number }}
 * @errors unauthenticated, invalid-argument, internal
 * @firestore permit_sops
 */
export const getPermitSop = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(async (data: { ahjId: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated.",
      );
    }

    if (!data.ahjId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "ahjId is required.",
      );
    }

    try {
      const snapshot = await admin
        .firestore()
        .collection("permit_sops")
        .where("ahjId", "==", data.ahjId)
        .orderBy("step_number", "asc")
        .get();

      const steps = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        ahjId: data.ahjId,
        steps,
        stepCount: steps.length,
      };
    } catch (error: any) {
      console.error("getPermitSop error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to retrieve permit SOP.",
      );
    }
  });

// ─── verifyAhj ──────────────────────────────────────────────────────────────────

/**
 * Mark an AHJ record as verified with the current timestamp and verifier identity.
 *
 * Verification means a human has confirmed that the AHJ data (requirements,
 * portal URLs, fees, turnaround times) is accurate and up-to-date.
 *
 * @function verifyAhj
 * @type onCall
 * @auth admin
 * @input {{ ahjId: string, verifiedBy: string }}
 * @output {{ success: boolean, ahjId: string, verified_at: string }}
 * @errors unauthenticated, permission-denied, invalid-argument, not-found, internal
 * @firestore ahj_registry
 */
export const verifyAhj = functions
  .runWith({ timeoutSeconds: 15, memory: "256MB" })
  .https.onCall(
    async (data: { ahjId: string; verifiedBy: string }, context) => {
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Must be authenticated.",
        );
      }

      await requireAdmin(context.auth.uid);

      if (!data.ahjId || !data.verifiedBy) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "ahjId and verifiedBy are required.",
        );
      }

      const db = admin.firestore();
      const docRef = db.collection("ahj_registry").doc(data.ahjId);

      try {
        const doc = await docRef.get();
        if (!doc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            `AHJ with ID "${data.ahjId}" not found.`,
          );
        }

        const now = admin.firestore.FieldValue.serverTimestamp();

        await docRef.update({
          last_verified: now,
          verified_by: data.verifiedBy,
          updated_at: now,
        });

        return {
          success: true,
          ahjId: data.ahjId,
          verified_at: new Date().toISOString(),
        };
      } catch (error: any) {
        if (error instanceof functions.https.HttpsError) throw error;
        console.error("verifyAhj error:", error);
        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to verify AHJ.",
        );
      }
    },
  );

// ─── getAhjStats ────────────────────────────────────────────────────────────────

/**
 * Dashboard statistics for the AHJ database.
 *
 * Returns:
 *   - total: Total number of AHJ records
 *   - verified: Number of verified AHJs (last_verified is not null)
 *   - verified_pct: Percentage verified
 *   - automatable: Number of AHJs with automatable portals
 *   - automatable_pct: Percentage automatable
 *   - solarapp_participants: Number using SolarAPP+ for instant permits
 *   - by_state: Record<state, count> for coverage heatmap
 *
 * @function getAhjStats
 * @type onCall
 * @auth admin
 * @input {{}}
 * @output AHJ dashboard statistics object
 * @errors unauthenticated, permission-denied, internal
 * @firestore ahj_registry
 */
export const getAhjStats = functions
  .runWith({ timeoutSeconds: 30, memory: "512MB" })
  .https.onCall(async (_data: any, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated.",
      );
    }

    await requireAdmin(context.auth.uid);

    try {
      const snapshot = await admin.firestore().collection("ahj_registry").get();

      const total = snapshot.size;
      let verified = 0;
      let automatable = 0;
      let solarappParticipants = 0;
      const byState: Record<string, number> = {};

      snapshot.docs.forEach((doc) => {
        const data = doc.data();

        // Count verified AHJs
        if (data.last_verified) {
          verified++;
        }

        // Count automatable portals
        if (data.portal?.automatable === true) {
          automatable++;
        }

        // Count SolarAPP+ participants
        if (data.solarapp_participant === true) {
          solarappParticipants++;
        }

        // Count by state
        const state = data.state || "UNKNOWN";
        byState[state] = (byState[state] || 0) + 1;
      });

      return {
        total,
        verified,
        verified_pct: total > 0 ? Math.round((verified / total) * 100) : 0,
        automatable,
        automatable_pct:
          total > 0 ? Math.round((automatable / total) * 100) : 0,
        solarapp_participants: solarappParticipants,
        by_state: byState,
      };
    } catch (error: any) {
      console.error("getAhjStats error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to compute AHJ statistics.",
      );
    }
  });
