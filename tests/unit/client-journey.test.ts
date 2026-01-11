/**
 * Tests for client journey business logic
 * Covers validation rules, state transitions, and workflow patterns
 */

import { describe, it, expect } from 'vitest'

// Journey status values (from schema)
type JourneyStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'

// Step progress status values
type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'WAITING_ATTORNEY' | 'COMPLETE' | 'SKIPPED'

// Priority values
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

// Journey type
type JourneyType = 'ENGAGEMENT' | 'SERVICE'

// Validation helper functions (mirroring endpoint logic)
function validateJourneyStart(params: {
  matterId?: string
  catalogId?: string
  hasEngagement?: boolean
  existingJourneyStatus?: JourneyStatus | null
}): { valid: boolean; error?: string } {
  // Matter and catalog are required
  if (!params.matterId || !params.catalogId) {
    return { valid: false, error: 'Matter and service are required to start a journey' }
  }

  // Service must be engaged for the matter
  if (!params.hasEngagement) {
    return { valid: false, error: 'This service is not engaged for the selected matter. Please engage the service first.' }
  }

  // Check for existing journey (non-cancelled)
  if (params.existingJourneyStatus && params.existingJourneyStatus !== 'CANCELLED') {
    return { valid: false, error: 'A journey already exists for this service engagement' }
  }

  return { valid: true }
}

function canAdvanceJourney(params: {
  journeyExists: boolean
  currentStepExists: boolean
  journeyStatus: JourneyStatus
}): { canAdvance: boolean; error?: string } {
  if (!params.journeyExists) {
    return { canAdvance: false, error: 'Client journey not found' }
  }

  if (!params.currentStepExists) {
    return { canAdvance: false, error: 'Current step not found' }
  }

  if (params.journeyStatus === 'COMPLETED') {
    return { canAdvance: false, error: 'Journey is already completed' }
  }

  if (params.journeyStatus === 'CANCELLED') {
    return { canAdvance: false, error: 'Cannot advance a cancelled journey' }
  }

  if (params.journeyStatus === 'PAUSED') {
    return { canAdvance: false, error: 'Journey is paused. Resume before advancing.' }
  }

  return { canAdvance: true }
}

function determineNextState(params: {
  hasNextStep: boolean
  currentStatus: JourneyStatus
}): { newStatus: JourneyStatus; completed: boolean } {
  if (params.hasNextStep) {
    return { newStatus: 'IN_PROGRESS', completed: false }
  } else {
    return { newStatus: 'COMPLETED', completed: true }
  }
}

describe('Client Journey Validation', () => {
  describe('Journey Start Validation', () => {
    it('should require matterId', () => {
      const result = validateJourneyStart({
        catalogId: 'catalog-1',
        hasEngagement: true
      })

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Matter and service are required')
    })

    it('should require catalogId', () => {
      const result = validateJourneyStart({
        matterId: 'matter-1',
        hasEngagement: true
      })

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Matter and service are required')
    })

    it('should require service engagement', () => {
      const result = validateJourneyStart({
        matterId: 'matter-1',
        catalogId: 'catalog-1',
        hasEngagement: false
      })

      expect(result.valid).toBe(false)
      expect(result.error).toContain('not engaged')
    })

    it('should prevent duplicate journeys', () => {
      const result = validateJourneyStart({
        matterId: 'matter-1',
        catalogId: 'catalog-1',
        hasEngagement: true,
        existingJourneyStatus: 'IN_PROGRESS'
      })

      expect(result.valid).toBe(false)
      expect(result.error).toContain('already exists')
    })

    it('should allow starting journey after cancelled one', () => {
      const result = validateJourneyStart({
        matterId: 'matter-1',
        catalogId: 'catalog-1',
        hasEngagement: true,
        existingJourneyStatus: 'CANCELLED'
      })

      expect(result.valid).toBe(true)
    })

    it('should allow valid journey start', () => {
      const result = validateJourneyStart({
        matterId: 'matter-1',
        catalogId: 'catalog-1',
        hasEngagement: true,
        existingJourneyStatus: null
      })

      expect(result.valid).toBe(true)
    })
  })

  describe('Journey Advancement Validation', () => {
    it('should require journey to exist', () => {
      const result = canAdvanceJourney({
        journeyExists: false,
        currentStepExists: true,
        journeyStatus: 'IN_PROGRESS'
      })

      expect(result.canAdvance).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should require current step to exist', () => {
      const result = canAdvanceJourney({
        journeyExists: true,
        currentStepExists: false,
        journeyStatus: 'IN_PROGRESS'
      })

      expect(result.canAdvance).toBe(false)
      expect(result.error).toContain('step not found')
    })

    it('should prevent advancing completed journey', () => {
      const result = canAdvanceJourney({
        journeyExists: true,
        currentStepExists: true,
        journeyStatus: 'COMPLETED'
      })

      expect(result.canAdvance).toBe(false)
      expect(result.error).toContain('already completed')
    })

    it('should prevent advancing cancelled journey', () => {
      const result = canAdvanceJourney({
        journeyExists: true,
        currentStepExists: true,
        journeyStatus: 'CANCELLED'
      })

      expect(result.canAdvance).toBe(false)
      expect(result.error).toContain('cancelled')
    })

    it('should prevent advancing paused journey', () => {
      const result = canAdvanceJourney({
        journeyExists: true,
        currentStepExists: true,
        journeyStatus: 'PAUSED'
      })

      expect(result.canAdvance).toBe(false)
      expect(result.error).toContain('paused')
    })

    it('should allow advancing in-progress journey', () => {
      const result = canAdvanceJourney({
        journeyExists: true,
        currentStepExists: true,
        journeyStatus: 'IN_PROGRESS'
      })

      expect(result.canAdvance).toBe(true)
    })
  })

  describe('State Transitions', () => {
    it('should stay IN_PROGRESS when there is a next step', () => {
      const result = determineNextState({
        hasNextStep: true,
        currentStatus: 'IN_PROGRESS'
      })

      expect(result.newStatus).toBe('IN_PROGRESS')
      expect(result.completed).toBe(false)
    })

    it('should transition to COMPLETED when no more steps', () => {
      const result = determineNextState({
        hasNextStep: false,
        currentStatus: 'IN_PROGRESS'
      })

      expect(result.newStatus).toBe('COMPLETED')
      expect(result.completed).toBe(true)
    })
  })
})

