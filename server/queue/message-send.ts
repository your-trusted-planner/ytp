/**
 * Cloudflare Queue Consumer for Message Delivery
 *
 * Processes messages from the MESSAGE_SEND_QUEUE. Each message
 * contains a messageId referencing a row in the messages table.
 * The consumer loads the full message, sends it via the appropriate
 * provider (Resend for email, Zoom Phone for SMS), and updates
 * the delivery status.
 */

import type { MessageBatch, Message } from '@cloudflare/workers-types'

interface MessageSendPayload {
  messageId: string
}

export default {
  async queue(batch: MessageBatch, env: any) {
    console.log(`[MessageSend] Processing batch of ${batch.messages.length} messages`)

    for (const message of batch.messages) {
      const { messageId } = message.body as MessageSendPayload

      try {
        console.log(`[MessageSend] Delivering message ${messageId}`)
        await processMessage(messageId)
        message.ack()
      }
      catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[MessageSend] Failed to deliver message ${messageId}:`, error)

        // Check if this is a permanent failure (don't retry)
        if (isPermanentFailure(error)) {
          console.log(`[MessageSend] Permanent failure for ${messageId}, not retrying`)
          await markFailed(messageId, error)
          message.ack()
        }
        else {
          // Transient failure — retry via queue
          message.retry()
        }
      }
    }
  }
}

/**
 * Process a single message: load from DB, send via provider, update status.
 */
async function processMessage(messageId: string): Promise<void> {
  const { useDrizzle, schema } = await import('../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Load message
  const msg = await db.select()
    .from(schema.messages)
    .where(eq(schema.messages.id, messageId))
    .get()

  if (!msg) {
    console.warn(`[MessageSend] Message ${messageId} not found in database`)
    return
  }

  if (msg.status !== 'QUEUED') {
    console.log(`[MessageSend] Message ${messageId} already processed (status: ${msg.status})`)
    return
  }

  // Check consent for non-transactional messages
  if (msg.category !== 'TRANSACTIONAL' && msg.recipientPersonId) {
    const { canSendMessage } = await import('../utils/consent-gate')
    const consentResult = await canSendMessage(
      msg.recipientPersonId,
      msg.channel as 'EMAIL' | 'SMS' | 'MMS',
      msg.category as 'TRANSACTIONAL' | 'OPERATIONAL' | 'MARKETING'
    )
    if (!consentResult.allowed) {
      console.log(`[MessageSend] Message ${messageId} rejected by consent gate: ${consentResult.reason}`)
      await db.update(schema.messages).set({
        status: 'REJECTED',
        failureReason: consentResult.reason || 'Consent check failed',
        failedAt: new Date()
      }).where(eq(schema.messages.id, messageId))
      return
    }
  }

  // Mark as sending
  await db.update(schema.messages).set({
    status: 'SENDING'
  }).where(eq(schema.messages.id, messageId))

  if (msg.channel === 'EMAIL') {
    await sendEmailMessage(messageId, msg)
  }
  else if (msg.channel === 'SMS' || msg.channel === 'MMS') {
    await sendSmsMessage(messageId, msg)
  }
  else {
    await markFailed(messageId, `Unsupported channel: ${msg.channel}`)
  }
}

/**
 * Send an email message via Resend.
 */
async function sendEmailMessage(messageId: string, msg: any): Promise<void> {
  const { useDrizzle, schema } = await import('../db')
  const { eq } = await import('drizzle-orm')
  const { sendEmail } = await import('../utils/email')
  const db = useDrizzle()

  // Parse metadata for attachments
  let attachments: Array<{ filename: string, content: string, type?: string }> | undefined
  if (msg.metadata) {
    try {
      const meta = JSON.parse(msg.metadata)
      attachments = meta.attachments
    }
    catch { /* ignore parse errors */ }
  }

  const result = await sendEmail({
    to: msg.recipientAddress,
    subject: msg.subject || '(no subject)',
    html: msg.bodyFormat === 'TEXT' ? `<pre>${msg.body}</pre>` : msg.body,
    text: msg.bodyFormat === 'TEXT' ? msg.body : undefined,
    attachments
  })

  if (result.success) {
    await db.update(schema.messages).set({
      status: 'SENT',
      providerMessageId: result.id,
      sentAt: new Date()
    }).where(eq(schema.messages.id, messageId))
    console.log(`[MessageSend] Email sent: ${messageId} → ${msg.recipientAddress} (provider: ${result.id})`)
  }
  else {
    throw new Error(result.error)
  }
}

/**
 * Send an SMS/MMS message. Placeholder until Phase 3 (Zoom Phone SMS).
 */
async function sendSmsMessage(messageId: string, msg: any): Promise<void> {
  // Phase 3 will implement Zoom Phone SMS here
  await markFailed(messageId, 'SMS provider not yet configured')
}

/**
 * Mark a message as permanently failed.
 */
async function markFailed(messageId: string, reason: string): Promise<void> {
  const { useDrizzle, schema } = await import('../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  await db.update(schema.messages).set({
    status: 'FAILED',
    failureReason: reason,
    failedAt: new Date()
  }).where(eq(schema.messages.id, messageId))
}

/**
 * Check if an error indicates a permanent failure (should not retry).
 */
function isPermanentFailure(error: string): boolean {
  const permanentPatterns = [
    'Email service not configured',
    'SMS provider not',
    'Unsupported channel',
    'Invalid email',
    'not found in database',
    'Validation error',
    '422', // Resend validation errors
    '401', // Auth errors
    '403'  // Permission errors
  ]
  return permanentPatterns.some(pattern => error.includes(pattern))
}
