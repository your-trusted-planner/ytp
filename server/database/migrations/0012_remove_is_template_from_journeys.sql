-- Remove is_template column from journeys table
-- All journeys are templates by definition; active instances are in client_journeys

ALTER TABLE `journeys` DROP COLUMN `is_template`;
