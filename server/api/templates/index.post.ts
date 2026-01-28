import { nanoid } from 'nanoid'
import { z } from 'zod'
import { requireRole } from '../../utils/rbac'

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  content: z.string().min(1),
  variables: z.array(z.string()).optional(),
  requiresNotary: z.boolean().optional(),
  isActive: z.boolean().optional(),
  originalFileName: z.string().optional(),
  fileExtension: z.string().optional()
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])

  const body = await readBody(event)
  const result = createTemplateSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  const {
    name,
    description,
    category,
    content,
    variables,
    requiresNotary,
    isActive,
    originalFileName,
    fileExtension
  } = result.data

  const templateId = nanoid()
  const now = new Date()

  await db.insert(schema.documentTemplates).values({
    id: templateId,
    name,
    description: description || null,
    category: category || 'General',
    content,
    variables: JSON.stringify(variables || []),
    requiresNotary: requiresNotary || false,
    isActive: isActive !== false,
    originalFileName: originalFileName || null,
    fileExtension: fileExtension || null,
    createdAt: now,
    updatedAt: now
  })

  return {
    success: true,
    template: {
      id: templateId,
      name,
      description,
      category,
      variables: variables || [],
      requiresNotary: requiresNotary || false,
      isActive: isActive !== false
    }
  }
})


