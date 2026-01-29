import { schema } from '../index'
import { eq, and } from 'drizzle-orm'
import { SEED_IDS } from './constants'
import type { SeedDb, SeedDates, SeedUserIds, SeedServiceIds, SeedMatterIds } from './types'

export async function seedMatters(
  db: SeedDb,
  dates: SeedDates,
  userIds: SeedUserIds,
  serviceIds: SeedServiceIds
): Promise<SeedMatterIds> {
  console.log('Seeding matters...')

  const { now, oneWeekAgo, oneMonthAgo, twoMonthsAgo, threeMonthsAgo } = dates
  const { client1Id, client2Id, client3Id, lawyerId, lawyer2Id } = userIds
  const { service1Id } = serviceIds
  const matterIds = SEED_IDS.matters

  // Matter 1: Jane Doe - Active WYDAPT
  await db.insert(schema.matters).values({
    id: matterIds.janeDoe,
    clientId: client1Id,
    title: 'Doe Family Trust Formation',
    description: 'Wyoming Asset Protection Trust for the Doe family',
    status: 'OPEN',
    createdAt: twoMonthsAgo,
    updatedAt: now
  }).onConflictDoNothing()

  // Matter 2: Michael Johnson - Pending (prospect)
  await db.insert(schema.matters).values({
    id: matterIds.michaelJohnson,
    clientId: client2Id,
    title: 'Johnson Estate Planning',
    description: 'Initial consultation for estate planning services',
    status: 'PENDING',
    createdAt: oneWeekAgo,
    updatedAt: oneWeekAgo
  }).onConflictDoNothing()

  // Matter 3: Sarah Williams - Completed
  await db.insert(schema.matters).values({
    id: matterIds.sarahWilliams,
    clientId: client3Id,
    title: 'Williams Family Trust',
    description: 'Wyoming Asset Protection Trust - Completed',
    status: 'CLOSED',
    createdAt: threeMonthsAgo,
    updatedAt: oneMonthAgo
  }).onConflictDoNothing()

  console.log('  Created 3 matters')

  // Matter-Service relationships (use composite key - delete and reinsert for idempotency)
  await db.delete(schema.mattersToServices).where(
    and(
      eq(schema.mattersToServices.matterId, matterIds.janeDoe),
      eq(schema.mattersToServices.catalogId, service1Id)
    )
  )
  await db.insert(schema.mattersToServices).values({
    matterId: matterIds.janeDoe,
    catalogId: service1Id,
    engagedAt: twoMonthsAgo,
    assignedAttorneyId: lawyerId,
    status: 'ACTIVE',
    startDate: twoMonthsAgo
  })

  await db.delete(schema.mattersToServices).where(
    and(
      eq(schema.mattersToServices.matterId, matterIds.sarahWilliams),
      eq(schema.mattersToServices.catalogId, service1Id)
    )
  )
  await db.insert(schema.mattersToServices).values({
    matterId: matterIds.sarahWilliams,
    catalogId: service1Id,
    engagedAt: threeMonthsAgo,
    assignedAttorneyId: lawyer2Id,
    status: 'COMPLETED',
    startDate: threeMonthsAgo,
    endDate: oneMonthAgo
  })

  console.log('  Created 2 matter-service relationships')

  return {
    matter1Id: matterIds.janeDoe,
    matter2Id: matterIds.michaelJohnson,
    matter3Id: matterIds.sarahWilliams
  }
}
