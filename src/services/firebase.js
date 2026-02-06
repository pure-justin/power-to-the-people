import { initializeApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  increment,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBzvqnZLTqAcv0u6qrIu4APhrYi80Iy9Ys",
  authDomain: "agentic-labs.firebaseapp.com",
  projectId: "agentic-labs",
  storageBucket: "agentic-labs.firebasestorage.app",
  messagingSenderId: "299736855701",
};

let app = null;
let functions = null;
let auth = null;
let db = null;
let storage = null;
let authReady = null; // Promise that resolves when auth is ready
let googleCredential = null; // Store Google credential for API calls

const googleProvider = new GoogleAuthProvider();

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  // Initialize Cloud Functions
  functions = getFunctions(app, "us-central1");
  // Initialize Auth
  auth = getAuth(app);
  // Initialize Firestore
  db = getFirestore(app);
  // Initialize Storage
  storage = getStorage(app);

  // Check for existing auth state
  authReady = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log(
          "Firebase: Auth ready, user:",
          user.uid,
          user.isAnonymous ? "(anonymous)" : "(google)",
        );
        unsubscribe();
        resolve(user);
      } else {
        console.log("Firebase: No user signed in yet");
      }
    });

    // Sign in anonymously as fallback (for Firestore access)
    signInAnonymously(auth)
      .then(() => console.log("Firebase: Signed in anonymously"))
      .catch((error) =>
        console.error("Firebase: Anonymous auth error:", error),
      );
  });
} catch (error) {
  console.error("Firebase initialization error:", error);
  authReady = Promise.reject(error);
}

/**
 * Sign in with Google (required for Cloud Function access due to org policy)
 * Returns the Google identity token for calling functions
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Get the Google credential
    googleCredential = GoogleAuthProvider.credentialFromResult(result);
    console.log("Firebase: Signed in with Google, user:", result.user.uid);
    return result.user;
  } catch (error) {
    console.error("Firebase: Google sign-in error:", error);
    throw error;
  }
};

/**
 * Get a Google identity token for calling Cloud Functions
 * This is needed due to org policy restrictions on the GCP project
 */
export const getGoogleIdToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not signed in");
  }
  // For Google-signed-in users, get the ID token
  const idToken = await user.getIdToken(true);
  return idToken;
};

/**
 * Wait for Firebase auth to be ready before calling functions
 */
export const waitForAuth = async () => {
  if (authReady) {
    return authReady;
  }
  throw new Error("Firebase not initialized");
};

/**
 * Call the generateRealisticSolarPreview Cloud Function
 */
export const generateRealisticSolarPreview = functions
  ? httpsCallable(functions, "generateRealisticSolarPreview", {
      timeout: 120000,
    })
  : async () => {
      throw new Error("Firebase not initialized");
    };

// Cloud Run service URL for bill scanning (publicly accessible)
const SCAN_BILL_API_URL =
  "https://scan-bill-service-299736855701.us-central1.run.app/scan-bill";

// Create base callable functions (for functions that work with httpsCallable)
const scanMeterQRCodeCallable = functions
  ? httpsCallable(functions, "scanMeterQRCode", { timeout: 120000 })
  : null;

const estimateConsumptionCallable = functions
  ? httpsCallable(functions, "estimateConsumption", { timeout: 30000 })
  : null;

/**
 * Call the scanBill API to extract data from utility bill images
 * Uses Gemini 1.5 Pro vision to extract usage, ESIID, rates, etc.
 * Calls through Vercel serverless function to bypass GCP IAM restrictions.
 */
