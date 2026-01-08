import { isDatabaseAvailable } from '../../db'

export default defineEventHandler(async () => {
  const dbAvailable = isDatabaseAvailable()

  let dbInfo = null
  if (dbAvailable) {
    try {
      const { useDrizzle, schema } = await import('../../db')
      const { sql } = await import('drizzle-orm')
      const db = useDrizzle()

      const result = await db.select({ count: sql<number>`count(*)` })
        .from(schema.users)
        .get()

      const userCount = result?.count || 0
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
