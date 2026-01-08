// Get all snapshot versions for a client journey
export default defineEventHandler(async (event) => {
  const clientJourneyId = getRouterParam(event, 'clientJourneyId')

  if (!clientJourneyId) {
    throw createError({
      statusCode: 400,
      message: 'Client journey ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const { eq, desc } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get client journey to check authorization
  const clientJourney = await db.select()
    .from(schema.clientJourneys)
    .where(eq(schema.clientJourneys.id, clientJourneyId))
    .get()

  if (!clientJourney) {
    throw createError({
      statusCode: 404,
      message: 'Client journey not found'
    })
  }

  // Check authorization - clients can only view their own journey's snapshots
  requireClientAccess(event, clientJourney.clientId)

  // Get all snapshots
  const snapshots = await db.select()
    .from(schema.snapshotVersions)
    .where(eq(schema.snapshotVersions.clientJourneyId, clientJourneyId))
    .orderBy(desc(schema.snapshotVersions.versionNumber))
    .all()

  return {
    snapshots
  }
})



