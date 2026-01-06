-- Migration: Add middle_names column to people table
-- Stores multiple middle names as JSON array

ALTER TABLE people ADD COLUMN middle_names TEXT;

-- Note: middle_names will be stored as JSON array: ["Marie", "Louise"]
-- When displayed, they will be joined with spaces: "Marie Louise"
-- When computing full_name: firstName + middle names + lastName
