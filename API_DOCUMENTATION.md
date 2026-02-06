# Power to the People - API Documentation

Complete API reference for the solar + battery enrollment platform with 3D visualization capabilities.

## 🚀 Quick Start

Visit the interactive API documentation portal at `/api-docs` to explore endpoints, test live data, and view code examples.

```bash
# Start the development server
npm run dev

# Navigate to API docs
open http://localhost:5173/api-docs
```

## 📚 Documentation Sections

### 1. Introduction
Overview of the Power to the People API, including:
- Solar system design capabilities
- Building insights from Google Solar API
- Project management with Firebase
- 3D visualization with Cesium

### 2. Authentication
Environment variable configuration for:
- Google Maps & Solar API
- Gemini AI API
- Cesium 3D Tiles
- Firebase services

### 3. Solar API Reference
Complete reference for solar system design endpoints:

#### Core Functions
- `getBuildingInsights(latitude, longitude)` - Fetch roof geometry and solar potential
- `calculateSystemDesign(buildingInsights, annualUsageKwh, targetOffset)` - Design optimal system
- `designSolarSystem(latitude, longitude, annualUsageKwh, targetOffset)` - End-to-end design
- `getDataLayers(latitude, longitude, radiusMeters, pixelSizeMeters)` - Get GeoTIFF imagery
- `calculatePanelProduction(panels, fluxData, panelDimensions, panelWattage, latLngToUtm)` - Per-panel production

### 4. Firebase API Reference
Database operations for:
- **Leads Collection**: Solar installation leads
- **Projects Collection**: Active installations
- **Referrals Collection**: Referral tracking
- **Commercial Leads Collection**: AI-generated leads

### 5. 3D Visualization API
Integration guides for:
- Cesium 3D viewer setup
- Google Photorealistic 3D Tiles
- Solar panel overlays
- 2D satellite imagery visualization

### 6. API Playground
Interactive testing environment with:
- Live endpoint execution
- Real Google Solar API data
- Parameter customization
- JSON response viewer

### 7. Code Examples
Production-ready examples for:
- Complete solar system design workflow
- Lead creation with system design
- Real-time project status updates
- Referral tracking implementation

## 🔧 System Specifications

### Solar Panels
- **Model**: Premium residential panels
- **Wattage**: 410W per panel
- **Efficiency**: 21%
- **Dimensions**: 1.134m × 2.278m (2.58 m²)

### Battery System
- **Model**: Duracell PowerCenter Hybrid
- **Capacity**: 60 kWh per installation
- **Peak Power**: 15.0 kW
- **Features**: Whole-home backup, smart load management, EV charging ready
- **Warranty**: 10 years

## 📊 API Endpoints Overview

### Solar API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `getBuildingInsights` | GET | Fetch building insights from Google Solar API |
| `calculateSystemDesign` | POST | Calculate optimal solar + battery system design |
| `designSolarSystem` | GET | Complete end-to-end system design |
| `getDataLayers` | GET | Get GeoTIFF imagery and solar flux data |
| `fetchRgbImagery` | GET | Fetch and decode satellite imagery |
| `fetchFluxData` | GET | Fetch solar flux data (kWh/kW/year) |
| `calculatePanelProduction` | POST | Calculate per-panel production estimates |
| `calculateOptimalPanelCount` | POST | Calculate optimal panel count for target offset |
| `calculateMonthlyProduction` | POST | Calculate monthly production distribution |

### Firebase API

| Collection | Operations | Description |
|------------|-----------|-------------|
| `leads` | CRUD | Solar installation leads and applications |
| `projects` | CRUD | Active solar installation projects |
| `referrals` | CRUD | Referral tracking and rewards |
| `commercialLeads` | CRUD | AI-generated commercial solar leads |

## 🎨 Features

### Interactive Documentation
- **Searchable sidebar** - Quick navigation to any section
- **Copy-to-clipboard** - One-click code copying
- **Syntax highlighting** - Beautiful code examples
- **Live playground** - Test APIs with real data

### Comprehensive Examples
- **Full workflows** - End-to-end implementation patterns
- **Error handling** - Robust error management
- **Best practices** - Production-ready code
- **Real-world scenarios** - Practical use cases

### Visual Design
- **Dark theme** - Easy on the eyes
- **Responsive layout** - Mobile-friendly
- **Smooth animations** - Polished interactions
- **Clear typography** - Easy to read

## 🔑 Environment Variables

Create a `.env` file with the following variables:

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

## 📖 Usage Examples

### Design a Solar System

