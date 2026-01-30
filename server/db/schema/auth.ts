// Authentication and Authorization tables
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { people } from './people'

// OAuth Providers table - stores enabled authentication providers
export const oauthProviders = sqliteTable('oauth_providers', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull().unique(), // Firebase provider ID (e.g., 'google.com', 'facebook.com')
  name: text('name').notNull(), // Display name (e.g., 'Google', 'Facebook')
  logoUrl: text('logo_url'), // Logo image (data URI or external URL)
  buttonColor: text('button_color').notNull().default('#4285F4'), // Hex color for button
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(false),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Users table - Authentication/authorization accounts
// Links to people table for identity (Belly Button Principle)
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  // Link to person identity - every user is a person
  personId: text('person_id').references(() => people.id),
  email: text('email').unique(), // Nullable for imported records without email
  password: text('password'), // Nullable for OAuth-only users
  firebaseUid: text('firebase_uid').unique(), // Firebase user ID for OAuth users
  role: text('role', { enum: ['ADMIN', 'LAWYER', 'STAFF', 'CLIENT', 'ADVISOR', 'LEAD', 'PROSPECT'] }).notNull().default('PROSPECT'),
  adminLevel: integer('admin_level').default(0), // 0=none, 1=basic admin, 2=full admin, 3+=super admin
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  avatar: text('avatar'),
  // Default hourly rate for this user (cents) - used as fallback when no overrides exist
  // Only applicable for LAWYER and STAFF roles
  defaultHourlyRate: integer('default_hourly_rate'),
  // Stored signature image (base64 data URL) for reuse across documents
  // Requires affirmative adoption each time it's used
  signatureImage: text('signature_image'),
  signatureImageUpdatedAt: integer('signature_image_updated_at', { mode: 'timestamp' }),
  status: text('status', { enum: ['PROSPECT', 'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE'] }).notNull().default('PROSPECT'),
  // Import tracking - JSON with source, externalId, flags, sourceData
  importMetadata: text('import_metadata'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Password Reset Tokens - For email-based password reset flow
export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(), // Secure random token
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp' }), // Null until used
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// LawPay OAuth2 Connections - Store LawPay authorization metadata
// Note: Access tokens are cached in KV store for performance
export const lawpayConnections = sqliteTable('lawpay_connections', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  merchantPublicKey: text('merchant_public_key').notNull(),
  merchantName: text('merchant_name'),
  scope: text('scope').notNull(), // OAuth scope (e.g., "payments")
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(), // When access token expires
  revokedAt: integer('revoked_at', { mode: 'timestamp' }), // When connection was revoked
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
