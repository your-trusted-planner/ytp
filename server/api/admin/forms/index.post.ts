import { z } from 'zod'
import { nanoid } from 'nanoid'
import { useDrizzle, schema } from '../../../db'
import { logActivity } from '../../../utils/activity-logger'

const createFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  formType: z.enum(['questionnaire', 'intake', 'standalone', 'action']).default('questionnaire'),
  isMultiStep: z.boolean().default(false),
  settings: z.record(z.any()).optional()
})

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN'])

  const body = await readBody(event)
  const parsed = createFormSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid input' })
  }

  const { name, description, formType, isMultiStep, settings } = parsed.data
  const db = useDrizzle()

  const formId = nanoid()
  const slug = slugify(name) || formId

  // Ensure slug uniqueness
  const existing = await db.select({ id: schema.forms.id })
    .from(schema.forms)
    .where(eq(schema.forms.slug, slug))
    .get()

  const finalSlug = existing ? `${slug}-${nanoid(6)}` : slug

  await db.insert(schema.forms).values({
    id: formId,
    name,
    slug: finalSlug,
    description: description || null,
    formType,
    isMultiStep,
    settings: settings ? JSON.stringify(settings) : null,
    createdById: user.id
  })

  // Create a default first section
  const sectionId = nanoid()
  await db.insert(schema.formSections).values({
    id: sectionId,
    formId,
    title: isMultiStep ? 'Section 1' : null,
    sectionOrder: 0
  })

  await logActivity({
    type: 'FORM_CREATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'form', id: formId, name },
    event
  })

  return {
    success: true,
    form: {
      id: formId,
      name,
      slug: finalSlug,
      description,
      formType,
      isMultiStep,
      isActive: true,
      settings: settings || null,
      sections: [{
        id: sectionId,
        title: isMultiStep ? 'Section 1' : null,
        description: null,
        sectionOrder: 0,
        fields: []
      }]
    }
  }
})

// Import needed for the slug uniqueness check
import { eq } from 'drizzle-orm'
