// Client-specific data tables (Belly Button Principle)
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sqliteView } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { people } from './people'
import { users } from './auth'
import { marketingSources } from './marketing'

// Clients - Client-specific data (Belly Button Principle)
// Every client is a person, but not every person is a client
// A client may or may not have a user account for portal access
export const clients = sqliteTable('clients', {
  id: text('id').primaryKey(),
  personId: text('person_id').notNull().references(() => people.id).unique(),
  status: text('status', { enum: ['PROSPECTIVE', 'ACTIVE', 'FORMER'] }).notNull().default('PROSPECTIVE'),

  // Estate planning (migrated from clientProfiles)
  hasMinorChildren: integer('has_minor_children', { mode: 'boolean' }).notNull().default(false),
  childrenInfo: text('children_info'), // JSON string
  businessName: text('business_name'),
  businessType: text('business_type'),
  hasWill: integer('has_will', { mode: 'boolean' }).notNull().default(false),
  hasTrust: integer('has_trust', { mode: 'boolean' }).notNull().default(false),

  // Referral tracking
  referralType: text('referral_type', { enum: ['CLIENT', 'PROFESSIONAL', 'EVENT', 'MARKETING'] }),
  referredByPersonId: text('referred_by_person_id').references(() => people.id),
  referredByPartnerId: text('referred_by_partner_id'), // References referralPartners.id
  referralNotes: text('referral_notes'),

  // Initial attribution captured at lead creation
  initialAttributionSource: text('initial_attribution_source'),
  initialAttributionMedium: text('initial_attribution_medium'),
  initialAttributionCampaign: text('initial_attribution_campaign'),

  // Google Drive sync tracking
  googleDriveFolderId: text('google_drive_folder_id'),
  googleDriveFolderUrl: text('google_drive_folder_url'),
  googleDriveSyncStatus: text('google_drive_sync_status', { enum: ['NOT_SYNCED', 'SYNCED', 'ERROR'] }).default('NOT_SYNCED'),
  googleDriveSyncError: text('google_drive_sync_error'),
  googleDriveLastSyncAt: integer('google_drive_last_sync_at', { mode: 'timestamp' }),
  googleDriveSubfolderIds: text('google_drive_subfolder_ids'), // JSON: {"Generated Documents": "...", ...}

  // Assignment
  assignedLawyerId: text('assigned_lawyer_id').references(() => users.id),

  // Import tracking
  importMetadata: text('import_metadata'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Clients With Status view - derives status from matter activity
// ACTIVE = has at least one OPEN matter (Rule 1.6-1.8: currently represented)
// FORMER = has matters but all CLOSED (Rule 1.9: representation ended)
// PROSPECTIVE = no matters, or matters but none OPEN and not all CLOSED (Rule 1.18)
export const clientsWithStatus = sqliteView('clients_with_status').as(qb =>
  qb.select({
    id: clients.id,
    personId: clients.personId,
    status: sql<string>`CASE
      WHEN EXISTS (
        SELECT 1 FROM matters m
        INNER JOIN users u ON m.client_id = u.id
        WHERE u.person_id = "clients"."person_id" AND m.status = 'OPEN'
      ) THEN 'ACTIVE'
      WHEN EXISTS (
        SELECT 1 FROM matters m
        INNER JOIN users u ON m.client_id = u.id
        WHERE u.person_id = "clients"."person_id"
      ) AND NOT EXISTS (
        SELECT 1 FROM matters m
        INNER JOIN users u ON m.client_id = u.id
        WHERE u.person_id = "clients"."person_id" AND m.status != 'CLOSED'
      ) THEN 'FORMER'
      ELSE 'PROSPECTIVE'
    END`.as('status'),
    hasMinorChildren: clients.hasMinorChildren,
    childrenInfo: clients.childrenInfo,
    businessName: clients.businessName,
    businessType: clients.businessType,
    hasWill: clients.hasWill,
    hasTrust: clients.hasTrust,
    referralType: clients.referralType,
    referredByPersonId: clients.referredByPersonId,
    referredByPartnerId: clients.referredByPartnerId,
    referralNotes: clients.referralNotes,
    initialAttributionSource: clients.initialAttributionSource,
    initialAttributionMedium: clients.initialAttributionMedium,
    initialAttributionCampaign: clients.initialAttributionCampaign,
    googleDriveFolderId: clients.googleDriveFolderId,
    googleDriveFolderUrl: clients.googleDriveFolderUrl,
    googleDriveSyncStatus: clients.googleDriveSyncStatus,
    googleDriveSyncError: clients.googleDriveSyncError,
    googleDriveLastSyncAt: clients.googleDriveLastSyncAt,
    googleDriveSubfolderIds: clients.googleDriveSubfolderIds,
    assignedLawyerId: clients.assignedLawyerId,
    importMetadata: clients.importMetadata,
    createdAt: clients.createdAt,
    updatedAt: clients.updatedAt
  }).from(clients)
)

// Client Profiles table (DEPRECATED: use clients table instead)
// This table will be removed after data migration to clients table
export const clientProfiles = sqliteTable('client_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  dateOfBirth: integer('date_of_birth', { mode: 'timestamp' }),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  hasMinorChildren: integer('has_minor_children', { mode: 'boolean' }).notNull().default(false),
  childrenInfo: text('children_info'), // JSON string
  businessName: text('business_name'),
  businessType: text('business_type'),
  hasWill: integer('has_will', { mode: 'boolean' }).notNull().default(false),
  hasTrust: integer('has_trust', { mode: 'boolean' }).notNull().default(false),
  lastUpdated: integer('last_updated', { mode: 'timestamp' }),
  assignedLawyerId: text('assigned_lawyer_id').references(() => users.id),

  // Referral tracking
  referralType: text('referral_type', { enum: ['CLIENT', 'PROFESSIONAL', 'EVENT', 'MARKETING'] }), // How they were referred
  referredByUserId: text('referred_by_user_id').references(() => users.id), // If referred by existing client
  referredByPartnerId: text('referred_by_partner_id'), // References referralPartners.id (forward ref)
  referralNotes: text('referral_notes'),

  // Initial attribution captured at lead creation
  initialAttributionSource: text('initial_attribution_source'),
  initialAttributionMedium: text('initial_attribution_medium'),
  initialAttributionCampaign: text('initial_attribution_campaign'),

  // Google Drive sync tracking
  googleDriveFolderId: text('google_drive_folder_id'), // Drive folder ID for this client
  googleDriveFolderUrl: text('google_drive_folder_url'), // Web URL to folder
  googleDriveSyncStatus: text('google_drive_sync_status', { enum: ['NOT_SYNCED', 'SYNCED', 'ERROR'] }).default('NOT_SYNCED'),
  googleDriveSyncError: text('google_drive_sync_error'), // Error message if sync failed
  googleDriveLastSyncAt: integer('google_drive_last_sync_at', { mode: 'timestamp' }),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Client Marketing Attribution - Track individual client sources
export const clientMarketingAttribution = sqliteTable('client_marketing_attribution', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  marketingSourceId: text('marketing_source_id').references(() => marketingSources.id),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  utmContent: text('utm_content'),
  utmTerm: text('utm_term'),
  referrerUrl: text('referrer_url'),
  landingPage: text('landing_page'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
