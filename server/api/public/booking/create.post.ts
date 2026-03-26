// Public booking endpoint - no authentication required
// Creates booking request and processes consultation fee payment
import { z } from 'zod'
import { generateId } from '../../../utils/auth'

const createBookingSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  appointmentTypeId: z.string().optional(), // User-defined appointment type
  questionnaireId: z.string().optional(), // Can come from type or direct (legacy)
  responses: z.record(z.any()).default({}), // Question/answer pairs (legacy)
  // New form system
  formId: z.string().optional(),
  formData: z.record(z.any()).optional(), // Form field responses keyed by field ID
  personFields: z.record(z.string()).optional(), // Extracted person fields from form mappings
  turnstileToken: z.string().optional(),
  attorneyId: z.string().optional(), // If they selected specific attorney
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = createBookingSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid booking data',
      data: result.error.errors
    })
  }
  
  const { email, firstName, lastName, phone, appointmentTypeId, questionnaireId, responses, formId, formData, personFields, turnstileToken, attorneyId, utmSource, utmMedium, utmCampaign } = result.data

  // Verify Turnstile CAPTCHA (skips in dev if not configured)
  const { verifyTurnstileToken } = await import('../../../utils/turnstile')
  await verifyTurnstileToken(turnstileToken, getRequestIP(event) || undefined)

  const { useDrizzle, schema } = await import('../../../db')
  const { eq, and, ne } = await import('drizzle-orm')
  const db = useDrizzle()

  // Check if an in-progress booking already exists for this email
  // Only dedup against PENDING_PAYMENT and PENDING_BOOKING — not completed or cancelled bookings
  const existingBooking = await db.select()
    .from(schema.publicBookings)
    .where(and(
      eq(schema.publicBookings.email, email),
      ne(schema.publicBookings.status, 'CONVERTED'),
      ne(schema.publicBookings.status, 'CANCELLED'),
      ne(schema.publicBookings.status, 'BOOKED')
    ))
    .orderBy(schema.publicBookings.createdAt)
    .limit(1)
    .get()

  if (existingBooking) {
    return {
      success: true,
      bookingId: existingBooking.id,
      status: existingBooking.status,
      message: 'Booking already exists for this email'
    }
  }

  // Resolve fee settings — prefer appointment type, fall back to questionnaire/service catalog
  let consultationFee = 37500 // Default $375
  let consultationFeeEnabled = false
  let resolvedQuestionnaireId = questionnaireId || null

  if (appointmentTypeId) {
    // Use appointment type settings
    const apptType = await db.select()
      .from(schema.appointmentTypes)
      .where(eq(schema.appointmentTypes.id, appointmentTypeId))
      .get()

    if (apptType) {
      consultationFee = apptType.consultationFee || 0
      consultationFeeEnabled = apptType.consultationFeeEnabled
      if (!resolvedQuestionnaireId && apptType.questionnaireId) {
        resolvedQuestionnaireId = apptType.questionnaireId
      }
    }
  } else if (resolvedQuestionnaireId) {
    // Legacy path: get fee from questionnaire's linked service catalog
    const questionnaire = await db.select()
      .from(schema.questionnaires)
      .where(eq(schema.questionnaires.id, resolvedQuestionnaireId))
      .get()

    if (questionnaire?.serviceCatalogId) {
      const serviceCatalog = await db.select({
        consultationFee: schema.serviceCatalog.consultationFee,
        consultationFeeEnabled: schema.serviceCatalog.consultationFeeEnabled
      })
        .from(schema.serviceCatalog)
        .where(eq(schema.serviceCatalog.id, questionnaire.serviceCatalogId))
        .get()

      if (serviceCatalog) {
        consultationFee = serviceCatalog.consultationFee || consultationFee
        consultationFeeEnabled = serviceCatalog.consultationFeeEnabled || false
      }
    }
  }

  // Create public booking record
  const bookingId = generateId()
  const now = new Date()

  // Create booking record
  const bookingValues: Record<string, any> = {
    id: bookingId,
    email,
    firstName,
    lastName,
    phone: phone || null,
    appointmentTypeId: appointmentTypeId || null,
    consultationFeePaid: consultationFeeEnabled ? false : true,
    paymentAmount: consultationFeeEnabled ? consultationFee : 0,
    attorneyId: attorneyId || null,
    status: consultationFeeEnabled ? 'PENDING_PAYMENT' : 'PENDING_BOOKING',
    createdAt: now,
    updatedAt: now
  }

  if (formId) {
    // New form system — responses go to formSubmissions table
    bookingValues.formId = formId
    bookingValues.questionnaireId = null
    bookingValues.questionnaireResponses = null
  } else {
    // Legacy questionnaire system — responses inline on booking
    bookingValues.questionnaireId = resolvedQuestionnaireId
    bookingValues.questionnaireResponses = JSON.stringify(responses)
  }

  await db.insert(schema.publicBookings).values(bookingValues as any)

  // Person lookup/creation from form person field mappings
  let personId: string | null = null
  if (personFields && (personFields.firstName || personFields.email)) {
    const { findDuplicates } = await import('../../../utils/record-matcher')
    const { nanoid } = await import('nanoid')

    // Check for existing person
    const matches = await findDuplicates({
      firstName: personFields.firstName || firstName,
      lastName: personFields.lastName || lastName,
      email: personFields.email || email,
      phone: personFields.phone || phone
    })

    const highMatch = matches.find(m => m.confidence === 'high')
    if (highMatch) {
      personId = highMatch.personId
    } else {
      // Create new person
      personId = nanoid()
      const fullName = [
        personFields.firstName || firstName,
        personFields.lastName || lastName
      ].filter(Boolean).join(' ')

      await db.insert(schema.people).values({
        id: personId,
        firstName: personFields.firstName || firstName || null,
        lastName: personFields.lastName || lastName || null,
        fullName,
        email: personFields.email || email || null,
        phone: personFields.phone || phone || null,
        address: personFields.address || null,
        city: personFields.city || null,
        state: personFields.state || null,
        zipCode: personFields.zipCode || null,
        country: personFields.country || null,
        maritalStatus: personFields.maritalStatus || null
      })
    }
  }

  // Create form submission record if using new form system
  let formSubmissionId: string | null = null
  if (formId && formData) {
    const { nanoid } = await import('nanoid')
    formSubmissionId = nanoid()

    await db.insert(schema.formSubmissions).values({
      id: formSubmissionId,
      formId,
      publicBookingId: bookingId,
      personId,
      data: JSON.stringify(formData),
      submitterEmail: email,
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      submittedAt: now,
      updatedAt: now
    })

    // Link submission back to booking
    await db.update(schema.publicBookings)
      .set({ formSubmissionId })
      .where(eq(schema.publicBookings.id, bookingId))
  }

  return {
    success: true,
    bookingId,
    formSubmissionId,
    requiresPayment: consultationFeeEnabled,
    consultationFee: consultationFeeEnabled ? consultationFee : 0,
    status: consultationFeeEnabled ? 'PENDING_PAYMENT' : 'PENDING_BOOKING',
    message: consultationFeeEnabled
      ? 'Booking created - payment required'
      : 'Booking created - select appointment time'
  }
})

