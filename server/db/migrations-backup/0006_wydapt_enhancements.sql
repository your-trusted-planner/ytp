-- Migration: WYDAPT Workflow Enhancements
-- Based on client feedback and gap analysis
-- Date: 2025-01-02

-- ===================================
-- 1. CONFIGURABLE CONSULTATION SETTINGS
-- ===================================

-- Add consultation fee to service catalog (configurable per lawyer/tenant)
ALTER TABLE service_catalog ADD COLUMN consultation_fee INTEGER DEFAULT 37500; -- $375 in cents, configurable
ALTER TABLE service_catalog ADD COLUMN consultation_fee_enabled INTEGER DEFAULT 1; -- boolean

-- ===================================
-- 2. ADDITIONAL GRANTOR SYSTEM
-- ===================================

-- Add grantor relationship tracking
CREATE TABLE IF NOT EXISTS additional_grantors (
  id TEXT PRIMARY KEY,
  primary_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grantor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'SPOUSE', -- SPOUSE, CO_TRUSTEE, etc.
  matter_id TEXT REFERENCES matters(id) ON DELETE CASCADE, -- Link to specific matter
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(primary_user_id, grantor_user_id, matter_id)
);

-- Update client_profiles to track grantor type
ALTER TABLE client_profiles ADD COLUMN grantor_type TEXT DEFAULT 'SINGLE'; -- SINGLE, ADDITIONAL

-- ===================================
-- 3. ATTORNEY CALL NOTES
-- ===================================

-- Add attorney notes to questionnaire responses
ALTER TABLE questionnaire_responses ADD COLUMN attorney_notes TEXT;
ALTER TABLE questionnaire_responses ADD COLUMN attorney_notes_updated_at INTEGER;

-- Add call notes to appointments
ALTER TABLE appointments ADD COLUMN pre_call_notes TEXT; -- Notes before call
ALTER TABLE appointments ADD COLUMN call_notes TEXT; -- Notes during/after call
ALTER TABLE appointments ADD COLUMN call_notes_updated_at INTEGER;

-- ===================================
-- 4. GOOGLE CALENDAR CONFIGURATION
-- ===================================

