/**
 * Utility Bill Scanner Service
 * Cloud Run service that uses Gemini 1.5 Pro to extract data from utility bills
 */

import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

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

app.post("/scan-bill", async (req, res) => {
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const extractionPrompt = `You are an expert at extracting data from utility bills for solar system design.

FIRST, determine if this is actually a utility bill (electric, gas, or combined). If NOT a utility bill, return:
{
  "isValidBill": false,
  "error": "not_a_bill",
  "message": "This doesn't appear to be a utility bill. Please upload your electric or gas bill."
}

If the image is too blurry or unreadable, return:
{
  "isValidBill": false,
  "error": "poor_quality",
  "message": "The image quality is too poor to read. Please take a clearer photo."
}

If this IS a valid utility bill, extract data and return:
{
  "isValidBill": true,
  "accountNumber": "string",
  "customerName": "string",
  "serviceAddress": "string",
  "utilityCompany": "string",
  "utilityType": "electric | gas | combined",
  "tduName": "string - TDU name for Texas",
  "repName": "string - REP name",
  "esiid": "string - 17-22 digit Electric Service Identifier",
  "meterNumber": "string",
  "ratePlanName": "string",
  "billingPeriodStart": "YYYY-MM-DD",
  "billingPeriodEnd": "YYYY-MM-DD",
  "billingDays": number,
  "currentUsageKwh": number,
  "usageHistory": [{"month": "January", "year": 2024, "kWh": 1500}],
  "totalAmountDue": number,
  "baseCharge": number,
  "energyCharge": number,
  "deliveryCharge": number,
  "taxes": number,
  "ratePerKwh": number,
  "allInRatePerKwh": number,
  "confidence": number
}

CRITICAL: Extract 12-month usage history if visible. Find ESIID for Texas bills.
Return ONLY valid JSON.`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mediaType,
          data: imageBase64,
        },
      },
      extractionPrompt,
    ]);

    const text = result.response.text();

    if (!text) {
      return res.status(500).json({
        success: false,
        error: "No response from Gemini",
      });
    }

    // Parse JSON
    let parsed;
    try {
      let jsonText = text.trim();
      if (jsonText.startsWith("```json")) jsonText = jsonText.slice(7);
      if (jsonText.startsWith("```")) jsonText = jsonText.slice(3);
      if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);
      parsed = JSON.parse(jsonText.trim());
    } catch (parseError) {
      return res.status(500).json({
        success: false,
        error: "Failed to parse response",
        rawResponse: text,
      });
    }

    // Check if not valid bill
    if (parsed.isValidBill === false) {
      return res.json({
        success: false,
        errorType: parsed.error,
        error: parsed.message,
      });
    }

    // Build consumption data
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

    return res.json({
      success: true,
      billData: parsed,
      consumptionData,
    });
  } catch (error) {
    console.error("Bill scan error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Unknown error",
    });
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "scan-bill-service" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Scan bill service listening on port ${PORT}`);
});
