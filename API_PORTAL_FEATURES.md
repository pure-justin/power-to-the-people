# 🎯 API Portal Features Overview

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                    Power to the People API Docs                 │
├────────────────┬────────────────────────────────────────────────┤
│                │                                                 │
│  🔍 Search     │              📚 Introduction                   │
│  ─────────     │                                                 │
│                │  Welcome to the Power to the People API...     │
│  📖 Intro      │                                                 │
│  🔑 Auth       │  ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│  ⚡ Solar      │  │ ⚡ Solar  │ │ 🗄️ Data   │ │ 🔧 Project│   │
│  🗄️ Firebase   │  │  System   │ │  Building │ │  Tracking │   │
│  🎨 3D Viz     │  │  Design   │ │  Insights │ │  System   │   │
│  🎮 Playground │  └───────────┘ └───────────┘ └───────────┘   │
│  💻 Examples   │                                                 │
│                │  Quick Start:                                   │
│  ─────────     │  1. Get API keys                               │
│  🔗 GitHub     │  2. Initialize Firebase                        │
│                │  3. Import services                             │
│                │  4. Make API calls                              │
└────────────────┴────────────────────────────────────────────────┘
```

## Key Features by Section

### 1. Introduction ✨
- Platform overview with feature cards
- Quick start guide (4 steps)
- System capabilities
- Architecture diagram

### 2. Authentication 🔑
```javascript
// Environment setup
VITE_GOOGLE_MAPS_API_KEY=xxx
VITE_FIREBASE_API_KEY=xxx
VITE_CESIUM_ION_TOKEN=xxx

// Firebase initialization
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
```

### 3. Solar API ⚡

**7 Documented Functions:**

1. **getBuildingInsights(lat, lng)**
   ```javascript
   // Returns: Building solar potential
   {
     maxArrayPanelsCount: 45,
     maxSunshineHoursPerYear: 1850,
     roofSegmentStats: [...],
     solarPanels: [...]
   }
   ```

2. **designSolarSystem(lat, lng, usage, offset)**
   ```javascript
   // Complete system design
   {
     panels: { count: 28, systemSizeKw: 11.48 },
     batteries: { totalCapacityKwh: 60 },
     production: { annualKwh: 14250 }
   }
   ```

3. **getDataLayers(lat, lng)**
   - Returns GeoTIFF imagery URLs
   - Satellite RGB imagery
   - Solar flux data (kWh/kW/year)
   - Digital Surface Model (DSM)

4. **fetchRgbImagery(url)**
   - Decodes GeoTIFF to ImageData
   - Geographic bounds in UTM
   - Pixel dimensions

5. **fetchFluxData(url)**
   - Annual solar flux per pixel
   - kWh/kW/year values
   - UTM projection

6. **calculatePanelProduction(panels, flux, dims, wattage, convert)**
   - Per-panel production estimates
   - Sorted by production (highest first)
   - System efficiency (90%)

7. **calculateMonthlyProduction(annualKwh, lat)**
   - Monthly breakdown
   - Seasonal adjustments
   - Latitude-based factors

### 4. Firebase API 🗄️

**Collections Documented:**

```javascript
// leads
{
  name, email, phone, address,
  annualUsage, systemDesign, status,
  createdAt, updatedAt
}

// projects
{
  leadId, status, installDate,
  systemSize, timeline, notes
}

// referrals
{
  referrerId, refereeId, status,
  reward, createdAt, completedAt
}

// commercialLeads
{
  businessName, industry,
  estimatedUsage, contact,
  source, confidence
}
```

**Operations:**
- ✅ Create lead with system design
- ✅ Get lead by ID
- ✅ Update project status
- ✅ Real-time status subscriptions
- ✅ Referral tracking

### 5. 3D Visualization 🎨

**Cesium Integration:**
```javascript
<Viewer>
  {/* Google Photorealistic 3D Tiles */}
  <Cesium3DTileset url="https://tile.googleapis.com/v1/3dtiles/root.json" />
  
  {/* Solar panels as entities */}
  {panels.map(panel => (
    <Entity
      position={Cartesian3.fromDegrees(lng, lat, height)}
      box={{ dimensions: new Cartesian3(1.134, 2.278, 0.05) }}
    />
  ))}
</Viewer>
```

**2D Canvas Rendering:**
```javascript
// Draw satellite imagery
ctx.putImageData(imagery.imageData, 0, 0);

