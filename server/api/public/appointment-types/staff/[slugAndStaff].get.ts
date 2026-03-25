import { eq, and, like, asc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'

export default defineEventHandler(async (event) => {
  const slugAndStaff = getRouterParam(event, 'slugAndStaff')
  if (!slugAndStaff || !slugAndStaff.includes('.')) {
    throw createError({ statusCode: 400, message: 'URL must be in format: /staff/appointment-slug.staff-slug' })
  }

  const dotIndex = slugAndStaff.lastIndexOf('.')
  const slug = slugAndStaff.slice(0, dotIndex)
  const staffSlug = slugAndStaff.slice(dotIndex + 1)

  if (!slug || !staffSlug) {
    throw createError({ statusCode: 400, message: 'Missing slug or staff slug' })
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
  // Only search users with active calendars (the bookable staff)
  const calendarStaff = await db
    .select({
      id: schema.users.id,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      email: schema.users.email
    })
    .from(schema.users)
    .innerJoin(schema.attorneyCalendars, and(
      eq(schema.attorneyCalendars.attorneyId, schema.users.id),
      eq(schema.attorneyCalendars.isActive, true)
    ))
    .all()

  const staffMember = calendarStaff.find(s => {
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

  // Calendar already verified via join above

  // Fetch linked form (new system), fall back to legacy questionnaire
  let form = null
  let questionnaire = null

  if (type.formId) {
    const formRow = await db.select()
      .from(schema.forms)
      .where(and(eq(schema.forms.id, type.formId), eq(schema.forms.isActive, true)))
      .get()

    if (formRow) {
      const sections = await db.select()
        .from(schema.formSections)
        .where(eq(schema.formSections.formId, formRow.id))
        .orderBy(asc(schema.formSections.sectionOrder))
        .all()

      const fields = await db.select()
        .from(schema.formFields)
        .where(eq(schema.formFields.formId, formRow.id))
        .orderBy(asc(schema.formFields.fieldOrder))
        .all()

      const fieldsBySection = new Map<string, typeof fields>()
      for (const field of fields) {
        const list = fieldsBySection.get(field.sectionId) || []
        list.push(field)
        fieldsBySection.set(field.sectionId, list)
      }

      form = {
        id: formRow.id,
        name: formRow.name,
        slug: formRow.slug,
        description: formRow.description,
        formType: formRow.formType,
        isMultiStep: formRow.isMultiStep,
        isActive: formRow.isActive,
        settings: formRow.settings ? JSON.parse(formRow.settings) : null,
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
    }
  }

  if (!form && type.questionnaireId) {
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
    form,
    questionnaire,
    staff: {
      id: staffMember.id,
      name: [staffMember.firstName, staffMember.lastName].filter(Boolean).join(' '),
      slug: staffSlug
    }
  }
})
