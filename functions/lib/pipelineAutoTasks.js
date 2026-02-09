"use strict";
/**
 * Pipeline Auto-Tasks — Dependency-chained task creation for solar projects
 *
 * The nervous system connecting project pipeline stages to marketplace listings.
 * When a project hits "sold", this module creates 10 tasks with dependency chains
 * and cascades completions through the pipeline.
 *
 * Task chain:
 *   1. site_survey (ready immediately, DIY-able)
 *   2. cad_design (after site_survey)
 *   3. engineering_stamp (after cad_design)
 *   4. permit_preparation (after engineering_stamp)
 *   5. permit_submission (after permit_preparation)
 *   6. roof_installation (after permit_submission)
 *   7. electrical_installation (after permit_submission)
 *   8. battery_installation (after electrical_installation, conditional)
 *   9. inspection_coordination (after roof + electrical)
 *   10. pto_submission (after inspection_coordination)
 *
 * Collections:
 *   projects/{pid}/pipeline_tasks/{taskId} — Task records with dependency tracking
 *   marketplace_listings                   — Auto-created when tasks become ready
 *
 * @module pipelineAutoTasks
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPipelineTasks = createPipelineTasks;
exports.openNextTasks = openNextTasks;
exports.onPipelineTaskCompleted = onPipelineTaskCompleted;
exports.getPipelineStatus = getPipelineStatus;
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// ─── Task Definitions ───────────────────────────────────────────────────────────
/**
 * Master task chain definition. Each entry defines a task type, its order in the
 * pipeline, which tasks must be completed before it can start, what pipeline phase
 * it belongs to, whether the homeowner can DIY it, and any conditional flags.
 */
const TASK_CHAIN = [
    {
        type: "site_survey",
        order: 1,
        depends_on: [],
        phase: "survey",
        allow_diy: true,
    },
    {
        type: "cad_design",
        order: 2,
        depends_on: ["site_survey"],
        phase: "design",
        allow_diy: false,
    },
    {
        type: "engineering_stamp",
        order: 3,
        depends_on: ["cad_design"],
        phase: "engineering",
        allow_diy: false,
    },
    {
        type: "permit_preparation",
        order: 4,
        depends_on: ["engineering_stamp"],
        phase: "permit_submitted",
        allow_diy: false,
    },
    {
        type: "permit_submission",
        order: 5,
        depends_on: ["permit_preparation"],
        phase: "permit_submitted",
        allow_diy: false,
    },
    {
        type: "roof_installation",
        order: 6,
        depends_on: ["permit_submission"],
        phase: "installing",
        allow_diy: false,
    },
    {
        type: "electrical_installation",
        order: 7,
        depends_on: ["permit_submission"],
        phase: "installing",
        allow_diy: false,
    },
    {
        type: "battery_installation",
        order: 8,
        depends_on: ["electrical_installation"],
        phase: "installing",
        allow_diy: false,
        conditional: "has_battery",
    },
    {
        type: "inspection_coordination",
        order: 9,
        depends_on: ["roof_installation", "electrical_installation"],
        phase: "inspection",
        allow_diy: false,
    },
    {
        type: "pto_submission",
        order: 10,
        depends_on: ["inspection_coordination"],
        phase: "pto_submitted",
        allow_diy: false,
    },
];
// ─── Functions ──────────────────────────────────────────────────────────────────
/**
 * Create all pipeline tasks for a project that has been sold.
 *
 * Writes 10 tasks (9 if no battery) into the `projects/{pid}/pipeline_tasks`
 * subcollection. The site_survey task starts as "ready"; everything else starts
 * as "blocked" until its dependencies are completed.
 *
 * @function createPipelineTasks
 * @param projectId - The Firestore project document ID
 * @param projectData - The project document data (needs `has_battery` field)
 * @returns Resolves when all tasks are written
 */
