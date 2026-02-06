/**
 * Secure Lead Webhook - Example Integration
 *
 * Demonstrates how to integrate API key authentication with existing endpoints.
 * This is a secure version of leadWebhook that requires API key authentication.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { validateApiKeyFromRequest, ApiKeyScope } from "./apiKeys";
import { Lead, LeadStatus, LeadSource, CreateLeadInput } from "./leads";

/**
 * Secure Lead Webhook: Create lead with API key authentication
 *
 * This endpoint requires a valid API key with write_leads scope.
 * Rate limiting and usage tracking are handled automatically.
 */
export const secureLeadWebhook = functions
  .runWith({
    timeoutSeconds: 60,
    memory: "512MB",
  })
  .https.onRequest(async (req, res) => {
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      // Validate API key and check for write_leads scope
      const apiKeyData = await validateApiKeyFromRequest(
        req,
        ApiKeyScope.WRITE_LEADS,
      );

      console.log(
        `Authenticated request from API key ${apiKeyData.id} (user: ${apiKeyData.userId})`,
      );

      const data = req.body as CreateLeadInput;

      // Validate required fields
      if (
        !data.customerName ||
        !data.email ||
        !data.phone ||
        !data.address ||
        !data.city ||
        !data.state ||
        !data.zip
      ) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      // Create lead
      const db = admin.firestore();
      const leadRef = db.collection("leads").doc();

      const fullAddress = `${data.address}, ${data.city}, ${data.state} ${data.zip}`;

      const newLead: Lead = {
        id: leadRef.id,
        customerName: data.customerName,
        email: data.email.toLowerCase().trim(),
        phone: data.phone.replace(/\D/g, ""),
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        fullAddress,
        status: LeadStatus.SUBMITTED,
        source: data.source || LeadSource.API,
        score: 50,
        notes: [],
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        systemSize: data.systemSize,
        batterySize: data.batterySize,
        annualKwh: data.annualKwh,
        solarApiData: data.solarApiData,
        // Store API key info for tracking
        createdBy: apiKeyData.userId,
      };

      // Calculate lead score if we have solar data
      if (data.solarApiData || data.annualKwh || data.systemSize) {
        newLead.score = calculateLeadScore(newLead);
      }

      await leadRef.set(newLead);

      console.log(
        `API key ${apiKeyData.id} created lead ${leadRef.id} for ${data.customerName}`,
      );

      res.json({
        success: true,
        leadId: leadRef.id,
        message: "Lead created successfully",
        // Return usage info so client can track their quota
        usage: {
          requestsThisHour: apiKeyData.usageStats.requestsThisHour,
          hourlyLimit: apiKeyData.rateLimit.requestsPerHour,
          requestsThisDay: apiKeyData.usageStats.requestsThisDay,
          dailyLimit: apiKeyData.rateLimit.requestsPerDay,
        },
      });
    } catch (error: any) {
      console.error("Secure lead webhook error:", error);

      // Handle specific API key errors
      if (error.code === "unauthenticated") {
        res.status(401).json({
          success: false,
          error: "Invalid or missing API key",
        });
      } else if (error.code === "permission-denied") {
        res.status(403).json({
          success: false,
          error: error.message || "Permission denied",
        });
      } else if (error.code === "resource-exhausted") {
        res.status(429).json({
          success: false,
          error: error.message || "Rate limit exceeded",
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || "Failed to create lead",
        });
      }
    }
  });

/**
 * Calculate lead score based on available data
 * (Duplicated from leads.ts for this example)
 */
