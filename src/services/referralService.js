import {
  db,
  auth,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  increment,
} from "./firebase";

/**
 * Generate a unique referral code for a user
 */
export const generateReferralCode = (name, userId) => {
  // Create code from first name + last 6 chars of userId
  const firstName = name.split(" ")[0].toUpperCase().substring(0, 4);
  const userIdPart = userId.substring(userId.length - 6).toUpperCase();
  return `${firstName}${userIdPart}`;
};

/**
 * Create referral record for a new user
 */
export const createReferralRecord = async (userId, userData) => {
  if (!db) throw new Error("Firestore not initialized");

  const referralCode = generateReferralCode(
    userData.displayName || userData.email,
    userId,
  );

  const referralData = {
    userId,
    referralCode,
    email: userData.email,
    displayName: userData.displayName || "",
    totalReferrals: 0,
    qualifiedReferrals: 0,
    installedReferrals: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "referrals", userId), referralData);
  return referralCode;
};

/**
 * Get referral data for a user
 */
export const getReferralData = async (userId) => {
  if (!db) throw new Error("Firestore not initialized");

  const referralRef = doc(db, "referrals", userId);
  const referralSnap = await getDoc(referralRef);

  if (referralSnap.exists()) {
    return { id: referralSnap.id, ...referralSnap.data() };
  }
  return null;
};

/**
 * Validate referral code and get referrer info
 */
