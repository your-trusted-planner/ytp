-- Remove contract_date column from matters table
-- This field is no longer needed as engagement letter tracking is handled through engagement journeys

-- SQLite doesn't support DROP COLUMN directly, so we need to:
-- 1. Create new table without the column
-- 2. Copy data
-- 3. Drop old table
-- 4. Rename new table

-- Create new matters table without contract_date
CREATE TABLE matters_new (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  matter_number TEXT,
  description TEXT,
  status TEXT CHECK(status IN ('OPEN', 'CLOSED', 'PENDING')) NOT NULL DEFAULT 'OPEN',
  lead_attorney_id TEXT REFERENCES users(id),
  engagement_journey_id TEXT REFERENCES client_journeys(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Copy data from old table to new table
INSERT INTO matters_new (
  id, client_id, title, matter_number, description, status,
  lead_attorney_id, engagement_journey_id, created_at, updated_at
)
SELECT
  id, client_id, title, matter_number, description, status,
  lead_attorney_id, engagement_journey_id, created_at, updated_at
FROM matters;

-- Drop old table
DROP TABLE matters;

-- Rename new table to original name
ALTER TABLE matters_new RENAME TO matters;
