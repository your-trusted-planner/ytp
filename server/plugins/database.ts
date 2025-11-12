import { readFileSync } from 'fs'
import { join } from 'path'
import { seedDatabase } from '../database/seed'

let isInitialized = false

export default defineNitroPlugin(async () => {
  if (isInitialized) return
  
  try {
    // Check if we have D1 binding available
    if (typeof hubDatabase === 'undefined') {
      console.log('⚠️  D1 database not available. Run with: npx nuxthub dev')
      return
    }
    
    const db = hubDatabase()
    
    // Check if users table exists
    try {
      await db.prepare('SELECT 1 FROM users LIMIT 1').run()
      console.log('✅ Database already initialized')
      isInitialized = true
      return
    } catch (e) {
      // Table doesn't exist, need to initialize
      console.log('🔧 Initializing database...')
    }
    
    // Read and execute migration
    const migrationPath = join(process.cwd(), 'server/database/migrations/0000_small_warhawk.sql')
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
    
    // Seed database
    await seedDatabase()
    
    isInitialized = true
    console.log('🎉 Database initialization complete!')
  } catch (error: any) {
    console.error('❌ Database initialization error:', error.message)
    console.log('💡 Tip: Run the app with "npx nuxthub dev" for full database support')
  }
})

