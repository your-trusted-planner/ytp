import { drizzle } from 'drizzle-orm/d1'
import { seedDatabase } from '../database/seed'
import { schema } from '../database'

let isInitialized = false

export default defineNitroPlugin(async () => {
  if (isInitialized) return

  // Note: This plugin only works when hubDatabase() is available (in production or with nuxthub dev)
  // For local development with 'nuxt dev', use the /api/_dev/seed endpoint instead

  try {
    // Try to get database instance
    let db
    try {
      db = hubDatabase()
    } catch (e) {
      // Database not available - this is normal in local dev with 'nuxt dev'
      // App will use mock database or the /api/_dev/seed endpoint
      return
    }

    if (!db) return

    const drizzleDb = drizzle(db, { schema })

    // Check if database has data
    try {
      const result = await db.prepare('SELECT COUNT(*) as count FROM users').run()
      const count = result.results?.[0]?.count || 0

      if (count > 0) {
        console.log('✅ Database already has data')
        isInitialized = true
        return
      }
    } catch (e) {
      // Tables don't exist - NuxtHub will handle migrations automatically
      console.log('⚠️  Database tables not found - NuxtHub should handle migrations')
    }

    // Seed database in development only
    if (process.dev) {
      try {
        await seedDatabase(drizzleDb)
        console.log('✅ Database seeded successfully')
      } catch (seedError: any) {
        console.error('❌ Seeding failed:', seedError.message)
      }
    }

    isInitialized = true
  } catch (error: any) {
    // Silently fail - app will use mock DB or manual seeding
    console.log('⚠️  Database plugin skipped:', error.message)
  }
})

