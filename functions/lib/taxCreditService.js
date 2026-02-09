"use strict";
/**
 * Tax Credit Audit, Insurance & Marketplace Service
 *
 * IRA Section 6418 made clean energy tax credits transferable starting 2023.
 * This module controls the entire credit lifecycle:
 *   Verified Install -> Audited Credit -> Insured -> Listed -> Sold -> Transferred
 *
 * The marketplace creates a two-sided platform:
 *   - Sellers: Solar installers/project owners with verified tax credits
 *   - Buyers: Corporations with tax liability seeking discounted credits
 *
 * Credit transfer process (per IRS Section 6418):
 *   1. Eligible taxpayer (seller) elects to transfer all or portion of credit
 *   2. Buyer pays cash consideration (not less than 80% of credit, typically)
 *   3. Seller files Form 3800 with transfer election
 *   4. Buyer claims credit on their tax return via Form 3468/Form 5884
 *   5. Transfer is irrevocable once election is made
 *
 * Platform fee: 2-5% of transaction value (collected from seller proceeds)
 *
 * Collections:
 *   tax_credit_audits       - Full audit records with compliance checks
 *   tax_credit_insurance     - Risk assessment + insurance/guarantee coverage
 *   tax_credit_listings      - Marketplace listings for transferable credits
 *   tax_credit_transactions  - Escrow, payment, and transfer tracking
 *
 * @module taxCreditService
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
exports.getCreditMarketStats = exports.getCreditTransactions = exports.completeCreditTransfer = exports.initiateCreditTransfer = exports.respondToOffer = exports.makeOffer = exports.getCreditListing = exports.searchCreditListings = exports.createCreditListing = exports.getInsurance = exports.activateInsurance = exports.quoteCreditInsurance = exports.assessCreditRisk = exports.addAuditCheck = exports.certifyAudit = exports.getAuditsByProject = exports.getAudit = exports.auditProjectCredits = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
/** Platform fee rate: 2% for Level 4 verified, up to 5% for Level 1 */
const PLATFORM_FEE_RATES = {
    1: 0.05,
    2: 0.04,
    3: 0.03,
    4: 0.02,
};
/** Valid credit types for input validation */
const VALID_CREDIT_TYPES = [
    "itc_residential",
    "itc_commercial",
    "ptc",
    "domestic_content_bonus",
    "energy_community_bonus",
    "low_income_bonus",
];
// ─── Helpers ────────────────────────────────────────────────────────────────────
/**
 * Calculate verification level based on audit, third-party, insurance, and escrow status.
 * Higher levels command better prices and lower platform fees.
 *
 * Level 1 (Bronze): Platform audited only
 * Level 2 (Silver): Platform + third-party audited
 * Level 3 (Gold):   Audited + insured
 * Level 4 (Platinum): Audited + insured + escrow available
 */
function calculateVerificationLevel(flags) {
    let level = 1;
    if (flags.platformAudited && flags.thirdPartyAudited)
        level = 2;
    if (level >= 2 && flags.insured)
        level = 3;
    if (level >= 3 && flags.escrowAvailable)
        level = 4;
    return level;
}
/**
 * Calculate risk score (0-100) from audit and project factors.
 * Lower score = lower risk = lower insurance premium.
 *
 * Factors:
 *   - Equipment origin certainty (FEOC verification depth)
 *   - Documentation completeness (% of required docs present)
 *   - Installer certification status
 *   - Project age (newer = higher risk, less track record)
 */
function calculateRiskScore(factors) {
    let score = 50; // Start at medium risk
    // Equipment origin: verified supply chain reduces risk significantly
    if (factors.equipmentOriginCertain)
        score -= 15;
    else
        score += 15;
    // Documentation: complete records reduce risk
    if (factors.documentationComplete)
        score -= 10;
    else
        score += 10;
    // Installer certification: NABCEP or equivalent
    if (factors.installerCertified)
        score -= 10;
    else
        score += 5;
    // Project age: older projects with track record are lower risk
    if (factors.projectAgeMonths > 12)
        score -= 10;
    else if (factors.projectAgeMonths > 6)
        score -= 5;
    else
        score += 5;
    // All audit checks passing is the strongest signal
    if (factors.allChecksPass)
        score -= 15;
    else
        score += 15;
    return Math.max(0, Math.min(100, score));
}
/**
 * Calculate insurance premium rate based on risk score.
 * Premium = creditAmount * premiumRate
 *
 * Risk 0-25:  1.0% (very low risk)
 * Risk 26-50: 1.5% (low risk)
 * Risk 51-75: 2.5% (medium risk)
 * Risk 76-100: 4.0% (high risk — may be declined)
 */
function calculatePremiumRate(riskScore) {
    if (riskScore <= 25)
        return 0.01;
    if (riskScore <= 50)
        return 0.015;
    if (riskScore <= 75)
        return 0.025;
    return 0.04;
}
// ─── AUDIT Functions ────────────────────────────────────────────────────────────
/**
 * Create an AI task to audit a project's tax credits.
 * Runs full credit verification: FEOC compliance, domestic content,
 * energy community eligibility, prevailing wage, and documentation review.
 *
 * Per IRS Section 6418(g), the transferee (buyer) is subject to recapture
 * if the credit was improperly claimed. This audit protects both parties.
 *
 * @function auditProjectCredits
 * @type onCall
 * @auth firebase
 * @input {{ projectId: string }}
 * @output {{ success: boolean, auditId: string }}
 * @errors unauthenticated, invalid-argument, not-found, internal
 * @billing none
 * @firestore tax_credit_audits, projects, solar_equipment
 */
