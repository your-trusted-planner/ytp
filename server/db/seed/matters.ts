import { schema } from '../index'
import { SEED_IDS } from './constants'
import type { SeedDb, SeedDates, SeedUserIds, SeedClientIds, SeedServiceIds, SeedMatterIds } from './types'

export async function seedMatters(
  db: SeedDb,
  dates: SeedDates,
  userIds: SeedUserIds,
  clientIds: SeedClientIds,
  serviceIds: SeedServiceIds
): Promise<SeedMatterIds> {
  console.log('Seeding matters...')

  const { now, oneWeekAgo, oneMonthAgo, twoMonthsAgo, threeMonthsAgo } = dates
  const { lawyerId, lawyer2Id } = userIds
  // matters.clientId references clients.id (Belly Button Principle)
  const { janeClientId, michaelClientId, sarahClientId } = clientIds
  const { service1Id } = serviceIds
  const matterIds = SEED_IDS.matters

  // Matter 1: Jane Doe - Active WYDAPT
  await db.insert(schema.matters).values({
    id: matterIds.janeDoe,
    clientId: janeClientId,
    title: 'Doe Family Trust Formation',
    description: 'Wyoming Asset Protection Trust for the Doe family',
    status: 'OPEN',
    createdAt: twoMonthsAgo,
    updatedAt: now
  }).onConflictDoNothing()

  // Matter 2: Michael Johnson - Pending (prospect)
  await db.insert(schema.matters).values({
    id: matterIds.michaelJohnson,
    clientId: michaelClientId,
    title: 'Johnson Estate Planning',
    description: 'Initial consultation for estate planning services',
    status: 'PENDING',
    createdAt: oneWeekAgo,
    updatedAt: oneWeekAgo
  }).onConflictDoNothing()

  // Matter 3: Sarah Williams - Completed
  await db.insert(schema.matters).values({
    id: matterIds.sarahWilliams,
    clientId: sarahClientId,
    title: 'Williams Family Trust',
    description: 'Wyoming Asset Protection Trust - Completed',
    status: 'CLOSED',
    createdAt: threeMonthsAgo,
    updatedAt: oneMonthAgo
  }).onConflictDoNothing()

  console.log('  Created 3 matters')

  // Matter-Service relationships — upsert on composite PK so we don't violate
  // the FK from clientJourneys(matterId, catalogId) on re-seed.
  const janeService = {
    matterId: matterIds.janeDoe,
    catalogId: service1Id,
    engagedAt: twoMonthsAgo,
    assignedAttorneyId: lawyerId,
    status: 'ACTIVE',
    startDate: twoMonthsAgo
  }
  await db.insert(schema.mattersToServices).values(janeService).onConflictDoUpdate({
    target: [schema.mattersToServices.matterId, schema.mattersToServices.catalogId],
    set: {
      engagedAt: janeService.engagedAt,
      assignedAttorneyId: janeService.assignedAttorneyId,
      status: janeService.status,
      startDate: janeService.startDate
    }
  })

  const sarahService = {
    matterId: matterIds.sarahWilliams,
    catalogId: service1Id,
    engagedAt: threeMonthsAgo,
    assignedAttorneyId: lawyer2Id,
    status: 'COMPLETED',
    startDate: threeMonthsAgo,
    endDate: oneMonthAgo
  }
  await db.insert(schema.mattersToServices).values(sarahService).onConflictDoUpdate({
    target: [schema.mattersToServices.matterId, schema.mattersToServices.catalogId],
    set: {
      engagedAt: sarahService.engagedAt,
      assignedAttorneyId: sarahService.assignedAttorneyId,
      status: sarahService.status,
      startDate: sarahService.startDate,
      endDate: sarahService.endDate
    }
  })

  console.log('  Created 2 matter-service relationships')

  return {
    matter1Id: matterIds.janeDoe,
    matter2Id: matterIds.michaelJohnson,
    matter3Id: matterIds.sarahWilliams
  }
}
