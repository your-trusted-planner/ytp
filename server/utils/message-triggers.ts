/**
 * Message Trigger Functions
 *
 * Each function is called at a specific point in the application
 * to send automated messages. They load the necessary entities,
 * build the variable map, and delegate to sendTemplatedMessage().
 *
 * All triggers are fire-and-forget safe — they catch errors internally
 * and log warnings instead of crashing the calling endpoint.
 */

import type { H3Event } from 'h3'
import { sendTemplatedMessage } from './send-templated-message'

/**
 * Trigger: Booking confirmed
 * Called from: server/api/public/booking/book-slot.post.ts
 *
 * Sends a confirmation email/SMS to the person who booked.
 * Note: This is a public endpoint — the booker may not have a person record yet.
 */
export async function triggerBookingConfirmation(params: {
  bookingId: string
  appointmentId: string
  startTime: string
  endTime: string
  timezone: string
  event?: H3Event
}): Promise<void> {
  try {
    const { useDrizzle, schema } = await import('../db')
    const { eq } = await import('drizzle-orm')
    const db = useDrizzle()

    // Load booking details
    const booking = await db.select()
      .from(schema.publicBookings)
      .where(eq(schema.publicBookings.id, params.bookingId))
      .get()

    if (!booking || !booking.email) return

    // Get appointment type name
    let typeName = 'Consultation'
    if (booking.appointmentTypeId) {
      const apptType = await db.select({ name: schema.appointmentTypes.name })
        .from(schema.appointmentTypes)
        .where(eq(schema.appointmentTypes.id, booking.appointmentTypeId))
        .get()
      if (apptType) typeName = apptType.name
    }

    // Get attorney name
    let attorneyName = 'Your Trusted Planner'
    if (booking.attorneyId) {
      const attorney = await db.select({
        firstName: schema.people.firstName,
        lastName: schema.people.lastName
      })
        .from(schema.users)
        .innerJoin(schema.people, eq(schema.users.personId, schema.people.id))
        .where(eq(schema.users.id, booking.attorneyId))
        .get()
      if (attorney) {
        attorneyName = [attorney.firstName, attorney.lastName].filter(Boolean).join(' ') || attorneyName
      }
    }

    // Format date/time
    const start = new Date(params.startTime)
    const appointmentDate = start.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: params.timezone
    })
    const appointmentTime = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: params.timezone
    })

    // Find or create person record for the booker
    let recipientPersonId: string | null = null
    if (booking.personId) {
      recipientPersonId = booking.personId
    } else {
      // Look up by email
      const person = await db.select({ id: schema.people.id })
        .from(schema.people)
        .where(eq(schema.people.email, booking.email))
        .get()
      recipientPersonId = person?.id || null
    }

    if (!recipientPersonId) {
      // No person record — send directly via message service (not via template)
      const { sendMessage } = await import('./message-service')
      const { renderTemplateString, wrapInEmailShell } = await import('./template-engine')

      // Load template for rendering
      const template = await db.select()
        .from(schema.messageTemplates)
        .where(eq(schema.messageTemplates.slug, 'booking-confirmation'))
        .get()

      if (!template?.emailBody || !template.isActive) return

      const variables: Record<string, string> = {
        recipientName: [booking.firstName, booking.lastName].filter(Boolean).join(' ') || 'there',
        recipientFirstName: booking.firstName || '',
        appointmentType: typeName,
        appointmentDate,
        appointmentTime,
        attorneyName,
        location: '',
        firmName: 'Your Trusted Planner'
      }

      const bodyResult = renderTemplateString(template.emailBody, variables, { escapeHtml: false })
      const subjectResult = template.emailSubject
        ? renderTemplateString(template.emailSubject, variables)
        : { rendered: `Appointment Confirmed: ${typeName}` }

      const emailHtml = wrapInEmailShell({
        title: subjectResult.rendered,
        headerText: template.emailHeaderText || 'Appointment Confirmed',
        headerColor: template.emailHeaderColor || '#059669',
        bodyHtml: bodyResult.rendered,
        firmName: 'Your Trusted Planner'
      })

      await sendMessage({
        recipientAddress: booking.email,
        channel: 'EMAIL',
        category: 'TRANSACTIONAL',
        templateSlug: 'booking-confirmation',
        subject: subjectResult.rendered,
        body: emailHtml,
        bodyFormat: 'HTML',
        contextType: 'appointment',
        contextId: params.appointmentId,
        event: params.event
      })
      return
    }

    // Person exists — use sendTemplatedMessage
    await sendTemplatedMessage({
      templateSlug: 'booking-confirmation',
      recipientPersonId,
      variables: {
        appointmentType: typeName,
        appointmentDate,
        appointmentTime,
        attorneyName,
        location: ''
      },
      contextType: 'appointment',
      contextId: params.appointmentId,
      event: params.event
    })
  }
  catch (err) {
    console.error('[Trigger] Booking confirmation failed:', err)
  }
}

