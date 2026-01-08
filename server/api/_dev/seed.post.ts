import { seedDatabase } from '../../db/seed'
import { schema } from '../../db'

export default defineEventHandler(async (event) => {
  // Only allow in development
  if (!process.dev) {
    throw createError({
      statusCode: 403,
      message: 'Seeding is only allowed in development mode'
    })
  }

  try {
    const { useDrizzle } = await import('../../db')
    const { sql } = await import('drizzle-orm')
    const db = useDrizzle()

    // Check if database is already seeded
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .get()

    const count = result?.count || 0

    if (count > 0) {
      return {
        success: false,
        message: `Database already has ${count} users. Clear the database first if you want to re-seed.`
      }
    }

    // Seed the database
    await seedDatabase(db)

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