exports.auditProjectCredits = functions
    .runWith({ timeoutSeconds: 60, memory: "512MB" })
    .https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to audit credits");
    }
    const { projectId } = data;
    if (!projectId) {
        throw new functions.https.HttpsError("invalid-argument", "projectId is required");
    }
    const db = admin.firestore();
    try {
        // Load project
        const projectSnap = await db.collection("projects").doc(projectId).get();
        if (!projectSnap.exists) {
            throw new functions.https.HttpsError("not-found", `Project not found: ${projectId}`);
        }
        const project = projectSnap.data();
        // Determine credit type based on project financing
        const financingType = project.financingType || project.financing_type || "cash";
        const projectType = project.projectType || project.project_type || "residential";
        let creditType = "itc_commercial";
        if (projectType === "residential") {
            // Post-2026: residential ITC only via TPO
            if (financingType === "lease" || financingType === "ppa") {
                creditType = "itc_commercial"; // TPO claims commercial ITC
            }
            else {
                creditType = "itc_residential"; // Will show as not eligible
            }
        }
        // Calculate base rate and bonuses
        const baseRate = creditType === "itc_residential" ? 0 : 30; // 25D expired 2026
        const systemCost = project.systemCost || project.system_cost || 0;
        // Build equipment compliance check list
        const equipmentIds = project.equipmentIds || project.equipment_ids || [];
        const auditChecks = [
            {
                checkType: "feoc_compliance",
                status: "pending",
                evidence: {
                    documentUrl: null,
                    documentType: "equipment_records",
                    extractedData: null,
                    verificationMethod: "database_lookup",
                },
                checkedAt: null,
                checkedBy: null,
                notes: "Verify all equipment passes FEOC requirements per IRA Section 40207",
            },
            {
                checkType: "domestic_content",
                status: "pending",
                evidence: {
                    documentUrl: null,
                    documentType: "supply_chain_records",
                    extractedData: null,
                    verificationMethod: "weighted_calculation",
                },
                checkedAt: null,
                checkedBy: null,
                notes: "Calculate weighted domestic content percentage for 10% ITC adder",
            },
            {
                checkType: "energy_community",
                status: "pending",
                evidence: {
                    documentUrl: null,
                    documentType: "census_tract_data",
                    extractedData: null,
                    verificationMethod: "geo_lookup",
                },
                checkedAt: null,
                checkedBy: null,
                notes: "Verify installation address is in a designated energy community per IRA Section 48E(h)(2)",
            },
            {
                checkType: "prevailing_wage",
                status: "pending",
                evidence: {
                    documentUrl: null,
                    documentType: "wage_records",
                    extractedData: null,
                    verificationMethod: "document_review",
                },
                checkedAt: null,
                checkedBy: null,
                notes: "Verify prevailing wage requirements met for projects >1MW (or all for maximum base rate)",
            },
            {
                checkType: "documentation_complete",
                status: "pending",
                evidence: {
                    documentUrl: null,
                    documentType: "project_documents",
                    extractedData: null,
                    verificationMethod: "checklist_review",
                },
                checkedAt: null,
                checkedBy: null,
                notes: "Verify all required IRS documentation is present: Form 7205, interconnection agreement, PTO letter, invoices",
            },
        ];
        // Create audit record
        const auditData = {
            projectId,
            creditType,
            baseRate,
            bonuses: [],
            totalCreditRate: baseRate,
            systemCost,
            creditAmount: Math.round(systemCost * (baseRate / 100)),
            status: "auditing",
            auditChecks,
            equipmentCompliance: {
                allPanelsFeocCompliant: false,
                domesticContentPercentage: 0,
                tariffExempt: false,
                equipmentIds,
            },
            certification: null,
            createdBy: context.auth.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const auditRef = await db.collection("tax_credit_audits").add(auditData);
        // Create AI task to process the audit (integrates with aiTaskEngine)
        try {
            const taskData = {
                type: "credit_audit",
                projectId,
                status: "pending",
                input: {
                    auditId: auditRef.id,
                    projectId,
                    equipmentIds,
                    creditType,
                    context: {
                        state: project.state || ((_a = project.address) === null || _a === void 0 ? void 0 : _a.state) || "",
                        zipCode: project.zipCode || ((_b = project.address) === null || _b === void 0 ? void 0 : _b.zip) || "",
                    },
                },
                output: null,
                aiAttempt: null,
                humanFallback: null,
                learningData: null,
                retryCount: 0,
                maxRetries: 3,
                priority: 2,
                createdBy: context.auth.uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            await db.collection("ai_tasks").add(taskData);
        }
        catch (taskErr) {
            console.warn(`Failed to create AI task for audit ${auditRef.id}:`, taskErr.message);
        }
        console.log(`Credit audit created: ${auditRef.id} for project ${projectId}`);
        return {
            success: true,
            auditId: auditRef.id,
        };
    }
    catch (error) {
        console.error("Audit project credits error:", error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to audit project credits");
    }
});
/**
 * Get a full audit record with all checks and compliance details.
 *
 * @function getAudit
 * @type onCall
 * @auth firebase
 * @input {{ auditId: string }}
 * @output {{ success: boolean, audit: object }}
 */
exports.getAudit = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    const { auditId } = data;
    if (!auditId) {
        throw new functions.https.HttpsError("invalid-argument", "auditId is required");
    }
    const db = admin.firestore();
    const snap = await db.collection("tax_credit_audits").doc(auditId).get();
    if (!snap.exists) {
        throw new functions.https.HttpsError("not-found", `Audit not found: ${auditId}`);
    }
    return { success: true, audit: { id: snap.id, ...snap.data() } };
});
/**
 * Get all audits for a project.
 *
 * @function getAuditsByProject
 * @type onCall
 * @auth firebase
 * @input {{ projectId: string }}
 * @output {{ success: boolean, audits: Array }}
 */
exports.getAuditsByProject = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    const { projectId } = data;
    if (!projectId) {
        throw new functions.https.HttpsError("invalid-argument", "projectId is required");
    }
    const db = admin.firestore();
    const snap = await db
        .collection("tax_credit_audits")
        .where("projectId", "==", projectId)
        .orderBy("createdAt", "desc")
        .get();
    const audits = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, audits };
});
/**
 * Certify an audit after all checks pass. Generates a certification record
 * that attests the credit is verified and ready for marketplace listing.
 *
 * Per IRS Notice 2023-44, buyers should perform due diligence before
 * purchasing transferred credits. This certification serves as evidence
 * of that due diligence.
 *
 * @function certifyAudit
 * @type onCall
 * @auth firebase (admin or system)
 * @input {{ auditId: string }}
 * @output {{ success: boolean, auditId: string, certification: object }}
 */