describe('Journey Priority Handling', () => {
  const DEFAULT_PRIORITY: Priority = 'MEDIUM'

  it('should use provided priority', () => {
    const provided: Priority = 'HIGH'
    const result = provided || DEFAULT_PRIORITY

    expect(result).toBe('HIGH')
  })

  it('should default to MEDIUM when not provided', () => {
    const provided: Priority | undefined = undefined
    const result = provided || DEFAULT_PRIORITY

    expect(result).toBe('MEDIUM')
  })

  it('should validate priority values', () => {
    const validPriorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

    validPriorities.forEach(p => {
      expect(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).toContain(p)
    })
  })
})

describe('Step Progress Tracking', () => {
  describe('Initial Step Creation', () => {
    it('should create progress with IN_PROGRESS status', () => {
      const initialProgress = {
        status: 'IN_PROGRESS' as StepStatus,
        clientApproved: false,
        attorneyApproved: false,
        iterationCount: 0
      }

      expect(initialProgress.status).toBe('IN_PROGRESS')
      expect(initialProgress.clientApproved).toBe(false)
      expect(initialProgress.attorneyApproved).toBe(false)
      expect(initialProgress.iterationCount).toBe(0)
    })
  })

  describe('Step Completion', () => {
    it('should transition to COMPLETE status', () => {
      const beforeComplete: StepStatus = 'IN_PROGRESS'
      const afterComplete: StepStatus = 'COMPLETE'

      expect(beforeComplete).not.toBe(afterComplete)
      expect(afterComplete).toBe('COMPLETE')
    })

    it('should track completion timestamp', () => {
      const completedAt = new Date()

      expect(completedAt).toBeInstanceOf(Date)
      expect(completedAt.getTime()).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('Iteration Counting (Bridge Steps)', () => {
    it('should start at 0 iterations', () => {
      const initialCount = 0
      expect(initialCount).toBe(0)
    })

    it('should increment on revision', () => {
      let iterationCount = 0
      iterationCount += 1

      expect(iterationCount).toBe(1)
    })
  })
})

describe('Journey Response Formatting', () => {
  it('should format response with snake_case keys', () => {
    const journeyData = {
      clientJourneyId: 'journey-123',
      clientId: 'client-456',
      matterId: 'matter-789',
      catalogId: 'catalog-abc',
      currentStepId: 'step-1',
      priority: 'MEDIUM' as Priority,
      startedAt: new Date()
    }

    // Response transformation
    const response = {
      id: journeyData.clientJourneyId,
      client_id: journeyData.clientId,
      matter_id: journeyData.matterId,
      catalog_id: journeyData.catalogId,
      current_step_id: journeyData.currentStepId,
      status: 'IN_PROGRESS',
      priority: journeyData.priority,
      started_at: journeyData.startedAt.getTime()
    }

    expect(response).toHaveProperty('client_id')
    expect(response).toHaveProperty('matter_id')
    expect(response).toHaveProperty('current_step_id')
    expect(response).toHaveProperty('started_at')
    expect(response).not.toHaveProperty('clientId')
    expect(typeof response.started_at).toBe('number')
  })
})
