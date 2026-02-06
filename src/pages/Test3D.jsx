import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Sun, Battery, Zap, MapPin } from 'lucide-react'
import RoofVisualizer3D from '../components/RoofVisualizer3D'
import RoofVisualizer from '../components/RoofVisualizer'
import { getBuildingInsights, calculateSystemDesign } from '../services/solarApi'

// Test address: Large River Oaks mansion in Houston
const TEST_ADDRESS = {
  address: '3229 Del Monte Dr, Houston, TX 77019',
  latitude: 29.7506,
  longitude: -95.4265,
  annualUsageKwh: 24000 // Large home = high usage
}

// Alternative test addresses (uncomment to try)
// const TEST_ADDRESS = {
//   address: '2 Longfellow Ln, Houston, TX 77005', // Rice University area
//   latitude: 29.7168,
//   longitude: -95.4270,
//   annualUsageKwh: 18000
// }

// const TEST_ADDRESS = {
//   address: '1 Kirby Dr, Houston, TX 77098', // River Oaks mansion
//   latitude: 29.7372,
//   longitude: -95.4186,
//   annualUsageKwh: 30000
// }

export default function Test3D() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [systemDesign, setSystemDesign] = useState(null)
  const [viewMode, setViewMode] = useState('3d') // '3d' or '2d'
  const [panelCount, setPanelCount] = useState(null)

  useEffect(() => {
    async function loadSolarData() {
      try {
        setLoading(true)
        setError(null)

        console.log('Fetching Solar API data for:', TEST_ADDRESS.address)
        const buildingInsights = await getBuildingInsights(
          TEST_ADDRESS.latitude,
          TEST_ADDRESS.longitude
        )

        console.log('Building insights:', buildingInsights)

        const design = calculateSystemDesign(
          buildingInsights,
          TEST_ADDRESS.annualUsageKwh,
          1.05 // 105% offset
        )

        console.log('System design:', design)
        console.log('Solar panels available:', design.solarPanels?.length)
        console.log('Roof segments:', design.roofSegments)

        setSystemDesign(design)
        setPanelCount(design.solarPanels?.length || design.panelsUsed || design.panels.count) // Max panels for testing
      } catch (err) {
        console.error('Failed to load solar data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadSolarData()
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: 'white',
      padding: 20
    }}>
      {/* Header */}
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        marginBottom: 24
      }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: '#94a3b8',
            textDecoration: 'none',
            marginBottom: 16
          }}
        >
          <ArrowLeft size={18} />
          Back to Home
        </Link>

        <h1 style={{ margin: '0 0 8px', fontSize: '1.75rem', fontWeight: 700 }}>
          3D Solar Visualization Test
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8' }}>
          <MapPin size={16} />
          <span>{TEST_ADDRESS.address}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Loading state */}
        {loading && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 16,
            padding: 60,
            textAlign: 'center'
          }}>
            <Loader2 size={48} style={{ color: '#10b981', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
            <p style={{ margin: 0, color: '#94a3b8' }}>Loading Solar API data...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 16,
            padding: 24,
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: '#f87171' }}>Error: {error}</p>
          </div>
        )}

        {/* Loaded state */}
        {!loading && !error && systemDesign && (
          <>
            {/* View toggle */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 20
            }}>
              <button
                onClick={() => setViewMode('3d')}
                style={{
                  background: viewMode === '3d' ? '#10b981' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  padding: '10px 20px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                3D View (Cesium)
              </button>
              <button
                onClick={() => setViewMode('2d')}
                style={{
                  background: viewMode === '2d' ? '#10b981' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  padding: '10px 20px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                2D View (GeoTIFF)
              </button>
            </div>

            {/* Visualizer */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 16,
              padding: 20,
              marginBottom: 24
            }}>
              {viewMode === '3d' ? (
                <RoofVisualizer3D
                  latitude={TEST_ADDRESS.latitude}
                  longitude={TEST_ADDRESS.longitude}
                  solarPanels={systemDesign.solarPanels}
                  roofSegments={systemDesign.roofSegments}
                  panelCount={panelCount}
                  maxPanels={systemDesign.solarPanels?.length || 50}
                  buildingCenter={systemDesign.buildingCenter}
                  panelDimensions={systemDesign.panelDimensions}
                  onPanelCountChange={setPanelCount}
                  showControls={true}
                />
              ) : (
                <RoofVisualizer
                  latitude={TEST_ADDRESS.latitude}
                  longitude={TEST_ADDRESS.longitude}
                  panelCount={panelCount}
                  systemSizeKw={systemDesign.panels.systemSizeKw}
                  roofData={systemDesign.roof}
                  buildingCenter={systemDesign.buildingCenter}
                  roofSegments={systemDesign.roofSegments}
                  solarPanels={systemDesign.solarPanels}
                  panelDimensions={systemDesign.panelDimensions}
                  showAllPanels={false}
                />
              )}
            </div>

            {/* System stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              marginBottom: 24
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: 20,
                textAlign: 'center'
              }}>
                <Sun size={28} style={{ color: '#fbbf24', marginBottom: 8 }} />
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {systemDesign.panels.count} Panels
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  {systemDesign.panels.systemSizeKw.toFixed(1)} kW System
                </div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: 20,
                textAlign: 'center'
              }}>
                <Battery size={28} style={{ color: '#10b981', marginBottom: 8 }} />
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {systemDesign.batteries.totalCapacityKwh} kWh
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  {systemDesign.batteries.count} Battery Units
                </div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: 20,
                textAlign: 'center'
              }}>
                <Zap size={28} style={{ color: '#3b82f6', marginBottom: 8 }} />
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {systemDesign.production.annualKwh.toLocaleString()}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  kWh/year Production
                </div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: 20,
                textAlign: 'center'
              }}>
                <div style={{
                  width: 28,
                  height: 28,
                  background: '#10b981',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 8px',
                  fontWeight: 700,
                  fontSize: '0.8rem'
                }}>
                  %
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {systemDesign.usage.actualOffset}%
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Energy Offset
                </div>
              </div>
            </div>

            {/* Roof data */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 12,
              padding: 20
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem' }}>Roof Analysis</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 16
              }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4 }}>
                    Total Roof Area
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {systemDesign.roof.totalAreaSqFt.toLocaleString()} sq ft
                  </div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4 }}>
                    Max Panel Capacity
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {systemDesign.roof.maxPanelsCapacity} panels
                  </div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4 }}>
                    Sunshine Hours/Year
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {systemDesign.roof.sunshineHoursPerYear.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4 }}>
                    Roof Segments
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {systemDesign.roofSegments?.length || 0}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4 }}>
                    Available Panels
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {systemDesign.solarPanels?.length || 0}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4 }}>
                    Panel Dimensions
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {systemDesign.panelDimensions?.widthMeters?.toFixed(2)}m × {systemDesign.panelDimensions?.heightMeters?.toFixed(2)}m
                  </div>
                </div>
              </div>
            </div>

            {/* Debug info */}
            <details style={{ marginTop: 24 }}>
              <summary style={{ cursor: 'pointer', color: '#64748b' }}>
                Debug: Raw Solar API Data
              </summary>
              <pre style={{
                background: 'rgba(0,0,0,0.3)',
                padding: 16,
                borderRadius: 8,
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: 400
              }}>
                {JSON.stringify({
                  buildingCenter: systemDesign.buildingCenter,
                  panelDimensions: systemDesign.panelDimensions,
                  roofSegments: systemDesign.roofSegments,
                  samplePanels: systemDesign.solarPanels?.slice(0, 5)
                }, null, 2)}
              </pre>
            </details>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
