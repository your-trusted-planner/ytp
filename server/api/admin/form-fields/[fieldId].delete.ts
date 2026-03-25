import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const fieldId = getRouterParam(event, 'fieldId')
  if (!fieldId) throw createError({ statusCode: 400, message: 'Missing field ID' })

  const db = useDrizzle()

  // Get formId before deleting
  const field = await db.select({ formId: schema.formFields.formId })
    .from(schema.formFields)
    .where(eq(schema.formFields.id, fieldId))
    .get()

  await db.delete(schema.formFields).where(eq(schema.formFields.id, fieldId))

  if (field?.formId) {
    await db.update(schema.forms).set({ updatedAt: new Date() }).where(eq(schema.forms.id, field.formId))
  }

  return { success: true }
})
