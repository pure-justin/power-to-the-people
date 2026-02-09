/**
 * Project API - Cloud Functions
 *
 * HTTP API endpoints for project/pipeline operations.
 * All endpoints require API key authentication with appropriate scopes.
 *
 * Routes:
 *   GET    /projects              — List projects (scoped to API key owner)
 *   GET    /projects/:id          — Get project detail + tasks + timeline
 *   POST   /projects/:id/advance  — Advance pipeline stage
 *   GET    /projects/:id/tasks    — List tasks with marketplace status
 *   POST   /projects/:id/tasks    — Create manual task
 *   POST   /projects/:id/tasks/:tid/complete — Complete task
 *   GET    /projects/:id/timeline — Get full project timeline
 *   POST   /projects/:id/equipment — Set equipment selection
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { validateApiKeyFromRequest, ApiKeyScope } from "./apiKeys";
import {
  onPipelineTaskCompleted,
  getPipelineStatus,
} from "./pipelineAutoTasks";

// ─── CORS Helper ───────────────────────────────────────────────────────────────

function setCors(res: functions.Response): void {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function handleOptions(
  req: functions.https.Request,
  res: functions.Response,
): boolean {
  if (req.method === "OPTIONS") {
    setCors(res);
    res.status(204).send("");
    return true;
  }
  return false;
}

// ─── Error Helper ──────────────────────────────────────────────────────────────

function errorStatus(error: any): number {
  if (error.code === "unauthenticated") return 401;
  if (error.code === "permission-denied") return 403;
  if (error.code === "resource-exhausted") return 429;
  if (error.code === "not-found") return 404;
  return 500;
}

// ─── Valid Pipeline Stages (must match projectPipeline.ts) ─────────────────────

const PIPELINE_STAGES = [
  "lead",
  "qualified",
  "proposal",
  "sold",
  "survey",
  "design",
  "engineering",
  "permit_submitted",
  "permit_approved",
  "scheduled",
  "installing",
  "inspection",
  "pto_submitted",
  "pto_approved",
  "activated",
  "monitoring",
] as const;

const STAGE_TO_PHASE: Record<string, string> = {
  lead: "acquisition",
  qualified: "acquisition",
  proposal: "sales",
  sold: "sales",
  survey: "pre_construction",
  design: "pre_construction",
  engineering: "pre_construction",
  permit_submitted: "pre_construction",
  permit_approved: "pre_construction",
  scheduled: "construction",
  installing: "construction",
  inspection: "construction",
  pto_submitted: "activation",
  pto_approved: "activation",
  activated: "activation",
  monitoring: "activation",
};

// ─── Route Parser ──────────────────────────────────────────────────────────────

/**
 * Parse the URL path into route segments.
 * Expected shapes:
 *   /projects
 *   /projects/:id
 *   /projects/:id/advance
 *   /projects/:id/tasks
 *   /projects/:id/tasks/:tid/complete
 *   /projects/:id/timeline
 *   /projects/:id/equipment
 */
function parsePath(path: string): {
  projectId?: string;
  action?: string;
  taskId?: string;
  subAction?: string;
} {
  // Remove leading/trailing slashes, split
  const parts = path.replace(/^\/+|\/+$/g, "").split("/");

  // Remove "projects" prefix if present (may be "projectApi/projects" or just "projects")
  // The Cloud Functions URL puts the function name as the first segment
  // e.g. /projectApi/projects/abc123/tasks
  // We need to find where "projects" starts in the path
  let startIdx = parts.indexOf("projects");
  if (startIdx === -1) {
    // Maybe the path is just the segments after the function name
    // e.g., /abc123/tasks when the function is called as projectApi
    startIdx = -1; // Will be handled below
  }

  if (startIdx === -1) {
    // No "projects" in path — treat all parts as relative
    // e.g. /:id/tasks
    if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) {
      return {};
    }
    return parseRelativeSegments(parts);
  }

  // Segments after "projects"
  const segments = parts.slice(startIdx + 1);
  return parseRelativeSegments(segments);
}

