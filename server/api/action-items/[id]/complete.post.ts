// Mark an action item as complete
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const actionItemId = getRouterParam(event, 'id')
  
  if (!actionItemId) {
    throw createError({
      statusCode: 400,
      message: 'Action item ID is required'
    })
  }

  const db = hubDatabase()
  
  // Get the action item
  const actionItem = await db.prepare(`
    SELECT * FROM action_items WHERE id = ?
  `).bind(actionItemId).first()

  if (!actionItem) {
    throw createError({
      statusCode: 404,
      message: 'Action item not found'
    })
  }

  // Mark as complete
  await db.prepare(`
    UPDATE action_items
    SET status = 'COMPLETE', completed_at = ?, completed_by = ?, updated_at = ?
    WHERE id = ?
  `).bind(Date.now(), user.id, Date.now(), actionItemId).run()

  return { success: true }
})



