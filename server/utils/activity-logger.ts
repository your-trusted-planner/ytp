import { H3Event } from 'h3'
import { generateId } from './auth'
import { captureRequestContext } from './request-context'
import { generateDescription } from './activity-description'

// Entity types that can be referenced in activities
export type EntityType =
  | 'user'
  | 'person'   // New: Any person in the system (Belly Button Principle)
  | 'client'
  | 'matter'
  | 'document'
  | 'journey'
  | 'template'
  | 'referral_partner'
  | 'service'
  | 'appointment'
  | 'note'
  | 'setting'

/**
 * Standardized entity reference for activity logging.
 * Stores both the ID (for linking) and name snapshot (for historical accuracy).
 */
export interface EntityRef {
  type: EntityType
  id: string
  name: string // Name snapshot at log time
}

// Activity types for structured logging
export type ActivityType =
  // User events
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_PASSWORD_CHANGED'
  // Client events
  | 'CLIENT_CREATED'
  | 'CLIENT_UPDATED'
  | 'CLIENT_VIEWED'
  | 'CLIENT_STATUS_CHANGED'
  // Matter events
  | 'MATTER_CREATED'
  | 'MATTER_UPDATED'
  | 'MATTER_STATUS_CHANGED'
  | 'MATTER_SERVICE_ADDED'
  // Document events
  | 'DOCUMENT_CREATED'
  | 'DOCUMENT_VIEWED'
  | 'DOCUMENT_SIGNED'
  | 'DOCUMENT_DOWNLOADED'
  | 'DOCUMENT_STATUS_CHANGED'
  | 'DOCUMENT_DELETED'
  // Journey events
  | 'JOURNEY_STARTED'
  | 'JOURNEY_STEP_COMPLETED'
  | 'JOURNEY_COMPLETED'
  | 'JOURNEY_PAUSED'
  // Template events
  | 'TEMPLATE_CREATED'
  | 'TEMPLATE_UPDATED'
  | 'TEMPLATE_DELETED'
  // Note events
  | 'NOTE_CREATED'
  | 'NOTE_UPDATED'
  | 'NOTE_DELETED'
  // Referral events
  | 'REFERRAL_PARTNER_CREATED'
  | 'REFERRAL_PARTNER_UPDATED'
  // Admin events
  | 'ADMIN_ACTION'
  | 'SETTINGS_CHANGED'

export type TargetType = 'user' | 'client' | 'matter' | 'document' | 'journey' | 'template' | 'referral_partner' | 'setting' | 'note'

export interface LogActivityParams {
  type: ActivityType
  userId: string
  userRole?: string

  // NEW: Structured entity references (preferred)
  target?: EntityRef                    // Primary entity being acted upon
  relatedEntities?: EntityRef[]         // Secondary/related entities

  // NEW: Structured details (preferred over metadata for activity-specific data)
  details?: Record<string, unknown>

  // Description: auto-generated from target/relatedEntities if not provided
  description?: string

  // LEGACY: Keep for backward compatibility, prefer using target EntityRef
  metadata?: Record<string, any>
  targetType?: TargetType
  targetId?: string

  // Funnel dimensions
  journeyId?: string
  journeyStepId?: string
  matterId?: string
  serviceId?: string
  // Attribution dimensions
  attributionSource?: string
  attributionMedium?: string
  attributionCampaign?: string
  // Optional H3Event for request context capture
  event?: H3Event
}

export interface ActivityRecord {
  id: string
  type: ActivityType
  description: string
  userId: string
  userRole: string | null
  targetType: string | null
  targetId: string | null
  journeyId: string | null
  journeyStepId: string | null
  matterId: string | null
  serviceId: string | null
  attributionSource: string | null
  attributionMedium: string | null
  attributionCampaign: string | null
  ipAddress: string | null
  userAgent: string | null
  country: string | null
  city: string | null
  requestId: string | null
  metadata: string | null
  createdAt: Date
}

/**
 * Helper to get the actor's name from their user ID.
 */
