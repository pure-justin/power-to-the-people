#!/usr/bin/env node

/**
 * API Documentation Generator
 *
 * Reads all .ts files in functions/src/, parses JSDoc annotations with
 * structured @tags, and generates:
 *   - manifest.json  (comprehensive machine-readable system map)
 *   - openapi.yaml   (OpenAPI 3.0.3 spec for HTTP endpoints only)
 *
 * Usage:
 *   node scripts/generate-api-docs.js
 *   npm run generate:docs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Configuration ──────────────────────────────────────────────────────────────

const FUNCTIONS_SRC_DIR = path.resolve(__dirname, "../functions/src");
const OUTPUT_DIR = path.resolve(__dirname, "..");
const BASE_URL =
  "https://us-central1-power-to-the-people-vpp.cloudfunctions.net";

// ─── JSDoc Parser ───────────────────────────────────────────────────────────────

/**
 * Extract all JSDoc blocks from a TypeScript source file.
 * Returns an array of { comment, functionName, fileName } objects.
 */
function extractJSDocBlocks(source, fileName) {
  const blocks = [];

  // Match JSDoc comment blocks: /** ... */
  // Then look for a function/export name following the block
  const jsdocRegex = /\/\*\*([\s\S]*?)\*\//g;
  let match;

  while ((match = jsdocRegex.exec(source)) !== null) {
    const comment = match[1];
    const afterComment = source.slice(
      match.index + match[0].length,
      match.index + match[0].length + 500,
    );

    // Check if this JSDoc is followed by an export or function declaration
    const hasExport = /^\s*(export\s|async\s+function\s|function\s)/.test(
      afterComment,
    );
    const hasFunctionTag = /@function\s/.test(comment);

    if (hasFunctionTag) {
      blocks.push({
        comment,
        afterComment,
        fileName,
      });
    }
  }

  return blocks;
}

/**
 * Parse structured @tags from a JSDoc comment block.
 * Returns an object with tag names as keys.
 */
function parseTags(comment) {
  const tags = {};
  const tagRegex = /@(\w+)\s+(.+)/g;
  let match;

  while ((match = tagRegex.exec(comment)) !== null) {
    const tagName = match[1];
    const tagValue = match[2].trim();

    // Handle duplicate tags by making them arrays
    if (tags[tagName]) {
      if (Array.isArray(tags[tagName])) {
        tags[tagName].push(tagValue);
      } else {
        tags[tagName] = [tags[tagName], tagValue];
      }
    } else {
      tags[tagName] = tagValue;
    }
  }

  return tags;
}

/**
 * Extract the description (non-tag text) from a JSDoc comment.
 */
function extractDescription(comment) {
  const lines = comment.split("\n");
  const descLines = [];

  for (const line of lines) {
    const trimmed = line.replace(/^\s*\*\s?/, "").trim();
    if (trimmed.startsWith("@")) break;
    if (trimmed.length > 0) {
      descLines.push(trimmed);
    }
  }

  return descLines.join(" ").trim();
}

// ─── File Reading ───────────────────────────────────────────────────────────────

/**
 * Read all .ts files from functions/src/ (non-recursive, skips examples/).
 */
function readSourceFiles() {
  const files = [];

  if (!fs.existsSync(FUNCTIONS_SRC_DIR)) {
    console.error(
      `Error: functions/src/ directory not found at ${FUNCTIONS_SRC_DIR}`,
    );
    process.exit(1);
  }

  const entries = fs.readdirSync(FUNCTIONS_SRC_DIR);

  for (const entry of entries) {
    const fullPath = path.join(FUNCTIONS_SRC_DIR, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isFile() && entry.endsWith(".ts") && entry !== "index.ts") {
      const content = fs.readFileSync(fullPath, "utf8");
      files.push({
        name: entry,
        content,
      });
    }
  }

  return files;
}

// ─── Function Extraction ────────────────────────────────────────────────────────

/**
 * Parse all documented functions from source files.
 */
