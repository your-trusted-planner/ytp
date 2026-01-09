// Get all document templates
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const { useDrizzle, schema } = await import('../../db')
  const { desc } = await import('drizzle-orm')
  const db = useDrizzle()

  const templates = await db.select()
    .from(schema.documentTemplates)
    .orderBy(desc(schema.documentTemplates.createdAt))
    .all()

  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    content: template.content,
    variables: template.variables,
    requiresNotary: template.requiresNotary,
    isActive: template.isActive,
    originalFileName: template.originalFileName,
    fileExtension: template.fileExtension,
    createdAt: template.createdAt instanceof Date ? template.createdAt.getTime() : template.createdAt,
    updatedAt: template.updatedAt instanceof Date ? template.updatedAt.getTime() : template.updatedAt,
    docxBlobKey: template.docxBlobKey,
    variableMappings: template.variableMappings,
    // Add snake_case versions for backwards compatibility
    requires_notary: template.requiresNotary,
    is_active: template.isActive,
    original_file_name: template.originalFileName,
    file_extension: template.fileExtension,
    created_at: template.createdAt instanceof Date ? template.createdAt.getTime() : template.createdAt,
    updated_at: template.updatedAt instanceof Date ? template.updatedAt.getTime() : template.updatedAt,
    docx_blob_key: template.docxBlobKey,
    variable_mappings: template.variableMappings
  }))
})

