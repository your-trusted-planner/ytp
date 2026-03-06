/**
 * Lawmatics Data Transformers
 *
 * Transform Lawmatics API responses into our database schema format.
 * These functions handle:
 * - Field mapping between systems
 * - Data normalization and validation
 * - Import metadata generation
 * - Non-person detection heuristics
 * - Duplicate email handling
 */

import { nanoid } from 'nanoid'
import { normalizePhone } from './record-matcher/normalizers'
import type {
  LawmaticsUser,
  LawmaticsContact,
  LawmaticsProspect,
  LawmaticsNote,
  LawmaticsActivity
} from './lawmatics-client'

// ===================================
// TYPES
// ===================================

/**
 * Import metadata structure stored in the importMetadata column
 */
export interface ImportMetadata {
  source: 'LAWMATICS' | 'WEALTHCOUNSEL' | 'CLIO' | string
  externalId: string
  importedAt: string
  lastSyncedAt?: string
  importRunId?: string
  flags?: ImportFlag[]
  sourceData?: Record<string, any>
  /** Explicit override for which system owns this record's data */
  sourceOfTruth?: 'LAWMATICS' | 'YTP'
  /** Fields that have been locally modified in YTP and should not be overwritten by sync */
  locallyModifiedFields?: string[]
  /** Snapshot of Lawmatics values at last sync (for conflict review) */
  lastSyncSnapshot?: Record<string, any>
}

/**
 * Flags for data quality issues
 */
export type ImportFlag =
  | 'REVIEW_NEEDED'
  | 'DUPLICATE_EMAIL'
  | 'POSSIBLY_NOT_PERSON'
  | 'MISSING_EMAIL'
  | 'MISSING_NAME'

/**
 * Transformed user record ready for database insert
 */
export interface TransformedUser {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  role: 'ADMIN' | 'LAWYER' | 'STAFF'
  adminLevel: number
  status: 'INACTIVE'
  importMetadata: string // JSON string
  createdAt: Date
  updatedAt: Date
}

/**
 * Transformed client (user + profile) ready for database insert
 * @deprecated Use TransformedPerson instead - contacts should become people, not clients
 */
export interface TransformedClient {
  user: {
    id: string
    email: string | null
    firstName: string | null
    lastName: string | null
    phone: string | null
    role: 'CLIENT'
    status: 'INACTIVE'
    importMetadata: string
    createdAt: Date
    updatedAt: Date
  }
  profile: {
    id: string
    userId: string
    dateOfBirth: Date | null
    address: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    createdAt: Date
    updatedAt: Date
  } | null
  flags: ImportFlag[]
}

/**
 * Transformed person ready for database insert (people table)
 */
export interface TransformedPerson {
  id: string
  firstName: string | null
  lastName: string | null
  fullName: string | null
  email: string | null
  phone: string | null
  address: string | null
  address2: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  country: string | null
  dateOfBirth: Date | null
  notes: string | null
  importMetadata: string
  createdAt: Date
  updatedAt: Date
  flags: ImportFlag[]
}

/**
 * Transformed matter ready for database insert
 */