// Overlay color-coded panels
panels.forEach(panel => {
  const color = getProductionColor(panel.annualProductionKwh);
  ctx.fillStyle = color; // Green/Yellow/Red
  ctx.fillRect(x, y, width, height);
});
```

### 6. API Playground 🎮

**Interactive Testing:**
```
┌─────────────────────────────────────────┐
│ Select Endpoint:                        │
│ [Get Building Insights ▼]               │
│ Fetch solar potential data for property │
├─────────────────────────────────────────┤
│ Latitude:  [30.2672    ]                │
│ Longitude: [-97.7431   ]                │
├─────────────────────────────────────────┤
│         [▶ Execute API Call]            │
├─────────────────────────────────────────┤
│ ✅ Success                               │
│ {                                        │
│   "solarPotential": {                   │
│     "maxArrayPanelsCount": 45,          │
│     "maxSunshineHoursPerYear": 1850     │
│   }                                      │
│ }                                        │
└─────────────────────────────────────────┘
```

**Test Locations:**
- Austin, TX: 30.2672, -97.7431
- Los Angeles, CA: 34.0522, -118.2437
- Miami, FL: 25.7617, -80.1918

### 7. Code Examples 💻

**Complete Workflows:**

1. **Full System Design**
   ```javascript
   const result = await designSystemForProperty(
     '123 Solar St, Austin, TX',
     14400
   );
   // Returns: system, imagery, panels, monthlyProduction
   ```

2. **Lead Creation**
   ```javascript
   const lead = await createLeadWithSystemDesign({
     name: 'John Smith',
     address: '123 Solar St',
     annualUsage: 14400
   });
   // Automatically calculates system & savings
   ```

3. **Real-time Updates**
   ```javascript
   const unsubscribe = subscribeToProject(
     'project_123',
     (project) => {
       console.log('Status:', project.status);
     }
   );
   ```

## Component Features

### Search Functionality
- Real-time filtering
- Searches section titles
- Highlights matching sections
- Smooth navigation

### Code Blocks
- Syntax highlighting
- Copy-to-clipboard buttons
- Language indicators
- Line wrapping
- Scrollable overflow

### Method Badges
```css
GET    → Green  (#10b981)
POST   → Blue   (#60a5fa)
PUT    → Orange (#f59e0b)
DELETE → Red    (#ef4444)
```

### Parameter Tables
```
┌──────────┬────────┬──────────┬─────────────────────┐
│ Name     │ Type   │ Required │ Description         │
├──────────┼────────┼──────────┼─────────────────────┤
│ latitude │ number │ Required │ Property latitude   │
│ longitude│ number │ Required │ Property longitude  │
│ usage    │ number │ Optional │ Annual kWh (12000)  │
└──────────┴────────┴──────────┴─────────────────────┘
```

### Response Examples
```json
{
  "panels": {
    "count": 28,
    "wattage": 410,
    "systemSizeKw": 11.48
  },
  "production": {
    "annualKwh": 14250
  },
  "batteries": {
    "totalCapacityKwh": 60
  }
}
```

## Design Features

### Dark Theme
- Background: #0f172a → #1e293b gradient
- Cards: rgba(30, 41, 59, 0.4)
- Borders: rgba(71, 85, 105, 0.5)
- Text: #e2e8f0 (light slate)

### Gradients
```css
/* Primary gradient */
background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);

/* Success gradient */
background: linear-gradient(135deg, #10b981 0%, #059669 100%);
```

### Animations
- Hover lift effects
- Smooth color transitions
- Spin animations for loading
- Fade-in for content

### Responsive Breakpoints
```css
@media (max-width: 1024px) { /* Tablet */ }
@media (max-width: 640px)  { /* Mobile */ }
```

## Performance Features

### Optimizations
- ✅ Lazy loading for heavy components
- ✅ Code splitting by section
- ✅ Minimal re-renders
- ✅ Cached API responses
- ✅ Debounced search

### Loading States
```javascript
{loading ? (
  <Loader className="spin" />
) : (
  <Results data={data} />
)}
```

### Error Handling
```javascript
try {
  const data = await fetchData();
  setResult(data);
} catch (error) {
  setError(error.message);
}
```

## Accessibility Features

### Keyboard Navigation
- Tab through all interactive elements
- Enter to execute actions
- Escape to close modals
- Arrow keys in playground

### Screen Readers
- Semantic HTML
- ARIA labels where needed
- Clear heading hierarchy
- Descriptive alt text

### Color Contrast
- WCAG AA compliant
- High contrast text
- Clear focus indicators
- Status colors distinguishable

## Mobile Experience

### Touch Optimizations
- Large tap targets (44px minimum)
- Swipe-friendly code blocks
- Mobile-optimized tables
- Condensed spacing

### Mobile Layout
```
┌─────────────────┐
│   🌟 API Docs   │ ← Collapsed nav
├─────────────────┤
│                 │
│  📚 Content     │ ← Full width
│                 │
│  [Code Block]   │ ← Scrollable
│                 │
└─────────────────┘
```

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile Safari
- ✅ Chrome Mobile

## Future Enhancements

### Planned Features
- [ ] Dark/Light theme toggle
- [ ] Export as PDF
- [ ] Code playground with editor
- [ ] API rate limit monitor
- [ ] Webhook documentation
- [ ] Multi-language support
- [ ] Version history
- [ ] Interactive tutorials

### SDK Additions
- [ ] Python SDK examples
- [ ] Ruby SDK examples
- [ ] Go SDK examples
- [ ] REST API examples

## Summary Statistics

- **Total Lines**: 2,239 lines (JSX + CSS)
- **API Endpoints**: 10+ documented
- **Code Examples**: 15+ complete workflows
- **Collections**: 4 Firebase collections
- **Sections**: 7 major sections
- **Components**: 4 React components
- **CSS Rules**: 648 lines of styling
- **Test Cases**: 3 live endpoints

**Status**: ✅ Production Ready
**Last Updated**: February 6, 2026
