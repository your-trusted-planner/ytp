import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { logActivity } from '../../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN'])

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing form ID' })

  const db = useDrizzle()

  const existing = await db.select({ id: schema.forms.id, name: schema.forms.name })
    .from(schema.forms)
    .where(eq(schema.forms.id, id))
    .get()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Form not found' })
  }

  // Soft delete
  await db.update(schema.forms)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(schema.forms.id, id))

  await logActivity({
    type: 'FORM_DELETED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'form', id, name: existing.name },
    event
  })

  return { success: true }
})
