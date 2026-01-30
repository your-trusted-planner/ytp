// Barrel file - re-exports all schema tables
// This file is the single entry point for importing schema

// Common utilities
export { jsonArray } from './common'

// Core identity tables (Belly Button Principle)
export { people, relationships, clientRelationships, matterRelationships } from './people'

// Authentication
export { oauthProviders, users, passwordResetTokens, lawpayConnections } from './auth'

// Clients
export { clients, clientProfiles, clientMarketingAttribution } from './clients'

// Service Catalog
export { serviceCategories, serviceCatalog, questionnaires, questionnaireResponses } from './catalog'

// Matters
export { matters, mattersToServices, payments } from './matters'

// Documents
export { templateFolders, documentTemplates, documents, documentUploads, uploadedDocuments, snapshotVersions } from './documents'

// Journey System
export {
  journeys,
  journeysToCatalog,
  journeySteps,
  clientJourneys,
  journeyStepProgress,
  actionItems,
  bridgeConversations,
  automations,
  faqLibrary
} from './journeys'

// Appointments
export { appointments, attorneyCalendars, publicBookings } from './appointments'

// Activities & Notes
export { notes, activities } from './activities'

// Marketing
export { marketingSources, referralPartners, marketingEvents, eventRegistrations } from './marketing'

// E-Signatures
export { signatureSessions } from './signatures'

// Billing & Trust Accounting
export {
  trustAccounts,
  clientTrustLedgers,
  invoices,
  invoiceLineItems,
  clientBillingRates,
  matterBillingRates,
  timeEntries,
  trustTransactions
} from './billing'

// Settings
export { settings, googleDriveConfig } from './settings'

// Notifications
export { notices, noticeRecipients } from './notifications'

// Data Migration
export { integrations, migrationRuns, migrationErrors, importDuplicates } from './migrations'

// Estate Plans
export {
  estatePlans,
  planVersions,
  trusts,
  wills,
  ancillaryDocuments,
  planRoles,
  planEvents,
  planToMatters
} from './estate-plans'
