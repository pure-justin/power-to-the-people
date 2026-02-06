/**
 * Solar Installer API Service
 *
 * Query and filter solar installers from Firestore
 */

import {
  db,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
} from "./firebase.js";

/**
 * Search for solar installers by location and filters
 */
export async function searchInstallers(options = {}) {
  const {
    state = null,
    city = null,
    minRating = null,
    certifications = [],
    companySize = null,
    maxResults = 50,
    sortBy = "rating", // rating, reviewCount, annualInstalls
    sortOrder = "desc",
  } = options;

  try {
    let q = collection(db, "installers");

    // Build query with filters
    const constraints = [where("active", "==", true)];

    if (state) {
      constraints.push(where("state", "==", state));
    }

    if (city) {
      constraints.push(where("city", "==", city));
    }

    if (minRating) {
      constraints.push(where("rating", ">=", minRating));
    }

    if (certifications.length > 0) {
      // Firestore supports array-contains for single value
      // For multiple certifications, we need to query each separately
      constraints.push(
        where("certifications", "array-contains", certifications[0]),
      );
    }

    if (companySize) {
      constraints.push(where("companySize", "==", companySize));
    }

    // Add ordering
    const orderField =
      sortBy === "rating"
        ? "rating"
        : sortBy === "reviewCount"
          ? "reviewCount"
          : sortBy === "annualInstalls"
            ? "annualInstalls"
            : "rating";
    const orderDirection = sortOrder === "asc" ? "asc" : "desc";

    constraints.push(orderBy(orderField, orderDirection));
    constraints.push(limit(maxResults));

    // Execute query
    const q2 = query(q, ...constraints);
    const snapshot = await getDocs(q2);

    const installers = [];
    snapshot.forEach((doc) => {
      installers.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      success: true,
      count: installers.length,
      installers,
    };
  } catch (error) {
    console.error("Error searching installers:", error);
    return {
      success: false,
      error: error.message,
      installers: [],
    };
  }
}

/**
 * Get installer by ID
 */
export async function getInstaller(installerId) {
  try {
    const docRef = doc(db, "installers", installerId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        success: true,
        installer: {
          id: docSnap.id,
          ...docSnap.data(),
        },
      };
    } else {
      return {
        success: false,
        error: "Installer not found",
      };
    }
  } catch (error) {
    console.error("Error getting installer:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get top-rated installers in a state
 */
export async function getTopInstallers(state, count = 10) {
  return searchInstallers({
    state,
    minRating: 4.0,
    maxResults: count,
    sortBy: "rating",
    sortOrder: "desc",
  });
}

/**
 * Get installers by service area
 */
export async function getInstallersByServiceArea(state, city = null) {
  const options = {
    state,
    maxResults: 100,
    sortBy: "rating",
  };

  if (city) {
    options.city = city;
  }

  return searchInstallers(options);
}

/**
 * Get NABCEP certified installers
 */
export async function getNABCEPInstallers(state, count = 50) {
  return searchInstallers({
    state,
    certifications: ["NABCEP PV Installation Professional"],
    maxResults: count,
    sortBy: "rating",
  });
}

/**
 * Get installers by company size
 */
export async function getInstallersBySize(state, size, count = 50) {
  return searchInstallers({
    state,
    companySize: size, // small, medium, large
    maxResults: count,
    sortBy: "annualInstalls",
  });
}

/**
 * Get installer statistics for a state
 */
export async function getInstallerStats(state) {
  try {
    const q = query(
      collection(db, "installers"),
      where("state", "==", state),
      where("active", "==", true),
    );

    const snapshot = await getDocs(q);

    const stats = {
      total: 0,
      bySize: { small: 0, medium: 0, large: 0 },
      avgRating: 0,
      totalReviews: 0,
      certified: 0,
    };

    let totalRating = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      stats.total++;

      // Count by size
      const size = data.companySize || "unknown";
      if (stats.bySize[size] !== undefined) {
        stats.bySize[size]++;
      }

      // Aggregate ratings
      if (data.rating) {
        totalRating += data.rating;
      }

      // Count reviews
      if (data.reviewCount) {
        stats.totalReviews += data.reviewCount;
      }

      // Count certified
      if (
        data.certifications?.includes("NABCEP PV Installation Professional")
      ) {
        stats.certified++;
      }
    });

    if (stats.total > 0) {
      stats.avgRating = (totalRating / stats.total).toFixed(2);
    }

    return {
      success: true,
      state,
      stats,
    };
  } catch (error) {
    console.error("Error getting installer stats:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Search installers by keywords (full-text search)
 */
export async function searchInstallersByKeywords(
  keywords,
  state = null,
  count = 20,
) {
  try {
    const searchTerms = keywords.toLowerCase().split(/\s+/);

    let q = collection(db, "installers");
    const constraints = [where("active", "==", true)];

    if (state) {
      constraints.push(where("state", "==", state));
    }

    // Use array-contains-any for keyword search (max 10 terms)
    constraints.push(
      where("searchKeywords", "array-contains-any", searchTerms.slice(0, 10)),
    );
    constraints.push(orderBy("rating", "desc"));
    constraints.push(limit(count));

    const q2 = query(q, ...constraints);
    const snapshot = await getDocs(q2);

    const installers = [];
    snapshot.forEach((doc) => {
      installers.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      success: true,
      query: keywords,
      count: installers.length,
      installers,
    };
  } catch (error) {
    console.error("Error searching by keywords:", error);
    return {
      success: false,
      error: error.message,
      installers: [],
    };
  }
}
