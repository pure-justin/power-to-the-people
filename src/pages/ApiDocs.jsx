import { useState, useEffect, useCallback, useMemo } from "react";
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
  ChevronDown,
  ExternalLink,
  Play,
  AlertCircle,
  Shield,
  Clock,
  Globe,
  Terminal,
  FileText,
  ArrowLeft,
  Hash,
  Webhook,
  Package,
  History,
  Sun,
  Users,
  Image,
  MapPin,
  MessageSquare,
  Building2,
  Wrench,
  Bot,
  BarChart3,
  CreditCard,
  Truck,
  Link,
} from "lucide-react";
import ApiPlayground from "../components/ApiPlayground";
import "../styles/ApiDocs.css";

const API_VERSION = "3.0.0";
const LAST_UPDATED = "2026-02-06";

// Multi-language code example component
const MultiLangCode = ({ examples, onCopy, copiedId }) => {
  const [activeLang, setActiveLang] = useState(Object.keys(examples)[0]);
  const langs = Object.keys(examples);
  const langLabels = {
    javascript: "JavaScript",
    python: "Python",
    curl: "cURL",
    php: "PHP",
  };

  return (
    <div className="multi-lang-code">
      <div className="lang-tabs">
        {langs.map((lang) => (
          <button
            key={lang}
            className={`lang-tab ${activeLang === lang ? "active" : ""}`}
            onClick={() => setActiveLang(lang)}
          >
            {langLabels[lang] || lang}
          </button>
        ))}
      </div>
      <CodeBlock
        language={activeLang}
        code={examples[activeLang]}
        onCopy={(code) => onCopy(code, `${copiedId}-${activeLang}`)}
        copied={copiedId === `${copiedId}-${activeLang}` ? true : false}
      />
    </div>
  );
};

// Status badge component
const StatusBadge = ({ status }) => {
  const colors = {
    stable: {
      bg: "rgba(16, 185, 129, 0.15)",
      color: "#10b981",
      border: "rgba(16, 185, 129, 0.4)",
    },
    beta: {
      bg: "rgba(245, 158, 11, 0.15)",
      color: "#f59e0b",
      border: "rgba(245, 158, 11, 0.4)",
    },
    deprecated: {
      bg: "rgba(239, 68, 68, 0.15)",
      color: "#ef4444",
      border: "rgba(239, 68, 68, 0.4)",
    },
  };
  const s = colors[status] || colors.stable;
  return (
    <span
      className="status-badge"
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      {status}
    </span>
  );
};