async function getActorName(
  db: ReturnType<typeof import('../db').useDrizzle>,
  schema: typeof import('../db').schema,
  userId: string
): Promise<string> {
  const { eq } = await import('drizzle-orm')
  const user = await db
    .select({
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      email: schema.users.email
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get()

  if (!user) return 'Unknown User'
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Unknown User'
}

/**
 * Logs an activity to the database with optional request context capture.
 * This is the primary function for recording user actions throughout the application.
 *
 * @param params - Activity parameters
 * @returns The created activity record ID
 *
 * @example
 * // Basic usage (legacy style)
 * await logActivity({
 *   type: 'USER_LOGIN',
 *   description: 'User logged in successfully',
 *   userId: user.id,
 *   userRole: user.role,
 *   event // H3Event for request context
 * })
 *
 * @example
 * // With structured entity references (preferred)
 * await logActivity({
 *   type: 'DOCUMENT_SIGNED',
 *   userId: client.id,
 *   userRole: 'CLIENT',
 *   target: { type: 'document', id: document.id, name: 'Trust Agreement' },
 *   relatedEntities: [
 *     { type: 'client', id: client.id, name: 'John Smith' }
 *   ],
 *   matterId: matter.id,
 *   event
 * })
 */
export async function logActivity(params: LogActivityParams): Promise<string> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  const id = generateId()
  const now = new Date()

  // Capture request context if event is provided
  let requestContext = {
    ipAddress: null as string | null,
    userAgent: null as string | null,
    country: null as string | null,
    city: null as string | null,
    requestId: null as string | null
  }

  if (params.event) {
    const ctx = captureRequestContext(params.event)
    requestContext = {
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      country: ctx.country,
      city: ctx.city,
      requestId: ctx.requestId
    }
  }

  // Build structured metadata combining new and legacy formats
  const structuredMetadata: Record<string, unknown> = {
    ...(params.metadata || {})
  }

  // Add new structured fields to metadata
  if (params.target) {
    structuredMetadata.target = params.target
  }
  if (params.relatedEntities && params.relatedEntities.length > 0) {
    structuredMetadata.relatedEntities = params.relatedEntities
  }
  if (params.details) {
    structuredMetadata.details = params.details
  }

  // Serialize metadata to JSON
  const metadataJson = Object.keys(structuredMetadata).length > 0
    ? JSON.stringify(structuredMetadata)
    : null

  // Use target EntityRef to populate targetType/targetId if not explicitly set
  const targetType = params.targetType || (params.target?.type as TargetType) || null
  const targetId = params.targetId || params.target?.id || null

  // Generate description if not provided
  let description = params.description
  if (!description && params.target) {
    // Fetch actor name for description generation
    const actorName = await getActorName(db, schema, params.userId)
    description = generateDescription(
      params.type,
      actorName,
      params.target,
      params.relatedEntities,
      params.details
    )
  } else if (!description) {
    // Fallback for activities without structured refs
    description = `Activity: ${params.type}`
  }

  await db.insert(schema.activities).values({
    id,
    type: params.type,
    description,
    userId: params.userId,
    userRole: params.userRole || null,
    targetType,
    targetId,
    journeyId: params.journeyId || null,
    journeyStepId: params.journeyStepId || null,
    matterId: params.matterId || null,
    serviceId: params.serviceId || null,
    attributionSource: params.attributionSource || null,
    attributionMedium: params.attributionMedium || null,
    attributionCampaign: params.attributionCampaign || null,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    country: requestContext.country,
    city: requestContext.city,
    requestId: requestContext.requestId,
    metadata: metadataJson,
    createdAt: now
  })

  return id
}

/**
 * Helper to create a standard description for common activity types.
 */
export function formatActivityDescription(
  type: ActivityType,
  actorName: string,
  targetName?: string
): string {
  const descriptions: Record<ActivityType, string> = {
    USER_LOGIN: `${actorName} logged in`,
    USER_LOGOUT: `${actorName} logged out`,
    USER_CREATED: `${actorName} account created`,
    USER_UPDATED: `${actorName} profile updated`,
    USER_PASSWORD_CHANGED: `${actorName} changed password`,
    CLIENT_CREATED: targetName ? `${actorName} created client ${targetName}` : `${actorName} created a new client`,
    CLIENT_UPDATED: targetName ? `${actorName} updated client ${targetName}` : `${actorName} updated client`,
    CLIENT_VIEWED: targetName ? `${actorName} viewed client ${targetName}` : `${actorName} viewed client`,
    CLIENT_STATUS_CHANGED: targetName ? `${actorName} changed status for ${targetName}` : `${actorName} changed client status`,
    MATTER_CREATED: targetName ? `${actorName} created matter "${targetName}"` : `${actorName} created a new matter`,
    MATTER_UPDATED: targetName ? `${actorName} updated matter "${targetName}"` : `${actorName} updated matter`,
    MATTER_STATUS_CHANGED: targetName ? `${actorName} changed status for "${targetName}"` : `${actorName} changed matter status`,
    MATTER_SERVICE_ADDED: `${actorName} added service to matter`,
    DOCUMENT_CREATED: targetName ? `${actorName} created document "${targetName}"` : `${actorName} created a document`,
    DOCUMENT_VIEWED: targetName ? `${actorName} viewed document "${targetName}"` : `${actorName} viewed a document`,
    DOCUMENT_SIGNED: targetName ? `${actorName} signed "${targetName}"` : `${actorName} signed a document`,
    DOCUMENT_DOWNLOADED: targetName ? `${actorName} downloaded "${targetName}"` : `${actorName} downloaded a document`,
    DOCUMENT_STATUS_CHANGED: `${actorName} changed document status`,
    DOCUMENT_DELETED: targetName ? `${actorName} deleted document "${targetName}"` : `${actorName} deleted a document`,
    JOURNEY_STARTED: targetName ? `${actorName} started journey "${targetName}"` : `${actorName} started a journey`,
    JOURNEY_STEP_COMPLETED: `${actorName} completed a journey step`,
    JOURNEY_COMPLETED: targetName ? `${actorName} completed journey "${targetName}"` : `${actorName} completed a journey`,
    JOURNEY_PAUSED: `${actorName} paused a journey`,
    TEMPLATE_CREATED: targetName ? `${actorName} created template "${targetName}"` : `${actorName} created a template`,
    TEMPLATE_UPDATED: targetName ? `${actorName} updated template "${targetName}"` : `${actorName} updated a template`,
    TEMPLATE_DELETED: targetName ? `${actorName} deleted template "${targetName}"` : `${actorName} deleted a template`,
    REFERRAL_PARTNER_CREATED: targetName ? `${actorName} added referral partner "${targetName}"` : `${actorName} added a referral partner`,
    REFERRAL_PARTNER_UPDATED: targetName ? `${actorName} updated referral partner "${targetName}"` : `${actorName} updated a referral partner`,
    ADMIN_ACTION: `${actorName} performed an admin action`,
    SETTINGS_CHANGED: `${actorName} changed system settings`,
    NOTE_CREATED: targetName ? `${actorName} added a note to ${targetName}` : `${actorName} added a note`,
    NOTE_UPDATED: targetName ? `${actorName} updated a note on ${targetName}` : `${actorName} updated a note`,
    NOTE_DELETED: targetName ? `${actorName} deleted a note from ${targetName}` : `${actorName} deleted a note`
  }

  return descriptions[type] || `${actorName} performed ${type}`
}
