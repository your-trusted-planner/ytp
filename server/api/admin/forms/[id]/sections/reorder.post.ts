import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../../db'

const reorderSchema = z.object({
  sectionIds: z.array(z.string()).min(1)
})

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const formId = getRouterParam(event, 'id')
  if (!formId) throw createError({ statusCode: 400, message: 'Missing form ID' })

  const body = await readBody(event)
  const parsed = reorderSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  const db = useDrizzle()

  // Update each section's order
  for (let i = 0; i < parsed.data.sectionIds.length; i++) {
    await db.update(schema.formSections)
      .set({ sectionOrder: i, updatedAt: new Date() })
      .where(eq(schema.formSections.id, parsed.data.sectionIds[i]!))
  }

  await db.update(schema.forms).set({ updatedAt: new Date() }).where(eq(schema.forms.id, formId))

  return { success: true }
})
