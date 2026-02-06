/**
 * Smart Meter Texas Connector - Cloud Function
 *
 * Fetches usage data from SMT and saves to Firestore.
 * Uses Puppeteer with Browserless.io for headless browser.
 *
 * Frontend flow:
 * 1. User enters SMT credentials
 * 2. Calls this function
 * 3. Function fetches data and saves to Firestore
 * 4. Frontend reads from Firestore (realtime updates)
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import puppeteer from "puppeteer-core";

// Browserless.io endpoint (or self-hosted)
const BROWSERLESS_URL =
  process.env.BROWSERLESS_URL || "wss://chrome.browserless.io";
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN || "";

interface SmtCredentials {
  username: string;
  password: string;
  projectId?: string; // Optional: link to existing project
  customerId?: string;
}

interface SmtUsageData {
  esiid: string;
  monthlyUsage: Array<{
    month: string;
    year: number;
    kWh: number;
    date: string;
  }>;
  annualKwh: number;
  totalKwh: number;
  monthsOfData: number;
  source: string;
  fetchedAt: string;
}

/**
 * Fetch SMT usage data using headless browser
 */
async function fetchSmtData(
  username: string,
  password: string,
): Promise<SmtUsageData> {
  const browserWSEndpoint = BROWSERLESS_TOKEN
    ? `${BROWSERLESS_URL}?token=${BROWSERLESS_TOKEN}`
    : BROWSERLESS_URL;

  console.log("Connecting to browser...");

  const browser = await puppeteer.connect({
    browserWSEndpoint,
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
    );

    // Step 1: Load SMT
    console.log("Loading SMT...");
    await page.goto("https://www.smartmetertexas.com", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Step 2: Click login
    console.log("Opening login...");
    await page.click("button.button-login");
    await page.waitForSelector('input[formcontrolname="username"]', {
      timeout: 5000,
    });

    // Step 3: Enter credentials
    console.log("Entering credentials...");
    await page.type('input[formcontrolname="username"]', username);
    await page.type('input[formcontrolname="password"]', password);

    // Step 4: Submit
    console.log("Logging in...");
    await page.click("button.btn-primary");

    // Step 5: Wait for dashboard
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Step 6: Fetch data via API (from within page context)
    console.log("Fetching usage data...");
    const result = await page.evaluate(async () => {
      // Get ESIID
      const metersResp = await fetch("/api/meters");
      const meters = (await metersResp.json()) as any;

      const esiid =
        meters?.esiidList?.[0]?.esiid ||
        meters?.[0]?.esiid ||
        meters?.meters?.[0]?.esiid;

      if (!esiid) {
        throw new Error("No ESIID found");
      }

      // Get monthly usage
      const usageResp = await fetch("/api/usage/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ esiid }),
      });

      const usage = await usageResp.json();

      return { esiid, usage };
    });

    await browser.close();

    // Process the data
    return processUsageData(result.esiid, result.usage);
  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * Process raw API data into our format
 */
function processUsageData(esiid: string, apiData: any): SmtUsageData {
  const monthlyUsage: SmtUsageData["monthlyUsage"] = [];
  let totalKwh = 0;

  const readings =
    apiData?.reads ||
    apiData?.usage ||
    apiData?.monthlyData ||
    (Array.isArray(apiData) ? apiData : []);

  for (const reading of readings) {
    const dateStr =
      reading.readDate ||
      reading.date ||
      reading.month ||
      reading.billingPeriodStart;
    const kwh = parseFloat(
      reading.kwh ||
        reading.usage ||
        reading.consumption ||
        reading.actualKWH ||
        0,
    );

    if (dateStr && kwh > 0) {
      const date = new Date(dateStr);
      monthlyUsage.push({
        month: date.toLocaleString("default", { month: "long" }),
        year: date.getFullYear(),
        kWh: Math.round(kwh),
        date: dateStr,
      });
      totalKwh += kwh;
    }
  }

  // Sort by date
  monthlyUsage.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Last 12 months for annual
  const last12 = monthlyUsage.slice(-12);
  const annualKwh = last12.reduce((sum, m) => sum + m.kWh, 0);

  return {
    esiid,
    monthlyUsage,
    annualKwh,
    totalKwh: Math.round(totalKwh),
    monthsOfData: monthlyUsage.length,
    source: "smart_meter_texas",
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Cloud Function: Fetch SMT data and save to Firestore
 */
export const fetchSmtUsage = functions
  .runWith({
    timeoutSeconds: 120,
    memory: "1GB",
  })
  .https.onCall(async (data: SmtCredentials, context) => {
    const { username, password, projectId, customerId } = data;

    if (!username || !password) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Username and password are required",
      );
    }

    try {
      console.log(`Fetching SMT data for ${username}...`);

      // Fetch the data
      const usageData = await fetchSmtData(username, password);

      // Save to Firestore
      const db = admin.firestore();
      const docRef = projectId
        ? db.collection("projects").doc(projectId)
        : db.collection("smtData").doc(usageData.esiid);

      await docRef.set(
        {
          smtData: usageData,
          smtUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(customerId && { customerId }),
        },
        { merge: true },
      );

      console.log(`Saved SMT data for ESIID ${usageData.esiid}`);

      return {
        success: true,
        data: usageData,
        savedTo: docRef.path,
      };
    } catch (error: any) {
      console.error("SMT fetch error:", error);

      // Return user-friendly error
      if (
        error.message?.includes("timeout") ||
        error.message?.includes("Navigation")
      ) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Login failed. Please check your username and password.",
        );
      }

      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to fetch SMT data",
      );
    }
  });

/**
 * Alternative: HTTP endpoint for non-Firebase clients
 */
export const smtWebhook = functions
  .runWith({
    timeoutSeconds: 120,
    memory: "1GB",
  })
  .https.onRequest(async (req, res) => {
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { username, password, projectId } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password required" });
      return;
    }

    try {
      const usageData = await fetchSmtData(username, password);

      // Save to Firestore
      const db = admin.firestore();
      const docRef = projectId
        ? db.collection("projects").doc(projectId)
        : db.collection("smtData").doc(usageData.esiid);

      await docRef.set(
        {
          smtData: usageData,
          smtUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      res.json({
        success: true,
        data: usageData,
        savedTo: docRef.path,
      });
    } catch (error: any) {
      console.error("SMT webhook error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch SMT data",
      });
    }
  });
