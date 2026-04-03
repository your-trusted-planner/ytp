/**
 * Consent Gate for Message Delivery
 *
 * Evaluates whether a message can be sent to a person based on
 * the message category and the person's consent state.
 *
 * Maps to Colorado Rules of Professional Conduct:
 * - TRANSACTIONAL: always allowed (password reset, signature, invoice, booking confirmation)
 * - OPERATIONAL: blocked only by globalUnsubscribe (reminders, action item notifications)
 * - MARKETING: blocked by globalUnsubscribe AND per-channel opt-out (newsletters, promotions)
 */

export type MessageCategory = 'TRANSACTIONAL' | 'OPERATIONAL' | 'MARKETING'
export type MessageChannel = 'EMAIL' | 'SMS' | 'MMS'

export interface ConsentResult {
  allowed: boolean
  reason?: string
}

/**
 * Check whether a message can be sent to a person.
 *
 * This is the main entry point called by the queue consumer
 * before delivering a message.
 *
 * @param personId - The recipient's person ID
 * @param channel - The message channel (EMAIL, SMS, MMS)
 * @param category - The message category (TRANSACTIONAL, OPERATIONAL, MARKETING)
 * @returns Whether the message is allowed and, if not, the reason
 */
export async function canSendMessage(
  personId: string,
  channel: MessageChannel,
  category: MessageCategory
): Promise<ConsentResult> {
  // TRANSACTIONAL: always allowed — required for service delivery
  if (category === 'TRANSACTIONAL') {
    return { allowed: true }
  }

  const { useDrizzle, schema } = await import('../db')
  const { eq, and } = await import('drizzle-orm')
  const db = useDrizzle()

  // Load person's global unsubscribe status
  const person = await db.select({
    globalUnsubscribe: schema.people.globalUnsubscribe
  })
    .from(schema.people)
    .where(eq(schema.people.id, personId))
    .get()

  if (!person) {
    // Person not found — allow sending (they might only have an email, no person record)
    return { allowed: true }
  }

  // Check global unsubscribe for OPERATIONAL and MARKETING
  if (person.globalUnsubscribe) {
    return {
      allowed: false,
      reason: 'Person has globally unsubscribed from all communications'
    }
  }

  // OPERATIONAL: allowed if not globally unsubscribed
  if (category === 'OPERATIONAL') {
    return { allowed: true }
  }

  // MARKETING: requires explicit per-channel opt-in
  if (category === 'MARKETING') {
    // Map message channel to marketing channel type
    const channelType = channel === 'EMAIL' ? 'EMAIL' : 'SMS'

    // Find active marketing channels matching this type
    const marketingChannels = await db.select({
      id: schema.marketingChannels.id
    })
      .from(schema.marketingChannels)
      .where(and(
        eq(schema.marketingChannels.channelType, channelType),
        eq(schema.marketingChannels.isActive, 1)
      ))

    if (marketingChannels.length === 0) {
      // No marketing channels configured for this type — default deny
      return {
        allowed: false,
        reason: `No consent record exists for ${channel} channel (default deny)`
      }
    }

    // Check if the person has opted in to ANY matching marketing channel
    for (const mc of marketingChannels) {
      const consent = await db.select({
        status: schema.marketingConsent.status
      })
        .from(schema.marketingConsent)
        .where(and(
          eq(schema.marketingConsent.personId, personId),
          eq(schema.marketingConsent.channelId, mc.id)
        ))
        .get()

      if (consent?.status === 'OPTED_IN') {
        return { allowed: true }
      }
    }

    // No opt-in found
    const hasAnyConsent = await db.select({
      status: schema.marketingConsent.status
    })
      .from(schema.marketingConsent)
      .where(eq(schema.marketingConsent.personId, personId))
      .get()

    if (!hasAnyConsent) {
      return {
        allowed: false,
        reason: `No consent record exists for ${channel} channel (default deny)`
      }
    }

    return {
      allowed: false,
      reason: `Person has opted out of ${channel} marketing communications`
    }
  }

  return { allowed: false, reason: `Unknown message category: ${category}` }
}
