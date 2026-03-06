/**
 * Record Matcher Configuration
 *
 * Default weights, thresholds, and anti-signal penalties.
 */

import type { MatchConfig } from './types'

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  weights: {
    email: 0.25,
    lastName: 0.25,
    firstName: 0.20,
    phone: 0.15,
    dateOfBirth: 0.10,
    address: 0.05
  },
  thresholds: {
    high: 0.85,     // Auto-link candidate
    medium: 0.60    // Human review queue
  },
  antiSignalPenalties: {
    shared_email_different_name: 0.40,
    known_spouse: 1.0,       // Definitive non-match
    different_dob: 0.30,
    different_ssn: 1.0       // Definitive non-match
  }
}
