# Power to the People API Documentation

Complete API reference for the solar + battery enrollment platform with 3D visualization, utility bill scanning, and comprehensive system design capabilities.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Solar System Design API](#solar-system-design-api)
4. [Utility Bill Scanner API](#utility-bill-scanner-api)
5. [Address & Location API](#address--location-api)
6. [Firebase API](#firebase-api)
7. [3D Visualization](#3d-visualization)
8. [Rate Limits & Best Practices](#rate-limits--best-practices)
9. [Error Handling](#error-handling)

## Quick Start

### Access the Interactive Documentation

Visit the live API documentation portal:
```
http://localhost:5173/api-docs
```

### Installation

```bash
npm install
npm run dev
```

### Environment Variables

Create a `.env` file:

```bash
# Google APIs
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
VITE_FIREBASE_APP_ID=your_app_id
```

## Authentication

All API calls use environment variable-based authentication. No user authentication required for solar design endpoints.

### Firebase Initialization

```javascript
import { initializeApp } from 'firebase/app';
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
export const auth = getAuth(app);
```

## Solar System Design API

### Core Functions

#### `getBuildingInsights(latitude, longitude)`

Fetch building insights from Google Solar API.

**Parameters:**
- `latitude` (number): Property latitude
- `longitude` (number): Property longitude

**Returns:** `Promise<object>` - Building insights with roof geometry and solar potential

**Example:**
```javascript
import { getBuildingInsights } from './services/solarApi';

const insights = await getBuildingInsights(30.2672, -97.7431);
console.log('Max panels:', insights.solarPotential.maxArrayPanelsCount);
console.log('Sun hours/year:', insights.solarPotential.maxSunshineHoursPerYear);
```

#### `designSolarSystem(latitude, longitude, annualUsageKwh, targetOffset)`

Complete end-to-end solar system design.

**Parameters:**
- `latitude` (number): Property latitude
- `longitude` (number): Property longitude
- `annualUsageKwh` (number, optional): Annual usage (default: 12000)
- `targetOffset` (number, optional): Target offset (default: 1.0 = 100%)

**Returns:** `Promise<object>` - Complete system design

**Example:**
```javascript
import { designSolarSystem } from './services/solarApi';

const system = await designSolarSystem(
  30.2672,  // Austin, TX
  -97.7431,
  14400,    // 14,400 kWh/year
  1.0       // 100% offset
);

console.log(`System: ${system.panels.count} x ${system.panels.wattage}W panels`);
console.log(`Production: ${system.production.annualKwh} kWh/year`);
console.log(`Battery: ${system.batteries.totalCapacityKwh} kWh`);
```

#### `calculateSystemDesign(buildingInsights, annualUsageKwh, targetOffset)`

Calculate system design from existing building insights.

**Parameters:**
- `buildingInsights` (object): Building insights from `getBuildingInsights()`
- `annualUsageKwh` (number): Annual electricity usage
- `targetOffset` (number, optional): Target offset (default: 1.05 = 105%)

**Returns:** `object` - System design with panels, battery, production

**Example:**
```javascript
import { getBuildingInsights, calculateSystemDesign } from './services/solarApi';

const insights = await getBuildingInsights(30.2672, -97.7431);
const system = calculateSystemDesign(insights, 12000, 1.05);

console.log(system.panels);      // Panel configuration
console.log(system.batteries);   // Battery specs
console.log(system.production);  // Production estimates
console.log(system.roof);        // Roof statistics
```

### Advanced Functions

#### `getDataLayers(latitude, longitude, radiusMeters, pixelSizeMeters)`

Get GeoTIFF imagery URLs for visualization.

**Example:**
```javascript
import { getDataLayers, fetchRgbImagery, fetchFluxData } from './services/solarApi';

const dataLayers = await getDataLayers(30.2672, -97.7431);
const imagery = await fetchRgbImagery(dataLayers.rgbUrl);
const fluxData = await fetchFluxData(dataLayers.annualFluxUrl);
```

#### `calculatePanelProduction(panels, fluxData, panelDimensions, panelWattage, latLngToUtm)`

Calculate per-panel production using solar flux data.

**Example:**
```javascript
import { calculatePanelProduction } from './services/solarApi';
import proj4 from 'proj4';

const utmZone = 14;
const utmProj = `+proj=utm +zone=${utmZone} +datum=WGS84`;
const latLngToUtm = (lng, lat) => proj4('EPSG:4326', utmProj, [lng, lat]);

const panelsWithProduction = calculatePanelProduction(
  solarPanels,
  fluxData,
  { heightMeters: 2.278, widthMeters: 1.134 },
  410,
  latLngToUtm
);

// Sorted by production (highest first)
console.log('Top panel production:', panelsWithProduction[0].annualProductionKwh, 'kWh');
```

## Utility Bill Scanner API

### `POST /api/scan-bill`

Extract usage data from utility bill images using Gemini Vision AI.

**Endpoint:** `https://your-vercel-app.vercel.app/api/scan-bill`

**Request Body:**
```json
{
  "data": {
    "imageBase64": "base64_encoded_image_data",
    "mediaType": "image/jpeg"
  }
}
```

**Response:**
```json
{
  "success": true,
  "billData": {
    "isValidBill": true,
    "accountNumber": "123456789",
    "customerName": "John Smith",
    "serviceAddress": "123 Solar St, Austin, TX 78701",
    "utilityCompany": "Austin Energy",
    "utilityType": "electric",
    "esiid": "10123456789012345678",
    "currentUsageKwh": 1200,
    "usageHistory": [
      { "month": "January", "year": 2024, "kWh": 1500 }
    ],
    "totalAmountDue": 145.67,
    "ratePerKwh": 0.12,
    "confidence": 0.95
  },
  "consumptionData": {
    "annualConsumption": 14400,
    "monthsWithData": 12,
    "dataQuality": "excellent",
    "monthlyConsumption": [...]
  }
}
```

**Example:**
```javascript
const scanUtilityBill = async (imageFile) => {
  const reader = new FileReader();
  const base64Promise = new Promise((resolve) => {
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
  });
  reader.readAsDataURL(imageFile);
  const imageBase64 = await base64Promise;

  const response = await fetch('/api/scan-bill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: { imageBase64, mediaType: imageFile.type }
    })
  });

  return response.json();
};
```

## Address & Location API

### `getCurrentLocation()`

Get user's current location via browser geolocation.

**Returns:** `Promise<object>` - Parsed address with coordinates

**Example:**
```javascript
import { getCurrentLocation } from './services/addressService';

try {
  const location = await getCurrentLocation();
  console.log('Address:', location.formattedAddress);
  console.log('Coordinates:', location.lat, location.lng);
  console.log('County:', location.county);
} catch (error) {
  console.error('Location error:', error.message);
}
```

### `parseGoogleAddress(place)`

Parse Google Places autocomplete result.

**Example:**
```javascript
import { parseGoogleAddress } from './services/addressService';

const onPlaceSelected = (place) => {
  const parsed = parseGoogleAddress(place);
  console.log({
    streetAddress: parsed.streetAddress,
    city: parsed.city,
    county: parsed.county,
    state: parsed.state,
    zipCode: parsed.zipCode,
    lat: parsed.lat,
    lng: parsed.lng
  });
};
```

### Energy Community Lookup

#### `checkEnergyCommunity(county, state)`

Check if county qualifies for IRS Energy Community tax credits.

**Example:**
```javascript
import { checkEnergyCommunity } from './services/energyCommunity';

const result = checkEnergyCommunity('Harris', 'TX');

if (result.isEnergyCommunity) {
  console.log(`Qualifies! MSA: ${result.msa}`);
  const taxCredit = systemCost * 0.40; // 40% ITC instead of 30%
}
```

## Firebase API

### Lead Management

```javascript
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from './services/firebase';

// Create lead
const createLead = async (leadData) => {
  const docRef = await addDoc(collection(db, 'leads'), {
    ...leadData,
    status: 'pending',
    createdAt: new Date()
  });
  return docRef.id;
};

// Get lead
const getLead = async (leadId) => {
  const docRef = doc(db, 'leads', leadId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};
```

### Collections Structure

| Collection | Description | Key Fields |
|------------|-------------|------------|
| `leads` | Solar installation leads | name, email, phone, address, systemDesign, status |
| `projects` | Active installations | leadId, status, installDate, systemSize |
| `referrals` | Referral tracking | referrerId, refereeId, status, reward |
| `commercialLeads` | Commercial prospects | businessName, industry, estimatedUsage |

## 3D Visualization

### Cesium Integration

```javascript
import { Viewer, Entity, Cesium3DTileset } from 'resium';
import { Cartesian3, Color } from 'cesium';

const RoofVisualizer3D = ({ latitude, longitude, solarPanels }) => {
  return (
    <Viewer>
      <Cesium3DTileset url="https://tile.googleapis.com/v1/3dtiles/root.json" />

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
};
```

## Rate Limits & Best Practices

### API Rate Limits

| Service | Rate Limit | Quota |
|---------|-----------|--------|
| Google Solar API | 1,000 requests/day | Free tier |
| Gemini API | 60 requests/minute | 10MB max |
| Firebase Firestore | 50K reads, 20K writes/day | Free tier |

### Best Practices

#### 1. Cache Building Insights
```javascript
const cachedInsights = new Map();

const getBuildingInsightsCached = async (lat, lng) => {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cachedInsights.has(key)) return cachedInsights.get(key);

  const insights = await getBuildingInsights(lat, lng);
  cachedInsights.set(key, insights);
  return insights;
};
```

#### 2. Debounce User Input
```javascript
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};
```

#### 3. Retry with Exponential Backoff
```javascript
const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};
```

## Error Handling

### Common Error Patterns

```javascript
// Solar API errors
try {
  const insights = await getBuildingInsights(lat, lng);
} catch (error) {
  if (error.message.includes('not available')) {
    alert('Solar data not available for this location');
  } else if (error.message.includes('quota')) {
    alert('Service temporarily unavailable');
  }
}

// Firebase errors
try {
  await addDoc(collection(db, 'leads'), leadData);
} catch (error) {
  if (error.code === 'permission-denied') {
    console.error('Insufficient permissions');
  }
}

// Geolocation errors
try {
  const location = await getCurrentLocation();
} catch (error) {
  if (error.message.includes('denied')) {
    setShowAddressInput(true);
  }
}
```

### Graceful Degradation

```javascript
const designSystemWithFallback = async (lat, lng, annualUsage) => {
  try {
    return await designSolarSystem(lat, lng, annualUsage);
  } catch (error) {
    // Return estimated system based on usage only
    const panelCount = Math.ceil(annualUsage / 500);
    return {
      panels: { count: panelCount, wattage: 410 },
      production: { annualKwh: annualUsage },
      batteries: { totalCapacityKwh: 60 },
      isEstimate: true
    };
  }
};
```

## Support

- **Live Documentation:** http://localhost:5173/api-docs
- **API Playground:** Interactive testing environment included
- **GitHub:** https://github.com/your-repo/power-to-the-people

---

**Last Updated:** 2026-02-06
**Version:** 1.0.0
