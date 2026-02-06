# API Quick Reference Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
# .env
VITE_GOOGLE_MAPS_API_KEY=your_key_here
VITE_FIREBASE_API_KEY=your_key_here
VITE_CESIUM_ION_TOKEN=your_token_here
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Access API Documentation
```
http://localhost:5173/api-docs
```

---

## 📚 Most Common Use Cases

### Design a Solar System
```javascript
import { designSolarSystem } from './services/solarApi';

const system = await designSolarSystem(
  30.2672,  // latitude
  -97.7431, // longitude
  12000,    // annual kWh usage
  1.0       // 100% offset
);

console.log(system.panels.count);           // 28 panels
console.log(system.production.annualKwh);   // 14,250 kWh
console.log(system.batteries.totalCapacityKwh); // 60 kWh
```

### Get Building Insights Only
```javascript
import { getBuildingInsights } from './services/solarApi';

const insights = await getBuildingInsights(30.2672, -97.7431);
console.log(insights.solarPotential.maxArrayPanelsCount); // 45
```

### Create a Lead in Firebase
```javascript
import { collection, addDoc } from 'firebase/firestore';
import { db } from './services/firebase';

const leadId = await addDoc(collection(db, 'leads'), {
  name: 'John Smith',
  email: 'john@example.com',
  phone: '512-555-0100',
  address: '123 Solar St, Austin, TX',
  annualUsage: 12000,
  status: 'pending',
  createdAt: new Date()
});
```

### Get Roof Imagery
```javascript
import { getDataLayers, fetchRgbImagery } from './services/solarApi';

const dataLayers = await getDataLayers(30.2672, -97.7431);
const imagery = await fetchRgbImagery(dataLayers.rgbUrl);

// imagery.imageData - Canvas ImageData object
// imagery.bounds - Geographic bounds
// imagery.width, imagery.height - Pixel dimensions
```

### Calculate Per-Panel Production
```javascript
import { 
  fetchFluxData, 
  calculatePanelProduction 
} from './services/solarApi';
import proj4 from 'proj4';

// Get flux data
const fluxData = await fetchFluxData(dataLayers.annualFluxUrl);

// Setup UTM conversion for Texas
const utmProj = '+proj=utm +zone=14 +datum=WGS84';
const latLngToUtm = (lng, lat) => proj4('EPSG:4326', utmProj, [lng, lat]);

// Calculate production for each panel
const panelsWithProduction = calculatePanelProduction(
  solarPanels,
  fluxData,
  { heightMeters: 2.278, widthMeters: 1.134 },
  410, // panel wattage
  latLngToUtm
);

// Sorted by production (highest first)
console.log(panelsWithProduction[0].annualProductionKwh); // 620 kWh
```

---

## 🎯 Panel & Battery Specs

### Premium Solar Panels
- **Wattage**: 410W per panel
- **Efficiency**: 21%
- **Dimensions**: 1.134m × 2.278m (2.58 m²)
- **Brand**: Premium residential panels

### Duracell PowerCenter Hybrid Battery
- **Capacity**: 60 kWh total per install
- **Peak Power**: 15.0 kW combined output
- **Warranty**: 10 years
- **Features**: 
  - Whole-home backup
  - Smart load management
  - Grid-tied with backup
  - EV charging ready

---

## 🗺️ Sample Coordinates

### Texas Cities
```javascript
// Austin
{ lat: 30.2672, lng: -97.7431 }

// Houston
{ lat: 29.7604, lng: -95.3698 }

// Dallas
{ lat: 32.7767, lng: -96.7970 }

// San Antonio
{ lat: 29.4241, lng: -98.4936 }
```

### Other Major Cities
```javascript
// Los Angeles
{ lat: 34.0522, lng: -118.2437 }

// Phoenix
{ lat: 33.4484, lng: -112.0740 }

// Miami
{ lat: 25.7617, lng: -80.1918 }
```

---

## 🔑 API Response Examples

### System Design Response
```javascript
{
  panels: {
    count: 28,
    wattage: 410,
    systemSizeKw: 11.48
  },
  production: {
    annualKwh: 14250,
    monthlyKwh: 1188
  },
  batteries: {
    totalCapacityKwh: 60,
    peakPowerKw: 15.0
  }
}
```

### Building Insights Response
```javascript
{
  solarPotential: {
    maxArrayPanelsCount: 45,
    maxSunshineHoursPerYear: 1850,
    roofSegmentStats: [...],
    solarPanels: [...]
  }
}
```

---

## ⚡ Error Handling

### Common Errors
```javascript
try {
  const system = await designSolarSystem(lat, lng, usage);
} catch (error) {
  if (error.message.includes('not available')) {
    // No solar data for this location
    console.error('Solar data unavailable');
  } else if (error.message.includes('Invalid')) {
    // Invalid coordinates
    console.error('Invalid coordinates');
  } else {
    // Other API errors
    console.error('API error:', error.message);
  }
}
```

---

## 📊 Firebase Collections

### leads
```javascript
{
  name: string,
  email: string,
  phone: string,
  address: string,
  annualUsage: number,
  systemDesign: object,
  status: 'pending' | 'qualified' | 'installing' | 'complete',
  createdAt: Date
}
```

### projects
```javascript
{
  leadId: string,
  status: string,
  installDate: Date,
  systemSize: number,
  timeline: object,
  notes: string
}
```

### referrals
```javascript
{
  referrerId: string,
  refereeId: string,
  status: 'pending' | 'completed',
  reward: number,
  createdAt: Date,
  completedAt: Date
}
```

---

## 🌐 API Endpoints Reference

| Function | Parameters | Returns |
|----------|-----------|---------|
| `getBuildingInsights()` | lat, lng | Building insights |
| `designSolarSystem()` | lat, lng, usage, offset | Complete system |
| `getDataLayers()` | lat, lng, radius, pixelSize | Imagery URLs |
| `fetchRgbImagery()` | rgbUrl | ImageData + bounds |
| `fetchFluxData()` | fluxUrl | Flux data array |
| `calculatePanelProduction()` | panels, flux, dims, wattage, convert | Sorted panels |

---

## 🎨 Styling & UI

### Colors (CSS Variables)
```css
--primary-blue: #3b82f6
--primary-purple: #8b5cf6
--success-green: #10b981
--error-red: #ef4444
--dark-bg: #0f172a
```

### Responsive Breakpoints
- Desktop: > 1024px
- Tablet: 640px - 1024px
- Mobile: < 640px

---

## 📞 Support

- Documentation: http://localhost:5173/api-docs
- GitHub: [Repository Link]
- Email: support@powertothepeople.com

**Last Updated**: February 6, 2026