export interface TransformedMatter {
  id: string
  clientId: string
  title: string
  matterNumber: string | null
  description: string | null
  status: 'OPEN' | 'CLOSED' | 'PENDING'
  leadAttorneyId: string | null
  importMetadata: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Transformed note ready for database insert
 */
export interface TransformedNote {
  id: string
  content: string
  entityType: string
  entityId: string
  createdBy: string
  importMetadata: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Transformed activity ready for database insert
 */
export interface TransformedActivity {
  id: string
  type: string
  description: string
  userId: string
  userRole: string | null
  targetType: string | null
  targetId: string | null
  metadata: string | null
  importMetadata: string
  createdAt: Date
}

/**
 * Lookup function type for resolving external IDs to internal IDs
 */
export type EntityLookup = (externalId: string) => string | null

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Build import metadata JSON
 */
export function buildImportMetadata(
  externalId: string,
  options: {
    importRunId?: string
    flags?: ImportFlag[]
    sourceData?: Record<string, any>
  } = {}
): ImportMetadata {
  return {
    source: 'LAWMATICS',
    externalId,
    importedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    importRunId: options.importRunId,
    flags: options.flags?.length ? options.flags : undefined,
    sourceData: options.sourceData
  }
}

/**
 * Serialize import metadata to JSON string for database storage
 */
export function serializeImportMetadata(metadata: ImportMetadata): string {
  return JSON.stringify(metadata)
}

/**
 * Check if a string looks like an address
 */
function looksLikeAddress(text: string): boolean {
  const lower = text.toLowerCase()

  // Starts with a number (e.g., "123 Main St", "10 Aspen Lane")
  if (/^\d+\s/.test(text)) {
    return true
  }

  // Contains street type words
  const streetTypes = [
    'street', 'st.', 'avenue', 'ave.', 'ave,', 'road', 'rd.', 'rd,',
    'lane', 'ln.', 'ln,', 'drive', 'dr.', 'dr,', 'boulevard', 'blvd',
    'court', 'ct.', 'ct,', 'circle', 'cir', 'place', 'pl.', 'pl,',
    'way', 'parkway', 'pkwy', 'highway', 'hwy', 'trail', 'terrace'
  ]
  if (streetTypes.some(type => lower.includes(type))) {
    return true
  }

  // Contains "City, State" or "City, ST" pattern (e.g., "Windsor, CO")
  if (/,\s*[a-z]{2}\s*$/i.test(text) || /,\s*[a-z]{2}\s*\d{5}/i.test(text)) {
    return true
  }

  // Contains PO Box
  if (/p\.?o\.?\s*box/i.test(text)) {
    return true
  }

  return false
}

/**
 * Check if a string looks like a financial account or insurance product
 */
function looksLikeFinancialProduct(text: string): boolean {
  const lower = text.toLowerCase()

  // Retirement account types
  const retirementPatterns = [
    /\bira\b/,           // IRA (word boundary to avoid matching "Brian")
    /\broth\b/,          // Roth
    /\b401\s*[\(\[]?\s*k\s*[\)\]]?\b/i,  // 401k, 401(k), 401 k
    /\b403\s*[\(\[]?\s*b\s*[\)\]]?\b/i,  // 403b, 403(b)
    /\bsep\s+ira\b/,     // SEP IRA
    /\bsimple\s+ira\b/,  // SIMPLE IRA
    /\bkeogh\b/,         // Keogh plan
    /\bpension\b/,       // Pension
    /\b457\s*[\(\[]?\s*b?\s*[\)\]]?\b/i  // 457, 457(b)
  ]
  if (retirementPatterns.some(pattern => pattern.test(lower))) {
    return true
  }

  // Insurance and annuity products
  const insuranceTerms = [
    'annuity', 'annuities',
    'life insurance', 'whole life', 'term life', 'universal life',
    'variable life', 'indexed life', 'permanent life',
    'long term care', 'ltc policy', 'disability insurance',
    'policy #', 'policy no', 'pol #', 'pol no'
  ]
  if (insuranceTerms.some(term => lower.includes(term))) {
    return true
  }

  // Investment account types
  const investmentTerms = [
    'brokerage', 'trading account', 'investment account',
    'mutual fund', 'index fund', 'money market',
    'cd ', 'certificate of deposit',  // note space after cd to avoid matching names
    'savings bond', 'treasury'
  ]
  if (investmentTerms.some(term => lower.includes(term))) {
    return true
  }

  // Financial institutions commonly seen in account names
  const institutions = [
    'fidelity', 'vanguard', 'schwab', 'ameritrade', 'td ameritrade',
    'merrill', 'merrill lynch', 'morgan stanley', 'edward jones',
    'northwestern mutual', 'lincoln financial', 'lincoln national',
    'prudential', 'metlife', 'new york life', 'mass mutual', 'massmutual',
    'transamerica', 'pacific life', 'american general', 'aig',
    'nationwide', 'principal financial', 'tiaa', 'cref',
    'jackson national', 'athene', 'allianz', 'brighthouse'
  ]
  if (institutions.some(inst => lower.includes(inst))) {
    return true
  }

  // Account/policy number patterns (e.g., "John Smith #12345", "Acct 98765")
  if (/#\s*\d{3,}/.test(text) || /acct\s*#?\s*\d+/i.test(text)) {
    return true
  }

  return false
}

/**
 * Check if a contact is probably a person (not a business/entity/address)
 */
export function isProbablyPerson(contact: LawmaticsContact): boolean {
  const firstName = contact.attributes.first_name?.toLowerCase() || ''
  const lastName = contact.attributes.last_name?.toLowerCase() || ''
  const fullName = `${firstName} ${lastName}`.trim()
  const rawFirstName = contact.attributes.first_name || ''
  const rawLastName = contact.attributes.last_name || ''
  const rawFullName = `${rawFirstName} ${rawLastName}`.trim()

  // Check if the "name" looks like an address
  if (looksLikeAddress(rawFullName) || looksLikeAddress(rawFirstName)) {
    return false
  }

  // Check if the "name" looks like a financial account or insurance product
  if (looksLikeFinancialProduct(rawFullName) || looksLikeFinancialProduct(rawFirstName)) {
    return false
  }

  // Red flags for non-person records
  const nonPersonIndicators = [
    'bank', 'trust', 'llc', 'inc', 'corp', 'corporation',
    'foundation', 'account', 'financial', 'insurance',
    'company', 'partners', 'partnership', 'holdings',
    'estate of', 'the estate', 'revocable', 'irrevocable',
    'charitable', 'family office', 'ventures', 'capital',
    'investments', 'properties', 'realty', 'associates',
    'group', 'services', 'solutions', 'enterprises', 'limited',
    'ltd', 'plc', 'gmbh', 'co.', 'organization', 'org'
  ]

  // Check if name contains non-person indicators
  if (nonPersonIndicators.some(indicator => fullName.includes(indicator))) {
    return false
  }

  // Names that are all caps might be business names (but short ones like "JOE SMITH" are OK)
  if (rawFullName === rawFullName.toUpperCase() && rawFullName.length > 20) {
    // Long all-caps name is suspicious
    return false
  }

  // Positive signals for person records
  const hasFirstName = !!contact.attributes.first_name?.trim()
  const hasLastName = !!contact.attributes.last_name?.trim()
  const hasBirthdate = !!contact.attributes.birthdate
  const hasPhone = !!(contact.attributes.phone || contact.attributes.phone_number)
  const hasEmail = !!(contact.attributes.email || contact.attributes.email_address)

  // Strong positive: has both first and last name, and birthdate
  if (hasFirstName && hasLastName && hasBirthdate) {
    return true
  }

  // Strong positive: has first name, last name, and personal contact info
  if (hasFirstName && hasLastName && (hasPhone || hasEmail)) {
    return true
  }

  // If only has first name (no last name), likely not a person
  // Real people typically have both names in CRM systems
  if (hasFirstName && !hasLastName) {
    // Unless it's a very short simple name with contact info
    if (firstName.length < 15 && !firstName.includes(' ') && (hasPhone || hasEmail || hasBirthdate)) {
      return true
    }
    return false
  }

  // Has both names but no contact info - cautiously accept
  if (hasFirstName && hasLastName) {
    return true
  }

  // No first name - not a person record
  return false
}

/**
 * Generate a placeholder email for duplicate email handling
 */
export function generateDuplicateEmailPlaceholder(
  originalEmail: string,
  externalId: string
): string {
  // Extract domain from original email for readability
  const [, domain] = originalEmail.split('@')
  return `imported+${externalId}@${domain || 'placeholder.local'}`
}

/**
 * Generate a placeholder email for contacts without email
 */
export function generateMissingEmailPlaceholder(externalId: string): string {
  return `lawmatics.${externalId}@imported.local`
}

/**
 * Parse a date string from Lawmatics
 */
export function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null

  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return null
    return date
  } catch {
    return null
  }
}

