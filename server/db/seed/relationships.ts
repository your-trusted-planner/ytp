import { schema } from '../index'
import { SEED_IDS } from './constants'
import type { SeedDb, SeedDates, SeedUserIds, SeedMatterIds } from './types'

export interface SeedPersonIds {
  person1Id: string // Robert Doe (spouse)
  person2Id: string // Emily Doe (daughter)
  person3Id: string // James Doe (son)
  person4Id: string // Margaret Smith (mother)
  janePersonId: string // Jane Doe (for matter roles)
}

export async function seedRelationships(
  db: SeedDb,
  dates: SeedDates,
  userIds: SeedUserIds,
  matterIds: SeedMatterIds
): Promise<SeedPersonIds> {
  console.log('Seeding people & relationships...')

  const { twoMonthsAgo } = dates
  const { client1Id } = userIds
  const { matter1Id } = matterIds
  const peopleIds = SEED_IDS.people
  const clientRelIds = SEED_IDS.clientRelationships
  const matterRelIds = SEED_IDS.matterRelationships

  // People for Jane Doe's trust
  await db.insert(schema.people).values({
    id: peopleIds.robertDoe,
    firstName: 'Robert',
    lastName: 'Doe',
    fullName: 'Robert Doe',
    email: 'robert.doe@test.com',
    phone: '(555) 123-4568',
    dateOfBirth: new Date('1973-09-20'),
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  await db.insert(schema.people).values({
    id: peopleIds.emilyDoe,
    firstName: 'Emily',
    lastName: 'Doe',
    fullName: 'Emily Doe',
    email: 'emily.doe@test.com',
    dateOfBirth: new Date('1998-04-12'),
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  await db.insert(schema.people).values({
    id: peopleIds.jamesDoe,
    firstName: 'James',
    lastName: 'Doe',
    fullName: 'James Doe',
    email: 'james.doe@test.com',
    dateOfBirth: new Date('2001-11-05'),
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  await db.insert(schema.people).values({
    id: peopleIds.margaretSmith,
    firstName: 'Margaret',
    lastName: 'Smith',
    fullName: 'Margaret Smith',
    phone: '(555) 987-6543',
    dateOfBirth: new Date('1948-12-01'),
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  console.log('  Created 4 people records')

  // Client Relationships for Jane Doe
  await db.insert(schema.clientRelationships).values({
    id: clientRelIds.jane_robert,
    clientId: client1Id,
    personId: peopleIds.robertDoe,
    relationshipType: 'SPOUSE',
    ordinal: 1,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  await db.insert(schema.clientRelationships).values({
    id: clientRelIds.jane_emily,
    clientId: client1Id,
    personId: peopleIds.emilyDoe,
    relationshipType: 'CHILD',
    ordinal: 1,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  await db.insert(schema.clientRelationships).values({
    id: clientRelIds.jane_james,
    clientId: client1Id,
    personId: peopleIds.jamesDoe,
    relationshipType: 'CHILD',
    ordinal: 2,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  await db.insert(schema.clientRelationships).values({
    id: clientRelIds.jane_margaret,
    clientId: client1Id,
    personId: peopleIds.margaretSmith,
    relationshipType: 'PARENT',
    ordinal: 1,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  console.log('  Created 4 client relationships')

  // Create a person record for Jane herself (for matter roles)
  await db.insert(schema.people).values({
    id: peopleIds.janeDoeMatter,
    firstName: 'Jane',
    lastName: 'Doe',
    fullName: 'Jane Doe',
    email: 'jane.doe@test.com',
    phone: '(555) 123-4567',
    dateOfBirth: new Date('1975-06-15'),
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  // Matter Relationships for Jane Doe's trust
  await db.insert(schema.matterRelationships).values({
    id: matterRelIds.jane_grantor,
    matterId: matter1Id,
    personId: peopleIds.janeDoeMatter,
    relationshipType: 'GRANTOR',
    ordinal: 1,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  await db.insert(schema.matterRelationships).values({
    id: matterRelIds.robert_cotrustee,
    matterId: matter1Id,
    personId: peopleIds.robertDoe,
    relationshipType: 'CO_TRUSTEE',
    ordinal: 1,
    notes: 'Serves as co-trustee with Jane',
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  await db.insert(schema.matterRelationships).values({
    id: matterRelIds.emily_beneficiary,
    matterId: matter1Id,
    personId: peopleIds.emilyDoe,
    relationshipType: 'BENEFICIARY',
    ordinal: 1,
    notes: 'Primary beneficiary - 50% share',
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  await db.insert(schema.matterRelationships).values({
    id: matterRelIds.james_beneficiary,
    matterId: matter1Id,
    personId: peopleIds.jamesDoe,
    relationshipType: 'BENEFICIARY',
    ordinal: 2,
    notes: 'Primary beneficiary - 50% share',
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  console.log('  Created 4 matter relationships')

  return {
    person1Id: peopleIds.robertDoe,
    person2Id: peopleIds.emilyDoe,
    person3Id: peopleIds.jamesDoe,
    person4Id: peopleIds.margaretSmith,
    janePersonId: peopleIds.janeDoeMatter
  }
}
