// E-Signature System tables
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './auth'
import { documents } from './documents'
import { actionItems } from './journeys'

// Signature Sessions - Track signing ceremonies with audit trail
export const signatureSessions = sqliteTable('signature_sessions', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  signerId: text('signer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Link to action item (for ESIGN action items in journeys)
  // When set, completing signature will auto-complete the action item
  actionItemId: text('action_item_id').references(() => actionItems.id, { onDelete: 'set null' }),

  // Signature tier: STANDARD (engagement letters) or ENHANCED (requires identity verification)
  signatureTier: text('signature_tier', { enum: ['STANDARD', 'ENHANCED'] }).notNull(),

  // Session state
  status: text('status', {
    enum: ['PENDING', 'IDENTITY_REQUIRED', 'READY', 'SIGNED', 'EXPIRED', 'REVOKED']
  }).notNull().default('PENDING'),

  // Identity verification (for ENHANCED tier)
  identityVerified: integer('identity_verified', { mode: 'boolean' }).notNull().default(false),
  identityVerificationMethod: text('identity_verification_method'), // 'KYC', 'SMS_OTP', 'EMAIL_OTP', 'KNOWLEDGE_BASED'
  identityVerifiedAt: integer('identity_verified_at', { mode: 'timestamp' }),
  identityProvider: text('identity_provider'), // 'PERSONA', 'JUMIO', etc.
  identityReferenceId: text('identity_reference_id'), // External verification ID

  // Signing ceremony - unique token for signing URL
  signingToken: text('signing_token').unique(),
  tokenExpiresAt: integer('token_expires_at', { mode: 'timestamp' }),

  // Request context (audit trail)
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  geolocation: text('geolocation'), // JSON: {country, region, city}

  // Signature capture
  signatureData: text('signature_data'), // Base64 PNG
  signatureHash: text('signature_hash'), // SHA-256 of signature data
  signedAt: integer('signed_at', { mode: 'timestamp' }),

  // Tamper-evident certificate (JSON containing full audit trail)
  signatureCertificate: text('signature_certificate'),

  // Terms acceptance tracking
  termsAcceptedAt: integer('terms_accepted_at', { mode: 'timestamp' }),
  termsVersion: text('terms_version'),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
