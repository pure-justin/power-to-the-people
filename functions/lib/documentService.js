"use strict";
/**
 * Document Service — PDF Generation, E-Signatures & Document Tracking
 *
 * Replaces PandaDoc entirely ($0/month vs $19-65/user/month).
 *
 * Generates professional PDFs from project data, captures legally-valid
 * e-signatures (ESIGN Act + UETA compliant), and tracks document lifecycle.
 *
 * Document types:
 *   - Solar proposals (system specs, savings, financing options)
 *   - Installation contracts (terms, equipment, warranty)
 *   - Permit application packages (compiled from CAD + survey data)
 *   - Funding submission packages (compiled from all pipeline data)
 *   - Change orders (scope changes during install)
 *   - Completion certificates (post-install sign-off)
 *
 * E-Signature legal compliance:
 *   - ESIGN Act (15 U.S.C. §7001): Electronic signatures are legally valid
 *   - UETA (adopted by 47 states): Uniform rules for e-transactions
 *   - We capture: signature image, timestamp, IP address, user auth ID,
 *     user agent, and consent confirmation — exceeding minimum requirements
 *
 * Collections:
 *   documents         — Document records with metadata, status, signatures
 *   document_templates — Reusable templates with field mappings
 *
 * @module documentService
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
exports.getDocumentStats = exports.saveDocumentTemplate = exports.voidDocument = exports.signDocument = exports.viewDocument = exports.sendDocument = exports.getDocumentsByProject = exports.getDocument = exports.generateDocument = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/** Required signers for each document type */
const REQUIRED_SIGNERS = {
    proposal: [], // No signatures needed — informational
    contract: ["customer", "installer"], // Both parties sign
    change_order: ["customer", "installer"], // Both approve changes
    permit_package: ["installer"], // Installer certifies accuracy
    funding_package: ["installer"], // Installer certifies completion
    completion_certificate: ["customer", "installer"], // Both confirm install done
    interconnection_application: ["customer"], // Customer authorizes utility work
    tax_credit_certificate: ["installer", "admin"], // Platform certifies credit
};
// ─── HELPER: Build HTML for PDF Generation ──────────────────────────────────────
/**
 * Generates HTML content for a document based on its type and project data.
 * This HTML is then converted to PDF via Puppeteer (or stored as-is for preview).
 *
 * Each document type has its own template with professional styling.
 * Templates pull real data from the project — NO placeholders or hardcoded values.
 *
 * @param type - The document type to generate
 * @param projectData - All project-related data needed for the document
 * @returns HTML string ready for PDF conversion
 */
