-- Migration: Restructure services table to matters_to_services junction table
-- This implements the agreed domain model where matters have many-to-many relationship with service_catalog

-- ========================================
-- STEP 1: Create new matters_to_services junction table
-- ========================================
CREATE TABLE matters_to_services (
  matter_id TEXT NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  catalog_id TEXT NOT NULL REFERENCES service_catalog(id) ON DELETE CASCADE,
  engaged_at INTEGER NOT NULL DEFAULT (unixepoch()),
  assigned_attorney_id TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  start_date INTEGER,
  end_date INTEGER,
  PRIMARY KEY (matter_id, catalog_id)
);

-- ========================================
-- STEP 2: Create new payments table (matter-level)
-- ========================================
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK(payment_type IN ('CONSULTATION', 'DEPOSIT_50', 'FINAL_50', 'MAINTENANCE', 'CUSTOM')),
  amount INTEGER NOT NULL,
  payment_method TEXT CHECK(payment_method IN ('LAWPAY', 'CHECK', 'WIRE', 'CREDIT_CARD', 'ACH', 'OTHER')),
  lawpay_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED')),
  paid_at INTEGER,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- ========================================
-- STEP 3: Migrate data from services to matters_to_services
-- ========================================
INSERT INTO matters_to_services (matter_id, catalog_id, engaged_at, assigned_attorney_id, status, start_date, end_date)
SELECT
  matter_id,
  catalog_id,
  created_at,
  assigned_attorney_id,
  status,
  start_date,
  end_date
FROM services
WHERE parent_service_id IS NULL; -- Only migrate primary services, not maintenance links

-- ========================================
-- STEP 4: Migrate payment data from service_payments to payments
-- ========================================
INSERT INTO payments (id, matter_id, payment_type, amount, payment_method, lawpay_transaction_id, status, paid_at, notes, created_at, updated_at)
SELECT
  sp.id,
  s.matter_id,
  sp.payment_type,
  sp.amount,
  sp.payment_method,
  sp.lawpay_transaction_id,
  sp.status,
  sp.paid_at,
  sp.notes,
  sp.created_at,
  sp.updated_at
FROM service_payments sp
JOIN services s ON sp.service_id = s.id;

-- ========================================
-- STEP 5: Add matter_id and catalog_id to client_journeys
-- ========================================
ALTER TABLE client_journeys ADD COLUMN matter_id TEXT;
ALTER TABLE client_journeys ADD COLUMN catalog_id TEXT;

-- ========================================
-- STEP 6: Populate client_journeys with matter_id and catalog_id from services
-- ========================================
-- First, we need to find the service associated with each client_journey
-- The relationship is: client_journey -> journey -> service_catalog and client -> matter -> service

-- For now, we'll use a temporary approach to link via journey's service_catalog_id
-- This assumes client_journeys should link to the client's most recent engagement of that service type

UPDATE client_journeys
SET
  matter_id = (
    SELECT s.matter_id
    FROM services s
    JOIN matters m ON m.id = s.matter_id
    JOIN journeys j ON j.service_catalog_id = s.catalog_id
    WHERE m.client_id = client_journeys.client_id
      AND j.id = client_journeys.journey_id
    ORDER BY s.created_at DESC
    LIMIT 1
  ),
  catalog_id = (
    SELECT j.service_catalog_id
    FROM journeys j
    WHERE j.id = client_journeys.journey_id
  );

-- ========================================
-- STEP 7: Update documents to reference matter instead of service
-- ========================================
ALTER TABLE documents ADD COLUMN matter_id_new TEXT;

UPDATE documents
SET matter_id_new = (
  SELECT s.matter_id
  FROM services s
  WHERE s.id = documents.service_id
)
WHERE service_id IS NOT NULL;

-- Update existing matter_id column with the new value where it was NULL
UPDATE documents
SET matter_id = COALESCE(matter_id, matter_id_new);

-- Drop the temporary column
-- Note: SQLite doesn't support DROP COLUMN in older versions, so we'll leave matter_id_new for now
-- It can be cleaned up in a future migration or ignored

-- ========================================
-- STEP 8: Update client_selected_packages to reference engagement
-- ========================================
ALTER TABLE client_selected_packages ADD COLUMN matter_id TEXT;
ALTER TABLE client_selected_packages ADD COLUMN catalog_id TEXT;

UPDATE client_selected_packages
SET
  matter_id = (SELECT matter_id FROM services WHERE id = service_id),
  catalog_id = (SELECT catalog_id FROM services WHERE id = service_id);

-- ========================================
-- STEP 9: Create indexes for performance
-- ========================================
CREATE INDEX idx_matters_to_services_matter ON matters_to_services(matter_id);
CREATE INDEX idx_matters_to_services_catalog ON matters_to_services(catalog_id);
CREATE INDEX idx_client_journeys_matter_catalog ON client_journeys(matter_id, catalog_id);
CREATE INDEX idx_payments_matter ON payments(matter_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ========================================
-- STEP 10: Drop old service_payments table
-- ========================================
DROP TABLE IF EXISTS service_payments;

-- ========================================
-- NOTE: NOT dropping services table yet
-- ========================================
-- We're keeping the services table for now to allow for a gradual migration
-- Once all API endpoints are updated to use the new structure, we can:
-- 1. Drop foreign key constraints from documents.service_id
-- 2. Drop foreign key constraints from client_selected_packages.service_id
-- 3. Drop the services table entirely
--
-- This will be done in a future migration after code updates are complete.
