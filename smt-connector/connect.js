#!/usr/bin/env node
/**
 * Smart Meter Texas Data Connector
 * Automatically logs in and fetches usage data
 *
 * Usage:
 *   node connect.js                    # Interactive prompt for credentials
 *   node connect.js -u USER -p PASS    # Command line credentials
 */

const { chromium } = require("playwright");
const readline = require("readline");

const APP_URL = process.env.APP_URL || "http://localhost:5173";
const SMT_URL = "https://www.smartmetertexas.com";

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { username: null, password: null, headless: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-u" || args[i] === "--username") {
      result.username = args[++i];
    } else if (args[i] === "-p" || args[i] === "--password") {
      result.password = args[++i];
    } else if (args[i] === "--headless") {
      result.headless = true;
    }
  }

  return result;
}

// Prompt for credentials if not provided
async function getCredentials(args) {
  if (args.username && args.password) {
    return { username: args.username, password: args.password };
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) =>
    new Promise((resolve) => rl.question(prompt, resolve));

  console.log("\n" + "=".repeat(50));
  console.log("  Smart Meter Texas Login");
  console.log("  (Credentials are used once and never stored)");
  console.log("=".repeat(50) + "\n");

  const username = args.username || (await question("Username: "));
  const password = args.password || (await question("Password: "));

  rl.close();

  return { username, password };
}

