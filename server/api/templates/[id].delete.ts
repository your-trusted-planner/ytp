// Delete a template (soft or hard delete)
// INCREMENTAL DEBUG v2: Add auth check

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')

  return {
    success: true,
    debug: 'v2-auth',
    userId: user?.id,
    templateId: id
  }
})
