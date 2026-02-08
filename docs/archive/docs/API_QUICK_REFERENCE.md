# API Quick Reference Card

## 🔗 Portal Access
```
http://localhost:5173/api-docs
```

## ⚡ Solar API - Key Functions

### Get Building Insights
```javascript
import { getBuildingInsights } from './services/solarApi';
const insights = await getBuildingInsights(30.2672, -97.7431);
```

### Design Complete System
```javascript
import { designSolarSystem } from './services/solarApi';
const system = await designSolarSystem(
  30.2672,   // latitude
  -97.7431,  // longitude
  12000,     // annual kWh
  1.0        // 100% offset
);
```

### Get Satellite Imagery
```javascript
import { getDataLayers, fetchRgbImagery } from './services/solarApi';
const layers = await getDataLayers(30.2672, -97.7431);
const imagery = await fetchRgbImagery(layers.rgbUrl);
```

## 🔥 Firebase API - Key Operations

### Create Lead
```javascript
import { collection, addDoc } from 'firebase/firestore';
import { db } from './services/firebase';

await addDoc(collection(db, 'leads'), {
  name: 'John Smith',
  email: 'john@example.com',
  address: '123 Solar St',
  systemDesign: system,
  status: 'pending',
  createdAt: new Date()
});
```

### Get Lead by ID
```javascript
import { doc, getDoc } from 'firebase/firestore';
const docSnap = await getDoc(doc(db, 'leads', leadId));
const lead = { id: docSnap.id, ...docSnap.data() };
```

### Real-time Updates
```javascript
import { doc, onSnapshot } from 'firebase/firestore';
const unsubscribe = onSnapshot(doc(db, 'projects', projectId), (doc) => {
  console.log('Project updated:', doc.data());
});
```

## 🎨 3D Visualization

### Cesium Viewer
```javascript
import { Viewer, Entity } from 'resium';
import { Cartesian3 } from 'cesium';

<Viewer>
  <Entity
    position={Cartesian3.fromDegrees(lng, lat, height)}
    box={{
      dimensions: new Cartesian3(1.134, 2.278, 0.05),
      material: Color.BLUE.withAlpha(0.8)
    }}
  />
</Viewer>
```

## 📊 System Specifications

| Component | Specification |
|-----------|--------------|
| **Solar Panel** | 410W premium residential |
| **Panel Size** | 1.134m × 2.278m (2.58 m²) |
| **Battery** | 60 kWh Duracell PowerCenter Hybrid |
| **Peak Power** | 15 kW |
| **Efficiency** | 21% panel, 90% system |

## 🌍 Test Coordinates

| Location | Latitude | Longitude |
|----------|----------|-----------|
| Austin, TX | 30.2672 | -97.7431 |
| Los Angeles, CA | 34.0522 | -118.2437 |
| Miami, FL | 25.7617 | -80.1918 |
| Phoenix, AZ | 33.4484 | -112.0740 |
| Denver, CO | 39.7392 | -104.9903 |

## 🔑 Environment Variables

```bash
VITE_GOOGLE_MAPS_API_KEY=your_key
VITE_GEMINI_API_KEY=your_key
VITE_CESIUM_ION_TOKEN=your_token
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_PROJECT_ID=your_project_id
```

## 📁 File Locations

```
src/
├── pages/ApiDocs.jsx              # Documentation portal
├── components/ApiPlayground.jsx   # Interactive testing
├── services/
│   ├── solarApi.js               # Solar API functions
│   ├── firebase.js               # Firebase config
│   └── referralService.js        # Referral tracking
└── styles/
    ├── ApiDocs.css               # Portal styles
    └── ApiPlayground.css         # Playground styles
```

## 🎯 Quick Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Preview production build
npm run preview
```

## 🔍 Common Patterns

### Error Handling
```javascript
try {
  const system = await designSolarSystem(lat, lng, usage);
  console.log('Success:', system);
} catch (error) {
  if (error.message.includes('not available')) {
    console.log('No solar data for this location');
  } else {
    console.error('API Error:', error.message);
  }
}
```

### Loading States
```javascript
const [loading, setLoading] = useState(false);
const [data, setData] = useState(null);

const loadData = async () => {
  setLoading(true);
  try {
    const result = await designSolarSystem(...);
    setData(result);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};
```

### Production Calculation
```javascript
// Annual production per panel
const annualKwh = fluxValue * (panelWattage / 1000) * 0.9;

// Monthly average
const monthlyKwh = annualKwh / 12;

// Daily average
const dailyKwh = annualKwh / 365;
```

## 📊 Response Structure

### System Design Object
```javascript
{
  panels: { count, wattage, systemSizeKw },
  batteries: { brand, totalCapacityKwh, peakPowerKw },
  production: { annualKwh, monthlyKwh, dailyKwh },
  usage: { annualKwh, actualOffset },
  roof: { totalAreaSqFt, utilizationPercent },
  environmental: { carbonOffsetTonsPerYear, treesEquivalent }
}
```

## 🎮 Playground Usage

1. Navigate to `/api-docs`
2. Click "API Playground"
3. Select endpoint
4. Enter parameters
5. Click "Execute API Call"
6. View JSON response

## 💡 Pro Tips

- Use playground to test before implementing
- Copy code examples as starting points
- Test with multiple locations for accuracy
- Check browser console for detailed errors
- System offset defaults to 105% (1.05)
- Minimum system is 4 panels

## 📚 Documentation Sections

1. **Introduction** - Overview and quick start
2. **Authentication** - API keys and Firebase setup
3. **Solar API** - Complete endpoint reference
4. **Firebase API** - Database operations
5. **3D Visualization** - Cesium integration
6. **API Playground** - Live testing
7. **Code Examples** - Production-ready patterns

## 🔗 External Resources

- [Google Solar API](https://developers.google.com/maps/documentation/solar)
- [Firebase Docs](https://firebase.google.com/docs)
- [Cesium Docs](https://cesium.com/docs)
- [Resium Docs](https://resium.reearth.io)

---

**Quick Reference v1.0** | Updated: February 2026