const ApiDocs = () => {
  const [activeSection, setActiveSection] = useState("introduction");
  const [copiedCode, setCopiedCode] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({
    overview: true,
    apis: true,
    services: true,
    tools: true,
    resources: true,
  });

  // Set section from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && sectionList.some((s) => s.key === hash)) {
      setActiveSection(hash);
    }
  }, []);

  // Update URL hash when section changes
  useEffect(() => {
    window.location.hash = activeSection;
  }, [activeSection]);

  const copyToClipboard = useCallback((code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  const toggleGroup = (group) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  // Grouped navigation structure
  const navGroups = [
    {
      id: "overview",
      label: "Getting Started",
      items: [
        { key: "introduction", title: "Introduction", icon: BookOpen },
        { key: "authentication", title: "Authentication", icon: Key },
        { key: "quickstart", title: "Quick Start", icon: Zap },
      ],
    },
    {
      id: "apis",
      label: "Core APIs",
      items: [
        { key: "solarApi", title: "Solar API", icon: Sun },
        { key: "firebaseApi", title: "Firebase / Leads", icon: Database },
        {
          key: "utilityBillApi",
          title: "Utility Bill Scanner",
          icon: FileText,
        },
        { key: "addressApi", title: "Address & Location", icon: MapPin },
        { key: "referralApi", title: "Referral System", icon: Users },
        { key: "webhooks", title: "Webhooks", icon: Globe },
      ],
    },
    {
      id: "services",
      label: "Service APIs",
      items: [
        { key: "installerApi", title: "Installer Search", icon: Wrench },
        { key: "smsApi", title: "SMS Notifications", icon: MessageSquare },
        { key: "adminApi", title: "Admin Dashboard", icon: BarChart3 },
        { key: "commercialApi", title: "Commercial Leads", icon: Building2 },
        { key: "solriteApi", title: "SolRite / SubHub", icon: Link },
        { key: "coordinatorApi", title: "Agent Coordinator", icon: Bot },
      ],
    },
    {
      id: "tools",
      label: "Tools & Testing",
      items: [
        { key: "visualization", title: "3D Visualization", icon: Image },
        { key: "playground", title: "API Playground", icon: Play },
        { key: "sdks", title: "SDKs & Libraries", icon: Package },
      ],
    },
    {
      id: "resources",
      label: "Resources",
      items: [
        { key: "examples", title: "Code Examples", icon: Code },
        { key: "rateLimiting", title: "Rate Limits", icon: Shield },
        { key: "errorHandling", title: "Error Handling", icon: AlertCircle },
        { key: "changelog", title: "Changelog", icon: History },
      ],
    },
  ];

  const sectionList = navGroups.flatMap((g) => g.items);

  // Search across all sections
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return navGroups;
    const q = searchQuery.toLowerCase();
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.key.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchQuery]);

  // Section content definitions
  const sections = {
    introduction: (
      <div className="doc-section">
        <div className="section-header-bar">
          <h1>Power to the People API</h1>
          <div className="version-info">
            <StatusBadge status="stable" />
            <span className="version-tag">v{API_VERSION}</span>
            <span className="updated-tag">Updated {LAST_UPDATED}</span>
          </div>
        </div>
        <p className="lead">
          Comprehensive solar + battery system design, cost estimation, and
          project management API powered by Google Solar API, Firebase, and
          Cesium 3D visualization.
        </p>

        <div className="info-cards">
          <div
            className="info-card"
            onClick={() => setActiveSection("solarApi")}
          >
            <div className="info-card-icon">
              <Sun size={24} />
            </div>
            <h3>Solar System Design</h3>
            <p>
              Design optimal configurations with 410W panels and 60kWh Duracell
              batteries using Google Solar API roof analysis.
            </p>
            <span className="card-link">
              View API <ChevronRight size={14} />
            </span>
          </div>

          <div
            className="info-card"
            onClick={() => setActiveSection("firebaseApi")}
          >
            <div className="info-card-icon">
              <Database size={24} />
            </div>
            <h3>Lead Management</h3>
            <p>
              Create, track, and manage solar installation leads with Firebase
              Firestore real-time updates.
            </p>
            <span className="card-link">
              View API <ChevronRight size={14} />
            </span>
          </div>

          <div
            className="info-card"
            onClick={() => setActiveSection("utilityBillApi")}
          >
            <div className="info-card-icon">
              <FileText size={24} />
            </div>
            <h3>Bill Scanning</h3>
            <p>
              Extract usage data from utility bills using Gemini 1.5 Pro vision
              AI with 12-month history.
            </p>
            <span className="card-link">
              View API <ChevronRight size={14} />
            </span>
          </div>

          <div
            className="info-card"
            onClick={() => setActiveSection("visualization")}
          >
            <div className="info-card-icon">
              <Image size={24} />
            </div>
            <h3>3D Visualization</h3>
            <p>
              Render interactive 3D building models with panel overlays using
              Cesium and Google 3D Tiles.
            </p>
            <span className="card-link">
              View API <ChevronRight size={14} />
            </span>
          </div>

          <div
            className="info-card"
            onClick={() => setActiveSection("installerApi")}
          >
            <div className="info-card-icon">
              <Wrench size={24} />
            </div>
            <h3>Installer Search</h3>
            <p>
              Search, filter, and compare solar installers by location, rating,
              certifications, and company size.
            </p>
            <span className="card-link">
              View API <ChevronRight size={14} />
            </span>
          </div>

          <div
            className="info-card"
            onClick={() => setActiveSection("commercialApi")}
          >
            <div className="info-card-icon">
              <Building2 size={24} />
            </div>
            <h3>Commercial Leads</h3>
            <p>
              AI-powered commercial solar lead generation with property
              scraping, scoring, and batch import.
            </p>
            <span className="card-link">
              View API <ChevronRight size={14} />
            </span>
          </div>

          <div
            className="info-card"
            onClick={() => setActiveSection("coordinatorApi")}
          >
            <div className="info-card-icon">
              <Bot size={24} />
            </div>
            <h3>Agent Coordinator</h3>
            <p>
              Multi-agent orchestration system with task queues, messaging, and
              AI agent management via Ava.
            </p>
            <span className="card-link">
              View API <ChevronRight size={14} />
            </span>
          </div>
        </div>

        <div className="base-urls">
          <h2>Base URLs</h2>
          <div className="url-table">
            <div className="url-row">
              <span className="url-label">Cloud Functions</span>
              <code>
                https://us-central1-power-to-the-people-vpp.cloudfunctions.net
              </code>
              <button
                className="copy-inline"
                onClick={() =>
                  copyToClipboard(
                    "https://us-central1-power-to-the-people-vpp.cloudfunctions.net",
                    "base-cf",
                  )
                }
              >
                {copiedCode === "base-cf" ? (
                  <Check size={14} />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
            <div className="url-row">
              <span className="url-label">Netlify Functions</span>
              <code>
                https://power-to-the-people-vpp.web.app/.netlify/functions
              </code>
              <button
                className="copy-inline"
                onClick={() =>
                  copyToClipboard(
                    "https://power-to-the-people-vpp.web.app/.netlify/functions",
                    "base-nl",
                  )
                }
              >
                {copiedCode === "base-nl" ? (
                  <Check size={14} />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
            <div className="url-row">
              <span className="url-label">Interactive Docs</span>
              <code>https://power-to-the-people-vpp.web.app/api-docs</code>
              <button
                className="copy-inline"
                onClick={() =>
                  copyToClipboard(
                    "https://power-to-the-people-vpp.web.app/api-docs",
                    "base-docs",
                  )
                }
              >
                {copiedCode === "base-docs" ? (
                  <Check size={14} />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    ),

    authentication: (
      <div className="doc-section">
        <h1>Authentication</h1>
        <p className="lead">
          All API requests require authentication via API keys or Firebase Auth
          tokens.
        </p>

        <div className="auth-methods">
          <div className="auth-method">
            <div className="auth-method-header">
              <Key size={20} />
              <h3>API Key Authentication</h3>
              <StatusBadge status="stable" />
            </div>
            <p>Include your API key in the Authorization header:</p>
            <CodeBlock
              language="bash"
              code={`Authorization: Bearer pk_live_your_api_key_here`}
              onCopy={(code) => copyToClipboard(code, "auth-header")}
              copied={copiedCode === "auth-header"}
            />
            <p>
              Get your API key from the{" "}
              <a href="/admin" className="doc-link">
                Admin Portal
              </a>{" "}
              under Settings &rarr; API Keys.
            </p>
          </div>

          <div className="auth-method">
            <div className="auth-method-header">
              <Shield size={20} />
              <h3>Firebase Auth Token</h3>
              <StatusBadge status="stable" />
            </div>
            <p>For client-side SDK usage, authenticate with Firebase:</p>
            <MultiLangCode
              examples={{
                javascript: `import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth();
const { user } = await signInWithEmailAndPassword(
  auth, 'user@example.com', 'password'
);

// Token is automatically sent with Firebase SDK calls
const token = await user.getIdToken();`,
                python: `import firebase_admin
from firebase_admin import auth

# Server-side: verify client tokens
decoded_token = auth.verify_id_token(id_token)
uid = decoded_token['uid']`,
                curl: `# Get token via REST API
curl -X POST \\
  'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "email": "user@example.com",
    "password": "password",
    "returnSecureToken": true
  }'`,
              }}
              onCopy={copyToClipboard}
              copiedId={copiedCode}
            />
          </div>
        </div>

        <h2>Environment Variables</h2>
        <CodeBlock
          language="bash"
          code={`# Google APIs
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key

# Cesium 3D Tiles
VITE_CESIUM_ION_TOKEN=your_cesium_token

# Firebase (auto-configured)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id

# SubHub
VITE_SUBHUB_API_KEY=your_subhub_key
VITE_SUBHUB_ENV=production`}
          onCopy={(code) => copyToClipboard(code, "env-vars")}
          copied={copiedCode === "env-vars"}
        />

        <div className="callout warning">
          <AlertCircle size={20} />
          <div>
            <strong>Security Notice</strong>
            <p>
              Never expose API keys in client-side code. Use environment
              variables and server-side proxies for production deployments.
            </p>
          </div>
        </div>
      </div>
    ),

    quickstart: (
      <div className="doc-section">
        <h1>Quick Start</h1>
        <p className="lead">Get up and running in under 5 minutes.</p>

        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Install Dependencies</h3>
              <CodeBlock
                language="bash"
                code={`npm install firebase axios geotiff proj4`}
                onCopy={(code) => copyToClipboard(code, "qs-install")}
                copied={copiedCode === "qs-install"}
              />
            </div>
          </div>

          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Initialize Firebase</h3>
              <CodeBlock
                language="javascript"
                code={`import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
});

export const db = getFirestore(app);
export const auth = getAuth(app);`}
                onCopy={(code) => copyToClipboard(code, "qs-firebase")}
                copied={copiedCode === "qs-firebase"}
              />
            </div>
          </div>

          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Design a Solar System</h3>
              <MultiLangCode
                examples={{
                  javascript: `import { designSolarSystem } from './services/solarApi';

// One-call system design for Austin, TX
const system = await designSolarSystem(
  30.2672,  // latitude
  -97.7431, // longitude
  14400,    // 14,400 kWh annual usage
  1.0       // 100% offset
);

console.log(\`System: \${system.panels.count} panels, \${system.panels.systemSizeKw} kW\`);
console.log(\`Production: \${system.production.annualKwh} kWh/year\`);
console.log(\`Battery: \${system.batteries.totalCapacityKwh} kWh\`);`,
                  python: `import requests

response = requests.get(
    "https://solar.googleapis.com/v1/buildingInsights:findClosest",
    params={
        "location.latitude": 30.2672,
        "location.longitude": -97.7431,
        "key": "YOUR_GOOGLE_API_KEY"
    }
)

data = response.json()
solar = data["solarPotential"]
print(f"Max panels: {solar['maxArrayPanelsCount']}")
print(f"Sunshine hours: {solar['maxSunshineHoursPerYear']}")`,
                  curl: `curl -G "https://solar.googleapis.com/v1/buildingInsights:findClosest" \\
  --data-urlencode "location.latitude=30.2672" \\
  --data-urlencode "location.longitude=-97.7431" \\
  --data-urlencode "key=YOUR_GOOGLE_API_KEY"`,
                }}
                onCopy={copyToClipboard}
                copiedId={copiedCode}
              />
            </div>
          </div>

          <div className="step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>Create a Lead</h3>
              <CodeBlock
                language="javascript"
                code={`import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const createLead = httpsCallable(functions, 'createLead');

const result = await createLead({
  name: 'John Smith',
  email: 'john@example.com',
  phone: '+15125550100',
  address: '123 Solar St, Austin, TX',
  annualUsageKwh: 12000,
  systemDesign: system  // from step 3
});

console.log('Lead ID:', result.data.leadId);`}
                onCopy={(code) => copyToClipboard(code, "qs-lead")}
                copied={copiedCode === "qs-lead"}
              />
            </div>
          </div>
        </div>
      </div>
    ),

    solarApi: (
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
          status="stable"
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
          responseExample={`{
  "solarPotential": {
    "maxArrayPanelsCount": 45,
    "maxSunshineHoursPerYear": 1850,
    "roofSegmentStats": [...],
    "solarPanels": [
      {
        "center": { "latitude": 30.2672, "longitude": -97.7431 },
        "orientation": "LANDSCAPE",
        "yearlyEnergyDcKwh": 620
      }
    ]
  }
}`}
          examples={{
            javascript: `import { getBuildingInsights } from './services/solarApi';

const insights = await getBuildingInsights(30.2672, -97.7431);

console.log(insights.solarPotential);
// { maxArrayPanelsCount: 45, maxSunshineHoursPerYear: 1850, ... }`,
            python: `import requests

response = requests.get(
    "https://solar.googleapis.com/v1/buildingInsights:findClosest",
    params={
        "location.latitude": 30.2672,
        "location.longitude": -97.7431,
        "key": "YOUR_API_KEY"
    }
)
insights = response.json()
print(insights["solarPotential"]["maxArrayPanelsCount"])`,
            curl: `curl -G "https://solar.googleapis.com/v1/buildingInsights:findClosest" \\
  --data-urlencode "location.latitude=30.2672" \\
  --data-urlencode "location.longitude=-97.7431" \\
  --data-urlencode "key=YOUR_API_KEY"`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <ApiEndpoint
          method="POST"
          endpoint="calculateSystemDesign(buildingInsights, annualUsageKwh, targetOffset)"
          description="Calculate optimal solar + battery system design based on building insights and usage"
          status="stable"
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
          responseExample={`{
  "panels": {
    "count": 28,
    "wattage": 410,
    "totalWatts": 11480,
    "systemSizeKw": 11.48
  },
  "batteries": {
    "brand": "Duracell PowerCenter Hybrid",
    "totalCapacityKwh": 60,
    "peakPowerKw": 15.0
  },
  "production": {
    "annualKwh": 14250,
    "monthlyKwh": 1188,
    "dailyKwh": 39.0
  }
}`}
          examples={{
            javascript: `import { calculateSystemDesign } from './services/solarApi';

const systemDesign = calculateSystemDesign(
  buildingInsights,
  12000, // 12,000 kWh annual usage
  1.05   // 105% offset
);

console.log(\`Panels: \${systemDesign.panels.count}\`);
console.log(\`System: \${systemDesign.panels.systemSizeKw} kW\`);
console.log(\`Production: \${systemDesign.production.annualKwh} kWh/yr\`);`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <ApiEndpoint
          method="GET"
          endpoint="designSolarSystem(latitude, longitude, annualUsageKwh, targetOffset)"
          description="Complete end-to-end solar system design (combines getBuildingInsights + calculateSystemDesign)"
          status="stable"
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
          examples={{
            javascript: `import { designSolarSystem } from './services/solarApi';

const system = await designSolarSystem(30.2672, -97.7431, 14400, 1.0);

console.log(\`System Size: \${system.panels.systemSizeKw} kW\`);
console.log(\`Annual Production: \${system.production.annualKwh} kWh\`);`,
            python: `# Python wrapper combining building insights + system design
import requests

def design_solar_system(lat, lng, annual_usage=12000):
    insights = requests.get(
        "https://solar.googleapis.com/v1/buildingInsights:findClosest",
        params={"location.latitude": lat, "location.longitude": lng, "key": API_KEY}
    ).json()

    panels_needed = min(
        insights["solarPotential"]["maxArrayPanelsCount"],
        int(annual_usage / 500)  # ~500 kWh per panel/year
    )

    return {
        "panels": panels_needed,
        "system_kw": panels_needed * 0.41,
        "annual_kwh": panels_needed * 500
    }`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <ApiEndpoint
          method="GET"
          endpoint="getDataLayers(latitude, longitude, radiusMeters, pixelSizeMeters)"
          description="Get GeoTIFF imagery and solar flux data from Google Solar API"
          status="stable"
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
          examples={{
            javascript: `import { getDataLayers, fetchRgbImagery, fetchFluxData } from './services/solarApi';

const dataLayers = await getDataLayers(30.2672, -97.7431);
const rgbImagery = await fetchRgbImagery(dataLayers.rgbUrl);
const fluxData = await fetchFluxData(dataLayers.annualFluxUrl);

console.log(\`Image: \${rgbImagery.width}x\${rgbImagery.height}\`);`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <ApiEndpoint
          method="POST"
          endpoint="calculatePanelProduction(panels, fluxData, panelDimensions, panelWattage, latLngToUtm)"
          description="Calculate per-panel production using solar flux data and UTM coordinate conversion"
          status="stable"
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
          examples={{
            javascript: `import { calculatePanelProduction } from './services/solarApi';
import proj4 from 'proj4';

const utmZone = 14; // Texas
const utmProj = \`+proj=utm +zone=\${utmZone} +datum=WGS84\`;
const latLngToUtm = (lng, lat) => proj4('EPSG:4326', utmProj, [lng, lat]);

const panelsWithProduction = calculatePanelProduction(
  solarPanels, fluxData,
  { heightMeters: 2.278, widthMeters: 1.134 },
  410, latLngToUtm
);

// Sorted by production (highest first)
console.log(panelsWithProduction[0].annualProductionKwh); // 620`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />
      </div>
    ),

    firebaseApi: (
      <div className="doc-section">
        <h1>Firebase / Lead Management API</h1>
        <p className="lead">
          Manage projects, leads, referrals, and user data with Firebase
          Firestore.
        </p>

        <h2>Firestore Collections</h2>
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
              "score",
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
              "installer",
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
              "trackingCode",
              "createdAt",
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
          status="stable"
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
          examples={{
            javascript: `import { collection, addDoc } from 'firebase/firestore';
import { db } from './services/firebase';

const leadId = await addDoc(collection(db, 'leads'), {
  name: 'John Smith',
  email: 'john@example.com',
  phone: '512-555-0100',
  address: '123 Solar St, Austin, TX 78701',
  annualUsage: 12000,
  systemDesign: {
    panels: { count: 28, systemSizeKw: 11.48 },
    production: { annualKwh: 14250 }
  },
  status: 'pending',
  createdAt: new Date(),
  updatedAt: new Date()
});`,
            python: `import firebase_admin
from firebase_admin import firestore

db = firestore.client()
lead_ref = db.collection('leads').add({
    'name': 'John Smith',
    'email': 'john@example.com',
    'phone': '512-555-0100',
    'address': '123 Solar St, Austin, TX 78701',
    'annualUsage': 12000,
    'status': 'pending'
})
print(f"Lead ID: {lead_ref[1].id}")`,
            curl: `# Via Firebase Cloud Function
curl -X POST \\
  'https://us-central1-power-to-the-people-vpp.cloudfunctions.net/createLead' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "data": {
      "name": "John Smith",
      "email": "john@example.com",
      "phone": "+15125550100",
      "address": "123 Solar St, Austin, TX",
      "annualUsageKwh": 12000
    }
  }'`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <ApiEndpoint
          method="GET"
          endpoint="getLeadById(leadId)"
          description="Retrieve a specific lead by ID"
          status="stable"
          parameters={[
            {
              name: "leadId",
              type: "string",
              required: true,
              description: "Lead document ID",
            },
          ]}
          returns="Promise<object> - Lead data"
          examples={{
            javascript: `import { doc, getDoc } from 'firebase/firestore';
import { db } from './services/firebase';

const docSnap = await getDoc(doc(db, 'leads', 'lead_123'));
if (docSnap.exists()) {
  const lead = { id: docSnap.id, ...docSnap.data() };
  console.log(lead.name, lead.status);
}`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <ApiEndpoint
          method="PUT"
          endpoint="updateLead(leadId, updates)"
          description="Update lead status, notes, or assignment"
          status="stable"
          parameters={[
            {
              name: "leadId",
              type: "string",
              required: true,
              description: "Lead document ID",
            },
            {
              name: "updates",
              type: "object",
              required: true,
              description: "Fields to update",
            },
          ]}
          returns="Promise<void>"
          examples={{
            javascript: `import { doc, updateDoc } from 'firebase/firestore';
import { db } from './services/firebase';

await updateDoc(doc(db, 'leads', 'lead_123'), {
  status: 'qualified',
  score: 85,
  assignedTo: 'rep_456',
  updatedAt: new Date()
});`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <h2>Lead Status Flow</h2>
        <div className="status-flow">
          <div className="flow-step">
            <span className="flow-badge pending">pending</span>
          </div>
          <ChevronRight size={16} className="flow-arrow" />
          <div className="flow-step">
            <span className="flow-badge contacted">contacted</span>
          </div>
          <ChevronRight size={16} className="flow-arrow" />
          <div className="flow-step">
            <span className="flow-badge qualified">qualified</span>
          </div>
          <ChevronRight size={16} className="flow-arrow" />
          <div className="flow-step">
            <span className="flow-badge proposal">proposal</span>
          </div>
          <ChevronRight size={16} className="flow-arrow" />
          <div className="flow-step">
            <span className="flow-badge contracted">contracted</span>
          </div>
          <ChevronRight size={16} className="flow-arrow" />
          <div className="flow-step">
            <span className="flow-badge installed">installed</span>
          </div>
        </div>
      </div>
    ),

    utilityBillApi: (
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
          status="stable"
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
                "MIME type (default: image/jpeg). Supports jpeg, png, pdf",
            },
          ]}
          returns="Promise<object> - Extracted bill data with usage history"
          responseExample={`{
  "success": true,
  "billData": {
    "isValidBill": true,
    "accountNumber": "123456789",
    "customerName": "John Smith",
    "serviceAddress": "123 Solar St, Austin, TX 78701",
    "utilityCompany": "Austin Energy",
    "esiid": "10123456789012345678",
    "currentUsageKwh": 1200,
    "usageHistory": [
      { "month": "January", "year": 2024, "kWh": 1500 },
      { "month": "February", "year": 2024, "kWh": 1350 }
    ],
    "totalAmountDue": 145.67,
    "ratePerKwh": 0.12,
    "confidence": 0.95
  },
  "consumptionData": {
    "annualConsumption": 14400,
    "monthsWithData": 12,
    "dataQuality": "excellent"
  }
}`}
          examples={{
            javascript: `import axios from 'axios';

const scanUtilityBill = async (imageFile) => {
  const reader = new FileReader();
  const base64 = await new Promise((resolve) => {
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(imageFile);
  });

  const response = await axios.post('/api/scan-bill', {
    data: { imageBase64: base64, mediaType: imageFile.type }
  });

  return response.data;
};

const result = await scanUtilityBill(billImageFile);
if (result.success) {
  console.log('Annual Usage:', result.consumptionData.annualConsumption, 'kWh');
  console.log('ESIID:', result.billData.esiid);
}`,
            curl: `# Base64 encode the image first
BASE64=$(base64 -i bill.jpg)

curl -X POST 'https://your-app.vercel.app/api/scan-bill' \\
  -H 'Content-Type: application/json' \\
  -d "{
    \\"data\\": {
      \\"imageBase64\\": \\"$BASE64\\",
      \\"mediaType\\": \\"image/jpeg\\"
    }
  }"`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <div className="callout info">
          <FileText size={20} />
          <div>
            <strong>Supported Formats</strong>
            <p>
              JPEG, PNG, and PDF files up to 10MB. For best results, ensure the
              bill is clearly visible and uncrumpled.
            </p>
          </div>
        </div>
      </div>
    ),

    addressApi: (
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
          status="stable"
          parameters={[]}
          returns="Promise<object> - Parsed address with coordinates"
          examples={{
            javascript: `import { getCurrentLocation } from './services/addressService';

const location = await getCurrentLocation();
console.log(location.formattedAddress); // "123 Solar St, Austin, TX 78701"
console.log(location.lat, location.lng); // 30.2672, -97.7431
console.log(location.city, location.state, location.zipCode);`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <ApiEndpoint
          method="POST"
          endpoint="parseGoogleAddress(place)"
          description="Parse Google Places autocomplete result into structured address components"
          status="stable"
          parameters={[
            {
              name: "place",
              type: "object",
              required: true,
              description: "Google Places API place object",
            },
          ]}
          returns="object - Parsed address with streetAddress, city, county, state, zipCode, lat, lng"
          examples={{
            javascript: `import { parseGoogleAddress } from './services/addressService';

const onPlaceSelected = (place) => {
  const parsed = parseGoogleAddress(place);
  // { streetAddress: "123 Solar St", city: "Austin",
  //   county: "Travis", state: "TX", zipCode: "78701",
  //   lat: 30.2672, lng: -97.7431 }
  designSolarSystem(parsed.lat, parsed.lng, annualUsage);
};`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <h2>Energy Community Lookup</h2>
        <p>
          Check if a property qualifies for IRS Energy Community tax credits
          (IRS Notice 2025-31).
        </p>

        <ApiEndpoint
          method="GET"
          endpoint="checkEnergyCommunity(county, state)"
          description="Determine if a county qualifies as an IRS Energy Community for enhanced solar tax credits"
          status="stable"
          parameters={[
            {
              name: "county",
              type: "string",
              required: true,
              description: 'County name (e.g., "Harris")',
            },
            {
              name: "state",
              type: "string",
              required: false,
              description: 'State code (default: "TX")',
            },
          ]}
          returns="object - Energy community status, MSA name, and qualification reason"
          examples={{
            javascript: `import { checkEnergyCommunity } from './services/energyCommunity';

const result = checkEnergyCommunity('Harris', 'TX');
// {
//   isEnergyCommunity: true,
//   msa: "Houston-The Woodlands-Sugar Land",
//   reason: "Qualifies under IRS Notice 2025-31"
// }

if (result.isEnergyCommunity) {
  const taxCredit = systemCost * 0.40; // 40% ITC vs 30%
}`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />
      </div>
    ),

    referralApi: (
      <div className="doc-section">
        <h1>Referral System API</h1>
        <p className="lead">
          Track referrals, calculate rewards, and manage referral attribution
          for the solar referral program.
        </p>

        <ApiEndpoint
          method="POST"
          endpoint="createReferral(referrerId, refereeData)"
          description="Create a referral link and track referral attribution"
          status="stable"
          parameters={[
            {
              name: "referrerId",
              type: "string",
              required: true,
              description: "ID of the referring user",
            },
            {
              name: "refereeData",
              type: "object",
              required: true,
              description: "Referee contact information",
            },
          ]}
          returns="Promise<object> - Referral tracking data with link and code"
          examples={{
            javascript: `import { referralService } from './services/referralService';

const referral = await referralService.createReferral('user_abc', {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '512-555-0200'
});

console.log(referral.referralLink);
console.log(referral.trackingCode);`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <ApiEndpoint
          method="GET"
          endpoint="getReferralStats(userId)"
          description="Get referral statistics for a user including pending, qualified, and installed counts"
          status="stable"
          parameters={[
            {
              name: "userId",
              type: "string",
              required: true,
              description: "User document ID",
            },
          ]}
          returns="Promise<object> - Referral counts and total earnings"
          examples={{
            javascript: `const stats = await referralService.getReferralStats('user_abc');
// {
//   totalReferrals: 12,
//   pending: 5,
//   qualified: 4,
//   installed: 3,
//   totalEarnings: 1500
// }`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />
      </div>
    ),

    installerApi: (
      <div className="doc-section">
        <h1>Installer Search API</h1>
        <p className="lead">
          Search, filter, compare, and score solar installers from our Firestore
          database with support for location-based queries, certification
          filters, and intelligent ranking.
        </p>

        <ApiEndpoint
          method="GET"
          endpoint="searchInstallers(options)"
          description="Search installers with comprehensive filtering including state, city, rating, certifications, company size, and sorting"
          status="stable"
          parameters={[
            {
              name: "state",
              type: "string",
              required: false,
              description: "US state code (e.g., 'TX', 'CA')",
            },
            {
              name: "city",
              type: "string",
              required: false,
              description: "City name for service area filtering",
            },
            {
              name: "minRating",
              type: "number",
              required: false,
              description: "Minimum rating threshold (0-5)",
            },
            {
              name: "certifications",
              type: "string[]",
              required: false,
              description: "Required certifications (e.g., ['NABCEP'])",
            },
            {
              name: "companySize",
              type: "string",
              required: false,
              description: "'small' | 'medium' | 'large'",
            },
            {
              name: "maxResults",
              type: "number",
              required: false,
              description: "Max results to return (default: 50)",
            },
            {
              name: "sortBy",
              type: "string",
              required: false,
              description: "'rating' | 'reviewCount' | 'annualInstalls'",
            },
            {
              name: "sortOrder",
              type: "string",
              required: false,
              description: "'asc' | 'desc' (default: 'desc')",
            },
          ]}
          returns="Promise<object> - { success, count, installers[] }"
          responseExample={`{
  "success": true,
  "count": 12,
  "installers": [
    {
      "id": "inst_abc123",
      "name": "SunPower Texas",
      "rating": 4.8,
      "reviews": 342,
      "yearsInBusiness": 15,
      "installsCompleted": 2800,
      "pricePerWatt": 2.85,
      "certifications": ["NABCEP", "Tesla Powerwall"],
      "serviceAreas": ["TX-Austin", "TX-San Antonio"],
      "customerSatisfaction": 96,
      "warranty": {
        "workmanship": 25,
        "panels": 25,
        "inverters": 12,
        "batteries": 10
      }
    }
  ]
}`}
          examples={{
            javascript: `import { searchInstallers } from './services/installerApi';

const results = await searchInstallers({
  state: 'TX',
  city: 'Austin',
  minRating: 4.0,
  certifications: ['NABCEP'],
  sortBy: 'rating',
  maxResults: 10
});

results.installers.forEach(inst => {
  console.log(\`\${inst.name}: \${inst.rating}/5 (\${inst.reviews} reviews)\`);
});`,
            python: `from google.cloud import firestore

db = firestore.Client()
installers = db.collection('installers') \\
    .where('state', '==', 'TX') \\
    .where('rating', '>=', 4.0) \\
    .order_by('rating', direction='DESCENDING') \\
    .limit(10) \\
    .stream()

for inst in installers:
    data = inst.to_dict()
    print(f"{data['name']}: {data['rating']}/5")`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <ApiEndpoint
          method="GET"
          endpoint="getTopInstallers(state, count)"
          description="Get the highest-rated solar installers in a specific state"
          status="stable"
          parameters={[
            {
              name: "state",
              type: "string",
              required: true,
              description: "US state code",
            },
            {
              name: "count",
              type: "number",
              required: false,
              description: "Number of results (default: 10)",
            },
          ]}
          returns="Promise<object> - { success, count, installers[] }"
          examples={{
            javascript: `import { getTopInstallers } from './services/installerApi';

const top = await getTopInstallers('TX', 5);
console.log(\`Top \${top.count} Texas installers:\`);
top.installers.forEach(i => console.log(\`  \${i.name} - \${i.rating}/5\`));`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <ApiEndpoint
          method="GET"
          endpoint="getInstallerStats(state)"
          description="Get aggregate installer statistics for a state including counts by size, average rating, and certification data"
          status="stable"
          parameters={[
            {
              name: "state",
              type: "string",
              required: true,
              description: "US state code",
            },
          ]}
          returns="Promise<object> - { success, state, stats }"
          responseExample={`{
  "success": true,
  "state": "TX",
  "stats": {
    "total": 147,
    "bySize": { "small": 82, "medium": 45, "large": 20 },
    "avgRating": 4.2,
    "totalReviews": 12450,
    "certified": 89
  }
}`}
          examples={{
            javascript: `import { getInstallerStats } from './services/installerApi';

const stats = await getInstallerStats('TX');
console.log(\`Total: \${stats.stats.total} installers\`);
console.log(\`Avg Rating: \${stats.stats.avgRating}/5\`);
console.log(\`NABCEP Certified: \${stats.stats.certified}\`);`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <h2>Installer Comparison</h2>
        <ApiEndpoint
          method="POST"
          endpoint="compareInstallers(installerIds, systemSizeKw)"
          description="Compare multiple installers side-by-side with pricing calculations including tax credits and monthly payments"
          status="stable"
          parameters={[
            {
              name: "installerIds",
              type: "string[]",
              required: true,
              description: "Array of installer IDs to compare",
            },
            {
              name: "systemSizeKw",
              type: "number",
              required: false,
              description: "System size in kW (default: 10)",
            },
          ]}
          returns="Array - Installers with pricing, sorted by total score"
          responseExample={`[
  {
    "name": "SunPower Texas",
    "pricing": {
      "basePrice": 28500,
      "batteryCost": 15000,
      "totalPrice": 43500,
      "federalTaxCredit": 13050,
      "netCost": 30450,
      "pricePerWatt": 2.85,
      "monthlyPayment": 145
    },
    "score": {
      "total": 92,
      "breakdown": {
        "rating": 24, "customerSatisfaction": 19,
        "onTimeCompletion": 18, "priceValue": 16
      }
    }
  }
]`}
          examples={{
            javascript: `import { compareInstallers } from './services/installerService';

const comparison = compareInstallers(
  ['inst_abc', 'inst_def', 'inst_ghi'],
  11.48  // 11.48 kW system
);

comparison.forEach(inst => {
  console.log(\`\${inst.name}: $\${inst.pricing.netCost} net cost\`);
  console.log(\`  Score: \${inst.score.total}/100\`);
  console.log(\`  Monthly: $\${inst.pricing.monthlyPayment}/mo\`);
});`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <h2>Installer Score Breakdown</h2>
        <div className="callout info">
          <BarChart3 size={20} />
          <div>
            <strong>Scoring Algorithm</strong>
            <p>
              Installers are scored 0-100 based on weighted factors: Customer
              Rating (25%), Customer Satisfaction (20%), On-Time Completion
              (20%), Permitting Success (15%), Years in Business (10%), and
              Price Value (10%).
            </p>
          </div>
        </div>
      </div>
    ),

    smsApi: (
      <div className="doc-section">
        <h1>SMS Notifications API</h1>
        <p className="lead">
          Send SMS notifications to leads and customers via Firebase Cloud
          Functions. Supports individual messages, bulk sending, and pre-built
          templates for common solar CRM workflows.
        </p>

        <ApiEndpoint
          method="POST"
          endpoint="sendCustomSMS(phone, message)"
          description="Send a custom SMS message to a single recipient (admin-only)"
          status="stable"
          parameters={[
            {
              name: "phone",
              type: "string",
              required: true,
              description:
                "US phone number (any format, auto-converted to E.164)",
            },
            {
              name: "message",
              type: "string",
              required: true,
              description: "Message text (max 160 characters)",
            },
          ]}
          returns="Promise<boolean> - true if sent successfully"
          examples={{
            javascript: `import { sendCustomSMS } from './services/smsService';

const sent = await sendCustomSMS(
  '512-555-0100',
  'Your solar proposal is ready! Check your email for details.'
);

if (sent) console.log('SMS sent successfully');`,
            curl: `curl -X POST \\
  'https://us-central1-power-to-the-people-vpp.cloudfunctions.net/sendSMS' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "data": {
      "phone": "+15125550100",
      "message": "Your solar proposal is ready!"
    }
  }'`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <ApiEndpoint
          method="POST"
          endpoint="sendBulkSMS(recipients, message)"
          description="Send the same SMS message to multiple recipients (max 100 per batch)"
          status="stable"
          parameters={[
            {
              name: "recipients",
              type: "string[]",
              required: true,
              description: "Array of phone numbers (max 100)",
            },
            {
              name: "message",
              type: "string",
              required: true,
              description: "Message text (max 160 characters)",
            },
          ]}
          returns="Promise<object> - { total, successful, failed }"
          responseExample={`{
  "total": 25,
  "successful": 23,
  "failed": 2
}`}
          examples={{
            javascript: `import { sendBulkSMS } from './services/smsService';

const result = await sendBulkSMS(
  ['512-555-0100', '512-555-0200', '512-555-0300'],
  'New solar incentives available! Reply YES for details.'
);

console.log(\`Sent: \${result.successful}/\${result.total}\`);`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <h2>SMS Templates</h2>
        <p>Pre-built message templates for common CRM workflows:</p>
        <CodeBlock
          language="javascript"
          code={`import { SMS_TEMPLATES } from './services/smsService';

// Enrollment confirmation
SMS_TEMPLATES.enrollmentConfirmation('John', 'proj_123');
// → "Hi John! Your solar enrollment (proj_123) has been received..."

// Enrollment approved
SMS_TEMPLATES.enrollmentApproved('John', '$142');
// → "Great news John! Your enrollment is approved. Est. savings: $142/mo"

// Referral reward
SMS_TEMPLATES.referralReward('John', '$500', 'Jane');
// → "Congrats John! You earned $500 for referring Jane..."

// Installation scheduled
SMS_TEMPLATES.installationScheduled('John', 'Mar 15', 'SunPower TX');
// → "John, your solar installation is scheduled for Mar 15 with SunPower TX"

// Payment reminder
SMS_TEMPLATES.paymentReminder('John', '$145', 'Feb 15');
// → "Reminder: $145 payment due Feb 15..."`}
          onCopy={(code) => copyToClipboard(code, "sms-templates")}
          copied={copiedCode === "sms-templates"}
        />

        <h2>Phone Number Utilities</h2>
        <CodeBlock
          language="javascript"
          code={`import { formatPhoneNumber, isValidPhoneNumber } from './services/smsService';

formatPhoneNumber('(512) 555-0100');  // → '+15125550100'
formatPhoneNumber('512.555.0100');    // → '+15125550100'

isValidPhoneNumber('+15125550100');   // → true
isValidPhoneNumber('123');            // → false`}
          onCopy={(code) => copyToClipboard(code, "sms-utils")}
          copied={copiedCode === "sms-utils"}
        />

        <ApiEndpoint
          method="GET"
          endpoint="getSmsStats()"
          description="Get SMS usage statistics including send counts and estimated costs"
          status="stable"
          parameters={[]}
          returns="Promise<object> - { total, successful, failed, estimatedCost, period }"
          responseExample={`{
  "total": 1250,
  "successful": 1223,
  "failed": 27,
  "estimatedCost": "$15.60",
  "period": "2026-02"
}`}
          examples={{
            javascript: `import { getSmsStats } from './services/smsService';

const stats = await getSmsStats();
console.log(\`Total SMS: \${stats.total} (\${stats.successful} delivered)\`);
console.log(\`Cost: \${stats.estimatedCost}\`);`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />
      </div>
    ),

    adminApi: (
      <div className="doc-section">
        <h1>Admin Dashboard API</h1>
        <p className="lead">
          Administrative endpoints for lead management, analytics, project
          tracking, and CRM operations. Requires admin-level Firebase Auth.
        </p>

        <ApiEndpoint
          method="GET"
          endpoint="getAdminStats()"
          description="Get comprehensive dashboard statistics aggregated across all leads and projects"
          status="stable"
          parameters={[]}
          returns="Promise<object> - AdminStats with counts, revenue, and growth metrics"
          responseExample={`{
  "totalProjects": 487,
  "residential": 432,
  "commercial": 55,
  "newThisMonth": 34,
  "activeCustomers": 312,
  "customerGrowth": 12.5,
  "totalCapacity": "4,250 kW",
  "estimatedRevenue": "$2,125,000",
  "avgLeadScore": 72
}`}
          examples={{
            javascript: `import { getAdminStats } from './services/adminService';

const stats = await getAdminStats();
console.log(\`Total Projects: \${stats.totalProjects}\`);
console.log(\`Revenue: \${stats.estimatedRevenue}\`);
console.log(\`Growth: +\${stats.customerGrowth}% this month\`);`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <ApiEndpoint
          method="GET"
          endpoint="getAdminProjects()"
          description="Get all leads (up to 500) ordered by creation date, normalized for admin display"
          status="stable"
          parameters={[]}
          returns="Promise<Array> - Normalized lead objects with computed fields"
          examples={{
            javascript: `import { getAdminProjects } from './services/adminService';

const projects = await getAdminProjects();
projects.forEach(p => {
  console.log(\`[\${p.status}] \${p.customerName} - \${p.systemSize}\`);
  console.log(\`  Score: \${p.leadScore} | Priority: \${p.priority}\`);
  console.log(\`  Type: \${p.leadType} | Source: \${p.source}\`);
});`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <ApiEndpoint
          method="PUT"
          endpoint="updateProjectStatus(leadId, newStatus)"
          description="Update a lead's status in the CRM pipeline"
          status="stable"
          parameters={[
            {
              name: "leadId",
              type: "string",
              required: true,
              description: "Lead document ID",
            },
            {
              name: "newStatus",
              type: "string",
              required: true,
              description: "New status value",
            },
          ]}
          returns="Promise<boolean>"
          examples={{
            javascript: `import { updateProjectStatus } from './services/adminService';

await updateProjectStatus('lead_abc123', 'qualified');`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <ApiEndpoint
          method="GET"
          endpoint="searchProjects(searchTerm)"
          description="Search leads by name, email, phone, address, or document ID"
          status="stable"
          parameters={[
            {
              name: "searchTerm",
              type: "string",
              required: true,
              description: "Search query (case-insensitive)",
            },
          ]}
          returns="Promise<Array> - Matching lead objects"
          examples={{
            javascript: `import { searchProjects } from './services/adminService';

const results = await searchProjects('john@example.com');
const byPhone = await searchProjects('512-555');
const byAddress = await searchProjects('Austin, TX');`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <h2>Lead Lifecycle Management</h2>
        <CodeBlock
          language="javascript"
          code={`import { LEAD_STATUS } from './services/leadsService';

// Available statuses
LEAD_STATUS = {
  NEW: 'new',
  QUALIFIED: 'qualified',
  CONTACTED: 'contacted',
  PROPOSAL_SENT: 'proposal_sent',
  SITE_VISIT_SCHEDULED: 'site_visit_scheduled',
  CONTRACT_SIGNED: 'contract_signed',
  CLOSED_WON: 'closed_won',
  CLOSED_LOST: 'closed_lost'
};

// Update status with validation
import { updateLeadStatus } from './services/leadsService';
await updateLeadStatus('lead_123', LEAD_STATUS.QUALIFIED);

// Assign to sales rep
import { assignLead } from './services/leadsService';
await assignLead('lead_123', 'user_abc');

// Add note
import { addLeadNote } from './services/leadsService';
await addLeadNote('lead_123', 'user_abc', 'Justin', 'Called customer, interested in 10kW system');

// Track progress milestones
import { updateLeadProgress } from './services/leadsService';
await updateLeadProgress('lead_123', 'proposalSent', true);`}
          onCopy={(code) => copyToClipboard(code, "lead-lifecycle")}
          copied={copiedCode === "lead-lifecycle"}
        />

        <h2>Lead Quality Scoring</h2>
        <div className="callout info">
          <BarChart3 size={20} />
          <div>
            <strong>Lead Score (0-100)</strong>
            <p>
              Leads are automatically scored based on: homeownership status,
              credit score, energy usage, system size potential, energy
              community eligibility, and source quality. Scores above 75 are
              flagged as high-value leads.
            </p>
          </div>
        </div>
      </div>
    ),

    commercialApi: (
      <div className="doc-section">
        <h1>Commercial Leads API</h1>
        <p className="lead">
          AI-powered commercial solar lead generation pipeline. Scrape
          commercial properties from Google Places, estimate energy consumption
          and system sizing, score leads, and batch import to Firestore.
        </p>

        <h2>Property Scraping</h2>
        <ApiEndpoint
          method="GET"
          endpoint="searchCommercialProperties(location, propertyType, radius)"
          description="Search Google Places API for commercial properties suitable for solar installation"
          status="stable"
          parameters={[
            {
              name: "location",
              type: "object",
              required: true,
              description: "{ name, lat, lng } of search center",
            },
            {
              name: "propertyType",
              type: "string",
              required: true,
              description:
                "'warehouse' | 'retail_center' | 'office_building' | 'industrial_park' | 'distribution_center' | 'self_storage'",
            },
            {
              name: "radius",
              type: "number",
              required: false,
              description: "Search radius in meters (default: 5000)",
            },
          ]}
          returns="Promise<Array> - Commercial property data with contact info"
          examples={{
            javascript: `import { searchCommercialProperties } from './services/commercialLeadScraper';

const properties = await searchCommercialProperties(
  { name: 'Las Vegas', lat: 36.1699, lng: -115.1398 },
  'warehouse',
  10000  // 10km radius
);

console.log(\`Found \${properties.length} warehouses\`);`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <ApiEndpoint
          method="POST"
          endpoint="scrapeLocation(location, propertyType, maxResults)"
          description="Full scrape pipeline: find properties, get details, estimate energy, calculate systems, and score leads"
          status="stable"
          parameters={[
            {
              name: "location",
              type: "object",
              required: true,
              description: "{ name, lat, lng }",
            },
            {
              name: "propertyType",
              type: "string",
              required: true,
              description: "Property type to scrape",
            },
            {
              name: "maxResults",
              type: "number",
              required: false,
              description: "Max results (default: 20)",
            },
          ]}
          returns="Promise<Array<CommercialLead>> - Fully scored commercial leads"
          responseExample={`[
  {
    "propertyName": "Desert Ridge Industrial",
    "propertyType": "warehouse",
    "priority": "high",
    "leadScore": 87,
    "address": {
      "street": "4500 Industrial Pkwy",
      "city": "Las Vegas",
      "state": "NV"
    },
    "metrics": {
      "buildingSqFt": 45000,
      "roofSqFt": 40500
    },
    "energyProfile": {
      "annualKwh": 675000,
      "monthlyBill": 6750,
      "annualBill": 81000
    },
    "solarSystem": {
      "recommendedPanels": 750,
      "systemSizeKw": 307.5,
      "annualProductionKwh": 553500,
      "systemCost": 461250,
      "federalTaxCredit": 138375,
      "netCost": 322875,
      "annualSavings": 66420,
      "paybackYears": 4.9
    }
  }
]`}
          examples={{
            javascript: `import { scrapeLocation } from './services/commercialLeadScraper';

const leads = await scrapeLocation(
  { name: 'Las Vegas', lat: 36.1699, lng: -115.1398 },
  'warehouse',
  50
);

// Filter high-priority leads
const hotLeads = leads.filter(l => l.priority === 'high');
console.log(\`\${hotLeads.length} high-priority leads found\`);
hotLeads.forEach(l => {
  console.log(\`  \${l.propertyName}: \${l.solarSystem.paybackYears}yr payback\`);
});`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <h2>Batch Import</h2>
        <ApiEndpoint
          method="POST"
          endpoint="importPropertiesBatch(properties, batchSize)"
          description="Batch import commercial leads to Firestore with deduplication and chunking"
          status="stable"
          parameters={[
            {
              name: "properties",
              type: "Array",
              required: true,
              description: "Array of commercial lead objects",
            },
            {
              name: "batchSize",
              type: "number",
              required: false,
              description: "Chunk size (default: 100)",
            },
          ]}
          returns="Promise<object> - { total, imported, duplicates, errors }"
          responseExample={`{
  "total": 150,
  "imported": 142,
  "duplicates": 6,
  "errors": 2
}`}
          examples={{
            javascript: `import { importPropertiesBatch } from './services/commercialLeadImporter';
import { scrapeAllNevada } from './services/commercialLeadScraper';

// Scrape all Nevada commercial properties
const allLeads = await scrapeAllNevada(15);

// Import to Firestore
const result = await importPropertiesBatch(allLeads);
console.log(\`Imported \${result.imported}/\${result.total} leads\`);
console.log(\`Duplicates skipped: \${result.duplicates}\`);`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <h2>Property Types & Markets</h2>
        <div className="collections-grid">
          <CollectionCard
            name="Warehouse"
            description="Large flat roofs, high energy usage, excellent solar candidates"
            fields={["40-200k sqft", "15-30 kWh/sqft/yr", "$0.08-0.12/kWh"]}
          />
          <CollectionCard
            name="Retail Center"
            description="Strip malls and shopping centers with significant HVAC loads"
            fields={["20-100k sqft", "20-40 kWh/sqft/yr", "$0.10-0.15/kWh"]}
          />
          <CollectionCard
            name="Office Building"
            description="Multi-story offices with moderate energy density"
            fields={["10-60k sqft", "15-25 kWh/sqft/yr", "$0.09-0.14/kWh"]}
          />
          <CollectionCard
            name="Industrial Park"
            description="Heavy industrial with high baseload and peak demand"
            fields={["50-500k sqft", "25-50 kWh/sqft/yr", "$0.07-0.11/kWh"]}
          />
        </div>
      </div>
    ),

    solriteApi: (
      <div className="doc-section">
        <h1>SolRite / SubHub Integration API</h1>
        <p className="lead">
          Integration with SubHub and SolRite for solar proposal creation,
          financing, utility verification, and customer enrollment. Supports the
          complete flow from contact creation through Solnova financing.
        </p>

        <h2>Customer Enrollment Flow</h2>
        <div className="status-flow">
          <span className="flow-badge pending">Create Contact</span>
          <ChevronRight size={16} className="flow-arrow" />
          <span className="flow-badge contacted">Create Proposal</span>
          <ChevronRight size={16} className="flow-arrow" />
          <span className="flow-badge qualified">Save Utility</span>
          <ChevronRight size={16} className="flow-arrow" />
          <span className="flow-badge proposal">Finance Products</span>
          <ChevronRight size={16} className="flow-arrow" />
          <span className="flow-badge contracted">Solnova Account</span>
          <ChevronRight size={16} className="flow-arrow" />
          <span className="flow-badge installed">Podio Sync</span>
        </div>

        <ApiEndpoint
          method="POST"
          endpoint="sendCustomerToSolRite(customerData, systemDesign)"
          description="Complete end-to-end enrollment flow: creates contact, proposal, saves utility data, and creates Solnova account"
          status="stable"
          parameters={[
            {
              name: "customerData",
              type: "object",
              required: true,
              description: "Customer contact and address information",
            },
            {
              name: "systemDesign",
              type: "object",
              required: true,
              description:
                "Solar system design with panels, production, and battery",
            },
          ]}
          returns="Promise<object> - { contactId, proposalId, optionId, status, message }"
          examples={{
            javascript: `import { sendCustomerToSolRite } from './services/solriteApi';

const result = await sendCustomerToSolRite(
  {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john@example.com',
    phone: '5125550100',
    street: '123 Solar St',
    city: 'Austin',
    state: 'TX',
    county: 'Travis',
    postalCode: '78701',
    utilityId: 3010,
    utilityName: 'Austin Energy'
  },
  {
    panels: { count: 28, systemSizeKw: 11.48, wattage: 410 },
    production: { annualKwh: 14250 },
    batteries: { totalCapacityKwh: 60 }
  }
);

console.log(\`Proposal ID: \${result.proposalId}\`);
console.log(\`Status: \${result.status}\`);`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <h2>SubHub Projects API</h2>
        <ApiEndpoint
          method="GET"
          endpoint="getProjects(limit, page)"
          description="Fetch paginated project list from SubHub API"
          status="stable"
          parameters={[
            {
              name: "limit",
              type: "number",
              required: false,
              description: "Results per page (default: 10)",
            },
            {
              name: "page",
              type: "number",
              required: false,
              description: "Page number (default: 1)",
            },
          ]}
          returns="Promise<object> - Paginated project data"
          examples={{
            javascript: `import { getProjects, parseSubHubProject } from './services/subhubApi';

const data = await getProjects(50, 1);
const normalized = data.projects.map(parseSubHubProject);

normalized.forEach(p => {
  console.log(\`\${p.address.full}: \${p.system.systemSizeKw} kW\`);
  console.log(\`  Production: \${p.production.annualKwh} kWh/yr\`);
  console.log(\`  Panels: \${p.system.panelCount}x \${p.system.panelName}\`);
});`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <h2>Finance Products</h2>
        <ApiEndpoint
          method="GET"
          endpoint="getFinanceProducts(proposalId)"
          description="Get available Solnova financing products for a proposal"
          status="stable"
          parameters={[
            {
              name: "proposalId",
              type: "string",
              required: true,
              description: "SubHub proposal ID",
            },
          ]}
          returns="Promise<Array> - Available financing options"
          examples={{
            javascript: `import { getFinanceProducts } from './services/solriteApi';

const products = await getFinanceProducts('prop_abc123');
products.forEach(p => {
  console.log(\`\${p.name}: \${p.apr}% APR, \${p.term} months\`);
});`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <h2>Texas Utilities</h2>
        <CodeBlock
          language="javascript"
          code={`import { TEXAS_UTILITIES } from './services/solriteApi';

// Pre-configured Texas utility providers
TEXAS_UTILITIES = [
  { id: 3010, name: 'Austin Energy' },
  { id: 3020, name: 'CPS Energy' },
  { id: 3030, name: 'Oncor' },
  { id: 3040, name: 'CenterPoint Energy' },
  { id: 3050, name: 'AEP Texas' },
  // ... 20+ more utilities
];`}
          onCopy={(code) => copyToClipboard(code, "tx-utilities")}
          copied={copiedCode === "tx-utilities"}
        />
      </div>
    ),

    coordinatorApi: (
      <div className="doc-section">
        <h1>Agent Coordinator API</h1>
        <p className="lead">
          Multi-agent orchestration system running on the Mac Studio
          (100.124.119.18:5050). Register agents, share task queues, send
          inter-agent messages, and monitor the Ava AI agent's status and
          activities.
        </p>

        <div className="callout info">
          <Bot size={20} />
          <div>
            <strong>Mac Studio (24/7 Server)</strong>
            <p>
              The coordinator runs on the Mac Studio via Tailscale at
              <code> http://100.124.119.18:5050</code>. All endpoints are
              available on the local Tailscale network.
            </p>
          </div>
        </div>

        <h2>Agent Registration</h2>
        <ApiEndpoint
          method="POST"
          endpoint="/coord/register"
          description="Register a new agent with the coordinator system"
          status="stable"
          parameters={[
            {
              name: "agent_id",
              type: "string",
              required: true,
              description: "Unique agent identifier",
            },
            {
              name: "agent_type",
              type: "string",
              required: true,
              description: "'claude-code' | 'gemini' | 'ava' | 'custom'",
            },
            {
              name: "description",
              type: "string",
              required: false,
              description: "What this agent is working on",
            },
          ]}
          returns="object - Registration confirmation"
          examples={{
            curl: `curl -X POST http://100.124.119.18:5050/coord/register \\
  -H 'Content-Type: application/json' \\
  -d '{
    "agent_id": "claude-macbook",
    "agent_type": "claude-code",
    "description": "Working on API documentation"
  }'`,
            javascript: `const response = await fetch('http://100.124.119.18:5050/coord/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent_id: 'claude-macbook',
    agent_type: 'claude-code',
    description: 'Working on API documentation'
  })
});`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <h2>Task Queue</h2>
        <ApiEndpoint
          method="GET"
          endpoint="/coord/tasks"
          description="Get shared task queue with optional status filter"
          status="stable"
          parameters={[
            {
              name: "status",
              type: "string",
              required: false,
              description: "'pending' | 'in_progress' | 'completed' | 'failed'",
            },
          ]}
          returns="Array - Task objects with status, priority, and assignment"
          examples={{
            curl: `# Get all pending tasks
curl 'http://100.124.119.18:5050/coord/tasks?status=pending'

# Get all tasks
curl 'http://100.124.119.18:5050/coord/tasks'`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <ApiEndpoint
          method="POST"
          endpoint="/coord/tasks"
          description="Add a new task to the shared queue"
          status="stable"
          parameters={[
            {
              name: "task",
              type: "string",
              required: true,
              description: "Task description",
            },
            {
              name: "priority",
              type: "string",
              required: false,
              description: "'high' | 'normal' | 'low' (default: 'normal')",
            },
            {
              name: "assigned_to",
              type: "string",
              required: false,
              description: "Agent ID to assign to",
            },
          ]}
          returns="object - Created task with ID"
          examples={{
            curl: `curl -X POST http://100.124.119.18:5050/coord/tasks \\
  -H 'Content-Type: application/json' \\
  -d '{
    "task": "Research Nevada solar incentives",
    "priority": "high",
    "assigned_to": "ava"
  }'`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <h2>Inter-Agent Messaging</h2>
        <ApiEndpoint
          method="POST"
          endpoint="/coord/messages"
          description="Send a message to another registered agent"
          status="stable"
          parameters={[
            {
              name: "from",
              type: "string",
              required: true,
              description: "Sender agent ID",
            },
            {
              name: "to",
              type: "string",
              required: true,
              description: "Recipient agent ID",
            },
            {
              name: "message",
              type: "string",
              required: true,
              description: "Message content",
            },
            {
              name: "type",
              type: "string",
              required: false,
              description: "Message type (e.g., 'context_save', 'task_update')",
            },
          ]}
          returns="object - Message confirmation"
          examples={{
            javascript: `// Send message to Ava
await fetch('http://100.124.119.18:5050/coord/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    from: 'claude-macbook',
    to: 'ava',
    message: 'Need solar research for Harris County, TX',
    type: 'task_request'
  })
});

// Check for responses
const msgs = await fetch(
  'http://100.124.119.18:5050/coord/messages?agent_id=claude-macbook'
).then(r => r.json());`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <h2>Ava AI Agent Status</h2>
        <ApiEndpoint
          method="GET"
          endpoint="/api/status (port 5055)"
          description="Get Ava's current status, task history, and activity feed"
          status="beta"
          parameters={[]}
          returns="Promise<object> - Ava status with tasks and activity"
          responseExample={`{
  "running": true,
  "tasks": {
    "total": 45,
    "completed": 38,
    "pending": 3,
    "in_progress": 2,
    "failed": 2
  },
  "activity": {
    "total": 156,
    "by_type": {
      "research": 45,
      "analysis": 32,
      "communication": 28,
      "learning": 51
    }
  }
}`}
          examples={{
            javascript: `import { getAvaStatus, getAvaTasks } from './services/avaService';

const status = await getAvaStatus();
if (status.running) {
  console.log('Ava is online');
  console.log(\`Tasks: \${status.tasks.completed}/\${status.tasks.total} completed\`);
}

const tasks = await getAvaTasks();
tasks.forEach(t => console.log(\`[\${t.status}] \${t.description}\`));`,
            curl: `# Check Ava status
curl http://100.124.119.18:5055/api/status

# System health
curl http://100.124.119.18:5050/health

# Full system onboarding
curl http://100.124.119.18:5050/coord/onboard`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <h2>System Endpoints</h2>
        <div className="coord-grid">
          <div className="coord-item">
            <strong>Health Check</strong>
            <span>GET /health</span>
          </div>
          <div className="coord-item">
            <strong>Onboard</strong>
            <span>GET /coord/onboard</span>
          </div>
          <div className="coord-item">
            <strong>List Agents</strong>
            <span>GET /coord/agents</span>
          </div>
          <div className="coord-item">
            <strong>Think (as Justin)</strong>
            <span>POST /think</span>
          </div>
          <div className="coord-item">
            <strong>Respond</strong>
            <span>POST /respond</span>
          </div>
          <div className="coord-item">
            <strong>Agent Tasks</strong>
            <span>GET /coord/tasks</span>
          </div>
        </div>
      </div>
    ),

    webhooks: (
      <div className="doc-section">
        <h1>Webhooks</h1>
        <p className="lead">
          Receive real-time notifications when events occur in your account.
          Webhooks are sent as HTTP POST requests with JSON payloads.
        </p>

        <h2>Available Events</h2>
        <div className="webhook-events">
          <div className="webhook-event">
            <code>lead.created</code>
            <p>
              Fired when a new lead is submitted via the qualification form.
            </p>
          </div>
          <div className="webhook-event">
            <code>lead.status_changed</code>
            <p>
              Fired when a lead's status changes (e.g., pending &rarr;
              qualified).
            </p>
          </div>
          <div className="webhook-event">
            <code>lead.assigned</code>
            <p>Fired when a lead is assigned to a sales representative.</p>
          </div>
          <div className="webhook-event">
            <code>referral.created</code>
            <p>Fired when a new referral is submitted.</p>
          </div>
          <div className="webhook-event">
            <code>referral.converted</code>
            <p>Fired when a referral results in a completed installation.</p>
          </div>
          <div className="webhook-event">
            <code>project.milestone</code>
            <p>
              Fired when a project reaches a milestone (permit, install, PTO).
            </p>
          </div>
        </div>

        <h2>Webhook Payload</h2>
        <CodeBlock
          language="javascript"
          code={`// Example: lead.status_changed payload
{
  "event": "lead.status_changed",
  "timestamp": "2026-02-06T14:30:00Z",
  "data": {
    "leadId": "lead_abc123",
    "previousStatus": "pending",
    "newStatus": "qualified",
    "lead": {
      "name": "John Smith",
      "email": "john@example.com",
      "address": "123 Solar St, Austin, TX",
      "systemDesign": {
        "panels": { "count": 28, "systemSizeKw": 11.48 },
        "production": { "annualKwh": 14250 }
      }
    }
  },
  "signature": "sha256=abc123..."  // HMAC signature for verification
}`}
          onCopy={(code) => copyToClipboard(code, "webhook-payload")}
          copied={copiedCode === "webhook-payload"}
        />

        <h2>Verifying Webhook Signatures</h2>
        <MultiLangCode
          examples={{
            javascript: `import crypto from 'crypto';

const verifyWebhook = (payload, signature, secret) => {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
};

// In your Express handler:
app.post('/webhook', (req, res) => {
  const sig = req.headers['x-webhook-signature'];
  if (!verifyWebhook(req.body, sig, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  // Process event...
  res.status(200).send('OK');
});`,
            python: `import hmac, hashlib, json

def verify_webhook(payload, signature, secret):
    expected = 'sha256=' + hmac.new(
        secret.encode(), json.dumps(payload).encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)

# In your Flask handler:
@app.route('/webhook', methods=['POST'])
def handle_webhook():
    sig = request.headers.get('X-Webhook-Signature')
    if not verify_webhook(request.json, sig, WEBHOOK_SECRET):
        abort(401)
    # Process event...
    return 'OK', 200`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <div className="callout info">
          <Globe size={20} />
          <div>
            <strong>Configuration</strong>
            <p>
              Configure webhook endpoints in the Admin Portal under Settings
              &rarr; Webhooks. You can subscribe to specific events and set
              custom headers.
            </p>
          </div>
        </div>
      </div>
    ),

    visualization: (
      <div className="doc-section">
        <h1>3D Visualization API</h1>
        <p className="lead">
          Render interactive 3D building models with solar panel overlays using
          Cesium and Google Photorealistic 3D Tiles.
        </p>

        <h2>Cesium Integration</h2>
        <CodeBlock
          language="javascript"
          code={`import { Viewer, Entity, Cesium3DTileset } from 'resium';
import { Cartesian3, Color } from 'cesium';

const RoofVisualizer3D = ({ latitude, longitude, solarPanels }) => (
  <Viewer>
    {/* Google Photorealistic 3D Tiles */}
    <Cesium3DTileset
      url="https://tile.googleapis.com/v1/3dtiles/root.json"
    />

    {/* Solar panels on roof */}
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
);`}
          onCopy={(code) => copyToClipboard(code, "cesium-3d")}
          copied={copiedCode === "cesium-3d"}
        />

        <h2>2D Roof Visualization</h2>
        <CodeBlock
          language="javascript"
          code={`import { fetchRgbImagery, calculatePanelProduction } from './services/solarApi';

const renderRoof = async (canvas, dataLayers, solarPanels) => {
  const imagery = await fetchRgbImagery(dataLayers.rgbUrl);
  const ctx = canvas.getContext('2d');

  // Draw satellite image
  ctx.putImageData(imagery.imageData, 0, 0);

  // Overlay panels (color-coded by production)
  solarPanels.forEach(panel => {
    ctx.fillStyle = panel.annualProductionKwh > 600
      ? 'rgba(34, 197, 94, 0.7)'   // Green (high)
      : panel.annualProductionKwh > 500
      ? 'rgba(234, 179, 8, 0.7)'   // Yellow (medium)
      : 'rgba(239, 68, 68, 0.7)';  // Red (low)
    ctx.fillRect(panel.pixelX, panel.pixelY, 10, 20);
  });
};`}
          onCopy={(code) => copyToClipboard(code, "2d-viz")}
          copied={copiedCode === "2d-viz"}
        />

        <h2>AI Preview Generation</h2>
        <CodeBlock
          language="javascript"
          code={`import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const generateSolarPreview = async (roofImageBase64, panelCount) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: roofImageBase64
      }
    },
    \`Generate a photorealistic preview of this roof with \${panelCount}
     solar panels installed. Show them neatly arranged.\`
  ]);

  return result.response.text();
};`}
          onCopy={(code) => copyToClipboard(code, "ai-preview")}
          copied={copiedCode === "ai-preview"}
        />
      </div>
    ),

    playground: (
      <div className="doc-section">
        <h1>API Playground</h1>
        <p className="lead">
          Test API endpoints with live data. Enter coordinates and parameters to
          see real responses from the Google Solar API and Firebase services.
        </p>

        <ApiPlayground />

        <div className="playground-tips">
          <h3>Sample Coordinates</h3>
          <div className="coord-grid">
            <div className="coord-item">
              <strong>Austin, TX</strong>
              <span>30.2672, -97.7431</span>
            </div>
            <div className="coord-item">
              <strong>Los Angeles, CA</strong>
              <span>34.0522, -118.2437</span>
            </div>
            <div className="coord-item">
              <strong>Miami, FL</strong>
              <span>25.7617, -80.1918</span>
            </div>
            <div className="coord-item">
              <strong>Phoenix, AZ</strong>
              <span>33.4484, -112.0740</span>
            </div>
          </div>
          <p style={{ marginTop: "1rem", color: "#94a3b8" }}>
            Average US home uses 10,000-15,000 kWh/year. Use target offset of
            1.0 for 100%.
          </p>
        </div>
      </div>
    ),

    sdks: (
      <div className="doc-section">
        <h1>SDKs & Libraries</h1>
        <p className="lead">
          Client libraries and tools for integrating with the Power to the
          People API.
        </p>

        <div className="sdk-grid">
          <div className="sdk-card">
            <div className="sdk-header">
              <Terminal size={24} />
              <div>
                <h3>JavaScript / Node.js</h3>
                <StatusBadge status="stable" />
              </div>
            </div>
            <p>
              Full-featured SDK with TypeScript support for browser and Node.js
              environments.
            </p>
            <CodeBlock
              language="bash"
              code={`npm install firebase axios geotiff proj4`}
              onCopy={(code) => copyToClipboard(code, "sdk-js")}
              copied={copiedCode === "sdk-js"}
            />
            <div className="sdk-links">
              <span>Firebase 12.8.0</span>
              <span>Axios 1.13.4</span>
              <span>GeoTIFF 2.1.4</span>
            </div>
          </div>

          <div className="sdk-card">
            <div className="sdk-header">
              <Terminal size={24} />
              <div>
                <h3>Python</h3>
                <StatusBadge status="stable" />
              </div>
            </div>
            <p>
              Firebase Admin SDK for server-side integration with Firestore,
              Auth, and Storage.
            </p>
            <CodeBlock
              language="bash"
              code={`pip install firebase-admin google-cloud-firestore requests`}
              onCopy={(code) => copyToClipboard(code, "sdk-py")}
              copied={copiedCode === "sdk-py"}
            />
            <div className="sdk-links">
              <span>firebase-admin 6.x</span>
              <span>requests 2.x</span>
            </div>
          </div>

          <div className="sdk-card">
            <div className="sdk-header">
              <Terminal size={24} />
              <div>
                <h3>REST API</h3>
                <StatusBadge status="stable" />
              </div>
            </div>
            <p>
              Direct HTTP access via cURL or any HTTP client. Works with any
              language.
            </p>
            <CodeBlock
              language="bash"
              code={`# Test connectivity
curl -s https://us-central1-power-to-the-people-vpp.cloudfunctions.net/health`}
              onCopy={(code) => copyToClipboard(code, "sdk-rest")}
              copied={copiedCode === "sdk-rest"}
            />
            <div className="sdk-links">
              <span>OpenAPI 3.0</span>
              <span>Postman Collection</span>
            </div>
          </div>

          <div className="sdk-card">
            <div className="sdk-header">
              <Terminal size={24} />
              <div>
                <h3>Cesium / 3D</h3>
                <StatusBadge status="stable" />
              </div>
            </div>
            <p>
              3D visualization with Cesium and Google Photorealistic 3D Tiles
              for roof rendering.
            </p>
            <CodeBlock
              language="bash"
              code={`npm install cesium resium vite-plugin-cesium`}
              onCopy={(code) => copyToClipboard(code, "sdk-cesium")}
              copied={copiedCode === "sdk-cesium"}
            />
            <div className="sdk-links">
              <span>Cesium 1.137</span>
              <span>Resium 1.19</span>
            </div>
          </div>
        </div>

        <h2>Postman Collection</h2>
        <p>
          Import the Postman collection for quick API testing with
          pre-configured endpoints and example data.
        </p>
        <CodeBlock
          language="bash"
          code={`# Download Postman collection
curl -O https://power-to-the-people-vpp.web.app/postman-collection.json

# Import via Postman CLI
newman run postman-collection.json --env-var "API_KEY=your_key"`}
          onCopy={(code) => copyToClipboard(code, "postman")}
          copied={copiedCode === "postman"}
        />
      </div>
    ),

    examples: (
      <div className="doc-section">
        <h1>Complete Code Examples</h1>

        <h2>Full Solar System Design Workflow</h2>
        <MultiLangCode
          examples={{
            javascript: `import {
  designSolarSystem, getDataLayers,
  fetchRgbImagery, fetchFluxData,
  calculatePanelProduction, calculateMonthlyProduction
} from './services/solarApi';
import proj4 from 'proj4';

const designSystemForProperty = async (address, annualUsage) => {
  // 1. Geocode address
  const { latitude, longitude } = await geocodeAddress(address);

  // 2. Design solar system
  const system = await designSolarSystem(latitude, longitude, annualUsage, 1.0);

  console.log(\`Panels: \${system.panels.count} x \${system.panels.wattage}W\`);
  console.log(\`System: \${system.panels.systemSizeKw} kW\`);
  console.log(\`Production: \${system.production.annualKwh} kWh/yr\`);

  // 3. Get imagery for visualization
  const dataLayers = await getDataLayers(latitude, longitude);
  const imagery = await fetchRgbImagery(dataLayers.rgbUrl);
  const fluxData = await fetchFluxData(dataLayers.annualFluxUrl);

  // 4. Per-panel production
  const utmProj = \`+proj=utm +zone=14 +datum=WGS84\`;
  const latLngToUtm = (lng, lat) => proj4('EPSG:4326', utmProj, [lng, lat]);

  const panelsWithProduction = calculatePanelProduction(
    system.solarPanels, fluxData,
    system.panelDimensions, system.panels.wattage, latLngToUtm
  );

  // 5. Monthly breakdown
  const monthlyProduction = calculateMonthlyProduction(
    system.production.annualKwh, latitude
  );

  return { system, imagery, panelsWithProduction, monthlyProduction };
};

const result = await designSystemForProperty('123 Solar St, Austin, TX', 14400);`,
            python: `import requests
import json

API_KEY = "YOUR_GOOGLE_API_KEY"

def design_solar_system(address, annual_usage=12000):
    # 1. Geocode address
    geo = requests.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        params={"address": address, "key": API_KEY}
    ).json()

    lat = geo["results"][0]["geometry"]["location"]["lat"]
    lng = geo["results"][0]["geometry"]["location"]["lng"]

    # 2. Get building insights
    insights = requests.get(
        "https://solar.googleapis.com/v1/buildingInsights:findClosest",
        params={
            "location.latitude": lat,
            "location.longitude": lng,
            "key": API_KEY
        }
    ).json()

    solar = insights["solarPotential"]
    max_panels = solar["maxArrayPanelsCount"]

    # 3. Calculate system
    panels_needed = min(max_panels, int(annual_usage / 500))
    system_kw = panels_needed * 0.41
    annual_production = panels_needed * 500

    return {
        "panels": panels_needed,
        "system_kw": round(system_kw, 2),
        "annual_kwh": annual_production,
        "battery_kwh": 60,
        "max_sunshine_hours": solar["maxSunshineHoursPerYear"]
    }

result = design_solar_system("123 Solar St, Austin, TX 78701", 14400)
print(json.dumps(result, indent=2))`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <h2>Lead Creation with System Design</h2>
        <CodeBlock
          language="javascript"
          code={`import { collection, addDoc } from 'firebase/firestore';
import { db } from './services/firebase';
import { designSolarSystem } from './services/solarApi';

const createLeadWithDesign = async (leadData) => {
  const system = await designSolarSystem(
    leadData.latitude, leadData.longitude,
    leadData.annualUsage || 12000
  );

  const monthlySavings = Math.round(system.production.monthlyKwh * 0.12);

  const docRef = await addDoc(collection(db, 'leads'), {
    ...leadData,
    systemDesign: {
      panels: system.panels,
      batteries: system.batteries,
      production: system.production
    },
    savings: {
      monthly: monthlySavings,
      annual: monthlySavings * 12,
      lifetime25Year: monthlySavings * 12 * 25
    },
    status: 'pending',
    createdAt: new Date()
  });

  return { id: docRef.id, system };
};`}
          onCopy={(code) => copyToClipboard(code, "lead-with-design")}
          copied={copiedCode === "lead-with-design"}
        />

        <h2>Real-time Project Status</h2>
        <CodeBlock
          language="javascript"
          code={`import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from './services/firebase';

// Subscribe to real-time updates
const subscribeToProject = (projectId, callback) => {
  return onSnapshot(doc(db, 'projects', projectId), (doc) => {
    if (doc.exists()) callback({ id: doc.id, ...doc.data() });
  });
};

// Update status
const updateProjectStatus = async (projectId, status, notes) => {
  await updateDoc(doc(db, 'projects', projectId), {
    status, notes, updatedAt: new Date(),
    timeline: { [status]: new Date() }
  });
};

// React usage
useEffect(() => {
  const unsub = subscribeToProject('project_123', setProjectData);
  return () => unsub();
}, []);`}
          onCopy={(code) => copyToClipboard(code, "realtime-updates")}
          copied={copiedCode === "realtime-updates"}
        />
      </div>
    ),

    rateLimiting: (
      <div className="doc-section">
        <h1>Rate Limits & Best Practices</h1>

        <h2>Rate Limits by Service</h2>
        <div className="rate-limit-table">
          <table className="params-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Free Tier</th>
                <th>Production</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>Google Solar API</code>
                </td>
                <td>1,000/day</td>
                <td>Custom</td>
                <td>Check Google Cloud Console</td>
              </tr>
              <tr>
                <td>
                  <code>Gemini API</code>
                </td>
                <td>60/min</td>
                <td>1,000/min</td>
                <td>Max 10MB per image</td>
              </tr>
              <tr>
                <td>
                  <code>Firestore Reads</code>
                </td>
                <td>50,000/day</td>
                <td>Pay-as-you-go</td>
                <td>Use listeners for real-time</td>
              </tr>
              <tr>
                <td>
                  <code>Firestore Writes</code>
                </td>
                <td>20,000/day</td>
                <td>Pay-as-you-go</td>
                <td>Use batch writes</td>
              </tr>
              <tr>
                <td>
                  <code>Cloud Functions</code>
                </td>
                <td>2M invocations/mo</td>
                <td>Pay-as-you-go</td>
                <td>125K GB-seconds free</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>Best Practices</h2>

        <h3>1. Cache Building Insights</h3>
        <CodeBlock
          language="javascript"
          code={`const cache = new Map();

const getBuildingInsightsCached = async (lat, lng) => {
  const key = \`\${lat.toFixed(4)},\${lng.toFixed(4)}\`;
  if (cache.has(key)) return cache.get(key);

  const insights = await getBuildingInsights(lat, lng);
  cache.set(key, insights);
  return insights;
};`}
          onCopy={(code) => copyToClipboard(code, "cache-bp")}
          copied={copiedCode === "cache-bp"}
        />

        <h3>2. Batch Firestore Operations</h3>
        <CodeBlock
          language="javascript"
          code={`import { writeBatch, doc, collection } from 'firebase/firestore';

const batchCreateLeads = async (leadsData) => {
  const batch = writeBatch(db);

  leadsData.forEach(data => {
    const ref = doc(collection(db, 'leads'));
    batch.set(ref, { ...data, createdAt: new Date(), status: 'pending' });
  });

  await batch.commit(); // Single network call
};`}
          onCopy={(code) => copyToClipboard(code, "batch-bp")}
          copied={copiedCode === "batch-bp"}
        />

        <h3>3. Retry with Exponential Backoff</h3>
        <CodeBlock
          language="javascript"
          code={`const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
};

const insights = await retryWithBackoff(() => getBuildingInsights(lat, lng));`}
          onCopy={(code) => copyToClipboard(code, "retry-bp")}
          copied={copiedCode === "retry-bp"}
        />

        <div className="callout warning">
          <Shield size={20} />
          <div>
            <strong>Security</strong>
            <p>
              Never expose API keys in client code. Use environment variables,
              server-side proxies, and Firebase Security Rules to protect data
              access.
            </p>
          </div>
        </div>
      </div>
    ),

    errorHandling: (
      <div className="doc-section">
        <h1>Error Handling</h1>

        <h2>Error Response Format</h2>
        <CodeBlock
          language="javascript"
          code={`{
  "error": {
    "code": "NOT_FOUND",
    "message": "Solar data not available for this location",
    "details": {
      "latitude": 0,
      "longitude": 0,
      "reason": "Location outside coverage area"
    }
  }
}`}
          onCopy={(code) => copyToClipboard(code, "error-format")}
          copied={copiedCode === "error-format"}
        />

        <h2>Common Error Codes</h2>
        <table className="params-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>HTTP Status</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>NOT_FOUND</code>
              </td>
              <td>404</td>
              <td>Resource or solar data not found</td>
            </tr>
            <tr>
              <td>
                <code>INVALID_LOCATION</code>
              </td>
              <td>400</td>
              <td>Invalid coordinates provided</td>
            </tr>
            <tr>
              <td>
                <code>QUOTA_EXCEEDED</code>
              </td>
              <td>429</td>
              <td>API rate limit exceeded</td>
            </tr>
            <tr>
              <td>
                <code>PERMISSION_DENIED</code>
              </td>
              <td>403</td>
              <td>Insufficient permissions</td>
            </tr>
            <tr>
              <td>
                <code>UNAUTHENTICATED</code>
              </td>
              <td>401</td>
              <td>Missing or invalid auth token</td>
            </tr>
            <tr>
              <td>
                <code>UNAVAILABLE</code>
              </td>
              <td>503</td>
              <td>Service temporarily unavailable</td>
            </tr>
          </tbody>
        </table>

        <h2>Error Handling Patterns</h2>
        <MultiLangCode
          examples={{
            javascript: `try {
  const insights = await getBuildingInsights(lat, lng);
} catch (error) {
  if (error.message.includes('not available')) {
    // No solar data for this location
    showFallbackEstimate();
  } else if (error.message.includes('quota')) {
    // Rate limited - retry later
    await retryWithBackoff(() => getBuildingInsights(lat, lng));
  } else if (error.message.includes('Invalid')) {
    // Bad coordinates
    showAddressInput();
  } else {
    console.error('Unexpected error:', error);
    showGenericError();
  }
}`,
            python: `try:
    response = requests.get(solar_url, params=params)
    response.raise_for_status()
    data = response.json()
except requests.exceptions.HTTPError as e:
    if e.response.status_code == 404:
        print("No solar data for this location")
    elif e.response.status_code == 429:
        print("Rate limited - retry later")
        time.sleep(60)
    else:
        print(f"API error: {e}")
except requests.exceptions.ConnectionError:
    print("Network error - check connection")`,
          }}
          onCopy={copyToClipboard}
          copiedId={copiedCode}
        />

        <h2>Graceful Degradation</h2>
        <CodeBlock
          language="javascript"
          code={`const designWithFallback = async (lat, lng, annualUsage) => {
  try {
    return await designSolarSystem(lat, lng, annualUsage);
  } catch (error) {
    // Return estimate based on usage alone
    const panelCount = Math.ceil(annualUsage / 500);
    return {
      panels: { count: panelCount, wattage: 410, systemSizeKw: (panelCount * 410) / 1000 },
      production: { annualKwh: annualUsage, monthlyKwh: Math.round(annualUsage / 12) },
      batteries: { brand: "Duracell PowerCenter Hybrid", totalCapacityKwh: 60 },
      isEstimate: true,
      estimateReason: error.message
    };
  }
};`}
          onCopy={(code) => copyToClipboard(code, "fallback-pattern")}
          copied={copiedCode === "fallback-pattern"}
        />
      </div>
    ),

    changelog: (
      <div className="doc-section">
        <h1>Changelog</h1>
        <p className="lead">Recent updates and changes to the API.</p>

        <div className="changelog-entries">
          <div className="changelog-entry">
            <div className="changelog-version">
              <span className="version-number">v2.1.0</span>
              <span className="version-date">February 6, 2026</span>
            </div>
            <div className="changelog-content">
              <h3>API Documentation Portal</h3>
              <ul>
                <li>
                  <span className="change-tag added">Added</span> Comprehensive
                  interactive API documentation portal
                </li>
                <li>
                  <span className="change-tag added">Added</span> Multi-language
                  code examples (JavaScript, Python, cURL)
                </li>
                <li>
                  <span className="change-tag added">Added</span> Webhook
                  documentation and signature verification
                </li>
                <li>
                  <span className="change-tag added">Added</span> SDK
                  installation guides
                </li>
                <li>
                  <span className="change-tag added">Added</span> API Playground
                  with live endpoint testing
                </li>
                <li>
                  <span className="change-tag improved">Improved</span>{" "}
                  Navigation with grouped sidebar sections
                </li>
                <li>
                  <span className="change-tag improved">Improved</span> Mobile
                  responsive design
                </li>
              </ul>
            </div>
          </div>

          <div className="changelog-entry">
            <div className="changelog-version">
              <span className="version-number">v2.0.0</span>
              <span className="version-date">January 2026</span>
            </div>
            <div className="changelog-content">
              <h3>Solar 2026 Industry Updates</h3>
              <ul>
                <li>
                  <span className="change-tag added">Added</span> IRS Energy
                  Community lookup (Notice 2025-31)
                </li>
                <li>
                  <span className="change-tag added">Added</span> Utility bill
                  scanner with Gemini 1.5 Pro AI
                </li>
                <li>
                  <span className="change-tag added">Added</span> Commercial
                  lead generation pipeline
                </li>
                <li>
                  <span className="change-tag added">Added</span> Installer
                  comparison database
                </li>
                <li>
                  <span className="change-tag improved">Improved</span> Lead
                  scoring algorithm with 0-100 scale
                </li>
                <li>
                  <span className="change-tag breaking">Breaking</span>{" "}
                  Residential ITC ended - lease/PPA now default
                </li>
              </ul>
            </div>
          </div>

          <div className="changelog-entry">
            <div className="changelog-version">
              <span className="version-number">v1.5.0</span>
              <span className="version-date">December 2025</span>
            </div>
            <div className="changelog-content">
              <h3>Referral System & 3D Visualization</h3>
              <ul>
                <li>
                  <span className="change-tag added">Added</span> Referral
                  program with tracking codes and earnings
                </li>
                <li>
                  <span className="change-tag added">Added</span> 3D roof
                  visualization with Cesium + Google 3D Tiles
                </li>
                <li>
                  <span className="change-tag added">Added</span> SMS
                  notification integration
                </li>
                <li>
                  <span className="change-tag improved">Improved</span> Google
                  Solar API integration with GeoTIFF support
                </li>
              </ul>
            </div>
          </div>

          <div className="changelog-entry">
            <div className="changelog-version">
              <span className="version-number">v1.0.0</span>
              <span className="version-date">October 2025</span>
            </div>
            <div className="changelog-content">
              <h3>Initial Release</h3>
              <ul>
                <li>
                  <span className="change-tag added">Added</span> Solar system
                  design with Google Solar API
                </li>
                <li>
                  <span className="change-tag added">Added</span> Firebase lead
                  management (CRUD)
                </li>
                <li>
                  <span className="change-tag added">Added</span> Address
                  autocomplete and geocoding
                </li>
                <li>
                  <span className="change-tag added">Added</span> Customer
                  portal with project tracking
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div
      className={`api-docs-container ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      {/* Sidebar */}
      <aside className="docs-sidebar">
        <div className="docs-logo">
          <Zap size={28} />
          <div className="logo-text">
            <h2>API Docs</h2>
            <span className="logo-version">v{API_VERSION}</span>
          </div>
        </div>

        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <nav className="docs-nav">
          {filteredGroups.map((group) => (
            <div key={group.id} className="nav-group">
              <button
                className="nav-group-header"
                onClick={() => toggleGroup(group.id)}
              >
                <span>{group.label}</span>
                {expandedGroups[group.id] ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
              {expandedGroups[group.id] && (
                <div className="nav-group-items">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        className={`nav-item ${activeSection === item.key ? "active" : ""}`}
                        onClick={() => {
                          setActiveSection(item.key);
                          // Scroll content to top
                          document
                            .querySelector(".docs-content")
                            ?.scrollTo(0, 0);
                        }}
                      >
                        <Icon size={16} />
                        <span>{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="docs-footer">
          <a href="/" className="footer-link">
            <ArrowLeft size={14} />
            Back to App
          </a>
          <a href="/admin" className="footer-link">
            <Shield size={14} />
            Admin Portal
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="docs-content">
        {sections[activeSection] || sections.introduction}
      </main>
    </div>
  );
};

// Code block component
const CodeBlock = ({ language, code, onCopy, copied }) => (
  <div className="code-block">
    <div className="code-header">
      <span className="code-language">{language}</span>
      <button className="copy-button" onClick={() => onCopy(code)}>
        {copied ? (
          <>
            <Check size={14} /> Copied!
          </>
        ) : (
          <>
            <Copy size={14} /> Copy
          </>
        )}
      </button>
    </div>
    <pre>
      <code>{code}</code>
    </pre>
  </div>
);

// API endpoint documentation component
const ApiEndpoint = ({
  method,
  endpoint,
  description,
  status,
  parameters,
  returns,
  responseExample,
  examples,
  onCopy,
  copiedId,
}) => {
  const [showResponse, setShowResponse] = useState(false);

  return (
    <div className="api-endpoint">
      <div className="endpoint-header">
        <span className={`method-badge ${method.toLowerCase()}`}>{method}</span>
        <code className="endpoint-path">{endpoint}</code>
        {status && <StatusBadge status={status} />}
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

      {responseExample && (
        <div className="endpoint-section">
          <button
            className="toggle-response"
            onClick={() => setShowResponse(!showResponse)}
          >
            {showResponse ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
            <span>Response Example</span>
          </button>
          {showResponse && (
            <CodeBlock
              language="json"
              code={responseExample}
              onCopy={(code) => onCopy(code, `resp-${endpoint}`)}
              copied={copiedId === `resp-${endpoint}`}
            />
          )}
        </div>
      )}

      {examples && (
        <div className="endpoint-section">
          <h4>Example</h4>
          {Object.keys(examples).length > 1 ? (
            <MultiLangCode
              examples={examples}
              onCopy={onCopy}
              copiedId={copiedId}
            />
          ) : (
            <CodeBlock
              language={Object.keys(examples)[0]}
              code={Object.values(examples)[0]}
              onCopy={(code) => onCopy(code, `ex-${endpoint}`)}
              copied={copiedId === `ex-${endpoint}`}
            />
          )}
        </div>
      )}
    </div>
  );
};

// Collection card component
const CollectionCard = ({ name, description, fields }) => (
  <div className="collection-card">
    <div className="collection-header">
      <Database size={18} />
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

export default ApiDocs;