function extractFunctions(sourceFiles) {
  const functions = {};

  for (const file of sourceFiles) {
    const blocks = extractJSDocBlocks(file.content, file.name);

    for (const block of blocks) {
      const tags = parseTags(block.comment);
      const description = extractDescription(block.comment);

      if (!tags.function) continue;

      const funcName = tags.function;

      // Parse errors into an array
      let errors = [];
      if (tags.errors) {
        const errStr = Array.isArray(tags.errors)
          ? tags.errors.join(", ")
          : tags.errors;
        errors = errStr
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);
      }

      // Parse firestore collections into an array
      let firestore = [];
      if (tags.firestore) {
        const fsStr = Array.isArray(tags.firestore)
          ? tags.firestore.join(", ")
          : tags.firestore;
        firestore = fsStr
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
      }

      functions[funcName] = {
        description: description || `${funcName} function`,
        type: tags.type || "unknown",
        ...(tags.method && { method: tags.method }),
        auth: tags.auth || "none",
        ...(tags.scope && { scope: tags.scope }),
        input: tags.input || "{}",
        output: tags.output || "void",
        errors,
        billing: tags.billing || "none",
        rateLimit: tags.rateLimit || "none",
        firestore,
        file: file.name,
      };
    }
  }

  return functions;
}

// ─── Hardcoded Data Sections ────────────────────────────────────────────────────

const COLLECTIONS = {
  subscriptions: {
    description: "Stripe subscription records",
    fields: [
      "userId",
      "stripeCustomerId",
      "stripeSubscriptionId",
      "tier",
      "status",
      "limits",
      "currentPeriodStart",
      "currentPeriodEnd",
    ],
    usedBy: ["createSubscription", "stripeWebhook", "getSubscriptionStatus"],
  },
  usage_records: {
    description: "Monthly usage metering per user",
    fields: [
      "userId",
      "month",
      "api_call_count",
      "lead_count",
      "compliance_check_count",
    ],
    usedBy: ["recordUsage", "checkUsageLimit", "getSubscriptionStatus"],
  },
  leads: {
    description: "Solar lead records",
    usedBy: ["createLead", "updateLead", "assignLead"],
  },
  invoices: {
    description: "Mercury ACH invoices",
    usedBy: ["createMercuryInvoice", "syncInvoiceStatus"],
  },
  apiKeys: {
    description: "API key management",
    usedBy: ["createApiKey", "validateApiKey", "validateApiKeyFromRequest"],
  },
  apiKeyUsageLogs: {
    description: "API key usage audit log",
    usedBy: ["validateApiKey", "getApiKeyUsage", "cleanupApiKeys"],
  },
  solar_equipment: {
    description: "Solar panel/inverter/battery database",
  },
  solar_utility_rates: {
    description: "Utility rate data by state/zip",
  },
  solar_incentives: {
    description: "Solar incentive programs by state",
  },
  solar_permits: {
    description: "Permit requirements by jurisdiction",
  },
  solar_tpo_providers: {
    description: "Third-party ownership providers",
  },
  referrals: {
    description: "Referral tracking and commissions",
  },
  projects: {
    description: "Solar installation projects",
  },
  users: {
    description: "User profiles and roles",
  },
};

const INTEGRATIONS = {
  stripe: {
    mode: "test",
    products: {
      starter: {
        productId: "prod_TwFLid7j0JHnSl",
        priceId: "price_1SyMrCQhgZdyZ7qRyWDGrr9U",
        amount: 7900,
      },
      professional: {
        productId: "prod_TwFLxXsbBanKDG",
        priceId: "price_1SyMrEQhgZdyZ7qRYLfqv0Ds",
        amount: 14900,
      },
      enterprise: {
        productId: "prod_TwFL2VeL1zzZmF",
        priceId: "price_1SyMrFQhgZdyZ7qRcQk9fAqh",
        amount: 29900,
      },
    },
    paygo: {
      solar_lead: {
        priceId: "price_1SyMrGQhgZdyZ7qRixVanOLJ",
        amount: 500,
      },
      api_call_pack: {
        priceId: "price_1SyMrHQhgZdyZ7qRfeQQUUI6",
        amount: 2500,
      },
      compliance_check: {
        priceId: "price_1SyMrIQhgZdyZ7qRZKDhbgKL",
        amount: 200,
      },
    },
    webhookEndpoint: "we_1SyMveQhgZdyZ7qR5IbbddaH",
    webhookUrl: `${BASE_URL}/stripeWebhook`,
    webhookEvents: [
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.payment_succeeded",
      "invoice.payment_failed",
      "checkout.session.completed",
    ],
  },
  mercury: {
    baseUrl: "https://api.mercury.com/api/v1",
    accountId: "ecc22c2c-aabf-11f0-955b-13f894471589",
    configKey: "mercury.api_token",
  },
  twilio: {
    configKeys: [
      "twilio.account_sid",
      "twilio.auth_token",
      "twilio.phone_number",
    ],
  },
};

