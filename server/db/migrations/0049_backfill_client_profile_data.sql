-- Data migration: backfill clientProfiles -> clients (Drive folder fields)
-- and clientProfiles -> people (address/city/state/zipCode/dateOfBirth)
-- so existing rows match the post-migration-#2 read paths.

PRAGMA foreign_keys=OFF;--> statement-breakpoint

-- Backfill Drive fields onto clients where the client row has no Drive folder
-- but the legacy client_profiles row for one of its users does.
UPDATE clients SET
  google_drive_folder_id = COALESCE(clients.google_drive_folder_id, (
    SELECT cp.google_drive_folder_id FROM client_profiles cp
    INNER JOIN users u ON u.id = cp.user_id
    WHERE u.person_id = clients.person_id
      AND cp.google_drive_folder_id IS NOT NULL
    LIMIT 1
  )),
  google_drive_folder_url = COALESCE(clients.google_drive_folder_url, (
    SELECT cp.google_drive_folder_url FROM client_profiles cp
    INNER JOIN users u ON u.id = cp.user_id
    WHERE u.person_id = clients.person_id
      AND cp.google_drive_folder_url IS NOT NULL
    LIMIT 1
  )),
  google_drive_sync_status = COALESCE(clients.google_drive_sync_status, (
    SELECT cp.google_drive_sync_status FROM client_profiles cp
    INNER JOIN users u ON u.id = cp.user_id
    WHERE u.person_id = clients.person_id
      AND cp.google_drive_sync_status IS NOT NULL
    LIMIT 1
  )),
  google_drive_sync_error = COALESCE(clients.google_drive_sync_error, (
    SELECT cp.google_drive_sync_error FROM client_profiles cp
    INNER JOIN users u ON u.id = cp.user_id
    WHERE u.person_id = clients.person_id
      AND cp.google_drive_sync_error IS NOT NULL
    LIMIT 1
  )),
  google_drive_last_sync_at = COALESCE(clients.google_drive_last_sync_at, (
    SELECT cp.google_drive_last_sync_at FROM client_profiles cp
    INNER JOIN users u ON u.id = cp.user_id
    WHERE u.person_id = clients.person_id
      AND cp.google_drive_last_sync_at IS NOT NULL
    LIMIT 1
  ));--> statement-breakpoint

-- Backfill address/city/state/zip_code/date_of_birth onto people where the
-- person row is empty but the legacy client_profiles row has them.
UPDATE people SET
  address = COALESCE(people.address, (
    SELECT cp.address FROM client_profiles cp
    INNER JOIN users u ON u.id = cp.user_id
    WHERE u.person_id = people.id AND cp.address IS NOT NULL
    LIMIT 1
  )),
  city = COALESCE(people.city, (
    SELECT cp.city FROM client_profiles cp
    INNER JOIN users u ON u.id = cp.user_id
    WHERE u.person_id = people.id AND cp.city IS NOT NULL
    LIMIT 1
  )),
  state = COALESCE(people.state, (
    SELECT cp.state FROM client_profiles cp
    INNER JOIN users u ON u.id = cp.user_id
    WHERE u.person_id = people.id AND cp.state IS NOT NULL
    LIMIT 1
  )),
  zip_code = COALESCE(people.zip_code, (
    SELECT cp.zip_code FROM client_profiles cp
    INNER JOIN users u ON u.id = cp.user_id
    WHERE u.person_id = people.id AND cp.zip_code IS NOT NULL
    LIMIT 1
  )),
  date_of_birth = COALESCE(people.date_of_birth, (
    SELECT cp.date_of_birth FROM client_profiles cp
    INNER JOIN users u ON u.id = cp.user_id
    WHERE u.person_id = people.id AND cp.date_of_birth IS NOT NULL
    LIMIT 1
  ));--> statement-breakpoint

PRAGMA foreign_keys=ON;
