/**
 * SolRite API Service
 * Sends customer data to SolRite via SubHub API
 *
 * Flow: Power to the People App → SubHub API → Solnova → SolRite
 *
 * Environment Variables Required:
 * - VITE_SUBHUB_API_URL (default: https://api.virtualsaleportal.com)
 * - VITE_SUBHUB_EMAIL
 * - VITE_SUBHUB_PASSWORD
 * - VITE_SUBHUB_ORG_ID (default: 2475)
 * - VITE_SOLNOVA_AUTH_TOKEN (default: X6vGEsj583NdBWOooLLk)
 */

const SUBHUB_API =
  import.meta.env.VITE_SUBHUB_API_URL || "https://api.virtualsaleportal.com";
const ORG_ID = import.meta.env.VITE_SUBHUB_ORG_ID || "2475";
const SOLNOVA_AUTH_TOKEN =
  import.meta.env.VITE_SOLNOVA_AUTH_TOKEN || "X6vGEsj583NdBWOooLLk";

let authToken = null;
let tokenExpiry = null;

/**
 * Authenticate with SubHub API
 */
async function authenticate() {
  // Check if we have a valid token
  if (authToken && tokenExpiry && Date.now() < tokenExpiry) {
    return authToken;
  }

  const email = import.meta.env.VITE_SUBHUB_EMAIL;
  const password = import.meta.env.VITE_SUBHUB_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SubHub credentials not configured. Add VITE_SUBHUB_EMAIL and VITE_SUBHUB_PASSWORD to .env",
    );
  }

  const response = await fetch(`${SUBHUB_API}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "no-auth": "True",
    },
    body: JSON.stringify({
      email,
      password,
      ip_address: "127.0.0.1",
    }),
  });

  if (!response.ok) {
    throw new Error("SubHub authentication failed");
  }

  const data = await response.json();
  authToken = data.token;
  // Token expires in 24 hours (1440 minutes), refresh after 23 hours
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;

  return authToken;
}

/**
 * Create a contact in SubHub
 */
export async function createContact(customerData) {
  const token = await authenticate();

  const response = await fetch(`${SUBHUB_API}/api/${ORG_ID}/contacts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      first_name: customerData.firstName,
      last_name: customerData.lastName,
      email: customerData.email,
      phone: customerData.phone,
      street: customerData.street,
      city: customerData.city,
      state: customerData.state,
      county: customerData.county, // Important for title check!
      postal_code: customerData.postalCode,
      country: "United States",
      job_type: "Solar",
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to create contact");
  }

  return response.json();
}

/**
 * Create a proposal in SubHub
 */
export async function createProposal(contactId, addressData) {
  const token = await authenticate();

  const response = await fetch(`${SUBHUB_API}/api/${ORG_ID}/proposals`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      contact_id: contactId,
      job_type: "Solar",
      street: addressData.street,
      city: addressData.city,
      state: addressData.state,
      county: addressData.county,
      postal_code: addressData.postalCode,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to create proposal");
  }

  return response.json();
}

/**
 * Save utility information for a proposal
 */
export async function saveUtility(proposalId, optionId, utilityData) {
  const token = await authenticate();

  const response = await fetch(
    `${SUBHUB_API}/api/${ORG_ID}/proposals/${proposalId}/solar/options/${optionId}/utility/save-detail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        utility_id: utilityData.lseId || 3010, // Default: CenterPoint Energy
        utility_name:
          utilityData.utilityName || "CenterPoint Energy Houston Electric, LLC",
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to save utility");
  }

  return response.json();
}

/**
 * Create Solnova/SolRite account - THIS IS THE KEY ENDPOINT
 * This sends the customer data to SolRite's system
 */
export async function createSolnovaAccount(proposalId, optionId, utilityData) {
  const token = await authenticate();

  const response = await fetch(
    `${SUBHUB_API}/api/${ORG_ID}/finance/${proposalId}/create-solnova-account`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        proposal_option_id: optionId,
        job_type: "Solar",
        utility_name:
          utilityData.utilityName || "CenterPoint Energy Houston Electric, LLC",
        auth_token: SOLNOVA_AUTH_TOKEN,
        lse_id: utilityData.lseId || 3010,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to create Solnova account");
  }

  return response.json();
}

/**
 * Trigger Podio webhook to sync data with SolRite
 *
 * Available events:
 * - "New" - Initial creation
 * - "Title Check" - After title verification
 * - "Credit Run" - After credit pre-qualification
 * - "Contract Sent"
 * - "Sales Rep Signed"
 * - "Homeowner Signed"
 * - "Documents Signed"
 * - "Welcome Call"
 * - "Contract Cancelled"
 */
export async function sendPodioEvent(proposalId, event = "New") {
  const token = await authenticate();

  const response = await fetch(
    `${SUBHUB_API}/api/${ORG_ID}/send-podio-event/${proposalId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ event }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to send Podio event");
  }

  return response.json();
}

