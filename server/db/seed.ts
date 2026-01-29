import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { schema } from './index'
import type { SeedDates } from './seed/types'

// Import seed modules
import { seedUsers } from './seed/users'
import { seedClients } from './seed/clients'
import { seedTemplates } from './seed/templates'
import { seedServices } from './seed/services'
import { seedMatters } from './seed/matters'
import { seedJourneys } from './seed/journeys'
import { seedActionItems } from './seed/actions'
import { seedRelationships } from './seed/relationships'
import { seedDocuments } from './seed/documents'
import { seedQuestionnaires } from './seed/questionnaires'
import { seedBilling } from './seed/billing'

export async function seedDatabase(db: DrizzleD1Database<typeof schema>, blob?: any) {
  console.log('Seeding database...')
  console.log('')

  // Setup dates
  const now = new Date()
  const dates: SeedDates = {
    now,
    oneWeekAgo: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    twoWeeksAgo: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    oneMonthAgo: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    twoMonthsAgo: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
    threeMonthsAgo: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  }

  // Phase 1: Users
  const userIds = await seedUsers(db)

  // Phase 2: Templates
  const templateIds = await seedTemplates(db, blob)

  // Phase 3: Services
  const serviceIds = await seedServices(db, templateIds.template2Id)

  // Phase 4: Matters
  const matterIds = await seedMatters(db, dates, userIds, serviceIds)

  // Phase 5: Journeys & Progress
  const journeyIds = await seedJourneys(db, dates, userIds, matterIds, serviceIds)

  // Phase 6: Action Items
  await seedActionItems(db, dates, userIds, journeyIds)

  // Phase 7: People & Relationships
  await seedRelationships(db, dates, userIds, matterIds)

  // Phase 8: Documents
  await seedDocuments(db, dates, userIds, matterIds, templateIds, blob)

  // Phase 9: Clients & Billing (Belly Button Principle)
  const clientIds = await seedClients(db, dates, userIds)
  await seedBilling(db, dates, userIds, clientIds, matterIds, serviceIds)

  // Phase 10: Questionnaires
  await seedQuestionnaires(db)

  // Summary
  console.log('')
  console.log('='.repeat(50))
  console.log('DATABASE SEEDED SUCCESSFULLY')
  console.log('='.repeat(50))
  console.log('')
  console.log('Test Accounts:')
  console.log('  ADMIN:   admin@trustandlegacy.test / password123')
  console.log('  LAWYER:  john.meuli@yourtrustedplanner.com / password123')
  console.log('  LAWYER:  mary.parker@trustandlegacy.test / password123')
  console.log('  STAFF:   lisa.chen@trustandlegacy.test / password123')
  console.log('  ADVISOR: bob.advisor@external.test / password123')
  console.log('  CLIENT:  jane.doe@test.com / password123 (active matter)')
  console.log('  CLIENT:  michael.johnson@test.com / password123 (prospect)')
  console.log('  CLIENT:  sarah.williams@test.com / password123 (completed)')
  console.log('')
  console.log('Data Created:')
  console.log('  - 8 users (all roles)')
  console.log('  - 3 client profiles')
  console.log('  - 3 client records (Belly Button Principle)')
  console.log('  - 3 matters (open, pending, closed)')
  console.log('  - 2 matter-service engagements')
  console.log('  - 1 journey template with 7 steps')
  console.log('  - 3 client journeys')
  console.log('  - 14 journey step progress records')
  console.log('  - 11 action items')
  console.log('  - 8 people records')
  console.log('  - 4 client relationships')
  console.log('  - 4 matter relationships')
  console.log('  - 4 documents')
  console.log('  - 3 document templates')
  console.log('  - 3 service catalog items')
  console.log('')
  console.log('Billing & Trust Data:')
  console.log('  - 1 trust account (IOLTA) with $12,850 balance')
  console.log('  - 3 client trust ledgers')
  console.log('  - 7 trust transactions')
  console.log('  - 4 invoices (2 paid, 1 sent, 1 draft)')
  console.log('  - 8 invoice line items')
  console.log('  - 5 payment records')
  console.log('')
}