/**
 * Parse address components from Lawmatics.
 *
 * Priority order:
 * 1. Pre-fetched structured address data from GET /addresses/:id
 * 2. Structured fields on contact attributes (if present)
 * 3. Parse the full_address string from contact.attributes.address
 *
 * @param contact - The Lawmatics contact
 * @param addressData - Pre-fetched address object with structured fields (optional)
 */
/**
 * Normalize a street address to title case.
 * Preserves directional abbreviations (NW, SE, etc.) and common suffixes.
 */
function normalizeStreet(street: string): string {
  // If it's not all-caps or all-lower, assume it's already formatted
  if (street !== street.toUpperCase() && street !== street.toLowerCase()) {
    return street
  }
  return street
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    // Fix common abbreviations back to uppercase
    .replace(/\b(Nw|Ne|Sw|Se|Po|Apt|Ste)\b/g, m => m.toUpperCase())
}

/**
 * Normalize a city name to title case.
 */
function normalizeCity(city: string): string {
  if (city !== city.toUpperCase() && city !== city.toLowerCase()) {
    return city
  }
  return city
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Map of full state names to two-letter abbreviations.
 */
const STATE_ABBREVIATIONS: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC'
}

/**
 * Map of common country names/variations to ISO 3166-1 alpha-2 codes.
 */
