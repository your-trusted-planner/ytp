import { eq } from 'drizzle-orm'
import { schema } from '../index'
import { hashPassword } from '../../utils/auth'
import { SEED_IDS } from './constants'
import type { SeedDb, SeedUserIds } from './types'

// Helper to insert user if not exists, return actual ID
async function upsertUser(
  db: SeedDb,
  seedId: string,
  email: string,
  data: {
    password: string
    role: 'ADMIN' | 'LAWYER' | 'STAFF' | 'CLIENT' | 'ADVISOR'
    adminLevel: number
    firstName: string
    lastName: string
  }
): Promise<string> {
  // Try to insert - will do nothing if email exists
  await db.insert(schema.users).values({
    id: seedId,
    email,
    password: data.password,
    role: data.role,
    adminLevel: data.adminLevel,
    firstName: data.firstName,
    lastName: data.lastName,
    status: 'ACTIVE'
  }).onConflictDoNothing()

  // Query to get the actual ID (may be different if user pre-existed)
  const [user] = await db.select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))

  return user?.id || seedId
}

export async function seedUsers(db: SeedDb): Promise<SeedUserIds> {
  console.log('Seeding users...')

  const hashedPassword = await hashPassword('password123')
  const ids = SEED_IDS.users

  // Admin user
  const adminId = await upsertUser(db, ids.admin, 'admin@trustandlegacy.test', {
    password: hashedPassword,
    role: 'ADMIN',
    adminLevel: 3,
    firstName: 'Sarah',
    lastName: 'Admin'
  })
  console.log('  Created admin: admin@trustandlegacy.test')

  // Primary lawyer (John Meuli)
  const lawyerId = await upsertUser(db, ids.lawyer, 'john.meuli@yourtrustedplanner.com', {
    password: hashedPassword,
    role: 'LAWYER',
    adminLevel: 0,
    firstName: 'John',
    lastName: 'Meuli'
  })
  console.log('  Created lawyer: john.meuli@yourtrustedplanner.com')

  // Second lawyer (Mary Parker)
  const lawyer2Id = await upsertUser(db, ids.lawyer2, 'mary.parker@trustandlegacy.test', {
    password: hashedPassword,
    role: 'LAWYER',
    adminLevel: 1,
    firstName: 'Mary',
    lastName: 'Parker'
  })
  console.log('  Created lawyer: mary.parker@trustandlegacy.test')

  // Staff member (paralegal)
  const staffId = await upsertUser(db, ids.staff, 'lisa.chen@trustandlegacy.test', {
    password: hashedPassword,
    role: 'STAFF',
    adminLevel: 0,
    firstName: 'Lisa',
    lastName: 'Chen'
  })
  console.log('  Created staff: lisa.chen@trustandlegacy.test')

  // External advisor (CPA)
  const advisorId = await upsertUser(db, ids.advisor, 'bob.advisor@external.test', {
    password: hashedPassword,
    role: 'ADVISOR',
    adminLevel: 0,
    firstName: 'Bob',
    lastName: 'Advisor'
  })
  console.log('  Created advisor: bob.advisor@external.test')

  // Client 1: Jane Doe (active matter, in-progress journey)
  const client1Id = await upsertUser(db, ids.client1, 'jane.doe@test.com', {
    password: hashedPassword,
    role: 'CLIENT',
    adminLevel: 0,
    firstName: 'Jane',
    lastName: 'Doe'
  })
  console.log('  Created client: jane.doe@test.com')

  // Client 2: Michael Johnson (prospect)
  const client2Id = await upsertUser(db, ids.client2, 'michael.johnson@test.com', {
    password: hashedPassword,
    role: 'CLIENT',
    adminLevel: 0,
    firstName: 'Michael',
    lastName: 'Johnson'
  })
  console.log('  Created client: michael.johnson@test.com')

  // Client 3: Sarah Williams (completed matter)
  const client3Id = await upsertUser(db, ids.client3, 'sarah.williams@test.com', {
    password: hashedPassword,
    role: 'CLIENT',
    adminLevel: 0,
    firstName: 'Sarah',
    lastName: 'Williams'
  })
  console.log('  Created client: sarah.williams@test.com')

  return {
    adminId,
    lawyerId,
    lawyer2Id,
    staffId,
    advisorId,
    client1Id,
    client2Id,
    client3Id
  }
}
