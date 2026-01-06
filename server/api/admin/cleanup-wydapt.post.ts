/**
 * Cleanup endpoint to remove WYDAPT seed data
 *
 * This removes the WYDAPT matter, journey, steps, and any templates
 * so you can re-run the seeding process.
 */
export default defineEventHandler(async (event) => {
  requireRole(event, ['ADMIN', 'LAWYER'])

  const db = hubDatabase()
  const log: string[] = []

  try {
    log.push('🧹 Starting WYDAPT cleanup...')

    // Find WYDAPT service catalog entry
    const serviceCatalog = await db.prepare(`
      SELECT id FROM service_catalog WHERE name = 'Wyoming Asset Protection Trust (WYDAPT)' LIMIT 1
    `).first()

    if (!serviceCatalog) {
      return {
        success: true,
        message: 'No WYDAPT service catalog entry found - nothing to clean up',
        log: log.join('\n')
      }
    }

    const catalogId = serviceCatalog.id
    log.push(`📋 Found WYDAPT service catalog entry: ${catalogId}`)

    // Delete journey steps (cascade should handle this, but being explicit)
    const stepsResult = await db.prepare(`
      DELETE FROM journey_steps
      WHERE journey_id IN (
        SELECT id FROM journeys WHERE service_catalog_id = ?
      )
    `).bind(catalogId).run()
    log.push(`✅ Deleted ${stepsResult.meta.changes || 0} journey steps`)

    // Delete journeys
    const journeysResult = await db.prepare(`
      DELETE FROM journeys WHERE service_catalog_id = ?
    `).bind(catalogId).run()
    log.push(`✅ Deleted ${journeysResult.meta.changes || 0} journeys`)

    // Delete document templates with "Wyoming Asset Protection Trust" in description
    const templatesResult = await db.prepare(`
      DELETE FROM document_templates
      WHERE description LIKE '%General Documents%'
         OR description LIKE '%Trust Documents%'
         OR description LIKE '%Wyoming Private Family Trust%'
         OR description LIKE '%Investment Decisions%'
         OR description LIKE '%Contributions to Trust%'
         OR description LIKE '%Distributions From Trust%'
    `).run()
    log.push(`✅ Deleted ${templatesResult.meta.changes || 0} document templates`)

    // Delete the service catalog entry
    const catalogResult = await db.prepare(`
      DELETE FROM service_catalog WHERE id = ?
    `).bind(catalogId).run()
    log.push(`✅ Deleted service catalog entry`)

    log.push('\n✨ Cleanup complete! You can now re-run the seed process.')

    return {
      success: true,
      catalogId,
      stepsDeleted: stepsResult.meta.changes || 0,
      journeysDeleted: journeysResult.meta.changes || 0,
      templatesDeleted: templatesResult.meta.changes || 0,
      log: log.join('\n')
    }
  } catch (error) {
    log.push(`\n❌ Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Cleanup failed',
      data: { log: log.join('\n') }
    })
  }
})
