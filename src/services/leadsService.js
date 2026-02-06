import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Lead Status Types
 */
export const LEAD_STATUS = {
  NEW: "new",
  QUALIFIED: "qualified",
  CONTACTED: "contacted",
  PROPOSAL_SENT: "proposal_sent",
  SITE_VISIT_SCHEDULED: "site_visit_scheduled",
  CONTRACT_SIGNED: "contract_signed",
  CLOSED_WON: "closed_won",
  CLOSED_LOST: "closed_lost",
};

/**
 * Credit Score Options
 */
export const CREDIT_SCORES = {
  EXCELLENT: "excellent",
  GOOD: "good",
  FAIR: "fair",
  POOR: "poor",
};

/**
 * Bill Data Sources
 */
export const BILL_SOURCES = {
  UTILITY_BILL: "utility_bill",
  SMART_METER_TEXAS: "smart_meter_texas",
  ESTIMATED: "estimated",
};

/**
 * Create a new lead in Firestore
 * @param {object} leadData - Lead data from qualification form
 * @returns {Promise<string>} - Document ID of created lead
 */
export const createLead = async (leadData) => {
  if (!db) throw new Error("Firestore not initialized");

  const leadsRef = collection(db, "leads");

  // Use custom ID if provided, otherwise auto-generate
  if (leadData.id) {
    const leadDocRef = doc(db, "leads", leadData.id);
    await setDoc(leadDocRef, {
      ...leadData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log("Lead created with custom ID:", leadData.id);
    return leadData.id;
  } else {
    const docRef = await addDoc(leadsRef, {
      ...leadData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log("Lead created with auto ID:", docRef.id);
    return docRef.id;
  }
};

/**
 * Get a lead by ID
 * @param {string} leadId - Lead document ID
 * @returns {Promise<object|null>} - Lead data or null if not found
 */
export const getLead = async (leadId) => {
  if (!db) throw new Error("Firestore not initialized");

  const leadRef = doc(db, "leads", leadId);
  const leadSnap = await getDoc(leadRef);

  if (leadSnap.exists()) {
    return {
      id: leadSnap.id,
      ...leadSnap.data(),
    };
  }
  return null;
};

/**
 * Update a lead
 * @param {string} leadId - Lead document ID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateLead = async (leadId, updates) => {
  if (!db) throw new Error("Firestore not initialized");

  const leadRef = doc(db, "leads", leadId);
  await updateDoc(leadRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  console.log("Lead updated:", leadId);
};

/**
 * Update lead status
 * @param {string} leadId - Lead document ID
 * @param {string} status - New status
 * @returns {Promise<void>}
 */
export const updateLeadStatus = async (leadId, status) => {
  if (!Object.values(LEAD_STATUS).includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  await updateLead(leadId, { status });
};

/**
 * Assign a lead to an admin user
 * @param {string} leadId - Lead document ID
 * @param {string} userId - Admin user ID
 * @returns {Promise<void>}
 */
export const assignLead = async (leadId, userId) => {
  await updateLead(leadId, {
    assignedTo: userId,
    assignedAt: serverTimestamp(),
  });
};

/**
 * Add a note to a lead
 * @param {string} leadId - Lead document ID
 * @param {string} authorId - Note author user ID
 * @param {string} authorName - Note author display name
 * @param {string} text - Note text
 * @returns {Promise<void>}
 */
export const addLeadNote = async (leadId, authorId, authorName, text) => {
  if (!db) throw new Error("Firestore not initialized");

  const leadRef = doc(db, "leads", leadId);
  const leadSnap = await getDoc(leadRef);

  if (!leadSnap.exists()) {
    throw new Error("Lead not found");
  }

  const currentNotes = leadSnap.data().notes || [];
  const newNote = {
    id: `note_${Date.now()}`,
    authorId,
    authorName,
    text,
    createdAt: Timestamp.now(),
  };

  await updateDoc(leadRef, {
    notes: [...currentNotes, newNote],
    updatedAt: serverTimestamp(),
  });

  console.log("Note added to lead:", leadId);
};

/**
 * Add tags to a lead
 * @param {string} leadId - Lead document ID
 * @param {string[]} tags - Array of tag strings
 * @returns {Promise<void>}
 */
export const addLeadTags = async (leadId, tags) => {
  if (!db) throw new Error("Firestore not initialized");

  const leadRef = doc(db, "leads", leadId);
  const leadSnap = await getDoc(leadRef);

  if (!leadSnap.exists()) {
    throw new Error("Lead not found");
  }

  const currentTags = leadSnap.data().tags || [];
  const uniqueTags = [...new Set([...currentTags, ...tags])];

  await updateDoc(leadRef, {
    tags: uniqueTags,
    updatedAt: serverTimestamp(),
  });

  console.log("Tags added to lead:", leadId);
};

/**
 * Remove tags from a lead
 * @param {string} leadId - Lead document ID
 * @param {string[]} tagsToRemove - Array of tag strings to remove
 * @returns {Promise<void>}
 */
export const removeLeadTags = async (leadId, tagsToRemove) => {
  if (!db) throw new Error("Firestore not initialized");

  const leadRef = doc(db, "leads", leadId);
  const leadSnap = await getDoc(leadRef);

  if (!leadSnap.exists()) {
    throw new Error("Lead not found");
  }

  const currentTags = leadSnap.data().tags || [];
  const filteredTags = currentTags.filter((tag) => !tagsToRemove.includes(tag));

  await updateDoc(leadRef, {
    tags: filteredTags,
    updatedAt: serverTimestamp(),
  });

  console.log("Tags removed from lead:", leadId);
};

/**
 * Get all leads with filters
 * @param {object} filters - Query filters
 * @param {string} filters.status - Filter by status
 * @param {string} filters.assignedTo - Filter by assigned user
 * @param {boolean} filters.energyCommunityEligible - Filter by energy community eligibility
 * @param {number} filters.limit - Maximum number of results
 * @returns {Promise<object[]>} - Array of leads
 */
export const getLeads = async (filters = {}) => {
  if (!db) throw new Error("Firestore not initialized");

  const leadsRef = collection(db, "leads");
  let q = query(leadsRef);

  // Apply filters
  if (filters.status) {
    q = query(q, where("status", "==", filters.status));
  }

  if (filters.assignedTo) {
    q = query(q, where("assignedTo", "==", filters.assignedTo));
  }

  if (filters.energyCommunityEligible !== undefined) {
    q = query(
      q,
      where("energyCommunity.eligible", "==", filters.energyCommunityEligible),
    );
  }

  if (filters.county) {
    q = query(q, where("address.county", "==", filters.county));
  }

  if (filters.source) {
    q = query(q, where("tracking.source", "==", filters.source));
  }

  // Order by creation date (newest first)
  q = query(q, orderBy("createdAt", "desc"));

  // Apply limit
  if (filters.limit) {
    q = query(q, limit(filters.limit));
  }

  const querySnapshot = await getDocs(q);
  const leads = [];

  querySnapshot.forEach((doc) => {
    leads.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  console.log(`Found ${leads.length} leads`);
  return leads;
};

/**
 * Get leads by customer user ID
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<object[]>} - Array of customer's leads
 */
export const getLeadsByUserId = async (userId) => {
  if (!db) throw new Error("Firestore not initialized");

  const leadsRef = collection(db, "leads");
  const q = query(
    leadsRef,
    where("customer.userId", "==", userId),
    orderBy("createdAt", "desc"),
  );

  const querySnapshot = await getDocs(q);
  const leads = [];

  querySnapshot.forEach((doc) => {
    leads.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  console.log(`Found ${leads.length} leads for user ${userId}`);
  return leads;
};

/**
 * Get leads by email address
 * @param {string} email - Customer email
 * @returns {Promise<object[]>} - Array of leads
 */
export const getLeadsByEmail = async (email) => {
  if (!db) throw new Error("Firestore not initialized");

  const leadsRef = collection(db, "leads");
  const q = query(
    leadsRef,
    where("customer.email", "==", email),
    orderBy("createdAt", "desc"),
  );

  const querySnapshot = await getDocs(q);
  const leads = [];

  querySnapshot.forEach((doc) => {
    leads.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  console.log(`Found ${leads.length} leads for email ${email}`);
  return leads;
};

/**
 * Get recent leads (last 24 hours)
 * @param {number} hours - Number of hours to look back (default 24)
 * @returns {Promise<object[]>} - Array of recent leads
 */
export const getRecentLeads = async (hours = 24) => {
  if (!db) throw new Error("Firestore not initialized");

  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hours);

  const leadsRef = collection(db, "leads");
  const q = query(
    leadsRef,
    where("createdAt", ">=", Timestamp.fromDate(cutoffTime)),
    orderBy("createdAt", "desc"),
  );

  const querySnapshot = await getDocs(q);
  const leads = [];

  querySnapshot.forEach((doc) => {
    leads.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  console.log(`Found ${leads.length} leads from last ${hours} hours`);
  return leads;
};

/**
 * Update lead progress milestone
 * @param {string} leadId - Lead document ID
 * @param {string} milestone - Progress milestone name
 * @param {boolean} completed - Whether milestone is completed
 * @returns {Promise<void>}
 */
export const updateLeadProgress = async (leadId, milestone, completed) => {
  const progressUpdate = {};
  progressUpdate[`progress.${milestone}`] = completed;

  // Add timestamp for completion
  if (completed) {
    progressUpdate[`progress.${milestone}At`] = serverTimestamp();
  }

  await updateLead(leadId, progressUpdate);
};

/**
 * Build a complete lead object from form data
 * @param {object} formData - Form data from qualification flow
 * @param {object} options - Additional data (billData, systemDesign, etc.)
 * @returns {object} - Complete lead object ready for Firestore
 */
export const buildLeadObject = (formData, options = {}) => {
  const {
    billData = null,
    meterData = null,
    systemDesign = null,
    energyCommunityResult = null,
    userId = null,
    utilityBillUrl = null,
    trackingData = {},
  } = options;

  // Determine bill source
  let billSource = BILL_SOURCES.UTILITY_BILL;
  if (billData?.source === "smart_meter_texas") {
    billSource = BILL_SOURCES.SMART_METER_TEXAS;
  } else if (billData?.isEstimated) {
    billSource = BILL_SOURCES.ESTIMATED;
  }

  // Build the lead object
  const lead = {
    id: formData.id || `PTTP-${Date.now().toString(36).toUpperCase()}`,
    status: LEAD_STATUS.QUALIFIED,

    customer: {
      firstName: formData.firstName || "",
      lastName: formData.lastName || "",
      email: formData.email || "",
      phone: formData.phone || "",
      userId: userId,
    },

    address: {
      street: formData.street || "",
      city: formData.city || "",
      state: formData.state || "TX",
      postalCode: formData.postalCode || "",
      county: formData.county || "",
      latitude: formData.latitude || 0,
      longitude: formData.longitude || 0,
      formattedAddress: `${formData.street}, ${formData.city}, ${formData.state} ${formData.postalCode}`,
    },

    qualification: {
      isHomeowner: formData.isHomeowner || false,
      creditScore: formData.creditScore || CREDIT_SCORES.GOOD,
      hasUtilityBill: !!formData.utilityBillFile,
      utilityBillUrl: utilityBillUrl,
    },

    energyCommunity: {
      eligible: energyCommunityResult?.isEnergyCommunity || false,
      msa: energyCommunityResult?.msa || null,
      reason: energyCommunityResult?.reason || null,
      bonusEligible: energyCommunityResult?.isEnergyCommunity || false,
    },

    billData: billData
      ? {
          source: billSource,
          provider: billData.provider || null,
          esiid: billData.esiid || meterData?.esiid || null,
          accountNumber: billData.accountNumber || null,

          monthlyUsageKwh: billData.monthlyUsageKwh || 0,
          annualUsageKwh: billData.annualUsageKwh || 0,
          monthlyBillAmount: billData.monthlyBillAmount || null,

          energyRate: billData.energyRate || null,
          hasTimeOfUse: billData.hasTimeOfUse || false,

          isEstimated: billData.isEstimated || false,
          estimateMethod: billData.estimateMethod || null,
          scanConfidence: billData.confidence || null,

          historicalData: billData.historicalData || null,
        }
      : null,

    systemDesign: systemDesign
      ? {
          recommendedPanelCount: systemDesign.panelCount || 0,
          systemSizeKw: systemDesign.systemSizeKw || 0,
          annualProductionKwh: systemDesign.annualProductionKwh || 0,
          offsetPercentage: systemDesign.offsetPercentage || 1.0,

          estimatedCost: systemDesign.estimatedCost || 0,
          federalTaxCredit: systemDesign.federalTaxCredit || 0,
          netCost: systemDesign.netCost || 0,
          estimatedMonthlySavings: systemDesign.estimatedMonthlySavings || 0,
          estimatedAnnualSavings: systemDesign.estimatedAnnualSavings || 0,
          paybackPeriodYears: systemDesign.paybackPeriodYears || 0,

          roofSegmentCount: systemDesign.roofSegmentCount || null,
          maxPanelCapacity: systemDesign.maxPanelCapacity || null,
          solarPotentialKwh: systemDesign.solarPotentialKwh || null,
          sunshineHoursPerYear: systemDesign.sunshineHoursPerYear || null,

          panels: systemDesign.panels || null,
        }
      : null,

    smartMeterTexas: {
      linked: billSource === BILL_SOURCES.SMART_METER_TEXAS,
      method: billData?.smtMethod || null,
      fetchedAt:
        billSource === BILL_SOURCES.SMART_METER_TEXAS ? Timestamp.now() : null,
      autoFetchEnabled: false,
    },

    tracking: {
      source: trackingData.source || "direct",
      medium: trackingData.medium || null,
      campaign: trackingData.campaign || null,
      referralCode: trackingData.referralCode || null,
      utmParams: trackingData.utmParams || null,
      landingPage: trackingData.landingPage || window.location.href,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    },

    progress: {
      qualificationCompleted: true,
      proposalSent: false,
      proposalSentAt: null,
      siteVisitScheduled: false,
      siteVisitDate: null,
      contractSigned: false,
      contractSignedAt: null,
      installationScheduled: false,
      installationDate: null,
      installationCompleted: false,
      installationCompletedAt: null,
    },

    notes: [],
    assignedTo: null,
    assignedAt: null,
    tags: [],
  };

  return lead;
};

/**
 * Convert legacy project to lead format
 * @param {object} projectData - Legacy project data
 * @returns {object} - Lead object
 */
export const convertProjectToLead = (projectData) => {
  return {
    id: projectData.id,
    status:
      projectData.status === "qualified"
        ? LEAD_STATUS.QUALIFIED
        : LEAD_STATUS.NEW,
    customer: projectData.customer,
    address: projectData.address,
    qualification: projectData.qualification,
    energyCommunity: projectData.energyCommunity,
    billData: projectData.billData,
    systemDesign: projectData.systemDesign,
    smartMeterTexas: projectData.smartMeterTexas || {
      linked: false,
      method: null,
      fetchedAt: null,
      autoFetchEnabled: false,
    },
    tracking: projectData.tracking || {
      source: "direct",
      medium: null,
      campaign: null,
      referralCode: null,
      utmParams: null,
      landingPage: "",
      userAgent: "",
    },
    progress: {
      qualificationCompleted: true,
      proposalSent: false,
      proposalSentAt: null,
      siteVisitScheduled: false,
      siteVisitDate: null,
      contractSigned: false,
      contractSignedAt: null,
      installationScheduled: false,
      installationDate: null,
      installationCompleted: false,
      installationCompletedAt: null,
    },
    notes: [],
    assignedTo: null,
    assignedAt: null,
    tags: [],
  };
};