export const scanBill = async (data) => {
  console.log("scanBill: Calling Vercel API...");

  try {
    const response = await fetch(SCAN_BILL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("scanBill: HTTP error:", response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(
      "scanBill: API returned:",
      result.success ? "success" : "error",
    );

    // Check for validation errors (not a bill, poor quality, etc.)
    if (!result.success && result.errorType) {
      const error = new Error(result.error);
      error.errorType = result.errorType;
      throw error;
    }

    return { data: result };
  } catch (fetchError) {
    console.error("scanBill: Fetch error:", fetchError);
    if (fetchError.message?.includes("Failed to fetch")) {
      throw new Error("Network error. Please check your connection.");
    }
    throw fetchError;
  }
};

/**
 * Call the scanMeterQRCode Cloud Function to extract ESIID from meter QR code
 * Texas smart meters have a QR code that encodes the ESIID
 * Waits for auth to be ready before calling.
 */
export const scanMeterQRCode = async (data) => {
  if (!scanMeterQRCodeCallable) {
    throw new Error("Firebase not initialized");
  }
  // Wait for auth to be ready
  await waitForAuth();
  return scanMeterQRCodeCallable(data);
};

/**
 * Call the estimateConsumption Cloud Function for customers without bills
 * Estimates based on home size, heating type, occupants, etc.
 * Waits for auth to be ready before calling.
 */
export const estimateConsumption = async (data) => {
  if (!estimateConsumptionCallable) {
    throw new Error("Firebase not initialized");
  }
  // Wait for auth to be ready
  await waitForAuth();
  return estimateConsumptionCallable(data);
};

/**
 * Save a project to Firestore
 */
export const saveProject = async (projectData) => {
  if (!db) throw new Error("Firestore not initialized");

  const projectRef = doc(db, "projects", projectData.id);
  await setDoc(projectRef, {
    ...projectData,
    updatedAt: serverTimestamp(),
  });

  return projectData.id;
};

/**
 * Get a project from Firestore
 */
export const getProject = async (projectId) => {
  if (!db) throw new Error("Firestore not initialized");

  const projectRef = doc(db, "projects", projectId);
  const projectSnap = await getDoc(projectRef);

  if (projectSnap.exists()) {
    return { id: projectSnap.id, ...projectSnap.data() };
  }
  return null;
};

/**
 * Upload utility bill to Storage and return download URL
 */
export const uploadBillToStorage = async (projectId, file) => {
  if (!storage) throw new Error("Storage not initialized");

  const fileExtension = file.name.split(".").pop();
  const fileName = `bills/${projectId}/utility-bill.${fileExtension}`;
  const storageRef = ref(storage, fileName);

  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
};

/**
 * Check if address has cached design data
 */
export const getCachedDesign = async (addressHash) => {
  if (!db) throw new Error("Firestore not initialized");

  const cacheRef = doc(db, "addressCache", addressHash);
  const cacheSnap = await getDoc(cacheRef);

  if (cacheSnap.exists()) {
    const data = cacheSnap.data();
    // Cache valid for 30 days
    const cacheAge = Date.now() - (data.cachedAt?.toMillis() || 0);
    if (cacheAge < 30 * 24 * 60 * 60 * 1000) {
      return data;
    }
  }
  return null;
};

/**
 * Save design to address cache
 */
export const cacheDesign = async (addressHash, designData) => {
  if (!db) throw new Error("Firestore not initialized");

  const cacheRef = doc(db, "addressCache", addressHash);
  await setDoc(cacheRef, {
    ...designData,
    cachedAt: serverTimestamp(),
  });
};

/**
 * Generate a simple hash from address string
 */
export const hashAddress = (address) => {
  const normalized = address.toLowerCase().replace(/[^a-z0-9]/g, "");
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * Create a new user account with email and password
 */
export const createAccount = async (email, password, displayName) => {
  if (!auth) throw new Error("Auth not initialized");

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );

  // Update display name
  if (displayName) {
    await updateProfile(userCredential.user, { displayName });
  }

  // Create user document in Firestore
  await setDoc(doc(db, "users", userCredential.user.uid), {
    email,
    displayName: displayName || "",
    createdAt: serverTimestamp(),
    role: "customer",
  });

  console.log("Firebase: Created account for", email);
  return userCredential.user;
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email, password) => {
  if (!auth) throw new Error("Auth not initialized");

  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );
  console.log("Firebase: Signed in as", email);
  return userCredential.user;
};

/**
 * Sign out the current user
 */
export const logout = async () => {
  if (!auth) throw new Error("Auth not initialized");
  await signOut(auth);
  console.log("Firebase: Signed out");
};

/**
 * Send password reset email
 */
export const resetPassword = async (email) => {
  if (!auth) throw new Error("Auth not initialized");
  await sendPasswordResetEmail(auth, email);
  console.log("Firebase: Password reset email sent to", email);
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  return auth?.currentUser;
};

/**
 * Subscribe to auth state changes
 */
export const onAuthChange = (callback) => {
  if (!auth) throw new Error("Auth not initialized");
  return onAuthStateChanged(auth, callback);
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (uid) => {
  if (!db) throw new Error("Firestore not initialized");

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() };
  }
  return null;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (uid, data) => {
  if (!db) throw new Error("Firestore not initialized");

  const userRef = doc(db, "users", uid);
  await setDoc(
    userRef,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

/**
 * Link SMT credentials to user account
 * Credentials are stored encrypted (server-side encryption via Firestore)
 * Note: In production, use Cloud Functions with KMS for extra security
 */
export const linkSmtAccount = async (uid, smtUsername, smtPassword, esiid) => {
  if (!db) throw new Error("Firestore not initialized");

  // Store in a subcollection that only the user can access (via security rules)
  const smtRef = doc(db, "users", uid, "private", "smt");
  await setDoc(smtRef, {
    username: smtUsername,
    // In production, encrypt this with Cloud KMS before storing
    // For now, Firestore's server-side encryption provides base security
    password: smtPassword,
    esiid,
    linkedAt: serverTimestamp(),
  });

  // Also update user profile with ESIID (public info)
  await updateUserProfile(uid, { esiid, smtLinked: true });

  console.log("Firebase: Linked SMT account for user", uid);
};

/**
 * Get linked SMT credentials (for portal auto-fetch)
 */
export const getSmtCredentials = async (uid) => {
  if (!db) throw new Error("Firestore not initialized");

  const smtRef = doc(db, "users", uid, "private", "smt");
  const smtSnap = await getDoc(smtRef);

  if (smtSnap.exists()) {
    return smtSnap.data();
  }
  return null;
};

/**
 * Unlink SMT account
 */
export const unlinkSmtAccount = async (uid) => {
  if (!db) throw new Error("Firestore not initialized");

  const smtRef = doc(db, "users", uid, "private", "smt");
  await setDoc(smtRef, { unlinked: true, unlinkedAt: serverTimestamp() });
  await updateUserProfile(uid, { smtLinked: false });
};

export {
  auth,
  db,
  storage,
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
};
export default app;
