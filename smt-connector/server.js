#!/usr/bin/env node
/**
 * Smart Meter Texas API Server
 *
 * Runs as a local or cloud backend service.
 * Uses headless browser to bypass bot detection.
 *
 * Usage:
 *   node server.js              # Start server on port 3001
 *   PORT=8080 node server.js    # Custom port
 *
 * API:
 *   POST /api/smt/usage
 *   Body: { "username": "...", "password": "...", "projectId?": "..." }
 *   Returns: { "success": true, "data": { ... } }
 *
 * Credentials are NOT stored - used once to fetch data, then discarded.
 */

const http = require("http");
const { firefox } = require("playwright"); // Firefox handles SMT's HTTP/2 better

// Firebase Admin SDK for Firestore integration
let admin;
let db;

// Initialize Firebase if credentials available
const FIREBASE_PROJECT = process.env.FIREBASE_PROJECT || "agentic-labs";
const IS_CLOUD_RUN = process.env.K_SERVICE !== undefined;
const path = require("path");

try {
  admin = require("firebase-admin");
  if (!admin.apps.length) {
    if (IS_CLOUD_RUN) {
      // Cloud Run: Use Application Default Credentials (automatic)
      admin.initializeApp({
        projectId: FIREBASE_PROJECT,
      });
      console.log("  Running in Cloud Run with default credentials");
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Explicit credentials file
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: FIREBASE_PROJECT,
      });
    } else {
      // Local development: Try service account files
      const possiblePaths = [
        path.join(__dirname, "../../configs/firebase-admin-key.json"),
        path.join(__dirname, "../../configs/agentic-labs-firebase-admin.json"),
        path.join(__dirname, "../../../configs/firebase-admin-key.json"),
      ];

      let serviceAccount = null;
      for (const p of possiblePaths) {
        try {
          serviceAccount = require(p);
          console.log("  Found service account at:", p);
          break;
        } catch (_) {
          // Try next path
        }
      }

      if (serviceAccount) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: FIREBASE_PROJECT,
        });
      } else {
        throw new Error("No service account found");
      }
    }
  }
  db = admin.firestore();
  console.log("✅ Firebase Admin initialized");
} catch (err) {
  console.log("⚠️ Firebase Admin not initialized:", err.message);
  console.log("   Data will be returned but not saved to Firestore.");
}

const PORT = process.env.PORT || 3001;

// CORS headers for frontend access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

