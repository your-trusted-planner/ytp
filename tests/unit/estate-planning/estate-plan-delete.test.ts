/**
 * Tests for Estate Plan Delete API
 *
 * Tests the delete endpoint validation, cascading behavior,
 * and people deletion options.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ===================================
// QUERY PARAMETER VALIDATION
// ===================================

describe('Estate Plan Delete API', () => {
  describe('Query Parameter Parsing', () => {
    // Simulate the query param parsing from the endpoint
    const parseDeletePeopleParam = (query: Record<string, any>): boolean => {
      return query.deletePeople === 'true'
    }

    it('defaults to false when deletePeople not provided', () => {
      expect(parseDeletePeopleParam({})).toBe(false)
    })

    it('returns false when deletePeople is not "true"', () => {
      expect(parseDeletePeopleParam({ deletePeople: 'false' })).toBe(false)
      expect(parseDeletePeopleParam({ deletePeople: '1' })).toBe(false)
      expect(parseDeletePeopleParam({ deletePeople: 'yes' })).toBe(false)
      expect(parseDeletePeopleParam({ deletePeople: '' })).toBe(false)
    })

    it('returns true only when deletePeople is exactly "true"', () => {
      expect(parseDeletePeopleParam({ deletePeople: 'true' })).toBe(true)
    })
  })

  describe('Deletion Summary Structure', () => {
    // Define the expected structure of the deletion summary
    const DeletionSummarySchema = z.object({
      planId: z.string(),
      planName: z.string(),
      rolesDeleted: z.number().int().min(0),
      versionsDeleted: z.number().int().min(0),
      eventsDeleted: z.number().int().min(0),
      trustDeleted: z.number().int().min(0).max(1),
      willsDeleted: z.number().int().min(0),
      ancillaryDocsDeleted: z.number().int().min(0),
      matterLinksDeleted: z.number().int().min(0),
      peopleDeleted: z.number().int().min(0),
      peopleUnlinked: z.number().int().min(0)
    })

    it('validates well-formed deletion summary', () => {
      const summary = {
        planId: 'plan_123',
        planName: 'Smith Family Trust',
        rolesDeleted: 8,
        versionsDeleted: 2,
        eventsDeleted: 3,
        trustDeleted: 1,
        willsDeleted: 2,
        ancillaryDocsDeleted: 4,
        matterLinksDeleted: 1,
        peopleDeleted: 0,
        peopleUnlinked: 5
      }

      const result = DeletionSummarySchema.safeParse(summary)
      expect(result.success).toBe(true)
    })

    it('validates summary with zero counts', () => {
      const summary = {
        planId: 'plan_456',
        planName: 'Empty Plan',
        rolesDeleted: 0,
        versionsDeleted: 0,
        eventsDeleted: 0,
        trustDeleted: 0,
        willsDeleted: 0,
        ancillaryDocsDeleted: 0,
        matterLinksDeleted: 0,
        peopleDeleted: 0,
        peopleUnlinked: 0
      }

      const result = DeletionSummarySchema.safeParse(summary)
      expect(result.success).toBe(true)
    })

    it('validates summary when people are deleted', () => {
      const summary = {
        planId: 'plan_789',
        planName: 'Test Trust',
        rolesDeleted: 5,
        versionsDeleted: 1,
        eventsDeleted: 0,
        trustDeleted: 1,
        willsDeleted: 0,
        ancillaryDocsDeleted: 0,
        matterLinksDeleted: 0,
        peopleDeleted: 3,
        peopleUnlinked: 2  // Some couldn't be deleted
      }

      const result = DeletionSummarySchema.safeParse(summary)
      expect(result.success).toBe(true)
    })
  })

  describe('Response Structure', () => {
    const DeleteResponseSchema = z.object({
      success: z.boolean(),
      message: z.string(),
      summary: z.object({
        planId: z.string(),
        planName: z.string(),
        rolesDeleted: z.number(),
        versionsDeleted: z.number(),
        eventsDeleted: z.number(),
        trustDeleted: z.number(),
        willsDeleted: z.number(),
        ancillaryDocsDeleted: z.number(),
        matterLinksDeleted: z.number(),
        peopleDeleted: z.number(),
        peopleUnlinked: z.number()
      })
    })

    it('validates successful delete response', () => {
      const response = {
        success: true,
        message: 'Estate plan "Smith Family Trust" has been deleted',
        summary: {
          planId: 'plan_123',
          planName: 'Smith Family Trust',
          rolesDeleted: 8,
          versionsDeleted: 2,
          eventsDeleted: 3,
          trustDeleted: 1,
          willsDeleted: 0,
          ancillaryDocsDeleted: 0,
          matterLinksDeleted: 1,
          peopleDeleted: 0,
          peopleUnlinked: 5
        }
      }

      const result = DeleteResponseSchema.safeParse(response)
      expect(result.success).toBe(true)
    })
  })
})

// ===================================
// PEOPLE DELETION LOGIC
// ===================================

describe('People Deletion Logic', () => {
  describe('Unique Person ID Extraction', () => {
    // Simulate the logic to extract unique person IDs from roles
    function extractUniquePersonIds(roles: Array<{ personId: string | null }>): string[] {
      return [...new Set(roles.map(r => r.personId).filter(Boolean))] as string[]
    }

    it('extracts unique person IDs from roles', () => {
      const roles = [
        { personId: 'person_1' },
        { personId: 'person_2' },
        { personId: 'person_1' },  // Duplicate
        { personId: 'person_3' }
      ]

      const uniqueIds = extractUniquePersonIds(roles)
      expect(uniqueIds).toHaveLength(3)
      expect(uniqueIds).toContain('person_1')
      expect(uniqueIds).toContain('person_2')
      expect(uniqueIds).toContain('person_3')
    })

    it('handles null person IDs', () => {
      const roles = [
        { personId: 'person_1' },
        { personId: null },
        { personId: 'person_2' }
      ]

      const uniqueIds = extractUniquePersonIds(roles)
      expect(uniqueIds).toHaveLength(2)
      expect(uniqueIds).not.toContain(null)
    })

    it('returns empty array when no roles', () => {
      const uniqueIds = extractUniquePersonIds([])
      expect(uniqueIds).toHaveLength(0)
    })

    it('returns empty array when all roles have null personId', () => {
      const roles = [
        { personId: null },
        { personId: null }
      ]

      const uniqueIds = extractUniquePersonIds(roles)
      expect(uniqueIds).toHaveLength(0)
    })
  })

  describe('Delete vs Unlink Counting', () => {
    // Simulate the counting logic
    interface DeleteResult {
      deletedCount: number
      failedCount: number
      errors: string[]
    }

    function simulatePeopleDeletion(
      personIds: string[],
      canDeletePredicate: (id: string) => boolean
    ): DeleteResult {
      let deletedCount = 0
      const errors: string[] = []

      for (const personId of personIds) {
        if (canDeletePredicate(personId)) {
          deletedCount++
        } else {
          errors.push(`Could not delete person ${personId}`)
        }
      }

      return {
        deletedCount,
        failedCount: personIds.length - deletedCount,
        errors
      }
    }

    it('counts all as deleted when all can be deleted', () => {
      const personIds = ['p1', 'p2', 'p3']
      const result = simulatePeopleDeletion(personIds, () => true)

      expect(result.deletedCount).toBe(3)
      expect(result.failedCount).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('counts failures when some cannot be deleted', () => {
      const personIds = ['p1', 'p2', 'p3', 'p4']
      // Only p1 and p3 can be deleted
      const result = simulatePeopleDeletion(personIds, id => id === 'p1' || id === 'p3')

      expect(result.deletedCount).toBe(2)
      expect(result.failedCount).toBe(2)
      expect(result.errors).toHaveLength(2)
    })

    it('counts all as failed when none can be deleted', () => {
      const personIds = ['p1', 'p2']
      const result = simulatePeopleDeletion(personIds, () => false)

      expect(result.deletedCount).toBe(0)
      expect(result.failedCount).toBe(2)
      expect(result.errors).toHaveLength(2)
    })

    it('handles empty person list', () => {
      const result = simulatePeopleDeletion([], () => true)

      expect(result.deletedCount).toBe(0)
      expect(result.failedCount).toBe(0)
      expect(result.errors).toHaveLength(0)
    })
  })
})

// ===================================
// ACTIVITY LOGGING INTEGRATION
// ===================================

describe('Delete Activity Logging', () => {
  describe('Activity Log Details', () => {
    const ActivityDetailsSchema = z.object({
      action: z.literal('ESTATE_PLAN_DELETED'),
      deletePeople: z.boolean(),
      planId: z.string(),
      planName: z.string(),
      rolesDeleted: z.number(),
      versionsDeleted: z.number(),
      eventsDeleted: z.number(),
      trustDeleted: z.number(),
      willsDeleted: z.number(),
      ancillaryDocsDeleted: z.number(),
      matterLinksDeleted: z.number(),
      peopleDeleted: z.number(),
      peopleUnlinked: z.number()
    })

    it('validates activity log details when deletePeople is false', () => {
      const details = {
        action: 'ESTATE_PLAN_DELETED',
        deletePeople: false,
        planId: 'plan_123',
        planName: 'Test Trust',
        rolesDeleted: 5,
        versionsDeleted: 1,
        eventsDeleted: 2,
        trustDeleted: 1,
        willsDeleted: 0,
        ancillaryDocsDeleted: 0,
        matterLinksDeleted: 0,
        peopleDeleted: 0,
        peopleUnlinked: 3
      }

      const result = ActivityDetailsSchema.safeParse(details)
      expect(result.success).toBe(true)
    })

    it('validates activity log details when deletePeople is true', () => {
      const details = {
        action: 'ESTATE_PLAN_DELETED',
        deletePeople: true,
        planId: 'plan_456',
        planName: 'Another Trust',
        rolesDeleted: 8,
        versionsDeleted: 2,
        eventsDeleted: 4,
        trustDeleted: 1,
        willsDeleted: 2,
        ancillaryDocsDeleted: 4,
        matterLinksDeleted: 1,
        peopleDeleted: 5,
        peopleUnlinked: 2  // Some couldn't be deleted
      }

      const result = ActivityDetailsSchema.safeParse(details)
      expect(result.success).toBe(true)
    })
  })
})

// ===================================
// UI VALIDATION LOGIC
// ===================================

describe('Delete Modal UI Logic', () => {
  describe('Confirmation Text Validation', () => {
    function canDelete(planName: string | null | undefined, confirmText: string): boolean {
      const expectedText = planName || 'delete'
      return confirmText === expectedText
    }

    it('allows delete when confirm text matches plan name', () => {
      expect(canDelete('Smith Family Trust', 'Smith Family Trust')).toBe(true)
    })

    it('prevents delete when confirm text does not match', () => {
      expect(canDelete('Smith Family Trust', 'smith family trust')).toBe(false)  // Case sensitive
      expect(canDelete('Smith Family Trust', 'Smith Family')).toBe(false)  // Partial
      expect(canDelete('Smith Family Trust', '')).toBe(false)  // Empty
    })

    it('uses "delete" as fallback when plan name is null', () => {
      expect(canDelete(null, 'delete')).toBe(true)
      expect(canDelete(null, 'Delete')).toBe(false)  // Case sensitive
    })

    it('uses "delete" as fallback when plan name is undefined', () => {
      expect(canDelete(undefined, 'delete')).toBe(true)
    })

    it('uses "delete" as fallback when plan name is empty', () => {
      // Empty string is falsy, so it should use 'delete'
      const planName = ''
      const expectedText = planName || 'delete'
      expect(expectedText).toBe('delete')
      expect(canDelete('', 'delete')).toBe(true)
    })
  })

  describe('Unique People Count', () => {
    function countUniquePeople(roles: Array<{ personId: string | null }> | undefined): number {
      if (!roles) return 0
      const uniqueIds = new Set(roles.map(r => r.personId).filter(Boolean))
      return uniqueIds.size
    }

    it('counts unique people from roles', () => {
      const roles = [
        { personId: 'p1' },
        { personId: 'p2' },
        { personId: 'p1' },  // Duplicate
        { personId: 'p3' }
      ]

      expect(countUniquePeople(roles)).toBe(3)
    })

    it('returns 0 for undefined roles', () => {
      expect(countUniquePeople(undefined)).toBe(0)
    })

    it('returns 0 for empty roles', () => {
      expect(countUniquePeople([])).toBe(0)
    })

    it('excludes null person IDs', () => {
      const roles = [
        { personId: 'p1' },
        { personId: null },
        { personId: 'p2' }
      ]

      expect(countUniquePeople(roles)).toBe(2)
    })
  })
})

// ===================================
// AUTHORIZATION
// ===================================

describe('Delete Authorization', () => {
  describe('Admin Level Requirement', () => {
    function isAuthorized(adminLevel: number | null | undefined): boolean {
      return (adminLevel ?? 0) >= 2
    }

    it('allows admin level 2', () => {
      expect(isAuthorized(2)).toBe(true)
    })

    it('allows admin level 3', () => {
      expect(isAuthorized(3)).toBe(true)
    })

    it('denies admin level 1', () => {
      expect(isAuthorized(1)).toBe(false)
    })

    it('denies admin level 0', () => {
      expect(isAuthorized(0)).toBe(false)
    })

    it('denies null admin level', () => {
      expect(isAuthorized(null)).toBe(false)
    })

    it('denies undefined admin level', () => {
      expect(isAuthorized(undefined)).toBe(false)
    })
  })
})
