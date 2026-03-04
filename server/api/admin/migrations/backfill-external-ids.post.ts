/**
 * Backfill personExternalIds from existing importMetadata
 *
 * One-time admin endpoint to populate the personExternalIds table
 * from existing importMetadata JSON on people records.
 * Safe to run multiple times — skips records that already have entries.
 */
export default defineEventHandler(async (event) => {
  const { useDrizzle, schema } = await import('../../../db')
  const { isNotNull } = await import('drizzle-orm')
  const { nanoid } = await import('nanoid')
  const { ensurePersonExternalId } = await import('../../../utils/lawmatics-upsert')
  const db = useDrizzle()

  // Query all people with importMetadata
  const people = await db.select({
    id: schema.people.id,
    importMetadata: schema.people.importMetadata
  })
    .from(schema.people)
    .where(isNotNull(schema.people.importMetadata))
    .all()

  let migrated = 0
  let skipped = 0
  let errors = 0

  for (const person of people) {
    try {
      if (!person.importMetadata) {
        skipped++
        continue
      }

      const metadata = JSON.parse(person.importMetadata)
      const { source, externalId } = metadata

      if (!source || !externalId) {
        skipped++
        continue
      }

      await ensurePersonExternalId(person.id, source, externalId, true, {
        backfilledAt: new Date().toISOString(),
        backfilledFrom: 'importMetadata'
      })

      migrated++
    } catch (err) {
      errors++
      console.error(`[Backfill] Error processing person ${person.id}:`, err)
    }
  }

  return {
    success: true,
    data: {
      totalPeopleWithMetadata: people.length,
      migrated,
      skipped,
      errors
    }
  }
})
