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

    // Seed the database (blob is auto-imported from hub:blob)
    await seedDatabase(db, blob)

    return {
      success: true,
      message: 'Database seeded successfully!',
      accounts: {
        admin: { email: 'admin@trustandlegacy.test', password: 'password123', role: 'ADMIN' },
        lawyers: [
          { email: 'john.meuli@yourtrustedplanner.com', password: 'password123', role: 'LAWYER' },
          { email: 'mary.parker@trustandlegacy.test', password: 'password123', role: 'LAWYER' }
        ],
        staff: { email: 'lisa.chen@trustandlegacy.test', password: 'password123', role: 'STAFF' },
        advisor: { email: 'bob.advisor@external.test', password: 'password123', role: 'ADVISOR' },
        clients: [
          { email: 'jane.doe@test.com', password: 'password123', role: 'CLIENT', status: 'active matter' },
          { email: 'michael.johnson@test.com', password: 'password123', role: 'CLIENT', status: 'prospect' },
          { email: 'sarah.williams@test.com', password: 'password123', role: 'CLIENT', status: 'completed' }
        ]
      },
      data: {
        users: 8,
        clientProfiles: 3,
        matters: 3,
        journeys: 1,
        journeySteps: 7,
        clientJourneys: 3,
        actionItems: 11,
        people: 5,
        documents: 4
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to seed database: ${error.message}`
    })
  }
})
