import { eq, and } from 'drizzle-orm'
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
      defaultLocation: schema.appointmentTypes.defaultLocation,
      staffEligibility: schema.appointmentTypes.staffEligibility,
      assignedAttorneyIds: schema.appointmentTypes.assignedAttorneyIds,
      displayOrder: schema.appointmentTypes.displayOrder
    })
    .from(schema.appointmentTypes)
    .where(and(
      eq(schema.appointmentTypes.isPubliclyBookable, true),
      eq(schema.appointmentTypes.isActive, true)
    ))
    .orderBy(schema.appointmentTypes.displayOrder)
    .all()

  // For each type, resolve eligible attorney info
  const result = []
  for (const type of types) {
    const staffEligibility = type.staffEligibility || 'any'
    const attorneyIds: string[] | null = type.assignedAttorneyIds
      ? JSON.parse(type.assignedAttorneyIds)
      : null

    let eligibleAttorneys: Array<{ id: string; name: string; slug: string; role: string | null }> = []

    if (staffEligibility === 'specific' && attorneyIds && attorneyIds.length > 0) {
      // Specific people assigned
      const { inArray } = await import('drizzle-orm')
      const attorneys = await db
        .select({
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          role: schema.users.role
        })
        .from(schema.users)
        .where(inArray(schema.users.id, attorneyIds))
        .all()

      eligibleAttorneys = attorneys.map(a => ({
        id: a.id,
        name: [a.firstName, a.lastName].filter(Boolean).join(' '),
        slug: [a.firstName, a.lastName].filter(Boolean).join('-').toLowerCase(),
        role: a.role
      }))
    } else {
      // 'any' or 'attorneys_only' — get all with calendars, filter by role if needed
      const calendars = await db
        .select({
          attorneyId: schema.attorneyCalendars.attorneyId,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          role: schema.users.role
        })
        .from(schema.attorneyCalendars)
        .innerJoin(schema.users, eq(schema.attorneyCalendars.attorneyId, schema.users.id))
        .where(eq(schema.attorneyCalendars.isActive, true))
        .all()

      const seen = new Set<string>()
      eligibleAttorneys = calendars
        .filter(c => {
          if (seen.has(c.attorneyId)) return false
          seen.add(c.attorneyId)
          if (staffEligibility === 'attorneys_only' && c.role !== 'LAWYER') return false
          return true
        })
        .map(c => ({
          id: c.attorneyId,
          name: [c.firstName, c.lastName].filter(Boolean).join(' '),
          slug: [c.firstName, c.lastName].filter(Boolean).join('-').toLowerCase(),
          role: c.role
        }))
    }

    result.push({
      id: type.id,
      name: type.name,
      slug: type.slug,
      description: type.description,
      defaultDurationMinutes: type.defaultDurationMinutes,
      color: type.color,
      consultationFee: type.consultationFee,
      consultationFeeEnabled: type.consultationFeeEnabled,
      defaultLocation: type.defaultLocation,
      eligibleAttorneys
    })
  }

  return result
})