function parseRelativeSegments(segments: string[]): {
  projectId?: string;
  action?: string;
  taskId?: string;
  subAction?: string;
} {
  if (segments.length === 0) {
    return {}; // GET /projects
  }
  if (segments.length === 1) {
    return { projectId: segments[0] }; // GET /projects/:id
  }
  if (segments.length === 2) {
    return { projectId: segments[0], action: segments[1] }; // /projects/:id/advance, /tasks, /timeline, /equipment
  }
  if (segments.length === 3) {
    return {
      projectId: segments[0],
      action: segments[1],
      taskId: segments[2],
    };
  }
  if (segments.length >= 4) {
    return {
      projectId: segments[0],
      action: segments[1],
      taskId: segments[2],
      subAction: segments[3],
    }; // /projects/:id/tasks/:tid/complete
  }
  return {};
}

// ─── Handlers ──────────────────────────────────────────────────────────────────

/**
 * GET /projects — List projects scoped to API key owner
 */
async function handleListProjects(
  req: functions.https.Request,
  res: functions.Response,
  userId: string,
): Promise<void> {
  const db = admin.firestore();
  let query: admin.firestore.Query = db
    .collection("projects")
    .where("userId", "==", userId);

  // Status filter
  if (req.query.status) {
    query = query.where("status", "==", req.query.status as string);
  }

  // Pagination
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;

  if (offset > 0) {
    query = query.offset(offset);
  }
  query = query.limit(limit);

  const snapshot = await query.get();
  const projects = snapshot.docs.map((doc) => ({
    id: doc.id,
    status: doc.data().status,
    address: doc.data().address,
    systemSize: doc.data().systemSize || doc.data().system_size,
    customerName: doc.data().customerName || doc.data().customer_name,
    createdAt: doc.data().createdAt,
    updatedAt: doc.data().updatedAt,
    pipeline: doc.data().pipeline,
  }));

  res.status(200).json({
    success: true,
    count: projects.length,
    offset,
    data: projects,
  });
}

/**
 * GET /projects/:id — Get project detail + tasks + timeline
 */
async function handleGetProject(
  _req: functions.https.Request,
  res: functions.Response,
  userId: string,
  projectId: string,
): Promise<void> {
  const db = admin.firestore();
  const projectRef = db.collection("projects").doc(projectId);
  const projectSnap = await projectRef.get();

  if (!projectSnap.exists) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const projectData = projectSnap.data()!;

  // Multi-tenant check: project must belong to the API key owner
  if (projectData.userId !== userId) {
    res.status(403).json({ error: "Access denied to this project" });
    return;
  }

  // Get pipeline tasks
  const pipelineStatus = await getPipelineStatus(projectId);

  // Get timeline
  const timelineSnap = await projectRef
    .collection("timeline")
    .orderBy("timestamp", "desc")
    .limit(50)
    .get();
  const timeline = timelineSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  res.status(200).json({
    success: true,
    data: {
      id: projectSnap.id,
      ...projectData,
      pipeline_status: pipelineStatus,
      timeline,
    },
  });
}

/**
 * POST /projects/:id/advance — Advance pipeline stage
 */
