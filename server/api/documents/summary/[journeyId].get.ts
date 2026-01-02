// Get document summary for client journey
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const journeyId = getRouterParam(event, 'journeyId')
  
  if (!journeyId) {
    throw createError({
      statusCode: 400,
      message: 'Journey ID required'
    })
  }
  
  const db = hubDatabase()
  
  // Get journey and verify access
  const journey = await db.prepare(`
    SELECT cj.*, u.id as client_id
    FROM client_journeys cj
    JOIN users u ON cj.client_id = u.id
    WHERE cj.id = ?
  `).bind(journeyId).first()
  
  if (!journey) {
    throw createError({
      statusCode: 404,
      message: 'Journey not found'
    })
  }
  
  // Check access rights
  const isClient = user.id === journey.client_id
  const isLawyer = user.role === 'LAWYER' || user.role === 'ADMIN'
  
  if (!isClient && !isLawyer) {
    throw createError({
      statusCode: 403,
      message: 'Access denied'
    })
  }
  
  // Get summary
  const summary = await db.prepare(`
    SELECT * FROM document_summaries 
    WHERE client_journey_id = ?
    ORDER BY created_at DESC 
    LIMIT 1
  `).bind(journeyId).first()
  
  if (!summary) {
    return {
      success: true,
      summary: null,
      message: 'No summary generated yet'
    }
  }
  
  // Mark as viewed if client is viewing
  if (isClient && !summary.viewed_at) {
    const now = Date.now()
    await db.prepare(`
      UPDATE document_summaries SET viewed_at = ? WHERE id = ?
    `).bind(now, summary.id).run()
  }
  
  return {
    success: true,
    summary: {
      id: summary.id,
      summaryData: JSON.parse(summary.summary_data),
      isFinal: summary.is_final === 1,
      generatedAt: summary.generated_at,
      viewedAt: summary.viewed_at,
    }
  }
})

