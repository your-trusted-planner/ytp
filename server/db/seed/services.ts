import { schema } from '../index'
import { SEED_IDS } from './constants'
import type { SeedDb, SeedServiceIds } from './types'

export async function seedServices(db: SeedDb, engagementTemplateId: string): Promise<SeedServiceIds> {
  console.log('Seeding services...')

  const ids = SEED_IDS.services

  // Service Categories - use onConflictDoNothing to handle existing name constraint
  await db.insert(schema.serviceCategories).values({
    id: ids.category1,
    name: 'Estate Planning',
    description: 'End-of-life planning and related services',
    displayOrder: 1,
    isActive: true
  }).onConflictDoNothing()

  await db.insert(schema.serviceCategories).values({
    id: ids.category2,
    name: 'Entity Formation',
    description: 'LLCs, corporations, and business entities',
    displayOrder: 2,
    isActive: true
  }).onConflictDoNothing()

  await db.insert(schema.serviceCategories).values({
    id: ids.category3,
    name: 'Maintenance',
    description: 'Ongoing administration and compliance services',
    displayOrder: 3,
    isActive: true
  }).onConflictDoNothing()

  await db.insert(schema.serviceCategories).values({
    id: ids.category4,
    name: 'Asset Protection',
    description: 'DAPTs, Asset Protection Trusts, Spendthrift Trusts, etc.',
    displayOrder: 4,
    isActive: true
  }).onConflictDoNothing()

  console.log('  Created 4 service categories')

  // Service Catalog - use onConflictDoNothing for idempotency
  await db.insert(schema.serviceCatalog).values({
    id: ids.wydapt,
    name: 'Wyoming Asset Protection Trust',
    description: 'Complete trust formation with asset protection',
    category: 'Trust Formation',
    type: 'SINGLE',
    price: 1850000, // $18,500
    engagementLetterId: engagementTemplateId
  }).onConflictDoNothing()

  await db.insert(schema.serviceCatalog).values({
    id: ids.maintenance,
    name: 'Annual Trust Maintenance',
    description: 'Ongoing trust administration and compliance',
    category: 'Maintenance',
    type: 'RECURRING',
    price: 50000, // $500
    duration: 'ANNUALLY'
  }).onConflictDoNothing()

  await db.insert(schema.serviceCatalog).values({
    id: ids.llc,
    name: 'LLC Formation - Wyoming',
    description: 'Wyoming LLC formation and setup',
    category: 'Entity Formation',
    type: 'SINGLE',
    price: 250000 // $2,500
  }).onConflictDoNothing()

  console.log('  Created 3 service catalog items')

  return {
    service1Id: ids.wydapt,
    service2Id: ids.maintenance,
    service3Id: ids.llc
  }
}
