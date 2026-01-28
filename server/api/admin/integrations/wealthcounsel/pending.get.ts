/**
 * GET /api/admin/integrations/wealthcounsel/pending
 *
 * List pending WealthCounsel parse sessions (imports that haven't been completed)
 */

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { kv } = await import('@nuxthub/kv')

  // List all keys with the wc_parse: prefix
  const keys = await kv.keys('wc_parse:')

  const pendingSessions: Array<{
    parseId: string
    clientName: string
    planName?: string
    planType: string
    createdAt: string
    createdBy: string
    expiresIn?: string
  }> = []

  for (const key of keys) {
    try {
      const data = await kv.get<{
        parsedData: any
        xmlString: string
        userId: string
        createdAt: string
      }>(key)

      if (data) {
        const parseId = key.replace('wc_parse:', '')
        const createdAt = new Date(data.createdAt)
        const expiresAt = new Date(createdAt.getTime() + 3600 * 1000) // 1 hour TTL
        const now = new Date()
        const remainingMs = expiresAt.getTime() - now.getTime()

        let expiresIn: string | undefined
        if (remainingMs > 0) {
          const minutes = Math.floor(remainingMs / 60000)
          expiresIn = `${minutes} minute${minutes !== 1 ? 's' : ''}`
        }

        pendingSessions.push({
          parseId,
          clientName: data.parsedData?.client?.fullName || 'Unknown Client',
          planName: data.parsedData?.trust?.name,
          planType: data.parsedData?.planType || 'UNKNOWN',
          createdAt: data.createdAt,
          createdBy: data.userId,
          expiresIn
        })
      }
    } catch (error) {
      // Skip invalid entries
      console.error(`Error reading pending session ${key}:`, error)
    }
  }

  // Sort by created date, newest first
  pendingSessions.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return {
    sessions: pendingSessions,
    count: pendingSessions.length
  }
})
