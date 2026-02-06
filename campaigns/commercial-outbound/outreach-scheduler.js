/**
 * Automated Outreach Scheduler
 * Manages email sequences, scheduling, and tracking
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  generateEmail,
  getEmailSequence,
} from "./templates/email-templates.js";
import nodemailer from "nodemailer";
import { OUTREACH_STATUS, LEAD_STATUS } from "./schema.js";

export class OutreachScheduler {
  constructor(options = {}) {
    this.db = getFirestore();
    this.emailProvider = options.emailProvider || "sendgrid"; // or 'gmail', 'ses'
    this.fromEmail = options.fromEmail || process.env.OUTREACH_FROM_EMAIL;
    this.fromName = options.fromName || "Power to the People Solar";

    // Initialize email transporter
    this.transporter = this.initializeTransporter(options);
  }

  /**
   * Initialize email transporter based on provider
   */
  initializeTransporter(options) {
    if (this.emailProvider === "gmail") {
      return nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: options.gmailUser || process.env.GMAIL_USER,
          pass: options.gmailPassword || process.env.GMAIL_APP_PASSWORD,
        },
      });
    }

    // For SendGrid, AWS SES, etc., configure appropriately
    // This is a placeholder - implement based on your email service
    return null;
  }

  /**
   * Create a new campaign
   */
  async createCampaign(campaignData) {
    const campaign = {
      ...campaignData,
      status: "draft",
      leadsTargeted: 0,
      emailsSent: 0,
      emailsOpened: 0,
      emailsClicked: 0,
      emailsReplied: 0,
      qualifiedLeads: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await this.db.collection("campaigns").add(campaign);

    console.log(`✅ Campaign created: ${docRef.id}`);
    return { id: docRef.id, ...campaign };
  }

  /**
   * Add leads to a campaign
   */
  async addLeadsToCampaign(campaignId, leadIds) {
    const batch = this.db.batch();
    const campaign = await this.db
      .collection("campaigns")
      .doc(campaignId)
      .get();

    if (!campaign.exists) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    const campaignData = campaign.data();
    const sequence = getEmailSequence(campaignData.sequenceType || "standard");

    // Add leads and schedule first email
    for (const leadId of leadIds) {
      const leadRef = this.db.collection("commercialLeads").doc(leadId);
      const lead = await leadRef.get();

      if (!lead.exists) continue;

      // Update lead with campaign assignment
      batch.update(leadRef, {
        assignedCampaigns: [
          ...(lead.data().assignedCampaigns || []),
          campaignId,
        ],
        status: LEAD_STATUS.CONTACTED,
        updatedAt: Timestamp.now(),
      });

      // Schedule email sequence
      await this.scheduleEmailSequence(campaignId, leadId, sequence);
    }

    // Update campaign metrics
    batch.update(campaign.ref, {
      leadsTargeted: campaignData.leadsTargeted + leadIds.length,
      updatedAt: Timestamp.now(),
    });

    await batch.commit();

    console.log(`✅ Added ${leadIds.length} leads to campaign ${campaignId}`);
  }

  /**
   * Schedule email sequence for a lead
   */
  async scheduleEmailSequence(campaignId, leadId, sequence) {
    const now = new Date();

    for (const step of sequence) {
      const scheduledDate = new Date(now);
      scheduledDate.setDate(scheduledDate.getDate() + step.delayDays);

      // Set to 9 AM local time (adjust based on lead timezone)
      scheduledDate.setHours(9, 0, 0, 0);

      const outreach = {
        campaignId,
        leadId,
        type: "email",
        step: sequence.indexOf(step) + 1,
        template: step.template,
        status: OUTREACH_STATUS.SCHEDULED,
        scheduledFor: Timestamp.fromDate(scheduledDate),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await this.db.collection("outreach").add(outreach);
    }
  }

  /**
   * Process scheduled outreach (run this via cron)
   */
  async processScheduledOutreach() {
    const now = Timestamp.now();

    // Get all scheduled outreach that's due
    const snapshot = await this.db
      .collection("outreach")
      .where("status", "==", OUTREACH_STATUS.SCHEDULED)
      .where("scheduledFor", "<=", now)
      .limit(50) // Process in batches
      .get();

    console.log(`📧 Processing ${snapshot.size} scheduled outreach items...`);

    for (const doc of snapshot.docs) {
      await this.sendOutreach(doc.id);
    }

    return snapshot.size;
  }

  /**
   * Send a single outreach email
   */
  async sendOutreach(outreachId) {
    const outreachRef = this.db.collection("outreach").doc(outreachId);
    const outreach = await outreachRef.get();

    if (!outreach.exists) {
      throw new Error(`Outreach ${outreachId} not found`);
    }

    const outreachData = outreach.data();

    // Get lead data
    const lead = await this.db
      .collection("commercialLeads")
      .doc(outreachData.leadId)
      .get();
    if (!lead.exists) {
      console.error(`Lead ${outreachData.leadId} not found`);
      return;
    }

    const leadData = lead.data();

    // Check if lead has unsubscribed
    if (leadData.unsubscribed) {
      await outreachRef.update({
        status: OUTREACH_STATUS.UNSUBSCRIBED,
        updatedAt: Timestamp.now(),
      });
      return;
    }

    // Generate personalized email
    const email = generateEmail(outreachData.template, leadData);

    // Add tracking
    const trackingPixelUrl = `https://your-domain.com/api/track/open/${outreachId}`;
    const emailWithTracking = this.addEmailTracking(
      email,
      outreachId,
      trackingPixelUrl,
    );

    // Send email
    try {
      await this.sendEmail({
        to: leadData.contactEmail,
        from: `${this.fromName} <${this.fromEmail}>`,
        subject: emailWithTracking.subject,
        text: emailWithTracking.body,
        html: this.convertToHTML(emailWithTracking.body, trackingPixelUrl),
      });

      // Update outreach status
      await outreachRef.update({
        status: OUTREACH_STATUS.SENT,
        sentAt: Timestamp.now(),
        subject: email.subject,
        body: email.body,
        toEmail: leadData.contactEmail,
        fromEmail: this.fromEmail,
        trackingPixelUrl,
        updatedAt: Timestamp.now(),
      });

      // Update campaign metrics
      await this.updateCampaignMetrics(outreachData.campaignId, "sent");

      console.log(`✅ Sent email to ${leadData.contactEmail}`);
    } catch (error) {
      console.error(`❌ Failed to send email:`, error);

      await outreachRef.update({
        status: OUTREACH_STATUS.BOUNCED,
        error: error.message,
        updatedAt: Timestamp.now(),
      });
    }
  }

  /**
   * Send email via transporter
   */
  async sendEmail(emailData) {
    if (!this.transporter) {
      console.log("📧 Email would be sent:", emailData.subject);
      return; // Dry run mode
    }

    return await this.transporter.sendMail(emailData);
  }

  /**
   * Add tracking to email
   */
  addEmailTracking(email, outreachId, trackingPixelUrl) {
    // Add unsubscribe link
    const unsubscribeUrl = `https://your-domain.com/unsubscribe/${outreachId}`;

    email.body += `\n\n---\n[Unsubscribe](${unsubscribeUrl})`;

    return email;
  }

  /**
   * Convert plain text to HTML
   */
  convertToHTML(text, trackingPixelUrl) {
    // Convert markdown-style formatting to HTML
    let html = text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>")
      .replace(/^• (.+)$/gm, "<li>$1</li>");

    // Wrap lists in <ul>
    html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");

    // Add tracking pixel
    html += `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none" />`;

    return `<html><body>${html}</body></html>`;
  }

  /**
   * Update campaign metrics
   */
  async updateCampaignMetrics(campaignId, metric) {
    const campaignRef = this.db.collection("campaigns").doc(campaignId);

    const updates = {
      updatedAt: Timestamp.now(),
    };

    switch (metric) {
      case "sent":
        updates.emailsSent = this.db.FieldValue.increment(1);
        break;
      case "opened":
        updates.emailsOpened = this.db.FieldValue.increment(1);
        break;
      case "clicked":
        updates.emailsClicked = this.db.FieldValue.increment(1);
        break;
      case "replied":
        updates.emailsReplied = this.db.FieldValue.increment(1);
        break;
    }

    await campaignRef.update(updates);
  }

  /**
   * Track email open
   */
  async trackEmailOpen(outreachId) {
    const outreachRef = this.db.collection("outreach").doc(outreachId);
    const outreach = await outreachRef.get();

    if (!outreach.exists) return;

    const outreachData = outreach.data();

    if (outreachData.status === OUTREACH_STATUS.SENT) {
      await outreachRef.update({
        status: OUTREACH_STATUS.OPENED,
        openedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await this.updateCampaignMetrics(outreachData.campaignId, "opened");

      // Update lead status
      await this.db
        .collection("commercialLeads")
        .doc(outreachData.leadId)
        .update({
          status: LEAD_STATUS.ENGAGED,
          lastContactDate: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
    }
  }

  /**
   * Track email click
   */
  async trackEmailClick(outreachId) {
    const outreachRef = this.db.collection("outreach").doc(outreachId);

    await outreachRef.update({
      status: OUTREACH_STATUS.CLICKED,
      clickedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    const outreach = await outreachRef.get();
    await this.updateCampaignMetrics(outreach.data().campaignId, "clicked");
  }

  /**
   * Record email reply
   */
  async recordReply(outreachId, replyText, sentiment = "neutral") {
    const outreachRef = this.db.collection("outreach").doc(outreachId);
    const outreach = await outreachRef.get();

    if (!outreach.exists) return;

    const outreachData = outreach.data();

    // Update outreach
    await outreachRef.update({
      status: OUTREACH_STATUS.REPLIED,
      repliedAt: Timestamp.now(),
      responseText: replyText,
      sentiment,
      updatedAt: Timestamp.now(),
    });

    // Create response document
    await this.db.collection("responses").add({
      leadId: outreachData.leadId,
      campaignId: outreachData.campaignId,
      outreachId,
      type: "email",
      text: replyText,
      sentiment,
      isQualified: sentiment === "positive" || sentiment === "interested",
      receivedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Update campaign metrics
    await this.updateCampaignMetrics(outreachData.campaignId, "replied");

    // Update lead status
    const newStatus =
      sentiment === "positive" || sentiment === "interested"
        ? LEAD_STATUS.QUALIFIED_OPPORTUNITY
        : LEAD_STATUS.ENGAGED;

    await this.db
      .collection("commercialLeads")
      .doc(outreachData.leadId)
      .update({
        status: newStatus,
        lastContactDate: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

    console.log(`📨 Reply recorded for outreach ${outreachId}`);
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId) {
    const campaign = await this.db
      .collection("campaigns")
      .doc(campaignId)
      .get();

    if (!campaign.exists) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    const data = campaign.data();

    // Calculate rates
    const openRate =
      data.emailsSent > 0 ? (data.emailsOpened / data.emailsSent) * 100 : 0;
    const clickRate =
      data.emailsSent > 0 ? (data.emailsClicked / data.emailsSent) * 100 : 0;
    const replyRate =
      data.emailsSent > 0 ? (data.emailsReplied / data.emailsSent) * 100 : 0;

    return {
      ...data,
      metrics: {
        openRate: openRate.toFixed(1) + "%",
        clickRate: clickRate.toFixed(1) + "%",
        replyRate: replyRate.toFixed(1) + "%",
        conversionRate:
          ((data.qualifiedLeads / data.leadsTargeted) * 100).toFixed(1) + "%",
      },
    };
  }
}

// Export for Cloud Functions
export default OutreachScheduler;