async function handleAdvanceStage(
  req: functions.https.Request,
  res: functions.Response,
  userId: string,
  projectId: string,
): Promise<void> {
  const db = admin.firestore();
  const projectRef = db.collection("projects").doc(projectId);
  const projectSnap = await projectRef.get();

  if (!projectSnap.exists) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const projectData = projectSnap.data()!;
  if (projectData.userId !== userId) {
    res.status(403).json({ error: "Access denied to this project" });
    return;
  }

  const { new_stage, notes } = req.body;

  if (!new_stage) {
    res.status(400).json({ error: "new_stage is required" });
    return;
  }

  const currentStatus = projectData.status || "lead";
  const currentIndex = PIPELINE_STAGES.indexOf(
    currentStatus as (typeof PIPELINE_STAGES)[number],
  );

  // Validate target stage
  let targetStage: string;

  if (new_stage === "cancelled") {
    targetStage = "cancelled";
  } else {
    const targetIndex = PIPELINE_STAGES.indexOf(
      new_stage as (typeof PIPELINE_STAGES)[number],
    );
    if (targetIndex === -1) {
      res.status(400).json({
        error: `Invalid stage: ${new_stage}. Valid stages: ${PIPELINE_STAGES.join(", ")}, cancelled`,
      });
      return;
    }
    if (targetIndex <= currentIndex) {
      res.status(400).json({
        error: `Cannot move backward from "${currentStatus}" to "${new_stage}"`,
      });
      return;
    }
    targetStage = new_stage;
  }

  const phase =
    targetStage === "cancelled" ? "cancelled" : STAGE_TO_PHASE[targetStage];

  // Update the project
  const updateData: Record<string, unknown> = {
    status: targetStage,
    "pipeline.current_phase": phase,
    "pipeline.current_step": targetStage,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await projectRef.update(updateData);

  // Add timeline entry
  await projectRef.collection("timeline").add({
    event: "stage_advanced",
    from: currentStatus,
    to: targetStage,
    phase,
    notes: notes || "",
    changedBy: `api_key:${userId}`,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  res.status(200).json({
    success: true,
    projectId,
    previousStage: currentStatus,
    newStage: targetStage,
    phase,
  });
}

/**
 * GET /projects/:id/tasks — List tasks with marketplace status
 */
async function handleListTasks(
  _req: functions.https.Request,
  res: functions.Response,
  userId: string,
  projectId: string,
): Promise<void> {
  const db = admin.firestore();

  // Verify project access
  const projectSnap = await db.collection("projects").doc(projectId).get();
  if (!projectSnap.exists) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (projectSnap.data()!.userId !== userId) {
    res.status(403).json({ error: "Access denied to this project" });
    return;
  }

  // Get pipeline tasks
  const tasksSnap = await db
    .collection(`projects/${projectId}/pipeline_tasks`)
    .orderBy("order", "asc")
    .get();

  const tasks = tasksSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data.type,
      order: data.order,
      phase: data.phase,
      dependency_status: data.dependency_status,
      depends_on: data.depends_on,
      allow_diy: data.allow_diy,
      marketplace_listing_id: data.marketplace_listing_id,
      created_at: data.created_at,
      completed_at: data.completed_at,
      completed_by: data.completed_by,
    };
  });

  // Fetch linked marketplace listings for tasks that have them
  const listingIds = tasks
    .map((t) => t.marketplace_listing_id)
    .filter((id): id is string => id !== null && id !== undefined);

  const listingsMap: Record<string, any> = {};
  if (listingIds.length > 0) {
    // Firestore 'in' queries max out at 30, batch if needed
    const batches = [];
    for (let i = 0; i < listingIds.length; i += 30) {
      batches.push(listingIds.slice(i, i + 30));
    }
    for (const batch of batches) {
      const listingSnap = await db
        .collection("marketplace_listings")
        .where(admin.firestore.FieldPath.documentId(), "in", batch)
        .get();
      listingSnap.docs.forEach((doc) => {
        listingsMap[doc.id] = {
          id: doc.id,
          status: doc.data().status,
          bid_count: doc.data().bid_count,
          winning_bid: doc.data().winning_bid,
          service_type: doc.data().service_type,
        };
      });
    }
  }

  // Attach listing info to tasks
  const enrichedTasks = tasks.map((task) => ({
    ...task,
    marketplace_listing: task.marketplace_listing_id
      ? listingsMap[task.marketplace_listing_id] || null
      : null,
  }));

  res.status(200).json({
    success: true,
    count: enrichedTasks.length,
    data: enrichedTasks,
  });
}

