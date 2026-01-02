// Create/configure service package (WYDAPT Packages 1-4)
import { z } from 'zod'
import { requireRole, generateId } from '../../utils/auth'

const packageSchema = z.object({
  serviceCatalogId: z.string(),
  packageNumber: z.number().int().min(1).max(10),
  packageName: z.string().min(1),
  packageDescription: z.string().optional(),
  includedDocuments: z.array(z.string()), // Array of document template IDs
  additionalFee: z.number().int().default(0), // Additional fee in cents
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])
  const body = await readBody(event)
  const result = packageSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid package data',
      data: result.error.errors
    })
  }
  
  const { serviceCatalogId, packageNumber, packageName, packageDescription, includedDocuments, additionalFee } = result.data
  const db = hubDatabase()
  
  // Check if package already exists
  const existing = await db.prepare(`
    SELECT id FROM service_packages 
    WHERE service_catalog_id = ? AND package_number = ?
  `).bind(serviceCatalogId, packageNumber).first()
  
  const now = Date.now()
  
  if (existing) {
    // Update existing package
    await db.prepare(`
      UPDATE service_packages 
      SET 
        package_name = ?,
        package_description = ?,
        included_documents = ?,
        additional_fee = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      packageName,
      packageDescription || null,
      JSON.stringify(includedDocuments),
      additionalFee,
      now,
      existing.id
    ).run()
    
    return {
      success: true,
      packageId: existing.id,
      message: 'Package updated successfully'
    }
  } else {
    // Create new package
    const packageId = generateId()
    await db.prepare(`
      INSERT INTO service_packages (
        id, service_catalog_id, package_number, package_name, package_description,
        included_documents, additional_fee, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      packageId,
      serviceCatalogId,
      packageNumber,
      packageName,
      packageDescription || null,
      JSON.stringify(includedDocuments),
      additionalFee,
      1,
      now,
      now
    ).run()
    
    return {
      success: true,
      packageId,
      message: 'Package created successfully'
    }
  }
})

