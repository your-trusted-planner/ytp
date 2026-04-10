/**
 * Phone number formatting and validation for SMS delivery.
 *
 * All outbound SMS must use E.164 format (e.g. "+15551234567").
 * This module normalizes common US input formats into E.164 and
 * validates that a given string is already in E.164 form.
 */

/**
 * Normalize a phone number string into E.164 format.
 *
 * Accepts common US formats: "5551234567", "(555) 123-4567", "555-123-4567",
 * "555.123.4567", "1 555 123 4567", "+15551234567". Returns null if the
 * input is empty, contains non-phone characters, or has an invalid number
 * of digits for NANP.
 *
 * International numbers must already be in E.164 form (starting with "+").
 */
export function formatE164(input: string | null | undefined): string | null {
  if (input == null) return null
  const trimmed = String(input).trim()
  if (!trimmed) return null

  // Already E.164? Validate and pass through.
  if (trimmed.startsWith('+')) {
    return isValidE164(trimmed) ? trimmed : null
  }

  // Strip all non-digit characters
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 0) return null

  // Reject if the stripped result doesn't account for most of the input —
  // this catches things like "not a phone number" that happen to contain digits
  // (this check is lenient: we allow punctuation and spaces).
  const nonDigitNonPunct = trimmed.replace(/[\s\d().\-+]/g, '')
  if (nonDigitNonPunct.length > 0) return null

  // NANP: 10 digits (area code + number) or 11 with leading "1"
  if (digits.length === 10) {
    // Area code can't start with 0 or 1
    if (digits[0] === '0' || digits[0] === '1') return null
    return `+1${digits}`
  }

  if (digits.length === 11 && digits[0] === '1') {
    // Second digit (start of area code) can't be 0 or 1
    if (digits[1] === '0' || digits[1] === '1') return null
    return `+${digits}`
  }

  return null
}

/**
 * Check whether a string is a valid E.164 phone number.
 *
 * E.164 format: "+" followed by up to 15 digits, first digit non-zero.
 * Minimum length varies by country but 8 digits total (including country code)
 * is a reasonable floor.
 */
export function isValidE164(input: string | null | undefined): boolean {
  if (input == null) return false
  if (typeof input !== 'string') return false
  return /^\+[1-9]\d{7,14}$/.test(input)
}
