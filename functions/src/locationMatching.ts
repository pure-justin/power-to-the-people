/**
 * Location Matching Engine — Geo-matching for the SolarOS Marketplace
 *
 * Matches workers to projects by zip code + radius using the Haversine formula.
 * Zip code coordinates are cached in Firestore for fast repeat lookups, with a
 * formula-based fallback for first-time lookups (zip code ranges → approximate
 * lat/lng by state/region).
 *
 * Collections:
 *   zip_coordinates — Cache of zip → { lat, lng, city, state }
 *   workers         — Worker profiles with zip, services, availability
 *
 * @module locationMatching
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

// ─── Types ──────────────────────────────────────────────────────────────────────

/** Cached zip code coordinate record stored in Firestore */
interface ZipCoordinate {
  lat: number;
  lng: number;
  city: string;
  state: string;
}

/** A worker matched to a project, returned by findWorkersInRange */
interface WorkerMatch {
  workerId: string;
  workerName: string;
  distance: number;
  rating: number;
  completedJobs: number;
  reliabilityScore: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

/** Earth's mean radius in miles */
const EARTH_RADIUS_MILES = 3958.8;

/** Default search radius when none is provided */
const DEFAULT_RADIUS_MILES = 50;

/**
 * Approximate state centroids and the zip code prefix ranges that map to them.
 * Used as a fallback when a zip code is not yet cached in Firestore.
 *
 * Each entry: [prefixStart, prefixEnd, lat, lng, stateAbbr, cityLabel]
 *
 * These are coarse approximations. Real coordinates should be seeded via
 * seedZipCoordinates for production accuracy.
 */
const ZIP_PREFIX_MAP: Array<[number, number, number, number, string, string]> =
  [
    [100, 149, 40.71, -74.01, "NY", "New York Area"],
    [150, 196, 40.44, -79.99, "PA", "Pennsylvania"],
    [197, 199, 39.16, -75.52, "DE", "Delaware"],
    [200, 205, 38.91, -77.04, "DC", "Washington DC"],
    [206, 219, 38.98, -76.49, "MD", "Maryland"],
    [220, 246, 37.54, -77.44, "VA", "Virginia"],
    [247, 268, 38.35, -81.63, "WV", "West Virginia"],
    [270, 289, 35.78, -78.64, "NC", "North Carolina"],
    [290, 299, 34.0, -81.03, "SC", "South Carolina"],
    [300, 319, 33.75, -84.39, "GA", "Georgia"],
    [320, 349, 28.54, -81.38, "FL", "Florida"],
    [350, 369, 33.52, -86.81, "AL", "Alabama"],
    [370, 385, 36.17, -86.78, "TN", "Tennessee"],
    [386, 397, 32.3, -90.18, "MS", "Mississippi"],
    [400, 427, 38.25, -85.76, "KY", "Kentucky"],
    [430, 458, 39.96, -82.99, "OH", "Ohio"],
    [460, 479, 39.77, -86.16, "IN", "Indiana"],
    [480, 499, 42.33, -83.05, "MI", "Michigan"],
    [500, 528, 41.59, -93.62, "IA", "Iowa"],
    [530, 549, 43.07, -89.4, "WI", "Wisconsin"],
    [550, 567, 44.98, -93.27, "MN", "Minnesota"],
    [570, 577, 43.55, -96.73, "SD", "South Dakota"],
    [580, 588, 46.88, -96.79, "ND", "North Dakota"],
    [590, 599, 46.87, -114.0, "MT", "Montana"],
    [600, 629, 41.88, -87.63, "IL", "Illinois"],
    [630, 658, 38.63, -90.2, "MO", "Missouri"],
    [660, 679, 39.05, -94.59, "KS", "Kansas"],
    [680, 693, 41.26, -95.94, "NE", "Nebraska"],
    [700, 714, 29.95, -90.07, "LA", "Louisiana"],
    [716, 729, 34.75, -92.29, "AR", "Arkansas"],
    [730, 749, 35.47, -97.52, "OK", "Oklahoma"],
    [750, 799, 32.78, -96.8, "TX", "Texas"],
    [800, 816, 39.74, -104.99, "CO", "Colorado"],
    [820, 831, 41.14, -104.82, "WY", "Wyoming"],
    [832, 838, 43.62, -116.21, "ID", "Idaho"],
    [840, 847, 40.76, -111.89, "UT", "Utah"],
    [850, 865, 33.45, -112.07, "AZ", "Arizona"],
    [870, 884, 35.08, -106.65, "NM", "New Mexico"],
    [889, 898, 36.17, -115.14, "NV", "Nevada"],
    [900, 961, 34.05, -118.24, "CA", "California"],
    [967, 968, 21.31, -157.86, "HI", "Hawaii"],
    [970, 979, 45.52, -122.68, "OR", "Oregon"],
    [980, 994, 47.61, -122.33, "WA", "Washington"],
    [995, 999, 61.22, -149.9, "AK", "Alaska"],
    [10, 69, 40.71, -74.01, "NY", "Northeast"],
    [0, 9, 42.36, -71.06, "MA", "New England"],
  ];

// ─── Internal Helpers ───────────────────────────────────────────────────────────

/**
 * Converts degrees to radians.
 *
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Approximates coordinates for a zip code using prefix-range mapping.
 * This is a coarse fallback — for production accuracy, seed real data
 * via seedZipCoordinates.
 *
 * @param zip - 5-digit US zip code string
 * @returns Approximate ZipCoordinate or null if no range matches
 */
function approximateZipCoordinates(zip: string): ZipCoordinate | null {
  const prefix = parseInt(zip.substring(0, 3), 10);
  if (isNaN(prefix)) return null;

  for (const [start, end, lat, lng, state, city] of ZIP_PREFIX_MAP) {
    if (prefix >= start && prefix <= end) {
      // Add slight offset based on full zip to spread points within a region
      const fullNum = parseInt(zip, 10);
      const offsetLat = ((fullNum % 100) - 50) * 0.005;
      const offsetLng = ((fullNum % 97) - 48) * 0.006;

      return {
        lat: lat + offsetLat,
        lng: lng + offsetLng,
        city,
        state,
      };
    }
  }

  return null;
}

// ─── Exported Functions ─────────────────────────────────────────────────────────

/**
 * Look up coordinates for a US zip code.
 *
 * First checks the `zip_coordinates` Firestore cache. On cache miss, computes
 * approximate coordinates from zip prefix ranges and stores them for future use.
 *
 * @function getZipCoordinates
 * @param zip - 5-digit US zip code
 * @returns Coordinates with city/state, or null if zip is invalid
 */
async function getZipCoordinates(zip: string): Promise<ZipCoordinate | null> {
  if (!zip || !/^\d{5}$/.test(zip)) {
    return null;
  }

  // Check Firestore cache first
  const cached = await db.collection("zip_coordinates").doc(zip).get();
  if (cached.exists) {
    const data = cached.data()!;
    return {
      lat: data.lat,
      lng: data.lng,
      city: data.city,
      state: data.state,
    };
  }

  // Cache miss — approximate from prefix ranges
  const approx = approximateZipCoordinates(zip);
  if (!approx) {
    return null;
  }

  // Store in Firestore for future lookups
  await db
    .collection("zip_coordinates")
    .doc(zip)
    .set({
      ...approx,
      source: "approximated",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  return approx;
}

/**
 * Calculate the great-circle distance between two points using the Haversine
 * formula.
 *
 * @function haversineDistance
 * @param lat1 - Latitude of point A in decimal degrees
 * @param lng1 - Longitude of point A in decimal degrees
 * @param lat2 - Latitude of point B in decimal degrees
 * @param lng2 - Longitude of point B in decimal degrees
 * @returns Distance in miles
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}

/**
 * Find workers within a given radius of a project's zip code.
 *
 * Queries the `workers` collection for workers who offer the specified service
 * type, are marked available, and are not suspended. Then computes Haversine
 * distance from each worker's zip to the project zip and filters by radius.
 *
 * Worker documents are expected to have:
 *   - `services` (string array) — service types offered
 *   - `availability` (string) — "available" when accepting work
 *   - `suspended` (boolean) — true if account is suspended
 *   - `zip` (string) — worker's 5-digit zip code
 *   - `name` (string) — display name
 *   - `ratings.overall` (number) — rolling average rating (0-5)
 *   - `completed_jobs` (number) — total completed jobs
 *   - `reliability_score` (number) — reliability metric (0-100)
 *
 * @function findWorkersInRange
 * @param projectZip - 5-digit zip code of the project location
 * @param serviceType - Service type to match (e.g., "installation", "site_survey")
 * @param radiusMiles - Search radius in miles (default: 50)
 * @returns Array of WorkerMatch objects sorted by distance ascending
 */
async function findWorkersInRange(
  projectZip: string,
  serviceType: string,
  radiusMiles: number = DEFAULT_RADIUS_MILES,
): Promise<WorkerMatch[]> {
  // Resolve project coordinates
  const projectCoords = await getZipCoordinates(projectZip);
  if (!projectCoords) {
    return [];
  }

  // Query workers who offer this service type and are available
  // Firestore supports array-contains for the services field
  const snapshot = await db
    .collection("workers")
    .where("services", "array-contains", serviceType)
    .where("availability", "==", "available")
    .get();

  if (snapshot.empty) {
    return [];
  }

  const matches: WorkerMatch[] = [];

  for (const doc of snapshot.docs) {
    const worker = doc.data();

    // Skip suspended workers
    if (worker.suspended === true) {
      continue;
    }

    // Worker must have a zip code for distance calculation
    const workerZip: string | undefined = worker.zip;
    if (!workerZip) {
      continue;
    }

    const workerCoords = await getZipCoordinates(workerZip);
    if (!workerCoords) {
      continue;
    }

    const distance = haversineDistance(
      projectCoords.lat,
      projectCoords.lng,
      workerCoords.lat,
      workerCoords.lng,
    );

    if (distance <= radiusMiles) {
      matches.push({
        workerId: doc.id,
        workerName: worker.name || "Unknown",
        distance: Math.round(distance * 10) / 10,
        rating: worker.ratings?.overall || 0,
        completedJobs: worker.completed_jobs || 0,
        reliabilityScore: worker.reliability_score || 0,
      });
    }
  }

  // Sort by distance ascending (closest first)
  matches.sort((a, b) => a.distance - b.distance);

  return matches;
}

/**
 * Bulk-load zip code coordinate data into the `zip_coordinates` collection.
 *
 * Accepts a record of zip → coordinate mappings and writes them in batched
 * Firestore operations (500 per batch, the Firestore maximum).
 *
 * @function seedZipCoordinates
 * @param zipData - Map of zip codes to their coordinates and location info
 * @returns Number of zip codes successfully written
 */
async function seedZipCoordinates(
  zipData: Record<
    string,
    { lat: number; lng: number; city: string; state: string }
  >,
): Promise<number> {
  const entries = Object.entries(zipData);
  if (entries.length === 0) {
    return 0;
  }

  let written = 0;
  const batchSize = 500; // Firestore batch limit

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = db.batch();
    const chunk = entries.slice(i, i + batchSize);

    for (const [zip, coords] of chunk) {
      if (!/^\d{5}$/.test(zip)) continue;

      const ref = db.collection("zip_coordinates").doc(zip);
      batch.set(ref, {
        lat: coords.lat,
        lng: coords.lng,
        city: coords.city,
        state: coords.state,
        source: "seeded",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      written++;
    }

    await batch.commit();
  }

  return written;
}

// ─── Cloud Function Wrappers ────────────────────────────────────────────────────

/**
 * findNearbyWorkers — Callable Cloud Function
 *
 * Finds marketplace workers within a given radius of a project zip code who
 * offer a specific service type. Returns results sorted by distance.
 *
 * @function findNearbyWorkers
 * @type {functions.https.CallableFunction}
 * @input {{ projectZip: string, serviceType: string, radiusMiles?: number }}
 * @output {{ success: boolean, workers: WorkerMatch[], count: number, radiusMiles: number }}
 */
export const findNearbyWorkers = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in",
      );
    }

    const { projectZip, serviceType, radiusMiles } = data;

    if (!projectZip || !serviceType) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "projectZip and serviceType are required",
      );
    }

    if (!/^\d{5}$/.test(projectZip)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "projectZip must be a valid 5-digit US zip code",
      );
    }

    const radius =
      typeof radiusMiles === "number" && radiusMiles > 0
        ? Math.min(radiusMiles, 500)
        : DEFAULT_RADIUS_MILES;

    const workers = await findWorkersInRange(projectZip, serviceType, radius);

    return {
      success: true,
      workers,
      count: workers.length,
      radiusMiles: radius,
    };
  });

