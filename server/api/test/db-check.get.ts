import { isDatabaseAvailable } from '../../db'

export default defineEventHandler(async (event) => {
  const available = isDatabaseAvailable()

  // Check if we can get a Drizzle instance
  let drizzleWorks = false
  try {
    const { useDrizzle } = await import('../../db')
    const db = useDrizzle()
    drizzleWorks = !!db
  } catch (e) {
    drizzleWorks = false
  }

  return {
    databaseAvailable: available,
    drizzleAvailable: drizzleWorks,
    // Legacy checks for backwards compatibility
    hubDatabaseType: typeof hubDatabase,
    hubDatabaseExists: typeof hubDatabase !== 'undefined'
  }
})