const COUNTRY_CODES: Record<string, string> = {
  'united states': 'US', 'united states of america': 'US', 'usa': 'US', 'us': 'US', 'u.s.': 'US', 'u.s.a.': 'US',
  'canada': 'CA', 'ca': 'CA',
  'united kingdom': 'GB', 'great britain': 'GB', 'england': 'GB', 'scotland': 'GB', 'wales': 'GB', 'uk': 'GB',
  'switzerland': 'CH', 'schweiz': 'CH', 'suisse': 'CH',
  'germany': 'DE', 'deutschland': 'DE',
  'france': 'FR',
  'australia': 'AU',
  'mexico': 'MX', 'méxico': 'MX',
  'italy': 'IT', 'italia': 'IT',
  'spain': 'ES', 'españa': 'ES',
  'brazil': 'BR', 'brasil': 'BR',
  'japan': 'JP',
  'china': 'CN',
  'india': 'IN',
  'south korea': 'KR', 'korea': 'KR',
  'netherlands': 'NL', 'holland': 'NL',
  'belgium': 'BE',
  'austria': 'AT', 'österreich': 'AT',
  'sweden': 'SE',
  'norway': 'NO',
  'denmark': 'DK',
  'finland': 'FI',
  'ireland': 'IE',
  'portugal': 'PT',
  'poland': 'PL',
  'czech republic': 'CZ', 'czechia': 'CZ',
  'greece': 'GR',
  'turkey': 'TR', 'türkiye': 'TR',
  'russia': 'RU',
  'ukraine': 'UA',
  'israel': 'IL',
  'south africa': 'ZA',
  'argentina': 'AR',
  'colombia': 'CO',
  'chile': 'CL',
  'peru': 'PE',
  'new zealand': 'NZ',
  'singapore': 'SG',
  'hong kong': 'HK',
  'taiwan': 'TW',
  'thailand': 'TH',
  'philippines': 'PH',
  'indonesia': 'ID',
  'malaysia': 'MY',
  'vietnam': 'VN',
  'united arab emirates': 'AE', 'uae': 'AE',
  'saudi arabia': 'SA',
  'egypt': 'EG',
  'nigeria': 'NG',
  'costa rica': 'CR',
  'panama': 'PA',
  'puerto rico': 'PR',
  'luxembourg': 'LU',
  'iceland': 'IS',
  'romania': 'RO',
  'hungary': 'HU',
  'croatia': 'HR',
}

/**
 * Normalize a country value to ISO 3166-1 alpha-2.
 * If already 2 letters, uppercase and return. If a known name, map it. Otherwise store as-is.
 */
function normalizeCountry(country: string): string {
  const trimmed = country.trim()
  if (!trimmed) return trimmed
  // Already a 2-letter code
  if (/^[a-zA-Z]{2}$/.test(trimmed)) return trimmed.toUpperCase()
  // Lookup by name
  const code = COUNTRY_CODES[trimmed.toLowerCase()]
  return code || trimmed
}

/**
 * Normalize state to two-letter abbreviation (uppercase).
 * Only applies US abbreviation logic when country is US or unspecified.
 * For non-US countries, returns the state value as-is (trimmed).
 */
function normalizeState(state: string, country?: string | null): string {
  const trimmed = state.trim()
  // For non-US countries, don't apply US state normalization
  if (country && country !== 'US') return trimmed
  // Already a 2-letter code
  if (trimmed.length === 2) return trimmed.toUpperCase()
  // Full name lookup
  const abbr = STATE_ABBREVIATIONS[trimmed.toLowerCase()]
  return abbr || trimmed
}

export function parseAddress(
  contact: LawmaticsContact,
  addressData?: { street?: string; street2?: string; city?: string; state?: string; zipcode?: string; country?: string; [key: string]: any } | null
): {
  address: string | null
  address2: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  country: string | null
} {
  // 1. Use pre-fetched structured address data if available
  if (addressData) {
    const country = addressData.country ? normalizeCountry(addressData.country) : null
    return {
      address: addressData.street ? normalizeStreet(addressData.street) : null,
      address2: addressData.street2 || null,
      city: addressData.city ? normalizeCity(addressData.city) : null,
      state: addressData.state ? normalizeState(addressData.state, country) : null,
      zipCode: addressData.zipcode || null,
      country
    }
  }

  // 2. Fallback: check for structured fields on the contact attributes
  const structuredCity = contact.attributes.city || null
  const structuredState = contact.attributes.state || null
  const structuredZip = contact.attributes.zipcode || contact.attributes.zip_code || null
  const structuredStreet = contact.attributes.street || null
  const structuredStreet2 = contact.attributes.street2 || null
  const structuredCountry = contact.attributes.country ? normalizeCountry(contact.attributes.country) : null

  if (structuredStreet || structuredCity || structuredState || structuredZip) {
    return {
      address: structuredStreet ? normalizeStreet(structuredStreet) : null,
      address2: structuredStreet2,
      city: structuredCity ? normalizeCity(structuredCity) : null,
      state: structuredState ? normalizeState(structuredState, structuredCountry) : null,
      zipCode: structuredZip,
      country: structuredCountry
    }
  }

  // 3. No structured data available
  return { address: null, address2: null, city: null, state: null, zipCode: null, country: null }
}

/**
 * Extract custom fields into a key-value object
 */