exports.certifyAudit = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    const { auditId } = data;
    if (!auditId) {
        throw new functions.https.HttpsError("invalid-argument", "auditId is required");
    }
    const db = admin.firestore();
    const auditRef = db.collection("tax_credit_audits").doc(auditId);
    const snap = await auditRef.get();
    if (!snap.exists) {
        throw new functions.https.HttpsError("not-found", `Audit not found: ${auditId}`);
    }
    const audit = snap.data();
    // Verify all checks pass before certifying
    const checks = audit.auditChecks || [];
    const failedChecks = checks.filter((c) => c.status !== "pass" && c.status !== "waived");
    if (failedChecks.length > 0) {
        const failedTypes = failedChecks.map((c) => c.checkType).join(", ");
        throw new functions.https.HttpsError("failed-precondition", `Cannot certify: ${failedChecks.length} check(s) not passing: ${failedTypes}`);
    }
    try {
        const certification = {
            certifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            certifiedBy: context.auth.uid,
            certificateUrl: null, // Would be a generated PDF in production
            expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
            revocable: true,
            revocationConditions: [
                "Equipment change after certification",
                "Ownership transfer without re-audit",
                "Regulatory non-compliance discovered",
                "Fraudulent documentation identified",
            ],
        };
        await auditRef.update({
            status: "certified",
            certification,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Audit certified: ${auditId}`);
        return { success: true, auditId, certification };
    }
    catch (error) {
        console.error(`Certify audit error (${auditId}):`, error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to certify audit");
    }
});
/**
 * Add an individual check result to an audit (called during the audit process).
 *
 * @function addAuditCheck
 * @type onCall
 * @auth firebase
 * @input {{ auditId: string, checkType: string, status: "pass"|"fail"|"waived", evidence?: object, notes?: string }}
 * @output {{ success: boolean }}
 */
exports.addAuditCheck = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    const { auditId, checkType, status, evidence, notes } = data;
    if (!auditId || !checkType || !status) {
        throw new functions.https.HttpsError("invalid-argument", "auditId, checkType, and status are required");
    }
    if (!["pass", "fail", "waived"].includes(status)) {
        throw new functions.https.HttpsError("invalid-argument", "status must be pass, fail, or waived");
    }
    const db = admin.firestore();
    const auditRef = db.collection("tax_credit_audits").doc(auditId);
    const snap = await auditRef.get();
    if (!snap.exists) {
        throw new functions.https.HttpsError("not-found", `Audit not found: ${auditId}`);
    }
    try {
        const audit = snap.data();
        const checks = audit.auditChecks || [];
        // Update existing check or add new one
        const checkIndex = checks.findIndex((c) => c.checkType === checkType);
        const checkData = {
            checkType,
            status,
            evidence: evidence || {
                documentUrl: null,
                documentType: null,
                extractedData: null,
                verificationMethod: "manual",
            },
            checkedAt: admin.firestore.FieldValue.serverTimestamp(),
            checkedBy: context.auth.uid,
            notes: notes || "",
        };
        if (checkIndex >= 0) {
            checks[checkIndex] = checkData;
        }
        else {
            checks.push(checkData);
        }
        // Check if all checks now pass — if so, update to verified
        const allPass = checks.every((c) => c.status === "pass" || c.status === "waived");
        const newStatus = allPass ? "verified" : audit.status;
        // Recalculate bonuses based on check results
        const bonuses = [];
        const dcCheck = checks.find((c) => c.checkType === "domestic_content");
        if (dcCheck && dcCheck.status === "pass") {
            bonuses.push({
                type: "domestic_content_bonus",
                rate: 10,
                qualified: true,
                evidence: [dcCheck.evidence],
                verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
                verifiedBy: context.auth.uid,
            });
        }
        const ecCheck = checks.find((c) => c.checkType === "energy_community");
        if (ecCheck && ecCheck.status === "pass") {
            bonuses.push({
                type: "energy_community_bonus",
                rate: 10,
                qualified: true,
                evidence: [ecCheck.evidence],
                verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
                verifiedBy: context.auth.uid,
            });
        }
        const totalBonusRate = bonuses.reduce((sum, b) => sum + (b.qualified ? b.rate : 0), 0);
        const totalCreditRate = (audit.baseRate || 0) + totalBonusRate;
        const creditAmount = Math.round((audit.systemCost || 0) * (totalCreditRate / 100));
        await auditRef.update({
            auditChecks: checks,
            status: newStatus,
            bonuses,
            totalCreditRate,
            creditAmount,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    }
    catch (error) {
        console.error(`Add audit check error (${auditId}):`, error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to add audit check");
    }
});
// ─── INSURANCE Functions ────────────────────────────────────────────────────────
/**
 * AI-powered risk scoring for a credit audit.
 * Assesses the probability that a transferred credit will face recapture.
 *
 * Per IRS Section 6418(g)(2), if a credit is subject to recapture,
 * the transferee (buyer) bears the recapture liability. Insurance
 * protects the buyer from this risk.
 *
 * @function assessCreditRisk
 * @type onCall
 * @auth firebase
 * @input {{ auditId: string }}
 * @output {{ success: boolean, insuranceId: string, riskScore: number }}
 */
exports.assessCreditRisk = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    const { auditId } = data;
    if (!auditId) {
        throw new functions.https.HttpsError("invalid-argument", "auditId is required");
    }
    const db = admin.firestore();
    const auditSnap = await db
        .collection("tax_credit_audits")
        .doc(auditId)
        .get();
    if (!auditSnap.exists) {
        throw new functions.https.HttpsError("not-found", `Audit not found: ${auditId}`);
    }
    const audit = auditSnap.data();
    try {
        // Analyze risk factors from audit data
        const checks = audit.auditChecks || [];
        const allChecksPass = checks.every((c) => c.status === "pass" || c.status === "waived");
        const feocCheck = checks.find((c) => c.checkType === "feoc_compliance");
        const docCheck = checks.find((c) => c.checkType === "documentation_complete");
        // Calculate project age
        const createdAt = ((_b = (_a = audit.createdAt) === null || _a === void 0 ? void 0 : _a.toMillis) === null || _b === void 0 ? void 0 : _b.call(_a)) || Date.now();
        const projectAgeMonths = Math.floor((Date.now() - createdAt) / (30 * 24 * 60 * 60 * 1000));
        const riskScore = calculateRiskScore({
            equipmentOriginCertain: (feocCheck === null || feocCheck === void 0 ? void 0 : feocCheck.status) === "pass",
            documentationComplete: (docCheck === null || docCheck === void 0 ? void 0 : docCheck.status) === "pass",
            installerCertified: true, // Default — would check installer record in production
            projectAgeMonths,
            allChecksPass,
        });
        // Build risk factors array for transparency
        const factors = [
            {
                factor: "Equipment FEOC verification",
                impact: (feocCheck === null || feocCheck === void 0 ? void 0 : feocCheck.status) === "pass" ? "low" : "high",
                mitigated: (feocCheck === null || feocCheck === void 0 ? void 0 : feocCheck.status) === "pass",
                mitigation: (feocCheck === null || feocCheck === void 0 ? void 0 : feocCheck.status) === "pass"
                    ? "All equipment verified FEOC-compliant"
                    : "Equipment FEOC status unverified — higher recapture risk",
            },
            {
                factor: "Documentation completeness",
                impact: (docCheck === null || docCheck === void 0 ? void 0 : docCheck.status) === "pass" ? "low" : "medium",
                mitigated: (docCheck === null || docCheck === void 0 ? void 0 : docCheck.status) === "pass",
                mitigation: (docCheck === null || docCheck === void 0 ? void 0 : docCheck.status) === "pass"
                    ? "All required IRS documentation present"
                    : "Missing documentation increases audit risk",
            },
            {
                factor: "Project age",
                impact: projectAgeMonths > 12
                    ? "low"
                    : projectAgeMonths > 6
                        ? "medium"
                        : "high",
                mitigated: projectAgeMonths > 6,
                mitigation: projectAgeMonths > 6
                    ? "Project has operational track record"
                    : "New project — limited operational history",
            },
            {
                factor: "Audit check results",
                impact: allChecksPass ? "low" : "high",
                mitigated: allChecksPass,
                mitigation: allChecksPass
                    ? "All audit checks passed"
                    : "Some audit checks failed or pending",
            },
        ];
        const overallRisk = riskScore <= 25
            ? "low"
            : riskScore <= 50
                ? "medium"
                : riskScore <= 75
                    ? "high"
                    : "very_high";
        // Create insurance assessment record
        const insuranceData = {
            auditId,
            projectId: audit.projectId,
            creditAmount: audit.creditAmount || 0,
            riskAssessment: {
                overallRisk,
                riskScore,
                factors,
                assessedAt: admin.firestore.FieldValue.serverTimestamp(),
                assessedBy: "system",
            },
            coverage: null,
            status: "assessing",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const insuranceRef = await db
            .collection("tax_credit_insurance")
            .add(insuranceData);
        console.log(`Credit risk assessed: ${insuranceRef.id} for audit ${auditId} (score: ${riskScore}, risk: ${overallRisk})`);
        return {
            success: true,
            insuranceId: insuranceRef.id,
            riskScore,
            overallRisk,
        };
    }
    catch (error) {
        console.error(`Assess credit risk error (${auditId}):`, error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to assess credit risk");
    }
});
/**
 * Generate an insurance quote based on risk assessment.
 * Premium is typically 1-4% of credit value depending on risk level.
 *
 * @function quoteCreditInsurance
 * @type onCall
 * @auth firebase
 * @input {{ auditId: string }}
 * @output {{ success: boolean, insuranceId: string, quote: object }}
 */
exports.quoteCreditInsurance = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    const { auditId } = data;
    if (!auditId) {
        throw new functions.https.HttpsError("invalid-argument", "auditId is required");
    }
    const db = admin.firestore();
    // Find the insurance record for this audit
    const insuranceSnap = await db
        .collection("tax_credit_insurance")
        .where("auditId", "==", auditId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
    if (insuranceSnap.empty) {
        throw new functions.https.HttpsError("not-found", `No risk assessment found for audit ${auditId}. Run assessCreditRisk first.`);
    }
    const insuranceDoc = insuranceSnap.docs[0];
    const insurance = insuranceDoc.data();
    try {
        const riskScore = ((_a = insurance.riskAssessment) === null || _a === void 0 ? void 0 : _a.riskScore) || 50;
        const creditAmount = insurance.creditAmount || 0;
        const premiumRate = calculatePremiumRate(riskScore);
        const premium = Math.round(creditAmount * premiumRate);
        const coverage = {
            type: "platform_guarantee",
            provider: "SolarOS Platform",
            coverageAmount: creditAmount,
            premium,
            premiumRate,
            termMonths: 36, // 3-year coverage for IRS statute of limitations
            conditions: [
                "Credit must be transferred within 12 months of certification",
                "All audit checks must remain valid at time of transfer",
                "Seller must cooperate with any IRS inquiries",
                "Coverage does not extend to intentional misrepresentation",
            ],
            policyUrl: null,
        };
        await insuranceDoc.ref.update({
            coverage,
            status: "quoted",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Insurance quoted: ${insuranceDoc.id} — $${premium} premium (${(premiumRate * 100).toFixed(1)}%) for $${creditAmount} credit`);
        return {
            success: true,
            insuranceId: insuranceDoc.id,
            quote: {
                premium,
                premiumRate,
                coverageAmount: creditAmount,
                termMonths: 36,
                riskScore,
            },
        };
    }
    catch (error) {
        console.error(`Quote credit insurance error (${auditId}):`, error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to quote insurance");
    }
});
/**
 * Activate insurance coverage after payment.
 *
 * @function activateInsurance
 * @type onCall
 * @auth firebase
 * @input {{ insuranceId: string, paymentRef: string }}
 * @output {{ success: boolean }}
 */
