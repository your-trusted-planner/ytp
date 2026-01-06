// Get all document templates
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const db = hubDatabase()

  const templates = await db.prepare(`
    SELECT * FROM document_templates
    ORDER BY created_at DESC
  `).all()

  return (templates.results || []).map((template: any) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    content: template.content,
    variables: template.variables,
    requiresNotary: template.requires_notary === 1,
    isActive: template.is_active === 1,
    originalFileName: template.original_file_name,
    fileExtension: template.file_extension,
    createdAt: template.created_at,
    updatedAt: template.updated_at,
    // Add snake_case versions for backwards compatibility
    requires_notary: template.requires_notary === 1,
    is_active: template.is_active === 1
  }))
})