export function extractCustomFields(
  customFields: Array<{ name: string; formatted_value: any; value?: any }> | undefined
): Record<string, any> {
  if (!customFields || !Array.isArray(customFields)) {
    return {}
  }

  const result: Record<string, any> = {}
  for (const field of customFields) {
    if (field.name) {
      result[field.name] = field.formatted_value ?? field.value
    }
  }
  return result
}

// ===================================
// USER TRANSFORMER
// ===================================

/**
 * Map Lawmatics user role to our role
 *
 * All imported users come in as STAFF with no admin access.
 * Admins should manually set appropriate roles and permissions after import.
 * The original Lawmatics role is preserved in importMetadata for reference.
 */
function mapUserRole(_lawmaticsRole: string | undefined): { role: 'ADMIN' | 'LAWYER' | 'STAFF'; adminLevel: number } {
  return { role: 'STAFF', adminLevel: 0 }
}

/**
 * Transform a Lawmatics user to our user format
 */
export function transformUser(
  lawmaticsUser: LawmaticsUser,
  options: { importRunId?: string } = {}
): TransformedUser {
  const { role, adminLevel } = mapUserRole(lawmaticsUser.attributes.role)

  const metadata = buildImportMetadata(lawmaticsUser.id, {
    importRunId: options.importRunId,
    sourceData: {
      role: lawmaticsUser.attributes.role,
      active: lawmaticsUser.attributes.active
    }
  })

  const createdAt = parseDate(lawmaticsUser.attributes.created_at) || new Date()
  const updatedAt = parseDate(lawmaticsUser.attributes.updated_at) || new Date()

  return {
    id: nanoid(),
    email: lawmaticsUser.attributes.email || null,
    firstName: lawmaticsUser.attributes.first_name || null,
    lastName: lawmaticsUser.attributes.last_name || null,
    phone: null, // Users typically don't have phone in Lawmatics
    role,
    adminLevel,
    status: 'INACTIVE', // Imported users must be activated manually
    importMetadata: serializeImportMetadata(metadata),
    createdAt,
    updatedAt
  }
}

// ===================================
// CONTACT TRANSFORMER
// ===================================

/**
 * Transform a Lawmatics contact to our user + clientProfile format
 */
export function transformContact(
  contact: LawmaticsContact,
  options: {
    importRunId?: string
    existingEmails?: Set<string> // For duplicate detection
    addressData?: { street?: string; city?: string; state?: string; zipcode?: string } | null
  } = {}
): TransformedClient {
  const flags: ImportFlag[] = []

  // Detect non-person records
  if (!isProbablyPerson(contact)) {
    flags.push('POSSIBLY_NOT_PERSON')
    flags.push('REVIEW_NEEDED')
  }

  // Handle email
  let email = contact.attributes.email || contact.attributes.email_address || null

  if (!email) {
    flags.push('MISSING_EMAIL')
    email = generateMissingEmailPlaceholder(contact.id)
  } else if (options.existingEmails?.has(email.toLowerCase())) {
    // Duplicate email detected
    flags.push('DUPLICATE_EMAIL')
    flags.push('REVIEW_NEEDED')
    email = generateDuplicateEmailPlaceholder(email, contact.id)
  }

  // Check for missing name
  if (!contact.attributes.first_name && !contact.attributes.last_name) {
    flags.push('MISSING_NAME')
    flags.push('REVIEW_NEEDED')
  }

  // Extract custom fields for sourceData
  const customFields = extractCustomFields(contact.attributes.custom_fields)

  // Build import metadata
  const metadata = buildImportMetadata(contact.id, {
    importRunId: options.importRunId,
    flags: flags.length > 0 ? flags : undefined,
    sourceData: {
      originalEmail: contact.attributes.email || contact.attributes.email_address,
      contactType: contact.attributes.contact_type,
      maritalStatus: contact.attributes.marital_status,
      gender: contact.attributes.gender,
      citizenship: contact.attributes.citizenship,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined
    }
  })

  const userId = nanoid()
  const createdAt = parseDate(contact.attributes.created_at) || new Date()
  const updatedAt = parseDate(contact.attributes.updated_at) || new Date()

  // Parse address (use pre-fetched structured data if available)
  const addressData = parseAddress(contact, options.addressData)

  // Parse birthdate
  const dateOfBirth = parseDate(contact.attributes.birthdate)

  // Build user record
  const user = {
    id: userId,
    email,
    firstName: contact.attributes.first_name || null,
    lastName: contact.attributes.last_name || null,
    phone: contact.attributes.phone || contact.attributes.phone_number || null,
    role: 'CLIENT' as const,
    status: 'INACTIVE' as const,
    importMetadata: serializeImportMetadata(metadata),
    createdAt,
    updatedAt
  }

  // Build profile if we have any profile data
  const hasProfileData = dateOfBirth || addressData.address || addressData.city ||
    addressData.state || addressData.zipCode

  const profile = hasProfileData ? {
    id: nanoid(),
    userId,
    dateOfBirth,
    address: addressData.address,
    city: addressData.city,
    state: addressData.state,
    zipCode: addressData.zipCode,
    createdAt,
    updatedAt
  } : null

  return { user, profile, flags }
}

