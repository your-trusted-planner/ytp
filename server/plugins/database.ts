// Database plugin - handles auto-seeding in development
// NuxtHub 0.10.x applies migrations automatically on startup

export default defineNitroPlugin((nitroApp) => {
  console.log('💾 NuxtHub database plugin loaded')

  // Auto-seed in development (idempotent - safe to run every time)
  // Use hookOnce on 'request' to ensure migrations have been applied first
  if (import.meta.dev) {
    nitroApp.hooks.hookOnce('request', async () => {
      try {
        console.log('🌱 Running idempotent seed...')

        const { useDrizzle } = await import('../db')
        const db = useDrizzle()

        const { seedDatabase } = await import('../db/seed')
        await seedDatabase(db, blob)

        console.log('✅ Seeding complete!')
      }
      catch (error) {
        console.error('⚠️ Auto-seed failed:', error)
        // Don't throw - let the server continue anyway
        // Still try to seed message templates even if main seed fails
        try {
          const { useDrizzle } = await import('../db')
          const { seedMessageTemplates } = await import('../db/seed/message-templates')
          await seedMessageTemplates(useDrizzle() as any)
        }
        catch { /* ignore */ }
      }
    })
  }
})
