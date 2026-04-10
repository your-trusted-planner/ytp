/**
 * GET /api/people/:id/reveal-field?field=tin
 *
 * Generic endpoint to reveal an encrypted sensitive field on a person record.
 * Decrypts server-side, logs the reveal as an activity, and returns the plaintext.
 *
 * Role-gated per the field's config in server/config/sensitive-fields.ts.
 * The client should NEVER cache the revealed value persistently.
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { decrypt } from '../../../utils/encryption'
import { logActivity } from '../../../utils/activity-logger'
import { resolveEntityName } from '../../../utils/entity-resolver'
import { SENSITIVE_FIELDS } from '../../../config/sensitive-fields'
import type { EntityType } from '../../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  const personId = getRouterParam(event, 'id')
  if (!personId) {
    throw createError({ statusCode: 400, message: 'Person ID required' })
  }

  const query = getQuery(event)
  const fieldKey = query.field as string
  if (!fieldKey) {
    throw createError({ statusCode: 400, message: 'field query parameter required' })
  }

  const config = SENSITIVE_FIELDS[fieldKey]
  if (!config) {
    throw createError({ statusCode: 400, message: `Unknown sensitive field: ${fieldKey}` })
  }

  // Check role authorization using the standard RBAC utility
  const user = requireRole(event, config.revealRoles)

  const db = useDrizzle()

  // Load the person record
  const person = await db.select()
    .from(schema.people)
    .where(eq(schema.people.id, personId))
    .get()

  if (!person) {
    throw createError({ statusCode: 404, message: 'Person not found' })
  }

  // Get the encrypted value from the record
  const encryptedValue = (person as any)[config.encryptedColumn]
  if (!encryptedValue) {
    throw createError({
      statusCode: 422,
      message: `Full ${config.label} is not stored for this record (only last ${config.displayLength} digits available)`
    })
  }

  // Decrypt server-side
  const plaintext = await decrypt(event, encryptedValue)

  // Audit log the reveal
  const entityName = await resolveEntityName('person' as EntityType, personId)
  await logActivity({
    type: config.auditEvent as any,
    userId: user.id,
    userRole: user.role,
    target: { type: 'person' as EntityType, id: personId, name: entityName || 'Unknown' },
    event,
    details: {
      field: fieldKey,
      label: config.label
    }
  })

  return { value: plaintext }
})
