/**
 * Public form definition endpoint — no auth required.
 * Returns the full form definition for rendering.
 */
import { eq, and, asc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, message: 'Missing form slug' })

  const db = useDrizzle()

  const form = await db.select()
    .from(schema.forms)
    .where(and(eq(schema.forms.slug, slug), eq(schema.forms.isActive, true), eq(schema.forms.isPublic, true)))
    .get()

  if (!form) {
    throw createError({ statusCode: 404, message: 'Form not found' })
  }

  const sections = await db.select()
    .from(schema.formSections)
    .where(eq(schema.formSections.formId, form.id))
    .orderBy(asc(schema.formSections.sectionOrder))
    .all()

  const fields = await db.select()
    .from(schema.formFields)
    .where(eq(schema.formFields.formId, form.id))
    .orderBy(asc(schema.formFields.fieldOrder))
    .all()

  const fieldsBySection = new Map<string, typeof fields>()
  for (const field of fields) {
    const list = fieldsBySection.get(field.sectionId) || []
    list.push(field)
    fieldsBySection.set(field.sectionId, list)
  }

  return {
    id: form.id,
    name: form.name,
    slug: form.slug,
    description: form.description,
    formType: form.formType,
    isMultiStep: form.isMultiStep,
    isActive: form.isActive,
    settings: form.settings ? JSON.parse(form.settings) : null,
    sections: sections.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      sectionOrder: s.sectionOrder,
      fields: (fieldsBySection.get(s.id) || []).map(f => ({
        id: f.id,
        fieldType: f.fieldType,
        label: f.label,
        fieldOrder: f.fieldOrder,
        isRequired: f.isRequired,
        colSpan: f.colSpan || 12,
        config: f.config ? JSON.parse(f.config) : undefined,
        conditionalLogic: f.conditionalLogic ? JSON.parse(f.conditionalLogic) : undefined,
        personFieldMapping: f.personFieldMapping || undefined
      }))
    }))
  }
})
