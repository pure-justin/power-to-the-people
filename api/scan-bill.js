/**
 * Vercel Serverless Function: Utility Bill Scanner
 * Uses Gemini 1.5 Pro to extract data from utility bill images/PDFs
 *
 * This bypasses GCP org policy restrictions by running on Vercel
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
  maxDuration: 60, // 60 second timeout
};

// Month names for building consumption data
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data } = req.body;
    const { imageBase64, mediaType = "image/jpeg" } = data || {};

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: "Missing imageBase64 in request",
      });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(500).json({
        success: false,
        error: "Gemini API key not configured",
      });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const extractionPrompt = `You are an expert at extracting data from utility bills for solar system design.

FIRST, determine if this is actually a utility bill (electric, gas, or combined). If NOT a utility bill (e.g., a random document, photo, or non-utility statement), return:
{
  "isValidBill": false,
  "error": "not_a_bill",
  "message": "This doesn't appear to be a utility bill. Please upload your electric or gas bill."
}

If the image is too blurry, dark, or unreadable, return:
{
  "isValidBill": false,
  "error": "poor_quality",
  "message": "The image quality is too poor to read. Please take a clearer photo of your bill."
}

If this IS a valid utility bill, extract ALL available information and return:
{
  "isValidBill": true,

  // CUSTOMER IDENTIFICATION
  "accountNumber": "string - PRIMARY account number",
  "customerName": "string - EXACT name as printed on bill",
  "serviceAddress": "string - physical service address",

  // UTILITY & PROVIDER (CRITICAL for Genability matching)
  "utilityCompany": "string - main utility name",
  "utilityType": "electric | gas | combined",
  "tduName": "string - TDU name (Oncor, CenterPoint, AEP Texas, TNMP) for Texas deregulated",
  "repName": "string - Retail Electric Provider name if deregulated market",

  // UNIQUE IDENTIFIERS (critical for API matching)
  "esiid": "string - 17-22 digit Electric Service Identifier (Texas)",
  "meterNumber": "string - physical meter number",

  // RATE/TARIFF INFO
  "ratePlanName": "string - e.g. 'Residential Service', 'TOU-D-A'",
  "rateSchedule": "string - rate schedule code",

  // BILLING PERIOD
  "billingPeriodStart": "YYYY-MM-DD",
  "billingPeriodEnd": "YYYY-MM-DD",
  "billingDays": number,

  // CONSUMPTION DATA
  "currentUsageKwh": number,
  "previousUsageKwh": number,
  "averageDailyKwh": number,

  // 12-MONTH USAGE HISTORY (from chart/graph - VERY IMPORTANT for solar sizing)
  "usageHistory": [
    {"month": "January", "year": 2024, "kWh": 1500}
  ],

  // CHARGES
  "totalAmountDue": number,
  "currentCharges": number,
  "baseCharge": number,
  "energyCharge": number,
  "deliveryCharge": number,
  "taxes": number,

  // CALCULATED RATES
  "ratePerKwh": number,
  "effectiveRatePerKwh": number,
  "allInRatePerKwh": number,

  // EXTRACTION METADATA
  "confidence": number // 0-1 your confidence
}

CRITICAL INSTRUCTIONS:
1. Extract the 12-month usage history chart/graph - this is the MOST VALUABLE data
2. Find the ESIID (17-22 digits, labeled ESI ID or Electric Service ID) - critical for Texas
3. Calculate rates if not stated: charge / kWh
4. Return ONLY valid JSON, no markdown, no explanation.`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mediaType,
          data: imageBase64,
        },
      },
      extractionPrompt,
    ]);

    const response = result.response;
    const text = response.text();

    if (!text) {
      return res.status(500).json({
        success: false,
        error: "No response from Gemini",
      });
    }

    // Parse JSON response
    let parsed;
    try {
      let jsonText = text.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.slice(0, -3);
      }
      parsed = JSON.parse(jsonText.trim());
    } catch (parseError) {
      return res.status(500).json({
        success: false,
        error: "Failed to parse response",
        rawResponse: text,
      });
    }

    // Check if it's not a valid bill
    if (parsed.isValidBill === false) {
      return res.status(200).json({
        success: false,
        errorType: parsed.error,
        error: parsed.message,
      });
    }

    // Build consumption data from usage history
    let consumptionData = null;
    if (parsed.usageHistory && parsed.usageHistory.length > 0) {
      const monthlyConsumption = MONTH_NAMES.map((month, idx) => {
        const entry = parsed.usageHistory.find(
          (h) => h.month.toLowerCase() === month.toLowerCase(),
        );
        return {
          month,
          kWh: entry?.kWh || null,
          estimated: !entry,
        };
      });

      // Calculate annual consumption
      let total = 0;
      let count = 0;
      for (const entry of parsed.usageHistory) {
        if (entry.kWh) {
          total += entry.kWh;
          count++;
        }
      }

      // If we have partial data, estimate annual
      const avgMonthly = count > 0 ? total / count : 1000;
      const annualKwh = count >= 12 ? total : Math.round(avgMonthly * 12);

      consumptionData = {
        monthlyConsumption,
        annualConsumption: annualKwh,
        monthsWithData: count,
        dataQuality:
          count >= 12
            ? "excellent"
            : count >= 6
              ? "good"
              : count >= 3
                ? "fair"
                : "poor",
      };
    } else if (parsed.currentUsageKwh) {
      // Estimate annual from current month
      const estimatedAnnual = Math.round(parsed.currentUsageKwh * 12);
      consumptionData = {
        monthlyConsumption: MONTH_NAMES.map((month) => ({
          month,
          kWh: parsed.currentUsageKwh,
          estimated: true,
        })),
        annualConsumption: estimatedAnnual,
        monthsWithData: 1,
        dataQuality: "poor",
      };
    }

    // Return successful result
    return res.status(200).json({
      success: true,
      billData: parsed,
      consumptionData,
    });
  } catch (error) {
    console.error("Bill scan error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Unknown error during bill scanning",
    });
  }
}
