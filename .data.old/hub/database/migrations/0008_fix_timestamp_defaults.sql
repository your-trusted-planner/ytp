-- Fix timestamp defaults from CURRENT_TIMESTAMP to unixepoch()
-- SQLite's CURRENT_TIMESTAMP returns a string, not an integer timestamp
-- This migration recreates tables with correct default values

-- Step 1: Create temporary tables with correct defaults
CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'PROSPECT' CHECK(role IN ('ADMIN', 'LAWYER', 'CLIENT', 'LEAD', 'PROSPECT')),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar TEXT,
  status TEXT NOT NULL DEFAULT 'PROSPECT' CHECK(status IN ('PROSPECT', 'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Step 2: Copy existing data, converting string timestamps to integers where needed
INSERT INTO users_new
SELECT
  id,
  email,
  password,
  role,
  first_name,
  last_name,
  phone,
  avatar,
  status,
  CASE
    WHEN typeof(created_at) = 'text' THEN unixepoch(created_at)
    WHEN created_at IS NULL THEN unixepoch()
    ELSE created_at
  END,
  CASE
    WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at)
    WHEN updated_at IS NULL THEN unixepoch()
    ELSE updated_at
  END
FROM users;

-- Step 3: Drop old table and rename new one
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- Repeat for client_profiles table
CREATE TABLE client_profiles_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth INTEGER,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  spouse_name TEXT,
  spouse_email TEXT,
  spouse_phone TEXT,
  has_minor_children INTEGER NOT NULL DEFAULT 0,
  children_info TEXT,
  business_name TEXT,
  business_type TEXT,
  has_will INTEGER NOT NULL DEFAULT 0,
  has_trust INTEGER NOT NULL DEFAULT 0,
  grantor_type TEXT NOT NULL DEFAULT 'SINGLE' CHECK(grantor_type IN ('SINGLE', 'ADDITIONAL')),
  last_updated INTEGER,
  assigned_lawyer_id TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO client_profiles_new
SELECT
  id,
  user_id,
  date_of_birth,
  address,
  city,
  state,
  zip_code,
  spouse_name,
  spouse_email,
  spouse_phone,
  has_minor_children,
  children_info,
  business_name,
  business_type,
  has_will,
  has_trust,
  grantor_type,
  last_updated,
  assigned_lawyer_id,
  CASE
    WHEN typeof(created_at) = 'text' THEN unixepoch(created_at)
    WHEN created_at IS NULL THEN unixepoch()
    ELSE created_at
  END,
  CASE
    WHEN typeof(updated_at) = 'text' THEN unixepoch(updated_at)
    WHEN updated_at IS NULL THEN unixepoch()
    ELSE updated_at
  END
FROM client_profiles;

DROP TABLE client_profiles;
ALTER TABLE client_profiles_new RENAME TO client_profiles;

-- Note: We should do this for all tables with timestamp fields, but starting with these two
-- since they're the immediate issue in the clients API
