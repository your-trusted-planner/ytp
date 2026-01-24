-- People Consolidation Data Migration
-- This script migrates data from the old structure to the new Belly Button Principle structure
-- Run this AFTER the schema migration has been applied

-- =============================================================================
-- PHASE 2A: Create people records for existing users (staff, lawyers, admins)
-- =============================================================================

-- Create people records for all non-CLIENT users who don't already have a linked person
INSERT INTO people (
  id,
  person_type,
  first_name,
  last_name,
  full_name,
  email,
  phone,
  notes,
  import_metadata,
  created_at,
  updated_at
)
SELECT
  'person_' || u.id,
  'individual',
  u.first_name,
  u.last_name,
  COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''),
  u.email,
  u.phone,
  NULL,
  json_object('source', 'migration', 'migratedFrom', 'users', 'userId', u.id),
  u.created_at,
  u.updated_at
FROM users u
WHERE u.role NOT IN ('CLIENT', 'LEAD', 'PROSPECT')
  AND NOT EXISTS (
    SELECT 1 FROM people p WHERE p.id = 'person_' || u.id
  );

-- Link users to their new people records
UPDATE users
SET person_id = 'person_' || id
WHERE role NOT IN ('CLIENT', 'LEAD', 'PROSPECT')
  AND person_id IS NULL;

-- =============================================================================
-- PHASE 2B: Create people records for existing clients
-- =============================================================================

-- Create people records for CLIENT/LEAD/PROSPECT users
-- Include additional profile data from clientProfiles
INSERT INTO people (
  id,
  person_type,
  first_name,
  last_name,
  full_name,
  email,
  phone,
  address,
  city,
  state,
  zip_code,
  date_of_birth,
  notes,
  import_metadata,
  created_at,
  updated_at
)
SELECT
  'person_' || u.id,
  'individual',
  u.first_name,
  u.last_name,
  COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''),
  u.email,
  u.phone,
  cp.address,
  cp.city,
  cp.state,
  cp.zip_code,
  cp.date_of_birth,
  NULL,
  json_object('source', 'migration', 'migratedFrom', 'users+clientProfiles', 'userId', u.id),
  u.created_at,
  u.updated_at
FROM users u
LEFT JOIN client_profiles cp ON cp.user_id = u.id
WHERE u.role IN ('CLIENT', 'LEAD', 'PROSPECT')
  AND NOT EXISTS (
    SELECT 1 FROM people p WHERE p.id = 'person_' || u.id
  );

-- Link client users to their new people records
UPDATE users
SET person_id = 'person_' || id
WHERE role IN ('CLIENT', 'LEAD', 'PROSPECT')
  AND person_id IS NULL;

-- =============================================================================
-- PHASE 2C: Create clients table records from clientProfiles
-- =============================================================================

-- Map user status to client status
-- USER status: PROSPECT, PENDING_APPROVAL, ACTIVE, INACTIVE
-- CLIENT status: LEAD, PROSPECT, ACTIVE, INACTIVE
INSERT INTO clients (
  id,
  person_id,
  status,
  has_minor_children,
  children_info,
  business_name,
  business_type,
  has_will,
  has_trust,
  referral_type,
  referred_by_person_id,
  referred_by_partner_id,
  referral_notes,
  initial_attribution_source,
  initial_attribution_medium,
  initial_attribution_campaign,
  google_drive_folder_id,
  google_drive_folder_url,
  google_drive_sync_status,
  google_drive_sync_error,
  google_drive_last_sync_at,
  assigned_lawyer_id,
  import_metadata,
  created_at,
  updated_at
)
SELECT
  'client_' || u.id,
  'person_' || u.id,
  -- Map status: USER.role (CLIENT/LEAD/PROSPECT) + USER.status determines client status
  CASE
    WHEN u.role = 'LEAD' THEN 'LEAD'
    WHEN u.role = 'PROSPECT' OR u.status = 'PROSPECT' THEN 'PROSPECT'
    WHEN u.status = 'INACTIVE' THEN 'INACTIVE'
    ELSE 'ACTIVE'
  END,
  COALESCE(cp.has_minor_children, 0),
  cp.children_info,
  cp.business_name,
  cp.business_type,
  COALESCE(cp.has_will, 0),
  COALESCE(cp.has_trust, 0),
  cp.referral_type,
  -- Convert referred_by_user_id to person_id
  CASE WHEN cp.referred_by_user_id IS NOT NULL THEN 'person_' || cp.referred_by_user_id ELSE NULL END,
  cp.referred_by_partner_id,
  cp.referral_notes,
  cp.initial_attribution_source,
  cp.initial_attribution_medium,
  cp.initial_attribution_campaign,
  cp.google_drive_folder_id,
  cp.google_drive_folder_url,
  cp.google_drive_sync_status,
  cp.google_drive_sync_error,
  cp.google_drive_last_sync_at,
  cp.assigned_lawyer_id,
  json_object('source', 'migration', 'migratedFrom', 'clientProfiles', 'profileId', cp.id, 'userId', u.id),
  COALESCE(cp.created_at, u.created_at),
  COALESCE(cp.updated_at, u.updated_at)
