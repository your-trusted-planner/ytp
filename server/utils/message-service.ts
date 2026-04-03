/**
 * Central Message Service
 *
 * All outbound messages (email, SMS, MMS) flow through this service.
 * It inserts a message row for logging/audit and enqueues delivery
 * to the MESSAGE_SEND_QUEUE for async processing.
 */

import type { H3Event } from 'h3'

export interface SendMessageParams {
  recipientPersonId?: string    // Preferred — resolves email/phone from people table
  recipientAddress: string      // Direct address (email or phone)
  channel: 'EMAIL' | 'SMS' | 'MMS'
  category: 'TRANSACTIONAL' | 'OPERATIONAL' | 'MARKETING'
  subject?: string              // Email only
  body: string                  // Rendered content
  bodyFormat?: 'HTML' | 'TEXT'
  templateSlug?: string
  contextType?: string
  contextId?: string
  senderUserId?: string
  metadata?: Record<string, any>  // Attachments info, media URLs, etc.
  event?: H3Event               // For queue access and credential lookup
}

export interface SendMessageResult {
  success: true
  messageId: string
}

/**
 * Send a message through the messaging system.
 *
 * Inserts a message row with status QUEUED, then enqueues to
 * MESSAGE_SEND_QUEUE for async delivery. The queue consumer
 * handles actual sending via Resend (email) or Zoom Phone (SMS).
 *
 * Falls back to synchronous delivery if the queue is not available
 * (e.g., local development without Cloudflare Workers).
 */
export async function sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  const messageId = crypto.randomUUID()
  const now = new Date()

  // Insert message row
  await db.insert(schema.messages).values({
    id: messageId,
    recipientPersonId: params.recipientPersonId || null,
    recipientAddress: params.recipientAddress,
    senderUserId: params.senderUserId || null,
    channel: params.channel,
    category: params.category,
    templateSlug: params.templateSlug || null,
    subject: params.subject || null,
    body: params.body,
    bodyFormat: params.bodyFormat || (params.channel === 'EMAIL' ? 'HTML' : 'TEXT'),
    contextType: params.contextType || null,
    contextId: params.contextId || null,
    status: 'QUEUED',
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    queuedAt: now,
    createdAt: now
  })

  // In development, deliver synchronously (queue consumers don't run in dev emulation).
  // In production, enqueue for async delivery via Cloudflare Queue.
  if (import.meta.dev) {
    await deliverMessageSync(messageId, params)
  }
  else {
    const queued = await enqueueMessage(messageId, params.event)
    if (!queued) {
      await deliverMessageSync(messageId, params)
    }
  }

  return { success: true, messageId }
}

/**
 * Enqueue a message ID to the MESSAGE_SEND_QUEUE for async delivery.
 * Returns false if the queue binding is not available.
 */
async function enqueueMessage(messageId: string, event?: H3Event): Promise<boolean> {
  try {
    const env = event?.context?.cloudflare?.env
    if (!env?.MESSAGE_SEND_QUEUE) {
      console.log('[MessageService] Queue not available, will deliver synchronously')
      return false
    }
    await env.MESSAGE_SEND_QUEUE.send({ messageId })
    console.log(`[MessageService] Enqueued message ${messageId} for delivery`)
    return true
  }
  catch (err) {
    console.error('[MessageService] Failed to enqueue message:', err)
    return false
  }
}

/**
 * Synchronous fallback for local development when the queue is not available.
 * Calls the email/SMS provider directly and updates the message row.
 */
async function deliverMessageSync(messageId: string, params: SendMessageParams): Promise<void> {
  const { useDrizzle, schema } = await import('../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  try {
    if (params.channel === 'EMAIL') {
      const { sendEmail } = await import('./email')

      const emailResult = await sendEmail({
        to: params.recipientAddress,
        subject: params.subject || '(no subject)',
        html: params.bodyFormat === 'TEXT' ? `<pre>${params.body}</pre>` : params.body,
        text: params.bodyFormat === 'TEXT' ? params.body : undefined,
        attachments: params.metadata?.attachments,
        event: params.event
      })

      if (emailResult.success) {
        console.log(`[MessageService] Email sent: ${messageId} → ${params.recipientAddress} (provider: ${emailResult.id})`)
        await db.update(schema.messages).set({
          status: 'SENT',
          providerMessageId: emailResult.id,
          sentAt: new Date()
        }).where(eq(schema.messages.id, messageId))
      }
      else {
        console.error(`[MessageService] Email failed: ${messageId} → ${params.recipientAddress}: ${emailResult.error}`)
        await db.update(schema.messages).set({
          status: 'FAILED',
          failureReason: emailResult.error,
          failedAt: new Date()
        }).where(eq(schema.messages.id, messageId))
      }
    }
    else {
      // SMS/MMS — no provider yet, mark as failed
      console.warn(`[MessageService] SMS/MMS delivery not available in sync mode`)
      await db.update(schema.messages).set({
        status: 'FAILED',
        failureReason: 'SMS provider not configured',
        failedAt: new Date()
      }).where(eq(schema.messages.id, messageId))
    }
  }
  catch (err) {
    console.error(`[MessageService] Sync delivery failed for ${messageId}:`, err)
    await db.update(schema.messages).set({
      status: 'FAILED',
      failureReason: err instanceof Error ? err.message : 'Unknown error',
      failedAt: new Date()
    }).where(eq(schema.messages.id, messageId))
  }
}
