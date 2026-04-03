/**
 * Send a Templated Message
 *
 * Loads a message template from the database by slug, resolves
 * standard + caller-provided variables, renders through the template
 * engine, and queues for delivery via the message service.
 *
 * This is the bridge between trigger functions (message-triggers.ts)
 * and the delivery infrastructure (message-service.ts).
 */

import type { H3Event } from 'h3'
import { renderTemplateString, wrapInEmailShell } from './template-engine'
import { sendMessage } from './message-service'

export interface SendTemplatedMessageParams {
  templateSlug: string
  recipientPersonId: string
  variables: Record<string, string>       // Template-specific variables
  contextType?: string
  contextId?: string
  senderUserId?: string
  event?: H3Event
}

export interface SendTemplatedMessageResult {
  messageIds: string[]
  skipped?: string  // Reason if no messages were sent
}

/**
 * Send a message using a database-backed template.
 *
 * 1. Loads the template from DB by slug
 * 2. Resolves standard variables (person data, firm name)
 * 3. Merges with caller-provided variables
 * 4. Renders email HTML (via shell wrapper) and SMS body
 * 5. Queues via sendMessage() for each active channel
 */
export async function sendTemplatedMessage(params: SendTemplatedMessageParams): Promise<SendTemplatedMessageResult> {
  const { useDrizzle, schema } = await import('../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Load template
  const template = await db.select()
    .from(schema.messageTemplates)
    .where(eq(schema.messageTemplates.slug, params.templateSlug))
    .get()

  if (!template || !template.isActive) {
    console.warn(`[TemplatedMessage] Template "${params.templateSlug}" not found or inactive`)
    return { messageIds: [], skipped: 'Template not found or inactive' }
  }

  // Load recipient person for standard variables
  const person = await db.select({
    email: schema.people.email,
    phone: schema.people.phone,
    firstName: schema.people.firstName,
    lastName: schema.people.lastName,
    fullName: schema.people.fullName
  })
    .from(schema.people)
    .where(eq(schema.people.id, params.recipientPersonId))
    .get()

  if (!person) {
    console.warn(`[TemplatedMessage] Person "${params.recipientPersonId}" not found`)
    return { messageIds: [], skipped: 'Recipient person not found' }
  }

  // Build standard variables
  const standardVars: Record<string, string> = {
    recipientName: person.fullName || [person.firstName, person.lastName].filter(Boolean).join(' ') || 'there',
    recipientFirstName: person.firstName || '',
    recipientEmail: person.email || '',
    firmName: 'Your Trusted Planner',
    firmPhone: ''
  }

  // Merge standard + caller variables (caller overrides standard)
  const allVariables = { ...standardVars, ...params.variables }

  // Parse channel config
  const channelConfig = template.channelConfig
    ? JSON.parse(template.channelConfig) as { email?: boolean, sms?: boolean }
    : { email: true, sms: false }

  const messageIds: string[] = []

  // Send email if enabled and person has email
  if (channelConfig.email && person.email && template.emailBody) {
    const subjectResult = template.emailSubject
      ? renderTemplateString(template.emailSubject, allVariables)
      : { rendered: template.name, unresolvedVariables: [] }

    const bodyResult = renderTemplateString(template.emailBody, allVariables, { escapeHtml: false })

    // Determine action URL from variables (portalLink, resetUrl, signingUrl, formLink)
    const actionUrl = allVariables.portalLink || allVariables.resetUrl || allVariables.signingUrl || allVariables.formLink || undefined

    const emailHtml = wrapInEmailShell({
      title: subjectResult.rendered,
      headerText: template.emailHeaderText || template.name,
      headerColor: template.emailHeaderColor || '#0A2540',
      bodyHtml: bodyResult.rendered,
      actionUrl: template.emailActionLabel ? actionUrl : undefined,
      actionLabel: template.emailActionLabel || undefined,
      firmName: allVariables.firmName,
      unsubscribeUrl: template.category !== 'TRANSACTIONAL' ? allVariables.unsubscribeUrl : undefined
    })

    if (bodyResult.unresolvedVariables.length > 0) {
      console.warn(`[TemplatedMessage] Unresolved variables in "${params.templateSlug}" email: ${bodyResult.unresolvedVariables.join(', ')}`)
    }

    const result = await sendMessage({
      recipientPersonId: params.recipientPersonId,
      recipientAddress: person.email,
      channel: 'EMAIL',
      category: template.category as 'TRANSACTIONAL' | 'OPERATIONAL' | 'MARKETING',
      templateSlug: params.templateSlug,
      subject: subjectResult.rendered,
      body: emailHtml,
      bodyFormat: 'HTML',
      contextType: params.contextType,
      contextId: params.contextId,
      senderUserId: params.senderUserId,
      event: params.event
    })

    messageIds.push(result.messageId)
  }

  // Send SMS if enabled and person has phone
  if (channelConfig.sms && person.phone && template.smsBody) {
    const smsResult = renderTemplateString(template.smsBody, allVariables)

    const result = await sendMessage({
      recipientPersonId: params.recipientPersonId,
      recipientAddress: person.phone,
      channel: 'SMS',
      category: template.category as 'TRANSACTIONAL' | 'OPERATIONAL' | 'MARKETING',
      templateSlug: params.templateSlug,
      subject: undefined,
      body: smsResult.rendered,
      bodyFormat: 'TEXT',
      contextType: params.contextType,
      contextId: params.contextId,
      senderUserId: params.senderUserId,
      event: params.event
    })

    messageIds.push(result.messageId)
  }

  if (messageIds.length === 0) {
    console.warn(`[TemplatedMessage] No messages sent for "${params.templateSlug}" to person ${params.recipientPersonId} (no active channels or missing contact info)`)
    return { messageIds: [], skipped: 'No active channels or missing contact info' }
  }

  console.log(`[TemplatedMessage] Queued ${messageIds.length} message(s) for "${params.templateSlug}" to person ${params.recipientPersonId}`)
  return { messageIds }
}
