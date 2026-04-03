/**
 * GET /api/admin/message-templates/:id
 *
 * Get a single message template with full details including variable schema.
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'

export default defineEventHandler(async (event) => {
  const templateId = getRouterParam(event, 'id')
  if (!templateId) {
    throw createError({ statusCode: 400, message: 'Template ID required' })
  }

  const db = useDrizzle()

  const template = await db.select()
    .from(schema.messageTemplates)
    .where(eq(schema.messageTemplates.id, templateId))
    .get()

  if (!template) {
    throw createError({ statusCode: 404, message: 'Template not found' })
  }

  return {
    success: true,
    data: {
      ...template,
      variableSchema: template.variableSchema ? JSON.parse(template.variableSchema) : [],
      channelConfig: template.channelConfig ? JSON.parse(template.channelConfig) : { email: true, sms: false }
    }
  }
})
