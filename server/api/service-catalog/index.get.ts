// Get all service catalog entries
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

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
