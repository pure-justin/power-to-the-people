/**
 * Firebase Cloud Functions for Commercial Outreach Campaign
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import OutreachScheduler from "../campaigns/commercial-outbound/outreach-scheduler.js";

initializeApp();

/**
 * Scheduled function to process outreach emails
 * Runs every hour
 */
export const processOutreach = onSchedule("every 1 hours", async (event) => {
  console.log("🚀 Processing scheduled outreach...");

  const scheduler = new OutreachScheduler({
    emailProvider: "gmail",
    fromEmail: process.env.OUTREACH_FROM_EMAIL,
    fromName: "Power to the People Solar",
  });

  const processed = await scheduler.processScheduledOutreach();

  console.log(`✅ Processed ${processed} outreach items`);

  return { processed };
});

/**
 * HTTP endpoint to track email opens
 */
export const trackOpen = onRequest(async (req, res) => {
  const outreachId = req.path.split("/").pop();

  if (!outreachId) {
    res.status(400).send("Missing outreach ID");
    return;
  }

  const scheduler = new OutreachScheduler();
  await scheduler.trackEmailOpen(outreachId);

  // Return 1x1 transparent pixel
  const pixel = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64",
  );

  res.set("Content-Type", "image/gif");
  res.send(pixel);
});

/**
 * HTTP endpoint to track email clicks
 */
export const trackClick = onRequest(async (req, res) => {
  const outreachId = req.query.outreach;
  const url = req.query.url;

  if (!outreachId) {
    res.status(400).send("Missing outreach ID");
    return;
  }

  const scheduler = new OutreachScheduler();
  await scheduler.trackEmailClick(outreachId);

  // Redirect to original URL
  res.redirect(url || "https://power-to-the-people-vpp.web.app");
});

/**
 * HTTP endpoint to handle unsubscribes
 */
export const unsubscribe = onRequest(async (req, res) => {
  const outreachId = req.path.split("/").pop();

  if (!outreachId) {
    res.status(400).send("Missing outreach ID");
    return;
  }

  const db = getFirestore();

  // Get outreach document
  const outreach = await db.collection("outreach").doc(outreachId).get();

  if (!outreach.exists) {
    res.status(404).send("Outreach not found");
    return;
  }

  const leadId = outreach.data().leadId;

  // Mark lead as unsubscribed
  await db.collection("commercialLeads").doc(leadId).update({
    unsubscribed: true,
    unsubscribedAt: new Date(),
    updatedAt: new Date(),
  });

  res.send(`
    <html>
      <head><title>Unsubscribed</title></head>
      <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
        <h1>✅ You've been unsubscribed</h1>
        <p>You will no longer receive emails from Power to the People Solar.</p>
        <p>If you change your mind, please contact us at info@powertothepeoplesolar.com</p>
      </body>
    </html>
  `);
});

/**
 * HTTP endpoint to handle inbound replies (webhook from email provider)
 */
export const handleReply = onRequest(async (req, res) => {
  // This would integrate with your email provider's webhook
  // e.g., SendGrid Inbound Parse, AWS SES, etc.

  const { from, to, subject, text } = req.body;

  // Extract outreach ID from email headers or subject
  // This is implementation-specific based on your email provider

  const scheduler = new OutreachScheduler();

  // Analyze sentiment (simple keyword matching or use AI)
  const sentiment = analyzeSentiment(text);

  // Record the reply
  // await scheduler.recordReply(outreachId, text, sentiment);

  res.status(200).send("OK");
});

/**
 * Simple sentiment analysis
 */
function analyzeSentiment(text) {
  const lowerText = text.toLowerCase();

  const positiveKeywords = [
    "interested",
    "yes",
    "let's talk",
    "schedule",
    "call me",
    "sounds good",
    "tell me more",
  ];

  const negativeKeywords = [
    "not interested",
    "no thanks",
    "unsubscribe",
    "stop",
    "remove me",
  ];

  if (positiveKeywords.some((kw) => lowerText.includes(kw))) {
    return "positive";
  }

  if (negativeKeywords.some((kw) => lowerText.includes(kw))) {
    return "negative";
  }

  return "neutral";
}

/**
 * HTTP endpoint to get campaign analytics
 */
export const getCampaignAnalytics = onRequest(async (req, res) => {
  const campaignId = req.query.campaignId;

  if (!campaignId) {
    res.status(400).json({ error: "Missing campaignId" });
    return;
  }

  const scheduler = new OutreachScheduler();
  const analytics = await scheduler.getCampaignAnalytics(campaignId);

  res.json(analytics);
});
