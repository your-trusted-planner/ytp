/**
 * Radar API Utilities
 *
 * Radar provides address autocomplete with a generous free tier (100k requests/month).
 * https://radar.com/documentation/api
 */

const RADAR_API_BASE = 'https://api.radar.io/v1'

export interface RadarAddress {
  addressLabel: string
  formattedAddress: string
  city: string
  state: string
  stateCode: string
  postalCode: string
  county: string
  country: string
  countryCode: string
  countryFlag: string
  number?: string
  street?: string
  unit?: string
  latitude: number
  longitude: number
  layer: string
  confidence: string
}

export interface RadarAutocompleteResult {
  meta: {
    code: number
  }
  addresses: RadarAddress[]
}

/**
 * Autocomplete address query using Radar API
 */
export async function autocompleteAddress(
  query: string,
  options: {
    layers?: string[]
    countryCode?: string
    limit?: number
  } = {}
): Promise<RadarAddress[]> {
  const config = useRuntimeConfig()
  const apiKey = config.radarApiKey

  if (!apiKey) {
    console.warn('Radar API key not configured')
    return []
  }

  const params = new URLSearchParams({
    query,
    country: options.countryCode || 'US',
    layers: (options.layers || ['address']).join(','),
    limit: String(options.limit || 5)
  })

  try {
    const response = await fetch(`${RADAR_API_BASE}/search/autocomplete?${params}`, {
      headers: {
        Authorization: apiKey
      }
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Radar API error:', error)
      return []
    }

    const data: RadarAutocompleteResult = await response.json()
    return data.addresses || []
  } catch (error) {
    console.error('Radar API fetch error:', error)
    return []
  }
}

/**
 * Check if Radar API is configured
 */
export function isRadarConfigured(): boolean {
  const config = useRuntimeConfig()
  return Boolean(config.radarApiKey)
}
