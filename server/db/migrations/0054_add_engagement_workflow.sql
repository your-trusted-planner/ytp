-- Migration: Add Engagement Workflow Support
-- Created: 2026-01-06
-- Purpose: Add journey_type to support engagement vs service journeys, track lead attorney and engagement journey on matters

-- Add journey_type to journeys table (ENGAGEMENT vs SERVICE)
ALTER TABLE journeys ADD COLUMN journey_type TEXT DEFAULT 'SERVICE' CHECK(journey_type IN ('ENGAGEMENT', 'SERVICE'));

-- Add lead_attorney_id to matters table for engagement letter mapping
ALTER TABLE matters ADD COLUMN lead_attorney_id TEXT REFERENCES users(id);

-- Add engagement_journey_id to matters table to track the engagement journey instance
ALTER TABLE matters ADD COLUMN engagement_journey_id TEXT REFERENCES client_journeys(id);

-- Create index for common queries
CREATE INDEX idx_journeys_type ON journeys(journey_type);
CREATE INDEX idx_matters_engagement_journey ON matters(engagement_journey_id);
CREATE INDEX idx_matters_lead_attorney ON matters(lead_attorney_id);

-- Note: Existing journeys default to 'SERVICE' type
-- Engagement journeys will be created with 'ENGAGEMENT' type
-- Engagement journeys should only contain action types:
--   DRAFT_DOCUMENT, ESIGN, PAYMENT, MEETING, REVIEW, UPLOAD, DECISION
-- This validation will be enforced at the application layer
