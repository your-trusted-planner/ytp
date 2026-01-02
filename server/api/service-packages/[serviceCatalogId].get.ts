// Get all packages for a service
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const serviceCatalogId = getRouterParam(event, 'serviceCatalogId')
  
  if (!serviceCatalogId) {
    throw createError({
      statusCode: 400,
      message: 'Service catalog ID required'
    })
  }
  
  const db = hubDatabase()
  
  const packages = await db.prepare(`
    SELECT * FROM service_packages 
    WHERE service_catalog_id = ? AND is_active = 1
    ORDER BY package_number ASC
  `).bind(serviceCatalogId).all()
  
  return {
    success: true,
    packages: (packages.results || []).map((pkg: any) => ({
      ...pkg,
      includedDocuments: JSON.parse(pkg.included_documents)
    }))
  }
})

