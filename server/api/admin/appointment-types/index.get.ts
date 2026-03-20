import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

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
      questionnaireId: schema.appointmentTypes.questionnaireId,
      serviceCatalogId: schema.appointmentTypes.serviceCatalogId,
      staffEligibility: schema.appointmentTypes.staffEligibility,
      assignedAttorneyIds: schema.appointmentTypes.assignedAttorneyIds,
      businessHours: schema.appointmentTypes.businessHours,
      defaultLocation: schema.appointmentTypes.defaultLocation,
      defaultLocationConfig: schema.appointmentTypes.defaultLocationConfig,
      isPubliclyBookable: schema.appointmentTypes.isPubliclyBookable,
      isActive: schema.appointmentTypes.isActive,
      displayOrder: schema.appointmentTypes.displayOrder,
      createdAt: schema.appointmentTypes.createdAt,
      updatedAt: schema.appointmentTypes.updatedAt
    })
    .from(schema.appointmentTypes)
    .orderBy(schema.appointmentTypes.displayOrder)
    .all()

  return types.map(t => ({
    ...t,
    assignedAttorneyIds: t.assignedAttorneyIds ? JSON.parse(t.assignedAttorneyIds) : null,
    businessHours: t.businessHours ? JSON.parse(t.businessHours) : null,
    defaultLocationConfig: t.defaultLocationConfig ? JSON.parse(t.defaultLocationConfig) : null
  }))
})
