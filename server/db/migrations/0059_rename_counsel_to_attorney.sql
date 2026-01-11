-- Migration: Rename counsel_approved to attorney_approved in journey_step_progress
-- The schema expects attorney_approved but the database has counsel_approved
-- Date: 2026-01-10

-- Rename columns in journey_step_progress
ALTER TABLE journey_step_progress RENAME COLUMN counsel_approved TO attorney_approved;
ALTER TABLE journey_step_progress RENAME COLUMN counsel_approved_at TO attorney_approved_at;
