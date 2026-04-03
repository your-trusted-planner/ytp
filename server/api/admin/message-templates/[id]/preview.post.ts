/**
 * POST /api/admin/message-templates/:id/preview
 *
 * Render a template with sample data and return the fully rendered
 * email HTML, plain text, and SMS body for preview.
 *
 * Body (optional):
 * - variables: Record<string, string> — custom variable overrides
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'
import { renderTemplateString, wrapInEmailShell } from '../../../../utils/template-engine'

export default defineEventHandler(async (event) => {
  const templateId = getRouterParam(event, 'id')
  if (!templateId) {
    throw createError({ statusCode: 400, message: 'Template ID required' })
  }

  const body = await readBody(event).catch(() => ({}))
  const customVariables = body?.variables as Record<string, string> | undefined

  const db = useDrizzle()

  const template = await db.select()
    .from(schema.messageTemplates)
    .where(eq(schema.messageTemplates.id, templateId))
    .get()

  if (!template) {
    throw createError({ statusCode: 404, message: 'Template not found' })
  }

  // Build sample variables from the template's variableSchema
  const variableSchema = template.variableSchema ? JSON.parse(template.variableSchema) : []
  const sampleVariables: Record<string, string> = {}

  // Add standard variables
  sampleVariables.recipientName = 'Jane Smith'
  sampleVariables.recipientFirstName = 'Jane'
  sampleVariables.firmName = 'Your Trusted Planner'
  sampleVariables.firmPhone = '(970) 555-0100'
  sampleVariables.unsubscribeUrl = 'https://app.example.com/preferences/sample-token'

  // Add template-specific sample values
  for (const v of variableSchema) {
    if (v.sampleValue) {
      sampleVariables[v.key] = v.sampleValue
    }
  }

  // Apply custom overrides
  if (customVariables) {
    Object.assign(sampleVariables, customVariables)
  }

  // Render email
  let emailHtml = ''
  if (template.emailBody) {
    const bodyResult = renderTemplateString(template.emailBody, sampleVariables, { escapeHtml: false })
    const subjectResult = template.emailSubject
      ? renderTemplateString(template.emailSubject, sampleVariables)
      : { rendered: '', unresolvedVariables: [] }

    emailHtml = wrapInEmailShell({
      title: subjectResult.rendered || template.name,
      headerText: template.emailHeaderText || template.name,
      headerColor: template.emailHeaderColor || '#0A2540',
      bodyHtml: bodyResult.rendered,
      actionUrl: template.emailActionLabel ? sampleVariables.portalLink || sampleVariables.resetUrl || sampleVariables.signingUrl || sampleVariables.formLink || '#' : undefined,
      actionLabel: template.emailActionLabel || undefined,
      firmName: sampleVariables.firmName,
      unsubscribeUrl: template.category !== 'TRANSACTIONAL' ? sampleVariables.unsubscribeUrl : undefined
    })
  }

  // Render plain text
  let emailText = ''
  if (template.emailText) {
    const textResult = renderTemplateString(template.emailText, sampleVariables)
    emailText = textResult.rendered
  }

  // Render SMS
  let smsBody = ''
  if (template.smsBody) {
    const smsResult = renderTemplateString(template.smsBody, sampleVariables)
    smsBody = smsResult.rendered
  }

  // Render subject
  let emailSubject = ''
  if (template.emailSubject) {
    const subjectResult = renderTemplateString(template.emailSubject, sampleVariables)
    emailSubject = subjectResult.rendered
  }

  return {
    success: true,
    data: {
      emailSubject,
      emailHtml,
      emailText,
      smsBody,
      smsCharacterCount: smsBody.length,
      smsSegments: Math.ceil(smsBody.length / 160) || 0
    }
  }
})
