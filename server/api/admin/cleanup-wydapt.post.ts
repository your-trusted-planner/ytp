/**
 * Cleanup endpoint to remove WYDAPT seed data
 *
 * This removes the WYDAPT matter, journey, steps, and any templates
 * so you can re-run the seeding process.
 */
export default defineEventHandler(async (event) => {
  requireRole(event, ['ADMIN', 'LAWYER'])

  const { useDrizzle, schema } = await import('../../db')
  const { eq, or, like, inArray } = await import('drizzle-orm')
  const db = useDrizzle()

  const log: string[] = []

  try {
    log.push('🧹 Starting WYDAPT cleanup...')

    // Find WYDAPT service catalog entry
    const serviceCatalog = await db.select({ id: schema.serviceCatalog.id })
      .from(schema.serviceCatalog)
      .where(eq(schema.serviceCatalog.name, 'Wyoming Asset Protection Trust (WYDAPT)'))
      .limit(1)
      .get()

    if (!serviceCatalog) {
      return {
        success: true,
        message: 'No WYDAPT service catalog entry found - nothing to clean up',
        log: log.join('\n')
      }
    }

    const catalogId = serviceCatalog.id
    log.push(`📋 Found WYDAPT service catalog entry: ${catalogId}`)

    // Get journey IDs for this catalog via junction table
    const journeyLinks = await db.select({ journeyId: schema.journeysToCatalog.journeyId })
      .from(schema.journeysToCatalog)
      .where(eq(schema.journeysToCatalog.catalogId, catalogId))
      .all()

    const journeyIds = journeyLinks.map(j => j.journeyId)

    // Delete journey steps
    let stepsDeleted = 0
    if (journeyIds.length > 0) {
      const stepsResult = await db.delete(schema.journeySteps)
        .where(inArray(schema.journeySteps.journeyId, journeyIds))
      stepsDeleted = stepsResult.rowsAffected || 0
    }
    log.push(`✅ Deleted ${stepsDeleted} journey steps`)

    // Delete junction table entries
    await db.delete(schema.journeysToCatalog)
      .where(eq(schema.journeysToCatalog.catalogId, catalogId))
    log.push(`✅ Deleted journey-to-catalog links`)

    // Delete journeys
    let journeysDeleted = 0
    if (journeyIds.length > 0) {
      const journeysResult = await db.delete(schema.journeys)
        .where(inArray(schema.journeys.id, journeyIds))
      journeysDeleted = journeysResult.rowsAffected || 0
    }
    log.push(`✅ Deleted ${journeysDeleted} journeys`)

    // Delete document templates with WYDAPT-related descriptions
    const templatesResult = await db.delete(schema.documentTemplates)
      .where(or(
        like(schema.documentTemplates.description, '%General Documents%'),
        like(schema.documentTemplates.description, '%Trust Documents%'),
        like(schema.documentTemplates.description, '%Wyoming Private Family Trust%'),
        like(schema.documentTemplates.description, '%Investment Decisions%'),
        like(schema.documentTemplates.description, '%Contributions to Trust%'),
        like(schema.documentTemplates.description, '%Distributions From Trust%')
      )!)
    const templatesDeleted = templatesResult.rowsAffected || 0
    log.push(`✅ Deleted ${templatesDeleted} document templates`)

    // Delete the service catalog entry
    await db.delete(schema.serviceCatalog)
      .where(eq(schema.serviceCatalog.id, catalogId))
    log.push(`✅ Deleted service catalog entry`)

    log.push('\n✨ Cleanup complete! You can now re-run the seed process.')

    return {
      success: true,
      catalogId,
      stepsDeleted,
      journeysDeleted,
      templatesDeleted,
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
