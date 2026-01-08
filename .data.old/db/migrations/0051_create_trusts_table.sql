-- Migration: Create trusts table
-- Stores trust-specific information linked to matters

CREATE TABLE IF NOT EXISTS trusts (
  id TEXT PRIMARY KEY,

  -- Link to matter
  matter_id TEXT NOT NULL REFERENCES matters(id) ON DELETE CASCADE,

  -- Trust Details
  trust_name TEXT NOT NULL,
  trust_date INTEGER,  -- epoch timestamp - date trust was established
  trust_type TEXT,  -- REVOCABLE, IRREVOCABLE, CHARITABLE, SPECIAL_NEEDS, TESTAMENTARY

  -- Legal Details
  state_of_formation TEXT,  -- State where trust was established
  trust_ein TEXT,  -- Employer Identification Number (for irrevocable trusts)

  -- Funding
  funding_date INTEGER,  -- epoch timestamp - date trust was funded
  funding_status TEXT,  -- UNFUNDED, PARTIALLY_FUNDED, FULLY_FUNDED

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  -- One trust per matter (though we could relax this later if needed)
  UNIQUE(matter_id)
);

CREATE INDEX idx_trusts_matter_id ON trusts(matter_id);
CREATE INDEX idx_trusts_trust_type ON trusts(trust_type);

-- ============================================
-- Notes on trust types:
-- ============================================

-- TRUST TYPES:
--   REVOCABLE - Can be modified or revoked by grantor
--   IRREVOCABLE - Cannot be modified once established
--   CHARITABLE - For charitable purposes
--   SPECIAL_NEEDS - For beneficiary with disabilities
--   TESTAMENTARY - Created through a will
--   ASSET_PROTECTION - For asset protection purposes
--   GENERATION_SKIPPING - Skips a generation for tax purposes
--   QUALIFIED_PERSONAL_RESIDENCE - For primary residence
--   GRANTOR_RETAINED_ANNUITY - GRAT
--   INTENTIONALLY_DEFECTIVE_GRANTOR - IDGT

-- Trust participants (grantors, trustees, beneficiaries) are stored in matter_relationships table
