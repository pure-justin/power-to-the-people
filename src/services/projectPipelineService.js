/**
 * Project Pipeline Service
 * Wraps both HTTP API endpoints and Firebase callable functions
 * for project management, pipeline stages, tasks, and timeline.
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import app from "./firebase";

const functions = getFunctions(app, "us-central1");
const API_BASE =
  "https://us-central1-power-to-the-people-vpp.cloudfunctions.net/projectApi";

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

// ─── Projects (HTTP API) ──────────────────────────────────────────────────────

export async function getProjects(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.stage) params.set("stage", filters.stage);
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return apiFetch(`${qs ? `?${qs}` : ""}`);
}

export async function getProject(id) {
  return apiFetch(`/${id}`);
}

export async function advanceStage(projectId, data = {}) {
  return apiFetch(`/${projectId}/advance`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Tasks (HTTP API) ─────────────────────────────────────────────────────────

export async function getProjectTasks(projectId) {
  return apiFetch(`/${projectId}/tasks`);
}

export async function createTask(projectId, taskData) {
  return apiFetch(`/${projectId}/tasks`, {
    method: "POST",
    body: JSON.stringify(taskData),
  });
}

export async function completeTask(projectId, taskId, data = {}) {
  return apiFetch(`/${projectId}/tasks/${taskId}/complete`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Timeline & Equipment (HTTP API) ──────────────────────────────────────────

export async function getTimeline(projectId) {
  return apiFetch(`/${projectId}/timeline`);
}

export async function setEquipment(projectId, equipment) {
  return apiFetch(`/${projectId}/equipment`, {
    method: "POST",
    body: JSON.stringify(equipment),
  });
}

// ─── Firebase Callable Wrappers ───────────────────────────────────────────────

export async function callAdvanceProjectStage(data) {
  try {
    const callable = httpsCallable(functions, "advanceProjectStage");
    const result = await callable(data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error advancing project stage (callable):", error);
    return { success: false, data: null, error: error.message };
  }
}

export async function callCreateProjectTask(data) {
  try {
    const callable = httpsCallable(functions, "createProjectTask");
    const result = await callable(data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error creating project task (callable):", error);
    return { success: false, data: null, error: error.message };
  }
}

export async function callCompleteProjectTask(data) {
  try {
    const callable = httpsCallable(functions, "completeProjectTask");
    const result = await callable(data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error completing project task (callable):", error);
    return { success: false, data: null, error: error.message };
  }
}

export async function callGetProjectTimeline(data) {
  try {
    const callable = httpsCallable(functions, "getProjectTimeline");
    const result = await callable(data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error getting project timeline (callable):", error);
    return { success: false, data: null, error: error.message };
  }
}

export async function callAssignProjectTask(data) {
  try {
    const callable = httpsCallable(functions, "assignProjectTask");
    const result = await callable(data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error assigning project task (callable):", error);
    return { success: false, data: null, error: error.message };
  }
}
