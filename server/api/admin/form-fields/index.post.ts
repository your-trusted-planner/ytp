import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { useDrizzle, schema } from '../../../db'

const createFieldSchema = z.object({
  formId: z.string(),
  sectionId: z.string(),
  fieldType: z.enum([
    'text', 'textarea', 'email', 'phone', 'number', 'date',
    'select', 'multi_select', 'radio', 'checkbox',
    'yes_no', 'file_upload', 'scheduler', 'content'
  ]),
  label: z.string().min(1, 'Label is required'),
  isRequired: z.boolean().default(false),
  colSpan: z.number().int().min(1).max(12).default(12),
  config: z.record(z.any()).optional(),
  conditionalLogic: z.object({
    action: z.enum(['show', 'hide']),
    match: z.enum(['all', 'any']),
    rules: z.array(z.object({
      fieldId: z.string(),
      operator: z.enum(['eq', 'neq', 'contains', 'not_contains', 'is_empty', 'is_not_empty']),
      value: z.union([z.string(), z.array(z.string())]).optional()
    }))
  }).optional(),
  personFieldMapping: z.string().optional()
})

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const body = await readBody(event)
  const parsed = createFieldSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid input' })
  }

  const db = useDrizzle()
  const data = parsed.data

  // Get max field order in this section
  const maxOrder = await db.get(
    sql`SELECT MAX(field_order) as max_order FROM form_fields WHERE section_id = ${data.sectionId}`
  ) as { max_order: number | null } | undefined
  const nextOrder = (maxOrder?.max_order ?? -1) + 1

  const fieldId = nanoid()

  await db.insert(schema.formFields).values({
    id: fieldId,
    sectionId: data.sectionId,
    formId: data.formId,
    fieldType: data.fieldType,
    label: data.label,
    fieldOrder: nextOrder,
    isRequired: data.isRequired,
    colSpan: data.colSpan,
    config: data.config ? JSON.stringify(data.config) : null,
    conditionalLogic: data.conditionalLogic ? JSON.stringify(data.conditionalLogic) : null,
    personFieldMapping: data.personFieldMapping || null
  })

  await db.update(schema.forms).set({ updatedAt: new Date() }).where(eq(schema.forms.id, data.formId))

  return { success: true, fieldId }
})