async function createPipelineTasks(projectId, projectData) {
    var _a;
    const hasBattery = (projectData === null || projectData === void 0 ? void 0 : projectData.has_battery) === true ||
        ((_a = projectData === null || projectData === void 0 ? void 0 : projectData.system) === null || _a === void 0 ? void 0 : _a.has_battery) === true ||
        (projectData === null || projectData === void 0 ? void 0 : projectData.battery) === true;
    const tasksRef = db.collection(`projects/${projectId}/pipeline_tasks`);
    // Check if tasks already exist to prevent duplicates
    const existing = await tasksRef.limit(1).get();
    if (!existing.empty) {
        console.warn(`Pipeline tasks already exist for project ${projectId}, skipping creation`);
        return;
    }
    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();
    for (const taskDef of TASK_CHAIN) {
        // Skip battery_installation if project doesn't have a battery
        if (taskDef.conditional === "has_battery" && !hasBattery) {
            continue;
        }
        const taskRef = tasksRef.doc(taskDef.type);
        // Resolve dependency status: if no deps, task is immediately ready.
        // Also handle the case where battery_installation is skipped — if a task
        // depends on battery_installation and there's no battery, remove that dep.
        const resolvedDeps = taskDef.depends_on.filter((dep) => {
            if (dep === "battery_installation" && !hasBattery) {
                return false;
            }
            return true;
        });
        const isReady = resolvedDeps.length === 0;
        const taskData = {
            type: taskDef.type,
            order: taskDef.order,
            depends_on: resolvedDeps,
            dependency_status: isReady ? "ready" : "blocked",
            phase: taskDef.phase,
            allow_diy: taskDef.allow_diy,
            marketplace_listing_id: null,
            created_at: now,
            completed_at: null,
            completed_by: null,
        };
        batch.set(taskRef, taskData);
    }
    batch.set(db.collection("projects").doc(projectId), {
        pipeline_tasks_created: true,
        pipeline_tasks_created_at: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    await batch.commit();
    console.log(`Created ${hasBattery ? 10 : 9} pipeline tasks for project ${projectId}`);
    // Auto-create marketplace listing for the initial ready task (site_survey)
    await createMarketplaceListingForTask(projectId, "site_survey");
}
/**
 * Check all blocked tasks and open any whose dependencies are fully completed.
 *
 * For each newly-ready task, automatically creates a marketplace listing so
 * workers can bid on it. Returns the list of task types that transitioned
 * from "blocked" to "ready".
 *
 * @function openNextTasks
 * @param projectId - The Firestore project document ID
 * @returns Array of task types that were opened (transitioned to "ready")
 */
async function openNextTasks(projectId) {
    const tasksRef = db.collection(`projects/${projectId}/pipeline_tasks`);
    // Get all tasks for this project
    const allTasksSnap = await tasksRef.get();
    if (allTasksSnap.empty) {
        return [];
    }
    // Build a map of task type -> dependency_status
    const statusMap = {};
    allTasksSnap.forEach((doc) => {
        const task = doc.data();
        statusMap[task.type] = task.dependency_status;
    });
    const openedTasks = [];
    const batch = db.batch();
    let batchHasWrites = false;
    // Check each blocked task to see if its dependencies are all completed
    allTasksSnap.forEach((doc) => {
        const task = doc.data();
        if (task.dependency_status !== "blocked") {
            return; // Only process blocked tasks
        }
        // Check if ALL dependencies are completed
        const allDepsMet = task.depends_on.every((dep) => statusMap[dep] === "completed");
        if (allDepsMet) {
            batch.update(doc.ref, {
                dependency_status: "ready",
            });
            batchHasWrites = true;
            openedTasks.push(task.type);
        }
    });
    if (batchHasWrites) {
        await batch.commit();
    }
    // Create marketplace listings for each newly-ready task
    for (const taskType of openedTasks) {
        await createMarketplaceListingForTask(projectId, taskType);
    }
    if (openedTasks.length > 0) {
        console.log(`Opened ${openedTasks.length} tasks for project ${projectId}: ${openedTasks.join(", ")}`);
    }
    return openedTasks;
}
/**
 * Handle completion of a pipeline task.
 *
 * Marks the task as "completed", cascades to open any newly-unblocked tasks via
 * `openNextTasks()`, and advances the project stage if the completed task's phase
 * differs from the current project phase.
 *
 * @function onPipelineTaskCompleted
 * @param projectId - The Firestore project document ID
 * @param taskType - The task type that was completed (e.g. "site_survey")
 * @returns Resolves when completion is fully processed
 */
async function onPipelineTaskCompleted(projectId, taskType) {
    const taskRef = db.doc(`projects/${projectId}/pipeline_tasks/${taskType}`);
    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) {
        console.error(`Pipeline task ${taskType} not found for project ${projectId}`);
        return;
    }
    const task = taskSnap.data();
    if (task.dependency_status === "completed") {
        console.warn(`Task ${taskType} already completed for project ${projectId}, skipping`);
        return;
    }
    // Mark the task as completed
    await taskRef.update({
        dependency_status: "completed",
        completed_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Cascade: open any tasks whose dependencies are now fully met
    const openedTasks = await openNextTasks(projectId);
    // Check if we should advance the project stage
    const projectRef = db.collection("projects").doc(projectId);
    const projectSnap = await projectRef.get();
    if (projectSnap.exists) {
        const projectData = projectSnap.data();
        const currentPhase = (projectData === null || projectData === void 0 ? void 0 : projectData.status) || (projectData === null || projectData === void 0 ? void 0 : projectData.pipeline_stage);
        // Advance project stage if the completed task's phase is ahead
        if (task.phase && task.phase !== currentPhase) {
            await projectRef.update({
                status: task.phase,
                pipeline_stage: task.phase,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Advanced project ${projectId} from "${currentPhase}" to "${task.phase}"`);
        }
    }
    // Log completion in the project timeline
    await db.collection("projects").doc(projectId).collection("timeline").add({
        event: "pipeline_task_completed",
        task_type: taskType,
        phase: task.phase,
        opened_tasks: openedTasks,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Pipeline task "${taskType}" completed for project ${projectId}. ` +
        `Opened ${openedTasks.length} downstream tasks.`);
}
/**
 * Get the full pipeline status for a project.
 *
 * Returns all tasks with their current dependency status, completion info,
 * and marketplace listing references. Includes summary counts.
 *
 * @function getPipelineStatus
 * @param projectId - The Firestore project document ID
 * @returns Full pipeline status with all tasks and summary
 */
async function getPipelineStatus(projectId) {
    const tasksRef = db.collection(`projects/${projectId}/pipeline_tasks`);
    const tasksSnap = await tasksRef.orderBy("order", "asc").get();
    const tasks = [];
    let completedCount = 0;
    let currentPhase = "survey";
    tasksSnap.forEach((doc) => {
        const task = doc.data();
        tasks.push({ ...task, id: doc.id });
        if (task.dependency_status === "completed") {
            completedCount++;
            currentPhase = task.phase; // Last completed task's phase
        }
    });
    // If no tasks are completed, check for the first ready task's phase
    if (completedCount === 0 && tasks.length > 0) {
        const firstReady = tasks.find((t) => t.dependency_status === "ready");
        if (firstReady) {
            currentPhase = firstReady.phase;
        }
    }
    return {
        projectId,
        totalTasks: tasks.length,
        completedTasks: completedCount,
        currentPhase,
        tasks,
    };
}
// ─── Internal Helpers ───────────────────────────────────────────────────────────
/**
 * Create a marketplace listing for a pipeline task that has become ready.
 *
 * Writes to the `marketplace_listings` collection and links the listing ID
 * back to the pipeline task document.
 *
 * @param projectId - The Firestore project document ID
 * @param taskType - The task type to create a listing for
 */
async function createMarketplaceListingForTask(projectId, taskType) {
    const taskRef = db.doc(`projects/${projectId}/pipeline_tasks/${taskType}`);
    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) {
        return;
    }
    const task = taskSnap.data();
    // Don't create duplicate listings
    if (task.marketplace_listing_id) {
        return;
    }
    // Map pipeline task types to marketplace service types
    const serviceTypeMap = {
        site_survey: "site_survey",
        cad_design: "cad_design",
        engineering_stamp: "engineering_stamp",
        permit_preparation: "permit_submission",
        permit_submission: "permit_submission",
        roof_installation: "roofing",
        electrical_installation: "electrical",
        battery_installation: "battery_install",
        inspection_coordination: "inspection",
        pto_submission: "other",
    };
    // Get project data for context
    const projectSnap = await db.collection("projects").doc(projectId).get();
    const projectData = projectSnap.exists ? projectSnap.data() : {};
    const listingData = {
        service_type: serviceTypeMap[taskType] || "other",
        project_id: projectId,
        pipeline_task_type: taskType,
        requirements: `${formatTaskName(taskType)} needed for project`,
        deliverables: getDefaultDeliverables(taskType),
        budget: null,
        deadline: null,
        project_context: {
            address: (projectData === null || projectData === void 0 ? void 0 : projectData.address) || null,
            system_size: (projectData === null || projectData === void 0 ? void 0 : projectData.systemSize) || (projectData === null || projectData === void 0 ? void 0 : projectData.system_size) || null,
            panel_count: (projectData === null || projectData === void 0 ? void 0 : projectData.panelCount) || (projectData === null || projectData === void 0 ? void 0 : projectData.panel_count) || null,
        },
        status: "open",
        bid_count: 0,
        winning_bid: null,
        allow_diy: task.allow_diy,
        auto_created: true,
        posted_at: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const listingRef = await db
        .collection("marketplace_listings")
        .add(listingData);
    // Link the listing back to the pipeline task
    await taskRef.update({
        marketplace_listing_id: listingRef.id,
        dependency_status: "open",
    });
    console.log(`Created marketplace listing ${listingRef.id} for task "${taskType}" on project ${projectId}`);
}
/**
 * Format a task type slug into a human-readable name.
 * @param taskType - e.g. "site_survey"
 * @returns e.g. "Site Survey"
 */
function formatTaskName(taskType) {
    return taskType
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
/**
 * Get default deliverables for a task type.
 * @param taskType - The pipeline task type
 * @returns Array of expected deliverable strings
 */
function getDefaultDeliverables(taskType) {
    const deliverableMap = {
        site_survey: [
            "Roof measurements and condition photos",
            "Electrical panel photos and specs",
            "Shade analysis",
            "Structural assessment",
        ],
        cad_design: [
            "Panel layout drawing",
            "String diagram",
            "Single-line diagram",
            "Equipment schedule",
        ],
        engineering_stamp: [
            "PE-stamped structural calculations",
            "PE-stamped electrical plans",
        ],
        permit_preparation: [
            "Completed permit application",
            "Supporting documentation package",
        ],
        permit_submission: [
            "Permit application submitted",
            "Confirmation/tracking number",
        ],
        roof_installation: [
            "Racking and panels installed",
            "Installation photos",
            "As-built documentation",
        ],
        electrical_installation: [
            "Inverter and wiring installed",
            "Electrical connections completed",
            "Installation photos",
        ],
        battery_installation: [
            "Battery system installed and configured",
            "Installation photos",
            "Commissioning report",
        ],
        inspection_coordination: [
            "Inspection scheduled",
            "Inspection passed",
            "Inspection report/certificate",
        ],
        pto_submission: [
            "PTO application submitted to utility",
            "Confirmation/tracking number",
        ],
    };
    return deliverableMap[taskType] || ["Task completed"];
}
//# sourceMappingURL=pipelineAutoTasks.js.map