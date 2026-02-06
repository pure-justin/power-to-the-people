// Test specific address with flux-based production calculation
import { fromArrayBuffer } from 'geotiff'
import proj4 from 'proj4'

const GOOGLE_API_KEY = 'AIzaSyAQmnBuAgoJYvx25EJnvl2PNPCS80CBUGY'

// Test address
const ADDRESS = '1225 North Saint James Road, Pilot Point, TX 76258'
const PANELS = 15
const PANEL_WATTS = 410

async function geocodeAddress(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`
  const response = await fetch(url)
  const data = await response.json()
  if (data.results && data.results[0]) {
    const loc = data.results[0].geometry.location
    return { lat: loc.lat, lng: loc.lng }
  }
  throw new Error('Could not geocode address')
}

async function getBuildingInsights(lat, lng) {
  const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${GOOGLE_API_KEY}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Building insights failed: ${response.status} - ${err}`)
  }
  return response.json()
}

async function getDataLayers(lat, lng) {
  const url = `https://solar.googleapis.com/v1/dataLayers:get?location.latitude=${lat}&location.longitude=${lng}&radiusMeters=50&view=FULL_LAYERS&requiredQuality=HIGH&pixelSizeMeters=0.1&key=${GOOGLE_API_KEY}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Data layers failed: ${response.status}`)
  }
  return response.json()
}

async function fetchFluxData(fluxUrl) {
  const url = `${fluxUrl}&key=${GOOGLE_API_KEY}`
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const tiff = await fromArrayBuffer(arrayBuffer)
  const image = await tiff.getImage()

  const bounds = image.getBoundingBox()
  const width = image.getWidth()
  const height = image.getHeight()
  const [fluxData] = await image.readRasters()

  return { data: fluxData, bounds, width, height }
}

function getUtmZone(lng) {
  return Math.floor((lng + 180) / 6) + 1
}

function createLatLngToUtm(lng) {
  const zone = getUtmZone(lng)
  const utmProj = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`
  return (lon, lat) => proj4('EPSG:4326', utmProj, [lon, lat])
}

async function main() {
  console.log(`Address: ${ADDRESS}`)
  console.log(`Panels: ${PANELS}`)
  console.log(`Panel Wattage: ${PANEL_WATTS}W`)
  console.log('')

  // Geocode address
  console.log('Geocoding address...')
  const { lat, lng } = await geocodeAddress(ADDRESS)
  console.log(`Location: ${lat}, ${lng}`)
  console.log('')

  // Get building insights
  console.log('Fetching building insights...')
  const insights = await getBuildingInsights(lat, lng)
  const solarPanels = insights.solarPotential?.solarPanels || []
  console.log(`Available panels from API: ${solarPanels.length}`)
  console.log('')

  // Get flux data
  console.log('Fetching flux data...')
  const dataLayers = await getDataLayers(lat, lng)
  const fluxData = await fetchFluxData(dataLayers.annualFluxUrl)

  const latLngToUtm = createLatLngToUtm(lng)
  const [minX, minY, maxX, maxY] = fluxData.bounds

  // Calculate production for top N panels
  const topPanels = solarPanels.slice(0, PANELS)
  let totalFluxProduction = 0
  let fluxValues = []

  console.log(`\nCalculating production for top ${PANELS} panels:\n`)

  for (let i = 0; i < topPanels.length; i++) {
    const panel = topPanels[i]
    if (!panel.center?.latitude || !panel.center?.longitude) continue

    const [utmX, utmY] = latLngToUtm(panel.center.longitude, panel.center.latitude)
    const pixelX = Math.floor(((utmX - minX) / (maxX - minX)) * fluxData.width)
    const pixelY = Math.floor(((maxY - utmY) / (maxY - minY)) * fluxData.height)

    let fluxValue = 0
    if (pixelX >= 0 && pixelX < fluxData.width && pixelY >= 0 && pixelY < fluxData.height) {
      const pixelIndex = pixelY * fluxData.width + pixelX
      fluxValue = fluxData.data[pixelIndex] || 0
    }

    fluxValues.push(fluxValue)
    const panelKw = PANEL_WATTS / 1000
    const panelProduction = fluxValue * panelKw
    totalFluxProduction += panelProduction

    console.log(`  Panel ${i + 1}: flux=${Math.round(fluxValue)} kWh/kW/yr → ${Math.round(panelProduction)} kWh/yr`)
  }

  const avgFlux = fluxValues.reduce((a, b) => a + b, 0) / fluxValues.length

  console.log('')
  console.log('='.repeat(50))
  console.log('PRODUCTION ESTIMATES')
  console.log('='.repeat(50))
  console.log('')
  console.log(`Average flux value: ${Math.round(avgFlux)} kWh/kW/yr`)
  console.log(`System size: ${(PANELS * PANEL_WATTS / 1000).toFixed(2)} kW`)
  console.log('')
  console.log(`Production @ 100% efficiency: ${Math.round(totalFluxProduction).toLocaleString()} kWh/yr`)
  console.log(`Production @ 85% efficiency:  ${Math.round(totalFluxProduction * 0.85).toLocaleString()} kWh/yr`)
  console.log(`Production @ 77% efficiency:  ${Math.round(totalFluxProduction * 0.77).toLocaleString()} kWh/yr (SubHub match)`)
  console.log('')

  // Also show Google's DC estimate for comparison
  const config = insights.solarPotential?.solarPanelConfigs?.find(c => c.panelsCount === PANELS)
  if (config) {
    console.log(`Google API DC estimate (${PANELS} panels): ${Math.round(config.yearlyEnergyDcKwh).toLocaleString()} kWh/yr`)
  }

  // Sum individual panel yearlyEnergyDcKwh
  const sumDc = topPanels.reduce((sum, p) => sum + (p.yearlyEnergyDcKwh || 0), 0)
  console.log(`Sum of individual panel DC: ${Math.round(sumDc).toLocaleString()} kWh/yr`)
}

main().catch(console.error)