/**
 * bulkSeedZipCoordinates — Callable Cloud Function (admin only)
 *
 * Seeds the zip_coordinates collection with bulk coordinate data.
 * Restricted to admin users to prevent abuse.
 *
 * @function bulkSeedZipCoordinates
 * @type {functions.https.CallableFunction}
 * @input {{ zipData: Record<string, { lat: number, lng: number, city: string, state: string }> }}
 * @output {{ success: boolean, seeded: number }}
 */
export const bulkSeedZipCoordinates = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in",
      );
    }

    // Admin-only — check custom claims or user role
    const userSnap = await db.collection("users").doc(context.auth.uid).get();
    const userData = userSnap.exists ? userSnap.data() : null;

    if (userData?.role !== "admin" && !context.auth.token.admin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can seed zip coordinate data",
      );
    }

    const { zipData } = data;

    if (!zipData || typeof zipData !== "object") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "zipData must be an object mapping zip codes to coordinates",
      );
    }

    const seeded = await seedZipCoordinates(zipData);

    return {
      success: true,
      seeded,
    };
  });

/**
 * lookupZipCoordinates — Callable Cloud Function
 *
 * Looks up coordinates for a single zip code. Useful for UI map features
 * and verifying zip code data before creating listings.
 *
 * @function lookupZipCoordinates
 * @type {functions.https.CallableFunction}
 * @input {{ zip: string }}
 * @output {{ success: boolean, coordinates: ZipCoordinate | null }}
 */
export const lookupZipCoordinates = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in",
      );
    }

    const { zip } = data;

    if (!zip || !/^\d{5}$/.test(zip)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "zip must be a valid 5-digit US zip code",
      );
    }

    const coordinates = await getZipCoordinates(zip);

    return {
      success: true,
      coordinates,
    };
  });
