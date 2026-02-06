// Multi-market SubHub vs Google Solar API comparison
import { fromArrayBuffer } from 'geotiff'
import proj4 from 'proj4'

const GOOGLE_API_KEY = 'AIzaSyAQmnBuAgoJYvx25EJnvl2PNPCS80CBUGY'
const SUBHUB_API_KEY = 'eyJpdiI6InRBQkxVK3RvaURhdjNKOVV4Q3lqUHc9PSIsInZhbHVlIjoiZndqSlVTdGFwSmwySkNlUnFtMXdaZz09IiwibWFjIjoiYWZlNjM2NTRhODVlMDkxYWQ4OTE5MjJjMGM5MTUzNzBmNTZjODE2NmY0OTAxZDM1ODFkNjNhYTRjYTc4YjY0OSIsInRhZyI6IiJ9'
const PANEL_WATTS = 410

async function fetchSubHubProjects() {
  const url = `https://api.virtualsaleportal.com/api/public/v2/get-projects?public_api_key=${SUBHUB_API_KEY}&limit=100&page=1`
  const response = await fetch(url)
  const data = await response.json()

  // Filter projects with production data and coordinates
  return data.data.filter(p =>
    p.system_production &&
    p.lat &&
    p.lng &&
    p.number_of_panels
  ).map(p => ({
    name: p.customer_name || 'Unknown',
    address: p.address,
    city: p.city,
    state: p.state,
    lat: parseFloat(p.lat),
    lng: parseFloat(p.lng),
    panels: parseInt(p.number_of_panels),
    watts: parseInt(p.panel_wattage) || 410,
    production: parseInt(p.system_production)
  }))
}

async function getBuildingInsights(lat, lng) {
  const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${GOOGLE_API_KEY}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Building insights failed: ${response.status}`)
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

async function analyzeProject(project) {
  // Get building insights (panel positions)
  const insights = await getBuildingInsights(project.lat, project.lng)
  const solarPanels = insights.solarPotential?.solarPanels || []

  if (solarPanels.length < project.panels) {
    throw new Error(`Not enough panels: ${solarPanels.length} < ${project.panels}`)
  }

  // Get flux data
  const dataLayers = await getDataLayers(project.lat, project.lng)
  const fluxData = await fetchFluxData(dataLayers.annualFluxUrl)

  const latLngToUtm = createLatLngToUtm(project.lng)
  const [minX, minY, maxX, maxY] = fluxData.bounds

  // Calculate production from flux for top N panels
  const topPanels = solarPanels.slice(0, project.panels)
  let totalFluxProduction = 0

  for (const panel of topPanels) {
    if (!panel.center?.latitude || !panel.center?.longitude) continue

    const [utmX, utmY] = latLngToUtm(panel.center.longitude, panel.center.latitude)
    const pixelX = Math.floor(((utmX - minX) / (maxX - minX)) * fluxData.width)
    const pixelY = Math.floor(((maxY - utmY) / (maxY - minY)) * fluxData.height)

    let fluxValue = 0
    if (pixelX >= 0 && pixelX < fluxData.width && pixelY >= 0 && pixelY < fluxData.height) {
      const pixelIndex = pixelY * fluxData.width + pixelX
      fluxValue = fluxData.data[pixelIndex] || 0
    }

    // Production = flux (kWh/kW/year) × panel capacity (kW)
    const panelKw = project.watts / 1000
    totalFluxProduction += fluxValue * panelKw
  }

  // What efficiency matches SubHub?
  const matchingEfficiency = project.production / totalFluxProduction

  return {
    city: project.city,
    state: project.state,
    panels: project.panels,
    subhub: project.production,
    flux100: Math.round(totalFluxProduction),
    efficiency: matchingEfficiency
  }
}

async function main() {
  console.log('Fetching SubHub projects...\n')
  const projects = await fetchSubHubProjects()
  console.log(`Found ${projects.length} projects with production data\n`)

  // Group by state/city for market diversity
  const byMarket = {}
  for (const p of projects) {
    const market = `${p.city}, ${p.state}`
    if (!byMarket[market]) byMarket[market] = []
    byMarket[market].push(p)
  }

  console.log('Markets found:')
  for (const [market, projs] of Object.entries(byMarket)) {
    console.log(`  ${market}: ${projs.length} projects`)
  }
  console.log('')

  // Test up to 3 projects per market, max 12 total
  const results = []
  let tested = 0
  const maxTotal = 12
  const maxPerMarket = 3

  for (const [market, projs] of Object.entries(byMarket)) {
    if (tested >= maxTotal) break

    let marketTested = 0
    for (const project of projs) {
      if (tested >= maxTotal || marketTested >= maxPerMarket) break

      try {
        process.stdout.write(`Testing ${project.city}, ${project.state} (${project.panels} panels)... `)
        const result = await analyzeProject(project)
        results.push(result)
        console.log(`${(result.efficiency * 100).toFixed(1)}%`)
        tested++
        marketTested++
      } catch (err) {
        console.log(`SKIP: ${err.message}`)
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70))
  console.log('RESULTS SUMMARY')
  console.log('='.repeat(70))
  console.log('')
  console.log('Location                      | Panels | SubHub    | Flux@100% | Efficiency')
  console.log('-'.repeat(70))

  for (const r of results) {
    const loc = `${r.city}, ${r.state}`.padEnd(28)
    const panels = String(r.panels).padStart(6)
    const subhub = r.subhub.toLocaleString().padStart(9)
    const flux = r.flux100.toLocaleString().padStart(9)
    const eff = `${(r.efficiency * 100).toFixed(1)}%`.padStart(10)
    console.log(`${loc} | ${panels} | ${subhub} | ${flux} | ${eff}`)
  }

  // Statistics
  const efficiencies = results.map(r => r.efficiency)
  const avg = efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length
  const min = Math.min(...efficiencies)
  const max = Math.max(...efficiencies)

  console.log('-'.repeat(70))
  console.log('')
  console.log(`Average efficiency: ${(avg * 100).toFixed(1)}%`)
  console.log(`Range: ${(min * 100).toFixed(1)}% - ${(max * 100).toFixed(1)}%`)
  console.log('')
  console.log(`Recommendation: Use ${(avg * 100).toFixed(0)}% system efficiency to match SubHub`)
}

main().catch(console.error)