function calculateLeadScore(lead: Partial<Lead>): number {
  let score = 50;

  if (lead.solarApiData) {
    const maxPanels = lead.solarApiData.maxArrayPanels || 0;
    const sunshineHours = lead.solarApiData.maxSunshineHours || 0;

    if (maxPanels > 20) score += 10;
    if (sunshineHours > 1500) score += 10;
    if (lead.systemSize && lead.systemSize > 7) score += 5;
  }

  if (lead.annualKwh) {
    if (lead.annualKwh > 12000) score += 10;
    if (lead.annualKwh > 15000) score += 5;
  }

  if (lead.phone && lead.phone.length >= 10) score += 5;
  if (lead.email && lead.email.includes("@")) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Secure Solar Analysis Webhook
 *
 * Allows external services to trigger solar analysis with API key.
 * Requires write_solar scope.
 */
export const secureSolarWebhook = functions
  .runWith({
    timeoutSeconds: 120,
    memory: "1GB",
  })
  .https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      // Validate API key with write_solar scope
      const apiKeyData = await validateApiKeyFromRequest(
        req,
        ApiKeyScope.WRITE_SOLAR,
      );

      const { address, leadId } = req.body;

      if (!address) {
        res.status(400).json({ error: "Address is required" });
        return;
      }

      // Here you would integrate with Google Solar API
      // For this example, we'll just return a mock response
      const solarData = {
        address,
        maxArrayPanels: 25,
        maxArrayArea: 150,
        maxSunshineHours: 1800,
        carbonOffset: 5.2,
        estimatedSystemSize: 8.5,
        estimatedAnnualProduction: 12000,
      };

      // If leadId provided, update the lead
      if (leadId) {
        const db = admin.firestore();
        await db.collection("leads").doc(leadId).update({
          solarApiData: solarData,
          systemSize: solarData.estimatedSystemSize,
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }

      res.json({
        success: true,
        data: solarData,
        usage: {
          requestsThisHour: apiKeyData.usageStats.requestsThisHour,
          hourlyLimit: apiKeyData.rateLimit.requestsPerHour,
        },
      });
    } catch (error: any) {
      console.error("Secure solar webhook error:", error);

      if (error.code === "unauthenticated") {
        res.status(401).json({ error: "Invalid or missing API key" });
      } else if (error.code === "permission-denied") {
        res.status(403).json({ error: error.message });
      } else if (error.code === "resource-exhausted") {
        res.status(429).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to analyze solar data" });
      }
    }
  });

/**
 * Secure Read-Only Lead Endpoint
 *
 * Allows external services to query leads with API key.
 * Requires read_leads scope.
 */
export const secureLeadQuery = functions
  .runWith({
    timeoutSeconds: 30,
    memory: "512MB",
  })
  .https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      // Validate API key with read_leads scope
      const apiKeyData = await validateApiKeyFromRequest(
        req,
        ApiKeyScope.READ_LEADS,
      );

      const db = admin.firestore();
      const { status, limit = 10, offset = 0 } = req.query;

      // Build query
      let query = db.collection("leads").orderBy("createdAt", "desc");

      // Filter by status if provided
      if (status && typeof status === "string") {
        query = query.where("status", "==", status) as any;
      }

      // Only return leads created by this API key's owner
      // (for multi-tenant security)
      query = query.where("createdBy", "==", apiKeyData.userId) as any;

      // Apply pagination
      const limitNum = parseInt(limit as string) || 10;
      const offsetNum = parseInt(offset as string) || 0;

      if (offsetNum > 0) {
        const skipSnapshot = await query.limit(offsetNum).get();
        if (!skipSnapshot.empty) {
          const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
          query = query.startAfter(lastDoc) as any;
        }
      }

      const snapshot = await query.limit(limitNum).get();

      const leads = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.json({
        success: true,
        leads,
        count: leads.length,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
        },
        usage: {
          requestsThisHour: apiKeyData.usageStats.requestsThisHour,
          hourlyLimit: apiKeyData.rateLimit.requestsPerHour,
        },
      });
    } catch (error: any) {
      console.error("Secure lead query error:", error);

      if (error.code === "unauthenticated") {
        res.status(401).json({ error: "Invalid or missing API key" });
      } else if (error.code === "permission-denied") {
        res.status(403).json({ error: error.message });
      } else if (error.code === "resource-exhausted") {
        res.status(429).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to query leads" });
      }
    }
  });
