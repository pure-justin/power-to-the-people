# Power to the People App

Solar + Battery enrollment platform with **3D roof visualization** using Google Solar API and Cesium.

## Quick Start

```bash
cd ~/Documents/Claude-Assist/projects/power-to-the-people-app

# Install dependencies
npm install

# Start dev server (currently running on port 5174)
npm run dev
```

## Tech Stack

- **Frontend:** React 19, Vite 7
- **3D Rendering:** Cesium + Resium (Google Photorealistic 3D Tiles)
- **Solar API:** Google Solar API (building insights, GeoTIFF imagery, flux data)
- **GeoTIFF:** geotiff.js + proj4 for UTM coordinate conversion
- **Backend:** Firebase
- **Icons:** Lucide React

## Key Features

### Solar System Designer
- Fetches building insights from Google Solar API
- Renders actual satellite imagery (GeoTIFF) with solar panel overlays
- Calculates per-panel production using flux data
- Panels color-coded by energy production (green=high, yellow=medium, red=low)
- Interactive panel count stepper to adjust system size

### 3D Visualization (Cesium)
- Google Photorealistic 3D Tiles integration
- Real building geometry from Cesium Ion
- Solar panel placement on actual roof surface
- Camera controls for viewing from different angles

### AI Preview Generation (Gemini)
- Uses Gemini 2.0 Flash to generate photorealistic renders
- Combines satellite imagery with panel overlay
- Creates realistic solar installation previews

## Environment Variables

```bash
# .env
VITE_GOOGLE_MAPS_API_KEY=xxx    # Google Maps + Solar API
VITE_GEMINI_API_KEY=xxx          # AI preview generation
VITE_CESIUM_ION_TOKEN=xxx        # 3D Tiles access
```

## Project Structure

```
power-to-the-people-app/
├── src/
│   ├── components/
│   │   ├── RoofVisualizer.jsx      # 2D satellite view with panel overlay
│   │   ├── RoofVisualizer3D.jsx    # Cesium 3D view (in progress)
│   │   └── AddressAutocomplete.jsx # Google Places autocomplete
│   ├── pages/
│   │   ├── Home.jsx                # Landing page
│   │   ├── Qualify.jsx             # Qualification form
│   │   ├── Success.jsx             # Results with visualizer
│   │   ├── Portal.jsx              # Customer portal
│   │   └── ProjectStatus.jsx       # Track application
│   ├── services/
│   │   ├── solarApi.js             # Google Solar API integration
│   │   ├── addressService.js       # Address geocoding
│   │   ├── energyCommunity.js      # IRS energy community lookup
│   │   └── firebase.js             # Firebase config
│   └── hooks/
│       └── useGoogleMaps.js        # Maps script loader
├── vite.config.js                  # Cesium plugin configured
└── .env                            # API keys
```

## API Integration

### Google Solar API
- `getBuildingInsights()` - Roof analysis, panel capacity, sunshine hours
- `getDataLayers()` - GeoTIFF imagery URLs (RGB, flux, DSM)
- `fetchRgbImagery()` - Decode GeoTIFF satellite imagery
- `fetchFluxData()` - Per-pixel annual flux values
- `calculatePanelProduction()` - Per-panel kWh estimates

### Cesium Integration
- Uses `vite-plugin-cesium` for asset handling
- Cesium Ion token provides access to Google 3D Tiles (Asset ID 2275207)
- Resium provides React components for Cesium

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | Home | Landing page |
| `/qualify` | Qualify | Enrollment form |
| `/success` | Success | Results + visualizer |
| `/portal` | Portal | Customer login |
| `/project/:id` | ProjectStatus | Track application |

## Development Notes

### Coordinate Systems
- Google Solar API returns GeoTIFF in UTM projection
- Panel positions are in WGS84 (lat/lng)
- proj4 converts between coordinate systems

### Panel Positioning
- Panels sorted by production (highest first)
- Default shows 80% of max panels
- Stepper adjusts in increments of 4 panels (~1.6kW)

## Related Projects

- `power-to-the-people/` - Graffiti-themed marketing site (different project)
- `vpp-texas-website/` - Simpler VPP landing page (no 3D)
