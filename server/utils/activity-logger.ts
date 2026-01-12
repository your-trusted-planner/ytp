import { H3Event } from 'h3'
import { generateId } from './auth'
import { captureRequestContext } from './request-context'

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
  // Referral events
  | 'REFERRAL_PARTNER_CREATED'
  | 'REFERRAL_PARTNER_UPDATED'
  // Admin events
  | 'ADMIN_ACTION'
  | 'SETTINGS_CHANGED'

export type TargetType = 'user' | 'client' | 'matter' | 'document' | 'journey' | 'template' | 'referral_partner' | 'setting'

export interface LogActivityParams {
  type: ActivityType
  description: string
  userId: string
  userRole?: string
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
 * Logs an activity to the database with optional request context capture.
 * This is the primary function for recording user actions throughout the application.
 *
 * @param params - Activity parameters
 * @returns The created activity record ID
 *
 * @example
 * // Basic usage
 * await logActivity({
 *   type: 'USER_LOGIN',
 *   description: 'User logged in successfully',
 *   userId: user.id,
 *   userRole: user.role,
 *   event // H3Event for request context
 * })
 *
 * @example
 * // With target entity
 * await logActivity({
 *   type: 'DOCUMENT_SIGNED',
 *   description: 'Client signed engagement letter',
 *   userId: client.id,
 *   userRole: 'CLIENT',
 *   targetType: 'document',
 *   targetId: document.id,
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

  // Serialize metadata to JSON if provided
  const metadataJson = params.metadata ? JSON.stringify(params.metadata) : null

  await db.insert(schema.activities).values({
    id,
    type: params.type,
    description: params.description,
    userId: params.userId,
    userRole: params.userRole || null,
    targetType: params.targetType || null,
    targetId: params.targetId || null,
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
    SETTINGS_CHANGED: `${actorName} changed system settings`
  }

  return descriptions[type] || `${actorName} performed ${type}`
}
