-- Update existing datetime string timestamps to Unix timestamp integers
-- This converts any string-formatted timestamps to proper integer timestamps

-- Update users table
UPDATE users
SET
  created_at = unixepoch(created_at),
  updated_at = unixepoch(updated_at)
WHERE typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- Update client_profiles table
UPDATE client_profiles
SET
  created_at = unixepoch(created_at),
  updated_at = unixepoch(updated_at)
WHERE typeof(created_at) = 'text' OR typeof(updated_at) = 'text';

-- Update last_updated if it's a string
UPDATE client_profiles
SET last_updated = unixepoch(last_updated)
WHERE typeof(last_updated) = 'text' AND last_updated IS NOT NULL;

-- Update date_of_birth if it's a string
UPDATE client_profiles
SET date_of_birth = unixepoch(date_of_birth)
WHERE typeof(date_of_birth) = 'text' AND date_of_birth IS NOT NULL;
