#!/usr/bin/env node

/**
 * importAllDataToFirestore.js
 *
 * Comprehensive Firestore import script for all Solar CRM data files.
 * Imports utility rates, incentives, equipment, permits, TPO providers,
 * NREL solar resource data, FEOC entities, energy communities, and tariff rates.
 *
 * Usage:
 *   node scripts/importAllDataToFirestore.js
 *   node scripts/importAllDataToFirestore.js --dry-run
 *   node scripts/importAllDataToFirestore.js --collection solar_equipment
 *   node scripts/importAllDataToFirestore.js --collection solar_utility_rates --dry-run
 */

import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname,
  "../firebase-service-account.json",
);
const DATA_DIR = path.resolve(__dirname, "../data");
const BATCH_SIZE = 500;

// ---------------------------------------------------------------------------
// CLI Flags
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const collectionFlagIdx = args.indexOf("--collection");
const ONLY_COLLECTION =
  collectionFlagIdx !== -1 ? args[collectionFlagIdx + 1] : null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a string to a URL-safe slug suitable for Firestore document IDs.
 * Handles special characters, unicode, parentheses, slashes, etc.
 */
function slugify(str) {
  if (!str) return "";
  return str
    .toString()
    .toLowerCase()
    .normalize("NFD") // decompose accents
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[()[\]{}]/g, "") // remove brackets/parens
    .replace(/[&]/g, "and") // & -> and
    .replace(/[+]/g, "plus") // + -> plus
    .replace(/[''""`]/g, "") // remove quotes
    .replace(/[^\w\s-]/g, "_") // non-word chars -> underscore
    .replace(/[\s_]+/g, "_") // whitespace/underscores -> single underscore
    .replace(/^[_-]+|[_-]+$/g, "") // trim leading/trailing
    .substring(0, 120); // cap length for Firestore ID safety
}

/**
 * Safely read and parse a JSON file. Returns null on failure.
 */
function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`  [ERROR] Failed to read/parse ${filePath}: ${err.message}`);
    return null;
  }
}

/**
 * List JSON files in a directory (non-recursive).
 */
function listJsonFiles(dirPath) {
  try {
    return fs
      .readdirSync(dirPath)
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(dirPath, f));
  } catch {
    return [];
  }
}

/**
 * Commit documents in batches of BATCH_SIZE.
 * Each item in `docs` should be { id: string, data: object }.
 */
async function batchWrite(db, collectionName, docs) {
  let written = 0;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    if (DRY_RUN) {
      written += chunk.length;
      continue;
    }
    const batch = db.batch();
    for (const doc of chunk) {
      const ref = db.collection(collectionName).doc(doc.id);
      batch.set(ref, doc.data, { merge: true });
    }
    await batch.commit();
    written += chunk.length;
  }
  return written;
}

// ---------------------------------------------------------------------------
// Collection Importers
// ---------------------------------------------------------------------------

/**
 * solar_utility_rates
 * Sources: data/utilities/states/*.json + data/utilities/national_utility_rates.json
 */
async function importUtilityRates(db) {
  const collectionName = "solar_utility_rates";
  const docs = [];
  let errors = 0;

  // 1) State files
  const stateDir = path.join(DATA_DIR, "utilities", "states");
  const stateFiles = listJsonFiles(stateDir);

  for (const filePath of stateFiles) {
    const fileName = path.basename(filePath);
    const stateCode = path.basename(filePath, ".json").toUpperCase();
    const data = readJson(filePath);
    if (!data) {
      errors++;
      continue;
    }

    console.log(
      `  Importing ${collectionName} from utilities/states/${fileName}...`,
    );

    const utilities = data.utilities || [];
    for (const utility of utilities) {
      try {
        const nameSlug = slugify(utility.utility_name);
        const docId = `${stateCode}_${nameSlug}`;
        docs.push({
          id: docId,
          data: {
            ...utility,
            state: stateCode,
            net_metering: data.net_metering || null,
            state_avg_rate: data.avg_residential_rate || null,
            eia_state_avg_rate: data.eia_state_avg_rate || null,
            imported_at: admin.firestore.FieldValue.serverTimestamp(),
            source_file: `utilities/states/${fileName}`,
          },
        });
      } catch (err) {
        console.error(
          `  [ERROR] Skipping utility "${utility.utility_name}": ${err.message}`,
        );
        errors++;
      }
    }
  }

  // 2) National summary file
  const nationalPath = path.join(
    DATA_DIR,
    "utilities",
    "national_utility_rates.json",
  );
  const national = readJson(nationalPath);
  if (national) {
    console.log(
      `  Importing ${collectionName} from utilities/national_utility_rates.json...`,
    );
    const docId = "national_summary";
    docs.push({
      id: docId,
      data: {
        ...national,
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        source_file: "utilities/national_utility_rates.json",
      },
    });
  }

  const written = await batchWrite(db, collectionName, docs);
  return { collection: collectionName, docs: written, errors };
}

/**
 * solar_incentives
 * Sources: data/incentives/states/*.json + data/texas_solar_incentives_2026.json
 */
async function importIncentives(db) {
  const collectionName = "solar_incentives";
  const docs = [];
  let errors = 0;

  // 1) State incentive files
  const stateDir = path.join(DATA_DIR, "incentives", "states");
  const stateFiles = listJsonFiles(stateDir);

  for (const filePath of stateFiles) {
    const fileName = path.basename(filePath);
    const stateCode = path.basename(filePath, ".json").toUpperCase();
    const data = readJson(filePath);
    if (!data) {
      errors++;
      continue;
    }

    console.log(
      `  Importing ${collectionName} from incentives/states/${fileName}...`,
    );

    const incentives = data.incentives || [];
    for (const incentive of incentives) {
      try {
        const nameSlug = slugify(incentive.name || incentive.id || "unknown");
        const docId = `${stateCode}_${nameSlug}`;
        docs.push({
          id: docId,
          data: {
            ...incentive,
            state: stateCode,
            state_name: data.state_name || null,
            federal_residential_itc_available:
              data.federal_residential_itc_available ?? null,
            tpo_commercial_itc_available:
              data.tpo_commercial_itc_available ?? null,
            imported_at: admin.firestore.FieldValue.serverTimestamp(),
            source_file: `incentives/states/${fileName}`,
          },
        });
      } catch (err) {
        console.error(
          `  [ERROR] Skipping incentive "${incentive.name}": ${err.message}`,
        );
        errors++;
      }
    }
  }

  // 2) Texas solar incentives 2026
  const texasPath = path.join(DATA_DIR, "texas_solar_incentives_2026.json");
  const texasData = readJson(texasPath);
  if (texasData) {
    console.log(
      `  Importing ${collectionName} from texas_solar_incentives_2026.json...`,
    );

    // This file has nested structure: federal_incentives + texas_incentives
    const sections = [
      { key: "federal_incentives", prefix: "TX_federal" },
      { key: "texas_incentives", prefix: "TX_state" },
    ];

    for (const section of sections) {
      const sectionData = texasData[section.key];
      if (!sectionData || typeof sectionData !== "object") continue;

      // Each key in the section is an incentive program
      for (const [programKey, program] of Object.entries(sectionData)) {
        if (typeof program !== "object" || program === null) continue;
        try {
          const docId = `${section.prefix}_${slugify(programKey)}`;
          docs.push({
            id: docId,
            data: {
              ...program,
              state: "TX",
              program_key: programKey,
              category: section.key,
              imported_at: admin.firestore.FieldValue.serverTimestamp(),
              source_file: "texas_solar_incentives_2026.json",
            },
          });
        } catch (err) {
          console.error(
            `  [ERROR] Skipping TX incentive "${programKey}": ${err.message}`,
          );
          errors++;
        }
      }
    }
  }

  const written = await batchWrite(db, collectionName, docs);
  return { collection: collectionName, docs: written, errors };
}

/**
 * solar_equipment
 * Sources: data/equipment/panels.json, inverters.json, batteries.json, catalog_complete.json
 */
async function importEquipment(db) {
  const collectionName = "solar_equipment";
  const docs = [];
  let errors = 0;
  const seenIds = new Set();

  // Import individual equipment files (panels, inverters, batteries) with full detail
  const equipmentFiles = [
    { file: "panels.json", arrayKey: "panels", eqType: "panel" },
    { file: "inverters.json", arrayKey: "inverters", eqType: "inverter" },
    { file: "batteries.json", arrayKey: "batteries", eqType: "battery" },
  ];

  for (const { file, arrayKey, eqType } of equipmentFiles) {
    const filePath = path.join(DATA_DIR, "equipment", file);
    const data = readJson(filePath);
    if (!data) {
      errors++;
      continue;
    }

    console.log(`  Importing ${collectionName} from equipment/${file}...`);

    const items = data[arrayKey] || [];
    for (const item of items) {
      try {
        // Use existing id if present, otherwise generate one
        let docId = item.id;
        if (!docId) {
          const mfgSlug = slugify(item.manufacturer);
          const modelSlug = slugify(item.model);
          docId = `${eqType}_${mfgSlug}_${modelSlug}`;
        }

        if (seenIds.has(docId)) continue; // skip duplicates
        seenIds.add(docId);

        docs.push({
          id: docId,
          data: {
            ...item,
            equipment_type: eqType,
            imported_at: admin.firestore.FieldValue.serverTimestamp(),
            source_file: `equipment/${file}`,
          },
        });
      } catch (err) {
        console.error(
          `  [ERROR] Skipping equipment "${item.model}": ${err.message}`,
        );
        errors++;
      }
    }
  }

  // Import catalog_complete.json metadata as a summary doc
  const catalogPath = path.join(DATA_DIR, "equipment", "catalog_complete.json");
  const catalog = readJson(catalogPath);
  if (catalog && catalog.metadata) {
    docs.push({
      id: "catalog_metadata",
      data: {
        ...catalog.metadata,
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        source_file: "equipment/catalog_complete.json",
      },
    });
  }

  const written = await batchWrite(db, collectionName, docs);
  return { collection: collectionName, docs: written, errors };
}

/**
 * solar_permits
 * Sources: data/texas_permits_by_jurisdiction.json + data/permits/states/*.json
 */
async function importPermits(db) {
  const collectionName = "solar_permits";
  const docs = [];
  let errors = 0;

  // 1) State permit files from data/permits/states/
  const stateDir = path.join(DATA_DIR, "permits", "states");
  const stateFiles = listJsonFiles(stateDir);

  for (const filePath of stateFiles) {
    const fileName = path.basename(filePath);
    const stateCode = path.basename(filePath, ".json").toUpperCase();
    const data = readJson(filePath);
    if (!data) {
      errors++;
      continue;
    }

    console.log(
      `  Importing ${collectionName} from permits/states/${fileName}...`,
    );

    // Import state-level general requirements as a document
    const stateDocId = `${stateCode}_general`;
    const { jurisdictions, ...stateLevel } = data;
    docs.push({
      id: stateDocId,
      data: {
        ...stateLevel,
        state: stateCode,
        doc_type: "state_requirements",
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        source_file: `permits/states/${fileName}`,
      },
    });

    // Import each jurisdiction
    const jurisdictionList = Array.isArray(jurisdictions) ? jurisdictions : [];
    for (const jur of jurisdictionList) {
      try {
        const jurSlug = slugify(jur.jurisdiction_id || jur.name || "unknown");
        const docId = `${stateCode}_${jurSlug}`;
        docs.push({
          id: docId,
          data: {
            ...jur,
            state: stateCode,
            doc_type: "jurisdiction",
            imported_at: admin.firestore.FieldValue.serverTimestamp(),
            source_file: `permits/states/${fileName}`,
          },
        });
      } catch (err) {
        console.error(
          `  [ERROR] Skipping jurisdiction "${jur.name}": ${err.message}`,
        );
        errors++;
      }
    }
  }

  // 2) National permits files
  const nationalFiles = [
    "national_permits.json",
    "national_permits_summary.json",
  ];
  for (const nf of nationalFiles) {
    const filePath = path.join(DATA_DIR, "permits", nf);
    if (!fs.existsSync(filePath)) continue;
    const data = readJson(filePath);
    if (!data) {
      errors++;
      continue;
    }

    console.log(`  Importing ${collectionName} from permits/${nf}...`);

    // If it contains a states object or array
    if (data.states && typeof data.states === "object") {
      if (Array.isArray(data.states)) {
        for (const state of data.states) {
          try {
            const sc = (state.state || state.state_code || "").toUpperCase();
            const docId = `national_${slugify(sc || state.name || "unknown")}`;
            docs.push({
              id: docId,
              data: {
                ...state,
                doc_type: "national_summary",
                imported_at: admin.firestore.FieldValue.serverTimestamp(),
                source_file: `permits/${nf}`,
              },
            });
          } catch (err) {
            errors++;
          }
        }
      } else {
        // Object keyed by state
        for (const [key, value] of Object.entries(data.states)) {
          if (typeof value !== "object" || value === null) continue;
          const docId = `national_${slugify(key)}`;
          docs.push({
            id: docId,
            data: {
              ...value,
              state: key.toUpperCase(),
              doc_type: "national_summary",
              imported_at: admin.firestore.FieldValue.serverTimestamp(),
              source_file: `permits/${nf}`,
            },
          });
        }
      }
    } else {
      // Import as a single summary document
      const docId = `national_${slugify(path.basename(nf, ".json"))}`;
      docs.push({
        id: docId,
        data: {
          ...data,
          doc_type: "national_summary",
          imported_at: admin.firestore.FieldValue.serverTimestamp(),
          source_file: `permits/${nf}`,
        },
      });
    }
  }

  // 3) Texas permits by jurisdiction (legacy file at data root)
  const texasPermitsPath = path.join(
    DATA_DIR,
    "texas_permits_by_jurisdiction.json",
  );
  const texasPermits = readJson(texasPermitsPath);
  if (texasPermits) {
    console.log(
      `  Importing ${collectionName} from texas_permits_by_jurisdiction.json...`,
    );

    // Metadata doc
    if (texasPermits.metadata) {
      docs.push({
        id: "TX_metadata",
        data: {
          ...texasPermits.metadata,
          state: "TX",
          doc_type: "state_metadata",
          statewide_hoa_rules: texasPermits.statewide_hoa_rules || null,
          statewide_fire_setback_requirements:
            texasPermits.statewide_fire_setback_requirements || null,
          imported_at: admin.firestore.FieldValue.serverTimestamp(),
          source_file: "texas_permits_by_jurisdiction.json",
        },
      });
    }

    // Jurisdictions
    const jurisdictions = texasPermits.jurisdictions || {};
    for (const [jurKey, jurData] of Object.entries(jurisdictions)) {
      if (typeof jurData !== "object" || jurData === null) continue;
      try {
        const docId = `TX_${slugify(jurKey)}`;
        docs.push({
          id: docId,
          data: {
            ...jurData,
            state: "TX",
            jurisdiction_key: jurKey,
            doc_type: "jurisdiction",
            imported_at: admin.firestore.FieldValue.serverTimestamp(),
            source_file: "texas_permits_by_jurisdiction.json",
          },
        });
      } catch (err) {
        console.error(
          `  [ERROR] Skipping TX jurisdiction "${jurKey}": ${err.message}`,
        );
        errors++;
      }
    }
  }

  const written = await batchWrite(db, collectionName, docs);
  return { collection: collectionName, docs: written, errors };
}

/**
 * solar_tpo_providers
 * Source: data/tpo_finance_providers_texas_2026.json
 */
async function importTpoProviders(db) {
  const collectionName = "solar_tpo_providers";
  const docs = [];
  let errors = 0;

  const filePath = path.join(DATA_DIR, "tpo_finance_providers_texas_2026.json");
  const data = readJson(filePath);
  if (!data) return { collection: collectionName, docs: 0, errors: 1 };

  console.log(
    `  Importing ${collectionName} from tpo_finance_providers_texas_2026.json...`,
  );

  // Metadata doc
  if (data.metadata) {
    docs.push({
      id: "metadata",
      data: {
        ...data.metadata,
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        source_file: "tpo_finance_providers_texas_2026.json",
      },
    });
  }

  // TPO providers
  const providers = data.tpo_providers || [];
  for (const provider of providers) {
    try {
      const docId = slugify(provider.id || provider.name || "unknown");
      docs.push({
        id: docId,
        data: {
          ...provider,
          imported_at: admin.firestore.FieldValue.serverTimestamp(),
          source_file: "tpo_finance_providers_texas_2026.json",
        },
      });
    } catch (err) {
      console.error(
        `  [ERROR] Skipping TPO provider "${provider.name}": ${err.message}`,
      );
      errors++;
    }
  }

  // Finance companies (if present in file)
  const financeCompanies = data.finance_companies || [];
  for (const company of financeCompanies) {
    try {
      const docId = slugify(company.id || company.name || "unknown");
      docs.push({
        id: docId,
        data: {
          ...company,
          provider_type: "finance_company",
          imported_at: admin.firestore.FieldValue.serverTimestamp(),
          source_file: "tpo_finance_providers_texas_2026.json",
        },
      });
    } catch (err) {
      console.error(
        `  [ERROR] Skipping finance company "${company.name}": ${err.message}`,
      );
      errors++;
    }
  }

  const written = await batchWrite(db, collectionName, docs);
  return { collection: collectionName, docs: written, errors };
}

/**
 * nrel_solar_resource
 * Source: data/nrel/national_solar_resource.json
 */
async function importNrelSolarResource(db) {
  const collectionName = "nrel_solar_resource";
  const docs = [];
  let errors = 0;

  const filePath = path.join(DATA_DIR, "nrel", "national_solar_resource.json");
  const data = readJson(filePath);
  if (!data) return { collection: collectionName, docs: 0, errors: 1 };

  console.log(
    `  Importing ${collectionName} from nrel/national_solar_resource.json...`,
  );

  // Metadata document
  docs.push({
    id: "metadata",
    data: {
      generated_at: data.generated_at || null,
      source: data.source || null,
      system_capacity_kw: data.system_capacity_kw || null,
      states_count: data.states ? Object.keys(data.states).length : 0,
      imported_at: admin.firestore.FieldValue.serverTimestamp(),
      source_file: "nrel/national_solar_resource.json",
    },
  });

  // Each state -> each city becomes a document
  const states = data.states || {};
  for (const [stateCode, stateData] of Object.entries(states)) {
    const cities = stateData.cities || {};
    for (const [cityName, cityData] of Object.entries(cities)) {
      try {
        const docId = `${stateCode.toUpperCase()}_${slugify(cityName)}`;
        docs.push({
          id: docId,
          data: {
            state: stateCode.toUpperCase(),
            city: cityName,
            lat: cityData.lat || null,
            lon: cityData.lon || null,
            ac_annual_kwh: cityData.ac_annual_kwh || null,
            solrad_annual: cityData.solrad_annual || null,
            capacity_factor: cityData.capacity_factor || null,
            ac_monthly: cityData.ac_monthly || null,
            solrad_monthly: cityData.solrad_monthly || null,
            system_capacity_kw: data.system_capacity_kw || null,
            imported_at: admin.firestore.FieldValue.serverTimestamp(),
            source_file: "nrel/national_solar_resource.json",
          },
        });
      } catch (err) {
        console.error(
          `  [ERROR] Skipping NREL city "${cityName}": ${err.message}`,
        );
        errors++;
      }
    }
  }

  const written = await batchWrite(db, collectionName, docs);
  return { collection: collectionName, docs: written, errors };
}

/**
 * feoc_entities
 * Source: data/feoc_entities.json
 */
async function importFeocEntities(db) {
  const collectionName = "feoc_entities";
  const docs = [];
  let errors = 0;

  const filePath = path.join(DATA_DIR, "feoc_entities.json");
  const data = readJson(filePath);
  if (!data) return { collection: collectionName, docs: 0, errors: 1 };

  console.log(`  Importing ${collectionName} from feoc_entities.json...`);

  // Metadata doc
  if (data.metadata) {
    docs.push({
      id: "metadata",
      data: {
        ...data.metadata,
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        source_file: "feoc_entities.json",
      },
    });
  }

  // Each entity
  const entities = data.entities || [];
  for (const entity of entities) {
    try {
      const docId = slugify(entity.name || "unknown");
      docs.push({
        id: docId,
        data: {
          ...entity,
          imported_at: admin.firestore.FieldValue.serverTimestamp(),
          source_file: "feoc_entities.json",
        },
      });
    } catch (err) {
      console.error(
        `  [ERROR] Skipping FEOC entity "${entity.name}": ${err.message}`,
      );
      errors++;
    }
  }

  const written = await batchWrite(db, collectionName, docs);
  return { collection: collectionName, docs: written, errors };
}

/**
 * energy_communities
 * Source: data/energy_communities.json
 */
async function importEnergyCommunities(db) {
  const collectionName = "energy_communities";
  const docs = [];
  let errors = 0;

  const filePath = path.join(DATA_DIR, "energy_communities.json");
  const data = readJson(filePath);
  if (!data) return { collection: collectionName, docs: 0, errors: 1 };

  console.log(`  Importing ${collectionName} from energy_communities.json...`);

  // Metadata doc
  if (data.metadata) {
    docs.push({
      id: "metadata",
      data: {
        ...data.metadata,
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        source_file: "energy_communities.json",
      },
    });
  }

  // Categories
  const categories = data.categories || [];
  for (const cat of categories) {
    try {
      const docId = slugify(cat.type || "unknown");
      docs.push({
        id: docId,
        data: {
          ...cat,
          imported_at: admin.firestore.FieldValue.serverTimestamp(),
          source_file: "energy_communities.json",
        },
      });
    } catch (err) {
      console.error(
        `  [ERROR] Skipping energy community category "${cat.type}": ${err.message}`,
      );
      errors++;
    }
  }

  // Stacking rules
  if (data.stacking_rules) {
    docs.push({
      id: "stacking_rules",
      data: {
        ...data.stacking_rules,
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        source_file: "energy_communities.json",
      },
    });
  }

  const written = await batchWrite(db, collectionName, docs);
  return { collection: collectionName, docs: written, errors };
}

/**
 * tariff_rates
 * Source: data/ad_cvd_tariff_rates.json
 */
async function importTariffRates(db) {
  const collectionName = "tariff_rates";
  const docs = [];
  let errors = 0;

  const filePath = path.join(DATA_DIR, "ad_cvd_tariff_rates.json");
  const data = readJson(filePath);
  if (!data) return { collection: collectionName, docs: 0, errors: 1 };

  console.log(`  Importing ${collectionName} from ad_cvd_tariff_rates.json...`);

  // Metadata doc
  if (data.metadata) {
    docs.push({
      id: "metadata",
      data: {
        ...data.metadata,
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        source_file: "ad_cvd_tariff_rates.json",
      },
    });
  }

  // Countries
  const countries = data.countries || [];
  for (const country of countries) {
    try {
      const docId = slugify(
        country.country_code || country.country || "unknown",
      );
      docs.push({
        id: docId,
        data: {
          ...country,
          imported_at: admin.firestore.FieldValue.serverTimestamp(),
          source_file: "ad_cvd_tariff_rates.json",
        },
      });
    } catch (err) {
      console.error(
        `  [ERROR] Skipping tariff country "${country.country}": ${err.message}`,
      );
      errors++;
    }
  }

  // Section 201 if present
  if (data.section_201) {
    docs.push({
      id: "section_201",
      data: {
        ...data.section_201,
        doc_type: "section_201",
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        source_file: "ad_cvd_tariff_rates.json",
      },
    });
  }

  // Reciprocal tariffs if present
  if (data.reciprocal_tariffs) {
    docs.push({
      id: "reciprocal_tariffs",
      data: {
        ...data.reciprocal_tariffs,
        doc_type: "reciprocal_tariffs",
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        source_file: "ad_cvd_tariff_rates.json",
      },
    });
  }

  // Cumulative tariff examples if present
  if (data.cumulative_tariff_examples) {
    docs.push({
      id: "cumulative_examples",
      data: {
        examples: data.cumulative_tariff_examples,
        doc_type: "cumulative_examples",
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        source_file: "ad_cvd_tariff_rates.json",
      },
    });
  }

  // Impact analysis if present
  if (data.market_impact) {
    docs.push({
      id: "market_impact",
      data: {
        ...data.market_impact,
        doc_type: "market_impact",
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        source_file: "ad_cvd_tariff_rates.json",
      },
    });
  }

  const written = await batchWrite(db, collectionName, docs);
  return { collection: collectionName, docs: written, errors };
}

/**
 * nrel_city_profiles
 * Source: data/nrel/city_solar_profiles.json
 */
async function importCitySolarProfiles(db) {
  const collectionName = "nrel_city_profiles";
  const docs = [];
  let errors = 0;

  const filePath = path.join(DATA_DIR, "nrel", "city_solar_profiles.json");
  const data = readJson(filePath);
  if (!data) return { collection: collectionName, docs: 0, errors: 0 };

  console.log(
    `  Importing ${collectionName} from nrel/city_solar_profiles.json...`,
  );

  // Metadata doc
  if (data.metadata) {
    docs.push({
      id: "metadata",
      data: {
        ...data.metadata,
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        source_file: "nrel/city_solar_profiles.json",
      },
    });
  }

  // City profiles
  const cities = data.cities || [];
  for (const city of cities) {
    try {
      const docId = `${(city.state || "XX").toUpperCase()}_${slugify(city.city || "unknown")}`;
      docs.push({
        id: docId,
        data: {
          ...city,
          imported_at: admin.firestore.FieldValue.serverTimestamp(),
          source_file: "nrel/city_solar_profiles.json",
        },
      });
    } catch (err) {
      console.error(`  [ERROR] Skipping city "${city.city}": ${err.message}`);
      errors++;
    }
  }

  // National summary
  if (data.national_summary) {
    docs.push({
      id: "national_summary",
      data: {
        ...data.national_summary,
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        source_file: "nrel/city_solar_profiles.json",
      },
    });
  }

  const written = await batchWrite(db, collectionName, docs);
  return { collection: collectionName, docs: written, errors };
}

/**
 * nrel_pvwatts_estimates
 * Source: data/nrel/pvwatts_city_estimates.json
 */
async function importPvwattsEstimates(db) {
  const collectionName = "nrel_pvwatts_estimates";
  const docs = [];
  let errors = 0;

  const filePath = path.join(DATA_DIR, "nrel", "pvwatts_city_estimates.json");
  const data = readJson(filePath);
  if (!data) return { collection: collectionName, docs: 0, errors: 0 };

  console.log(
    `  Importing ${collectionName} from nrel/pvwatts_city_estimates.json...`,
  );

  // Metadata doc
  if (data.metadata) {
    docs.push({
      id: "metadata",
      data: {
        ...data.metadata,
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        source_file: "nrel/pvwatts_city_estimates.json",
      },
    });
  }

  // Estimates
  const estimates = data.estimates || [];
  for (const est of estimates) {
    try {
      const docId = `${(est.state || "XX").toUpperCase()}_${slugify(est.city || "unknown")}`;
      docs.push({
        id: docId,
        data: {
          ...est,
          imported_at: admin.firestore.FieldValue.serverTimestamp(),
          source_file: "nrel/pvwatts_city_estimates.json",
        },
      });
    } catch (err) {
      console.error(
        `  [ERROR] Skipping estimate "${est.city}": ${err.message}`,
      );
      errors++;
    }
  }

  // Rankings
  if (data.ranking) {
    docs.push({
      id: "rankings",
      data: {
        ...data.ranking,
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        source_file: "nrel/pvwatts_city_estimates.json",
      },
    });
  }

  const written = await batchWrite(db, collectionName, docs);
  return { collection: collectionName, docs: written, errors };
}

/**
 * nrel_state_profiles
 * Source: data/nrel/all_states_solar.json
 */
async function importStateProfiles(db) {
  const collectionName = "nrel_state_profiles";
  const docs = [];
  let errors = 0;

  const filePath = path.join(DATA_DIR, "nrel", "all_states_solar.json");
  const data = readJson(filePath);
  if (!data) return { collection: collectionName, docs: 0, errors: 0 };

  console.log(
    `  Importing ${collectionName} from nrel/all_states_solar.json...`,
  );

  // Metadata doc
  if (data.metadata) {
    docs.push({
      id: "metadata",
      data: {
        ...data.metadata,
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        source_file: "nrel/all_states_solar.json",
      },
    });
  }

  // State profiles
  const states = data.states || {};
  for (const [stateCode, stateData] of Object.entries(states)) {
    if (typeof stateData !== "object" || stateData === null) continue;
    try {
      const docId = stateCode.toUpperCase();
      docs.push({
        id: docId,
        data: {
          ...stateData,
          state_code: stateCode.toUpperCase(),
          imported_at: admin.firestore.FieldValue.serverTimestamp(),
          source_file: "nrel/all_states_solar.json",
        },
      });
    } catch (err) {
      console.error(`  [ERROR] Skipping state "${stateCode}": ${err.message}`);
      errors++;
    }
  }

  // Rankings
  if (data.rankings) {
    docs.push({
      id: "rankings",
      data: {
        ...data.rankings,
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        source_file: "nrel/all_states_solar.json",
      },
    });
  }

  const written = await batchWrite(db, collectionName, docs);
  return { collection: collectionName, docs: written, errors };
}

// ---------------------------------------------------------------------------
// Registry of all importers
// ---------------------------------------------------------------------------
const IMPORTERS = {
  solar_utility_rates: importUtilityRates,
  solar_incentives: importIncentives,
  solar_equipment: importEquipment,
  solar_permits: importPermits,
  solar_tpo_providers: importTpoProviders,
  nrel_solar_resource: importNrelSolarResource,
  nrel_city_profiles: importCitySolarProfiles,
  nrel_pvwatts_estimates: importPvwattsEstimates,
  nrel_state_profiles: importStateProfiles,
  feoc_entities: importFeocEntities,
  energy_communities: importEnergyCommunities,
  tariff_rates: importTariffRates,
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=".repeat(70));
  console.log("  Solar CRM — Import All Data to Firestore");
  console.log("=".repeat(70));
  if (DRY_RUN) {
    console.log("  MODE: DRY RUN (no writes to Firestore)");
  }
  if (ONLY_COLLECTION) {
    console.log(`  FILTER: Only importing collection "${ONLY_COLLECTION}"`);
    if (!IMPORTERS[ONLY_COLLECTION]) {
      console.error(`\n  [ERROR] Unknown collection "${ONLY_COLLECTION}".`);
      console.error(
        `  Available collections: ${Object.keys(IMPORTERS).join(", ")}`,
      );
      process.exit(1);
    }
  }
  console.log("");

  // Initialize Firebase Admin
  if (!DRY_RUN) {
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      console.error(
        `  [FATAL] Service account not found at ${SERVICE_ACCOUNT_PATH}`,
      );
      process.exit(1);
    }
    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  } else {
    // For dry-run, initialize with a mock or minimal config
    if (!admin.apps.length) {
      if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        const serviceAccount = require(SERVICE_ACCOUNT_PATH);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else {
        console.log(
          "  [DRY RUN] No service account found; skipping Firebase init.\n",
        );
      }
    }
  }

  const db = DRY_RUN && !admin.apps.length ? null : admin.firestore();
  const results = [];

  const importerEntries = ONLY_COLLECTION
    ? [[ONLY_COLLECTION, IMPORTERS[ONLY_COLLECTION]]]
    : Object.entries(IMPORTERS);

  for (const [name, importerFn] of importerEntries) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`  Collection: ${name}`);
    console.log(`${"─".repeat(60)}`);

    try {
      const result = await importerFn(db);
      results.push(result);
      const mode = DRY_RUN ? "would import" : "imported";
      console.log(`  => ${result.docs} docs ${mode}, ${result.errors} errors`);
    } catch (err) {
      console.error(`  [FATAL] Failed to import ${name}: ${err.message}`);
      results.push({
        collection: name,
        docs: 0,
        errors: 1,
        fatal: err.message,
      });
    }
  }

  // Summary
  console.log(`\n${"=".repeat(70)}`);
  console.log("  IMPORT SUMMARY");
  console.log(`${"=".repeat(70)}`);

  let totalDocs = 0;
  let totalErrors = 0;
  for (const r of results) {
    const status = r.fatal ? "FAILED" : r.errors > 0 ? "PARTIAL" : "OK";
    const verb = DRY_RUN ? "would write" : "wrote";
    console.log(
      `  ${r.collection.padEnd(25)} ${String(r.docs).padStart(6)} docs ${verb}  [${status}]${r.errors > 0 ? `  (${r.errors} errors)` : ""}`,
    );
    totalDocs += r.docs;
    totalErrors += r.errors;
  }

  console.log(`${"─".repeat(70)}`);
  const totalVerb = DRY_RUN ? "Total docs (dry run)" : "Total docs written";
  console.log(`  ${totalVerb}: ${totalDocs}`);
  console.log(`  Total errors: ${totalErrors}`);
  console.log(`${"=".repeat(70)}\n`);

  if (!DRY_RUN) {
    process.exit(totalErrors > 0 ? 1 : 0);
  }
}

main().catch((err) => {
  console.error(`\n  [FATAL] Unhandled error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
