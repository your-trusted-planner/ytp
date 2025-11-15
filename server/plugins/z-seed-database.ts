import { readFileSync } from 'fs'
import { join } from 'path'
import { drizzle } from 'drizzle-orm/d1'
import { seedDatabase } from '../database/seed'
import { schema } from '../database'

let isInitialized = false

export default defineNitroPlugin(async () => {
  if (isInitialized) {
    console.log('[DB Plugin] Already initialized, skipping...')
    return
  }

  console.log('[DB Plugin] Starting database initialization...')

  try {
    // Try to get database instance
    let db
    try {
      db = hubDatabase()
      console.log('[DB Plugin] Successfully got database instance')
    } catch (e: any) {
      console.log('[DB Plugin] Database error:', e.message || e)
      console.log('[DB Plugin] Using mock DB instead')
      return
    }

    if (!db) {
      console.log('[DB Plugin] Database instance is null, using mock DB')
      return
    }

    const drizzleDb = drizzle(db, { schema })
    
    // Check if database needs initialization
    let needsMigration = false
    let needsSeeding = false

    try {
      const result = await db.prepare('SELECT COUNT(*) as count FROM users').run()
      const count = result.results?.[0]?.count || 0

      if (count === 0) {
        console.log('🔧 Database is empty, needs seeding...')
        needsSeeding = true
      } else {
        console.log('✅ Database already initialized with data')
        isInitialized = true
        return
      }
    } catch (e) {
      // Table doesn't exist, need to run migrations
      console.log('🔧 Database tables not found, running migrations...')
      needsMigration = true
      needsSeeding = true
    }
    
    // Run migrations if needed
    if (needsMigration) {
      const migrationPath = join(process.cwd(), 'server/database/migrations/0001_oval_banshee.sql')
      const migration = readFileSync(migrationPath, 'utf-8')

      // Split by statement breakpoint and execute each statement
      const statements = migration
        .split('--> statement-breakpoint')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'))

      for (const statement of statements) {
        await db.exec(statement)
      }

      console.log('✅ Database migrations applied')
    }

    // Seed database if needed (only in development)
    if (needsSeeding && process.dev) {
      await seedDatabase(drizzleDb)
      console.log('🎉 Database initialization complete!')
    } else if (needsSeeding && !process.dev) {
      console.log('⚠️  Database is empty but seeding is disabled in production')
      console.log('💡 Run database migrations and seed manually in production')
    }

    isInitialized = true
  } catch (error: any) {
    console.error('❌ Database initialization error:', error.message)
    // This is not necessarily a problem - app will use mock DB
  }
})

