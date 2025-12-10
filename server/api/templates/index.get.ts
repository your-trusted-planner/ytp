import { desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])
  
  const db = useDrizzle()
  
  const templates = await db
    .select()
    .from(schema.documentTemplates)
    .orderBy(desc(schema.documentTemplates.createdAt))
    .all()
  
  // Transform to camelCase for frontend compatibility
  return templates.map(template => ({
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    folderId: template.folderId,
    content: template.content,
    variables: template.variables, // Keep as JSON string
    requiresNotary: template.requiresNotary,
    isActive: template.isActive,
    order: template.order,
    originalFileName: template.originalFileName,
    fileExtension: template.fileExtension,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    // Add snake_case versions for backwards compatibility
    requires_notary: template.requiresNotary,
    is_active: template.isActive
  }))
})

