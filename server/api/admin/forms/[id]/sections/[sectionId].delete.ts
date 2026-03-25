import { eq, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../../db'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const formId = getRouterParam(event, 'id')
  const sectionId = getRouterParam(event, 'sectionId')
  if (!formId || !sectionId) throw createError({ statusCode: 400, message: 'Missing IDs' })

  const db = useDrizzle()

  // Cascade deletes fields via FK onDelete: cascade
  await db.delete(schema.formSections)
    .where(and(eq(schema.formSections.id, sectionId), eq(schema.formSections.formId, formId)))

  await db.update(schema.forms).set({ updatedAt: new Date() }).where(eq(schema.forms.id, formId))

  return { success: true }
})
