// SubHub API Service
// Integrates with SubHub (VirtualSalePortal) to fetch solar project data

const SUBHUB_API_KEY = import.meta.env.VITE_SUBHUB_API_KEY
const SUBHUB_ENV = import.meta.env.VITE_SUBHUB_ENV || 'staging'

const BASE_URL = SUBHUB_ENV === 'staging'
  ? 'https://api-staging.virtualsaleportal.com'
  : 'https://api.virtualsaleportal.com'

/**
 * Get list of projects from SubHub
 * @param {number} limit - Number of projects to fetch (default 10)
 * @param {number} page - Page number
 * @returns {Promise<object>} Paginated project list
 */
export async function getProjects(limit = 10, page = 1) {
  if (!SUBHUB_API_KEY) {
    throw new Error('SubHub API key not configured. Add VITE_SUBHUB_API_KEY to .env')
  }

  const url = `${BASE_URL}/api/public/v2/get-projects?public_api_key=${SUBHUB_API_KEY}&limit=${limit}&page=${page}`

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || 'Failed to fetch SubHub projects')
  }

  return response.json()
}

/**
 * Get single project details from SubHub
 * @param {string|number} uniqueId - SubHub ID or external ID
 * @returns {Promise<object>} Project details
 */
export async function getProjectById(uniqueId) {
  if (!SUBHUB_API_KEY) {
    throw new Error('SubHub API key not configured. Add VITE_SUBHUB_API_KEY to .env')
  }

  const url = `${BASE_URL}/api/public/v2/get-projects/${uniqueId}?public_api_key=${SUBHUB_API_KEY}`

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || 'Failed to fetch SubHub project')
  }

  return response.json()
}

/**
 * Parse SubHub project into a normalized format for comparison
 * @param {object} project - Raw SubHub project
 * @returns {object} Normalized project data
 */
export function parseSubHubProject(project) {
  return {
    id: project.subhub_id,
    externalId: project.external_id,
    address: {
      street: project.street,
      city: project.city,
      state: project.state,
      postalCode: project.postal_code,
      full: `${project.street}, ${project.city}, ${project.state} ${project.postal_code}`
    },
    coordinates: {
      latitude: project.latitude,
      longitude: project.longitude
    },
    system: {
      panelCount: project.module_total_panels || 0,
      panelWatts: project.module_watts || 0,
      panelName: project.module_name,
      systemSizeKw: project.system_size_kw || 0,
      systemSizeW: project.system_size_w || 0,
      batteryCount: project.battery_quantity || 0,
      batterySizeKwh: project.battery_size_kwh || 0,
    },
    production: {
      annualKwh: project.annual_production || 0,
    },
    usage: {
      annualKwh: project.annual_usage || 0,
    },
    customer: {
      name: project.name,
      email: project.email,
      phone: project.phone,
    },
    raw: project
  }
}

/**
 * Get projects with coordinates and production data for comparison
 * Only returns projects that have both coordinates and production values
 * @param {number} limit - Number to fetch
 * @returns {Promise<object[]>} Array of parsed projects with production data
 */
export async function getProjectsForComparison(limit = 50) {
  const result = await getProjects(limit)

  // Filter to only projects with coordinates and production data
  const validProjects = result.data
    .filter(p =>
      p.latitude &&
      p.longitude &&
      p.module_total_panels > 0 &&
      p.job_type === 'Solar'
    )
    .map(parseSubHubProject)

  return validProjects
}

export default {
  getProjects,
  getProjectById,
  parseSubHubProject,
  getProjectsForComparison,
}