-- Store multiple Google Calendar configurations per attorney
CREATE TABLE IF NOT EXISTS attorney_calendars (
  id TEXT PRIMARY KEY,
  attorney_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL, -- Google Calendar ID
  calendar_name TEXT NOT NULL,
  calendar_email TEXT NOT NULL, -- Service account email or attorney email
  is_primary INTEGER NOT NULL DEFAULT 0, -- Primary calendar for appointments
  service_account_key TEXT, -- Encrypted service account JSON (optional)
  timezone TEXT DEFAULT 'America/New_York',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- ===================================
-- 5. DOCUMENT SUMMARY TRACKING
-- ===================================

-- Add document summary generation for pre-payment view
CREATE TABLE IF NOT EXISTS document_summaries (
  id TEXT PRIMARY KEY,
  client_journey_id TEXT NOT NULL REFERENCES client_journeys(id) ON DELETE CASCADE,
  summary_data TEXT NOT NULL, -- JSON: document choices/selections made
  is_final INTEGER NOT NULL DEFAULT 0, -- 0 = pre-payment summary, 1 = final with docs
  generated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  viewed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- ===================================
-- 6. PACKAGE CONFIGURATION SYSTEM
-- ===================================

-- Store WYDAPT package definitions (configurable by attorney)
CREATE TABLE IF NOT EXISTS service_packages (
  id TEXT PRIMARY KEY,
  service_catalog_id TEXT NOT NULL REFERENCES service_catalog(id) ON DELETE CASCADE,
  package_number INTEGER NOT NULL, -- 1, 2, 3, 4
  package_name TEXT NOT NULL,
  package_description TEXT,
  included_documents TEXT NOT NULL, -- JSON array of document template IDs
  additional_fee INTEGER DEFAULT 0, -- Additional cost in cents (if any)
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(service_catalog_id, package_number)
);

-- Track which packages client selected
CREATE TABLE IF NOT EXISTS client_selected_packages (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  package_id TEXT NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
  selected_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(service_id, package_id)
);

-- ===================================
-- 7. PAYMENT TRACKING ENHANCEMENTS
-- ===================================

-- Track individual payments (for 50% splits)
CREATE TABLE IF NOT EXISTS service_payments (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL, -- CONSULTATION, DEPOSIT_50, FINAL_50, MAINTENANCE, etc.
  amount INTEGER NOT NULL, -- Amount in cents
  payment_method TEXT, -- LAWPAY, CHECK, WIRE, etc.
  lawpay_transaction_id TEXT, -- LawPay reference
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED
  paid_at INTEGER,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- ===================================
-- 8. NOTARY OFFLINE WORKFLOW
-- ===================================

-- Track notary document download/upload workflow (replaces PandaDoc for notary)
CREATE TABLE IF NOT EXISTS notary_documents (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  client_journey_id TEXT NOT NULL REFERENCES client_journeys(id) ON DELETE CASCADE,
  step_progress_id TEXT REFERENCES journey_step_progress(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, DOWNLOADED, NOTARIZED, UPLOADED, COMPLETED
  downloaded_at INTEGER,
  downloaded_by TEXT REFERENCES users(id),
  notarized_pdf_path TEXT, -- Path to uploaded notarized PDF
  uploaded_at INTEGER,
  uploaded_by TEXT REFERENCES users(id),
  notary_name TEXT,
  notary_commission_number TEXT,
  notary_state TEXT,
  notary_expiration_date INTEGER,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- ===================================
-- 9. PUBLIC BOOKING SYSTEM
-- ===================================

-- Track public booking requests (before user account creation)
CREATE TABLE IF NOT EXISTS public_bookings (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  questionnaire_id TEXT REFERENCES questionnaires(id),
  questionnaire_responses TEXT, -- JSON of responses
  consultation_fee_paid INTEGER NOT NULL DEFAULT 0, -- boolean
  payment_id TEXT, -- LawPay payment reference
  payment_amount INTEGER, -- Amount paid in cents
  attorney_id TEXT REFERENCES users(id), -- Which attorney they're booking with
  calendar_id TEXT REFERENCES attorney_calendars(id),
  appointment_id TEXT REFERENCES appointments(id), -- Once appointment is created
  user_id TEXT REFERENCES users(id), -- Once user account is created
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING_PAYMENT, PENDING_BOOKING, BOOKED, CONVERTED, CANCELLED
  booking_completed_at INTEGER,
  converted_to_client_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- ===================================
-- 10. MAINTENANCE PACKAGE ACTIVATION
-- ===================================

-- Track maintenance package activation (only if paid)
ALTER TABLE services ADD COLUMN requires_payment_to_activate INTEGER DEFAULT 0; -- For maintenance packages
ALTER TABLE services ADD COLUMN parent_service_id TEXT REFERENCES services(id); -- Link maintenance to original WYDAPT

-- ===================================
-- 11. DOCUMENT WORKFLOW ENHANCEMENTS
-- ===================================

-- Add grantor type to documents for proper selection
ALTER TABLE documents ADD COLUMN grantor_type TEXT DEFAULT 'SINGLE'; -- SINGLE, TWO_GRANTORS
ALTER TABLE document_templates ADD COLUMN grantor_type TEXT DEFAULT 'SINGLE'; -- SINGLE, TWO_GRANTORS

-- Track document approval workflow
ALTER TABLE documents ADD COLUMN attorney_approved INTEGER DEFAULT 0;
ALTER TABLE documents ADD COLUMN attorney_approved_at INTEGER;
ALTER TABLE documents ADD COLUMN attorney_approved_by TEXT REFERENCES users(id);
ALTER TABLE documents ADD COLUMN ready_for_signature INTEGER DEFAULT 0;
ALTER TABLE documents ADD COLUMN ready_for_signature_at INTEGER;

-- ===================================
-- INDEXES FOR PERFORMANCE
-- ===================================

CREATE INDEX IF NOT EXISTS idx_additional_grantors_primary ON additional_grantors(primary_user_id);
CREATE INDEX IF NOT EXISTS idx_additional_grantors_grantor ON additional_grantors(grantor_user_id);
CREATE INDEX IF NOT EXISTS idx_attorney_calendars_attorney ON attorney_calendars(attorney_id);
CREATE INDEX IF NOT EXISTS idx_document_summaries_journey ON document_summaries(client_journey_id);
CREATE INDEX IF NOT EXISTS idx_service_packages_catalog ON service_packages(service_catalog_id);
CREATE INDEX IF NOT EXISTS idx_service_payments_service ON service_payments(service_id);
CREATE INDEX IF NOT EXISTS idx_notary_documents_document ON notary_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_notary_documents_journey ON notary_documents(client_journey_id);
CREATE INDEX IF NOT EXISTS idx_public_bookings_email ON public_bookings(email);
CREATE INDEX IF NOT EXISTS idx_public_bookings_status ON public_bookings(status);

