/**
 * PUT /api/admin/message-templates/:id
 *
 * Update a message template's editable content.
 * System templates can be edited but not deleted.
 */

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
  emailText: z.string().optional(),
  emailHeaderText: z.string().optional(),
  emailHeaderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  emailActionLabel: z.string().nullable().optional(),
  smsBody: z.string().nullable().optional(),
  channelConfig: z.object({
    email: z.boolean(),
    sms: z.boolean()
  }).optional(),
  isActive: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const templateId = getRouterParam(event, 'id')
  if (!templateId) {
    throw createError({ statusCode: 400, message: 'Template ID required' })
  }

  const body = await readBody(event)
  const parsed = updateTemplateSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation error',
      data: parsed.error.flatten()
    })
  }

  const db = useDrizzle()

  // Verify template exists
  const existing = await db.select()
    .from(schema.messageTemplates)
    .where(eq(schema.messageTemplates.id, templateId))
    .get()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Template not found' })
  }

  // Build update values
  const updates: Record<string, any> = {
    updatedAt: new Date()
  }

  const data = parsed.data
  if (data.name !== undefined) updates.name = data.name
  if (data.description !== undefined) updates.description = data.description
  if (data.emailSubject !== undefined) updates.emailSubject = data.emailSubject
  if (data.emailBody !== undefined) updates.emailBody = data.emailBody
  if (data.emailText !== undefined) updates.emailText = data.emailText
  if (data.emailHeaderText !== undefined) updates.emailHeaderText = data.emailHeaderText
  if (data.emailHeaderColor !== undefined) updates.emailHeaderColor = data.emailHeaderColor
  if (data.emailActionLabel !== undefined) updates.emailActionLabel = data.emailActionLabel
  if (data.smsBody !== undefined) updates.smsBody = data.smsBody
  if (data.channelConfig !== undefined) updates.channelConfig = JSON.stringify(data.channelConfig)
  if (data.isActive !== undefined) updates.isActive = data.isActive

  await db.update(schema.messageTemplates)
    .set(updates)
    .where(eq(schema.messageTemplates.id, templateId))

  // Return updated template
  const updated = await db.select()
    .from(schema.messageTemplates)
    .where(eq(schema.messageTemplates.id, templateId))
    .get()

  return {
    success: true,
    data: {
      ...updated,
      variableSchema: updated?.variableSchema ? JSON.parse(updated.variableSchema) : [],
      channelConfig: updated?.channelConfig ? JSON.parse(updated.channelConfig) : { email: true, sms: false }
    }
  }
})