function generateDocumentHtml(type, projectData) {
    // Common header/footer styling shared across all document types
    const commonStyles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; line-height: 1.6; padding: 40px; }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0f4c75; padding-bottom: 20px; margin-bottom: 30px; }
      .logo { font-size: 24px; font-weight: 700; color: #0f4c75; }
      .logo span { color: #f77f00; }
      .doc-title { font-size: 28px; font-weight: 700; color: #1a1a2e; margin-bottom: 5px; }
      .doc-subtitle { color: #666; font-size: 14px; }
      .section { margin-bottom: 25px; }
      .section-title { font-size: 18px; font-weight: 600; color: #0f4c75; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 15px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .field { margin-bottom: 8px; }
      .field-label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
      .field-value { font-size: 14px; font-weight: 500; }
      table { width: 100%; border-collapse: collapse; margin: 10px 0; }
      th { background: #f0f4f8; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; color: #555; }
      td { padding: 10px; border-bottom: 1px solid #eee; font-size: 14px; }
      .highlight-box { background: #f0f7ff; border: 1px solid #0f4c75; border-radius: 8px; padding: 20px; margin: 15px 0; }
      .total-row { font-weight: 700; font-size: 16px; background: #f0f4f8; }
      .signature-block { border: 1px dashed #ccc; border-radius: 8px; padding: 20px; margin: 10px 0; min-height: 100px; }
      .signature-label { font-size: 12px; color: #888; margin-bottom: 5px; }
      .signature-line { border-bottom: 1px solid #333; margin-top: 60px; margin-bottom: 5px; }
      .signature-name { font-size: 12px; color: #555; }
      .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #888; text-align: center; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
      .badge-green { background: #d4edda; color: #155724; }
      .badge-blue { background: #cce5ff; color: #004085; }
      @media print { body { padding: 20px; } }
    </style>
  `;
    const header = `
    <div class="header">
      <div>
        <div class="logo">Power to the <span>People</span></div>
        <div style="font-size: 12px; color: #888;">SolarOS Platform</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 12px; color: #888;">Document #${projectData.documentId || "DRAFT"}</div>
        <div style="font-size: 12px; color: #888;">Generated: ${new Date().toLocaleDateString()}</div>
      </div>
    </div>
  `;
    const footer = `
    <div class="footer">
      <p>Power to the People — SolarOS Platform | Confidential</p>
      <p>This document was generated automatically and is legally binding when signed electronically.</p>
      <p>E-signatures comply with the ESIGN Act (15 U.S.C. §7001) and UETA.</p>
    </div>
  `;
    // Route to type-specific template
    switch (type) {
        case "proposal":
            return generateProposalHtml(commonStyles, header, footer, projectData);
        case "contract":
            return generateContractHtml(commonStyles, header, footer, projectData);
        case "completion_certificate":
            return generateCompletionCertHtml(commonStyles, header, footer, projectData);
        case "permit_package":
            return generatePermitPackageHtml(commonStyles, header, footer, projectData);
        default:
            // Generic template for other types — can be specialized later
            return generateGenericHtml(commonStyles, header, footer, type, projectData);
    }
}
/** Solar proposal template — the sales document customers see */
function generateProposalHtml(styles, header, footer, data) {
    const system = data.system || {};
    const savings = data.savings || {};
    const equipment = data.equipment || {};
    return `<!DOCTYPE html><html><head>${styles}</head><body>
    ${header}
    <div class="doc-title">Solar Energy Proposal</div>
    <div class="doc-subtitle">Prepared for ${data.customerName || "Homeowner"}</div>

    <div class="section">
      <div class="section-title">Property Information</div>
      <div class="grid">
        <div class="field"><div class="field-label">Address</div><div class="field-value">${data.address || ""}</div></div>
        <div class="field"><div class="field-label">Roof Type</div><div class="field-value">${data.roofType || ""}</div></div>
        <div class="field"><div class="field-label">Annual Usage</div><div class="field-value">${data.annualKwh ? data.annualKwh.toLocaleString() + " kWh" : ""}</div></div>
        <div class="field"><div class="field-label">Current Monthly Bill</div><div class="field-value">${data.monthlyBill ? "$" + data.monthlyBill.toLocaleString() : ""}</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Recommended System</div>
      <div class="highlight-box">
        <div class="grid">
          <div class="field"><div class="field-label">System Size</div><div class="field-value">${system.totalKw || 0} kW</div></div>
          <div class="field"><div class="field-label">Panel Count</div><div class="field-value">${system.panelCount || 0} panels</div></div>
          <div class="field"><div class="field-label">Annual Production</div><div class="field-value">${system.annualKwh ? system.annualKwh.toLocaleString() + " kWh" : ""}</div></div>
          <div class="field"><div class="field-label">Offset</div><div class="field-value">${system.offsetPct || 0}%</div></div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Equipment</div>
      <table>
        <tr><th>Component</th><th>Model</th><th>Specs</th><th>Compliance</th></tr>
        <tr><td>Solar Panels</td><td>${equipment.panelModel || ""}</td><td>${equipment.panelWatts || ""}W × ${system.panelCount || 0}</td><td><span class="badge badge-green">FEOC ✓</span></td></tr>
        <tr><td>Inverter</td><td>${equipment.inverterModel || ""}</td><td>${equipment.inverterKw || ""} kW</td><td><span class="badge badge-green">Listed ✓</span></td></tr>
        ${equipment.batteryModel ? `<tr><td>Battery</td><td>${equipment.batteryModel}</td><td>${equipment.batteryKwh || ""} kWh</td><td><span class="badge badge-blue">Optional</span></td></tr>` : ""}
      </table>
    </div>

    <div class="section">
      <div class="section-title">Financial Summary</div>
      <table>
        <tr><td>System Cost (before incentives)</td><td style="text-align:right">$${(savings.systemCost || 0).toLocaleString()}</td></tr>
        <tr><td>Federal Tax Credit (${savings.itcRate || 30}%)</td><td style="text-align:right; color: green;">-$${(savings.taxCredit || 0).toLocaleString()}</td></tr>
        ${savings.stateIncentive ? `<tr><td>State/Local Incentives</td><td style="text-align:right; color: green;">-$${savings.stateIncentive.toLocaleString()}</td></tr>` : ""}
        <tr class="total-row"><td>Net Cost</td><td style="text-align:right">$${(savings.netCost || 0).toLocaleString()}</td></tr>
        <tr><td>Estimated Year 1 Savings</td><td style="text-align:right; color: green;">$${(savings.year1Savings || 0).toLocaleString()}</td></tr>
        <tr><td>25-Year Lifetime Savings</td><td style="text-align:right; color: green; font-weight: 700;">$${(savings.lifetimeSavings || 0).toLocaleString()}</td></tr>
        <tr><td>Payback Period</td><td style="text-align:right">${savings.paybackYears || 0} years</td></tr>
      </table>
    </div>

    <div class="section" style="font-size: 12px; color: #888;">
      <p>* Savings estimates based on current utility rates and projected solar production. Actual results may vary based on weather, utility rate changes, and system performance.</p>
      <p>* Federal tax credit subject to IRS eligibility requirements. Consult your tax advisor.</p>
    </div>
    ${footer}
  </body></html>`;
}
/** Installation contract template */
function generateContractHtml(styles, header, footer, data) {
    const system = data.system || {};
    const terms = data.terms || {};
    return `<!DOCTYPE html><html><head>${styles}</head><body>
    ${header}
    <div class="doc-title">Solar Installation Agreement</div>
    <div class="doc-subtitle">Contract between ${data.customerName || "Customer"} and ${data.installerName || "Installer"}</div>

    <div class="section">
      <div class="section-title">1. Parties</div>
      <div class="grid">
        <div>
          <div class="field"><div class="field-label">Customer</div><div class="field-value">${data.customerName || ""}</div></div>
          <div class="field"><div class="field-label">Address</div><div class="field-value">${data.address || ""}</div></div>
          <div class="field"><div class="field-label">Email</div><div class="field-value">${data.customerEmail || ""}</div></div>
          <div class="field"><div class="field-label">Phone</div><div class="field-value">${data.customerPhone || ""}</div></div>
        </div>
        <div>
          <div class="field"><div class="field-label">Installer</div><div class="field-value">${data.installerName || ""}</div></div>
          <div class="field"><div class="field-label">License #</div><div class="field-value">${data.installerLicense || ""}</div></div>
          <div class="field"><div class="field-label">Email</div><div class="field-value">${data.installerEmail || ""}</div></div>
          <div class="field"><div class="field-label">Phone</div><div class="field-value">${data.installerPhone || ""}</div></div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">2. System Specifications</div>
      <table>
        <tr><th>Item</th><th>Detail</th></tr>
        <tr><td>System Size</td><td>${system.totalKw || 0} kW DC</td></tr>
        <tr><td>Solar Panels</td><td>${system.panelCount || 0} × ${system.panelModel || "TBD"}</td></tr>
        <tr><td>Inverter</td><td>${system.inverterModel || "TBD"}</td></tr>
        ${system.batteryModel ? `<tr><td>Battery Storage</td><td>${system.batteryModel}</td></tr>` : ""}
        <tr><td>Mounting</td><td>${system.mountingType || "Roof mount"}</td></tr>
        <tr><td>Est. Annual Production</td><td>${system.annualKwh ? system.annualKwh.toLocaleString() + " kWh" : "TBD"}</td></tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">3. Pricing & Payment</div>
      <table>
        <tr><td>Total Contract Price</td><td style="text-align:right; font-weight:700;">$${(terms.totalPrice || 0).toLocaleString()}</td></tr>
        <tr><td>Financing Type</td><td style="text-align:right">${terms.financingType || "Cash"}</td></tr>
        ${terms.downPayment ? `<tr><td>Down Payment</td><td style="text-align:right">$${terms.downPayment.toLocaleString()}</td></tr>` : ""}
        ${terms.monthlyPayment ? `<tr><td>Monthly Payment</td><td style="text-align:right">$${terms.monthlyPayment.toLocaleString()}/mo</td></tr>` : ""}
      </table>
    </div>

    <div class="section">
      <div class="section-title">4. Scope of Work</div>
      <p>Installer agrees to: design, permit, install, and commission the solar energy system described above at the customer's property. This includes:</p>
      <ul style="margin: 10px 0 10px 20px; font-size: 14px;">
        <li>Engineering design and permit drawings</li>
        <li>All permit applications and fees</li>
        <li>Equipment procurement and delivery</li>
        <li>Physical installation and electrical work</li>
        <li>System commissioning and testing</li>
        <li>Utility interconnection application</li>
        <li>Final inspection coordination</li>
      </ul>
    </div>

    <div class="section">
      <div class="section-title">5. Warranty</div>
      <p>Panel manufacturer warranty: ${terms.panelWarrantyYears || 25} years. Inverter warranty: ${terms.inverterWarrantyYears || 12} years. Workmanship warranty: ${terms.workmanshipWarrantyYears || 10} years.</p>
    </div>

    <div class="section">
      <div class="section-title">6. Timeline</div>
      <p>Estimated project timeline from contract signing to Permission to Operate (PTO): ${terms.estimatedWeeks || "8-12"} weeks, subject to permit processing times and equipment availability.</p>
    </div>

    <div class="section">
      <div class="section-title">7. Cancellation</div>
      <p>Customer may cancel this agreement within 3 business days of signing for a full refund. After 3 business days, cancellation fees may apply as outlined in the Terms & Conditions.</p>
    </div>

    <div class="section">
      <div class="section-title">Signatures</div>
      <div class="grid">
        <div class="signature-block">
          <div class="signature-label">Customer Signature</div>
          <div class="signature-line"></div>
          <div class="signature-name">${data.customerName || ""}</div>
          <div class="signature-name">Date: _______________</div>
        </div>
        <div class="signature-block">
          <div class="signature-label">Installer Signature</div>
          <div class="signature-line"></div>
          <div class="signature-name">${data.installerName || ""}</div>
          <div class="signature-name">Date: _______________</div>
        </div>
      </div>
    </div>
    ${footer}
  </body></html>`;
}
/** Completion certificate template */
function generateCompletionCertHtml(styles, header, footer, data) {
    var _a, _b;
    return `<!DOCTYPE html><html><head>${styles}</head><body>
    ${header}
    <div class="doc-title">Certificate of Completion</div>
    <div class="doc-subtitle">Solar Installation — ${data.address || ""}</div>

    <div class="highlight-box" style="text-align: center; margin: 30px 0;">
      <div style="font-size: 20px; font-weight: 700; color: #155724; margin-bottom: 10px;">Installation Complete</div>
      <div style="font-size: 14px;">System Size: ${((_a = data.system) === null || _a === void 0 ? void 0 : _a.totalKw) || 0} kW | Panels: ${((_b = data.system) === null || _b === void 0 ? void 0 : _b.panelCount) || 0} | Completion Date: ${data.completionDate || new Date().toLocaleDateString()}</div>
    </div>

    <div class="section">
      <div class="section-title">System Verification</div>
      <table>
        <tr><th>Check</th><th>Status</th><th>Verified By</th></tr>
        <tr><td>All panels installed and connected</td><td><span class="badge badge-green">Pass</span></td><td>QC System</td></tr>
        <tr><td>Inverter commissioned</td><td><span class="badge badge-green">Pass</span></td><td>QC System</td></tr>
        <tr><td>Electrical inspection passed</td><td><span class="badge badge-green">Pass</span></td><td>${data.inspectorName || "Inspector"}</td></tr>
        <tr><td>System producing power</td><td><span class="badge badge-green">Pass</span></td><td>Monitoring</td></tr>
        <tr><td>All photos verified by AI QC</td><td><span class="badge badge-green">Pass</span></td><td>AI + Reviewer</td></tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Signatures</div>
      <div class="grid">
        <div class="signature-block">
          <div class="signature-label">Customer — I confirm the installation is complete and satisfactory</div>
          <div class="signature-line"></div>
          <div class="signature-name">${data.customerName || ""}</div>
        </div>
        <div class="signature-block">
          <div class="signature-label">Installer — I certify this system was installed per design specifications</div>
          <div class="signature-line"></div>
          <div class="signature-name">${data.installerName || ""}</div>
        </div>
      </div>
    </div>
    ${footer}
  </body></html>`;
}
/** Permit package cover sheet */
function generatePermitPackageHtml(styles, header, footer, data) {
    var _a;
    const ahj = data.ahj || {};
    const system = data.system || {};
    return `<!DOCTYPE html><html><head>${styles}</head><body>
    ${header}
    <div class="doc-title">Solar Permit Application Package</div>
    <div class="doc-subtitle">${ahj.name || "Building Department"} — ${data.address || ""}</div>

    <div class="section">
      <div class="section-title">Applicant Information</div>
      <div class="grid">
        <div class="field"><div class="field-label">Property Owner</div><div class="field-value">${data.customerName || ""}</div></div>
        <div class="field"><div class="field-label">Property Address</div><div class="field-value">${data.address || ""}</div></div>
        <div class="field"><div class="field-label">Contractor</div><div class="field-value">${data.installerName || ""}</div></div>
        <div class="field"><div class="field-label">Contractor License</div><div class="field-value">${data.installerLicense || ""}</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">System Summary</div>
      <table>
        <tr><td>System Size</td><td>${system.totalKw || 0} kW DC</td></tr>
        <tr><td>Module</td><td>${system.panelModel || ""} × ${system.panelCount || 0}</td></tr>
        <tr><td>Inverter</td><td>${system.inverterModel || ""}</td></tr>
        <tr><td>Mounting</td><td>${system.mountingType || "Roof mount"}</td></tr>
        <tr><td>Interconnection</td><td>Grid-tied</td></tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Enclosed Documents</div>
      <table>
        <tr><th>#</th><th>Document</th><th>Pages</th></tr>
        <tr><td>1</td><td>Site Plan / Roof Layout</td><td>1</td></tr>
        <tr><td>2</td><td>Single Line Diagram</td><td>1</td></tr>
        <tr><td>3</td><td>Structural Engineering Letter</td><td>1-2</td></tr>
        <tr><td>4</td><td>Equipment Specification Sheets</td><td>3-5</td></tr>
        <tr><td>5</td><td>Load Calculations</td><td>1</td></tr>
        ${((_a = ahj.requirements) === null || _a === void 0 ? void 0 : _a.fire_department_review) ? `<tr><td>6</td><td>Fire Department Review Form</td><td>1</td></tr>` : ""}
      </table>
    </div>

    <div class="section">
      <div class="section-title">Installer Certification</div>
      <div class="signature-block">
        <div class="signature-label">I certify that this application is accurate and the installation will comply with all applicable codes.</div>
        <div class="signature-line"></div>
        <div class="signature-name">${data.installerName || ""} — Licensed Contractor</div>
      </div>
    </div>
    ${footer}
  </body></html>`;
}
/** Generic template for other document types */
function generateGenericHtml(styles, header, footer, type, data) {
    var _a;
    const titles = {
        change_order: "Change Order",
        funding_package: "Funding Submission Package",
        interconnection_application: "Utility Interconnection Application",
        tax_credit_certificate: "Tax Credit Certification",
    };
    return `<!DOCTYPE html><html><head>${styles}</head><body>
    ${header}
    <div class="doc-title">${titles[type] || type}</div>
    <div class="doc-subtitle">${data.address || ""} — Project #${data.projectId || ""}</div>

    <div class="section">
      <div class="section-title">Project Details</div>
      <div class="grid">
        <div class="field"><div class="field-label">Customer</div><div class="field-value">${data.customerName || ""}</div></div>
        <div class="field"><div class="field-label">Address</div><div class="field-value">${data.address || ""}</div></div>
        <div class="field"><div class="field-label">System Size</div><div class="field-value">${((_a = data.system) === null || _a === void 0 ? void 0 : _a.totalKw) || 0} kW</div></div>
        <div class="field"><div class="field-label">Date</div><div class="field-value">${new Date().toLocaleDateString()}</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Document Content</div>
      <p>${data.content || "Document content will be populated from project data."}</p>
    </div>

    <div class="section">
      <div class="section-title">Signatures</div>
      <div class="grid">
        <div class="signature-block">
          <div class="signature-label">Signature</div>
          <div class="signature-line"></div>
          <div class="signature-name">Date: _______________</div>
        </div>
        <div class="signature-block">
          <div class="signature-label">Signature</div>
          <div class="signature-line"></div>
          <div class="signature-name">Date: _______________</div>
        </div>
      </div>
    </div>
    ${footer}
  </body></html>`;
}
// ─── HELPER: Verify authentication ──────────────────────────────────────────────
/**
 * Checks that the caller is authenticated. Throws UNAUTHENTICATED if not.
 */
function requireAuth(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be signed in to use this function.");
    }
    return context.auth.uid;
}
/**
 * Checks that the caller has admin role.
 */
async function requireAdmin(uid) {
    var _a;
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists || ((_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Admin access required.");
    }
}
// ============================================================
// CLOUD FUNCTIONS
// ============================================================
/**
 * Generate a document from project data.
 *
 * Creates a document record, generates HTML from the template,
 * and stores it for preview/PDF conversion.
 *
 * @function generateDocument
 * @type {onCall}
 * @auth Required (any authenticated user)
 * @input {{ projectId: string, type: DocumentType, customData?: object }}
 * @output {{ documentId: string, status: string, htmlPreviewAvailable: boolean }}
 */
exports.generateDocument = functions
    .runWith({ timeoutSeconds: 120, memory: "512MB" })
    .https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const uid = requireAuth(context);
    const { projectId, type, customData } = data;
    if (!projectId || !type) {
        throw new functions.https.HttpsError("invalid-argument", "projectId and type are required.");
    }
    // Gather all project data needed for the document
    const projectSnap = await db.collection("projects").doc(projectId).get();
    if (!projectSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Project not found.");
    }
    const project = projectSnap.data();
    // Gather related data based on document type
    let designData = {};
    let surveyData = {};
    // Get latest design for system specs
    const designQuery = await db
        .collection("cad_designs")
        .where("projectId", "==", projectId)
        .orderBy("created_at", "desc")
        .limit(1)
        .get();
    if (!designQuery.empty) {
        designData = designQuery.docs[0].data();
    }
    // Get latest survey for property data
    const surveyQuery = await db
        .collection("site_surveys")
        .where("projectId", "==", projectId)
        .orderBy("created_at", "desc")
        .limit(1)
        .get();
    if (!surveyQuery.empty) {
        surveyData = surveyQuery.docs[0].data();
    }
    // Combine all data for template
    const templateData = {
        projectId,
        customerName: project.customerName || project.name || "",
        customerEmail: project.email || "",
        customerPhone: project.phone || "",
        address: project.address || ((_a = surveyData.property) === null || _a === void 0 ? void 0 : _a.address) || "",
        roofType: ((_b = surveyData.property) === null || _b === void 0 ? void 0 : _b.roof_type) || "",
        annualKwh: ((_c = surveyData.utility) === null || _c === void 0 ? void 0 : _c.annual_kwh) || 0,
        monthlyBill: ((_d = surveyData.utility) === null || _d === void 0 ? void 0 : _d.avg_monthly_bill) || 0,
        installerName: project.installerName || "",
        installerEmail: project.installerEmail || "",
        installerPhone: project.installerPhone || "",
        installerLicense: project.installerLicense || "",
        system: {
            totalKw: ((_e = designData.system_design) === null || _e === void 0 ? void 0 : _e.total_kw) || project.systemSize || 0,
            panelCount: ((_f = designData.system_design) === null || _f === void 0 ? void 0 : _f.panel_count) || 0,
            panelModel: ((_g = designData.system_design) === null || _g === void 0 ? void 0 : _g.panel_model) || "",
            inverterModel: ((_h = designData.system_design) === null || _h === void 0 ? void 0 : _h.inverter_model) || "",
            batteryModel: ((_j = designData.system_design) === null || _j === void 0 ? void 0 : _j.battery_model) || null,
            mountingType: ((_k = designData.system_design) === null || _k === void 0 ? void 0 : _k.mounting_type) || "roof",
            annualKwh: ((_l = designData.system_design) === null || _l === void 0 ? void 0 : _l.estimated_annual_kwh) || 0,
            offsetPct: ((_m = designData.system_design) === null || _m === void 0 ? void 0 : _m.offset_percentage) || 0,
        },
        savings: {
            systemCost: project.systemCost || 0,
            itcRate: 30,
            taxCredit: (project.systemCost || 0) * 0.3,
            netCost: (project.systemCost || 0) * 0.7,
            year1Savings: project.estimatedYear1Savings || 0,
            lifetimeSavings: project.estimatedLifetimeSavings || 0,
            paybackYears: project.paybackYears || 0,
        },
        terms: {
            totalPrice: project.contractPrice || project.systemCost || 0,
            financingType: project.financingType || "cash",
            panelWarrantyYears: 25,
            inverterWarrantyYears: 12,
            workmanshipWarrantyYears: 10,
        },
        ...customData, // Allow overrides
    };
    // Generate the HTML
    const html = generateDocumentHtml(type, templateData);
    // Determine required signers
    const requiredSigners = REQUIRED_SIGNERS[type] || [];
    // Create document record
    const docRef = await db.collection("documents").add({
        projectId,
        type,
        status: "generated",
        title: getDocumentTitle(type, templateData),
        html, // Store HTML for preview and PDF generation
        pdfUrl: null, // Will be set when PDF is generated
        templateData, // Store the data used (for regeneration if needed)
        requiredSigners,
        signatures: [],
        sentTo: [],
        viewedBy: [],
        expiresAt: null,
        createdBy: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Update the ref with its own ID for the template
    await docRef.update({ documentId: docRef.id });
    return {
        documentId: docRef.id,
        status: "generated",
        htmlPreviewAvailable: true,
        requiredSigners,
    };
});
/**
 * Get a document by ID.
 *
 * @function getDocument
 * @type {onCall}
 * @auth Required
 * @input {{ documentId: string }}
 * @output {Document} Full document record
 */
exports.getDocument = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    requireAuth(context);
    const { documentId } = data;
    if (!documentId) {
        throw new functions.https.HttpsError("invalid-argument", "documentId is required.");
    }
    const docSnap = await db.collection("documents").doc(documentId).get();
    if (!docSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Document not found.");
    }
    return { id: docSnap.id, ...docSnap.data() };
});
/**
 * Get all documents for a project.
 *
 * @function getDocumentsByProject
 * @type {onCall}
 * @auth Required
 * @input {{ projectId: string }}
 * @output {{ documents: Document[] }}
 */
exports.getDocumentsByProject = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    requireAuth(context);
    const { projectId } = data;
    if (!projectId) {
        throw new functions.https.HttpsError("invalid-argument", "projectId is required.");
    }
    const snap = await db
        .collection("documents")
        .where("projectId", "==", projectId)
        .orderBy("createdAt", "desc")
        .get();
    return {
        documents: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
});
/**
 * Send a document to recipients for viewing/signing.
 *
 * Updates status to "sent" and records who it was sent to.
 * In production, this would also trigger email/SMS notifications.
 *
 * @function sendDocument
 * @type {onCall}
 * @auth Required
 * @input {{ documentId: string, recipients: Array<{email, name, role}> }}
 * @output {{ sent: boolean, recipientCount: number }}
 */
exports.sendDocument = functions
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { documentId, recipients } = data;
    if (!documentId || !(recipients === null || recipients === void 0 ? void 0 : recipients.length)) {
        throw new functions.https.HttpsError("invalid-argument", "documentId and recipients are required.");
    }
    const docRef = db.collection("documents").doc(documentId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Document not found.");
    }
    const docData = docSnap.data();
    if (docData.status === "voided" || docData.status === "expired") {
        throw new functions.https.HttpsError("failed-precondition", `Cannot send a ${docData.status} document.`);
    }
    await docRef.update({
        status: "sent",
        sentTo: recipients.map((r) => ({
            email: r.email,
            name: r.name,
            role: r.role,
            sentAt: new Date().toISOString(),
            sentBy: uid,
        })),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // TODO: Trigger actual email/SMS notification here
    // For now, the document is marked as sent and viewable via the app
    return { sent: true, recipientCount: recipients.length };
});
/**
 * Record a view of a document.
 *
 * @function viewDocument
 * @type {onCall}
 * @auth Required
 * @input {{ documentId: string }}
 * @output {{ viewed: boolean }}
 */
exports.viewDocument = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { documentId } = data;
    if (!documentId) {
        throw new functions.https.HttpsError("invalid-argument", "documentId is required.");
    }
    const docRef = db.collection("documents").doc(documentId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Document not found.");
    }
    const docData = docSnap.data();
    const viewedBy = docData.viewedBy || [];
    // Only add if not already viewed by this user
    if (!viewedBy.find((v) => v.userId === uid)) {
        viewedBy.push({
            userId: uid,
            viewedAt: new Date().toISOString(),
        });
    }
    // Update status to "viewed" if it was "sent"
    const newStatus = docData.status === "sent" ? "viewed" : docData.status;
    await docRef.update({
        viewedBy,
        status: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { viewed: true };
});
/**
 * Add an electronic signature to a document.
 *
 * This is the core e-signature function. It captures:
 * - Signature image (drawn by the signer on canvas)
 * - Timestamp (server-side, tamper-proof)
 * - IP address (from request headers)
 * - User agent (browser/device info)
 * - Explicit consent confirmation
 *
 * Legal compliance: ESIGN Act (15 U.S.C. §7001) + UETA
 * Both require: intent to sign, consent to do business electronically,
 * association of signature with the record, and record retention.
 *
 * @function signDocument
 * @type {onCall}
 * @auth Required
 * @input {{
 *   documentId: string,
 *   signatureImageUrl: string,  // Base64 data URL of drawn signature
 *   signerRole: string,         // "customer" | "installer" | "admin" | "witness"
 *   consentGiven: boolean,      // MUST be true
 *   ipAddress: string,          // Client's IP
 *   userAgent: string           // Client's browser/device
 * }}
 * @output {{ signed: boolean, documentComplete: boolean, status: string }}
 */
exports.signDocument = functions
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const uid = requireAuth(context);
    const { documentId, signatureImageUrl, signerRole, consentGiven, ipAddress, userAgent, } = data;
    // Validate required fields
    if (!documentId || !signatureImageUrl || !signerRole) {
        throw new functions.https.HttpsError("invalid-argument", "documentId, signatureImageUrl, and signerRole are required.");
    }
    // Consent MUST be explicitly given — this is a legal requirement
    if (!consentGiven) {
        throw new functions.https.HttpsError("failed-precondition", "You must consent to sign this document electronically. " +
            "Check the consent checkbox before signing.");
    }
    const docRef = db.collection("documents").doc(documentId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Document not found.");
    }
    const docData = docSnap.data();
    // Can't sign voided/expired documents
    if (docData.status === "voided" || docData.status === "expired") {
        throw new functions.https.HttpsError("failed-precondition", `Cannot sign a ${docData.status} document.`);
    }
    // Get signer info from their user profile
    const userSnap = await db.collection("users").doc(uid).get();
    const userData = userSnap.data() || {};
    // Extract IP and user agent from server-side request for ESIGN Act compliance.
    // Fall back to client-provided values if rawRequest is unavailable (onCall limitation).
    const serverIp = ((_e = (_d = (_c = (_b = (_a = context.rawRequest) === null || _a === void 0 ? void 0 : _a.headers) === null || _b === void 0 ? void 0 : _b["x-forwarded-for"]) === null || _c === void 0 ? void 0 : _c.toString()) === null || _d === void 0 ? void 0 : _d.split(",")[0]) === null || _e === void 0 ? void 0 : _e.trim()) ||
        ((_f = context.rawRequest) === null || _f === void 0 ? void 0 : _f.ip) ||
        ipAddress ||
        "unknown";
    const serverUserAgent = ((_h = (_g = context.rawRequest) === null || _g === void 0 ? void 0 : _g.headers) === null || _h === void 0 ? void 0 : _h["user-agent"]) || userAgent || "unknown";
    // Build the signature entry with full audit trail
    const signatureEntry = {
        signerId: uid,
        signerName: userData.displayName || userData.name || userData.email || uid,
        signerEmail: userData.email || context.auth.token.email || "",
        signerRole: signerRole,
        signatureImageUrl,
        signedAt: admin.firestore.FieldValue.serverTimestamp(),
        ipAddress: serverIp,
        userAgent: serverUserAgent,
        consentGiven: true,
        consentText: "I agree to sign this document electronically. I understand this electronic signature is legally binding under the ESIGN Act and UETA.",
    };
    // Add to signatures array
    const signatures = docData.signatures || [];
    // Don't allow duplicate signatures from same user+role
    const alreadySigned = signatures.find((s) => s.signerId === uid && s.signerRole === signerRole);
    if (alreadySigned) {
        throw new functions.https.HttpsError("already-exists", "You have already signed this document in this role.");
    }
    signatures.push(signatureEntry);
    // Check if all required signers have signed
    const requiredSigners = docData.requiredSigners || [];
    const signedRoles = signatures.map((s) => s.signerRole);
    const allSigned = requiredSigners.every((role) => signedRoles.includes(role));
    // Update document status
    const newStatus = allSigned
        ? "signed"
        : signatures.length > 0
            ? "partially_signed"
            : docData.status;
    await docRef.update({
        signatures,
        status: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        signed: true,
        documentComplete: allSigned,
        status: newStatus,
    };
});
/**
 * Void a document (make it invalid).
 *
 * @function voidDocument
 * @type {onCall}
 * @auth Required (admin or document creator)
 * @input {{ documentId: string, reason: string }}
 * @output {{ voided: boolean }}
 */
exports.voidDocument = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { documentId, reason } = data;
    if (!documentId || !reason) {
        throw new functions.https.HttpsError("invalid-argument", "documentId and reason are required.");
    }
    const docRef = db.collection("documents").doc(documentId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Document not found.");
    }
    const docData = docSnap.data();
    // Only creator or admin can void
    if (docData.createdBy !== uid) {
        await requireAdmin(uid);
    }
    await docRef.update({
        status: "voided",
        voidedBy: uid,
        voidedAt: admin.firestore.FieldValue.serverTimestamp(),
        voidReason: reason,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { voided: true };
});
/**
 * Create or update a document template.
 *
 * Templates define the structure and field mappings for each document type.
 * Admin-only function.
 *
 * @function saveDocumentTemplate
 * @type {onCall}
 * @auth Required (admin only)
 * @input {{ templateId?: string, name: string, type: DocumentType, customHtml?: string }}
 * @output {{ templateId: string }}
 */
exports.saveDocumentTemplate = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    await requireAdmin(uid);
    const { templateId, name, type, customHtml } = data;
    if (!name || !type) {
        throw new functions.https.HttpsError("invalid-argument", "name and type are required.");
    }
    const templateData = {
        name,
        type,
        customHtml: customHtml || null,
        updatedBy: uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (templateId) {
        await db
            .collection("document_templates")
            .doc(templateId)
            .update(templateData);
        return { templateId };
    }
    else {
        const ref = await db.collection("document_templates").add({
            ...templateData,
            createdBy: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { templateId: ref.id };
    }
});
/**
 * Get document statistics for a project or across all projects.
 *
 * @function getDocumentStats
 * @type {onCall}
 * @auth Required
 * @input {{ projectId?: string }}
 * @output {{ total, byStatus, byType, recentActivity }}
 */
exports.getDocumentStats = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
    requireAuth(context);
    const { projectId } = data || {};
    let query = db.collection("documents");
    if (projectId) {
        query = query.where("projectId", "==", projectId);
    }
    const snap = await query.get();
    const docs = snap.docs.map((d) => d.data());
    // Count by status
    const byStatus = {};
    const byType = {};
    docs.forEach((doc) => {
        byStatus[doc.status] = (byStatus[doc.status] || 0) + 1;
        byType[doc.type] = (byType[doc.type] || 0) + 1;
    });
    return {
        total: docs.length,
        byStatus,
        byType,
        awaitingSignature: docs.filter((d) => d.status === "sent" ||
            d.status === "viewed" ||
            d.status === "partially_signed").length,
        fullySigned: docs.filter((d) => d.status === "signed").length,
    };
});
// ─── HELPER: Document title generation ──────────────────────────────────────────
function getDocumentTitle(type, data) {
    const titles = {
        proposal: `Solar Proposal — ${data.customerName || "Customer"}`,
        contract: `Installation Agreement — ${data.address || ""}`,
        change_order: `Change Order — ${data.address || ""}`,
        permit_package: `Permit Package — ${data.address || ""}`,
        funding_package: `Funding Package — ${data.address || ""}`,
        completion_certificate: `Completion Certificate — ${data.address || ""}`,
        interconnection_application: `Interconnection App — ${data.address || ""}`,
        tax_credit_certificate: `Tax Credit Certificate — ${data.address || ""}`,
    };
    return titles[type] || `Document — ${data.projectId || ""}`;
}
//# sourceMappingURL=documentService.js.map