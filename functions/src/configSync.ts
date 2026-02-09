/**
 * Config Sync — reads functions.config() and writes masked status to Firestore
 *
 * Admin-only onCall function that bridges Cloud Functions environment config
 * with the Firestore `config` collection so the admin UI can show integration status.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface IntegrationDef {
  docId: string;
  configNamespace: string;
  requiredKeys: string[];
  alwaysConnected?: boolean;
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    docId: "stripe",
    configNamespace: "stripe",
    requiredKeys: ["secret_key", "webhook_secret"],
  },
  {
    docId: "twilio",
    configNamespace: "twilio",
    requiredKeys: ["account_sid", "auth_token", "phone_number"],
  },
  {
    docId: "mercury",
    configNamespace: "mercury",
    requiredKeys: ["api_token"],
  },
  {
    docId: "nrel",
    configNamespace: "nrel",
    requiredKeys: ["api_key"],
  },
  {
    docId: "openei",
    configNamespace: "",
    requiredKeys: [],
    alwaysConnected: true,
  },
  {
    docId: "google_solar",
    configNamespace: "google",
    requiredKeys: ["solar_api_key"],
  },
];

/** Mask a credential value for safe display */
function maskValue(val: string): string {
  if (!val) return "";
  if (val.length < 15) return "configured";
  return val.substring(0, 8) + "..." + val.substring(val.length - 3);
}

export const syncConfigStatus = functions.https.onCall(
  async (_data, context) => {
    // Admin-only
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be logged in",
      );
    }

    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(context.auth.uid)
      .get();
    const role = userDoc.data()?.role;
    if (role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required",
      );
    }

    const config = functions.config();
    const db = admin.firestore();
    const results: Record<string, { status: string; keys: number }> = {};

    for (const integration of INTEGRATIONS) {
      const docRef = db.collection("config").doc(integration.docId);

      if (integration.alwaysConnected) {
        await docRef.set({
          status: "connected",
          lastSynced: admin.firestore.FieldValue.serverTimestamp(),
        });
        results[integration.docId] = { status: "connected", keys: 0 };
        continue;
      }

      const nsConfig = config[integration.configNamespace] || {};
      const docData: Record<string, string | admin.firestore.FieldValue> = {
        lastSynced: admin.firestore.FieldValue.serverTimestamp(),
      };

      let presentCount = 0;
      for (const key of integration.requiredKeys) {
        const val = nsConfig[key];
        if (val) {
          docData[key] = maskValue(val);
          presentCount++;
        }
      }

      if (presentCount === integration.requiredKeys.length) {
        docData.status = "connected";
      } else if (presentCount > 0) {
        docData.status = "partial";
      } else {
        docData.status = "missing";
      }

      await docRef.set(docData);
      results[integration.docId] = {
        status: docData.status as string,
        keys: presentCount,
      };
    }

    return { success: true, integrations: results };
  },
);
