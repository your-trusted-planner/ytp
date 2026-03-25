import { eq, and, asc } from 'drizzle-orm'
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

  // Fetch linked form if present (new system), fall back to legacy questionnaire
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

  // Legacy questionnaire fallback
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
    form,
    questionnaire,
    eligibleAttorneys
  }
})
