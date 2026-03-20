import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'

export default defineEventHandler(async () => {
  const db = useDrizzle()

  const types = await db
    .select({
      id: schema.appointmentTypes.id,
      name: schema.appointmentTypes.name,
      slug: schema.appointmentTypes.slug,
      description: schema.appointmentTypes.description,
      defaultDurationMinutes: schema.appointmentTypes.defaultDurationMinutes,
      color: schema.appointmentTypes.color,
      consultationFee: schema.appointmentTypes.consultationFee,
      consultationFeeEnabled: schema.appointmentTypes.consultationFeeEnabled,
      defaultLocation: schema.appointmentTypes.defaultLocation,
      isPubliclyBookable: schema.appointmentTypes.isPubliclyBookable,
      displayOrder: schema.appointmentTypes.displayOrder
    })
    .from(schema.appointmentTypes)
    .where(eq(schema.appointmentTypes.isActive, true))
    .orderBy(schema.appointmentTypes.displayOrder)
    .all()

  return types
})
