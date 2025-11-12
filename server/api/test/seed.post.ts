import { seedDatabase } from '../../database/seed'

export default defineEventHandler(async (event) => {
  try {
    await seedDatabase()
    return {
      success: true,
      message: 'Database seeded successfully'
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
})

