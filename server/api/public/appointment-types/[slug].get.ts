import { eq, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, message: 'Missing slug' })

  const db = useDrizzle()

  const type = await db
    .select()
    .from(schema.appointmentTypes)
    .where(and(
      eq(schema.appointmentTypes.slug, slug),
      eq(schema.appointmentTypes.isPubliclyBookable, true),
      eq(schema.appointmentTypes.isActive, true)
    ))
    .get()

  if (!type) {
    throw createError({ statusCode: 404, message: 'Appointment type not found' })
  }

  // Fetch linked questionnaire if present
  let questionnaire = null
  if (type.questionnaireId) {
    questionnaire = await db
      .select({
        id: schema.questionnaires.id,
        name: schema.questionnaires.name,
        description: schema.questionnaires.description,
        questions: schema.questionnaires.questions
      })
      .from(schema.questionnaires)
      .where(eq(schema.questionnaires.id, type.questionnaireId))
      .get()

    if (questionnaire?.questions) {
      try {
        questionnaire = { ...questionnaire, questions: JSON.parse(questionnaire.questions as string) }
      } catch { /* leave as-is */ }
    }
  }

  // Resolve eligible attorneys based on staffEligibility setting
  const staffEligibility = type.staffEligibility || 'any'
  const attorneyIds: string[] | null = type.assignedAttorneyIds
    ? JSON.parse(type.assignedAttorneyIds)
    : null

  let eligibleAttorneys: Array<{ id: string; name: string; slug: string; role: string | null }> = []

  if (staffEligibility === 'specific' && attorneyIds && attorneyIds.length > 0) {
    // Specific people selected
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
    // 'any' or 'attorneys_only' — get all staff with calendars, then filter by role if needed
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
        // Filter to attorneys only if that mode is selected
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

  return {
    id: type.id,
    name: type.name,
    slug: type.slug,
    description: type.description,
    defaultDurationMinutes: type.defaultDurationMinutes,
    color: type.color,
    consultationFee: type.consultationFee,
    consultationFeeEnabled: type.consultationFeeEnabled,
    defaultLocation: type.defaultLocation,
    businessHours: type.businessHours ? JSON.parse(type.businessHours) : null,
    questionnaire,
    eligibleAttorneys
  }
})
