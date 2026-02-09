"use strict";
/**
 * Customer API - Public-facing endpoints for customer self-service
 *
 * Provides endpoints for lead signup, project status tracking,
 * DIY site survey submission, photo uploads, and scheduling preferences.
 *
 * Public endpoints require no auth; authenticated endpoints require
 * a Firebase ID token in the Authorization header.
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
exports.customerApi = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
// ─── CORS Helper ───────────────────────────────────────────────────────────────
function setCors(res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
function handleOptions(req, res) {
    if (req.method === "OPTIONS") {
        setCors(res);
        res.status(204).send("");
        return true;
    }
    return false;
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Generate a 6-character alphanumeric uppercase tracking code
 */
function generateTrackingCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
/**
 * Verify Firebase ID token from Authorization: Bearer <idToken> header.
 * Returns the decoded token or throws.
 */
async function verifyAuthToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        const err = new Error("Missing or invalid Authorization header. Expected: Bearer <idToken>");
        err.code = "unauthenticated";
        throw err;
    }
    const idToken = authHeader.split("Bearer ")[1];
    try {
        return await admin.auth().verifyIdToken(idToken);
    }
    catch (error) {
        const err = new Error("Invalid or expired Firebase ID token");
        err.code = "unauthenticated";
        throw err;
    }
}
/**
 * Map a stage name to a public-friendly description
 */
function getPublicStageName(stage) {
    const stageMap = {
        new: "Application Received",
        contacted: "Initial Contact",
        qualified: "Qualification Complete",
        site_survey: "Site Survey",
        design: "System Design",
        proposal: "Proposal Review",
        contract: "Contract Review",
        permitting: "Permitting",
        installation: "Installation",
        inspection: "Final Inspection",
        pto: "Permission to Operate",
        complete: "Project Complete",
    };
    return stageMap[stage] || stage;
}
/**
 * Map a stage to an estimated timeline description
 */
function getEstimatedTimeline(stage) {
    const timelineMap = {
        new: "We'll reach out within 24 hours",
        contacted: "Qualification review in progress",
        qualified: "Site survey will be scheduled soon",
        site_survey: "Survey results typically ready in 3-5 business days",
        design: "System design typically takes 5-7 business days",
        proposal: "Awaiting your review and approval",
        contract: "Contract processing takes 2-3 business days",
        permitting: "Permits typically take 2-6 weeks depending on jurisdiction",
        installation: "Installation usually completes in 1-3 days",
        inspection: "Inspection typically scheduled within 1-2 weeks",
        pto: "Utility approval typically takes 2-4 weeks",
        complete: "Your system is live!",
    };
    return timelineMap[stage] || "Timeline will be provided soon";
}
/**
 * Map a stage to the next step description
 */
