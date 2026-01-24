import type { ActivityType, EntityRef } from './activity-logger'

/**
 * Activity Description Generator
 *
 * Generates human-readable descriptions from structured activity data.
 * This provides consistent, informative descriptions across all activity types.
 */

/**
 * Generates a human-readable description for an activity.
 *
 * @param type - The activity type
 * @param actorName - Name of the person performing the action
 * @param target - Primary entity being acted upon
 * @param relatedEntities - Secondary/related entities
 * @param details - Activity-specific details
 * @returns Human-readable description string
 *
 * @example
 * generateDescription('NOTE_CREATED', 'Jane Doe', { type: 'client', id: 'abc', name: 'John Smith' })
 * // Returns: "Jane Doe added a note to client John Smith"
 *
 * @example
 * generateDescription('DOCUMENT_SIGNED', 'John Smith', { type: 'document', id: 'xyz', name: 'Trust Agreement' })
 * // Returns: "John Smith signed Trust Agreement"
 */
export function generateDescription(
  type: ActivityType,
  actorName: string,
  target?: EntityRef,
  relatedEntities?: EntityRef[],
  details?: Record<string, unknown>
): string {
  const targetName = target?.name
  const targetTypeLabel = target?.type ? formatEntityType(target.type) : undefined

  // Find specific related entities by type
  const findRelated = (entityType: string) =>
    relatedEntities?.find(e => e.type === entityType)

  const client = findRelated('client')
  const template = findRelated('template')
  const document = findRelated('document')
  const matter = findRelated('matter')

  switch (type) {
    // User events
    case 'USER_LOGIN':
      return `${actorName} logged in`
    case 'USER_LOGOUT':
      return `${actorName} logged out`
    case 'USER_CREATED':
      return targetName
        ? `${actorName} created user account for ${targetName}`
        : `${actorName} account created`
    case 'USER_UPDATED':
      return targetName
        ? `${actorName} updated ${targetName}'s profile`
        : `${actorName} profile updated`
    case 'USER_PASSWORD_CHANGED':
      return `${actorName} changed password`

    // Client events
    case 'CLIENT_CREATED':
      return targetName
        ? `${actorName} created client ${targetName}`
        : `${actorName} created a new client`
    case 'CLIENT_UPDATED':
      return targetName
        ? `${actorName} updated client ${targetName}`
        : `${actorName} updated a client`
    case 'CLIENT_VIEWED':
      return targetName
        ? `${actorName} viewed client ${targetName}`
        : `${actorName} viewed a client`
    case 'CLIENT_STATUS_CHANGED':
      const newStatus = details?.newStatus || details?.status
      if (targetName && newStatus) {
        return `${actorName} changed ${targetName}'s status to ${newStatus}`
      }
      return targetName
        ? `${actorName} changed status for ${targetName}`
        : `${actorName} changed client status`

    // Matter events
    case 'MATTER_CREATED':
      return targetName
        ? `${actorName} created matter "${targetName}"`
        : `${actorName} created a new matter`
    case 'MATTER_UPDATED':
      return targetName
        ? `${actorName} updated matter "${targetName}"`
        : `${actorName} updated a matter`
    case 'MATTER_STATUS_CHANGED':
      const matterStatus = details?.newStatus || details?.status
      if (targetName && matterStatus) {
        return `${actorName} changed "${targetName}" status to ${matterStatus}`
      }
      return targetName
        ? `${actorName} changed status for "${targetName}"`
        : `${actorName} changed matter status`
    case 'MATTER_SERVICE_ADDED':
      const serviceName = findRelated('service')?.name
      if (targetName && serviceName) {
        return `${actorName} added ${serviceName} to matter "${targetName}"`
      }
      return `${actorName} added service to matter`

    // Document events
    case 'DOCUMENT_CREATED':
      if (targetName && client?.name) {
        return `${actorName} created "${targetName}" for ${client.name}`
      }
      if (targetName && template?.name) {
        return `${actorName} created "${targetName}" from template "${template.name}"`
      }
      return targetName
        ? `${actorName} created document "${targetName}"`
        : `${actorName} created a document`
    case 'DOCUMENT_VIEWED':
      return targetName
        ? `${actorName} viewed "${targetName}"`
        : `${actorName} viewed a document`
    case 'DOCUMENT_SIGNED':
      return targetName
        ? `${actorName} signed "${targetName}"`
        : `${actorName} signed a document`
    case 'DOCUMENT_DOWNLOADED':
      return targetName
        ? `${actorName} downloaded "${targetName}"`
        : `${actorName} downloaded a document`
    case 'DOCUMENT_STATUS_CHANGED':
      const docStatus = details?.newStatus || details?.status
      if (targetName && docStatus) {
        return `${actorName} changed "${targetName}" status to ${docStatus}`
      }
      return `${actorName} changed document status`
    case 'DOCUMENT_DELETED':
      return targetName
        ? `${actorName} deleted document "${targetName}"`
        : `${actorName} deleted a document`

    // Journey events
    case 'JOURNEY_STARTED':
      return targetName
        ? `${actorName} started journey "${targetName}"`
        : `${actorName} started a journey`
    case 'JOURNEY_STEP_COMPLETED':
      const stepName = details?.stepName as string | undefined
      if (targetName && stepName) {
        return `${actorName} completed "${stepName}" in "${targetName}"`
      }
      return `${actorName} completed a journey step`
    case 'JOURNEY_COMPLETED':
      return targetName
        ? `${actorName} completed journey "${targetName}"`
        : `${actorName} completed a journey`
    case 'JOURNEY_PAUSED':
      return targetName
        ? `${actorName} paused journey "${targetName}"`
        : `${actorName} paused a journey`

    // Template events
    case 'TEMPLATE_CREATED':
      return targetName
        ? `${actorName} created template "${targetName}"`
        : `${actorName} created a template`
    case 'TEMPLATE_UPDATED':
      return targetName
        ? `${actorName} updated template "${targetName}"`
        : `${actorName} updated a template`
    case 'TEMPLATE_DELETED':
      return targetName
        ? `${actorName} deleted template "${targetName}"`
        : `${actorName} deleted a template`

    // Note events
    case 'NOTE_CREATED':
      if (targetTypeLabel && targetName) {
        return `${actorName} added a note to ${targetTypeLabel.toLowerCase()} ${targetName}`
      }
      return `${actorName} added a note`
    case 'NOTE_UPDATED':
      if (targetTypeLabel && targetName) {
        return `${actorName} updated a note on ${targetTypeLabel.toLowerCase()} ${targetName}`
      }
      return `${actorName} updated a note`
    case 'NOTE_DELETED':
      if (targetTypeLabel && targetName) {
        return `${actorName} deleted a note from ${targetTypeLabel.toLowerCase()} ${targetName}`
      }
      return `${actorName} deleted a note`

    // Referral partner events
    case 'REFERRAL_PARTNER_CREATED':
      return targetName
        ? `${actorName} added referral partner "${targetName}"`
        : `${actorName} added a referral partner`
    case 'REFERRAL_PARTNER_UPDATED':
      return targetName
        ? `${actorName} updated referral partner "${targetName}"`
        : `${actorName} updated a referral partner`

    // Admin events
    case 'ADMIN_ACTION':
      const actionName = details?.action as string | undefined
      return actionName
        ? `${actorName} performed admin action: ${actionName}`
        : `${actorName} performed an admin action`
    case 'SETTINGS_CHANGED':
      const settingKey = details?.key || target?.name
      return settingKey
        ? `${actorName} changed setting: ${settingKey}`
        : `${actorName} changed system settings`

    default:
      // Fallback for unknown activity types
      return targetName
        ? `${actorName} performed ${formatActivityType(type)} on ${targetName}`
        : `${actorName} performed ${formatActivityType(type)}`
  }
}

/**
 * Formats an entity type for display.
 */
function formatEntityType(type: string): string {
  const typeMap: Record<string, string> = {
    user: 'User',
    client: 'Client',
    matter: 'Matter',
    document: 'Document',
    journey: 'Journey',
    template: 'Template',
    referral_partner: 'Referral Partner',
    service: 'Service',
    appointment: 'Appointment',
    note: 'Note',
    setting: 'Setting'
  }
  return typeMap[type] || type
}

/**
 * Formats an activity type for display.
 */
function formatActivityType(type: string): string {
  return type
    .toLowerCase()
    .replace(/_/g, ' ')
}