exports.activateInsurance = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    const { insuranceId, paymentRef } = data;
    if (!insuranceId || !paymentRef) {
        throw new functions.https.HttpsError("invalid-argument", "insuranceId and paymentRef are required");
    }
    const db = admin.firestore();
    const ref = db.collection("tax_credit_insurance").doc(insuranceId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new functions.https.HttpsError("not-found", `Insurance not found: ${insuranceId}`);
    }
    const insurance = snap.data();
    if (insurance.status !== "quoted") {
        throw new functions.https.HttpsError("failed-precondition", `Insurance is in status "${insurance.status}", expected "quoted"`);
    }
    try {
        await ref.update({
            status: "active",
            "coverage.activatedAt": admin.firestore.FieldValue.serverTimestamp(),
            "coverage.paymentRef": paymentRef,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Insurance activated: ${insuranceId}`);
        return { success: true };
    }
    catch (error) {
        console.error(`Activate insurance error (${insuranceId}):`, error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to activate insurance");
    }
});
/**
 * Get insurance details.
 *
 * @function getInsurance
 * @type onCall
 * @auth firebase
 * @input {{ insuranceId: string }}
 * @output {{ success: boolean, insurance: object }}
 */
exports.getInsurance = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    const { insuranceId } = data;
    if (!insuranceId) {
        throw new functions.https.HttpsError("invalid-argument", "insuranceId is required");
    }
    const db = admin.firestore();
    const snap = await db
        .collection("tax_credit_insurance")
        .doc(insuranceId)
        .get();
    if (!snap.exists) {
        throw new functions.https.HttpsError("not-found", `Insurance not found: ${insuranceId}`);
    }
    return { success: true, insurance: { id: snap.id, ...snap.data() } };
});
// ─── MARKETPLACE Functions ──────────────────────────────────────────────────────
/**
 * List a certified credit for sale on the marketplace.
 * Requires a certified audit. Optionally includes insurance for higher verification level.
 *
 * Per IRS Section 6418, the transfer must be for cash consideration.
 * The platform facilitates price discovery and transaction execution.
 *
 * @function createCreditListing
 * @type onCall
 * @auth firebase
 * @input {{ auditId: string, listingDetails: { askingPrice: number, discountRate?: number, minimumBid?: number, auctionStyle: string, expiresAt?: string } }}
 * @output {{ success: boolean, listingId: string }}
 */
exports.createCreditListing = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    const { auditId, listingDetails } = data;
    if (!auditId || !listingDetails) {
        throw new functions.https.HttpsError("invalid-argument", "auditId and listingDetails are required");
    }
    const db = admin.firestore();
    // Load and validate audit
    const auditSnap = await db
        .collection("tax_credit_audits")
        .doc(auditId)
        .get();
    if (!auditSnap.exists) {
        throw new functions.https.HttpsError("not-found", `Audit not found: ${auditId}`);
    }
    const audit = auditSnap.data();
    if (audit.status !== "certified") {
        throw new functions.https.HttpsError("failed-precondition", `Audit must be certified before listing. Current status: "${audit.status}"`);
    }
    try {
        // Check for active insurance
        const insuranceSnap = await db
            .collection("tax_credit_insurance")
            .where("auditId", "==", auditId)
            .where("status", "==", "active")
            .limit(1)
            .get();
        const hasInsurance = !insuranceSnap.empty;
        const insuranceId = hasInsurance ? insuranceSnap.docs[0].id : null;
        // Calculate verification level
        const verificationFlags = {
            platformAudited: true, // We always platform-audit
            thirdPartyAudited: false, // Would be set by third-party verification
            insured: hasInsurance,
            escrowAvailable: true, // Platform provides escrow
        };
        const level = calculateVerificationLevel(verificationFlags);
        // Calculate discount rate if not provided
        // Discount rate = (1 - askingPrice/creditAmount) * 100
        const creditAmount = audit.creditAmount || 0;
        const askingPrice = listingDetails.askingPrice || creditAmount;
        const discountRate = listingDetails.discountRate ||
            (creditAmount > 0
                ? Math.round((1 - askingPrice / creditAmount) * 10000) / 100
                : 0);
        // Default expiration: 90 days
        const expiresAt = listingDetails.expiresAt
            ? admin.firestore.Timestamp.fromDate(new Date(listingDetails.expiresAt))
            : admin.firestore.Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
        // Load project for summary
        const projectSnap = await db
            .collection("projects")
            .doc(audit.projectId)
            .get();
        const project = projectSnap.exists ? projectSnap.data() : {};
        const listingData = {
            auditId,
            insuranceId,
            sellerId: context.auth.uid,
            listing: {
                creditType: audit.creditType,
                creditAmount,
                askingPrice,
                discountRate,
                minimumBid: listingDetails.minimumBid || Math.round(askingPrice * 0.9),
                auctionStyle: listingDetails.auctionStyle || "negotiation",
                expiresAt,
            },
            verificationLevel: {
                ...verificationFlags,
                level,
            },
            projectSummary: {
                state: project.state || ((_a = project.address) === null || _a === void 0 ? void 0 : _a.state) || "Unknown",
                systemSizeKw: project.systemSizeKw || project.system_size_kw || 0,
                installDate: project.installDate || project.install_date || null,
                creditYear: new Date().getFullYear(),
                equipmentOrigin: ((_b = audit.equipmentCompliance) === null || _b === void 0 ? void 0 : _b.allPanelsFeocCompliant)
                    ? "US-compliant"
                    : "Mixed",
                projectType: project.projectType || project.project_type || "residential",
            },
            status: "active",
            offers: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const listingRef = await db
            .collection("tax_credit_listings")
            .add(listingData);
        // Update audit status
        await db.collection("tax_credit_audits").doc(auditId).update({
            status: "listed",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Credit listing created: ${listingRef.id} — $${creditAmount} credit at $${askingPrice} (${discountRate}% discount, Level ${level})`);
        return { success: true, listingId: listingRef.id };
    }
    catch (error) {
        console.error("Create credit listing error:", error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to create listing");
    }
});
/**
 * Search marketplace listings with filters.
 * Returns anonymized project summaries — no seller identity revealed.
 *
 * @function searchCreditListings
 * @type onCall
 * @auth none (public search)
 * @input {{ filters?: { creditType?, state?, minSize?, maxSize?, minDiscount?, maxDiscount?, verificationLevel?, limit? } }}
 * @output {{ success: boolean, listings: Array, count: number }}
 */