/**
 * Transform a Lawmatics contact to our people table format
 * Returns null for non-person records (businesses, trusts, etc.) - these are skipped
 */
export function transformContactToPerson(
  contact: LawmaticsContact,
  options: {
    importRunId?: string
    addressData?: { street?: string; city?: string; state?: string; zipcode?: string } | null
  } = {}
): TransformedPerson | null {
  // Skip non-person records (businesses, trusts, etc.)
  if (!isProbablyPerson(contact)) {
    return null
  }

  const flags: ImportFlag[] = []

  // Check for missing name
  if (!contact.attributes.first_name && !contact.attributes.last_name) {
    flags.push('MISSING_NAME')
    flags.push('REVIEW_NEEDED')
  }

  // Extract custom fields for sourceData
  const customFields = extractCustomFields(contact.attributes.custom_fields)

  // Build import metadata
  const metadata = buildImportMetadata(contact.id, {
    importRunId: options.importRunId,
    flags: flags.length > 0 ? flags : undefined,
    sourceData: {
      originalEmail: contact.attributes.email || contact.attributes.email_address,
      contactType: contact.attributes.contact_type,
      maritalStatus: contact.attributes.marital_status,
      gender: contact.attributes.gender,
      citizenship: contact.attributes.citizenship,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined
    }
  })

  const createdAt = parseDate(contact.attributes.created_at) || new Date()
  const updatedAt = parseDate(contact.attributes.updated_at) || new Date()

  // Parse address (use pre-fetched structured data if available)
  const addressData = parseAddress(contact, options.addressData)

  // Parse birthdate
  const dateOfBirth = parseDate(contact.attributes.birthdate)

  // Build full name
  const firstName = contact.attributes.first_name || null
  const lastName = contact.attributes.last_name || null
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || null

  // Normalize phone to E.164, fall back to raw value if normalization fails
  const rawPhone = contact.attributes.phone || contact.attributes.phone_number || null
  const normalizedPhone = rawPhone ? (normalizePhone(rawPhone) || rawPhone) : null

  return {
    id: nanoid(),
    firstName,
    lastName,
    fullName,
    email: contact.attributes.email || contact.attributes.email_address || null,
    phone: normalizedPhone,
    address: addressData.address,
    address2: addressData.address2,
    city: addressData.city,
    state: addressData.state,
    zipCode: addressData.zipCode,
    country: addressData.country,
    dateOfBirth,
    notes: null,
    importMetadata: serializeImportMetadata(metadata),
    createdAt,
    updatedAt,
    flags
  }
}

// ===================================
// PROSPECT (MATTER) TRANSFORMER
// ===================================

/**
 * Map Lawmatics prospect status to our matter status
 */
function mapProspectStatus(lawmaticsStatus: string | undefined): 'OPEN' | 'CLOSED' | 'PENDING' {
  const status = lawmaticsStatus?.toLowerCase() || ''

  if (status === 'hired' || status === 'active' || status === 'engaged') {
    return 'OPEN'
  }

  if (status === 'pnc' || status === 'closed' || status === 'lost' || status === 'declined') {
    return 'CLOSED'
  }

  // pending, new, consultation, or unknown
  return 'PENDING'
}

/**
 * Transform a Lawmatics prospect to our matter format
 */