FROM users u
LEFT JOIN client_profiles cp ON cp.user_id = u.id
WHERE u.role IN ('CLIENT', 'LEAD', 'PROSPECT')
  AND NOT EXISTS (
    SELECT 1 FROM clients c WHERE c.person_id = 'person_' || u.id
  );

-- =============================================================================
-- PHASE 2D: Migrate clientRelationships to unified relationships table
-- =============================================================================

-- First, ensure people records exist for all people referenced in clientRelationships
-- (They should already exist from the people table, but just in case)

-- Migrate clientRelationships to relationships table
INSERT INTO relationships (
  id,
  from_person_id,
  to_person_id,
  relationship_type,
  context,
  context_id,
  ordinal,
  notes,
  created_at,
  updated_at
)
SELECT
  'rel_client_' || cr.id,
  'person_' || cr.client_id,  -- The client (user) becomes the "from" person
  cr.person_id,                -- The related person is the "to" person
  cr.relationship_type,
  'client',                    -- Context is 'client' since this came from clientRelationships
  NULL,                        -- No specific context ID needed for client-level relationships
  cr.ordinal,
  cr.notes,
  cr.created_at,
  cr.updated_at
FROM client_relationships cr
WHERE NOT EXISTS (
  SELECT 1 FROM relationships r WHERE r.id = 'rel_client_' || cr.id
);

-- =============================================================================
-- PHASE 2E: Migrate matterRelationships to unified relationships table
-- =============================================================================

INSERT INTO relationships (
  id,
  from_person_id,
  to_person_id,
  relationship_type,
  context,
  context_id,
  ordinal,
  notes,
  created_at,
  updated_at
)
SELECT
  'rel_matter_' || mr.id,
  -- Get the client's person_id from the matter
  (SELECT 'person_' || m.client_id FROM matters m WHERE m.id = mr.matter_id),
  mr.person_id,
  mr.relationship_type,
  'matter',              -- Context is 'matter' since this came from matterRelationships
  mr.matter_id,          -- Store the matter ID as context
  mr.ordinal,
  mr.notes,
  mr.created_at,
  mr.updated_at
FROM matter_relationships mr
WHERE NOT EXISTS (
  SELECT 1 FROM relationships r WHERE r.id = 'rel_matter_' || mr.id
);

-- =============================================================================
-- VERIFICATION QUERIES (run these to verify the migration)
-- =============================================================================

-- Check all users have linked people records
-- SELECT COUNT(*) as users_without_person FROM users WHERE person_id IS NULL;

-- Check all clients have client records
-- SELECT COUNT(*) as clients_without_record
-- FROM users u
-- WHERE u.role IN ('CLIENT', 'LEAD', 'PROSPECT')
--   AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.person_id = 'person_' || u.id);

-- Check relationship migration
-- SELECT
--   (SELECT COUNT(*) FROM client_relationships) as old_client_rels,
--   (SELECT COUNT(*) FROM matter_relationships) as old_matter_rels,
--   (SELECT COUNT(*) FROM relationships) as new_rels;

-- =============================================================================
-- NOTES
-- =============================================================================
--
-- This migration is designed to be idempotent - it can be run multiple times
-- without creating duplicate records (uses NOT EXISTS checks).
--
-- After running this migration and verifying the data:
-- 1. Update API endpoints to use the new structure (Phase 3)
-- 2. Update auth system to use personId (Phase 4)
-- 3. Add new FK columns to other tables (Phase 5)
-- 4. Drop deprecated tables: clientProfiles, clientRelationships, matterRelationships (Phase 6)
