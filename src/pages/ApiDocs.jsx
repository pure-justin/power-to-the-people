import { useState } from "react";
import {
  Code,
  BookOpen,
  Zap,
  Database,
  Server,
  Key,
  Copy,
  Check,
  Search,
  ChevronRight,
  ExternalLink,
  Play,
  AlertCircle,
} from "lucide-react";
import ApiPlayground from "../components/ApiPlayground";
import "../styles/ApiDocs.css";

const ApiDocs = () => {
  const [activeSection, setActiveSection] = useState("introduction");
  const [copiedCode, setCopiedCode] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [testEndpoint, setTestEndpoint] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const copyToClipboard = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sections = {
    introduction: {
      title: "Introduction",
      icon: BookOpen,
      content: (
        <div className="doc-section">
          <h1>Power to the People API Documentation</h1>
          <p className="lead">
            Welcome to the Power to the People API. Our platform provides
            comprehensive solar + battery system design, cost estimation, and
            project management capabilities powered by Google Solar API,
            Firebase, and advanced 3D visualization.
          </p>

          <div className="info-cards">
            <div className="info-card">
              <div className="info-card-icon">
                <Zap />
              </div>
              <h3>Solar System Design</h3>
              <p>
                Calculate optimal panel configurations with 410W panels and
                60kWh Duracell battery systems
              </p>
            </div>

            <div className="info-card">
              <div className="info-card-icon">
                <Database />
              </div>
              <h3>Building Insights</h3>
              <p>
                Access roof geometry, sun exposure, and production estimates
                from Google Solar API
              </p>
            </div>

            <div className="info-card">
              <div className="info-card-icon">
                <Server />
              </div>
              <h3>Project Management</h3>
              <p>
                Track installations, manage leads, and coordinate referrals via
                Firebase Firestore
              </p>
            </div>
          </div>

          <div className="quick-start">
            <h2>Quick Start</h2>
            <ol>
              <li>Get your API keys from the environment variables</li>
              <li>Initialize Firebase with your project credentials</li>
              <li>Import the service modules you need</li>
              <li>Start making API calls</li>
            </ol>
          </div>
        </div>
      ),
    },

    authentication: {
      title: "Authentication",
      icon: Key,
      content: (
        <div className="doc-section">
          <h1>Authentication</h1>

          <h2>Environment Variables</h2>
          <p>
            Configure these environment variables in your <code>.env</code>{" "}
            file:
          </p>

          <CodeBlock
            language="bash"
            code={`# Google APIs
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key

# Cesium 3D Tiles
VITE_CESIUM_ION_TOKEN=your_cesium_token

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id`}
            onCopy={(code) => copyToClipboard(code, "env-vars")}
            copied={copiedCode === "env-vars"}
          />

          <h2>Firebase Initialization</h2>
          <CodeBlock
            language="javascript"
            code={`import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);`}
            onCopy={(code) => copyToClipboard(code, "firebase-init")}
            copied={copiedCode === "firebase-init"}
          />
        </div>
      ),
    },

    solarApi: {
      title: "Solar API",
      icon: Zap,
      content: (
        <div className="doc-section">
          <h1>Solar API Reference</h1>
          <p className="lead">
            Design complete solar + battery systems using Google Solar API data
            with 410W premium panels and 60kWh Duracell PowerCenter Hybrid
            batteries.
          </p>

          <ApiEndpoint
            method="GET"
            endpoint="getBuildingInsights(latitude, longitude)"
            description="Fetch building insights from Google Solar API including roof geometry, sun exposure, and panel capacity"
            parameters={[
              {
                name: "latitude",
                type: "number",
                required: true,
                description: "Property latitude coordinate",
              },
              {
                name: "longitude",
                type: "number",
                required: true,
                description: "Property longitude coordinate",
              },
            ]}
            returns="Promise<object> - Building insights data from Google Solar API"
            example={`import { getBuildingInsights } from './services/solarApi';

// Get building insights for a property
const insights = await getBuildingInsights(30.2672, -97.7431);

console.log(insights.solarPotential);
// {
//   maxArrayPanelsCount: 45,
//   maxSunshineHoursPerYear: 1850,
//   roofSegmentStats: [...],
//   solarPanels: [...]
// }`}
            onCopy={(code) => copyToClipboard(code, "building-insights")}
            copied={copiedCode === "building-insights"}
          />

          <ApiEndpoint
            method="POST"
            endpoint="calculateSystemDesign(buildingInsights, annualUsageKwh, targetOffset)"
            description="Calculate optimal solar + battery system design based on building insights and usage"
            parameters={[
              {
                name: "buildingInsights",
                type: "object",
                required: true,
                description: "Building insights from getBuildingInsights()",
              },
              {
                name: "annualUsageKwh",
                type: "number",
                required: true,
                description: "Annual electricity usage in kWh",
              },
              {
                name: "targetOffset",
                type: "number",
                required: false,
                description: "Target offset percentage (default: 1.05 = 105%)",
              },
            ]}
            returns="object - Complete system design with panels, battery, production estimates"
            example={`import { calculateSystemDesign } from './services/solarApi';

const systemDesign = calculateSystemDesign(
  buildingInsights,
  12000, // 12,000 kWh annual usage
  1.05   // 105% offset
);

console.log(systemDesign);
// {
//   panels: {
//     count: 28,
//     wattage: 410,
//     totalWatts: 11480,
//     systemSizeKw: 11.48
//   },
//   batteries: {
//     brand: "Duracell PowerCenter Hybrid",
//     totalCapacityKwh: 60,
//     peakPowerKw: 15.0
//   },
//   production: {
//     annualKwh: 14250,
//     monthlyKwh: 1188,
//     dailyKwh: 39.0
//   },
//   ...
// }`}
            onCopy={(code) => copyToClipboard(code, "system-design")}
            copied={copiedCode === "system-design"}
          />

          <ApiEndpoint
            method="GET"
            endpoint="designSolarSystem(latitude, longitude, annualUsageKwh, targetOffset)"
            description="Complete end-to-end solar system design (combines getBuildingInsights + calculateSystemDesign)"
            parameters={[
              {
                name: "latitude",
                type: "number",
                required: true,
                description: "Property latitude",
              },
              {
                name: "longitude",
                type: "number",
                required: true,
                description: "Property longitude",
              },
              {
                name: "annualUsageKwh",
                type: "number",
                required: false,
                description: "Annual usage (default: 12000)",
              },
              {
                name: "targetOffset",
                type: "number",
                required: false,
                description: "Target offset (default: 1.0 = 100%)",
              },
            ]}
            returns="Promise<object> - Complete system design"
            example={`import { designSolarSystem } from './services/solarApi';

// One-call system design
const system = await designSolarSystem(
  30.2672,  // latitude
  -97.7431, // longitude
  14400,    // 14,400 kWh annual usage
  1.0       // 100% offset
);

console.log(\`System Size: \${system.panels.systemSizeKw} kW\`);
console.log(\`Annual Production: \${system.production.annualKwh} kWh\`);`}
            onCopy={(code) => copyToClipboard(code, "design-system")}
            copied={copiedCode === "design-system"}
          />

          <ApiEndpoint
            method="GET"
            endpoint="getDataLayers(latitude, longitude, radiusMeters, pixelSizeMeters)"
            description="Get GeoTIFF imagery and solar flux data from Google Solar API"
            parameters={[
              {
                name: "latitude",
                type: "number",
                required: true,
                description: "Center latitude",
              },
              {
                name: "longitude",
                type: "number",
                required: true,
                description: "Center longitude",
              },
              {
                name: "radiusMeters",
                type: "number",
                required: false,
                description: "Radius around point (default: 50)",
              },
              {
                name: "pixelSizeMeters",
                type: "number",
                required: false,
                description: "Pixel resolution (default: 0.1)",
              },
            ]}
            returns="Promise<object> - URLs for RGB imagery, flux data, and DSM"
            example={`import { getDataLayers, fetchRgbImagery, fetchFluxData } from './services/solarApi';

// Get imagery URLs
const dataLayers = await getDataLayers(30.2672, -97.7431);

// Fetch and decode satellite imagery
const rgbImagery = await fetchRgbImagery(dataLayers.rgbUrl);

// Fetch solar flux data (kWh/kW/year per pixel)
const fluxData = await fetchFluxData(dataLayers.annualFluxUrl);

console.log(\`Image size: \${rgbImagery.width}x\${rgbImagery.height}\`);`}
            onCopy={(code) => copyToClipboard(code, "data-layers")}
            copied={copiedCode === "data-layers"}
          />

          <ApiEndpoint
            method="POST"
            endpoint="calculatePanelProduction(panels, fluxData, panelDimensions, panelWattage, latLngToUtm)"
            description="Calculate per-panel production using solar flux data and UTM coordinate conversion"
            parameters={[
              {
                name: "panels",
                type: "Array",
                required: true,
                description: "Array of panel objects with center coordinates",
              },
              {
                name: "fluxData",
                type: "object",
                required: true,
                description: "Flux data from fetchFluxData()",
              },
              {
                name: "panelDimensions",
                type: "object",
                required: true,
                description: "Panel dimensions in meters",
              },
              {
                name: "panelWattage",
                type: "number",
                required: true,
                description: "Panel wattage (e.g., 410)",
              },
              {
                name: "latLngToUtm",
                type: "Function",
                required: true,
                description: "UTM conversion function",
              },
            ]}
            returns="Array - Panels with production estimates, sorted by production (highest first)"
            example={`import { calculatePanelProduction } from './services/solarApi';
import proj4 from 'proj4';

// Define UTM conversion
const utmZone = 14; // Texas
const utmProj = \`+proj=utm +zone=\${utmZone} +datum=WGS84\`;
const latLngToUtm = (lng, lat) => proj4('EPSG:4326', utmProj, [lng, lat]);

// Calculate per-panel production
const panelsWithProduction = calculatePanelProduction(
  solarPanels,
  fluxData,
  { heightMeters: 2.278, widthMeters: 1.134 },
  410,
  latLngToUtm
);

// Panels are sorted by production (highest first)
console.log(panelsWithProduction[0]);
// {
//   center: { latitude: 30.2672, longitude: -97.7431 },
//   annualProductionKwh: 620,
//   fluxValue: 1680,
//   ...
// }`}
            onCopy={(code) => copyToClipboard(code, "panel-production")}
            copied={copiedCode === "panel-production"}
          />
        </div>
      ),
    },

    firebaseApi: {
      title: "Firebase API",
      icon: Database,
      content: (
        <div className="doc-section">
          <h1>Firebase API Reference</h1>
          <p className="lead">
            Manage projects, leads, referrals, and user data with Firebase
            Firestore.
          </p>

          <h2>Collections Structure</h2>
          <div className="collections-grid">
            <CollectionCard
              name="leads"
              description="Solar installation leads and applications"
              fields={[
                "name",
                "email",
                "phone",
                "address",
                "annualUsage",
                "systemDesign",
                "status",
                "createdAt",
              ]}
            />
            <CollectionCard
              name="projects"
              description="Active solar installation projects"
              fields={[
                "leadId",
                "status",
                "installDate",
                "systemSize",
                "timeline",
                "notes",
              ]}
            />
            <CollectionCard
              name="referrals"
              description="Referral tracking and rewards"
              fields={[
                "referrerId",
                "refereeId",
                "status",
                "reward",
                "createdAt",
                "completedAt",
              ]}
            />
            <CollectionCard
              name="commercialLeads"
              description="Commercial solar leads (AI-generated)"
              fields={[
                "businessName",
                "industry",
                "estimatedUsage",
                "contact",
                "source",
                "confidence",
              ]}
            />
          </div>

          <h2>Lead Management</h2>
          <ApiEndpoint
            method="POST"
            endpoint="createLead(leadData)"
            description="Create a new solar installation lead"
            parameters={[
              {
                name: "leadData",
                type: "object",
                required: true,
                description:
                  "Lead information including contact, address, and system design",
              },
            ]}
            returns="Promise<string> - Lead document ID"
            example={`import { collection, addDoc } from 'firebase/firestore';
import { db } from './services/firebase';

const createLead = async (leadData) => {
  const docRef = await addDoc(collection(db, 'leads'), {
    ...leadData,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return docRef.id;
};

// Create a lead
const leadId = await createLead({
  name: 'John Smith',
  email: 'john@example.com',
  phone: '512-555-0100',
  address: '123 Solar St, Austin, TX 78701',
  annualUsage: 12000,
  systemDesign: {
    panels: { count: 28, systemSizeKw: 11.48 },
    production: { annualKwh: 14250 }
  }
});`}
            onCopy={(code) => copyToClipboard(code, "create-lead")}
            copied={copiedCode === "create-lead"}
          />

          <ApiEndpoint
            method="GET"
            endpoint="getLeadById(leadId)"
            description="Retrieve a specific lead by ID"
            parameters={[
              {
                name: "leadId",
                type: "string",
                required: true,
                description: "Lead document ID",
              },
            ]}
            returns="Promise<object> - Lead data"
            example={`import { doc, getDoc } from 'firebase/firestore';
import { db } from './services/firebase';

const getLeadById = async (leadId) => {
  const docRef = doc(db, 'leads', leadId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  throw new Error('Lead not found');
};

const lead = await getLeadById('lead_123');`}
            onCopy={(code) => copyToClipboard(code, "get-lead")}
            copied={copiedCode === "get-lead"}
          />

          <h2>Referral System</h2>
          <ApiEndpoint
            method="POST"
            endpoint="createReferral(referrerId, refereeData)"
            description="Create a referral link and track referral attribution"
            parameters={[
              {
                name: "referrerId",
                type: "string",
                required: true,
                description: "ID of user making the referral",
              },
              {
                name: "refereeData",
                type: "object",
                required: true,
                description: "Referee information",
              },
            ]}
            returns="Promise<object> - Referral tracking data"
            example={`import { referralService } from './services/referralService';

// Create a referral
const referral = await referralService.createReferral(
  'user_abc', // referrer user ID
  {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '512-555-0200'
  }
);

console.log(\`Referral link: \${referral.referralLink}\`);
console.log(\`Tracking code: \${referral.trackingCode}\`);`}
            onCopy={(code) => copyToClipboard(code, "create-referral")}
            copied={copiedCode === "create-referral"}
          />
        </div>
      ),
    },

    visualization: {
      title: "3D Visualization",
      icon: Server,
      content: (
        <div className="doc-section">
          <h1>3D Visualization API</h1>
          <p className="lead">
            Render interactive 3D building models with solar panel overlays
            using Cesium and Google Photorealistic 3D Tiles.
          </p>

          <h2>Cesium Integration</h2>
          <CodeBlock
            language="javascript"
            code={`import { Viewer, Entity, Cesium3DTileset } from 'resium';
import { Cartesian3, Color } from 'cesium';

// Initialize Cesium viewer with Google 3D Tiles
const RoofVisualizer3D = ({ latitude, longitude, solarPanels }) => {
  return (
    <Viewer>
      {/* Google Photorealistic 3D Tiles */}
      <Cesium3DTileset
        url="https://tile.googleapis.com/v1/3dtiles/root.json"
      />

      {/* Render solar panels as entities */}
      {solarPanels.map((panel, idx) => (
        <Entity
          key={idx}
          position={Cartesian3.fromDegrees(
            panel.center.longitude,
            panel.center.latitude,
            panel.heightMeters || 0
          )}
          box={{
            dimensions: new Cartesian3(1.134, 2.278, 0.05),
            material: Color.BLUE.withAlpha(0.8)
          }}
        />
      ))}
    </Viewer>
  );
};`}
            onCopy={(code) => copyToClipboard(code, "cesium-integration")}
            copied={copiedCode === "cesium-integration"}
          />

          <h2>2D Roof Visualization</h2>
          <CodeBlock
            language="javascript"
            code={`import { useEffect, useRef } from 'react';
import { fetchRgbImagery, calculatePanelProduction } from './services/solarApi';

const RoofVisualizer = ({ dataLayers, solarPanels }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const renderRoof = async () => {
      // Fetch satellite imagery
      const imagery = await fetchRgbImagery(dataLayers.rgbUrl);

      // Draw on canvas
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Draw satellite image
      ctx.putImageData(imagery.imageData, 0, 0);

      // Overlay solar panels (color-coded by production)
      solarPanels.forEach(panel => {
        const color = getProductionColor(panel.annualProductionKwh);
        ctx.fillStyle = color;
        ctx.fillRect(panel.pixelX, panel.pixelY, 10, 20);
      });
    };

    renderRoof();
  }, [dataLayers, solarPanels]);

  return <canvas ref={canvasRef} />;
};

// Color panels by production
const getProductionColor = (productionKwh) => {
  if (productionKwh > 600) return 'rgba(34, 197, 94, 0.7)'; // Green
  if (productionKwh > 500) return 'rgba(234, 179, 8, 0.7)'; // Yellow
  return 'rgba(239, 68, 68, 0.7)'; // Red
};`}
            onCopy={(code) => copyToClipboard(code, "2d-visualization")}
            copied={copiedCode === "2d-visualization"}
          />
        </div>
      ),
    },

    playground: {
      title: "API Playground",
      icon: Play,
      content: (
        <div className="doc-section">
          <h1>API Playground</h1>
          <p className="lead">
            Test API endpoints with live data. Enter coordinates and parameters
            to see real responses from the Google Solar API and Firebase
            services.
          </p>

          <ApiPlayground />

          <div className="playground-tips">
            <h3>Tips for Testing</h3>
            <ul>
              <li>
                <strong>Austin, TX:</strong> Latitude 30.2672, Longitude
                -97.7431
              </li>
              <li>
                <strong>Los Angeles, CA:</strong> Latitude 34.0522, Longitude
                -118.2437
              </li>
              <li>
                <strong>Miami, FL:</strong> Latitude 25.7617, Longitude -80.1918
              </li>
              <li>
                <strong>Annual Usage:</strong> Average US home uses
                10,000-15,000 kWh/year
              </li>
              <li>
                <strong>Target Offset:</strong> Use 1.0 for 100% offset, 1.05
                for 105%, etc.
              </li>
            </ul>
          </div>
        </div>
      ),
    },

    utilityBillApi: {
      title: "Utility Bill Scanner",
      icon: AlertCircle,
      content: (
        <div className="doc-section">
          <h1>Utility Bill Scanner API</h1>
          <p className="lead">
            Extract detailed usage and billing information from utility bill
            images using Gemini 1.5 Pro vision AI. Supports electric, gas, and
            combined utility bills with 12-month usage history extraction.
          </p>

          <ApiEndpoint
            method="POST"
            endpoint="/api/scan-bill"
            description="Upload and analyze utility bill images to extract consumption data, account details, and usage history"
            parameters={[
              {
                name: "imageBase64",
                type: "string",
                required: true,
                description: "Base64-encoded image data of the utility bill",
              },
              {
                name: "mediaType",
                type: "string",
                required: false,
                description:
                  "MIME type of the image (default: image/jpeg). Supports image/jpeg, image/png, application/pdf",
              },
            ]}
            returns="Promise<object> - Extracted bill data with usage history and consumption data"
            example={`import axios from 'axios';

// Scan a utility bill image
const scanUtilityBill = async (imageFile) => {
  // Convert file to base64
  const reader = new FileReader();
  const base64Promise = new Promise((resolve) => {
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
  });
  reader.readAsDataURL(imageFile);
  const imageBase64 = await base64Promise;

  // Call the scan-bill API
  const response = await axios.post(
    'https://your-vercel-app.vercel.app/api/scan-bill',
    {
      data: {
        imageBase64,
        mediaType: imageFile.type
      }
    }
  );

  return response.data;
};

// Usage
const result = await scanUtilityBill(billImageFile);

if (result.success) {
  console.log('Account Number:', result.billData.accountNumber);
  console.log('Annual Usage:', result.consumptionData.annualConsumption, 'kWh');
  console.log('12-Month History:', result.consumptionData.monthlyConsumption);
  console.log('ESIID (Texas):', result.billData.esiid);
  console.log('Utility Company:', result.billData.utilityCompany);
} else {
  console.error('Error:', result.error);
}`}
            onCopy={(code) => copyToClipboard(code, "scan-bill")}
            copied={copiedCode === "scan-bill"}
          />

          <div className="endpoint-section">
            <h3>Response Structure</h3>
            <CodeBlock
              language="javascript"
              code={`{
  "success": true,
  "billData": {
    "isValidBill": true,
    "accountNumber": "123456789",
    "customerName": "John Smith",
    "serviceAddress": "123 Solar St, Austin, TX 78701",
    "utilityCompany": "Austin Energy",
    "utilityType": "electric",
    "esiid": "10123456789012345678", // Texas only
    "meterNumber": "987654321",
    "ratePlanName": "Residential Service",
    "billingPeriodStart": "2024-12-01",
    "billingPeriodEnd": "2024-12-31",
    "currentUsageKwh": 1200,
    "usageHistory": [
      { "month": "January", "year": 2024, "kWh": 1500 },
      { "month": "February", "year": 2024, "kWh": 1350 },
      // ... 12 months total
    ],
    "totalAmountDue": 145.67,
    "ratePerKwh": 0.12,
    "confidence": 0.95
  },
  "consumptionData": {
    "annualConsumption": 14400,
    "monthsWithData": 12,
    "dataQuality": "excellent",
    "monthlyConsumption": [
      { "month": "January", "kWh": 1500, "estimated": false },
      // ... 12 months
    ]
  }
}`}
              onCopy={(code) => copyToClipboard(code, "bill-response")}
              copied={copiedCode === "bill-response"}
            />
          </div>

          <div className="endpoint-section">
            <h3>Error Handling</h3>
            <CodeBlock
              language="javascript"
              code={`// Handle validation errors
if (!result.success) {
  switch (result.errorType) {
    case 'not_a_bill':
      console.error('Not a utility bill. Please upload your electric or gas bill.');
      break;
    case 'poor_quality':
      console.error('Image quality too poor. Take a clearer photo.');
      break;
    default:
      console.error('Error scanning bill:', result.error);
  }
}`}
              onCopy={(code) => copyToClipboard(code, "bill-errors")}
              copied={copiedCode === "bill-errors"}
            />
          </div>
        </div>
      ),
    },

    addressApi: {
      title: "Address & Location",
      icon: Search,
      content: (
        <div className="doc-section">
          <h1>Address & Location API</h1>
          <p className="lead">
            Geocoding, reverse geocoding, and Google Places integration for
            address validation and location services.
          </p>

          <ApiEndpoint
            method="GET"
            endpoint="getCurrentLocation()"
            description="Get user's current location via browser geolocation API and reverse geocode to full address"
            parameters={[]}
            returns="Promise<object> - Parsed address with coordinates"
            example={`import { getCurrentLocation } from './services/addressService';

// Get current location and address
try {
  const location = await getCurrentLocation();

  console.log('Address:', location.formattedAddress);
  console.log('Coordinates:', location.lat, location.lng);
  console.log('City:', location.city);
  console.log('State:', location.state);
  console.log('ZIP:', location.zipCode);
  console.log('County:', location.county);
} catch (error) {
  // Handle permission denied, timeout, or unavailable
  console.error(error.message);
}`}
            onCopy={(code) => copyToClipboard(code, "get-location")}
            copied={copiedCode === "get-location"}
          />

          <ApiEndpoint
            method="POST"
            endpoint="parseGoogleAddress(place)"
            description="Parse Google Places autocomplete result into structured address components"
            parameters={[
              {
                name: "place",
                type: "object",
                required: true,
                description: "Google Places API place object",
              },
            ]}
            returns="object - Parsed address components"
            example={`import { parseGoogleAddress } from './services/addressService';

// After Google Places autocomplete selection
const onPlaceSelected = (place) => {
  const parsed = parseGoogleAddress(place);

  console.log('Parsed Address:', {
    streetAddress: parsed.streetAddress, // "123 Solar St"
    city: parsed.city,                   // "Austin"
    county: parsed.county,               // "Travis"
    state: parsed.state,                 // "TX"
    zipCode: parsed.zipCode,             // "78701"
    lat: parsed.lat,                     // 30.2672
    lng: parsed.lng                      // -97.7431
  });

  // Use for solar system design
  designSolarSystem(parsed.lat, parsed.lng, annualUsage);
};`}
            onCopy={(code) => copyToClipboard(code, "parse-address")}
            copied={copiedCode === "parse-address"}
          />

          <h2>Energy Community Lookup</h2>
          <p>
            Check if a property qualifies for IRS Energy Community tax credits
            based on IRS Notice 2025-31.
          </p>

          <ApiEndpoint
            method="GET"
            endpoint="checkEnergyCommunity(county, state)"
            description="Determine if a county qualifies as an IRS Energy Community for enhanced solar tax credits"
            parameters={[
              {
                name: "county",
                type: "string",
                required: true,
                description: 'County name (e.g., "Harris" or "Harris County")',
              },
              {
                name: "state",
                type: "string",
                required: false,
                description: 'State code (default: "TX")',
              },
            ]}
            returns="object - Energy community status and MSA information"
            example={`import { checkEnergyCommunity } from './services/energyCommunity';

// Check if Harris County, TX qualifies
const result = checkEnergyCommunity('Harris', 'TX');

console.log(result);
// {
//   isEnergyCommunity: true,
//   msa: "Houston-The Woodlands-Sugar Land",
//   county: "Harris",
//   reason: "Part of Houston-The Woodlands-Sugar Land MSA - qualifies under IRS Notice 2025-31"
// }

// Use for enhanced tax credit calculation
if (result.isEnergyCommunity) {
  const taxCredit = systemCost * 0.40; // 40% ITC instead of 30%
  console.log(\`Enhanced tax credit: $\${taxCredit.toLocaleString()}\`);
}`}
            onCopy={(code) => copyToClipboard(code, "energy-community")}
            copied={copiedCode === "energy-community"}
          />

          <div className="endpoint-section">
            <h3>Supported Energy Communities (National)</h3>
            <p>
              147+ counties across 24 states qualify under the Statistical Area
              category, plus 46 states have Coal Closure communities. Covers TX,
              PA, WV, KY, WY, LA, OK, CO, and more. See IRS Notice 2025-31 and
              energycommunities.gov for full list.
            </p>
          </div>
        </div>
      ),
    },

    examples: {
      title: "Code Examples",
      icon: Code,
      content: (
        <div className="doc-section">
          <h1>Complete Code Examples</h1>

          <h2>Full Solar System Design Workflow</h2>
          <CodeBlock
            language="javascript"
            code={`import {
  designSolarSystem,
  getDataLayers,
  fetchRgbImagery,
  fetchFluxData,
  calculatePanelProduction,
  calculateMonthlyProduction
} from './services/solarApi';
import proj4 from 'proj4';

// Complete workflow
const designSystemForProperty = async (address, annualUsage) => {
  // 1. Geocode address (using addressService)
  const { latitude, longitude } = await geocodeAddress(address);

  // 2. Design solar system
  const system = await designSolarSystem(latitude, longitude, annualUsage, 1.0);

  console.log('System Design:');
  console.log(\`  Panels: \${system.panels.count} x \${system.panels.wattage}W\`);
  console.log(\`  System Size: \${system.panels.systemSizeKw} kW\`);
  console.log(\`  Annual Production: \${system.production.annualKwh} kWh\`);
  console.log(\`  Battery: \${system.batteries.totalCapacityKwh} kWh\`);

  // 3. Get detailed imagery for visualization
  const dataLayers = await getDataLayers(latitude, longitude);
  const imagery = await fetchRgbImagery(dataLayers.rgbUrl);
  const fluxData = await fetchFluxData(dataLayers.annualFluxUrl);

  // 4. Calculate per-panel production
  const utmZone = 14; // Adjust for location
  const utmProj = \`+proj=utm +zone=\${utmZone} +datum=WGS84\`;
  const latLngToUtm = (lng, lat) => proj4('EPSG:4326', utmProj, [lng, lat]);

  const panelsWithProduction = calculatePanelProduction(
    system.solarPanels,
    fluxData,
    system.panelDimensions,
    system.panels.wattage,
    latLngToUtm
  );

  // 5. Get monthly breakdown
  const monthlyProduction = calculateMonthlyProduction(
    system.production.annualKwh,
    latitude
  );

  return {
    system,
    imagery,
    panelsWithProduction,
    monthlyProduction
  };
};

// Usage
const result = await designSystemForProperty(
  '123 Solar St, Austin, TX 78701',
  14400 // 14,400 kWh annual usage
);`}
            onCopy={(code) => copyToClipboard(code, "full-workflow")}
            copied={copiedCode === "full-workflow"}
          />

          <h2>Lead Creation with System Design</h2>
          <CodeBlock
            language="javascript"
            code={`import { collection, addDoc } from 'firebase/firestore';
import { db } from './services/firebase';
import { designSolarSystem } from './services/solarApi';

const createLeadWithSystemDesign = async (leadData) => {
  try {
    // Design system for this property
    const system = await designSolarSystem(
      leadData.latitude,
      leadData.longitude,
      leadData.annualUsage || 12000
    );

    // Calculate estimated savings
    const monthlyBill = leadData.monthlyBill || 150;
    const monthlySavings = Math.round(
      (system.production.monthlyKwh * 0.12) // $0.12/kWh avg
    );
    const savingsPercent = Math.round(
      (monthlySavings / monthlyBill) * 100
    );

    // Create lead with system design
    const docRef = await addDoc(collection(db, 'leads'), {
      // Contact info
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone,
      address: leadData.address,

      // Usage and financials
      annualUsage: leadData.annualUsage || 12000,
      monthlyBill: monthlyBill,

      // System design
      systemDesign: {
        panels: system.panels,
        batteries: system.batteries,
        production: system.production,
        roof: system.roof,
        environmental: system.environmental
      },

      // Savings projection
      savings: {
        monthly: monthlySavings,
        annual: monthlySavings * 12,
        lifetime25Year: monthlySavings * 12 * 25,
        savingsPercent: savingsPercent
      },

      // Metadata
      status: 'pending',
      source: leadData.source || 'website',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(\`Lead created with ID: \${docRef.id}\`);
    return { id: docRef.id, system };

  } catch (error) {
    console.error('Failed to create lead:', error);
    throw error;
  }
};

// Usage
const lead = await createLeadWithSystemDesign({
  name: 'John Smith',
  email: 'john@example.com',
  phone: '512-555-0100',
  address: '123 Solar St, Austin, TX 78701',
  latitude: 30.2672,
  longitude: -97.7431,
  annualUsage: 14400,
  monthlyBill: 180,
  source: 'referral'
});`}
            onCopy={(code) => copyToClipboard(code, "lead-with-system")}
            copied={copiedCode === "lead-with-system"}
          />

          <h2>Real-time Project Status Updates</h2>
          <CodeBlock
            language="javascript"
            code={`import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from './services/firebase';

// Subscribe to real-time project updates
const subscribeToProject = (projectId, callback) => {
  const projectRef = doc(db, 'projects', projectId);

  return onSnapshot(projectRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    }
  });
};

// Update project status
const updateProjectStatus = async (projectId, status, notes) => {
  const projectRef = doc(db, 'projects', projectId);

  await updateDoc(projectRef, {
    status: status,
    notes: notes,
    updatedAt: new Date(),
    timeline: {
      ...timeline,
      [status]: new Date()
    }
  });
};

// Usage in React component
useEffect(() => {
  const unsubscribe = subscribeToProject('project_123', (project) => {
    console.log('Project updated:', project);
    setProjectData(project);
  });

  return () => unsubscribe();
}, []);`}
            onCopy={(code) => copyToClipboard(code, "project-updates")}
            copied={copiedCode === "project-updates"}
          />
        </div>
      ),
    },

    rateLimiting: {
      title: "Rate Limits & Best Practices",
      icon: AlertCircle,
      content: (
        <div className="doc-section">
          <h1>Rate Limiting & Best Practices</h1>

          <h2>API Rate Limits</h2>
          <div className="info-cards">
            <div className="info-card">
              <div className="info-card-icon">
                <Zap />
              </div>
              <h3>Google Solar API</h3>
              <p>
                <strong>Rate:</strong> 1,000 requests/day (free tier)
                <br />
                <strong>Quota:</strong> Check Google Cloud Console for current
                usage
              </p>
            </div>

            <div className="info-card">
              <div className="info-card-icon">
                <Server />
              </div>
              <h3>Gemini API (Bill Scanning)</h3>
              <p>
                <strong>Rate:</strong> 60 requests/minute
                <br />
                <strong>Size:</strong> Max 10MB per image/PDF
              </p>
            </div>

            <div className="info-card">
              <div className="info-card-icon">
                <Database />
              </div>
              <h3>Firebase Firestore</h3>
              <p>
                <strong>Reads:</strong> 50,000/day (free tier)
                <br />
                <strong>Writes:</strong> 20,000/day (free tier)
              </p>
            </div>
          </div>

          <h2>Best Practices</h2>

          <h3>1. Cache Building Insights</h3>
          <CodeBlock
            language="javascript"
            code={`// Cache building insights to avoid repeated API calls
const cachedInsights = new Map();

const getBuildingInsightsCached = async (lat, lng) => {
  const key = \`\${lat.toFixed(4)},\${lng.toFixed(4)}\`;

  if (cachedInsights.has(key)) {
    console.log('Using cached insights');
    return cachedInsights.get(key);
  }

  const insights = await getBuildingInsights(lat, lng);
  cachedInsights.set(key, insights);
  return insights;
};`}
            onCopy={(code) => copyToClipboard(code, "cache-insights")}
            copied={copiedCode === "cache-insights"}
          />

          <h3>2. Debounce User Input</h3>
          <CodeBlock
            language="javascript"
            code={`// Debounce address autocomplete to reduce API calls
import { useState, useEffect } from 'react';

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Usage in component
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 500);

useEffect(() => {
  if (debouncedSearch.length > 3) {
    // Trigger autocomplete search
    fetchPlacePredictions(debouncedSearch);
  }
}, [debouncedSearch]);`}
            onCopy={(code) => copyToClipboard(code, "debounce")}
            copied={copiedCode === "debounce"}
          />

          <h3>3. Error Handling with Retry</h3>
          <CodeBlock
            language="javascript"
            code={`// Retry failed API calls with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Exponential backoff: 1s, 2s, 4s
      const waitTime = delay * Math.pow(2, i);
      console.log(\`Retry \${i + 1}/\${maxRetries} after \${waitTime}ms\`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

// Usage
const insights = await retryWithBackoff(() =>
  getBuildingInsights(lat, lng)
);`}
            onCopy={(code) => copyToClipboard(code, "retry")}
            copied={copiedCode === "retry"}
          />

          <h3>4. Batch Firestore Operations</h3>
          <CodeBlock
            language="javascript"
            code={`import { writeBatch } from 'firebase/firestore';

// Batch write multiple documents (more efficient)
const batchCreateLeads = async (leadsData) => {
  const batch = writeBatch(db);

  leadsData.forEach(leadData => {
    const docRef = doc(collection(db, 'leads'));
    batch.set(docRef, {
      ...leadData,
      createdAt: new Date(),
      status: 'pending'
    });
  });

  await batch.commit();
  console.log(\`Created \${leadsData.length} leads in one batch\`);
};`}
            onCopy={(code) => copyToClipboard(code, "batch-writes")}
            copied={copiedCode === "batch-writes"}
          />

          <h3>5. Optimize GeoTIFF Loading</h3>
          <CodeBlock
            language="javascript"
            code={`// Only fetch imagery when needed for visualization
const [showVisualization, setShowVisualization] = useState(false);
const [imagery, setImagery] = useState(null);

const loadImagery = async () => {
  if (!imagery && showVisualization) {
    const dataLayers = await getDataLayers(lat, lng);
    const rgbImagery = await fetchRgbImagery(dataLayers.rgbUrl);
    setImagery(rgbImagery);
  }
};

// Only load when user clicks "View Roof"
<button onClick={() => {
  setShowVisualization(true);
  loadImagery();
}}>
  View 3D Roof Visualization
</button>`}
            onCopy={(code) => copyToClipboard(code, "optimize-geotiff")}
            copied={copiedCode === "optimize-geotiff"}
          />

          <h2>Security Best Practices</h2>
          <ul>
            <li>
              <strong>Never expose API keys in client code:</strong> Use
              environment variables and server-side proxies
            </li>
            <li>
              <strong>Validate all inputs:</strong> Sanitize coordinates,
              addresses, and user data before API calls
            </li>
            <li>
              <strong>Use Firebase Security Rules:</strong> Restrict Firestore
              reads/writes based on authentication
            </li>
            <li>
              <strong>Implement CORS policies:</strong> Only allow requests from
              your domain
            </li>
            <li>
              <strong>Monitor API usage:</strong> Set up alerts for unusual
              activity in Google Cloud Console
            </li>
          </ul>
        </div>
      ),
    },

    errorHandling: {
      title: "Error Handling",
      icon: AlertCircle,
      content: (
        <div className="doc-section">
          <h1>Error Handling Guide</h1>

          <h2>Common Error Types</h2>

          <h3>Solar API Errors</h3>
          <CodeBlock
            language="javascript"
            code={`try {
  const insights = await getBuildingInsights(lat, lng);
} catch (error) {
  if (error.message.includes('not available for this location')) {
    // No solar data coverage for this property
    alert('Solar data not available for this address. Try a nearby location.');
  } else if (error.message.includes('Invalid location')) {
    // Invalid coordinates
    alert('Invalid coordinates. Please check the address.');
  } else if (error.message.includes('quota')) {
    // API quota exceeded
    alert('Service temporarily unavailable. Please try again later.');
  } else {
    // Generic error
    console.error('Solar API error:', error);
    alert('Unable to fetch solar data. Please try again.');
  }
}`}
            onCopy={(code) => copyToClipboard(code, "solar-errors")}
            copied={copiedCode === "solar-errors"}
          />

          <h3>Firebase Errors</h3>
          <CodeBlock
            language="javascript"
            code={`import { FirebaseError } from 'firebase/app';

try {
  await addDoc(collection(db, 'leads'), leadData);
} catch (error) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'permission-denied':
        console.error('Insufficient permissions');
        break;
      case 'unavailable':
        console.error('Firebase temporarily unavailable');
        break;
      case 'unauthenticated':
        console.error('User not authenticated');
        break;
      default:
        console.error('Firebase error:', error.code, error.message);
    }
  }
}`}
            onCopy={(code) => copyToClipboard(code, "firebase-errors")}
            copied={copiedCode === "firebase-errors"}
          />

          <h3>Geolocation Errors</h3>
          <CodeBlock
            language="javascript"
            code={`try {
  const location = await getCurrentLocation();
} catch (error) {
  if (error.message.includes('denied')) {
    // User denied location permission
    setShowAddressInput(true);
    alert('Location access denied. Please enter your address manually.');
  } else if (error.message.includes('unavailable')) {
    // Location unavailable (GPS off, etc.)
    setShowAddressInput(true);
    alert('Location unavailable. Please enter your address.');
  } else if (error.message.includes('timeout')) {
    // Location request timed out
    setShowAddressInput(true);
    alert('Location request timed out. Please enter your address.');
  }
}`}
            onCopy={(code) => copyToClipboard(code, "geolocation-errors")}
            copied={copiedCode === "geolocation-errors"}
          />

          <h2>Graceful Degradation</h2>
          <CodeBlock
            language="javascript"
            code={`// Provide fallback data when API fails
const designSystemWithFallback = async (lat, lng, annualUsage) => {
  try {
    return await designSolarSystem(lat, lng, annualUsage);
  } catch (error) {
    console.error('Failed to fetch solar data, using estimates:', error);

    // Return estimated system based on usage only
    const panelCount = Math.ceil(annualUsage / 500); // Rough estimate
    return {
      panels: {
        count: panelCount,
        wattage: 410,
        systemSizeKw: (panelCount * 410) / 1000
      },
      production: {
        annualKwh: annualUsage,
        monthlyKwh: Math.round(annualUsage / 12)
      },
      batteries: {
        brand: "Duracell PowerCenter Hybrid",
        totalCapacityKwh: 60
      },
      isEstimate: true,
      estimateReason: error.message
    };
  }
};`}
            onCopy={(code) => copyToClipboard(code, "fallback")}
            copied={copiedCode === "fallback"}
          />
        </div>
      ),
    },
  };

  const filteredSections = Object.entries(sections).filter(([key, section]) => {
    if (!searchQuery) return true;
    return (
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="api-docs-container">
      {/* Sidebar */}
      <aside className="docs-sidebar">
        <div className="docs-logo">
          <Zap size={32} />
          <h2>API Docs</h2>
        </div>

        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <nav className="docs-nav">
          {filteredSections.map(([key, section]) => {
            const Icon = section.icon;
            return (
              <button
                key={key}
                className={`nav-item ${activeSection === key ? "active" : ""}`}
                onClick={() => setActiveSection(key)}
              >
                <Icon size={20} />
                <span>{section.title}</span>
                <ChevronRight size={16} className="nav-arrow" />
              </button>
            );
          })}
        </nav>

        <div className="docs-footer">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={16} />
            View on GitHub
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="docs-content">{sections[activeSection]?.content}</main>
    </div>
  );
};

// Code block component with syntax highlighting
const CodeBlock = ({ language, code, onCopy, copied }) => {
  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-language">{language}</span>
        <button className="copy-button" onClick={() => onCopy(code)}>
          {copied ? (
            <>
              <Check size={16} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={16} />
              Copy
            </>
          )}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
};

// API endpoint documentation component
const ApiEndpoint = ({
  method,
  endpoint,
  description,
  parameters,
  returns,
  example,
  onCopy,
  copied,
}) => {
  return (
    <div className="api-endpoint">
      <div className="endpoint-header">
        <span className={`method-badge ${method.toLowerCase()}`}>{method}</span>
        <code className="endpoint-path">{endpoint}</code>
      </div>

      <p className="endpoint-description">{description}</p>

      {parameters && parameters.length > 0 && (
        <div className="endpoint-section">
          <h4>Parameters</h4>
          <table className="params-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Required</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {parameters.map((param, idx) => (
                <tr key={idx}>
                  <td>
                    <code>{param.name}</code>
                  </td>
                  <td>
                    <code className="type">{param.type}</code>
                  </td>
                  <td>
                    {param.required ? (
                      <span className="badge required">Required</span>
                    ) : (
                      <span className="badge optional">Optional</span>
                    )}
                  </td>
                  <td>{param.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {returns && (
        <div className="endpoint-section">
          <h4>Returns</h4>
          <p>
            <code>{returns}</code>
          </p>
        </div>
      )}

      {example && (
        <div className="endpoint-section">
          <h4>Example</h4>
          <CodeBlock
            language="javascript"
            code={example}
            onCopy={onCopy}
            copied={copied}
          />
        </div>
      )}
    </div>
  );
};

// Collection card component
const CollectionCard = ({ name, description, fields }) => {
  return (
    <div className="collection-card">
      <div className="collection-header">
        <Database size={20} />
        <h3>{name}</h3>
      </div>
      <p>{description}</p>
      <div className="collection-fields">
        <strong>Fields:</strong>
        <ul>
          {fields.map((field, idx) => (
            <li key={idx}>
              <code>{field}</code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ApiDocs;
