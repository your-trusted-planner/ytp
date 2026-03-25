import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { logActivity } from '../../../utils/activity-logger'

const updateFormSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  formType: z.enum(['questionnaire', 'intake', 'standalone', 'action']).optional(),
  isMultiStep: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.any()).nullable().optional()
})

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN'])

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing form ID' })

  const body = await readBody(event)
  const parsed = updateFormSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid input' })
  }

  const db = useDrizzle()

  const existing = await db.select({ id: schema.forms.id, name: schema.forms.name })
    .from(schema.forms)
    .where(eq(schema.forms.id, id))
    .get()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Form not found' })
  }

  const data = parsed.data
  const updates: Record<string, any> = { updatedAt: new Date() }

  if (data.name !== undefined) updates.name = data.name
  if (data.description !== undefined) updates.description = data.description
  if (data.formType !== undefined) updates.formType = data.formType
  if (data.isMultiStep !== undefined) updates.isMultiStep = data.isMultiStep
  if (data.isPublic !== undefined) updates.isPublic = data.isPublic
  if (data.isActive !== undefined) updates.isActive = data.isActive
  if (data.settings !== undefined) updates.settings = data.settings ? JSON.stringify(data.settings) : null

  await db.update(schema.forms).set(updates).where(eq(schema.forms.id, id))

  await logActivity({
    type: 'FORM_UPDATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'form', id, name: data.name || existing.name },
    event
  })

  return { success: true }
})
