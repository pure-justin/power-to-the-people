# ⚡ API Portal Quick Start Guide

## 🎯 5-Minute Quick Start

### Step 1: Access the Portal
```bash
npm run dev
open http://localhost:5173/api-docs
```

### Step 2: Explore the Sections
Click through the sidebar:
- 📖 **Introduction** - Start here
- 🔑 **Authentication** - Setup guide
- ⚡ **Solar API** - 9 endpoints
- 🗄️ **Firebase API** - 4 collections
- 🎨 **3D Visualization** - Cesium guide
- 🎮 **API Playground** - Live testing
- 💻 **Code Examples** - Copy & paste

### Step 3: Test Your First API
1. Click **"API Playground"** in sidebar
2. Endpoint: **"Design Solar System"**
3. Coordinates: `30.2672, -97.7431` (Austin)
4. Usage: `12000` kWh
5. Click **"Execute API Call"**
6. View complete system design! 🎉

### Step 4: Copy Production Code
1. Navigate to **"Code Examples"**
2. Find **"Complete Solar System Design"**
3. Click **"Copy"** button
4. Paste into your project
5. Start building! 🚀

---

## 📍 What's at Each Section?

### Introduction
- Platform overview
- Quick start checklist
- Key features showcase

### Authentication
- Environment variables
- Firebase setup
- API key configuration

### Solar API
- 9 documented endpoints
- Parameter specs
- Code examples
- One-click copying

### Firebase API
- 4 collection schemas
- CRUD operations
- Real-time listeners
- Query patterns

### 3D Visualization
- Cesium setup
- Google 3D Tiles
- Panel overlays

### API Playground
- Live endpoint testing
- Real-time responses
- No Postman needed!

### Code Examples
- Complete workflows
- Production patterns
- Error handling

---

## 🎮 Playground Quick Test

### Test Building Insights
```javascript
Endpoint: getBuildingInsights()
Latitude: 30.2672
Longitude: -97.7431

Result: Roof geometry, solar potential
```

### Test System Design
```javascript
Endpoint: designSolarSystem()
Latitude: 30.2672
Longitude: -97.7431
Annual Usage: 12000 kWh
Target Offset: 1.0 (100%)

Result: Complete system with panels + battery
```

---

## 💻 Copy Your First Code Example

Navigate to **Solar API → designSolarSystem()**:

```javascript
import { designSolarSystem } from './services/solarApi';

const system = await designSolarSystem(
  30.2672,   // latitude
  -97.7431,  // longitude
  12000,     // annual kWh
  1.0        // 100% offset
);

console.log(`${system.panels.count} panels`);
console.log(`${system.production.annualKwh} kWh/year`);
```

Click the **Copy** button and you're ready to build!

---

## 🔍 Search Like a Pro

1. Click the **search box** at top of sidebar
2. Type: `battery`
3. Sections filter instantly
4. Click any section to jump there

Try these searches:
- `battery` - Battery specs and code
- `firebase` - Database operations
- `cesium` - 3D visualization
- `production` - Energy calculations
- `panel` - Panel configurations

---

## ⚡ Power User Tips

1. **Quick Navigation**: Use the sidebar for instant jumps
2. **Copy All Code**: Every example has a copy button
3. **Test Everything**: Playground supports 3 endpoints
4. **Search First**: Find docs faster than scrolling
5. **Check Errors**: Browser console shows details

---

## 🚀 Start Building Now!

You're ready to use the API portal:

✅ **Documentation** - Complete reference
✅ **Examples** - Production-ready code
✅ **Testing** - Live playground
✅ **Search** - Find anything
✅ **Copy** - One-click code

**Access**: http://localhost:5173/api-docs

**Happy coding!** 🎉

---

**Version**: 1.0.0
**Status**: Production Ready
