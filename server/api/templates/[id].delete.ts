// Delete a template (soft or hard delete)
// INCREMENTAL DEBUG v3: Add database query

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Template ID required' })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  const template = await db.select()
    .from(schema.documentTemplates)
    .where(eq(schema.documentTemplates.id, id))
    .get()

  return {
    success: true,
    debug: 'v3-db-query',
    userId: user?.id,
    templateId: id,
    templateFound: !!template,
    templateName: template?.name
  }
})