// Fetch SMT usage data using headless browser + bearer token
async function fetchSmtUsage(username, password) {
  let browser;
  let bearerToken = null;

  try {
    console.log(`[${new Date().toISOString()}] Starting fetch for ${username}`);

    browser = await firefox.launch({
      headless: true,
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "en-US",
      timezoneId: "America/Chicago",
    });

    const page = await context.newPage();

    // Intercept responses to capture the bearer token
    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/") || url.includes("/commonapi/")) {
        const headers = response.headers();
        // Look for authorization header in response
        if (headers["authorization"]) {
          bearerToken = headers["authorization"].replace("Bearer ", "");
          console.log("  Got bearer token from response header");
        }
      }
      // Also check for token in login response body
      if (url.includes("/authenticate") || url.includes("/login")) {
        try {
          const json = await response.json();
          if (json.token) {
            bearerToken = json.token;
            console.log("  Got bearer token from login response");
          }
        } catch (_) {
          // Not JSON or already consumed
        }
      }
    });

    // Also intercept requests to capture the token being used
    page.on("request", (request) => {
      const auth = request.headers()["authorization"];
      if (auth && auth.startsWith("Bearer ")) {
        bearerToken = auth.replace("Bearer ", "");
        console.log("  Got bearer token from request");
      }
    });

    // Step 1: Load SMT
    console.log("  Loading SMT...");
    await page.goto("https://www.smartmetertexas.com", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    // Wait a bit for dynamic content
    await page.waitForTimeout(3000);

    // Step 2: Wait for login form (may already be visible or need to click)
    console.log("  Looking for login form...");

    // Try to find the login form - it might already be visible
    let usernameInput = await page.$('input[name="userid"]');
    if (!usernameInput) {
      // Try clicking login button if form not visible
      await page.click("button.button-login").catch(() => {});
      await page.click('button:has-text("Login")').catch(() => {});
      await page.waitForTimeout(2000);
      usernameInput = await page.$('input[name="userid"]');
    }

    if (!usernameInput) {
      // Try alternative selectors
      usernameInput = await page.$('input[formcontrolname="username"]');
    }

    if (!usernameInput) {
      throw new Error("Could not find login form");
    }

    // Step 3: Fill credentials
    console.log("  Entering credentials...");
    await page.fill('input[name="userid"]', username).catch(async () => {
      await page.fill('input[formcontrolname="username"]', username);
    });
    await page.fill('input[name="password"]', password).catch(async () => {
      await page.fill('input[formcontrolname="password"]', password);
    });

    // Step 4: Submit
    console.log("  Logging in...");
    await page.click('button.btn-primary:has-text("Login")').catch(async () => {
      await page.click('button:has-text("Login")');
    });

    // Step 5: Wait for login to complete
    // Either wait for URL change OR for bearer token to be captured
    console.log("  Waiting for login response...");

    try {
      // Wait for either dashboard URL or token capture
      await Promise.race([
        page.waitForURL(/dashboard|smartmeters|home/, {
          timeout: 60000,
          waitUntil: "domcontentloaded",
        }),
        // Also wait for network to be mostly idle (API calls finishing)
        page
          .waitForLoadState("networkidle", { timeout: 60000 })
          .catch(() => {}),
        // Or wait until we have a bearer token
        new Promise((resolve) => {
          const checkToken = setInterval(() => {
            if (bearerToken) {
              clearInterval(checkToken);
              resolve();
            }
          }, 500);
          // Clear after 60s
          setTimeout(() => clearInterval(checkToken), 60000);
        }),
      ]);
    } catch (waitErr) {
      console.log("  Wait error:", waitErr.message);
      // Check if we got the token despite the error
      if (!bearerToken) {
        // Log current URL for debugging
        console.log("  Current URL:", page.url());
        throw new Error(
          "Login timed out - SMT may be blocking this request or credentials are invalid",
        );
      }
    }

    // Give a moment for any final API calls
    await page.waitForTimeout(2000);

    console.log("  Bearer token captured:", bearerToken ? "Yes" : "No");
    console.log("  Current URL:", page.url());

    if (!bearerToken) {
      throw new Error("No bearer token captured - login may have failed");
    }

    // Step 6: Fetch ESIID and usage data from multiple endpoints
    console.log("  Fetching usage data...");
    const result = await page.evaluate(async (token) => {
      try {
        const authHeaders = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        // Get dashboard which has meter details including ESIID
        const dashResp = await fetch("/api/dashboard", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({}),
        });
        const dashText = await dashResp.text();

        let dashboard;
        try {
          dashboard = JSON.parse(dashText);
        } catch (e) {
          return {
            error: "Dashboard parse error",
            raw: dashText.substring(0, 1000),
          };
        }

        // Find ESIID - search helper
        const findValue = (obj, keys, depth = 0) => {
          if (depth > 8 || !obj || typeof obj !== "object") return null;
          for (const key of keys) {
            if (obj[key]) return obj[key];
          }
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const found = findValue(item, keys, depth + 1);
              if (found) return found;
            }
          } else {
            for (const k of Object.keys(obj)) {
              const found = findValue(obj[k], keys, depth + 1);
              if (found) return found;
            }
          }
          return null;
        };

        // Extract ESIID from dashboard.data.defaultMeterDetails
        let esiid = null;
        let address = null;
        let meterNumber = null;

        // SMT dashboard returns: { data: { defaultMeterDetails: { esiid, address, meterNumber } } }
        if (dashboard?.data?.defaultMeterDetails) {
          const meterDetails = dashboard.data.defaultMeterDetails;
          esiid = meterDetails.esiid;
          address = meterDetails.fullAddress || meterDetails.address;
          meterNumber = meterDetails.meterNumber;
          console.log("Found ESIID:", esiid, "Address:", address);
        }

        // Fallback: search recursively if not found in expected location
        if (!esiid) {
          esiid = findValue(dashboard, ["esiid", "ESIID", "esiId", "esi_id"]);
        }

        // Get Green Button data which has the full usage history
        const greenResp = await fetch("/api/adhoc/green", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({}),
        });

        let greenData = null;
        let usageData = [];

        if (greenResp.ok) {
          const contentType = greenResp.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            greenData = await greenResp.json();
          } else {
            // Might be XML - get as text
            const xmlText = await greenResp.text();
            greenData = {
              xmlContent: xmlText.substring(0, 10000),
              format: "xml",
            };
          }

          // Extract usage from Green Button data
          if (greenData && !greenData.xmlContent) {
            // JSON format - look for usage arrays
            usageData =
              greenData.reads ||
              greenData.usage ||
              greenData.intervalReading ||
              greenData.monthlyUsage ||
              greenData.usageData ||
              [];

            // If still no esiid, try to find it in green data
            if (!esiid) {
              esiid = findValue(greenData, [
                "esiid",
                "ESIID",
                "esiId",
                "EsiId",
                "esiID",
              ]);
            }
          }
        }

        // Fetch monthly usage data (24 months)
        // Requires: esiid, startDate (MM/DD/YYYY), endDate (MM/DD/YYYY)
        if (esiid) {
          const endDate = new Date();
          const startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 24);

          const formatDate = (d) => {
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            const yyyy = d.getFullYear();
            return `${mm}/${dd}/${yyyy}`;
          };

          const monthlyResp = await fetch("/api/usage/monthly", {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
              esiid: esiid,
              startDate: formatDate(startDate),
              endDate: formatDate(endDate),
            }),
          });

          if (monthlyResp.ok) {
            const monthlyResult = await monthlyResp.json();
            if (
              monthlyResult.monthlyData &&
              Array.isArray(monthlyResult.monthlyData)
            ) {
              usageData = monthlyResult.monthlyData;
            }
          }
        }

        // Return everything for debugging and processing
        return {
          success: true,
          esiid: esiid || "UNKNOWN",
          address: address,
          meterNumber: meterNumber,
          usageData: usageData,
        };
      } catch (err) {
        return { error: err.message, stack: err.stack };
      }
    }, bearerToken);

    await browser.close();
    browser = null;

    if (result.error) {
      throw new Error(result.error);
    }

    // Process the monthly usage data
    const processed = processMonthlyData(
      result.esiid,
      result.address,
      result.usageData,
    );
    console.log(`  Success! ${processed.annualKwh} kWh/year`);

    return {
      success: true,
      data: processed,
    };
  } catch (err) {
    console.error(`  Error: ${err.message}`);

    if (browser) {
      await browser.close();
    }

    // Return helpful error messages
    if (
      err.message.includes("timeout") ||
      err.message.includes("smartmeters")
    ) {
      return {
        success: false,
        error: "Login failed. Please check your username and password.",
      };
    }

    return {
      success: false,
      error: err.message,
    };
  }
}

