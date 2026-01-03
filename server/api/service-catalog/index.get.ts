// Get all service catalog entries
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  // Only lawyers/admins can view service catalog
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  const db = hubDatabase()

  const catalog = await db.prepare(`
    SELECT * FROM service_catalog
    WHERE is_active = 1
    ORDER BY created_at DESC
  `).all()

  return {
    catalog: catalog.results || []
  }
})
