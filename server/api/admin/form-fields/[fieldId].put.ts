import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

const updateFieldSchema = z.object({
  label: z.string().min(1).optional(),
  fieldType: z.enum([
    'text', 'textarea', 'email', 'phone', 'number', 'date',
    'select', 'multi_select', 'radio', 'checkbox',
    'yes_no', 'file_upload', 'scheduler', 'content'
  ]).optional(),
  fieldOrder: z.number().int().min(0).optional(),
  sectionId: z.string().optional(),
  isRequired: z.boolean().optional(),
  colSpan: z.number().int().min(1).max(12).optional(),
  config: z.record(z.any()).nullable().optional(),
  conditionalLogic: z.object({
    action: z.enum(['show', 'hide']),
    match: z.enum(['all', 'any']),
    rules: z.array(z.object({
      fieldId: z.string(),
      operator: z.enum(['eq', 'neq', 'contains', 'not_contains', 'is_empty', 'is_not_empty']),
      value: z.union([z.string(), z.array(z.string())]).optional()
    }))
  }).nullable().optional(),
  personFieldMapping: z.string().nullable().optional()
})

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const fieldId = getRouterParam(event, 'fieldId')
  if (!fieldId) throw createError({ statusCode: 400, message: 'Missing field ID' })

  const body = await readBody(event)
  const parsed = updateFieldSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid input' })
  }

  const db = useDrizzle()
  const data = parsed.data
  const updates: Record<string, any> = { updatedAt: new Date() }

  if (data.label !== undefined) updates.label = data.label
  if (data.fieldType !== undefined) updates.fieldType = data.fieldType
  if (data.fieldOrder !== undefined) updates.fieldOrder = data.fieldOrder
  if (data.sectionId !== undefined) updates.sectionId = data.sectionId
  if (data.isRequired !== undefined) updates.isRequired = data.isRequired
  if (data.colSpan !== undefined) updates.colSpan = data.colSpan
  if (data.config !== undefined) updates.config = data.config ? JSON.stringify(data.config) : null
  if (data.conditionalLogic !== undefined) updates.conditionalLogic = data.conditionalLogic ? JSON.stringify(data.conditionalLogic) : null
  if (data.personFieldMapping !== undefined) updates.personFieldMapping = data.personFieldMapping

  // Get formId for updating the form's updatedAt
  const field = await db.select({ formId: schema.formFields.formId })
    .from(schema.formFields)
    .where(eq(schema.formFields.id, fieldId))
    .get()

  await db.update(schema.formFields)
    .set(updates)
    .where(eq(schema.formFields.id, fieldId))

  if (field?.formId) {
    await db.update(schema.forms).set({ updatedAt: new Date() }).where(eq(schema.forms.id, field.formId))
  }

  return { success: true }
})
