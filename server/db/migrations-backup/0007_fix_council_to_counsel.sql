-- Migration: Fix "council" to "counsel" grammar
-- Updates all instances of "council" to the correct legal term "counsel"
-- Date: 2026-01-02

-- ===================================
-- 1. RENAME COLUMNS
-- ===================================

-- Update journey_step_progress table
ALTER TABLE journey_step_progress RENAME COLUMN council_approved TO counsel_approved;
ALTER TABLE journey_step_progress RENAME COLUMN council_approved_at TO counsel_approved_at;

-- Update snapshot_versions table
ALTER TABLE snapshot_versions RENAME COLUMN approved_by_council TO approved_by_counsel;
ALTER TABLE snapshot_versions RENAME COLUMN council_notes TO counsel_notes;

-- ===================================
-- 2. UPDATE ENUM VALUES IN DATA
-- ===================================

-- Update journey_steps: responsible_party 'COUNCIL' -> 'COUNSEL'
UPDATE journey_steps SET responsible_party = 'COUNSEL' WHERE responsible_party = 'COUNCIL';

-- Update journey_step_progress: status 'WAITING_COUNCIL' -> 'WAITING_COUNSEL'
UPDATE journey_step_progress SET status = 'WAITING_COUNSEL' WHERE status = 'WAITING_COUNCIL';

-- Update action_items: assigned_to 'COUNCIL' -> 'COUNSEL'
UPDATE action_items SET assigned_to = 'COUNSEL' WHERE assigned_to = 'COUNCIL';
