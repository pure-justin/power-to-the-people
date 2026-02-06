# 🌟 Power to the People - API Documentation Portal

## Overview

A comprehensive, interactive API documentation portal built with React that provides developers with everything they need to integrate with the Power to the People solar + battery system design platform.

![Status: Production Ready](https://img.shields.io/badge/status-production%20ready-success)
![React](https://img.shields.io/badge/react-19-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 📚 Complete API Documentation
- **7 Major Sections**: Introduction, Authentication, Solar API, Firebase API, 3D Visualization, API Playground, Code Examples
- **10+ Documented Endpoints**: Full parameter specs, return types, and usage examples
- **4 Firebase Collections**: Complete schema documentation
- **Real-time Search**: Instantly filter documentation sections

### 🎮 Interactive API Playground
- Live testing environment
- Test with real coordinates
- View formatted JSON responses
- Built-in error handling
- Pre-loaded example locations (Austin, LA, Miami)

### 💻 Production-Ready Code Examples
- Full system design workflow
- Lead creation with system design
- Real-time project status updates
- 3D visualization with Cesium
- Firebase integration patterns

### 🎨 Modern UI/UX
- Dark theme with gradient accents
- Responsive design (desktop, tablet, mobile)
- Smooth animations and transitions
- Copy-to-clipboard for all code samples
- Syntax highlighting

## 🚀 Quick Start

### Access the Portal

**Development**: http://localhost:5173/api-docs
**Production**: https://your-domain.com/api-docs

### Run the Dev Server

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Navigate to /api-docs
```

## 📖 Documentation Sections

### 1. Introduction
- Platform overview
- Quick start guide
- Key features and capabilities
- System requirements

### 2. Authentication
- Environment variable configuration
- Firebase initialization
- API key management
- Security best practices

### 3. Solar API
Complete documentation for:
- `getBuildingInsights()` - Fetch building solar data
- `calculateSystemDesign()` - Design optimal system
- `designSolarSystem()` - End-to-end design
- `getDataLayers()` - Get GeoTIFF imagery
- `fetchRgbImagery()` - Decode satellite imagery
- `fetchFluxData()` - Get solar flux data
- `calculatePanelProduction()` - Per-panel estimates

### 4. Firebase API
Documentation for:
- Lead management (create, read, update)
- Project tracking (status updates, timeline)
- Referral system (tracking, attribution)
- Commercial leads (AI-generated)

### 5. 3D Visualization
- Cesium integration guide
- Google 3D Tiles setup
- 2D roof visualization
- Panel overlay rendering
- Color-coded production maps

### 6. API Playground
Interactive testing for:
- Get Building Insights
- Design Solar System
- Get Data Layers

### 7. Code Examples
Complete workflows:
- Full solar system design
- Lead creation with design
- Real-time status updates
- 3D visualization implementation

## 🛠 Technical Architecture

### Frontend Stack
```javascript
{
  framework: "React 19",
  routing: "React Router DOM",
  icons: "Lucide React",
  styling: "Custom CSS",
  state: "React Hooks"
}
```

### APIs Integrated
```javascript
{
  solar: "Google Solar API",
  maps: "Google Maps API",
  database: "Firebase Firestore",
  auth: "Firebase Auth",
  storage: "Firebase Storage",
  3d: "Cesium + Google 3D Tiles"
}
```

### Key Technologies
- **geotiff.js** - GeoTIFF decoding
- **proj4** - Coordinate transformation
- **Resium** - React components for Cesium
- **Firebase SDK** - Backend integration

## 📊 Data Models

### System Design Response
```typescript
interface SystemDesign {
  panels: {
    count: number;
    wattage: 410;
    systemSizeKw: number;
  };
  batteries: {
    brand: "Duracell PowerCenter Hybrid";
    totalCapacityKwh: 60;
    peakPowerKw: 15.0;
  };
  production: {
    annualKwh: number;
    monthlyKwh: number;
    dailyKwh: number;
  };
  roof: {
    totalAreaSqFt: number;
    panelAreaSqFt: number;
    utilizationPercent: number;
  };
  environmental: {
    carbonOffsetTonsPerYear: number;
    treesEquivalent: number;
    milesNotDriven: number;
  };
}
```

## 🎯 Common Use Cases

### Design a Solar System
```javascript
import { designSolarSystem } from './services/solarApi';

const system = await designSolarSystem(
  30.2672,  // Austin, TX latitude
  -97.7431, // longitude
  12000,    // 12,000 kWh annual usage
  1.0       // 100% offset target
);

console.log(`System: ${system.panels.count} panels, ${system.panels.systemSizeKw} kW`);
console.log(`Production: ${system.production.annualKwh} kWh/year`);
console.log(`Battery: ${system.batteries.totalCapacityKwh} kWh`);
```

### Create a Lead
```javascript
import { collection, addDoc } from 'firebase/firestore';
import { db } from './services/firebase';

const lead = await addDoc(collection(db, 'leads'), {
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '512-555-0100',
  address: '123 Solar St, Austin, TX',
  annualUsage: 14400,
  systemDesign: system, // from above
  status: 'pending',
  createdAt: new Date()
});
```

### Fetch Roof Imagery
```javascript
import { getDataLayers, fetchRgbImagery } from './services/solarApi';

const dataLayers = await getDataLayers(30.2672, -97.7431);
const imagery = await fetchRgbImagery(dataLayers.rgbUrl);

// Use imagery.imageData with Canvas API
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
ctx.putImageData(imagery.imageData, 0, 0);
```

## 🔧 Configuration

### Required Environment Variables
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

### Google Solar API Setup
1. Enable Solar API in Google Cloud Console
2. Create API key with Solar API access
3. Add key to environment variables
4. Test with example coordinates

### Firebase Setup
1. Create Firebase project
2. Enable Firestore Database
3. Enable Authentication
4. Create collections: `leads`, `projects`, `referrals`
5. Configure security rules

### Cesium Setup
1. Create account at cesium.com
2. Generate access token
3. Enable Google 3D Tiles (Asset ID: 2275207)
4. Add token to environment

## 📱 Responsive Design

### Desktop (> 1024px)
- Full sidebar navigation
- Wide content area
- Multi-column layouts
- Large code blocks

### Tablet (640px - 1024px)
- Sidebar above content
- Single column layouts
- Optimized spacing

### Mobile (< 640px)
- Stacked navigation
- Touch-friendly controls
- Condensed code blocks
- Simplified tables

## 🎨 Design System

### Color Palette
```css
/* Primary */
--blue: #3b82f6;
--purple: #8b5cf6;
--gradient: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);

/* Status */
--success: #10b981;
--error: #ef4444;
--warning: #f59e0b;

/* Backgrounds */
--dark-bg: #0f172a;
--dark-card: #1e293b;

/* Text */
--text-primary: #e2e8f0;
--text-secondary: #cbd5e1;
--text-tertiary: #94a3b8;
```

### Typography
- **Headings**: System fonts, 600-700 weight
- **Body**: System fonts, 400-500 weight
- **Code**: Monaco, Courier New (monospace)

## 📁 File Structure

```
src/
├── pages/
│   └── ApiDocs.jsx              # Main documentation page (1,143 lines)
├── components/
│   └── ApiPlayground.jsx        # Interactive API testing (218 lines)
├── styles/
│   ├── ApiDocs.css              # Documentation styles (648 lines)
│   └── ApiPlayground.css        # Playground styles (230 lines)
└── services/
    ├── solarApi.js              # Solar API service (593 lines)
    ├── addressService.js        # Geocoding service (163 lines)
    ├── energyCommunity.js       # Energy community lookup (200 lines)
    └── firebase.js              # Firebase configuration
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] All navigation links work
- [ ] Search filters sections correctly
- [ ] Code copy buttons function
- [ ] API Playground executes calls
- [ ] Responses display properly
- [ ] Mobile layout works
- [ ] All code examples are valid
- [ ] External links open correctly

