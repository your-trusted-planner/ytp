import { drizzle } from 'drizzle-orm/d1'
import { seedDatabase } from '../database/seed'
import { schema } from '../database'

/**
 * Remote seeding endpoint for preview/production environments
 * Protected by NUXT_SEED_TOKEN environment variable
 *
 * Usage:
 * curl -X POST https://your-preview-url.com/api/seed-remote \
 *   -H "Authorization: Bearer YOUR_SEED_TOKEN"
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  // Check for authorization token
  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.replace('Bearer ', '')

  const seedToken = config.seedToken || process.env.NUXT_SEED_TOKEN

  if (!token || !seedToken || token !== seedToken) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized. Valid seed token required.'
    })
  }

  try {
    const db = hubDatabase()
    const drizzleDb = drizzle(db, { schema })

    // Check if database is already seeded
    const result = await db.prepare('SELECT COUNT(*) as count FROM users').run()
    const count = result.results?.[0]?.count || 0

    if (count > 0) {
      return {
        success: false,
        message: `Database already has ${count} users. Clear the database first if you want to re-seed.`
      }
    }

    // Seed the database
    await seedDatabase(drizzleDb)

    return {
      success: true,
      message: 'Database seeded successfully!',
      credentials: {
        lawyer: { email: 'lawyer@yourtrustedplanner.com', password: 'password123' },
        client: { email: 'client@test.com', password: 'password123' }
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to seed database: ${error.message}`
    })
  }
})
