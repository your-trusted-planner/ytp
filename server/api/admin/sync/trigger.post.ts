/**
 * POST /api/admin/sync/trigger
 *
 * Manually trigger the scheduled sync — runs the exact same code path
 * as the cron job (staleness check, incremental sync, etc.)
 *
 * Optional body: { updatedSince?: string }
 *   When set, overrides the incremental start date for all phases
 *   instead of using the stored lastSyncTimestamps.
 */
export default defineEventHandler(async (event) => {
  const env = event.context.cloudflare?.env

  if (!env) {
    throw createError({ statusCode: 500, message: 'Cloudflare environment not available' })
  }

  const body = await readBody(event).catch(() => ({}))
  const options = body?.updatedSince ? { updatedSince: body.updatedSince as string } : undefined

  const { handleScheduledSync } = await import('../../../plugins/scheduled-sync')

  await handleScheduledSync(env, options)

  return { success: true, message: 'Scheduled sync triggered' }
})
