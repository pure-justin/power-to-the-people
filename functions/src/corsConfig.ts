/**
 * Shared CORS Configuration
 *
 * Centralizes CORS origin validation for all HTTP Cloud Functions.
 * Only allows the production domains and localhost dev server.
 */

import * as functions from "firebase-functions/v1";

/**
 * Allowed origins for CORS requests.
 * - Production Firebase Hosting domains
 * - Local Vite dev server
 */
const ALLOWED_ORIGINS: string[] = [
  "https://power-to-the-people-vpp.web.app",
  "https://power-to-the-people-vpp.firebaseapp.com",
  "http://localhost:5173",
];

/**
 * Sets CORS headers on the response, restricting Access-Control-Allow-Origin
 * to only the allowed origins. If the request origin is not in the allow list,
 * the origin header is omitted (browser will block the response).
 */
export function setCors(
  req: functions.https.Request,
  res: functions.Response,
): void {
  const origin = req.headers.origin as string | undefined;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Vary", "Origin");
}

/**
 * Handles preflight OPTIONS requests. Returns true if the request was
 * an OPTIONS request (and the caller should return early).
 */
export function handleOptions(
  req: functions.https.Request,
  res: functions.Response,
): boolean {
  if (req.method === "OPTIONS") {
    setCors(req, res);
    res.status(204).send("");
    return true;
  }
  return false;
}