const CONFIG = {
  "stripe.secret_key": "Stripe API key (test mode: sk_test_...)",
  "stripe.webhook_secret": "Stripe webhook signing secret (whsec_...)",
  "mercury.api_token": "Mercury Banking API token",
  "mercury.account_id": "Mercury checking account ID",
  "twilio.account_sid": "Twilio account SID",
  "twilio.auth_token": "Twilio auth token",
  "twilio.phone_number": "Twilio phone number for sending SMS",
};

const BILLING = {
  tiers: {
    starter: {
      price: 79,
      leads_per_month: 50,
      api_calls_per_month: 1000,
      compliance_checks_per_month: 25,
    },
    professional: {
      price: 149,
      leads_per_month: 200,
      api_calls_per_month: 10000,
      compliance_checks_per_month: 200,
    },
    enterprise: {
      price: 299,
      leads_per_month: -1,
      api_calls_per_month: 100000,
      compliance_checks_per_month: -1,
    },
  },
  usageTypes: ["api_call", "lead", "compliance_check", "sms"],
  meteringCollections: ["usage_records", "apiKeyUsageLogs"],
};

// ─── Manifest Generator ────────────────────────────────────────────────────────

function generateManifest(functions) {
  return {
    project: "power-to-the-people-vpp",
    version: "1.0.0",
    generated: new Date().toISOString(),
    baseUrl: BASE_URL,
    functions,
    collections: COLLECTIONS,
    integrations: INTEGRATIONS,
    config: CONFIG,
    billing: BILLING,
  };
}

// ─── OpenAPI Generator ──────────────────────────────────────────────────────────

/**
 * Convert a JSDoc type string like {{ field: type }} into an OpenAPI schema.
 * Returns a YAML-formatted string for the schema properties.
 */
function parseInputToSchemaProperties(inputStr, indent) {
  if (!inputStr || inputStr === "{}" || inputStr === "void") return null;

  // Strip outer {{ }}
  let inner = inputStr.trim();
  if (inner.startsWith("{{")) inner = inner.slice(2);
  if (inner.endsWith("}}")) inner = inner.slice(0, -2);
  if (inner.startsWith("{")) inner = inner.slice(1);
  if (inner.endsWith("}")) inner = inner.slice(0, -1);
  inner = inner.trim();

  if (!inner) return null;

  // Split on commas that are not inside nested braces/brackets
  const fields = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "{" || ch === "[" || ch === "(") depth++;
    else if (ch === "}" || ch === "]" || ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      fields.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) fields.push(current.trim());

  const lines = [];
  const required = [];

  for (const field of fields) {
    // Parse field: type or field?: type
    const fieldMatch = field.match(/^(\w+)(\??):\s*(.+)$/);
    if (!fieldMatch) continue;

    const [, name, optional, typeStr] = fieldMatch;
    const yamlType = tsTypeToOpenApi(typeStr.trim());

    if (!optional) required.push(name);

    lines.push(`${indent}${name}:`);
    if (yamlType.type === "array") {
      lines.push(`${indent}  type: array`);
      lines.push(`${indent}  items:`);
      lines.push(`${indent}    type: ${yamlType.items || "string"}`);
    } else {
      lines.push(`${indent}  type: ${yamlType.type}`);
      if (yamlType.enum) {
        lines.push(`${indent}  enum:`);
        for (const val of yamlType.enum) {
          lines.push(`${indent}    - "${val}"`);
        }
      }
    }
  }

  return { yaml: lines.join("\n"), required };
}

