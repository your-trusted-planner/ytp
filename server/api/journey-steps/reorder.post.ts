// Reorder journey steps
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const body = await readBody(event)
  const db = hubDatabase()
  
  // body.steps should be array of { id, order }
  if (!Array.isArray(body.steps)) {
    throw createError({
      statusCode: 400,
      message: 'Steps array is required'
    })
  }

  // Update each step's order
  for (const step of body.steps) {
    await db.prepare(`
      UPDATE journey_steps 
      SET step_order = ?, updated_at = ?
      WHERE id = ?
    `).bind(step.order, Date.now(), step.id).run()
  }

  return { success: true }
})