// Process SMT monthly usage data
// Format: { startdate: "MM/DD/YYYY", enddate: "MM/DD/YYYY", actl_kwh_usg: number, ... }
function processMonthlyData(esiid, address, monthlyData) {
  const monthlyUsage = [];
  let totalKwh = 0;

  if (!Array.isArray(monthlyData) || monthlyData.length === 0) {
    console.log("  No monthly data to process");
    return {
      esiid,
      address,
      monthlyUsage: [],
      annualKwh: 0,
      totalKwh: 0,
      monthsOfData: 0,
      source: "smart_meter_texas",
      fetchedAt: new Date().toISOString(),
    };
  }

  console.log(`  Processing ${monthlyData.length} months of data`);

  for (const reading of monthlyData) {
    // SMT format: startdate = "MM/DD/YYYY", actl_kwh_usg = actual kWh
    const startDate = reading.startdate;
    const endDate = reading.enddate;
    const kwh = parseFloat(reading.actl_kwh_usg || 0);

    if (startDate && kwh > 0) {
      // Parse MM/DD/YYYY format
      const [month, day, year] = startDate.split("/");
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      if (!isNaN(date.getTime())) {
        monthlyUsage.push({
          month: date.toLocaleString("default", { month: "long" }),
          year: date.getFullYear(),
          kWh: Math.round(kwh),
          startDate: startDate,
          endDate: endDate,
        });
        totalKwh += kwh;
      }
    }
  }

  // Sort by date (oldest first)
  monthlyUsage.sort((a, b) => {
    const dateA = new Date(a.startDate.split("/").reverse().join("-"));
    const dateB = new Date(b.startDate.split("/").reverse().join("-"));
    return dateA - dateB;
  });

  // Calculate annual usage - handle new homes with < 12 months
  const last12 = monthlyUsage.slice(-12);
  const monthsAvailable = last12.length;
  let annualKwh = 0;
  let isEstimated = false;
  let estimateMethod = null;

  if (monthsAvailable >= 12) {
    // Full year of data - just sum it
    annualKwh = last12.reduce((sum, m) => sum + m.kWh, 0);
  } else if (monthsAvailable >= 3) {
    // 3-11 months: Extrapolate with seasonal adjustment for Texas
    // Data sources: EIA Texas Profile, RECS Survey
    // https://www.eia.gov/electricity/state/texas/

    // Detect heating type from winter vs summer ratio
    // Gas heat: Winter ~55% of average (just baseload + blower)
    // Electric heat: Winter ~100-120% of average (heat pump/resistance)
    const summerMonths = ["June", "July", "August"];
    const winterMonths = ["December", "January", "February"];

    let summerUsage = 0,
      summerCount = 0;
    let winterUsage = 0,
      winterCount = 0;

    for (const m of last12) {
      if (summerMonths.includes(m.month)) {
        summerUsage += m.kWh;
        summerCount++;
      } else if (winterMonths.includes(m.month)) {
        winterUsage += m.kWh;
        winterCount++;
      }
    }

    // Determine heating type from data (if we have both seasons)
    let heatingType = "unknown";
    if (summerCount > 0 && winterCount > 0) {
      const avgSummer = summerUsage / summerCount;
      const avgWinter = winterUsage / winterCount;
      const winterToSummerRatio = avgWinter / avgSummer;

      // Gas heat: winter is ~40-50% of summer (just baseload)
      // Electric heat: winter is ~70-90% of summer (heating load)
      heatingType = winterToSummerRatio < 0.6 ? "gas" : "electric";
      console.log(
        `  Detected heating type: ${heatingType} (winter/summer ratio: ${winterToSummerRatio.toFixed(2)})`,
      );
    }

    // Texas seasonal factors based on EIA data
    // Average Texas home: 1,094 kWh/month, peaks at 1,400+ in summer
    // Factors normalized so annual sum = 12 (average month = 1.0)
    const seasonalFactors =
      heatingType === "gas"
        ? {
            // Gas heat: Low winter (just baseload ~600 kWh), high summer (AC ~1,500 kWh)
            January: 0.55,
            February: 0.55,
            March: 0.7,
            April: 0.8,
            May: 1.1,
            June: 1.45,
            July: 1.6,
            August: 1.6,
            September: 1.35,
            October: 0.9,
            November: 0.7,
            December: 0.55,
          }
        : {
            // Electric heat: Moderate winter (heat pump ~1,100 kWh), high summer (AC ~1,500 kWh)
            January: 1.0,
            February: 0.95,
            March: 0.8,
            April: 0.75,
            May: 1.0,
            June: 1.35,
            July: 1.5,
            August: 1.5,
            September: 1.25,
            October: 0.85,
            November: 0.8,
            December: 0.95,
          };

    // Calculate weighted average based on months we have
    let weightedSum = 0;
    let factorSum = 0;
    for (const m of last12) {
      const factor = seasonalFactors[m.month] || 1.0;
      weightedSum += m.kWh / factor; // Normalize to "base" usage
      factorSum += 1;
    }
    const baseMonthlyUsage = weightedSum / factorSum;

    // Apply all 12 months of seasonal factors
    annualKwh = Object.values(seasonalFactors).reduce(
      (sum, factor) => sum + baseMonthlyUsage * factor,
      0,
    );
    annualKwh = Math.round(annualKwh);
    isEstimated = true;
    estimateMethod =
      heatingType === "unknown"
        ? "seasonal_extrapolation"
        : `seasonal_extrapolation_${heatingType}_heat`;

    console.log(
      `  New home: ${monthsAvailable} months → estimated ${annualKwh} kWh/year (${heatingType} heat)`,
    );
  } else if (monthsAvailable >= 1) {
    // 1-2 months: Simple extrapolation (less accurate)
    const avgMonthly =
      last12.reduce((sum, m) => sum + m.kWh, 0) / monthsAvailable;
    annualKwh = Math.round(avgMonthly * 12);
    isEstimated = true;
    estimateMethod = "simple_extrapolation";

    console.log(
      `  New home: ${monthsAvailable} months → estimated ${annualKwh} kWh/year (simple)`,
    );
  }

  return {
    esiid,
    address,
    monthlyUsage,
    annualKwh,
    totalKwh: Math.round(totalKwh),
    monthsOfData: monthlyUsage.length,
    isNewHome: monthsAvailable < 12,
    isEstimated,
    estimateMethod,
    source: "smart_meter_texas",
    fetchedAt: new Date().toISOString(),
  };
}