exports.searchCreditListings = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data) => {
    const db = admin.firestore();
    const filters = (data === null || data === void 0 ? void 0 : data.filters) || {};
    const queryLimit = Math.min(filters.limit || 50, 200);
    try {
        let q = db
            .collection("tax_credit_listings")
            .where("status", "==", "active");
        // Apply filters — Firestore allows one inequality, so we use equality where possible
        if (filters.creditType) {
            q = q.where("listing.creditType", "==", filters.creditType);
        }
        if (filters.state) {
            q = q.where("projectSummary.state", "==", filters.state);
        }
        if (filters.verificationLevel) {
            q = q.where("verificationLevel.level", "==", filters.verificationLevel);
        }
        q = q.orderBy("createdAt", "desc").limit(queryLimit);
        const snap = await q.get();
        // Anonymize listings — strip seller identity
        const listings = snap.docs
            .map((d) => {
            const listing = d.data();
            return {
                id: d.id,
                listing: listing.listing,
                verificationLevel: listing.verificationLevel,
                projectSummary: listing.projectSummary,
                offerCount: (listing.offers || []).length,
                createdAt: listing.createdAt,
            };
        })
            // Client-side filtering for range queries Firestore can't handle
            .filter((l) => {
            if (filters.minSize && l.listing.creditAmount < filters.minSize)
                return false;
            if (filters.maxSize && l.listing.creditAmount > filters.maxSize)
                return false;
            if (filters.minDiscount &&
                l.listing.discountRate < filters.minDiscount)
                return false;
            if (filters.maxDiscount &&
                l.listing.discountRate > filters.maxDiscount)
                return false;
            return true;
        });
        return { success: true, listings, count: listings.length };
    }
    catch (error) {
        console.error("Search credit listings error:", error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to search listings");
    }
});
/**
 * Get full listing detail including audit report and insurance info.
 *
 * @function getCreditListing
 * @type onCall
 * @auth firebase
 * @input {{ listingId: string }}
 * @output {{ success: boolean, listing: object, audit: object, insurance: object|null }}
 */
