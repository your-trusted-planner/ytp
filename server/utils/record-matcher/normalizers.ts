/**
 * Field Normalizers
 *
 * Pure functions that prepare raw field values for comparison.
 */

import { parsePhoneNumberFromString } from 'libphonenumber-js'

const TITLE_PATTERN = /\b(mr|mrs|ms|miss|dr|prof|jr|sr|ii|iii|iv|esq)\b\.?/gi

const ADDRESS_ABBREVIATIONS: Record<string, string> = {
  st: 'street',
  ave: 'avenue',
  blvd: 'boulevard',
  dr: 'drive',
  ln: 'lane',
  rd: 'road',
  ct: 'court',
  pl: 'place',
  cir: 'circle',
  apt: 'apartment',
  ste: 'suite',
  hwy: 'highway',
  pkwy: 'parkway',
  n: 'north',
  s: 'south',
  e: 'east',
  w: 'west',
  ne: 'northeast',
  nw: 'northwest',
  se: 'southeast',
  sw: 'southwest'
}

/**
 * Normalize an email for comparison.
 * Lowercase, trim, skip placeholders.
 */
export function normalizeEmail(email: string): string | null {
  if (!email) return null

  const normalized = email.toLowerCase().trim()

  // Skip placeholder emails
  if (normalized.includes('@imported.local') || normalized.includes('@placeholder.local')) {
    return null
  }

  return normalized
}

/**
 * Normalize a name for comparison.
 * Lowercase, trim, strip accents, collapse whitespace, strip titles.
 */
export function normalizeName(name: string): string {
  if (!name) return ''

  const normalized = name
    // Strip accents (é → e, ñ → n, etc.)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Lowercase
    .toLowerCase()
    // Strip titles (Mr, Mrs, Dr, Jr, Sr, III, etc.)
    .replace(TITLE_PATTERN, '')
    // Remove punctuation except hyphens and apostrophes within names
    .replace(/[.,]/g, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()

  return normalized
}

/**
 * Normalize a phone number using libphonenumber-js.
 * Returns E.164 format or null if unparseable.
 */
export function normalizePhone(phone: string, defaultCountry: 'US' | string = 'US'): string | null {
  if (!phone) return null

  try {
    const parsed = parsePhoneNumberFromString(phone, defaultCountry as any)
    if (parsed && parsed.isValid()) {
      return parsed.format('E.164')
    }
  }
  catch {
    // Fall through to digit extraction
  }

  // Fallback: extract digits and try to form a number
  const digits = phone.replace(/\D/g, '')

  // Try prepending '+' to see if the digits form a valid international number
  // (handles numbers like "41787619350" that are missing the '+' prefix)
  if (digits.length >= 7) {
    try {
      const withPlus = parsePhoneNumberFromString('+' + digits)
      if (withPlus && withPlus.isValid()) {
        return withPlus.format('E.164')
      }
    }
    catch {
      // Fall through
    }
  }

  if (digits.length >= 10) {
    // Try parsing the last 10 digits as a US number
    const last10 = digits.slice(-10)
    // Return E.164 format directly even if libphonenumber can't validate
    // (some area codes like 555 are fictitious but real people have them in CRMs)
    return '+1' + last10
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits
  }

  return null
}

/**
 * Extract the last N digits from a phone string.
 * Used for fuzzy phone matching when full normalization fails.
 */
export function extractPhoneDigits(phone: string, count: number = 10): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return null
  return digits.slice(-count)
}

/**
 * Normalize an address for comparison.
 * Lowercase, expand abbreviations, collapse whitespace.
 */
export function normalizeAddress(address: string): string {
  if (!address) return ''

  let normalized = address
    .toLowerCase()
    .trim()
    // Remove periods after abbreviations
    .replace(/\./g, '')
    // Remove # before unit numbers
    .replace(/#/g, '')

  // Expand common abbreviations (word-boundary aware)
  for (const [abbr, full] of Object.entries(ADDRESS_ABBREVIATIONS)) {
    const pattern = new RegExp(`\\b${abbr}\\b`, 'gi')
    normalized = normalized.replace(pattern, full)
  }

  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim()

  return normalized
}