```javascript
import { designSolarSystem } from './services/solarApi';

// Design system for Austin, TX property
const system = await designSolarSystem(
  30.2672,  // latitude
  -97.7431, // longitude
  14400,    // 14,400 kWh annual usage
  1.0       // 100% offset
);

console.log(`System Size: ${system.panels.systemSizeKw} kW`);
console.log(`Panels: ${system.panels.count} × ${system.panels.wattage}W`);
console.log(`Battery: ${system.batteries.totalCapacityKwh} kWh`);
console.log(`Annual Production: ${system.production.annualKwh} kWh`);
```

### Create a Lead with System Design

```javascript
import { collection, addDoc } from 'firebase/firestore';
import { db } from './services/firebase';
import { designSolarSystem } from './services/solarApi';

// Design system
const system = await designSolarSystem(
  leadData.latitude,
  leadData.longitude,
  leadData.annualUsage
);

// Create lead in Firestore
const docRef = await addDoc(collection(db, 'leads'), {
  name: leadData.name,
  email: leadData.email,
  phone: leadData.phone,
  address: leadData.address,
  systemDesign: {
    panels: system.panels,
    batteries: system.batteries,
    production: system.production
  },
  status: 'pending',
  createdAt: new Date()
});
```

### Visualize Solar Panels in 3D

```javascript
import { Viewer, Entity, Cesium3DTileset } from 'resium';
import { Cartesian3, Color } from 'cesium';

const RoofVisualizer3D = ({ latitude, longitude, solarPanels }) => {
  return (
    <Viewer>
      {/* Google Photorealistic 3D Tiles */}
      <Cesium3DTileset url="https://tile.googleapis.com/v1/3dtiles/root.json" />

      {/* Render solar panels */}
      {solarPanels.map((panel, idx) => (
        <Entity
          key={idx}
          position={Cartesian3.fromDegrees(
            panel.center.longitude,
            panel.center.latitude,
            panel.heightMeters
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

## 🧪 Testing with API Playground

The API Playground (`/api-docs` → "API Playground") allows you to test endpoints with real data:

1. Select an endpoint from the dropdown
2. Enter parameters (latitude, longitude, etc.)
3. Click "Execute API Call"
4. View the JSON response

**Example Test Locations:**
- Austin, TX: `30.2672, -97.7431`
- Los Angeles, CA: `34.0522, -118.2437`
- Miami, FL: `25.7617, -80.1918`

## 📐 System Design Logic

### Panel Configuration
1. Calculate production per panel based on location sun hours
2. Determine panels needed for target offset (default 105%)
3. Cap at maximum roof capacity
4. Ensure minimum viable system (4 panels)
5. Sort panels by production (highest first)

### Battery Configuration
Every installation includes:
- 60 kWh Duracell PowerCenter Hybrid
- 15 kW peak power output
- Whole-home backup capability
- Smart load management

### Production Estimation
```
Panel Production (kWh/year) = Flux (kWh/kW/year) × Panel Capacity (kW) × System Efficiency (90%)
```

## 🎯 Response Formats

### System Design Response
```json
{
  "panels": {
    "count": 28,
    "wattage": 410,
    "totalWatts": 11480,
    "systemSizeKw": 11.48,
    "brand": "Premium"
  },
  "batteries": {
    "brand": "Duracell PowerCenter Hybrid",
    "totalCapacityKwh": 60,
    "peakPowerKw": 15.0,
    "warranty": "10-year warranty"
  },
  "production": {
    "annualKwh": 14250,
    "monthlyKwh": 1188,
    "dailyKwh": 39.0
  },
  "usage": {
    "annualKwh": 12000,
    "monthlyKwh": 1000,
    "targetOffset": 105,
    "actualOffset": 119
  },
  "roof": {
    "totalAreaSqFt": 2500,
    "panelAreaSqFt": 776,
    "utilizationPercent": 31,
    "maxPanelsCapacity": 45,
    "sunshineHoursPerYear": 1850
  },
  "environmental": {
    "carbonOffsetTonsPerYear": 6.1,
    "treesEquivalent": 101,
    "milesNotDriven": 13820
  }
}
```

## 🔗 Related Documentation

- [Google Solar API Documentation](https://developers.google.com/maps/documentation/solar)
- [Firebase Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Cesium Documentation](https://cesium.com/docs/)
- [Resium Documentation](https://resium.reearth.io/)

## 🤝 Support

For questions or issues with the API:
1. Check the interactive documentation at `/api-docs`
2. Review the code examples section
3. Test endpoints in the API Playground
4. Contact the development team

## 📝 License

This API documentation is part of the Power to the People platform.

---

**Last Updated**: February 2026
**Version**: 1.0.0
**Maintainer**: Power to the People Development Team
