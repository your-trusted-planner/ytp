/**
 * POST /api/admin/sync/trigger
 *
 * Manually trigger the scheduled sync — runs the exact same code path
 * as the cron job (staleness check, incremental sync, etc.)
 */
export default defineEventHandler(async (event) => {
  const env = event.context.cloudflare?.env

  if (!env) {
    throw createError({ statusCode: 500, message: 'Cloudflare environment not available' })
  }

  const { handleScheduledSync } = await import('../../../plugins/scheduled-sync')

  await handleScheduledSync(env)

  return { success: true, message: 'Scheduled sync triggered' }
})
