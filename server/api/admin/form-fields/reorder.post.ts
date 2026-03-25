import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

const reorderSchema = z.object({
  formId: z.string(),
  fieldIds: z.array(z.string()).min(1)
})

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const body = await readBody(event)
  const parsed = reorderSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  const db = useDrizzle()

  for (let i = 0; i < parsed.data.fieldIds.length; i++) {
    await db.update(schema.formFields)
      .set({ fieldOrder: i, updatedAt: new Date() })
      .where(eq(schema.formFields.id, parsed.data.fieldIds[i]!))
  }

  await db.update(schema.forms).set({ updatedAt: new Date() }).where(eq(schema.forms.id, parsed.data.formId))

  return { success: true }
})
