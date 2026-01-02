import { nanoid } from 'nanoid'
import { z } from 'zod'
import { requireRole } from '../../utils/auth'

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
  
  const db = hubDatabase()
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

  await db.prepare(`
    INSERT INTO document_templates (
      id, name, description, category, content, variables, requires_notary,
      is_active, original_file_name, file_extension, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    templateId,
    name,
    description || null,
    category || 'General',
    content,
    JSON.stringify(variables || []),
    requiresNotary ? 1 : 0,
    isActive !== false ? 1 : 0,
    originalFileName || null,
    fileExtension || null,
    Date.now(),
    Date.now()
  ).run()

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