async function main() {
  const args = parseArgs();
  const credentials = await getCredentials(args);

  console.log("\n" + "=".repeat(50));
  console.log("  Connecting to Smart Meter Texas...");
  console.log("=".repeat(50) + "\n");

  const browser = await chromium.launch({
    headless: args.headless,
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  });

  const page = await context.newPage();

  try {
    // Step 1: Go to login page
    console.log("1. Opening Smart Meter Texas...");
    await page.goto(SMT_URL);

    // Step 2: Click login button to open modal
    console.log("2. Opening login form...");
    await page.waitForSelector(
      'button:has-text("Log In"), a:has-text("Log In")',
      {
        timeout: 10000,
      },
    );
    await page.click('button:has-text("Log In"), a:has-text("Log In")');

    // Step 3: Wait for login form and fill credentials
    console.log("3. Entering credentials...");
    await page.waitForSelector(
      'input[name="username"], input[id="username"], input[type="text"]',
      {
        timeout: 10000,
      },
    );

    // Find and fill username field
    const usernameField =
      (await page.$('input[name="username"]')) ||
      (await page.$('input[id="username"]')) ||
      (await page.$('input[formcontrolname="username"]')) ||
      (await page.$('input[type="text"]'));

    if (usernameField) {
      await usernameField.fill(credentials.username);
    }

    // Find and fill password field
    const passwordField =
      (await page.$('input[name="password"]')) ||
      (await page.$('input[id="password"]')) ||
      (await page.$('input[formcontrolname="password"]')) ||
      (await page.$('input[type="password"]'));

    if (passwordField) {
      await passwordField.fill(credentials.password);
    }

    // Step 4: Submit login
    console.log("4. Logging in...");
    const submitButton =
      (await page.$('button[type="submit"]')) ||
      (await page.$('button:has-text("Log In")')) ||
      (await page.$('button:has-text("Sign In")'));

    if (submitButton) {
      await submitButton.click();
    }

    // Step 5: Wait for login to complete
    console.log("5. Waiting for dashboard...");
    await page.waitForURL(/.*(?:dashboard|usage|home|smartmeters).*/, {
      timeout: 30000,
    });

    // Give the page time to fully load and set cookies
    await page.waitForTimeout(3000);

    // Step 6: Fetch monthly usage data via API
    console.log("6. Fetching monthly usage data...");

    const usageData = await page.evaluate(async () => {
      try {
        // Get the ESIID first (needed for API call)
        const metersResponse = await fetch("/api/meters", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!metersResponse.ok) {
          throw new Error(`Meters API failed: ${metersResponse.status}`);
        }

        const metersData = await metersResponse.json();
        const esiid =
          metersData?.esiidList?.[0]?.esiid ||
          metersData?.meters?.[0]?.esiid ||
          metersData?.[0]?.esiid;

        if (!esiid) {
          // Try to get ESIID from the page
          const esiidElement = document.querySelector(
            '[class*="esiid"], [data-esiid]',
          );
          if (esiidElement) {
            return { error: "Could not find ESIID", meters: metersData };
          }
          throw new Error("No ESIID found");
        }

        // Fetch monthly usage
        const usageResponse = await fetch("/api/usage/monthly", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            esiid: esiid,
            // Request last 24 months
            startDate: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            endDate: new Date().toISOString().split("T")[0],
          }),
        });

        if (!usageResponse.ok) {
          throw new Error(`Usage API failed: ${usageResponse.status}`);
        }

        const usageJson = await usageResponse.json();

        return {
          success: true,
          esiid: esiid,
          data: usageJson,
        };
      } catch (err) {
        return { error: err.message };
      }
    });

    if (usageData.error) {
      console.error("API Error:", usageData.error);
      console.log("Debug info:", JSON.stringify(usageData, null, 2));

      // Fallback: try to scrape from the page
      console.log("\n7. Trying to get data from page...");
      await page.goto(`${SMT_URL}/smartmeters/`);
      await page.waitForTimeout(2000);

      // Look for usage data on the page
      const pageData = await page.evaluate(() => {
        const text = document.body.innerText;
        const esiidMatch = text.match(/ESIID[:\s]*(\d{17,22})/i);
        return {
          esiid: esiidMatch ? esiidMatch[1] : null,
          pageText: text.substring(0, 500),
        };
      });

      console.log("Page data:", pageData);
    } else {
      console.log("\n" + "=".repeat(50));
      console.log("  SUCCESS! Usage data retrieved");
      console.log("=".repeat(50));
      console.log(`ESIID: ${usageData.esiid}`);

      // Process the usage data
      const processed = processUsageData(usageData);

      console.log(`Annual Usage: ${processed.annualKwh.toLocaleString()} kWh`);
      console.log(`Months of data: ${processed.monthlyUsage.length}`);

      // Open app with data
      console.log("\n8. Sending data to app...");

      const encoded = Buffer.from(
        JSON.stringify({
          data: processed,
          extractedAt: new Date().toISOString(),
          source: "smt_api",
        }),
      ).toString("base64");

      const callbackUrl = `${APP_URL}/qualify/smt-callback?data=${encodeURIComponent(encoded)}`;

      const newPage = await context.newPage();
      await newPage.goto(callbackUrl);
      await newPage.waitForTimeout(3000);

      console.log("\n" + "=".repeat(50));
      console.log("  Done! Check your browser.");
      console.log("=".repeat(50) + "\n");
    }
  } catch (err) {
    console.error("\nError:", err.message);

    if (err.message.includes("timeout")) {
      console.log("\nTip: Login may have failed. Please check:");
      console.log("  - Username and password are correct");
      console.log("  - No CAPTCHA or 2FA is required");
      console.log("  - Your account is not locked");
    }
  } finally {
    // Keep browser open briefly so user can see result
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await browser.close();
  }
}

// Process raw API response into our format
function processUsageData(apiResponse) {
  const data = apiResponse.data;
  const monthlyUsage = [];
  let totalKwh = 0;

  // Handle different API response formats
  const readings =
    data?.reads || data?.usage || data?.monthlyData || data || [];

  if (Array.isArray(readings)) {
    for (const reading of readings) {
      // Extract date and usage from various formats
      const dateStr =
        reading.readDate ||
        reading.date ||
        reading.month ||
        reading.billingPeriodStart;
      const kwh = parseFloat(
        reading.kwh ||
          reading.usage ||
          reading.consumption ||
          reading.totalKwh ||
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
  }

  // Sort by date
  monthlyUsage.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate annual from last 12 months
  const last12 = monthlyUsage.slice(-12);
  const annualKwh = last12.reduce((sum, m) => sum + m.kWh, 0);

  return {
    esiid: apiResponse.esiid,
    monthlyUsage,
    annualKwh,
    totalKwh: Math.round(totalKwh),
    monthsOfData: monthlyUsage.length,
  };
}

main().catch(console.error);
