import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'
import { safeDeletePerson } from '../../utils/person-delete'

// Delete a person
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const personId = getRouterParam(event, 'id')
  if (!personId) {
    throw createError({
      statusCode: 400,
      message: 'Person ID required'
    })
  }

  const db = useDrizzle()

  // Check if person exists
  const person = await db.select().from(schema.people).where(eq(schema.people.id, personId)).get()

  if (!person) {
    throw createError({
      statusCode: 404,
      message: 'Person not found'
    })
  }

  // Use safe delete utility that handles all FK references
  const result = await safeDeletePerson(personId)

  if (!result.deleted) {
    throw createError({
      statusCode: 500,
      message: `Failed to delete person: ${result.error}`
    })
  }

  // Build summary of what was cleaned up
  const cleanedUpItems: string[] = []
  if (result.cleanedUp.clients > 0) cleanedUpItems.push(`${result.cleanedUp.clients} client record(s)`)
  if (result.cleanedUp.users > 0) cleanedUpItems.push(`${result.cleanedUp.users} user link(s)`)
  if (result.cleanedUp.planRoles > 0) cleanedUpItems.push(`${result.cleanedUp.planRoles} plan role(s)`)
  if (result.cleanedUp.estatePlans > 0) cleanedUpItems.push(`${result.cleanedUp.estatePlans} estate plan link(s)`)
  if (result.cleanedUp.wills > 0) cleanedUpItems.push(`${result.cleanedUp.wills} will(s)`)
  if (result.cleanedUp.ancillaryDocuments > 0) cleanedUpItems.push(`${result.cleanedUp.ancillaryDocuments} ancillary document(s)`)
  if (result.cleanedUp.relationships > 0) cleanedUpItems.push(`${result.cleanedUp.relationships} relationship(s)`)
  if (result.cleanedUp.clientRelationships > 0) cleanedUpItems.push(`${result.cleanedUp.clientRelationships} client relationship(s)`)
  if (result.cleanedUp.matterRelationships > 0) cleanedUpItems.push(`${result.cleanedUp.matterRelationships} matter relationship(s)`)
  if (result.cleanedUp.importDuplicates > 0) cleanedUpItems.push(`${result.cleanedUp.importDuplicates} import duplicate(s)`)

  return {
    success: true,
    message: cleanedUpItems.length > 0
      ? `Person deleted along with ${cleanedUpItems.join(', ')}`
      : 'Person deleted successfully',
    cleanedUp: result.cleanedUp
  }
})