/**
 * Map a TypeScript type string to an OpenAPI type.
 */
function tsTypeToOpenApi(typeStr) {
  // Remove quotes for literal types
  const cleaned = typeStr.replace(/['"]/g, "");

  // Union types with literal values -> enum
  if (typeStr.includes("|")) {
    const parts = typeStr.split("|").map((p) => p.trim().replace(/['"]/g, ""));
    // Check if all parts are string literals
    const allStrings = parts.every(
      (p) => !["number", "boolean", "object", "any"].includes(p),
    );
    if (allStrings) {
      return { type: "string", enum: parts };
    }
    return { type: "string" };
  }

  // Array types
  if (typeStr.includes("[]") || typeStr.startsWith("Array<")) {
    return { type: "array", items: "string" };
  }

  // Primitive mappings
  if (cleaned === "string") return { type: "string" };
  if (cleaned === "number") return { type: "number" };
  if (cleaned === "boolean") return { type: "boolean" };
  if (cleaned === "any" || cleaned === "object") return { type: "object" };

  return { type: "string" };
}

/**
 * Generate OpenAPI 3.0.3 YAML spec from the extracted functions.
 * Only includes onRequest functions.
 */
function generateOpenApiYaml(functions) {
  const httpFunctions = Object.entries(functions).filter(
    ([, f]) => f.type === "onRequest",
  );

  if (httpFunctions.length === 0) {
    return "# No HTTP endpoints found\nopenapi: '3.0.3'\ninfo:\n  title: Solar CRM API\n  version: '1.0.0'\npaths: {}\n";
  }

  let yaml = `openapi: '3.0.3'
info:
  title: Power to the People - Solar CRM API
  description: >-
    REST API for the Power to the People solar CRM platform.
    Provides endpoints for solar data queries, lead management,
    payment webhooks, referral tracking, and SMT data integration.
  version: '1.0.0'
  contact:
    email: justin@agntc.tech
servers:
  - url: ${BASE_URL}
    description: Firebase Cloud Functions (us-central1)

security:
  - BearerAuth: []

paths:`;

  for (const [funcName, func] of httpFunctions) {
    const method = (func.method || "POST").toLowerCase();
    const endpoint = `/${funcName}`;

    yaml += `\n  ${endpoint}:`;
    yaml += `\n    ${method}:`;
    yaml += `\n      operationId: ${funcName}`;
    yaml += `\n      summary: ${func.description.substring(0, 120)}`;
    yaml += `\n      description: ${func.description}`;

    // Tags based on file
    const tag = func.file.replace(".ts", "");
    yaml += `\n      tags:`;
    yaml += `\n        - ${tag}`;

    // Security
    if (func.auth === "none") {
      yaml += `\n      security: []`;
    } else if (func.auth === "api_key") {
      yaml += `\n      security:`;
      yaml += `\n        - BearerAuth: []`;
    }

    // Request body or query parameters
    if (method === "get") {
      // Parse input as query parameters
      const schema = parseInputToSchemaProperties(
        func.input,
        "                ",
      );
      if (schema && schema.yaml) {
        yaml += `\n      parameters:`;
        // Extract field names from the schema YAML
        const paramLines = schema.yaml.split("\n");
        let currentParam = null;
        for (const line of paramLines) {
          const paramMatch = line.match(/^\s{16}(\w+):$/);
          const typeMatch = line.match(/^\s{18}type:\s*(.+)$/);
          const enumMatch = line.match(/^\s{18}enum:$/);
          if (paramMatch) {
            currentParam = paramMatch[1];
            yaml += `\n        - name: ${currentParam}`;
            yaml += `\n          in: query`;
            yaml += `\n          required: ${schema.required.includes(currentParam)}`;
            yaml += `\n          schema:`;
          } else if (typeMatch && currentParam) {
            yaml += `\n            type: ${typeMatch[1]}`;
          }
        }
      }
    } else {
      // POST/PUT - request body
      const schema = parseInputToSchemaProperties(
        func.input,
        "                ",
      );
      if (schema && schema.yaml) {
        yaml += `\n      requestBody:`;
        yaml += `\n        required: true`;
        yaml += `\n        content:`;
        yaml += `\n          application/json:`;
        yaml += `\n            schema:`;
        yaml += `\n              type: object`;
        if (schema.required.length > 0) {
          yaml += `\n              required:`;
          for (const req of schema.required) {
            yaml += `\n                - ${req}`;
          }
        }
        yaml += `\n              properties:`;
        yaml += `\n${schema.yaml}`;
      }
    }

    // Responses
    yaml += `\n      responses:`;
    yaml += `\n        '200':`;
    yaml += `\n          description: Successful response`;

    // Parse output schema
    const outputSchema = parseInputToSchemaProperties(
      func.output,
      "                    ",
    );
    if (outputSchema && outputSchema.yaml) {
      yaml += `\n          content:`;
      yaml += `\n            application/json:`;
      yaml += `\n              schema:`;
      yaml += `\n                type: object`;
      yaml += `\n                properties:`;
      yaml += `\n${outputSchema.yaml}`;
    }

    // Error responses
    for (const err of func.errors) {
      const errStr = err.trim();
      if (errStr === "400") {
        yaml += `\n        '400':`;
        yaml += `\n          description: Bad request - missing or invalid parameters`;
      } else if (errStr === "401" || errStr === "unauthenticated") {
        yaml += `\n        '401':`;
        yaml += `\n          description: Unauthorized - invalid or missing API key`;
      } else if (errStr === "403" || errStr === "permission-denied") {
        yaml += `\n        '403':`;
        yaml += `\n          description: Forbidden - insufficient permissions or scope`;
      } else if (errStr === "405") {
        yaml += `\n        '405':`;
        yaml += `\n          description: Method not allowed`;
      } else if (errStr === "429" || errStr === "resource-exhausted") {
        yaml += `\n        '429':`;
        yaml += `\n          description: Rate limit exceeded`;
      } else if (errStr === "500" || errStr === "internal") {
        yaml += `\n        '500':`;
        yaml += `\n          description: Internal server error`;
      }
    }
  }

  // Components
  yaml += `\n
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: API Key
      description: >-
        API key authentication. Pass your API key as a Bearer token
        in the Authorization header: "Authorization: Bearer pk_live_..."
  schemas:
    Error:
      type: object
      properties:
        error:
          type: string
          description: Error message
        success:
          type: boolean
          example: false
    SuccessResponse:
      type: object
      properties:
        success:
          type: boolean
          example: true
`;

  return yaml;
}

// ─── Main ───────────────────────────────────────────────────────────────────────

function main() {
  console.log("Generating API documentation...\n");

  // 1. Read source files
  const sourceFiles = readSourceFiles();
  console.log(`Found ${sourceFiles.length} source files in functions/src/`);

  // 2. Extract documented functions
  const functions = extractFunctions(sourceFiles);
  const funcCount = Object.keys(functions).length;
  console.log(`Extracted ${funcCount} documented functions\n`);

  // 3. Generate manifest.json
  const manifest = generateManifest(functions);
  const manifestPath = path.join(OUTPUT_DIR, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(
    `  Written: manifest.json (${funcCount} functions, ${Object.keys(COLLECTIONS).length} collections)`,
  );

  // 4. Generate openapi.yaml
  const openapiYaml = generateOpenApiYaml(functions);
  const openapiPath = path.join(OUTPUT_DIR, "openapi.yaml");
  fs.writeFileSync(openapiPath, openapiYaml);

  const httpCount = Object.values(functions).filter(
    (f) => f.type === "onRequest",
  ).length;
  console.log(`  Written: openapi.yaml (${httpCount} HTTP endpoints)`);

  // 5. Summary
  console.log("\n--- Summary ---");
  const typeGroups = {};
  for (const [name, func] of Object.entries(functions)) {
    const type = func.type;
    if (!typeGroups[type]) typeGroups[type] = [];
    typeGroups[type].push(name);
  }

  for (const [type, names] of Object.entries(typeGroups)) {
    console.log(`  ${type}: ${names.length} functions`);
    for (const name of names) {
      console.log(`    - ${name}`);
    }
  }

  console.log("\nDone.");
}

main();