exports.getCreditListing = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    const { listingId } = data;
    if (!listingId) {
        throw new functions.https.HttpsError("invalid-argument", "listingId is required");
    }
    const db = admin.firestore();
    const listingSnap = await db
        .collection("tax_credit_listings")
        .doc(listingId)
        .get();
    if (!listingSnap.exists) {
        throw new functions.https.HttpsError("not-found", `Listing not found: ${listingId}`);
    }
    const listing = listingSnap.data();
    try {
        // Load audit
        const auditSnap = await db
            .collection("tax_credit_audits")
            .doc(listing.auditId)
            .get();
        const audit = auditSnap.exists
            ? { id: auditSnap.id, ...auditSnap.data() }
            : null;
        // Load insurance if exists
        let insurance = null;
        if (listing.insuranceId) {
            const insuranceSnap = await db
                .collection("tax_credit_insurance")
                .doc(listing.insuranceId)
                .get();
            if (insuranceSnap.exists) {
                insurance = { id: insuranceSnap.id, ...insuranceSnap.data() };
            }
        }
        // Only show seller details to the seller themselves
        const isSeller = listing.sellerId === context.auth.uid;
        const listingData = {
            id: listingSnap.id,
            ...listing,
            // Hide seller ID from buyers
            sellerId: isSeller ? listing.sellerId : undefined,
            // Only show offers to the seller
            offers: isSeller ? listing.offers : undefined,
        };
        return { success: true, listing: listingData, audit, insurance };
    }
    catch (error) {
        console.error(`Get credit listing error (${listingId}):`, error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to get listing");
    }
});
/**
 * Make an offer on a credit listing.
 * Per Section 6418, transfer must be for cash consideration.
 *
 * @function makeOffer
 * @type onCall
 * @auth firebase
 * @input {{ listingId: string, offerAmount: number, message?: string }}
 * @output {{ success: boolean, offerId: string }}
 */
exports.makeOffer = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    const { listingId, offerAmount, message } = data;
    if (!listingId || !offerAmount) {
        throw new functions.https.HttpsError("invalid-argument", "listingId and offerAmount are required");
    }
    const db = admin.firestore();
    const listingRef = db.collection("tax_credit_listings").doc(listingId);
    const listingSnap = await listingRef.get();
    if (!listingSnap.exists) {
        throw new functions.https.HttpsError("not-found", `Listing not found: ${listingId}`);
    }
    const listing = listingSnap.data();
    // Validate listing is active
    if (listing.status !== "active" && listing.status !== "under_offer") {
        throw new functions.https.HttpsError("failed-precondition", `Listing is not accepting offers (status: "${listing.status}")`);
    }
    // Cannot bid on your own listing
    if (listing.sellerId === context.auth.uid) {
        throw new functions.https.HttpsError("failed-precondition", "Cannot make an offer on your own listing");
    }
    // Check minimum bid
    if (((_a = listing.listing) === null || _a === void 0 ? void 0 : _a.minimumBid) &&
        offerAmount < listing.listing.minimumBid) {
        throw new functions.https.HttpsError("invalid-argument", `Offer ($${offerAmount}) is below minimum bid ($${listing.listing.minimumBid})`);
    }
    try {
        const offerId = `offer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const offer = {
            id: offerId,
            buyerId: context.auth.uid,
            offerAmount,
            status: "pending",
            message: message || "",
            offeredAt: admin.firestore.FieldValue.serverTimestamp(),
            respondedAt: null,
        };
        // Add offer to listing and update status
        const offers = listing.offers || [];
        offers.push(offer);
        await listingRef.update({
            offers,
            status: "under_offer",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Offer made: ${offerId} on listing ${listingId} — $${offerAmount}`);
        return { success: true, offerId };
    }
    catch (error) {
        console.error(`Make offer error (${listingId}):`, error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to make offer");
    }
});
/**
 * Respond to an offer: accept, reject, or counter.
 *
 * @function respondToOffer
 * @type onCall
 * @auth firebase (seller only)
 * @input {{ listingId: string, offerId: string, response: "accepted"|"rejected"|"countered", counterAmount?: number }}
 * @output {{ success: boolean }}
 */
