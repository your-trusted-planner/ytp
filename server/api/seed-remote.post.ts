import { seedDatabase } from '../db/seed'
import { schema } from '../db'

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
    const { useDrizzle } = await import('../db')
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

    // Seed the database with blob storage for full functionality
    // Note: DOCX template files won't be available in Workers (no filesystem),
    // but blob storage allows document storage after seeding
    await seedDatabase(db, blob)

    // Verify what was created
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(schema.users).get()
    const matterCount = await db.select({ count: sql<number>`count(*)` }).from(schema.matters).get()
    const docCount = await db.select({ count: sql<number>`count(*)` }).from(schema.documents).get()

    return {
      success: true,
      message: 'Database seeded successfully!',
      created: {
        users: userCount?.count || 0,
        matters: matterCount?.count || 0,
        documents: docCount?.count || 0
      },
      credentials: {
        admin: { email: 'admin@trustandlegacy.test', password: 'password123' },
        lawyer: { email: 'john.meuli@yourtrustedplanner.com', password: 'password123' },
        lawyer2: { email: 'mary.parker@trustandlegacy.test', password: 'password123' },
        staff: { email: 'lisa.chen@trustandlegacy.test', password: 'password123' },
        advisor: { email: 'bob.advisor@external.test', password: 'password123' },
        client1: { email: 'jane.doe@test.com', password: 'password123', note: 'Active matter' },
        client2: { email: 'michael.johnson@test.com', password: 'password123', note: 'Prospect' },
        client3: { email: 'sarah.williams@test.com', password: 'password123', note: 'Completed' }
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to seed database: ${error.message}`,
      data: { stack: error.stack }
    })
  }
})
