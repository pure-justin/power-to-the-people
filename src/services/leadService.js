/**
 * Lead Service - Frontend integration with Cloud Functions
 *
 * Handles lead creation, updates, and queries.
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";

const functions = getFunctions();
const db = getFirestore();

/**
 * Create a new lead
 */
export async function createLead(leadData) {
  const createLeadFn = httpsCallable(functions, "createLead");

  try {
    const result = await createLeadFn(leadData);
    return {
      success: true,
      leadId: result.data.leadId,
      lead: result.data.lead,
    };
  } catch (error) {
    console.error("Error creating lead:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update an existing lead
 */
export async function updateLead(leadId, updates) {
  const updateLeadFn = httpsCallable(functions, "updateLead");

  try {
    const result = await updateLeadFn({ leadId, updates });
    return {
      success: true,
      leadId: result.data.leadId,
    };
  } catch (error) {
    console.error("Error updating lead:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Add a note to a lead
 */
export async function addLeadNote(leadId, text, type = "note") {
  const addLeadNoteFn = httpsCallable(functions, "addLeadNote");

  try {
    const result = await addLeadNoteFn({ leadId, text, type });
    return {
      success: true,
      note: result.data.note,
    };
  } catch (error) {
    console.error("Error adding note:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Assign a lead to a sales rep
 */
export async function assignLead(leadId, assignToUserId, assignToName) {
  const assignLeadFn = httpsCallable(functions, "assignLead");

  try {
    const result = await assignLeadFn({
      leadId,
      assignToUserId,
      assignToName,
    });
    return {
      success: true,
      leadId: result.data.leadId,
    };
  } catch (error) {
    console.error("Error assigning lead:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get a single lead by ID
 */
export async function getLead(leadId) {
  try {
    const leadRef = doc(db, "leads", leadId);
    const leadSnap = await getDoc(leadRef);

    if (!leadSnap.exists()) {
      return { success: false, error: "Lead not found" };
    }

    return {
      success: true,
      lead: { id: leadSnap.id, ...leadSnap.data() },
    };
  } catch (error) {
    console.error("Error getting lead:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get leads by status
 */
export async function getLeadsByStatus(status, maxResults = 50) {
  try {
    const q = query(
      collection(db, "leads"),
      where("status", "==", status),
      where("archived", "!=", true),
      orderBy("archived"),
      orderBy("createdAt", "desc"),
      limit(maxResults),
    );

    const snapshot = await getDocs(q);
    const leads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, leads };
  } catch (error) {
    console.error("Error getting leads:", error);
    return {
      success: false,
      error: error.message,
      leads: [],
    };
  }
}

/**
 * Get high-value leads (score >= 75)
 */
export async function getHighValueLeads(maxResults = 50) {
  try {
    const q = query(
      collection(db, "leads"),
      where("score", ">=", 75),
      where("status", "==", "submitted"),
      orderBy("score", "desc"),
      limit(maxResults),
    );

    const snapshot = await getDocs(q);
    const leads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, leads };
  } catch (error) {
    console.error("Error getting high-value leads:", error);
    return {
      success: false,
      error: error.message,
      leads: [],
    };
  }
}

/**
 * Get my assigned leads (requires auth)
 */
export async function getMyLeads(userId, statuses = null, maxResults = 100) {
  try {
    let q;

    if (statuses && Array.isArray(statuses)) {
      q = query(
        collection(db, "leads"),
        where("assignedTo", "==", userId),
        where("status", "in", statuses),
        orderBy("updatedAt", "desc"),
        limit(maxResults),
      );
    } else {
      q = query(
        collection(db, "leads"),
        where("assignedTo", "==", userId),
        orderBy("updatedAt", "desc"),
        limit(maxResults),
      );
    }

    const snapshot = await getDocs(q);
    const leads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, leads };
  } catch (error) {
    console.error("Error getting my leads:", error);
    return {
      success: false,
      error: error.message,
      leads: [],
    };
  }
}

/**
 * Get leads by source
 */
export async function getLeadsBySource(source, maxResults = 50) {
  try {
    const q = query(
      collection(db, "leads"),
      where("source", "==", source),
      orderBy("createdAt", "desc"),
      limit(maxResults),
    );

    const snapshot = await getDocs(q);
    const leads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, leads };
  } catch (error) {
    console.error("Error getting leads by source:", error);
    return {
      success: false,
      error: error.message,
      leads: [],
    };
  }
}

/**
 * Subscribe to real-time updates for a lead
 */
export function subscribeLead(leadId, callback) {
  const leadRef = doc(db, "leads", leadId);

  return onSnapshot(
    leadRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback({
          success: true,
          lead: { id: docSnap.id, ...docSnap.data() },
        });
      } else {
        callback({ success: false, error: "Lead not found" });
      }
    },
    (error) => {
      console.error("Error subscribing to lead:", error);
      callback({ success: false, error: error.message });
    },
  );
}

/**
 * Subscribe to real-time updates for leads by status
 */
export function subscribeLeadsByStatus(status, callback, maxResults = 50) {
  const q = query(
    collection(db, "leads"),
    where("status", "==", status),
    where("archived", "!=", true),
    orderBy("archived"),
    orderBy("createdAt", "desc"),
    limit(maxResults),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const leads = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback({ success: true, leads });
    },
    (error) => {
      console.error("Error subscribing to leads:", error);
      callback({ success: false, error: error.message, leads: [] });
    },
  );
}

/**
 * Helper: Convert Firestore Timestamp to Date
 */
export function convertTimestamp(timestamp) {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  return timestamp;
}

/**
 * Helper: Format lead for display (convert timestamps)
 */
export function formatLead(lead) {
  return {
    ...lead,
    createdAt: convertTimestamp(lead.createdAt),
    updatedAt: convertTimestamp(lead.updatedAt),
    lastContactedAt: convertTimestamp(lead.lastContactedAt),
    qualifiedAt: convertTimestamp(lead.qualifiedAt),
    closedAt: convertTimestamp(lead.closedAt),
    notes: (lead.notes || []).map((note) => ({
      ...note,
      createdAt: convertTimestamp(note.createdAt),
    })),
  };
}
