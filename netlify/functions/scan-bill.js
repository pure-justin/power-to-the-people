/**
 * Netlify Serverless Function: Utility Bill Scanner
 * Uses Gemini 1.5 Pro to extract data from utility bill images/PDFs
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

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

export default async (req, context) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const body = await req.json();
    const { data } = body;
    const { imageBase64, mediaType = "image/jpeg" } = data || {};

    if (!imageBase64) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing imageBase64 in request",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Gemini API key not configured",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
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

  // UTILITY & PROVIDER
  "utilityCompany": "string - main utility name",
  "utilityType": "electric | gas | combined",
  "tduName": "string - TDU name for Texas deregulated",
  "repName": "string - Retail Electric Provider name if deregulated market",

  // UNIQUE IDENTIFIERS
  "esiid": "string - 17-22 digit Electric Service Identifier (Texas)",
  "meterNumber": "string - physical meter number",

  // RATE/TARIFF INFO
  "ratePlanName": "string - e.g. 'Residential Service'",

  // BILLING PERIOD
  "billingPeriodStart": "YYYY-MM-DD",
  "billingPeriodEnd": "YYYY-MM-DD",
  "billingDays": number,

  // CONSUMPTION DATA
  "currentUsageKwh": number,

  // 12-MONTH USAGE HISTORY (from chart/graph - VERY IMPORTANT)
  "usageHistory": [
    {"month": "January", "year": 2024, "kWh": 1500}
  ],

  // CHARGES
  "totalAmountDue": number,
  "baseCharge": number,
  "energyCharge": number,
  "deliveryCharge": number,
  "taxes": number,

  // CALCULATED RATES
  "ratePerKwh": number,
  "allInRatePerKwh": number,

  // EXTRACTION METADATA
  "confidence": number // 0-1
}

CRITICAL: Extract the 12-month usage history if visible. Find the ESIID for Texas bills.
Return ONLY valid JSON, no markdown.`;

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
      return new Response(
        JSON.stringify({
          success: false,
          error: "No response from Gemini",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Parse JSON response
    let parsed;
    try {
      let jsonText = text.trim();
      if (jsonText.startsWith("```json")) jsonText = jsonText.slice(7);
      if (jsonText.startsWith("```")) jsonText = jsonText.slice(3);
      if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);
      parsed = JSON.parse(jsonText.trim());
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to parse response",
          rawResponse: text,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Check if it's not a valid bill
    if (parsed.isValidBill === false) {
      return new Response(
        JSON.stringify({
          success: false,
          errorType: parsed.error,
          error: parsed.message,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Build consumption data from usage history
    let consumptionData = null;
    if (parsed.usageHistory && parsed.usageHistory.length > 0) {
      const monthlyConsumption = MONTH_NAMES.map((month) => {
        const entry = parsed.usageHistory.find(
          (h) => h.month.toLowerCase() === month.toLowerCase(),
        );
        return {
          month,
          kWh: entry?.kWh || null,
          estimated: !entry,
        };
      });

      let total = 0,
        count = 0;
      for (const entry of parsed.usageHistory) {
        if (entry.kWh) {
          total += entry.kWh;
          count++;
        }
      }

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

    return new Response(
      JSON.stringify({
        success: true,
        billData: parsed,
        consumptionData,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    console.error("Bill scan error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error during bill scanning",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
};

export const config = {
  path: "/api/scan-bill",
};
