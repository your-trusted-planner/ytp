import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../../db'

const updateSectionSchema = z.object({
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  sectionOrder: z.number().int().min(0).optional()
})

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const formId = getRouterParam(event, 'id')
  const sectionId = getRouterParam(event, 'sectionId')
  if (!formId || !sectionId) throw createError({ statusCode: 400, message: 'Missing IDs' })

  const body = await readBody(event)
  const parsed = updateSectionSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  const db = useDrizzle()

  const updates: Record<string, any> = { updatedAt: new Date() }
  if (parsed.data.title !== undefined) updates.title = parsed.data.title
  if (parsed.data.description !== undefined) updates.description = parsed.data.description
  if (parsed.data.sectionOrder !== undefined) updates.sectionOrder = parsed.data.sectionOrder

  await db.update(schema.formSections)
    .set(updates)
    .where(and(eq(schema.formSections.id, sectionId), eq(schema.formSections.formId, formId)))

  await db.update(schema.forms).set({ updatedAt: new Date() }).where(eq(schema.forms.id, formId))

  return { success: true }
})