// Register a new SMT account using headless browser
async function registerSmtAccount(registrationData) {
  const {
    firstName,
    lastName,
    email,
    phone,
    esiid,
    meterNumber,
    repName,
    username,
  } = registrationData;

  let browser;

  try {
    console.log(
      `[${new Date().toISOString()}] Starting SMT registration for ${email}`,
    );

    browser = await firefox.launch({ headless: true });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "en-US",
      timezoneId: "America/Chicago",
    });

    const page = await context.newPage();

    // Step 1: Load SMT registration page
    console.log("  Loading SMT registration page...");
    await page.goto("https://www.smartmetertexas.com/register", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(3000);

    // Step 2: Call registration APIs from browser context
    console.log("  Validating and registering...");
    const result = await page.evaluate(
      async (data) => {
        const {
          firstName,
          lastName,
          email,
          phone,
          esiid,
          meterNumber,
          repName,
          username,
        } = data;

        try {
          // Validate email
          console.log("Validating email...");
          const emailResp = await fetch(
            `/commonapi/register/validatemail/${encodeURIComponent(email)}`,
          );
          const emailResult = await emailResp.json();
          if (!emailResult.data?.status) {
            return {
              success: false,
              error: "Email already registered with SMT",
            };
          }

          // Validate ESIID + meter + REP
          console.log("Validating ESIID...");
          const esiidResp = await fetch("/commonapi/register/newesiidvalid", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ esiid, meterNumber, repName }),
          });
          const esiidResult = await esiidResp.json();
          if (!esiidResult.data?.esiidValid) {
            return {
              success: false,
              error:
                esiidResult.data?.responseMessage ||
                "Invalid ESIID/meter combination",
            };
          }

          // Validate username
          console.log("Validating username...");
          const userResp = await fetch(
            `/commonapi/register/validateuserid/${encodeURIComponent(username)}`,
          );
          const userResult = await userResp.json();
          if (!userResult.data?.status) {
            return { success: false, error: "Username already taken" };
          }

          // Submit registration
          console.log("Submitting registration...");
          const registerResp = await fetch(
            "/commonapi/register/registerresuser",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userid: username,
                attributes: {
                  givenName: firstName,
                  sn: lastName,
                  cn: `${firstName}${lastName}`,
                  mail: email,
                  initials: "",
                  title: "",
                  telephoneNumber: phone,
                  preferredLanguage: "en-US",
                  _smtEsiId: esiid,
                },
              }),
            },
          );
          const registerResult = await registerResp.json();

          if (registerResult.data?.status === true) {
            return {
              success: true,
              message: "Account created! Check email to set password.",
            };
          } else {
            return {
              success: false,
              error: registerResult.data?.message || "Registration failed",
            };
          }
        } catch (err) {
          return { success: false, error: err.message };
        }
      },
      {
        firstName,
        lastName,
        email,
        phone,
        esiid,
        meterNumber,
        repName,
        username,
      },
    );

    await browser.close();
    browser = null;

    if (result.success) {
      console.log(`  ✅ Registration successful for ${email}`);
    } else {
      console.log(`  ❌ Registration failed: ${result.error}`);
    }

    return result;
  } catch (err) {
    console.error(`  Error: ${err.message}`);

    if (browser) {
      await browser.close();
    }

    return {
      success: false,
      error: err.message,
    };
  }
}

