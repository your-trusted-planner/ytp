import { eq, count } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'

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

  // Check if person is linked to any user (can't delete if they have portal access)
  const linkedUser = await db.select().from(schema.users).where(eq(schema.users.personId, personId)).get()

  if (linkedUser) {
    throw createError({
      statusCode: 400,
      message: 'Cannot delete person: they have portal access. Remove user account first.'
    })
  }

  // Check for relationships (warn but allow - CASCADE will handle cleanup)
  const clientRelCountResult = await db
    .select({ count: count() })
    .from(schema.clientRelationships)
    .where(eq(schema.clientRelationships.personId, personId))
    .get()

  const matterRelCountResult = await db
    .select({ count: count() })
    .from(schema.matterRelationships)
    .where(eq(schema.matterRelationships.personId, personId))
    .get()

  const totalRelationships = (clientRelCountResult?.count || 0) + (matterRelCountResult?.count || 0)

  // Delete the person (CASCADE will remove relationships)
  await db.delete(schema.people).where(eq(schema.people.id, personId))

  return {
    success: true,
    message: totalRelationships > 0
      ? `Person deleted along with ${totalRelationships} relationship(s)`
      : 'Person deleted successfully'
  }
})
