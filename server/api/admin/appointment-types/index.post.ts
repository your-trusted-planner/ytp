import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { generateId } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity-logger'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().max(2000).nullable().optional(),
  defaultDurationMinutes: z.number().int().min(5).max(480).default(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  consultationFee: z.number().int().min(0).default(0),
  consultationFeeEnabled: z.boolean().default(false),
  questionnaireId: z.string().nullable().optional(),
  serviceCatalogId: z.string().nullable().optional(),
  staffEligibility: z.enum(['any', 'attorneys_only', 'specific']).default('any'),
  assignedAttorneyIds: z.array(z.string()).nullable().optional(),
  businessHours: z.union([
    z.object({
      start: z.number().int().min(0).max(23),
      end: z.number().int().min(1).max(24),
      days: z.array(z.number().int().min(0).max(6))
    }),
    z.object({
      schedule: z.record(
        z.string(),
        z.array(z.object({ start: z.string(), end: z.string() }))
      )
    })
  ]).nullable().optional(),
  defaultLocation: z.string().max(500).nullable().optional(),
  defaultLocationConfig: z.any().nullable().optional(),
  isPubliclyBookable: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0)
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = createSchema.parse(body)
  const user = event.context.user

  const db = useDrizzle()
  const id = generateId()
  const slug = data.slug || slugify(data.name)

  // Check slug uniqueness
  const existing = await db
    .select({ id: schema.appointmentTypes.id })
    .from(schema.appointmentTypes)
    .where(eq(schema.appointmentTypes.slug, slug))
    .get()

  if (existing) {
    throw createError({ statusCode: 409, message: `Slug "${slug}" is already in use` })
  }

  const now = new Date()
  await db.insert(schema.appointmentTypes).values({
    id,
    name: data.name,
    slug,
    description: data.description || null,
    defaultDurationMinutes: data.defaultDurationMinutes,
    color: data.color,
    consultationFee: data.consultationFee,
    consultationFeeEnabled: data.consultationFeeEnabled,
    questionnaireId: data.questionnaireId || null,
    serviceCatalogId: data.serviceCatalogId || null,
    staffEligibility: data.staffEligibility,
    assignedAttorneyIds: data.assignedAttorneyIds ? JSON.stringify(data.assignedAttorneyIds) : null,
    businessHours: data.businessHours ? JSON.stringify(data.businessHours) : null,
    defaultLocation: data.defaultLocation || null,
    defaultLocationConfig: data.defaultLocationConfig ? JSON.stringify(data.defaultLocationConfig) : null,
    isPubliclyBookable: data.isPubliclyBookable,
    isActive: data.isActive,
    displayOrder: data.displayOrder,
    createdAt: now,
    updatedAt: now
  })

  await logActivity({
    type: 'APPOINTMENT_TYPE_CREATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'appointment_type', id, name: data.name },
    event
  })

  return { success: true, id, slug }
})
