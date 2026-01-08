-- Migration: Enhance action items with new types and system integration
-- Also enhance journey steps with final step verification

-- ============================================================================
-- PART 1: Enhance action_items table
-- ============================================================================

-- Add new columns for system integration tracking
ALTER TABLE action_items ADD COLUMN system_integration_type TEXT CHECK(system_integration_type IN ('calendar', 'payment', 'document', 'manual'));
ALTER TABLE action_items ADD COLUMN resource_id TEXT; -- ID of calendar event, payment, document, etc.
ALTER TABLE action_items ADD COLUMN automation_handler TEXT; -- For AUTOMATION action types

-- Add columns for "ring the bell" service delivery verification
ALTER TABLE action_items ADD COLUMN is_service_delivery_verification INTEGER DEFAULT 0 CHECK(is_service_delivery_verification IN (0, 1));
ALTER TABLE action_items ADD COLUMN verification_criteria TEXT; -- JSON: objective completion criteria
ALTER TABLE action_items ADD COLUMN verification_evidence TEXT; -- JSON: proof of completion

-- Note: SQLite doesn't support ALTER COLUMN for enum changes
-- Instead, we'll handle new action types in the application layer
-- New types to support: AUTOMATION, THIRD_PARTY, OFFLINE_TASK, EXPENSE, FORM
-- Existing types: QUESTIONNAIRE, DECISION, UPLOAD, REVIEW, ESIGN, NOTARY, PAYMENT, MEETING, KYC

-- ============================================================================
-- PART 2: Enhance journey_steps table
-- ============================================================================

-- Add columns for final step tracking
ALTER TABLE journey_steps ADD COLUMN is_final_step INTEGER DEFAULT 0 CHECK(is_final_step IN (0, 1));
ALTER TABLE journey_steps ADD COLUMN completion_requirements TEXT; -- JSON: requirements for step completion
ALTER TABLE journey_steps ADD COLUMN requires_verification INTEGER DEFAULT 0 CHECK(requires_verification IN (0, 1));

-- ============================================================================
-- PART 3: Create indexes for performance
-- ============================================================================

-- Index for finding action items by system integration
CREATE INDEX IF NOT EXISTS idx_action_items_system_integration ON action_items(system_integration_type, resource_id);

-- Index for finding service delivery verification items
CREATE INDEX IF NOT EXISTS idx_action_items_service_delivery ON action_items(is_service_delivery_verification) WHERE is_service_delivery_verification = 1;

-- Index for finding final steps
CREATE INDEX IF NOT EXISTS idx_journey_steps_final ON journey_steps(is_final_step) WHERE is_final_step = 1;

-- Index for action items by journey and status (for dashboard queries)
CREATE INDEX IF NOT EXISTS idx_action_items_journey_status ON action_items(client_journey_id, status);
