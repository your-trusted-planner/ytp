// Get FAQ entries
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const db = hubDatabase()

  let whereClause = 'WHERE is_active = 1'
  const params: any[] = []

  if (query.journeyId) {
    whereClause += ` AND (journey_id = ? OR journey_id IS NULL)`
    params.push(query.journeyId)
  }

  if (query.stepId) {
    whereClause += ` AND (step_id = ? OR step_id IS NULL)`
    params.push(query.stepId)
  }

  if (query.category) {
    whereClause += ` AND category = ?`
    params.push(query.category)
  }

  if (query.search) {
    whereClause += ` AND (question LIKE ? OR answer LIKE ? OR tags LIKE ?)`
    const searchTerm = `%${query.search}%`
    params.push(searchTerm, searchTerm, searchTerm)
  }

  const faqs = await db.prepare(`
    SELECT * FROM faq_library
    ${whereClause}
    ORDER BY view_count DESC, helpful_count DESC
    LIMIT ${query.limit || 20}
  `).bind(...params).all()

  return {
    faqs: faqs.results || []
  }
})



