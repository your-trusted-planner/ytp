// Public booking endpoint - no authentication required
// Creates booking request and processes consultation fee payment
import { z } from 'zod'
import { generateId } from '../../../utils/auth'

const createBookingSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  questionnaireId: z.string(),
  responses: z.record(z.any()), // Question/answer pairs
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
  
  const { email, firstName, lastName, phone, questionnaireId, responses, attorneyId, utmSource, utmMedium, utmCampaign } = result.data

  const { useDrizzle, schema } = await import('../../../db')
  const { eq, and, ne } = await import('drizzle-orm')
  const db = useDrizzle()

  // Check if booking already exists for this email
  const existingBooking = await db.select()
    .from(schema.publicBookings)
    .where(and(
      eq(schema.publicBookings.email, email),
      ne(schema.publicBookings.status, 'CONVERTED'),
      ne(schema.publicBookings.status, 'CANCELLED')
    ))
    .orderBy(schema.publicBookings.createdAt)
    .limit(1)
    .get()

  if (existingBooking) {
    // Return existing booking if not yet completed
    return {
      success: true,
      bookingId: existingBooking.id,
      status: existingBooking.status,
      message: 'Booking already exists for this email'
    }
  }

  // Get questionnaire details
  const questionnaire = await db.select()
    .from(schema.questionnaires)
    .where(eq(schema.questionnaires.id, questionnaireId))
    .get()

  if (!questionnaire) {
    throw createError({
      statusCode: 404,
      message: 'Questionnaire not found'
    })
  }

  // Get service catalog consultation fee if linked
  let consultationFee = 37500 // Default $375
  let consultationFeeEnabled = false

  if (questionnaire.serviceCatalogId) {
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

  // Create public booking record
  const bookingId = generateId()
  const now = new Date()

  await db.insert(schema.publicBookings).values({
    id: bookingId,
    email,
    firstName,
    lastName,
    phone: phone || null,
    questionnaireId,
    questionnaireResponses: JSON.stringify(responses),
    consultationFeePaid: consultationFeeEnabled ? false : true, // If fee disabled, mark as paid
    paymentAmount: consultationFeeEnabled ? consultationFee : 0,
    attorneyId: attorneyId || null,
    status: consultationFeeEnabled ? 'PENDING_PAYMENT' : 'PENDING_BOOKING',
    createdAt: now,
    updatedAt: now
  })
  
  // Store marketing attribution if provided
  if (utmSource || utmMedium || utmCampaign) {
    // Will be linked to user when converted
    // For now, store in booking metadata
  }
  
  return {
    success: true,
    bookingId,
    requiresPayment: consultationFeeEnabled,
    consultationFee: consultationFeeEnabled ? consultationFee : 0,
    status: consultationFeeEnabled ? 'PENDING_PAYMENT' : 'PENDING_BOOKING',
    message: consultationFeeEnabled 
      ? 'Booking created - payment required' 
      : 'Booking created - select appointment time'
  }
})

