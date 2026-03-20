import { eq, and, like } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const staffSlug = getRouterParam(event, 'staffSlug')
  if (!slug || !staffSlug) {
    throw createError({ statusCode: 400, message: 'Missing slug or staffSlug' })
  }

  const db = useDrizzle()

  // Load the appointment type
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

  // Find the staff member by matching slug against name
  // Staff slug is "firstname-lastname" lowercased
  const allStaff = await db
    .select({
      id: schema.users.id,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      email: schema.users.email
    })
    .from(schema.users)
    .all()

  const staffMember = allStaff.find(s => {
    const generatedSlug = [s.firstName, s.lastName].filter(Boolean).join('-').toLowerCase()
    return generatedSlug === staffSlug
  })

  if (!staffMember) {
    throw createError({ statusCode: 404, message: 'Staff member not found' })
  }

  // Check eligibility based on staffEligibility setting
  const staffEligibility = type.staffEligibility || 'any'

  if (staffEligibility === 'specific') {
    const assignedIds: string[] | null = type.assignedAttorneyIds
      ? JSON.parse(type.assignedAttorneyIds)
      : null
    if (assignedIds && assignedIds.length > 0 && !assignedIds.includes(staffMember.id)) {
      throw createError({ statusCode: 400, message: 'Staff member is not eligible for this appointment type' })
    }
  } else if (staffEligibility === 'attorneys_only') {
    // Need to check role — fetch it
    const staffUser = await db
      .select({ role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, staffMember.id))
      .get()
    if (staffUser?.role !== 'LAWYER') {
      throw createError({ statusCode: 400, message: 'Only attorneys are eligible for this appointment type' })
    }
  }

  // Verify staff has an active calendar
  const calendar = await db
    .select({ id: schema.attorneyCalendars.id })
    .from(schema.attorneyCalendars)
    .where(and(
      eq(schema.attorneyCalendars.attorneyId, staffMember.id),
      eq(schema.attorneyCalendars.isActive, true)
    ))
    .get()

  if (!calendar) {
    throw createError({ statusCode: 400, message: 'Staff member does not have an active calendar' })
  }

  // Fetch linked questionnaire
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
    staff: {
      id: staffMember.id,
      name: [staffMember.firstName, staffMember.lastName].filter(Boolean).join(' '),
      slug: staffSlug
    }
  }
})
