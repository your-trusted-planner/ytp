import { readFileSync } from 'fs'
import { join } from 'path'
import { seedDatabase } from '../../database/seed'

export default defineEventHandler(async (event) => {
  try {
    const db = hubDatabase()
    
    // Read and execute migration
    const migrationPath = join(process.cwd(), 'server/database/migrations/0000_small_warhawk.sql')
    const migration = readFileSync(migrationPath, 'utf-8')
    
    // Split by statement breakpoint and execute each statement
    const statements = migration.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean)
    
    for (const statement of statements) {
      if (statement && !statement.startsWith('--')) {
        await db.exec(statement)
      }
    }
    
    console.log('✅ Database migrations applied')
    
    // Seed database
    await seedDatabase()
    
    return {
      success: true,
      message: 'Database initialized and seeded successfully'
    }
  } catch (error: any) {
    console.error('Database initialization error:', error)
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }
})