### Test Coordinates
```javascript
// Austin, TX - Great solar potential
{ lat: 30.2672, lng: -97.7431 }

// Los Angeles, CA - High production
{ lat: 34.0522, lng: -118.2437 }

// Miami, FL - Tropical climate
{ lat: 25.7617, lng: -80.1918 }
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Hosting
```bash
# Firebase Hosting
firebase deploy --only hosting

# Vercel
vercel --prod

# Netlify
netlify deploy --prod
```

## 📈 Performance

### Optimizations
- Lazy loading for code examples
- Optimized imagery loading
- Cached GeoTIFF data
- Minimal re-renders
- Code splitting

### Metrics
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.0s
- **Largest Contentful Paint**: < 2.5s

## 🔐 Security

### Best Practices
- Environment variables for secrets
- API key restrictions by domain
- Firebase security rules
- CORS configuration
- Rate limiting

### API Key Security
```javascript
// ✅ GOOD - Environment variables
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// ❌ BAD - Hardcoded keys
const apiKey = "AIza...";
```

## 🤝 Contributing

### Adding New Endpoints
1. Add endpoint function to service file
2. Document in `ApiDocs.jsx` sections object
3. Add to API Playground if applicable
4. Create code example
5. Update this README

### Style Guidelines
- Follow existing CSS patterns
- Use CSS variables for colors
- Maintain responsive design
- Test on multiple devices

## 📝 Changelog

### v1.0.0 - February 6, 2026
- ✅ Initial release
- ✅ Complete API documentation
- ✅ Interactive playground
- ✅ Production-ready code examples
- ✅ Mobile responsive design
- ✅ Search functionality

## 📞 Support

### Resources
- **Documentation**: http://localhost:5173/api-docs
- **Quick Reference**: API_QUICK_REFERENCE.md
- **Portal Summary**: API_PORTAL_SUMMARY.md

### Contact
- Email: support@powertothepeople.com
- GitHub Issues: [Repository Link]

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ by the Power to the People Team**

*Last Updated: February 6, 2026*
