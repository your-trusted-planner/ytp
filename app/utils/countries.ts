export interface Country {
  code: string
  name: string
}

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States' },
  { code: 'AU', name: 'Australia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'CN', name: 'China' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IN', name: 'India' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'SG', name: 'Singapore' }
]

/**
 * Look up country name by code
 */
export function getCountryName(code: string): string | undefined {
  return COUNTRIES.find(c => c.code === code)?.name
}

/**
 * Check if a country code uses US-style states
 */
export function isUSOrTerritory(code: string): boolean {
  return code === 'US' || code === 'PR'
}