export function transformProspect(
  prospect: LawmaticsProspect,
  options: {
    importRunId?: string
    clientLookup: EntityLookup // Map contact externalId to our user id
    userLookup?: EntityLookup // Map user externalId to our user id (for lead attorney)
  }
): TransformedMatter | null {
  // Get the contact ID from relationships
  const contactRelation = prospect.relationships?.contact?.data
  const contactExternalId = Array.isArray(contactRelation)
    ? contactRelation[0]?.id
    : contactRelation?.id

  if (!contactExternalId) {
    // Can't import matter without a client
    return null
  }

  // Look up our internal client ID
  const clientId = options.clientLookup(contactExternalId)

  if (!clientId) {
    // Client not found - skip this matter
    return null
  }

  // Try to get lead attorney
  let leadAttorneyId: string | null = null
  if (options.userLookup) {
    const attorneyRelation = prospect.relationships?.lead_attorney?.data
    const attorneyExternalId = Array.isArray(attorneyRelation)
      ? attorneyRelation[0]?.id
      : attorneyRelation?.id

    if (attorneyExternalId) {
      leadAttorneyId = options.userLookup(attorneyExternalId)
    }
  }

  // Build title - use case_title, or fallback to client name + type
  let title = prospect.attributes.case_title

  if (!title) {
    const firstName = prospect.attributes.first_name || ''
    const lastName = prospect.attributes.last_name || ''
    const stage = prospect.attributes.stage || 'Matter'
    title = `${firstName} ${lastName} - ${stage}`.trim()
  }

  // Extract custom fields
  const customFields = extractCustomFields(prospect.attributes.custom_fields)

  const metadata = buildImportMetadata(prospect.id, {
    importRunId: options.importRunId,
    sourceData: {
      stage: prospect.attributes.stage,
      estimatedValueCents: prospect.attributes.estimated_value_cents,
      actualValueCents: prospect.attributes.actual_value_cents,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined
    }
  })

  const createdAt = parseDate(prospect.attributes.created_at) || new Date()
  const updatedAt = parseDate(prospect.attributes.updated_at) || new Date()

  return {
    id: nanoid(),
    clientId,
    title,
    matterNumber: prospect.attributes.case_number || null,
    description: prospect.attributes.case_blurb || null,
    status: mapProspectStatus(prospect.attributes.status),
    leadAttorneyId,
    importMetadata: serializeImportMetadata(metadata),
    createdAt,
    updatedAt
  }
}

// ===================================
// NOTE TRANSFORMER
// ===================================

/**
 * Transform a Lawmatics note to our note format
 */
export function transformNote(
  note: LawmaticsNote,
  options: {
    importRunId?: string
    contactLookup: EntityLookup // Map contact externalId to our person id
    prospectLookup: EntityLookup // Map prospect externalId to our matter id
    userLookup: EntityLookup // Map user externalId to our user id (for createdBy)
    defaultUserId: string // Fallback user ID if creator not found
  }
): TransformedNote | null {
  // Determine entity type and ID from relationships
  let entityType: string | null = null
  let entityId: string | null = null

  // Lawmatics uses a polymorphic "notable" relationship
  // The type field indicates whether it's a "contact" or "prospect"
  const notableRelation = note.relationships?.notable?.data
  const notableData = Array.isArray(notableRelation)
    ? notableRelation[0]
    : notableRelation

  if (notableData?.id && notableData?.type) {
    if (notableData.type === 'contact') {
      const personId = options.contactLookup(notableData.id)
      if (personId) {
        entityType = 'person'
        entityId = personId
      }
    } else if (notableData.type === 'prospect') {
      const matterId = options.prospectLookup(notableData.id)
      if (matterId) {
        entityType = 'matter'
        entityId = matterId
      }
    }
  }

  // Fallback: Check for explicit contact relationship (legacy/alternative format)
  if (!entityId) {
    const contactRelation = note.relationships?.contact?.data
    const contactExternalId = Array.isArray(contactRelation)
      ? contactRelation[0]?.id
      : contactRelation?.id

    if (contactExternalId) {
      const personId = options.contactLookup(contactExternalId)
      if (personId) {
        entityType = 'person'
        entityId = personId
      }
    }
  }

  // Fallback: Check for explicit prospect/matter relationship
  if (!entityId) {
    const prospectRelation = note.relationships?.prospect?.data ||
      note.relationships?.matter?.data
    const prospectExternalId = Array.isArray(prospectRelation)
      ? prospectRelation[0]?.id
      : prospectRelation?.id

    if (prospectExternalId) {
      const matterId = options.prospectLookup(prospectExternalId)
      if (matterId) {
        entityType = 'matter'
        entityId = matterId
      }
    }
  }

  // Skip if we couldn't resolve the entity
  if (!entityType || !entityId) {
    return null
  }

  // Resolve creator
  const creatorRelation = note.relationships?.created_by?.data ||
    note.relationships?.user?.data
  const creatorExternalId = Array.isArray(creatorRelation)
    ? creatorRelation[0]?.id
    : creatorRelation?.id

  let createdBy = options.defaultUserId
  if (creatorExternalId) {
    const userId = options.userLookup(creatorExternalId)
    if (userId) {
      createdBy = userId
    }
  }

  const metadata = buildImportMetadata(note.id, {
    importRunId: options.importRunId,
    sourceData: {
      name: note.attributes.name // Preserve the note title/name
    }
  })

  const createdAt = parseDate(note.attributes.created_at) || new Date()
  const updatedAt = parseDate(note.attributes.updated_at) || new Date()

  // Lawmatics uses "body" for note content, not "content"
  // Also include the name as a prefix if it exists
  const noteTitle = note.attributes.name
  const noteBody = note.attributes.body || note.attributes.content || ''
  const content = noteTitle && noteBody
    ? `**${noteTitle}**\n\n${noteBody}`
    : noteBody || noteTitle || ''

  return {
    id: nanoid(),
    content,
    entityType,
    entityId,
    createdBy,
    importMetadata: serializeImportMetadata(metadata),
    createdAt,
    updatedAt
  }
}