/**
 * Trigger: Account invitation
 * Called from: server/utils/journey-initiator.ts when a CLIENT user is auto-created
 *
 * Sends a "set your password" email so the new client can access the portal.
 */
export async function triggerAccountInvitation(params: {
  userId: string
  personId: string
  event?: H3Event
}): Promise<void> {
  try {
    const { useDrizzle, schema } = await import('../db')
    const { eq } = await import('drizzle-orm')
    const { nanoid } = await import('nanoid')
    const db = useDrizzle()

    // Generate a password reset token so the client can set their own password
    const token = nanoid(32)
    const tokenId = nanoid()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days for invitations

    await db.insert(schema.passwordResetTokens).values({
      id: tokenId,
      userId: params.userId,
      token,
      expiresAt,
      createdAt: now
    })

    const config = useRuntimeConfig()
    const baseUrl = config.public?.appUrl || 'http://localhost:3000'
    const setPasswordLink = `${baseUrl}/reset-password?token=${token}`
    const portalLink = baseUrl

    await sendTemplatedMessage({
      templateSlug: 'account-invitation',
      recipientPersonId: params.personId,
      variables: {
        setPasswordLink,
        portalLink
      },
      contextType: 'user',
      contextId: params.userId,
      event: params.event
    })
  }
  catch (err) {
    console.error('[Trigger] Account invitation failed:', err)
  }
}

/**
 * Trigger: Action item assigned to client
 * Called from: server/utils/journey-initiator.ts during action item instantiation
 *
 * Notifies the client they have a new action item to complete.
 */
export async function triggerActionItemAssigned(params: {
  actionItemTitle: string
  actionType: string
  personId: string
  clientJourneyId: string
  event?: H3Event
}): Promise<void> {
  try {
    const config = useRuntimeConfig()
    const baseUrl = config.public?.appUrl || 'http://localhost:3000'
    const portalLink = `${baseUrl}/my/journey`

    await sendTemplatedMessage({
      templateSlug: 'action-item-assigned',
      recipientPersonId: params.personId,
      variables: {
        actionItemTitle: params.actionItemTitle,
        actionType: formatActionType(params.actionType),
        dueDate: '',
        portalLink
      },
      contextType: 'journey',
      contextId: params.clientJourneyId,
      event: params.event
    })
  }
  catch (err) {
    console.error('[Trigger] Action item assigned failed:', err)
  }
}

/**
 * Trigger: Journey started
 * Called from: server/utils/journey-initiator.ts after clientJourney created
 *
 * Notifies the client their engagement journey has begun.
 */
export async function triggerJourneyStarted(params: {
  journeyName: string
  personId: string
  clientJourneyId: string
  event?: H3Event
}): Promise<void> {
  try {
    const config = useRuntimeConfig()
    const baseUrl = config.public?.appUrl || 'http://localhost:3000'
    const portalLink = `${baseUrl}/my/journey`

    await sendTemplatedMessage({
      templateSlug: 'journey-started',
      recipientPersonId: params.personId,
      variables: {
        journeyName: params.journeyName,
        portalLink
      },
      contextType: 'journey',
      contextId: params.clientJourneyId,
      event: params.event
    })
  }
  catch (err) {
    console.error('[Trigger] Journey started failed:', err)
  }
}

/**
 * Format action type enum to human-readable label
 */
function formatActionType(actionType: string): string {
  const labels: Record<string, string> = {
    QUESTIONNAIRE: 'Questionnaire',
    DECISION: 'Decision',
    UPLOAD: 'Document Upload',
    REVIEW: 'Review',
    ESIGN: 'Electronic Signature',
    NOTARY: 'Notarization',
    PAYMENT: 'Payment',
    MEETING: 'Meeting',
    KYC: 'Identity Verification',
    FORM: 'Form',
    DRAFT_DOCUMENT: 'Document Draft',
    WET_SIGN: 'Wet Signature',
    OFFLINE_TASK: 'Task',
    EXPENSE: 'Expense',
    THIRD_PARTY: 'Third-Party Action',
    AUTOMATION: 'Automated Action'
  }
  return labels[actionType] || actionType
}