export const validateReferralCode = async (code) => {
  if (!db) throw new Error("Firestore not initialized");
  if (!code || code.trim() === "") return null;

  const normalizedCode = code.trim().toUpperCase();

  // Query for the referral code
  const referralsRef = collection(db, "referrals");
  const q = query(
    referralsRef,
    where("referralCode", "==", normalizedCode),
    limit(1),
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const referralDoc = querySnapshot.docs[0];
  return { id: referralDoc.id, ...referralDoc.data() };
};

/**
 * Track a referral when someone uses a referral code
 */
export const trackReferral = async (referralCode, referredUserData) => {
  if (!db) throw new Error("Firestore not initialized");

  // Validate referral code
  const referrer = await validateReferralCode(referralCode);
  if (!referrer) {
    throw new Error("Invalid referral code");
  }

  // Create referral tracking record
  const referralTrackingData = {
    referrerId: referrer.userId,
    referrerCode: referralCode,
    referrerEmail: referrer.email,
    referredEmail: referredUserData.email,
    referredName: referredUserData.name,
    referredPhone: referredUserData.phone || "",
    referredAddress: referredUserData.address || "",
    projectId: referredUserData.projectId || "",
    status: "signed_up", // signed_up, qualified, site_survey, installed, earning
    qualificationData: referredUserData.qualificationData || null,
    earnings: 0,
    earningMilestones: {
      signup: { completed: true, amount: 0, date: new Date() },
      qualified: { completed: false, amount: 0, date: null },
      siteSurvey: { completed: false, amount: 50, date: null },
      installed: { completed: false, amount: 450, date: null },
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const trackingRef = await addDoc(
    collection(db, "referralTracking"),
    referralTrackingData,
  );

  // Update referrer's total referrals count
  const referrerRef = doc(db, "referrals", referrer.userId);
  await updateDoc(referrerRef, {
    totalReferrals: increment(1),
    updatedAt: serverTimestamp(),
  });

  return { trackingId: trackingRef.id, referrer };
};

/**
 * Update referral status and earnings
 */
export const updateReferralStatus = async (trackingId, newStatus) => {
  if (!db) throw new Error("Firestore not initialized");

  const trackingRef = doc(db, "referralTracking", trackingId);
  const trackingSnap = await getDoc(trackingRef);

  if (!trackingSnap.exists()) {
    throw new Error("Referral tracking record not found");
  }

  const trackingData = trackingSnap.data();
  const milestones = trackingData.earningMilestones;
  let earningsToAdd = 0;

  // Update milestone completion
  const now = new Date();
  if (newStatus === "qualified" && !milestones.qualified.completed) {
    milestones.qualified.completed = true;
    milestones.qualified.date = now;
    earningsToAdd += milestones.qualified.amount;
  } else if (newStatus === "site_survey" && !milestones.siteSurvey.completed) {
    milestones.siteSurvey.completed = true;
    milestones.siteSurvey.date = now;
    earningsToAdd += milestones.siteSurvey.amount;
  } else if (newStatus === "installed" && !milestones.installed.completed) {
    milestones.installed.completed = true;
    milestones.installed.date = now;
    earningsToAdd += milestones.installed.amount;
  }

  // Update tracking record
  await updateDoc(trackingRef, {
    status: newStatus,
    earningMilestones: milestones,
    earnings: increment(earningsToAdd),
    updatedAt: serverTimestamp(),
  });

  // Update referrer's earnings and counts
  const referrerRef = doc(db, "referrals", trackingData.referrerId);

  const updates = {
    updatedAt: serverTimestamp(),
  };

  if (newStatus === "qualified") {
    updates.qualifiedReferrals = increment(1);
  } else if (newStatus === "installed") {
    updates.installedReferrals = increment(1);
  }

  if (earningsToAdd > 0) {
    updates.totalEarnings = increment(earningsToAdd);
    updates.pendingEarnings = increment(earningsToAdd);
  }

  await updateDoc(referrerRef, updates);

  return { earningsAdded: earningsToAdd };
};

/**
 * Get all referrals for a user
 */
export const getUserReferrals = async (userId) => {
  if (!db) throw new Error("Firestore not initialized");

  const trackingRef = collection(db, "referralTracking");
  const q = query(
    trackingRef,
    where("referrerId", "==", userId),
    orderBy("createdAt", "desc"),
  );

  const querySnapshot = await getDocs(q);
  const referrals = [];

  querySnapshot.forEach((doc) => {
    referrals.push({ id: doc.id, ...doc.data() });
  });

  return referrals;
};

/**
 * Process payout for a referrer
 */
export const processReferralPayout = async (userId, amount) => {
  if (!db) throw new Error("Firestore not initialized");

  const referrerRef = doc(db, "referrals", userId);

  // Create payout record
  const payoutData = {
    userId,
    amount,
    status: "pending", // pending, processing, completed, failed
    method: "direct_deposit", // Could be: direct_deposit, check, paypal
    requestedAt: serverTimestamp(),
    processedAt: null,
  };

  const payoutRef = await addDoc(collection(db, "payouts"), payoutData);

  // Update referrer's earnings
  await updateDoc(referrerRef, {
    pendingEarnings: increment(-amount),
    updatedAt: serverTimestamp(),
  });

  return payoutRef.id;
};

/**
 * Get leaderboard of top referrers
 */
export const getReferralLeaderboard = async (limitCount = 10) => {
  if (!db) throw new Error("Firestore not initialized");

  const referralsRef = collection(db, "referrals");
  const q = query(
    referralsRef,
    orderBy("installedReferrals", "desc"),
    orderBy("qualifiedReferrals", "desc"),
    limit(limitCount),
  );

  const querySnapshot = await getDocs(q);
  const leaderboard = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    // Anonymize for public display
    leaderboard.push({
      rank: leaderboard.length + 1,
      displayName:
        data.displayName.substring(0, 1) +
        "***" +
        (data.displayName.split(" ")[1]?.substring(0, 1) || ""),
      totalReferrals: data.totalReferrals,
      installedReferrals: data.installedReferrals,
      totalEarnings: data.totalEarnings,
    });
  });

  return leaderboard;
};

/**
 * Generate referral link for sharing
 */
export const generateReferralLink = (referralCode) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/qualify?ref=${referralCode}`;
};

/**
 * Get referral analytics
 */
export const getReferralAnalytics = async (userId) => {
  if (!db) throw new Error("Firestore not initialized");

  const referralData = await getReferralData(userId);
  const referrals = await getUserReferrals(userId);

  // Calculate conversion rates
  const conversionRate =
    referralData.totalReferrals > 0
      ? (referralData.qualifiedReferrals / referralData.totalReferrals) * 100
      : 0;

  const installRate =
    referralData.qualifiedReferrals > 0
      ? (referralData.installedReferrals / referralData.qualifiedReferrals) *
        100
      : 0;

  // Status breakdown
  const statusCounts = {
    signed_up: 0,
    qualified: 0,
    site_survey: 0,
    installed: 0,
  };

  referrals.forEach((ref) => {
    if (statusCounts[ref.status] !== undefined) {
      statusCounts[ref.status]++;
    }
  });

  return {
    ...referralData,
    conversionRate: Math.round(conversionRate),
    installRate: Math.round(installRate),
    statusCounts,
    recentReferrals: referrals.slice(0, 5),
  };
};

export default {
  generateReferralCode,
  createReferralRecord,
  getReferralData,
  validateReferralCode,
  trackReferral,
  updateReferralStatus,
  getUserReferrals,
  processReferralPayout,
  getReferralLeaderboard,
  generateReferralLink,
  getReferralAnalytics,
};