// ===================================
// ACTIVITY TRANSFORMER
// ===================================

/**
 * Map Lawmatics activity type to our activity type
 */
function mapActivityType(lawmaticsType: string | undefined): string {
  const type = lawmaticsType?.toLowerCase() || 'activity'

  // Map common Lawmatics activity types
  const typeMap: Record<string, string> = {
    'email_sent': 'EMAIL_SENT',
    'email_received': 'EMAIL_RECEIVED',
    'email_opened': 'EMAIL_OPENED',
    'email_clicked': 'EMAIL_CLICKED',
    'call': 'CALL_LOGGED',
    'call_logged': 'CALL_LOGGED',
    'sms_sent': 'SMS_SENT',
    'sms_received': 'SMS_RECEIVED',
    'note_added': 'NOTE_CREATED',
    'note': 'NOTE_CREATED',
    'status_changed': 'STATUS_CHANGED',
    'stage_changed': 'STAGE_CHANGED',
    'document_uploaded': 'DOCUMENT_UPLOADED',
    'document_signed': 'DOCUMENT_SIGNED',
    'form_submitted': 'FORM_SUBMITTED',
    'appointment_scheduled': 'APPOINTMENT_SCHEDULED',
    'appointment_completed': 'APPOINTMENT_COMPLETED',
    'payment_received': 'PAYMENT_RECEIVED',
    'task_completed': 'TASK_COMPLETED'
  }

  return typeMap[type] || `IMPORTED_${type.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
}

/**
 * Transform a Lawmatics activity to our activity format
 */
export function transformActivity(
  activity: LawmaticsActivity,
  options: {
    importRunId?: string
    contactLookup: EntityLookup
    prospectLookup: EntityLookup
    userLookup: EntityLookup
    defaultUserId: string
  }
): TransformedActivity | null {
  // Determine target entity
  let targetType: string | null = null
  let targetId: string | null = null

  // Check for contact
  const contactRelation = activity.relationships?.contact?.data
  const contactExternalId = Array.isArray(contactRelation)
    ? contactRelation[0]?.id
    : contactRelation?.id

  if (contactExternalId) {
    const personId = options.contactLookup(contactExternalId)
    if (personId) {
      targetType = 'person'
      targetId = personId
    }
  }

  // Check for prospect if no contact
  if (!targetId) {
    const prospectRelation = activity.relationships?.prospect?.data ||
      activity.relationships?.matter?.data
    const prospectExternalId = Array.isArray(prospectRelation)
      ? prospectRelation[0]?.id
      : prospectRelation?.id

    if (prospectExternalId) {
      const matterId = options.prospectLookup(prospectExternalId)
      if (matterId) {
        targetType = 'matter'
        targetId = matterId
      }
    }
  }

  // Resolve actor (user who performed the action)
  const userRelation = activity.relationships?.user?.data ||
    activity.relationships?.created_by?.data
  const userExternalId = Array.isArray(userRelation)
    ? userRelation[0]?.id
    : userRelation?.id

  let userId = options.defaultUserId
  if (userExternalId) {
    const resolvedUserId = options.userLookup(userExternalId)
    if (resolvedUserId) {
      userId = resolvedUserId
    }
  }

  const activityType = mapActivityType(activity.type || activity.attributes.activity_type)
  const description = activity.attributes.description || `Imported ${activityType} activity`

  const metadata = buildImportMetadata(activity.id, {
    importRunId: options.importRunId
  })

  const createdAt = parseDate(activity.attributes.created_at) || new Date()

  return {
    id: nanoid(),
    type: activityType,
    description,
    userId,
    userRole: null, // Will be filled in during insert if needed
    targetType,
    targetId,
    metadata: null,
    importMetadata: serializeImportMetadata(metadata),
    createdAt
  }
}

// ===================================
// BATCH UTILITIES
// ===================================

/**
 * Create a lookup map from transformed records
 * Maps externalId -> internalId
 */
export function createLookupMap(
  records: Array<{ id: string; importMetadata: string }>
): Map<string, string> {
  const map = new Map<string, string>()

  for (const record of records) {
    try {
      const metadata = JSON.parse(record.importMetadata) as ImportMetadata
      if (metadata.externalId) {
        map.set(metadata.externalId, record.id)
      }
    } catch {
      // Skip records with invalid metadata
    }
  }

  return map
}

/**
 * Create an EntityLookup function from a Map
 */
export function createEntityLookup(map: Map<string, string>): EntityLookup {
  return (externalId: string) => map.get(externalId) || null
}
