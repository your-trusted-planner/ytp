/**
 * DELETE /api/admin/integrations/wealthcounsel/pending/:parseId
 *
 * Delete/abandon a pending WealthCounsel parse session
 */

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const parseId = getRouterParam(event, 'parseId')
  if (!parseId) {
    throw createError({ statusCode: 400, message: 'Parse ID is required' })
  }

  const { kv } = await import('@nuxthub/kv')

  // Check if the session exists
  const key = `wc_parse:${parseId}`
  const exists = await kv.has(key)

  if (!exists) {
    throw createError({
      statusCode: 404,
      message: 'Parse session not found or already expired'
    })
  }

  // Delete the session
  await kv.del(key)

  return {
    success: true,
    message: 'Parse session deleted'
  }
})
