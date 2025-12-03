// Get conversation messages for a bridge step
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const stepProgressId = getRouterParam(event, 'stepProgressId')
  
  if (!stepProgressId) {
    throw createError({
      statusCode: 400,
      message: 'Step progress ID is required'
    })
  }

  const db = hubDatabase()
  
  // Get messages with user info
  const messages = await db.prepare(`
    SELECT 
      bc.*,
      u.first_name,
      u.last_name,
      u.role,
      u.avatar
    FROM bridge_conversations bc
    LEFT JOIN users u ON bc.user_id = u.id
    WHERE bc.step_progress_id = ?
    ORDER BY bc.created_at ASC
  `).bind(stepProgressId).all()

  return {
    messages: messages.results || []
  }
})