function getNextStep(stage) {
    const nextStepMap = {
        new: "A solar consultant will contact you to discuss your needs",
        contacted: "We're reviewing your information to ensure a great fit",
        qualified: "We'll schedule a site survey at your convenience",
        site_survey: "Our team is evaluating your property for optimal solar placement",
        design: "Our engineers are designing your custom solar system",
        proposal: "Review your personalized proposal and let us know if you have questions",
        contract: "Sign your contract to lock in your pricing",
        permitting: "We're handling all permit applications with your local authority",
        installation: "Our crew will install your solar system on the scheduled date",
        inspection: "A local inspector will verify the installation meets code",
        pto: "Waiting for your utility company to approve grid connection",
        complete: "Enjoy your solar energy! Monitor your production in the app",
    };
    return nextStepMap[stage] || "We'll update you with next steps soon";
}
// ─── Customer API Handler ────────────────────────────────────────────────────
exports.customerApi = functions
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onRequest(async (req, res) => {
    if (handleOptions(req, res))
        return;
    setCors(res);
    // Extract path from URL — strip leading slash
    const urlPath = req.path.replace(/^\//, "");
    try {
        // ─── POST /customer/signup ───────────────────────────────────────
        if (urlPath === "customer/signup" && req.method === "POST") {
            await handleSignup(req, res);
            return;
        }
        // ─── GET /customer/project-status/:code ──────────────────────────
        const statusMatch = urlPath.match(/^customer\/project-status\/([A-Z0-9]{6})$/i);
        if (statusMatch && req.method === "GET") {
            await handleProjectStatus(req, res, statusMatch[1].toUpperCase());
            return;
        }
        // ─── POST /customer/survey (authenticated) ──────────────────────
        if (urlPath === "customer/survey" && req.method === "POST") {
            await handleSurveySubmission(req, res);
            return;
        }
        // ─── POST /customer/survey/photos (authenticated) ───────────────
        if (urlPath === "customer/survey/photos" && req.method === "POST") {
            await handleSurveyPhotos(req, res);
            return;
        }
        // ─── POST /customer/schedule (authenticated) ────────────────────
        if (urlPath === "customer/schedule" && req.method === "POST") {
            await handleSchedule(req, res);
            return;
        }
        // ─── 404 ────────────────────────────────────────────────────────
        res.status(404).json({ error: "Endpoint not found" });
    }
    catch (error) {
        console.error("Customer API error:", error);
        const status = error.code === "unauthenticated"
            ? 401
            : error.code === "permission-denied"
                ? 403
                : 500;
        res.status(status).json({
            error: error.message || "Internal server error",
        });
    }
});
// ─── POST /customer/signup ─────────────────────────────────────────────────
async function handleSignup(req, res) {
    const { name, email, phone, address, utility_company, monthly_bill, referral_code, } = req.body;
    // Validate required fields
    if (!name || !email || !phone || !address) {
        res
            .status(400)
            .json({ error: "name, email, phone, and address are required" });
        return;
    }
    if (!address.street || !address.city || !address.state || !address.zip) {
        res
            .status(400)
            .json({ error: "address must include street, city, state, and zip" });
        return;
    }
    const db = admin.firestore();
    // Check for duplicate email in leads
    const existingLead = await db
        .collection("leads")
        .where("email", "==", email.toLowerCase().trim())
        .limit(1)
        .get();
    if (!existingLead.empty) {
        // Return the existing tracking code instead of creating a duplicate
        const existingData = existingLead.docs[0].data();
        res.status(200).json({
            success: true,
            tracking_code: existingData.tracking_code,
            message: "We already have your information. We'll be in touch within 24 hours.",
        });
        return;
    }
    // Generate unique tracking code
    let trackingCode = generateTrackingCode();
    let codeExists = true;
    let attempts = 0;
    while (codeExists && attempts < 10) {
        const codeCheck = await db
            .collection("leads")
            .where("tracking_code", "==", trackingCode)
            .limit(1)
            .get();
        codeExists = !codeCheck.empty;
        if (codeExists) {
            trackingCode = generateTrackingCode();
        }
        attempts++;
    }
    // Look up referrer if referral_code provided
    let referrerId = null;
    if (referral_code) {
        const referralSnapshot = await db
            .collection("referrals")
            .where("referral_code", "==", referral_code)
            .limit(1)
            .get();
        if (!referralSnapshot.empty) {
            referrerId = referralSnapshot.docs[0].id;
        }
    }
    // Create lead document
    const leadData = {
        customerName: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        address: {
            street: address.street.trim(),
            city: address.city.trim(),
            state: address.state.toUpperCase().trim(),
            zip: address.zip.trim(),
        },
        utility_company: utility_company || null,
        monthly_bill: monthly_bill || null,
        status: "new",
        source: "website",
        tracking_code: trackingCode,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (referrerId) {
        leadData.referral_id = referrerId;
        leadData.referral_code = referral_code;
    }
    await db.collection("leads").add(leadData);
    res.status(201).json({
        success: true,
        tracking_code: trackingCode,
        message: "We'll be in touch within 24 hours",
    });
}
// ─── GET /customer/project-status/:code ────────────────────────────────────
async function handleProjectStatus(req, res, code) {
    const db = admin.firestore();
    // Look up lead by tracking code
    const leadSnapshot = await db
        .collection("leads")
        .where("tracking_code", "==", code)
        .limit(1)
        .get();
    if (leadSnapshot.empty) {
        res.status(404).json({ error: "No project found with that tracking code" });
        return;
    }
    const leadDoc = leadSnapshot.docs[0];
    const leadData = leadDoc.data();
    const currentStage = leadData.status || "new";
    // Build public-safe response from lead data
    const response = {
        success: true,
        status: {
            stage: getPublicStageName(currentStage),
            estimated_timeline: getEstimatedTimeline(currentStage),
            next_step: getNextStep(currentStage),
        },
    };
    // If lead has a linked project, fetch additional project data
    if (leadData.projectId) {
        const projectDoc = await db
            .collection("projects")
            .doc(leadData.projectId)
            .get();
        if (projectDoc.exists) {
            const projectData = projectDoc.data();
            const projectStage = projectData.stage || projectData.status || currentStage;
            response.status.stage = getPublicStageName(projectStage);
            response.status.estimated_timeline = getEstimatedTimeline(projectStage);
            response.status.next_step = getNextStep(projectStage);
            if (projectData.systemSize) {
                response.system_info = {
                    system_size_kw: projectData.systemSize,
                };
            }
        }
    }
    res.status(200).json(response);
}
// ─── POST /customer/survey (authenticated) ─────────────────────────────────
async function handleSurveySubmission(req, res) {
    const decodedToken = await verifyAuthToken(req);
    const { project_id, roof_area_sqft, roof_pitch, roof_orientation, obstructions, electrical_panel_amps, utility_meter_type, notes, } = req.body;
    if (!project_id) {
        res.status(400).json({ error: "project_id is required" });
        return;
    }
    const db = admin.firestore();
    // Verify project exists
    const projectDoc = await db.collection("projects").doc(project_id).get();
    if (!projectDoc.exists) {
        res.status(404).json({ error: "Project not found" });
        return;
    }
    // Create survey data document
    const surveyData = {
        submitted_by: decodedToken.uid,
        submitted_at: admin.firestore.FieldValue.serverTimestamp(),
        roof_area_sqft: roof_area_sqft || null,
        roof_pitch: roof_pitch || null,
        roof_orientation: roof_orientation || null,
        obstructions: obstructions || [],
        electrical_panel_amps: electrical_panel_amps || null,
        utility_meter_type: utility_meter_type || null,
        notes: notes || null,
        source: "customer_diy",
    };
    await db
        .collection("projects")
        .doc(project_id)
        .collection("survey_data")
        .doc("diy_submission")
        .set(surveyData);
    // Update pipeline task for site_survey if it exists
    const pipelineTasksSnapshot = await db
        .collection("projects")
        .doc(project_id)
        .collection("pipeline_tasks")
        .where("type", "==", "site_survey")
        .limit(1)
        .get();
    if (!pipelineTasksSnapshot.empty) {
        await pipelineTasksSnapshot.docs[0].ref.update({
            status: "completed",
            diy_completed: true,
            completed_at: admin.firestore.FieldValue.serverTimestamp(),
            completed_by: decodedToken.uid,
        });
    }
    res.status(200).json({
        success: true,
        message: "Survey submitted! We'll review within 24 hours.",
    });
}
// ─── POST /customer/survey/photos (authenticated) ──────────────────────────
async function handleSurveyPhotos(req, res) {
    await verifyAuthToken(req);
    const { project_id, photos } = req.body;
    if (!project_id) {
        res.status(400).json({ error: "project_id is required" });
        return;
    }
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
        res
            .status(400)
            .json({ error: "photos array is required and must not be empty" });
        return;
    }
    if (photos.length > 10) {
        res.status(400).json({ error: "Maximum 10 photos per request" });
        return;
    }
    const db = admin.firestore();
    // Verify project exists
    const projectDoc = await db.collection("projects").doc(project_id).get();
    if (!projectDoc.exists) {
        res.status(404).json({ error: "Project not found" });
        return;
    }
    const bucket = admin.storage().bucket();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    const uploadUrls = await Promise.all(photos.map(async (photo) => {
        const filePath = `survey-photos/${project_id}/${photo.name}`;
        const file = bucket.file(filePath);
        const [url] = await file.getSignedUrl({
            version: "v4",
            action: "write",
            expires: expiresAt,
            contentType: photo.content_type || "image/jpeg",
        });
        return {
            name: photo.name,
            url,
            expires_at: expiresAt.toISOString(),
        };
    }));
    res.status(200).json({
        success: true,
        upload_urls: uploadUrls,
    });
}
// ─── POST /customer/schedule (authenticated) ───────────────────────────────
async function handleSchedule(req, res) {
    const decodedToken = await verifyAuthToken(req);
    const { project_id, preferred_dates, notes } = req.body;
    if (!project_id) {
        res.status(400).json({ error: "project_id is required" });
        return;
    }
    if (!preferred_dates ||
        !Array.isArray(preferred_dates) ||
        preferred_dates.length === 0) {
        res
            .status(400)
            .json({
            error: "preferred_dates array is required and must not be empty",
        });
        return;
    }
    // Validate time_window values
    const validWindows = ["morning", "afternoon", "all_day"];
    for (const pref of preferred_dates) {
        if (!pref.date) {
            res
                .status(400)
                .json({ error: "Each preferred_date must include a date" });
            return;
        }
        if (pref.time_window && !validWindows.includes(pref.time_window)) {
            res.status(400).json({
                error: `Invalid time_window "${pref.time_window}". Must be one of: ${validWindows.join(", ")}`,
            });
            return;
        }
    }
    const db = admin.firestore();
    // Verify project exists
    const projectDoc = await db.collection("projects").doc(project_id).get();
    if (!projectDoc.exists) {
        res.status(404).json({ error: "Project not found" });
        return;
    }
    // Create/update scheduling preferences
    await db
        .collection("projects")
        .doc(project_id)
        .collection("scheduling")
        .doc("customer_preferences")
        .set({
        submitted_by: decodedToken.uid,
        submitted_at: admin.firestore.FieldValue.serverTimestamp(),
        preferred_dates: preferred_dates.map((pref) => ({
            date: pref.date,
            time_window: pref.time_window || "all_day",
        })),
        notes: notes || null,
    }, { merge: true });
    res.status(200).json({
        success: true,
        message: "Schedule preferences saved",
    });
}
//# sourceMappingURL=customerApi.js.map