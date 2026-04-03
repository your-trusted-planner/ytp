/**
 * POST /api/admin/message-templates/:id/test-send
 *
 * Sends a test email of this template to the currently logged-in user.
 * Uses sample variable values from the template's variableSchema.
 *
 * Body (optional):
 * - recipientEmail: string — override recipient (defaults to current user's email)
 * - variables: Record<string, string> — override sample variables
 */

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'
import { renderTemplateString, wrapInEmailShell } from '../../../../utils/template-engine'
import { sendMessage } from '../../../../utils/message-service'

const testSendSchema = z.object({
  recipientEmail: z.string().email().optional(),
  variables: z.record(z.string()).optional()
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || (user.adminLevel ?? 0) < 1) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const templateId = getRouterParam(event, 'id')
  if (!templateId) {
    throw createError({ statusCode: 400, message: 'Template ID required' })
  }

  const body = await readBody(event)
  const parsed = testSendSchema.safeParse(body || {})
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid request', data: parsed.error.flatten() })
  }

  const db = useDrizzle()

  const template = await db.select()
    .from(schema.messageTemplates)
    .where(eq(schema.messageTemplates.id, templateId))
    .get()

  if (!template) {
    throw createError({ statusCode: 404, message: 'Template not found' })
  }

  const recipientEmail = parsed.data.recipientEmail || user.email
  if (!recipientEmail) {
    throw createError({ statusCode: 400, message: 'No recipient email available' })
  }

  // Build variables from sample values + overrides
  const variableSchema = template.variableSchema ? JSON.parse(template.variableSchema) : []
  const sampleVariables: Record<string, string> = {
    recipientName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Test User',
    recipientFirstName: user.firstName || 'Test',
    recipientEmail,
    firmName: 'Your Trusted Planner',
    firmPhone: '(970) 555-0100'
  }

  for (const v of variableSchema) {
    if (v.sampleValue) sampleVariables[v.key] = v.sampleValue
  }

  // Apply caller overrides
  if (parsed.data.variables) {
    Object.assign(sampleVariables, parsed.data.variables)
  }

  // Render email
  if (!template.emailBody) {
    throw createError({ statusCode: 400, message: 'Template has no email body content' })
  }

  const subjectResult = template.emailSubject
    ? renderTemplateString(template.emailSubject, sampleVariables)
    : { rendered: `[TEST] ${template.name}`, unresolvedVariables: [] }

  const bodyResult = renderTemplateString(template.emailBody, sampleVariables, { escapeHtml: false })

  const actionUrl = sampleVariables.portalLink || sampleVariables.resetUrl || sampleVariables.signingUrl || sampleVariables.formLink || undefined

  const emailHtml = wrapInEmailShell({
    title: subjectResult.rendered,
    headerText: template.emailHeaderText || template.name,
    headerColor: template.emailHeaderColor || '#0A2540',
    bodyHtml: bodyResult.rendered,
    actionUrl: template.emailActionLabel ? actionUrl : undefined,
    actionLabel: template.emailActionLabel || undefined,
    firmName: sampleVariables.firmName
  })

  // Send via message service
  const result = await sendMessage({
    recipientAddress: recipientEmail,
    channel: 'EMAIL',
    category: 'TRANSACTIONAL',
    templateSlug: template.slug,
    subject: `[TEST] ${subjectResult.rendered}`,
    body: emailHtml,
    bodyFormat: 'HTML',
    senderUserId: user.id,
    contextType: 'test',
    contextId: templateId,
    event
  })

  return {
    success: true,
    message: `Test email sent to ${recipientEmail}`,
    messageId: result.messageId
  }
})
