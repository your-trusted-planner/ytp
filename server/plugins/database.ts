// Database plugin - handles auto-seeding in development
// NuxtHub 0.10.x applies migrations automatically on startup

export default defineNitroPlugin((nitroApp) => {
  console.log('💾 NuxtHub database plugin loaded')

  // Auto-seed in development if database is empty
  // Use hookOnce on 'request' to ensure migrations have been applied first
  if (process.dev) {
    nitroApp.hooks.hookOnce('request', async () => {
      try {
        const { useDrizzle, schema } = await import('../db')
        const { sql } = await import('drizzle-orm')
        const db = useDrizzle()

        // Check if database has any users
        const result = await db.select({ count: sql<number>`count(*)` })
          .from(schema.users)
          .get()

        const userCount = result?.count || 0

        if (userCount === 0) {
          console.log('🌱 Database is empty - auto-seeding...')

          const { seedDatabase } = await import('../db/seed')
          // blob is auto-imported from hub:blob
          await seedDatabase(db, blob)

          console.log('✅ Auto-seeding complete!')
        } else {
          console.log(`📊 Database has ${userCount} users - skipping auto-seed`)
        }
      } catch (error) {
        console.error('⚠️ Auto-seed check failed:', error)
        // Don't throw - let the server continue anyway
      }
    })
  }
})

