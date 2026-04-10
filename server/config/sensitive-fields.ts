/**
 * Sensitive Field Configuration
 *
 * Developer-level config defining which fields are stored encrypted, how
 * they're masked for display, and who can reveal the full value. This is
 * the single source of truth — adding a new sensitive field means adding
 * an entry here plus the schema columns. No new endpoints or components.
 *
 * See CLAUDE.md "Sensitive Field Obfuscation Pattern" for the full design.
 */

export interface SensitiveFieldConfig {
  /** The DB table containing this field */
  table: string
  /** Column storing AES-GCM encrypted full value */
  encryptedColumn: string
  /** Column storing plaintext last-N for masked display */
  displayColumn: string
  /** How many trailing characters to store in displayColumn */
  displayLength: number
  /** Format string for masked display — {value} is replaced with the displayColumn value */
  maskFormat: string
  /** Roles allowed to call the reveal endpoint */
  revealRoles: string[]
  /** Activity type logged on reveal */
  auditEvent: string
  /** Human-readable label for UI and logs */
  label: string
}

export const SENSITIVE_FIELDS: Record<string, SensitiveFieldConfig> = {
  tin: {
    table: 'people',
    encryptedColumn: 'tinEncrypted',
    displayColumn: 'tinLast4',
    displayLength: 4,
    maskFormat: '•••-••-{value}',
    revealRoles: ['ADMIN', 'LAWYER'],
    auditEvent: 'SENSITIVE_FIELD_REVEALED',
    label: 'Tax ID'
  }
  // Future fields:
  // bankAccount: {
  //   table: 'trustAccounts',
  //   encryptedColumn: 'accountNumberEncrypted',
  //   displayColumn: 'accountNumberLast4',
  //   displayLength: 4,
  //   maskFormat: '••••••{value}',
  //   revealRoles: ['ADMIN', 'LAWYER'],
  //   auditEvent: 'SENSITIVE_FIELD_REVEALED',
  //   label: 'Account Number'
  // }
}
