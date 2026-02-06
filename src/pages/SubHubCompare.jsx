import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, RefreshCw, Check, X, AlertTriangle } from 'lucide-react'
import { getBuildingInsights, calculateSystemDesign, SOLRITE_PANEL } from '../services/solarApi'

// SubHub API endpoints
const SUBHUB_STAGING_URL = 'https://api-staging.virtualsaleportal.com'
const SUBHUB_LIVE_URL = 'https://api.virtualsaleportal.com'

export default function SubHubCompare() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('subhub_api_key') || '')
  const [env, setEnv] = useState('staging')
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState([])
  const [comparisons, setComparisons] = useState([])
  const [error, setError] = useState(null)

  const baseUrl = env === 'staging' ? SUBHUB_STAGING_URL : SUBHUB_LIVE_URL

  // Save API key to localStorage
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('subhub_api_key', apiKey)
    }
  }, [apiKey])

  async function fetchProjects() {
    if (!apiKey) {
      setError('Please enter your SubHub API key')
      return
    }

    setLoading(true)
    setError(null)
    setComparisons([])

    try {
      const url = `${baseUrl}/api/public/v2/get-projects?public_api_key=${apiKey}&limit=50`
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      // Filter to solar projects with coordinates and panels
      const solarProjects = data.data.filter(p =>
        p.job_type === 'Solar' &&
        p.latitude &&
        p.longitude &&
        p.module_total_panels > 0
      )

      setProjects(solarProjects)
      console.log('Fetched projects:', solarProjects)
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function compareProject(project) {
    try {
      // Get Google Solar API data for this location
      const buildingInsights = await getBuildingInsights(
        project.latitude,
        project.longitude
      )

      // Calculate production using our method
      const design = calculateSystemDesign(
        buildingInsights,
        project.annual_usage || 12000,
        1.05
      )

      // Calculate SubHub's production (what they show)
      const subhubProduction = project.annual_production || 0

      // Calculate Google Solar API direct production
      // Using same formula: wattage × sunshine hours × 80% efficiency
      const googleSunshineHours = buildingInsights.solarPotential?.maxSunshineHoursPerYear || 1600
      const panelWatts = project.module_watts || SOLRITE_PANEL.wattage
      const panelCount = project.module_total_panels || 0

      // Our calculation (80% efficiency)
      const ourProduction = Math.round((panelWatts * googleSunshineHours * 0.80 * panelCount) / 1000)

      // If SubHub uses 10% degradation on top of Google API
      const with10PercentDegradation = Math.round(ourProduction * 0.90)

      // API's per-panel production (if available)
      const apiPerPanelProduction = design.solarPanels?.slice(0, panelCount)
        .reduce((sum, p) => sum + (p.yearlyEnergyDcKwh || 0), 0) || 0

      // With 85% system efficiency (inverter losses, etc.)
      const apiProductionWithEfficiency = Math.round(apiPerPanelProduction * 0.85)

      return {
        projectId: project.subhub_id,
        address: `${project.street}, ${project.city}`,
        coordinates: { lat: project.latitude, lng: project.longitude },
        system: {
          panelCount: panelCount,
          panelWatts: panelWatts,
          systemKw: (panelCount * panelWatts) / 1000,
        },
        production: {
          subhub: subhubProduction,
          ourCalc: ourProduction,
          with10Degradation: with10PercentDegradation,
          googleApiDirect: Math.round(apiPerPanelProduction),
          googleApiWithEfficiency: apiProductionWithEfficiency,
        },
        sunshineHours: googleSunshineHours,
        maxPanelsAvailable: buildingInsights.solarPotential?.maxArrayPanelsCount || 0,
        diff: {
          vsSubhub: subhubProduction > 0 ? Math.round(((ourProduction - subhubProduction) / subhubProduction) * 100) : null,
          degradedVsSubhub: subhubProduction > 0 ? Math.round(((with10PercentDegradation - subhubProduction) / subhubProduction) * 100) : null,
        },
        status: 'success'
      }
    } catch (err) {
      return {
        projectId: project.subhub_id,
        address: `${project.street}, ${project.city}`,
        status: 'error',
        error: err.message
      }
    }
  }

  async function runComparisons() {
    setLoading(true)
    const results = []

    for (const project of projects.slice(0, 10)) { // Limit to 10 for API rate limits
      const result = await compareProject(project)
      results.push(result)
      setComparisons([...results])

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500))
    }

    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: 'white',
      padding: 20
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
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
          SubHub Production Comparison
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: 24 }}>
          Compare SubHub/SolRite production calculations with Google Solar API
        </p>

        {/* API Key Input */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <label style={{ display: 'block', marginBottom: 6, color: '#94a3b8', fontSize: '0.85rem' }}>
                SubHub API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Enter your SubHub public_api_key"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.3)',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: '#94a3b8', fontSize: '0.85rem' }}>
                Environment
              </label>
              <select
                value={env}
                onChange={e => setEnv(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.3)',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              >
                <option value="staging">Staging</option>
                <option value="live">Live</option>
              </select>
            </div>
            <button
              onClick={fetchProjects}
              disabled={loading || !apiKey}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: '#10b981',
                color: 'white',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              Fetch Projects
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <AlertTriangle size={20} style={{ color: '#f87171' }} />
            <span style={{ color: '#f87171' }}>{error}</span>
          </div>
        )}

        {/* Projects List */}
        {projects.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            padding: 20,
            marginBottom: 24
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
                Found {projects.length} Solar Projects with Coordinates
              </h2>
              <button
                onClick={runComparisons}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#3b82f6',
                  color: 'white',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Compare with Google Solar API
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 16 }}>
              Projects: {projects.map(p => `${p.street} (${p.module_total_panels} panels)`).join(', ')}
            </div>
          </div>
        )}

        {/* Comparison Results */}
        {comparisons.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            padding: 20
          }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>
              Production Comparison Results
            </h2>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', color: '#94a3b8' }}>Address</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', color: '#94a3b8' }}>Panels</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', color: '#94a3b8' }}>System kW</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', color: '#94a3b8' }}>SubHub kWh/yr</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', color: '#94a3b8' }}>Our Calc kWh/yr</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', color: '#94a3b8' }}>-10% Degradation</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', color: '#94a3b8' }}>Google API Direct</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', color: '#94a3b8' }}>Diff vs SubHub</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {c.status === 'error' ? (
                        <>
                          <td style={{ padding: '12px 8px' }}>{c.address}</td>
                          <td colSpan={7} style={{ padding: '12px 8px', color: '#f87171' }}>
                            Error: {c.error}
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '12px 8px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.address}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>{c.system.panelCount}</td>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>{c.system.systemKw.toFixed(2)}</td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>
                            {c.production.subhub.toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                            {c.production.ourCalc.toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: '#fbbf24' }}>
                            {c.production.with10Degradation.toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: '#94a3b8' }}>
                            {c.production.googleApiDirect.toLocaleString()}
                          </td>
                          <td style={{
                            padding: '12px 8px',
                            textAlign: 'center',
                            color: c.diff.degradedVsSubhub !== null
                              ? Math.abs(c.diff.degradedVsSubhub) < 5 ? '#10b981' : '#fbbf24'
                              : '#94a3b8'
                          }}>
                            {c.diff.degradedVsSubhub !== null ? (
                              <>
                                {c.diff.degradedVsSubhub > 0 ? '+' : ''}{c.diff.degradedVsSubhub}%
                                {Math.abs(c.diff.degradedVsSubhub) < 5 && <Check size={14} style={{ marginLeft: 4 }} />}
                              </>
                            ) : 'N/A'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            {comparisons.filter(c => c.status === 'success').length > 0 && (
              <div style={{
                marginTop: 20,
                padding: 16,
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 8
              }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>Analysis Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Formula Used</div>
                    <div style={{ fontSize: '0.85rem' }}>
                      Production = Watts × SunHours × 80% efficiency
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>With 10% Degradation</div>
                    <div style={{ fontSize: '0.85rem' }}>
                      SubHub likely applies: Production × 0.90
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Close Match (±5%)</div>
                    <div style={{ fontSize: '0.85rem', color: '#10b981' }}>
                      {comparisons.filter(c => c.status === 'success' && c.diff.degradedVsSubhub !== null && Math.abs(c.diff.degradedVsSubhub) < 5).length} / {comparisons.filter(c => c.status === 'success' && c.diff.degradedVsSubhub !== null).length} projects
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}