/**
 * POST /projects/:id/tasks — Create manual task
 */
async function handleCreateTask(
  req: functions.https.Request,
  res: functions.Response,
  userId: string,
  projectId: string,
): Promise<void> {
  const db = admin.firestore();

  // Verify project access
  const projectSnap = await db.collection("projects").doc(projectId).get();
  if (!projectSnap.exists) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (projectSnap.data()!.userId !== userId) {
    res.status(403).json({ error: "Access denied to this project" });
    return;
  }

  const { type, title, description, depends_on } = req.body;

  if (!type || !title) {
    res.status(400).json({ error: "type and title are required" });
    return;
  }

  // Validate depends_on references exist
  const dependsOnList: string[] = Array.isArray(depends_on) ? depends_on : [];

  if (dependsOnList.length > 0) {
    const tasksRef = db.collection(`projects/${projectId}/pipeline_tasks`);
    for (const depType of dependsOnList) {
      const depSnap = await tasksRef.doc(depType).get();
      if (!depSnap.exists) {
        res.status(400).json({
          error: `Dependency task "${depType}" not found in project pipeline`,
        });
        return;
      }
    }
  }

  // Determine dependency_status
  let dependencyStatus: string = "ready";
  if (dependsOnList.length > 0) {
    // Check if all dependencies are completed
    const tasksRef = db.collection(`projects/${projectId}/pipeline_tasks`);
    let allMet = true;
    for (const depType of dependsOnList) {
      const depSnap = await tasksRef.doc(depType).get();
      if (depSnap.exists && depSnap.data()?.dependency_status !== "completed") {
        allMet = false;
        break;
      }
    }
    dependencyStatus = allMet ? "ready" : "blocked";
  }

  // Get order: find max order in existing tasks, add 1
  const existingTasks = await db
    .collection(`projects/${projectId}/pipeline_tasks`)
    .orderBy("order", "desc")
    .limit(1)
    .get();
  const maxOrder = existingTasks.empty
    ? 0
    : existingTasks.docs[0].data().order || 0;

  const taskData = {
    type,
    title,
    description: description || "",
    order: maxOrder + 1,
    depends_on: dependsOnList,
    dependency_status: dependencyStatus,
    phase: "manual",
    allow_diy: false,
    marketplace_listing_id: null,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    completed_at: null,
    completed_by: null,
    created_by: `api_key:${userId}`,
    manual: true,
  };

  const taskRef = await db
    .collection(`projects/${projectId}/pipeline_tasks`)
    .add(taskData);

  res.status(201).json({
    success: true,
    taskId: taskRef.id,
    projectId,
    type,
    dependency_status: dependencyStatus,
  });
}

/**
 * POST /projects/:id/tasks/:tid/complete — Complete task
 */
async function handleCompleteTask(
  req: functions.https.Request,
  res: functions.Response,
  userId: string,
  projectId: string,
  taskId: string,
): Promise<void> {
  const db = admin.firestore();

  // Verify project access
  const projectSnap = await db.collection("projects").doc(projectId).get();
  if (!projectSnap.exists) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (projectSnap.data()!.userId !== userId) {
    res.status(403).json({ error: "Access denied to this project" });
    return;
  }

  // Verify task exists
  const taskRef = db.doc(`projects/${projectId}/pipeline_tasks/${taskId}`);
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const taskData = taskSnap.data()!;
  if (taskData.dependency_status === "completed") {
    res.status(400).json({ error: "Task is already completed" });
    return;
  }

  if (taskData.dependency_status === "blocked") {
    res.status(400).json({
      error: "Task is blocked by unfinished dependencies",
      depends_on: taskData.depends_on,
    });
    return;
  }

  const { completion_notes, deliverables } = req.body;

  // Use the auto-task engine for cascade effects
  await onPipelineTaskCompleted(projectId, taskId);

  // Also store completion metadata
  await taskRef.update({
    completed_by: `api_key:${userId}`,
    completion_notes: completion_notes || "",
    deliverables: deliverables || [],
  });

  // Get updated pipeline status
  const pipelineStatus = await getPipelineStatus(projectId);

  res.status(200).json({
    success: true,
    projectId,
    taskId,
    pipeline_status: {
      totalTasks: pipelineStatus.totalTasks,
      completedTasks: pipelineStatus.completedTasks,
      currentPhase: pipelineStatus.currentPhase,
    },
  });
}

