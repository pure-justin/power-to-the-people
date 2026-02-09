/**
 * Marketplace Service
 * Wraps both HTTP API endpoints and Firebase callable functions
 * for the SolarOS marketplace (listings, bids, workers, ratings).
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import app from "./firebase";

const functions = getFunctions(app, "us-central1");
const API_BASE =
  "https://us-central1-power-to-the-people-vpp.cloudfunctions.net/marketplaceApi";

// ─── Auth Helper ──────────────────────────────────────────────────────────────

async function getAuthHeaders() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ─── Generic Fetch Wrapper ────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const headers = await getAuthHeaders();
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.error || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

// ─── Listings (HTTP API) ──────────────────────────────────────────────────────

export async function getListings(filters = {}) {
  const params = new URLSearchParams();
  if (filters.service_type) params.set("service_type", filters.service_type);
  if (filters.status) params.set("status", filters.status);
  if (filters.state) params.set("state", filters.state);
  if (filters.zip) params.set("zip", filters.zip);
  if (filters.radius) params.set("radius", String(filters.radius));
  const qs = params.toString();
  return apiFetch(`/listings${qs ? `?${qs}` : ""}`);
}

export async function getListing(id) {
  return apiFetch(`/listings/${id}`);
}

export async function createListing(data) {
  return apiFetch("/listings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function submitBid(listingId, bidData) {
  return apiFetch(`/listings/${listingId}/bid`, {
    method: "POST",
    body: JSON.stringify(bidData),
  });
}

export async function acceptBid(listingId, bidId) {
  return apiFetch(`/listings/${listingId}/accept`, {
    method: "POST",
    body: JSON.stringify({ bidId }),
  });
}

export async function completeJob(listingId, data = {}) {
  return apiFetch(`/listings/${listingId}/complete`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Workers (HTTP API) ───────────────────────────────────────────────────────

export async function getWorkers(filters = {}) {
  const params = new URLSearchParams();
  if (filters.service_type) params.set("service_type", filters.service_type);
  if (filters.state) params.set("state", filters.state);
  if (filters.zip) params.set("zip", filters.zip);
  if (filters.radius) params.set("radius", String(filters.radius));
  const qs = params.toString();
  return apiFetch(`/workers${qs ? `?${qs}` : ""}`);
}

export async function getWorker(id) {
  return apiFetch(`/workers/${id}`);
}

export async function registerWorker(data) {
  return apiFetch("/workers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function rateWorker(workerId, rating, review) {
  return apiFetch(`/workers/${workerId}/rate`, {
    method: "POST",
    body: JSON.stringify({ rating, review }),
  });
}

// ─── My Items (HTTP API) ──────────────────────────────────────────────────────

export async function getMyListings() {
  return apiFetch("/my/listings");
}

export async function getMyBids() {
  return apiFetch("/my/bids");
}

export async function getMyActiveTasks() {
  return apiFetch("/my/active-tasks");
}

// ─── Firebase Callable Wrappers ───────────────────────────────────────────────

export async function callCreateListing(data) {
  try {
    const callable = httpsCallable(functions, "createMarketplaceListing");
    const result = await callable(data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error creating listing (callable):", error);
    return { success: false, data: null, error: error.message };
  }
}

export async function callSubmitBid(data) {
  try {
    const callable = httpsCallable(functions, "submitBid");
    const result = await callable(data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error submitting bid (callable):", error);
    return { success: false, data: null, error: error.message };
  }
}

export async function callAcceptBid(data) {
  try {
    const callable = httpsCallable(functions, "acceptBid");
    const result = await callable(data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error accepting bid (callable):", error);
    return { success: false, data: null, error: error.message };
  }
}

export async function callCompleteJob(data) {
  try {
    const callable = httpsCallable(functions, "completeMarketplaceJob");
    const result = await callable(data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error completing job (callable):", error);
    return { success: false, data: null, error: error.message };
  }
}

export async function callRateWorker(data) {
  try {
    const callable = httpsCallable(functions, "rateWorker");
    const result = await callable(data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error rating worker (callable):", error);
    return { success: false, data: null, error: error.message };
  }
}

export async function callRegisterWorker(data) {
  try {
    const callable = httpsCallable(functions, "registerWorker");
    const result = await callable(data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error registering worker (callable):", error);
    return { success: false, data: null, error: error.message };
  }
}

export async function callGetListingsForWorker(data) {
  try {
    const callable = httpsCallable(functions, "getMarketplaceListings");
    const result = await callable(data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error getting listings (callable):", error);
    return { success: false, data: null, error: error.message };
  }
}

export async function callSearchWorkers(data) {
  try {
    const callable = httpsCallable(functions, "searchWorkers");
    const result = await callable(data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error searching workers (callable):", error);
    return { success: false, data: null, error: error.message };
  }
}
