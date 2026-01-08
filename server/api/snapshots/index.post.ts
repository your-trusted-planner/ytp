// Create a new snapshot version
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const body = await readBody(event)
  const { useDrizzle, schema } = await import('../../db')
  const { eq, max } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get latest version number for this client journey
  const latestVersion = await db.select({
    maxVersion: max(schema.snapshotVersions.versionNumber)
  })
    .from(schema.snapshotVersions)
    .where(eq(schema.snapshotVersions.clientJourneyId, body.clientJourneyId))
    .get()

  const versionNumber = (latestVersion?.maxVersion || 0) + 1

  const snapshotId = nanoid()
  const now = new Date()

  await db.insert(schema.snapshotVersions).values({
    id: snapshotId,
    clientJourneyId: body.clientJourneyId,
    versionNumber: versionNumber,
    content: JSON.stringify(body.content), // Structured snapshot data
    generatedPdfPath: null, // Will be generated later
    status: 'DRAFT',
    sentAt: null,
    approvedAt: null,
    approvedByClient: false,
    approvedByAttorney: false,
    clientFeedback: null,
    attorneyNotes: body.attorneyNotes || null,
    createdAt: now,
    updatedAt: now
  })

  // Return snapshot object for compatibility
  const snapshot = {
    id: snapshotId,
    client_journey_id: body.clientJourneyId,
    version_number: versionNumber,
    content: JSON.stringify(body.content),
    generated_pdf_path: null,
    status: 'DRAFT',
    sent_at: null,
    approved_at: null,
    approved_by_client: 0,
    approved_by_attorney: 0,
    client_feedback: null,
    attorney_notes: body.attorneyNotes || null,
    created_at: now.getTime(),
    updated_at: now.getTime()
  }

  return { snapshot }
})



