import { drizzle } from 'drizzle-orm/d1'
import { seedDatabase } from '../../database/seed'
import { schema } from '../../database'

export default defineEventHandler(async (event) => {
  // Only allow in development
  if (!process.dev) {
    throw createError({
      statusCode: 403,
      message: 'Seeding is only allowed in development mode'
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
