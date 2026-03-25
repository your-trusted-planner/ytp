// People and Relationships - Core identity tables (Belly Button Principle)
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { jsonArray } from './common'
import { users } from './auth'
import { matters } from './matters'

// People - Separates identity from authentication
// Every human in the system is a person (Belly Button Principle)
export const people = sqliteTable('people', {
  id: text('id').primaryKey(),
  // Person type: individual or entity (trust, corporation, etc.)
  personType: text('person_type', { enum: ['individual', 'entity'] }).notNull().default('individual'),
  // Personal Information
  firstName: text('first_name'),
  lastName: text('last_name'),
  middleNames: jsonArray('middle_names'), // Custom type handles serialization
  fullName: text('full_name'),
  // Contact Information
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  address2: text('address_2'), // Apt, Suite, Unit, Building, etc.
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  country: text('country'), // ISO 3166-1 alpha-2 (e.g., "US", "CH") or null
  // Additional Details
  dateOfBirth: integer('date_of_birth', { mode: 'timestamp' }),
  maritalStatus: text('marital_status'),
  ssnLast4: text('ssn_last_4'),
  // Notes
  notes: text('notes'),
  // Marketing consent
  globalUnsubscribe: integer('global_unsubscribe').notNull().default(0),
  globalUnsubscribeAt: integer('global_unsubscribe_at', { mode: 'timestamp' }),
  globalUnsubscribeSource: text('global_unsubscribe_source'),
  // External system IDs
  apolloContactId: text('apollo_contact_id'),
  // Import tracking
  importMetadata: text('import_metadata'),
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, table => ({
  fullNameIdx: index('idx_people_full_name').on(table.fullName),
  emailIdx: index('idx_people_email').on(table.email),
  phoneIdx: index('idx_people_phone').on(table.phone),
  lastNameIdx: index('idx_people_last_name').on(table.lastName),
  createdAtIdx: index('idx_people_created_at').on(table.createdAt)
}))

// Relationships - Unified relationship tracking (Belly Button Principle)
// Links people to people with context for where the relationship applies
export const relationships = sqliteTable('relationships', {
  id: text('id').primaryKey(),
  fromPersonId: text('from_person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  toPersonId: text('to_person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  relationshipType: text('relationship_type').notNull(), // SPOUSE, CHILD, TRUSTEE, BENEFICIARY, etc.
  context: text('context', { enum: ['client', 'matter'] }), // null = general relationship
  contextId: text('context_id'), // matterId if context='matter'
  ordinal: integer('ordinal').notNull().default(0),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, table => ({
  fromPersonIdx: index('idx_relationships_from_person_id').on(table.fromPersonId),
  toPersonIdx: index('idx_relationships_to_person_id').on(table.toPersonId),
  typeIdx: index('idx_relationships_type').on(table.relationshipType)
}))

// Client Relationships - Links clients to people (DEPRECATED: use relationships table)
export const clientRelationships = sqliteTable('client_relationships', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  personId: text('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  relationshipType: text('relationship_type').notNull(), // SPOUSE, CHILD, PARENT, etc.
  ordinal: integer('ordinal').notNull().default(0),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Matter Relationships - Links matters to people (DEPRECATED: use relationships table)
export const matterRelationships = sqliteTable('matter_relationships', {
  id: text('id').primaryKey(),
  matterId: text('matter_id').notNull().references(() => matters.id, { onDelete: 'cascade' }),
  personId: text('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  relationshipType: text('relationship_type').notNull(), // GRANTOR, TRUSTEE, BENEFICIARY, etc.
  ordinal: integer('ordinal').notNull().default(0),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
