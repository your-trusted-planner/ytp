import { schema } from '../index'
import { eq } from 'drizzle-orm'
import { SEED_IDS } from './constants'
import type { SeedDb, SeedDates, SeedUserIds, SeedClientIds } from './types'

export async function seedClients(
  db: SeedDb,
  dates: SeedDates,
  userIds: SeedUserIds
): Promise<SeedClientIds> {
  console.log('Seeding clients...')

  const { oneWeekAgo, twoMonthsAgo, threeMonthsAgo, oneMonthAgo } = dates
  const { client1Id, client2Id, client3Id, lawyerId, lawyer2Id } = userIds
  const peopleIds = SEED_IDS.people
  const clientIds = SEED_IDS.clients
  const profileIds = SEED_IDS.clientProfiles

  // Create people records for the clients (Belly Button Principle)
  await db.insert(schema.people).values({
    id: peopleIds.janeDoe,
    firstName: 'Jane',
    lastName: 'Doe',
    fullName: 'Jane Doe',
    email: 'jane.doe@test.com',
    phone: '(555) 123-4567',
    address: '123 Oak Street',
    city: 'Denver',
    state: 'CO',
    zipCode: '80202',
    dateOfBirth: new Date('1975-06-15'),
    personType: 'individual',
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  await db.insert(schema.people).values({
    id: peopleIds.michaelJohnson,
    firstName: 'Michael',
    lastName: 'Johnson',
    fullName: 'Michael Johnson',
    email: 'michael.johnson@test.com',
    phone: '(555) 234-5678',
    city: 'Boulder',
    state: 'CO',
    personType: 'individual',
    createdAt: oneWeekAgo,
    updatedAt: oneWeekAgo
  }).onConflictDoNothing()

  await db.insert(schema.people).values({
    id: peopleIds.sarahWilliams,
    firstName: 'Sarah',
    lastName: 'Williams',
    fullName: 'Sarah Williams',
    email: 'sarah.williams@test.com',
    phone: '(555) 345-6789',
    address: '456 Pine Avenue',
    city: 'Cheyenne',
    state: 'WY',
    zipCode: '82001',
    dateOfBirth: new Date('1968-03-22'),
    personType: 'individual',
    createdAt: threeMonthsAgo,
    updatedAt: threeMonthsAgo
  }).onConflictDoNothing()

  // Link users to their person records
  await db.update(schema.users).set({ personId: peopleIds.janeDoe }).where(
    eq(schema.users.id, client1Id)
  )
  await db.update(schema.users).set({ personId: peopleIds.michaelJohnson }).where(
    eq(schema.users.id, client2Id)
  )
  await db.update(schema.users).set({ personId: peopleIds.sarahWilliams }).where(
    eq(schema.users.id, client3Id)
  )

  // Create client records in the clients table
  await db.insert(schema.clients).values({
    id: clientIds.jane,
    personId: peopleIds.janeDoe,
    status: 'ACTIVE',
    hasMinorChildren: true,
    childrenInfo: JSON.stringify([
      { name: 'Emily Doe', age: 28 },
      { name: 'James Doe', age: 25 }
    ]),
    hasWill: false,
    hasTrust: false,
    assignedLawyerId: lawyerId,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  await db.insert(schema.clients).values({
    id: clientIds.michael,
    personId: peopleIds.michaelJohnson,
    status: 'PROSPECT',
    hasMinorChildren: false,
    hasWill: true,
    hasTrust: false,
    assignedLawyerId: lawyerId,
    createdAt: oneWeekAgo,
    updatedAt: oneWeekAgo
  }).onConflictDoNothing()

  await db.insert(schema.clients).values({
    id: clientIds.sarah,
    personId: peopleIds.sarahWilliams,
    status: 'ACTIVE',
    hasMinorChildren: false,
    hasWill: true,
    hasTrust: true,
    assignedLawyerId: lawyer2Id,
    createdAt: threeMonthsAgo,
    updatedAt: oneMonthAgo
  }).onConflictDoNothing()

  // Create legacy client profiles (for backward compatibility)
  await db.insert(schema.clientProfiles).values({
    id: profileIds.jane,
    userId: client1Id,
    assignedLawyerId: lawyerId,
    dateOfBirth: new Date('1975-06-15'),
    phone: '(555) 123-4567',
    address: '123 Oak Street',
    city: 'Denver',
    state: 'CO',
    zip: '80202'
  }).onConflictDoNothing()

  await db.insert(schema.clientProfiles).values({
    id: profileIds.michael,
    userId: client2Id,
    assignedLawyerId: lawyerId,
    phone: '(555) 234-5678',
    city: 'Boulder',
    state: 'CO'
  }).onConflictDoNothing()

  await db.insert(schema.clientProfiles).values({
    id: profileIds.sarah,
    userId: client3Id,
    assignedLawyerId: lawyer2Id,
    dateOfBirth: new Date('1968-03-22'),
    phone: '(555) 345-6789',
    address: '456 Pine Avenue',
    city: 'Cheyenne',
    state: 'WY',
    zip: '82001'
  }).onConflictDoNothing()

  console.log('  Created 3 client records and profiles')

  return {
    janeClientId: clientIds.jane,
    michaelClientId: clientIds.michael,
    sarahClientId: clientIds.sarah,
    janeDoePersonId: peopleIds.janeDoe,
    michaelJohnsonPersonId: peopleIds.michaelJohnson,
    sarahWilliamsPersonId: peopleIds.sarahWilliams
  }
}