exports.respondToOffer = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    const { listingId, offerId, response, counterAmount } = data;
    if (!listingId || !offerId || !response) {
        throw new functions.https.HttpsError("invalid-argument", "listingId, offerId, and response are required");
    }
    if (!["accepted", "rejected", "countered"].includes(response)) {
        throw new functions.https.HttpsError("invalid-argument", "response must be accepted, rejected, or countered");
    }
    if (response === "countered" && !counterAmount) {
        throw new functions.https.HttpsError("invalid-argument", "counterAmount is required when countering");
    }
    const db = admin.firestore();
    const listingRef = db.collection("tax_credit_listings").doc(listingId);
    const listingSnap = await listingRef.get();
    if (!listingSnap.exists) {
        throw new functions.https.HttpsError("not-found", `Listing not found: ${listingId}`);
    }
    const listing = listingSnap.data();
    // Only seller can respond to offers
    if (listing.sellerId !== context.auth.uid) {
        throw new functions.https.HttpsError("permission-denied", "Only the listing seller can respond to offers");
    }
    try {
        const offers = listing.offers || [];
        const offerIndex = offers.findIndex((o) => o.id === offerId);
        if (offerIndex === -1) {
            throw new functions.https.HttpsError("not-found", `Offer not found: ${offerId}`);
        }
        // Update offer status
        offers[offerIndex].status = response;
        offers[offerIndex].respondedAt =
            admin.firestore.FieldValue.serverTimestamp();
        if (counterAmount) {
            offers[offerIndex].counterAmount = counterAmount;
        }
        // If accepted, update listing status
        const listingStatus = response === "accepted" ? "pending_transfer" : listing.status;
        // If accepted, reject all other pending offers
        if (response === "accepted") {
            offers.forEach((o, i) => {
                if (i !== offerIndex && o.status === "pending") {
                    o.status = "rejected";
                    o.respondedAt = admin.firestore.FieldValue.serverTimestamp();
                }
            });
        }
        await listingRef.update({
            offers,
            status: listingStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Offer ${offerId} on listing ${listingId}: ${response}`);
        return { success: true };
    }
    catch (error) {
        console.error(`Respond to offer error (${listingId}/${offerId}):`, error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to respond to offer");
    }
});
/**
 * Initiate the credit transfer process: create escrow, prepare documents.
 * This starts the formal IRS Section 6418 transfer process.
 *
 * Required documents for transfer:
 *   - Form 3800 (General Business Credit) with transfer election
 *   - Transfer agreement signed by both parties
 *   - Credit certification from platform audit
 *   - Proof of cash consideration (payment receipt)
 *
 * @function initiateCreditTransfer
 * @type onCall
 * @auth firebase
 * @input {{ listingId: string, offerId: string }}
 * @output {{ success: boolean, transactionId: string }}
 */
exports.initiateCreditTransfer = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    const { listingId, offerId } = data;
    if (!listingId || !offerId) {
        throw new functions.https.HttpsError("invalid-argument", "listingId and offerId are required");
    }
    const db = admin.firestore();
    const listingSnap = await db
        .collection("tax_credit_listings")
        .doc(listingId)
        .get();
    if (!listingSnap.exists) {
        throw new functions.https.HttpsError("not-found", `Listing not found: ${listingId}`);
    }
    const listing = listingSnap.data();
    // Find accepted offer
    const offer = (listing.offers || []).find((o) => o.id === offerId && o.status === "accepted");
    if (!offer) {
        throw new functions.https.HttpsError("failed-precondition", `No accepted offer found with ID ${offerId}`);
    }
    try {
        const creditAmount = ((_a = listing.listing) === null || _a === void 0 ? void 0 : _a.creditAmount) || 0;
        const salePrice = offer.offerAmount;
        const discountRate = creditAmount > 0
            ? Math.round((1 - salePrice / creditAmount) * 10000) / 100
            : 0;
        // Calculate platform fee based on verification level
        const verificationLevel = (((_b = listing.verificationLevel) === null || _b === void 0 ? void 0 : _b.level) ||
            1);
        const platformFeeRate = PLATFORM_FEE_RATES[verificationLevel];
        const platformFee = Math.round(salePrice * platformFeeRate);
        const transactionData = {
            listingId,
            sellerId: listing.sellerId,
            buyerId: offer.buyerId,
            creditAmount,
            salePrice,
            discountRate,
            platformFee,
            platformFeeRate,
            transfer: {
                status: "initiated",
                escrowId: `escrow_${Date.now()}`,
                documents: [
                    {
                        type: "transfer_agreement",
                        url: null,
                        signedBySeller: false,
                        signedByBuyer: false,
                        signedAt: null,
                    },
                    {
                        type: "credit_certification",
                        url: null,
                        signedBySeller: false,
                        signedByBuyer: false,
                        signedAt: null,
                    },
                    {
                        type: "form_3800_election",
                        url: null,
                        signedBySeller: false,
                        signedByBuyer: false,
                        signedAt: null,
                    },
                    {
                        type: "payment_receipt",
                        url: null,
                        signedBySeller: false,
                        signedByBuyer: false,
                        signedAt: null,
                    },
                ],
                irsFilingReference: null,
                completedAt: null,
            },
            payment: {
                method: "escrow",
                toSeller: {
                    amount: salePrice - platformFee,
                    status: "pending",
                    paidAt: null,
                    reference: null,
                },
                platformFee: {
                    amount: platformFee,
                    status: "pending",
                    collectedAt: null,
                },
                escrowRelease: {
                    amount: salePrice,
                    releasedAt: null,
                    conditions_met: [],
                },
            },
            timeline: [
                {
                    event: "transfer_initiated",
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    actor: context.auth.uid,
                    notes: `Transfer initiated for $${salePrice} (${discountRate}% discount). Platform fee: $${platformFee} (${(platformFeeRate * 100).toFixed(1)}%)`,
                },
            ],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const txRef = await db
            .collection("tax_credit_transactions")
            .add(transactionData);
        // Update listing status
        await db.collection("tax_credit_listings").doc(listingId).update({
            status: "pending_transfer",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Credit transfer initiated: ${txRef.id} — $${salePrice} for $${creditAmount} credit (fee: $${platformFee})`);
        return { success: true, transactionId: txRef.id };
    }
    catch (error) {
        console.error("Initiate credit transfer error:", error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to initiate transfer");
    }
});
/**
 * Complete the credit transfer: release escrow, collect fee, finalize.
 *
 * @function completeCreditTransfer
 * @type onCall
 * @auth firebase (admin)
 * @input {{ transactionId: string }}
 * @output {{ success: boolean }}
 */