// Fetch list of REPs (Retail Energy Providers)
async function fetchRepList() {
  let browser;

  try {
    console.log(`[${new Date().toISOString()}] Fetching REP list...`);

    browser = await firefox.launch({ headless: true });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    await page.goto("https://www.smartmetertexas.com/register", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(2000);

    const result = await page.evaluate(async () => {
      try {
        const resp = await fetch("/commonapi/register/repsearch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repName: "*" }),
        });
        const data = await resp.json();
        return { success: true, reps: data.data || [] };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    await browser.close();
    console.log(`  Found ${result.reps?.length || 0} REPs`);

    return result;
  } catch (err) {
    if (browser) await browser.close();
    return { success: false, error: err.message };
  }
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // SMT Usage endpoint
  if (req.method === "POST" && req.url === "/api/smt/usage") {
    let body = "";

    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { username, password, projectId, customerId } = JSON.parse(body);

        if (!username || !password) {
          res.writeHead(400, corsHeaders);
          res.end(
            JSON.stringify({
              success: false,
              error: "Username and password required",
            }),
          );
          return;
        }

        const result = await fetchSmtUsage(username, password);

        // Save to Firestore if successful and Firebase is initialized
        if (result.success && db && result.data) {
          try {
            const docPath = projectId
              ? `projects/${projectId}`
              : `smtData/${result.data.esiid}`;

            const docRef = projectId
              ? db.collection("projects").doc(projectId)
              : db.collection("smtData").doc(result.data.esiid);

            await docRef.set(
              {
                smtData: result.data,
                smtUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                ...(customerId && { customerId }),
              },
              { merge: true },
            );

            result.savedTo = docPath;
            console.log(`  ✅ Saved to Firestore: ${docPath}`);
          } catch (firestoreError) {
            console.error(
              "  ⚠️ Firestore save failed:",
              firestoreError.message,
            );
            result.firestoreError = firestoreError.message;
          }
        }

        res.writeHead(result.success ? 200 : 401, corsHeaders);
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, corsHeaders);
        res.end(
          JSON.stringify({
            success: false,
            error: "Invalid request",
          }),
        );
      }
    });
    return;
  }

  // SMT Registration endpoint
  if (req.method === "POST" && req.url === "/api/smt/register") {
    let body = "";

    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);

        // Validate required fields
        const required = [
          "firstName",
          "lastName",
          "email",
          "esiid",
          "meterNumber",
          "repName",
          "username",
        ];
        const missing = required.filter((f) => !data[f]);
        if (missing.length > 0) {
          res.writeHead(400, corsHeaders);
          res.end(
            JSON.stringify({
              success: false,
              error: `Missing required fields: ${missing.join(", ")}`,
            }),
          );
          return;
        }

        const result = await registerSmtAccount(data);

        // Save registration to Firestore
        if (result.success && db) {
          try {
            await db.collection("smtRegistrations").doc(data.esiid).set(
              {
                email: data.email,
                username: data.username,
                esiid: data.esiid,
                registeredAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
            console.log(`  💾 Saved registration to Firestore`);
          } catch (err) {
            console.error("  Firestore save failed:", err.message);
          }
        }

        res.writeHead(result.success ? 200 : 400, corsHeaders);
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, corsHeaders);
        res.end(
          JSON.stringify({
            success: false,
            error: "Invalid request",
          }),
        );
      }
    });
    return;
  }

  // REP List endpoint
  if (req.method === "GET" && req.url === "/api/smt/reps") {
    try {
      const result = await fetchRepList();
      res.writeHead(result.success ? 200 : 500, corsHeaders);
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // 404
  res.writeHead(404, corsHeaders);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║   Smart Meter Texas API Server                            ║
║   Running on http://localhost:${PORT}                        ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║   POST /api/smt/usage     - Fetch usage with credentials  ║
║   POST /api/smt/register  - Create new SMT account        ║
║   GET  /api/smt/reps      - List energy providers         ║
║                                                           ║
║   ⚡ Credentials are NOT stored                           ║
║   📊 Returns monthly usage data for solar sizing          ║
║   ${db ? "💾 Saves to Firestore: " + FIREBASE_PROJECT : "⚠️  Firestore: not configured"}              ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
