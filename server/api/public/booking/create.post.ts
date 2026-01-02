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
  const db = hubDatabase()
  
  // Check if booking already exists for this email
  const existingBooking = await db.prepare(`
    SELECT * FROM public_bookings 
    WHERE email = ? 
    AND status NOT IN ('CONVERTED', 'CANCELLED')
    ORDER BY created_at DESC 
    LIMIT 1
  `).bind(email).first()
  
  if (existingBooking) {
    // Return existing booking if not yet completed
    return {
      success: true,
      bookingId: existingBooking.id,
      status: existingBooking.status,
      message: 'Booking already exists for this email'
    }
  }
  
  // Get questionnaire details to find consultation fee
  const questionnaire = await db.prepare(`
    SELECT q.*, sc.consultation_fee, sc.consultation_fee_enabled
    FROM questionnaires q
    LEFT JOIN service_catalog sc ON q.service_catalog_id = sc.id
    WHERE q.id = ?
  `).bind(questionnaireId).first()
  
  if (!questionnaire) {
    throw createError({
      statusCode: 404,
      message: 'Questionnaire not found'
    })
  }
  
  const consultationFee = questionnaire.consultation_fee || 37500 // Default $375
  const consultationFeeEnabled = questionnaire.consultation_fee_enabled !== 0
  
  // Create public booking record
  const bookingId = generateId()
  const now = Date.now()
  
  await db.prepare(`
    INSERT INTO public_bookings (
      id, email, first_name, last_name, phone,
      questionnaire_id, questionnaire_responses,
      consultation_fee_paid, payment_amount, attorney_id,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    bookingId,
    email,
    firstName,
    lastName,
    phone || null,
    questionnaireId,
    JSON.stringify(responses),
    consultationFeeEnabled ? 0 : 1, // If fee disabled, mark as paid
    consultationFeeEnabled ? consultationFee : 0,
    attorneyId || null,
    consultationFeeEnabled ? 'PENDING_PAYMENT' : 'PENDING_BOOKING',
    now,
    now
  ).run()
  
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

