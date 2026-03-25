import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { useDrizzle, schema } from '../../../../../db'

const createSectionSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional()
})

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const formId = getRouterParam(event, 'id')
  if (!formId) throw createError({ statusCode: 400, message: 'Missing form ID' })

  const body = await readBody(event)
  const parsed = createSectionSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  const db = useDrizzle()

  // Get max section order
  const maxOrder = await db.get(
    sql`SELECT MAX(section_order) as max_order FROM form_sections WHERE form_id = ${formId}`
  ) as { max_order: number | null } | undefined
  const nextOrder = (maxOrder?.max_order ?? -1) + 1

  const sectionId = nanoid()
  await db.insert(schema.formSections).values({
    id: sectionId,
    formId,
    title: parsed.data.title || null,
    description: parsed.data.description || null,
    sectionOrder: nextOrder
  })

  await db.update(schema.forms).set({ updatedAt: new Date() }).where(eq(schema.forms.id, formId))

  return { success: true, sectionId }
})
