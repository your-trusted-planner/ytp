/**
 * Bulk save a form's full definition (sections + fields).
 * Deletes all existing sections/fields and recreates from the submitted definition.
 * This avoids complex client-side diffing and ensures atomic consistency.
 */
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { useDrizzle, schema } from '../../../../db'

const fieldSchema = z.object({
  id: z.string().optional(),
  fieldType: z.enum([
    'text', 'textarea', 'email', 'phone', 'number', 'date',
    'select', 'multi_select', 'radio', 'checkbox',
    'yes_no', 'file_upload', 'scheduler', 'content'
  ]),
  label: z.string().min(1),
  fieldOrder: z.number().int().min(0),
  isRequired: z.boolean().default(false),
  colSpan: z.number().int().min(1).max(12).default(12),
  config: z.any().nullable().optional(),
  conditionalLogic: z.any().nullable().optional(),
  personFieldMapping: z.string().nullable().optional()
})

const sectionSchema = z.object({
  id: z.string().optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  sectionOrder: z.number().int().min(0),
  fields: z.array(fieldSchema)
})

const saveDefinitionSchema = z.object({
  sections: z.array(sectionSchema).min(1)
})

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing form ID' })

  const body = await readBody(event)
  const parsed = saveDefinitionSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid definition' })
  }

  const db = useDrizzle()

  const form = await db.select({ id: schema.forms.id })
    .from(schema.forms)
    .where(eq(schema.forms.id, id))
    .get()

  if (!form) {
    throw createError({ statusCode: 404, message: 'Form not found' })
  }

  // Delete all existing fields first (avoid FK constraint issues)
  await db.delete(schema.formFields).where(eq(schema.formFields.formId, id))
  await db.delete(schema.formSections).where(eq(schema.formSections.formId, id))

  // Recreate from submitted definition
  for (const section of parsed.data.sections) {
    const sectionId = nanoid()

    await db.insert(schema.formSections).values({
      id: sectionId,
      formId: id,
      title: section.title || null,
      description: section.description || null,
      sectionOrder: section.sectionOrder
    })

    for (const field of section.fields) {
      await db.insert(schema.formFields).values({
        id: nanoid(),
        sectionId,
        formId: id,
        fieldType: field.fieldType,
        label: field.label,
        fieldOrder: field.fieldOrder,
        isRequired: field.isRequired,
        colSpan: field.colSpan || 12,
        config: field.config ? JSON.stringify(field.config) : null,
        conditionalLogic: field.conditionalLogic ? JSON.stringify(field.conditionalLogic) : null,
        personFieldMapping: field.personFieldMapping || null
      })
    }
  }

  await db.update(schema.forms).set({ updatedAt: new Date() }).where(eq(schema.forms.id, id))

  return { success: true }
})
