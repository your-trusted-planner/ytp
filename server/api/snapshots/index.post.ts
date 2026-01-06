// Create a new snapshot version
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const body = await readBody(event)
  const db = hubDatabase()
  
  // Get latest version number for this client journey
  const latestVersion = await db.prepare(`
    SELECT MAX(version_number) as max_version
    FROM snapshot_versions
    WHERE client_journey_id = ?
  `).bind(body.clientJourneyId).first()

  const versionNumber = (latestVersion?.max_version || 0) + 1

  const snapshot = {
    id: nanoid(),
    client_journey_id: body.clientJourneyId,
    version_number: versionNumber,
    content: JSON.stringify(body.content), // Structured snapshot data
    generated_pdf_path: null, // Will be generated later
    status: 'DRAFT',
    sent_at: null,
    approved_at: null,
    approved_by_client: 0,
    approved_by_counsel: 0,
    client_feedback: null,
    counsel_notes: body.counselNotes || null,
    created_at: Date.now(),
    updated_at: Date.now()
  }

  await db.prepare(`
    INSERT INTO snapshot_versions (
      id, client_journey_id, version_number, content, generated_pdf_path, status,
      sent_at, approved_at, approved_by_client, approved_by_counsel,
      client_feedback, counsel_notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    snapshot.id,
    snapshot.client_journey_id,
    snapshot.version_number,
    snapshot.content,
    snapshot.generated_pdf_path,
    snapshot.status,
    snapshot.sent_at,
    snapshot.approved_at,
    snapshot.approved_by_client,
    snapshot.approved_by_counsel,
    snapshot.client_feedback,
    snapshot.counsel_notes,
    snapshot.created_at,
    snapshot.updated_at
  ).run()

  return { snapshot }
})



