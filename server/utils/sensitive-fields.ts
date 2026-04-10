/**
 * Sensitive Field Helpers
 *
 * Encrypt a value and extract the display suffix in one call.
 * Used by person create/update endpoints when storing TIN or
 * any future sensitive field defined in server/config/sensitive-fields.ts.
 */

import type { EncryptionContext } from './encryption'
import { encrypt } from './encryption'
import { SENSITIVE_FIELDS } from '../config/sensitive-fields'

/**
 * Encrypt a sensitive field value and extract the masked display suffix.
 *
 * @param context - H3 event or Cloudflare env (for encryption key access)
 * @param fieldKey - Key in SENSITIVE_FIELDS config (e.g., 'tin')
 * @param plaintext - The full value to encrypt (e.g., '123-45-6789')
 * @returns { encrypted, display } — encrypted ciphertext and last-N plaintext
 */
export async function storeSensitiveField(
  context: EncryptionContext,
  fieldKey: string,
  plaintext: string
): Promise<{ encrypted: string, display: string }> {
  const config = SENSITIVE_FIELDS[fieldKey]
  if (!config) {
    throw new Error(`Unknown sensitive field: ${fieldKey}`)
  }

  // Strip formatting (dashes, spaces) for storage, keep digits only
  const digitsOnly = plaintext.replace(/\D/g, '')
  if (!digitsOnly) {
    throw new Error(`${config.label} must contain at least one digit`)
  }

  const encrypted = await encrypt(context, digitsOnly)
  const display = digitsOnly.slice(-config.displayLength)

  return { encrypted, display }
}

/**
 * Format a display value using the field's mask format.
 *
 * @param fieldKey - Key in SENSITIVE_FIELDS config (e.g., 'tin')
 * @param displayValue - The last-N plaintext (e.g., '6789')
 * @returns Masked string (e.g., '•••-••-6789')
 */
export function formatSensitiveDisplay(fieldKey: string, displayValue: string | null): string | null {
  if (!displayValue) return null
  const config = SENSITIVE_FIELDS[fieldKey]
  if (!config) return displayValue
  return config.maskFormat.replace('{value}', displayValue)
}