exports.completeCreditTransfer = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    // Admin-only: verify caller has admin role
    const db = admin.firestore();
    const callerSnap = await db.collection("users").doc(context.auth.uid).get();
    if (!callerSnap.exists || ((_a = callerSnap.data()) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }
    const { transactionId } = data;
    if (!transactionId) {
        throw new functions.https.HttpsError("invalid-argument", "transactionId is required");
    }
    const txRef = db.collection("tax_credit_transactions").doc(transactionId);
    const txSnap = await txRef.get();
    if (!txSnap.exists) {
        throw new functions.https.HttpsError("not-found", `Transaction not found: ${transactionId}`);
    }
    const tx = txSnap.data();
    try {
        const now = admin.firestore.FieldValue.serverTimestamp();
        const timeline = tx.timeline || [];
        timeline.push({
            event: "transfer_completed",
            timestamp: now,
            actor: context.auth.uid,
            notes: "All documents signed, escrow released, credit transfer complete.",
        });
        await txRef.update({
            "transfer.status": "completed",
            "transfer.completedAt": now,
            "payment.toSeller.status": "paid",
            "payment.toSeller.paidAt": now,
            "payment.platformFee.status": "collected",
            "payment.platformFee.collectedAt": now,
            "payment.escrowRelease.releasedAt": now,
            "payment.escrowRelease.conditions_met": [
                "documents_signed",
                "payment_received",
                "credit_verified",
            ],
            timeline,
            updatedAt: now,
        });
        // Update listing status to sold
        if (tx.listingId) {
            await db.collection("tax_credit_listings").doc(tx.listingId).update({
                status: "sold",
                updatedAt: now,
            });
        }
        // Update audit status to transferred
        const listingSnap = await db
            .collection("tax_credit_listings")
            .doc(tx.listingId)
            .get();
        if (listingSnap.exists) {
            const listing = listingSnap.data();
            if (listing.auditId) {
                await db.collection("tax_credit_audits").doc(listing.auditId).update({
                    status: "transferred",
                    updatedAt: now,
                });
            }
        }
        console.log(`Credit transfer completed: ${transactionId}`);
        return { success: true };
    }
    catch (error) {
        console.error(`Complete credit transfer error (${transactionId}):`, error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to complete transfer");
    }
});
/**
 * Get transaction history with timeline.
 *
 * @function getCreditTransactions
 * @type onCall
 * @auth firebase
 * @input {{ filters?: { sellerId?, buyerId?, status?, limit? } }}
 * @output {{ success: boolean, transactions: Array, count: number }}
 */
exports.getCreditTransactions = functions
    .runWith({ timeoutSeconds: 15, memory: "256MB" })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    const db = admin.firestore();
    const filters = (data === null || data === void 0 ? void 0 : data.filters) || {};
    const queryLimit = Math.min(filters.limit || 50, 200);
    try {
        let q = db.collection("tax_credit_transactions");
        if (filters.sellerId) {
            q = q.where("sellerId", "==", filters.sellerId);
        }
        else if (filters.buyerId) {
            q = q.where("buyerId", "==", filters.buyerId);
        }
        if (filters.status) {
            q = q.where("transfer.status", "==", filters.status);
        }
        q = q.orderBy("createdAt", "desc").limit(queryLimit);
        const snap = await q.get();
        const transactions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        return { success: true, transactions, count: transactions.length };
    }
    catch (error) {
        console.error("Get credit transactions error:", error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to get transactions");
    }
});
/**
 * Get marketplace statistics for admin dashboard.
 *
 * @function getCreditMarketStats
 * @type onCall
 * @auth firebase (admin)
 * @output {{ success: boolean, stats: object }}
 */
exports.getCreditMarketStats = functions
    .runWith({ timeoutSeconds: 30, memory: "512MB" })
    .https.onCall(async (_data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    // Admin-only: verify caller has admin role
    const db = admin.firestore();
    const callerSnap = await db.collection("users").doc(context.auth.uid).get();
    if (!callerSnap.exists || ((_a = callerSnap.data()) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }
    try {
        // Fetch all listings
        const listingsSnap = await db.collection("tax_credit_listings").get();
        const txSnap = await db.collection("tax_credit_transactions").get();
        let totalListed = 0;
        let totalListedValue = 0;
        let activeListed = 0;
        let activeListedValue = 0;
        const byState = {};
        listingsSnap.docs.forEach((d) => {
            var _a, _b, _c;
            const l = d.data();
            totalListed++;
            totalListedValue += ((_a = l.listing) === null || _a === void 0 ? void 0 : _a.creditAmount) || 0;
            if (l.status === "active" || l.status === "under_offer") {
                activeListed++;
                activeListedValue += ((_b = l.listing) === null || _b === void 0 ? void 0 : _b.creditAmount) || 0;
            }
            const state = ((_c = l.projectSummary) === null || _c === void 0 ? void 0 : _c.state) || "Unknown";
            byState[state] = (byState[state] || 0) + 1;
        });
        let totalSold = 0;
        let totalSoldValue = 0;
        let totalPlatformRevenue = 0;
        let totalDiscountSum = 0;
        const byMonth = {};
        txSnap.docs.forEach((d) => {
            var _a, _b, _c, _d;
            const t = d.data();
            if (((_a = t.transfer) === null || _a === void 0 ? void 0 : _a.status) === "completed") {
                totalSold++;
                totalSoldValue += t.salePrice || 0;
                totalPlatformRevenue += t.platformFee || 0;
                totalDiscountSum += t.discountRate || 0;
                // Group by month
                const completedAt = (_d = (_c = (_b = t.transfer) === null || _b === void 0 ? void 0 : _b.completedAt) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c);
                if (completedAt) {
                    const monthKey = `${completedAt.getFullYear()}-${String(completedAt.getMonth() + 1).padStart(2, "0")}`;
                    if (!byMonth[monthKey])
                        byMonth[monthKey] = { count: 0, volume: 0 };
                    byMonth[monthKey].count++;
                    byMonth[monthKey].volume += t.salePrice || 0;
                }
            }
        });
        const avgDiscount = totalSold > 0
            ? Math.round((totalDiscountSum / totalSold) * 100) / 100
            : 0;
        return {
            success: true,
            stats: {
                totalListed,
                totalListedValue,
                activeListed,
                activeListedValue,
                totalSold,
                totalSoldValue,
                avgDiscount,
                totalPlatformRevenue,
                byState,
                byMonth,
            },
        };
    }
    catch (error) {
        console.error("Get credit market stats error:", error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to get market stats");
    }
});
//# sourceMappingURL=taxCreditService.js.map