/**
 * Property search / Title verification
 */
export async function propertySearch(proposalId, address, zip) {
  const token = await authenticate();

  const response = await fetch(
    `${SUBHUB_API}/api/${ORG_ID}/property-search/${proposalId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        addr: address,
        zip: zip,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to search property");
  }

  return response.json();
}

/**
 * Get available Solnova finance products
 */
export async function getFinanceProducts(proposalId) {
  const token = await authenticate();

  const response = await fetch(
    `${SUBHUB_API}/api/${ORG_ID}/finance/${proposalId}/products?partner=Solnova`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to get finance products");
  }

  return response.json();
}

/**
 * COMPLETE FLOW: Send customer to SolRite
 * This is the main function that handles the entire flow
 */
export async function sendCustomerToSolRite(customerData, systemDesign = null) {
  console.log("📤 Starting SolRite submission flow...");

  // Step 1: Create contact
  console.log("Step 1: Creating contact...");
  const contact = await createContact(customerData);
  const contactId = contact.id;
  console.log("✅ Contact created:", contactId);

  // Step 2: Create proposal
  console.log("Step 2: Creating proposal...");
  const proposal = await createProposal(contactId, customerData);
  const proposalId = proposal.id;
  console.log("✅ Proposal created:", proposalId);

  // Step 3: Get the proposal option ID (created automatically)
  // We need to fetch the proposal to get the option ID
  const token = await authenticate();
  const proposalResponse = await fetch(
    `${SUBHUB_API}/api/${ORG_ID}/proposals/${proposalId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );
  const proposalData = await proposalResponse.json();
  const optionId = proposalData.data?.options?.[0]?.id;

  if (!optionId) {
    console.warn("⚠️ No option ID found, skipping Solnova account creation");
  } else {
    // Step 4: Save utility
    console.log("Step 3: Saving utility information...");
    await saveUtility(proposalId, optionId, {
      lseId: customerData.utilityId || 3010,
      utilityName:
        customerData.utilityName || "CenterPoint Energy Houston Electric, LLC",
    });
    console.log("✅ Utility saved");

    // Step 5: Create Solnova account (sends to SolRite)
    console.log("Step 4: Creating Solnova account (sending to SolRite)...");
    const solnovaAccount = await createSolnovaAccount(proposalId, optionId, {
      lseId: customerData.utilityId || 3010,
      utilityName:
        customerData.utilityName || "CenterPoint Energy Houston Electric, LLC",
    });
    console.log("✅ Solnova account created:", solnovaAccount);
  }

  // Step 6: Trigger Podio webhook
  console.log("Step 5: Triggering Podio sync to SolRite...");
  const podioResult = await sendPodioEvent(proposalId, "New");
  console.log("✅ Podio event sent:", podioResult);

  console.log("🎉 Customer successfully sent to SolRite!");

  return {
    contactId,
    proposalId,
    optionId,
    status: "success",
    message: "Customer sent to SolRite successfully",
  };
}

// Export utility list for Texas
export const TEXAS_UTILITIES = [
  { id: 3010, name: "CenterPoint Energy Houston Electric, LLC" },
  { id: 3011, name: "Oncor Electric Delivery Company" },
  { id: 3012, name: "AEP Texas Central Company" },
  { id: 3013, name: "AEP Texas North Company" },
  { id: 3014, name: "Texas-New Mexico Power Company" },
];

export default {
  createContact,
  createProposal,
  saveUtility,
  createSolnovaAccount,
  sendPodioEvent,
  propertySearch,
  getFinanceProducts,
  sendCustomerToSolRite,
  TEXAS_UTILITIES,
};
