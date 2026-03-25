import { z } from 'zod'
import { eq, and, ne } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { logActivity } from '../../../utils/activity-logger'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().max(2000).nullable().optional(),
  defaultDurationMinutes: z.number().int().min(5).max(480).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  consultationFee: z.number().int().min(0).optional(),
  consultationFeeEnabled: z.boolean().optional(),
  questionnaireId: z.string().nullable().optional(),
  formId: z.string().nullable().optional(),
  serviceCatalogId: z.string().nullable().optional(),
  staffEligibility: z.enum(['any', 'attorneys_only', 'specific']).optional(),
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
  isPubliclyBookable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional()
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const body = await readBody(event)
  const data = updateSchema.parse(body)
  const user = event.context.user

  const db = useDrizzle()

  // Verify exists
  const existing = await db
    .select({ id: schema.appointmentTypes.id, name: schema.appointmentTypes.name })
    .from(schema.appointmentTypes)
    .where(eq(schema.appointmentTypes.id, id))
    .get()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Appointment type not found' })
  }

  // Check slug uniqueness if changing
  if (data.slug) {
    const slugConflict = await db
      .select({ id: schema.appointmentTypes.id })
      .from(schema.appointmentTypes)
      .where(and(
        eq(schema.appointmentTypes.slug, data.slug),
        ne(schema.appointmentTypes.id, id)
      ))
      .get()

    if (slugConflict) {
      throw createError({ statusCode: 409, message: `Slug "${data.slug}" is already in use` })
    }
  }

  // Build update object
  const updates: Record<string, any> = { updatedAt: new Date() }
  if (data.name !== undefined) updates.name = data.name
  if (data.slug !== undefined) updates.slug = data.slug
  if (data.description !== undefined) updates.description = data.description
  if (data.defaultDurationMinutes !== undefined) updates.defaultDurationMinutes = data.defaultDurationMinutes
  if (data.color !== undefined) updates.color = data.color
  if (data.consultationFee !== undefined) updates.consultationFee = data.consultationFee
  if (data.consultationFeeEnabled !== undefined) updates.consultationFeeEnabled = data.consultationFeeEnabled
  if (data.questionnaireId !== undefined) updates.questionnaireId = data.questionnaireId
  if (data.formId !== undefined) updates.formId = data.formId
  if (data.serviceCatalogId !== undefined) updates.serviceCatalogId = data.serviceCatalogId
  if (data.staffEligibility !== undefined) updates.staffEligibility = data.staffEligibility
  if (data.assignedAttorneyIds !== undefined) {
    updates.assignedAttorneyIds = data.assignedAttorneyIds ? JSON.stringify(data.assignedAttorneyIds) : null
  }
  if (data.businessHours !== undefined) {
    updates.businessHours = data.businessHours ? JSON.stringify(data.businessHours) : null
  }
  if (data.defaultLocation !== undefined) updates.defaultLocation = data.defaultLocation
  if (data.defaultLocationConfig !== undefined) {
    updates.defaultLocationConfig = data.defaultLocationConfig ? JSON.stringify(data.defaultLocationConfig) : null
  }
  if (data.isPubliclyBookable !== undefined) updates.isPubliclyBookable = data.isPubliclyBookable
  if (data.isActive !== undefined) updates.isActive = data.isActive
  if (data.displayOrder !== undefined) updates.displayOrder = data.displayOrder

  await db.update(schema.appointmentTypes).set(updates).where(eq(schema.appointmentTypes.id, id))

  await logActivity({
    type: 'APPOINTMENT_TYPE_UPDATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'appointment_type', id, name: data.name || existing.name },
    event,
    details: { changes: Object.keys(data) }
  })

  return { success: true }
})
