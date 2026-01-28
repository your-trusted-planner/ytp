import { seedDatabase } from '../../db/seed'
import { useDrizzle } from '../../db'

export default defineEventHandler(async (event) => {
  try {
    // Note: Migrations are now handled by wrangler/drizzle-kit
    // Use `pnpm db:generate` to generate migrations
    // Use wrangler to apply them (automatically done in CI/CD)
    //
    // This endpoint only seeds the database with initial data

    const db = useDrizzle()
    await seedDatabase(db)

    return {
      success: true,
      message: 'Database seeded successfully. Note: Migrations must be applied via wrangler.'
    }
  } catch (error: any) {
    console.error('Database seed error:', error)
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }
})

