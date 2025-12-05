import { isDatabaseAvailable } from '../../database'

export default defineEventHandler(async () => {
  const dbAvailable = isDatabaseAvailable()

  let dbInfo = null
  if (dbAvailable) {
    try {
      const db = hubDatabase()
      const result = await db.prepare('SELECT COUNT(*) as count FROM users').run()
      const userCount = result.results?.[0]?.count || 0
      dbInfo = { userCount }
    } catch (e: any) {
      dbInfo = { error: e.message }
    }
  }

  return {
    isDatabaseAvailable: dbAvailable,
    databaseInfo: dbInfo
  }
})
