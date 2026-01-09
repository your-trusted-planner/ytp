-- Migration: Create people table and relationship tables
-- Separates authentication (users) from identity (people)
-- Enables flexible relationship modeling

-- ============================================
-- 1. Create people table
-- ============================================
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,

  -- Personal Information
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,

  -- Contact Information
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,

  -- Additional Details
  date_of_birth INTEGER,  -- epoch timestamp
  ssn_last_4 TEXT,

  -- For Corporate Entities (trust companies, financial institutions, etc.)
  entity_name TEXT,
  entity_type TEXT,  -- LLC, CORPORATION, TRUST_COMPANY, FINANCIAL_INSTITUTION
  entity_ein TEXT,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_people_email ON people(email);
CREATE INDEX idx_people_last_name ON people(last_name);
CREATE INDEX idx_people_full_name ON people(full_name);

-- ============================================
-- 2. Create client_relationships table
-- ============================================
CREATE TABLE IF NOT EXISTS client_relationships (
  id TEXT PRIMARY KEY,

  -- References
  client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,

  -- Relationship Details
  relationship_type TEXT NOT NULL,  -- SPOUSE, CHILD, PARENT, SIBLING, ADVISOR, etc.
  ordinal INTEGER DEFAULT 0,  -- For ordering (child 1, child 2, etc.)

  notes TEXT,

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  -- Ensure unique combinations (but allow multiple ordinals)
  UNIQUE(client_id, person_id, relationship_type, ordinal)
);

CREATE INDEX idx_client_relationships_client ON client_relationships(client_id);
CREATE INDEX idx_client_relationships_person ON client_relationships(person_id);
CREATE INDEX idx_client_relationships_type ON client_relationships(relationship_type);

-- ============================================
-- 3. Create matter_relationships table
-- ============================================
CREATE TABLE IF NOT EXISTS matter_relationships (
  id TEXT PRIMARY KEY,

  -- References
  matter_id TEXT NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,

  -- Relationship Details
  relationship_type TEXT NOT NULL,  -- GRANTOR, TRUSTEE, BENEFICIARY, EXECUTOR, etc.
  ordinal INTEGER DEFAULT 0,  -- For ordering (successor trustee 1, 2, 3)

  notes TEXT,

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  -- Ensure unique combinations (but allow multiple ordinals)
  UNIQUE(matter_id, person_id, relationship_type, ordinal)
);

CREATE INDEX idx_matter_relationships_matter ON matter_relationships(matter_id);
CREATE INDEX idx_matter_relationships_person ON matter_relationships(person_id);
CREATE INDEX idx_matter_relationships_type ON matter_relationships(relationship_type);

-- ============================================
-- 4. Migrate existing CLIENT users to people
-- ============================================

-- Create person records for all existing CLIENT users
-- Note: Only copying fields that exist in users table (first_name, last_name, email, phone)
INSERT INTO people (
  id,
  first_name,
  last_name,
  full_name,
  email,
  phone,
  created_at,
  updated_at
)
SELECT
  'person_' || id AS id,
  first_name,
  last_name,
  COALESCE(first_name || ' ' || last_name, email) AS full_name,
  email,
  phone,
  created_at,
  updated_at
FROM users
WHERE role = 'CLIENT';

-- ============================================
-- 5. Add person_id to users table
-- ============================================

-- Add the column
ALTER TABLE users ADD COLUMN person_id TEXT REFERENCES people(id);

-- Link CLIENT users to their person records
UPDATE users
SET person_id = 'person_' || id
WHERE role = 'CLIENT';

-- Create index for efficient lookups
CREATE INDEX idx_users_person_id ON users(person_id);

-- ============================================
-- Notes on relationship types:
-- ============================================

-- CLIENT-LEVEL RELATIONSHIP TYPES:
--   Personal: SPOUSE, EX_SPOUSE, PARTNER, CHILD, STEPCHILD, GRANDCHILD, PARENT, SIBLING
--   Professional: FINANCIAL_ADVISOR, ACCOUNTANT, INSURANCE_AGENT, ATTORNEY
--   Business: BUSINESS_PARTNER, BUSINESS_ASSOCIATE

-- MATTER-LEVEL RELATIONSHIP TYPES:
--   Trust: GRANTOR, CO_GRANTOR, TRUSTEE, SUCCESSOR_TRUSTEE, TRUST_PROTECTOR,
--          BENEFICIARY, CONTINGENT_BENEFICIARY, REMAINDER_BENEFICIARY
--   Estate: EXECUTOR, SUCCESSOR_EXECUTOR, PERSONAL_REPRESENTATIVE
--   Power of Attorney: AGENT_FINANCIAL_POA, AGENT_HEALTHCARE_POA
--   Guardianship: GUARDIAN, GUARDIAN_OF_ESTATE

-- The application layer should validate these types and provide appropriate UI
