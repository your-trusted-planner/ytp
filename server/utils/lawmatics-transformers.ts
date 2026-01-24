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
  city: string | null
  state: string | null
  zipCode: string | null
  dateOfBirth: Date | null
  // For corporate entities detected by isProbablyPerson
  entityName: string | null
  entityType: string | null
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
 * Check if a contact is probably a person (not a business/entity)
 */
export function isProbablyPerson(contact: LawmaticsContact): boolean {
  const firstName = contact.attributes.first_name?.toLowerCase() || ''
  const lastName = contact.attributes.last_name?.toLowerCase() || ''
  const fullName = `${firstName} ${lastName}`.trim()

  // Red flags for non-person records
  const nonPersonIndicators = [
    'bank', 'trust', 'llc', 'inc', 'corp', 'corporation',
    'foundation', 'account', 'financial', 'insurance',
    'company', 'partners', 'partnership', 'holdings',
    'estate of', 'the estate', 'revocable', 'irrevocable',
    'charitable', 'family office', 'ventures', 'capital',
    'investments', 'properties', 'realty', 'associates'
  ]

  // Check if name contains non-person indicators
  if (nonPersonIndicators.some(indicator => fullName.includes(indicator))) {
    return false
  }

  // Positive signals for person records
  const hasFirstName = !!contact.attributes.first_name?.trim()
  const hasLastName = !!contact.attributes.last_name?.trim()
  const hasBirthdate = !!contact.attributes.birthdate
  const hasPhone = !!(contact.attributes.phone || contact.attributes.phone_number)

  // If has both first and last name, and either birthdate or phone, likely a person
  if (hasFirstName && hasLastName && (hasBirthdate || hasPhone)) {
    return true
  }

  // If only has first name (no last name), might be a business
  if (hasFirstName && !hasLastName) {
    // Check if first_name looks like a business name
    if (nonPersonIndicators.some(indicator => firstName.includes(indicator))) {
      return false
    }
  }

  // Default to treating as person if we have a first name
  return hasFirstName
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
 * Parse address components from Lawmatics
 * Lawmatics may have structured or unstructured address data
 */
export function parseAddress(contact: LawmaticsContact): {
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
} {
  // Try to get structured address from relationships if available
  // For now, use the address attribute directly
  const address = contact.attributes.address || null

  // Lawmatics may have separate fields in some accounts
  const city = contact.attributes.city || null
  const state = contact.attributes.state || null
  const zipCode = contact.attributes.zipcode || contact.attributes.zip_code || null

  return { address, city, state, zipCode }
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
 */
function mapUserRole(lawmaticsRole: string | undefined): { role: 'ADMIN' | 'LAWYER' | 'STAFF'; adminLevel: number } {
  const role = lawmaticsRole?.toLowerCase() || ''

  if (role === 'owner' || role === 'admin') {
    return { role: 'ADMIN', adminLevel: 2 }
  }

  if (role === 'attorney' || role === 'lawyer') {
    return { role: 'LAWYER', adminLevel: 0 }
  }

  // Paralegal, Staff, or any other role
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

  // Parse address
  const addressData = parseAddress(contact)

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
 */
export function transformContactToPerson(
  contact: LawmaticsContact,
  options: {
    importRunId?: string
  } = {}
): TransformedPerson {
  const flags: ImportFlag[] = []

  // Detect non-person records (businesses, trusts, etc.)
  const isPersonRecord = isProbablyPerson(contact)
  if (!isPersonRecord) {
    flags.push('POSSIBLY_NOT_PERSON')
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

  const createdAt = parseDate(contact.attributes.created_at) || new Date()
  const updatedAt = parseDate(contact.attributes.updated_at) || new Date()

  // Parse address
  const addressData = parseAddress(contact)

  // Parse birthdate
  const dateOfBirth = parseDate(contact.attributes.birthdate)

  // Build full name
  const firstName = contact.attributes.first_name || null
  const lastName = contact.attributes.last_name || null
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || null

  // For non-person records, capture entity info
  let entityName: string | null = null
  let entityType: string | null = null
  if (!isPersonRecord) {
    // Use the name as entity name
    entityName = fullName
    entityType = contact.attributes.contact_type || 'UNKNOWN'
  }

  return {
    id: nanoid(),
    firstName,
    lastName,
    fullName,
    email: contact.attributes.email || contact.attributes.email_address || null,
    phone: contact.attributes.phone || contact.attributes.phone_number || null,
    address: addressData.address,
    city: addressData.city,
    state: addressData.state,
    zipCode: addressData.zipCode,
    dateOfBirth,
    entityName,
    entityType,
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

  // Check for contact relationship
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

  // Check for prospect/matter relationship if no contact
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
    importRunId: options.importRunId
  })

  const createdAt = parseDate(note.attributes.created_at) || new Date()
  const updatedAt = parseDate(note.attributes.updated_at) || new Date()

  return {
    id: nanoid(),
    content: note.attributes.content || '',
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