/**
 * GET /projects/:id/timeline — Get full project timeline
 */
async function handleGetTimeline(
  _req: functions.https.Request,
  res: functions.Response,
  userId: string,
  projectId: string,
): Promise<void> {
  const db = admin.firestore();

  // Verify project access
  const projectSnap = await db.collection("projects").doc(projectId).get();
  if (!projectSnap.exists) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (projectSnap.data()!.userId !== userId) {
    res.status(403).json({ error: "Access denied to this project" });
    return;
  }

  const timelineSnap = await db
    .collection(`projects/${projectId}/timeline`)
    .orderBy("timestamp", "desc")
    .get();

  const timeline = timelineSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Also include inline pipeline.timeline if it exists
  const projectData = projectSnap.data()!;
  const inlineTimeline = projectData.pipeline?.timeline || [];

  res.status(200).json({
    success: true,
    projectId,
    currentStage: projectData.status,
    count: timeline.length,
    data: timeline,
    inline_timeline: inlineTimeline,
  });
}

/**
 * POST /projects/:id/equipment — Set equipment selection
 */
async function handleSetEquipment(
  req: functions.https.Request,
  res: functions.Response,
  userId: string,
  projectId: string,
): Promise<void> {
  const db = admin.firestore();
  const projectRef = db.collection("projects").doc(projectId);
  const projectSnap = await projectRef.get();

  if (!projectSnap.exists) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (projectSnap.data()!.userId !== userId) {
    res.status(403).json({ error: "Access denied to this project" });
    return;
  }

  const { panels, inverter, battery, mounting } = req.body;

  if (!panels && !inverter && !battery && !mounting) {
    res.status(400).json({
      error:
        "At least one equipment field is required: panels, inverter, battery, mounting",
    });
    return;
  }

  // Validate equipment IDs exist in solar_equipment collection
  const equipmentIds: string[] = [];
  if (panels) equipmentIds.push(panels);
  if (inverter) equipmentIds.push(inverter);
  if (battery) equipmentIds.push(battery);
  if (mounting) equipmentIds.push(mounting);

  const equipmentDocs: Record<string, any> = {};
  for (const eqId of equipmentIds) {
    const eqSnap = await db.collection("solar_equipment").doc(eqId).get();
    if (!eqSnap.exists) {
      res.status(400).json({
        error: `Equipment not found: ${eqId}`,
      });
      return;
    }
    equipmentDocs[eqId] = { id: eqSnap.id, ...eqSnap.data() };
  }

  // Build equipment selection object
  const equipmentSelection: Record<string, any> = {};
  if (panels) {
    equipmentSelection.panels = {
      equipment_id: panels,
      manufacturer: equipmentDocs[panels].manufacturer,
      model: equipmentDocs[panels].model,
      wattage: equipmentDocs[panels].wattage_w,
      feoc_compliant: equipmentDocs[panels].feoc_compliant || false,
      domestic_content_eligible:
        equipmentDocs[panels].domestic_content_eligible || false,
    };
  }
  if (inverter) {
    equipmentSelection.inverter = {
      equipment_id: inverter,
      manufacturer: equipmentDocs[inverter].manufacturer,
      model: equipmentDocs[inverter].model,
    };
  }
  if (battery) {
    equipmentSelection.battery = {
      equipment_id: battery,
      manufacturer: equipmentDocs[battery].manufacturer,
      model: equipmentDocs[battery].model,
    };
  }
  if (mounting) {
    equipmentSelection.mounting = {
      equipment_id: mounting,
      manufacturer: equipmentDocs[mounting].manufacturer,
      model: equipmentDocs[mounting].model,
    };
  }

  await projectRef.update({
    equipment: equipmentSelection,
    has_battery: !!battery,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Add timeline entry
  await projectRef.collection("timeline").add({
    event: "equipment_selected",
    equipment: equipmentSelection,
    changedBy: `api_key:${userId}`,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  res.status(200).json({
    success: true,
    projectId,
    equipment: equipmentSelection,
  });
}

// ─── Main Router ───────────────────────────────────────────────────────────────

/**
 * projectApi — Single onRequest handler routing all project/pipeline endpoints.
 *
 * @function projectApi
 * @type onRequest
 * @auth api_key
 * @scope read_projects | write_projects
 */
export const projectApi = functions
  .runWith({ timeoutSeconds: 60, memory: "512MB" })
  .https.onRequest(async (req, res) => {
    if (handleOptions(req, res)) return;
    setCors(res);

    try {
      const route = parsePath(req.path);

      // Determine required scope based on method
      const isWrite =
        req.method === "POST" || req.method === "PUT" || req.method === "PATCH";
      const requiredScope = isWrite
        ? ApiKeyScope.WRITE_PROJECTS
        : ApiKeyScope.READ_PROJECTS;

      // Authenticate
      const apiKeyData = await validateApiKeyFromRequest(req, requiredScope);
      const userId = apiKeyData.userId;

      // ─── Route Dispatch ────────────────────────────────────────────────

      // GET /projects
      if (!route.projectId && req.method === "GET") {
        await handleListProjects(req, res, userId);
        return;
      }

      // GET /projects/:id
      if (route.projectId && !route.action && req.method === "GET") {
        await handleGetProject(req, res, userId, route.projectId);
        return;
      }

      // POST /projects/:id/advance
      if (
        route.projectId &&
        route.action === "advance" &&
        req.method === "POST"
      ) {
        await handleAdvanceStage(req, res, userId, route.projectId);
        return;
      }

      // GET /projects/:id/tasks
      if (
        route.projectId &&
        route.action === "tasks" &&
        !route.taskId &&
        req.method === "GET"
      ) {
        await handleListTasks(req, res, userId, route.projectId);
        return;
      }

      // POST /projects/:id/tasks
      if (
        route.projectId &&
        route.action === "tasks" &&
        !route.taskId &&
        req.method === "POST"
      ) {
        await handleCreateTask(req, res, userId, route.projectId);
        return;
      }

      // POST /projects/:id/tasks/:tid/complete
      if (
        route.projectId &&
        route.action === "tasks" &&
        route.taskId &&
        route.subAction === "complete" &&
        req.method === "POST"
      ) {
        await handleCompleteTask(
          req,
          res,
          userId,
          route.projectId,
          route.taskId,
        );
        return;
      }

      // GET /projects/:id/timeline
      if (
        route.projectId &&
        route.action === "timeline" &&
        req.method === "GET"
      ) {
        await handleGetTimeline(req, res, userId, route.projectId);
        return;
      }

      // POST /projects/:id/equipment
      if (
        route.projectId &&
        route.action === "equipment" &&
        req.method === "POST"
      ) {
        await handleSetEquipment(req, res, userId, route.projectId);
        return;
      }

      // No matching route
      res.status(404).json({
        error: "Not found",
        available_routes: [
          "GET /projects",
          "GET /projects/:id",
          "POST /projects/:id/advance",
          "GET /projects/:id/tasks",
          "POST /projects/:id/tasks",
          "POST /projects/:id/tasks/:tid/complete",
          "GET /projects/:id/timeline",
          "POST /projects/:id/equipment",
        ],
      });
    } catch (error: any) {
      console.error("Project API error:", error);
      const status = errorStatus(error);
      res.status(status).json({
        error: error.message || "Internal server error",
      });
    }
  });
