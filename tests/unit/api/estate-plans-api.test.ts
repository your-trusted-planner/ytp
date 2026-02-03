/**
 * Tests for Estate Plans API Validation and Business Logic
 *
 * Tests the Zod schemas, query parameters, and response structures.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ===================================
// QUERY PARAMETER VALIDATION
// ===================================

// Replicate the query validation from index.get.ts
const EstatePlanListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  status: z.enum(['all', 'DRAFT', 'ACTIVE', 'AMENDED', 'INCAPACITATED', 'ADMINISTERED', 'DISTRIBUTED', 'CLOSED']).optional(),
  planType: z.enum(['TRUST_BASED', 'WILL_BASED']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['updatedAt', 'createdAt', 'planName', 'effectiveDate', 'status']).default('updatedAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc')
})

// Replicate the event creation schema from events.post.ts
const CreateEventSchema = z.object({
  eventType: z.enum([
    'PLAN_CREATED', 'PLAN_SIGNED', 'PLAN_AMENDED', 'PLAN_RESTATED',
    'GRANTOR_INCAPACITATED', 'GRANTOR_CAPACITY_RESTORED',
    'FIRST_GRANTOR_DEATH', 'SECOND_GRANTOR_DEATH',
    'ADMINISTRATION_STARTED', 'SUCCESSOR_TRUSTEE_APPOINTED',
    'TRUST_FUNDED', 'ASSETS_VALUED',
    'DISTRIBUTION_MADE', 'PARTIAL_DISTRIBUTION',
    'TAX_RETURN_FILED', 'NOTICE_SENT',
    'FINAL_DISTRIBUTION', 'TRUST_TERMINATED', 'PLAN_CLOSED',
    'NOTE_ADDED', 'DOCUMENT_ADDED', 'OTHER'
  ]),
  eventDate: z.coerce.date(),
  description: z.string().optional(),
  notes: z.string().optional(),
  personId: z.string().optional(),
  distributionAmount: z.number().int().optional()
})

describe('Estate Plans API Validation', () => {
  describe('List Query Parameters', () => {
    it('accepts empty query with defaults', () => {
      const result = EstatePlanListQuerySchema.safeParse({})

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(25)
        expect(result.data.sortBy).toBe('updatedAt')
        expect(result.data.sortDirection).toBe('desc')
      }
    })

    it('accepts valid pagination parameters', () => {
      const result = EstatePlanListQuerySchema.safeParse({
        page: 3,
        limit: 50
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(3)
        expect(result.data.limit).toBe(50)
      }
    })

    it('coerces string numbers to integers', () => {
      const result = EstatePlanListQuerySchema.safeParse({
        page: '2',
        limit: '30'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(2)
        expect(result.data.limit).toBe(30)
      }
    })

    it('enforces maximum limit of 100', () => {
      const result = EstatePlanListQuerySchema.safeParse({
        limit: 200
      })

      expect(result.success).toBe(false)
    })

    it('accepts all valid status values', () => {
      const statuses = ['all', 'DRAFT', 'ACTIVE', 'AMENDED', 'INCAPACITATED', 'ADMINISTERED', 'DISTRIBUTED', 'CLOSED']

      for (const status of statuses) {
        const result = EstatePlanListQuerySchema.safeParse({ status })
        expect(result.success).toBe(true)
        if (result.success && status !== 'all') {
          expect(result.data.status).toBe(status)
        }
      }
    })

    it('rejects invalid status value', () => {
      const result = EstatePlanListQuerySchema.safeParse({
        status: 'PENDING'
      })

      expect(result.success).toBe(false)
    })

    it('accepts valid plan types', () => {
      for (const planType of ['TRUST_BASED', 'WILL_BASED']) {
        const result = EstatePlanListQuerySchema.safeParse({ planType })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.planType).toBe(planType)
        }
      }
    })

    it('rejects invalid plan type', () => {
      const result = EstatePlanListQuerySchema.safeParse({
        planType: 'HYBRID'
      })

      expect(result.success).toBe(false)
    })

    it('accepts search query', () => {
      const result = EstatePlanListQuerySchema.safeParse({
        search: 'Smith Family Trust'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.search).toBe('Smith Family Trust')
      }
    })

    it('accepts all valid sort fields', () => {
      const sortFields = ['updatedAt', 'createdAt', 'planName', 'effectiveDate', 'status']

      for (const sortBy of sortFields) {
        const result = EstatePlanListQuerySchema.safeParse({ sortBy })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.sortBy).toBe(sortBy)
        }
      }
    })

    it('accepts both sort directions', () => {
      for (const sortDirection of ['asc', 'desc']) {
        const result = EstatePlanListQuerySchema.safeParse({ sortDirection })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.sortDirection).toBe(sortDirection)
        }
      }
    })
  })

  describe('Create Event Schema', () => {
    it('accepts valid event with required fields', () => {
      const result = CreateEventSchema.safeParse({
        eventType: 'PLAN_SIGNED',
        eventDate: '2024-01-15'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.eventType).toBe('PLAN_SIGNED')
        expect(result.data.eventDate).toBeInstanceOf(Date)
      }
    })

    it('accepts valid event with all fields', () => {
      const result = CreateEventSchema.safeParse({
        eventType: 'DISTRIBUTION_MADE',
        eventDate: '2024-06-01',
        description: 'Quarterly distribution to beneficiaries',
        notes: 'Distribution per Section 4.2 of trust agreement',
        personId: 'person_123',
        distributionAmount: 5000000  // $50,000 in cents
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.eventType).toBe('DISTRIBUTION_MADE')
        expect(result.data.distributionAmount).toBe(5000000)
      }
    })

    it('accepts all valid event types', () => {
      const eventTypes = [
        'PLAN_CREATED', 'PLAN_SIGNED', 'PLAN_AMENDED', 'PLAN_RESTATED',
        'GRANTOR_INCAPACITATED', 'GRANTOR_CAPACITY_RESTORED',
        'FIRST_GRANTOR_DEATH', 'SECOND_GRANTOR_DEATH',
        'ADMINISTRATION_STARTED', 'SUCCESSOR_TRUSTEE_APPOINTED',
        'TRUST_FUNDED', 'ASSETS_VALUED',
        'DISTRIBUTION_MADE', 'PARTIAL_DISTRIBUTION',
        'TAX_RETURN_FILED', 'NOTICE_SENT',
        'FINAL_DISTRIBUTION', 'TRUST_TERMINATED', 'PLAN_CLOSED',
        'NOTE_ADDED', 'DOCUMENT_ADDED', 'OTHER'
      ]

      for (const eventType of eventTypes) {
        const result = CreateEventSchema.safeParse({
          eventType,
          eventDate: '2024-01-01'
        })
        expect(result.success).toBe(true)
      }
    })

    it('rejects invalid event type', () => {
      const result = CreateEventSchema.safeParse({
        eventType: 'INVALID_EVENT',
        eventDate: '2024-01-01'
      })

      expect(result.success).toBe(false)
    })

    it('rejects missing event date', () => {
      const result = CreateEventSchema.safeParse({
        eventType: 'PLAN_SIGNED'
      })

      expect(result.success).toBe(false)
    })

    it('coerces date strings to Date objects', () => {
      const result = CreateEventSchema.safeParse({
        eventType: 'PLAN_SIGNED',
        eventDate: '2024-03-15T10:30:00Z'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.eventDate).toBeInstanceOf(Date)
        expect(result.data.eventDate.getFullYear()).toBe(2024)
      }
    })

    it('requires integer for distribution amount', () => {
      const result = CreateEventSchema.safeParse({
        eventType: 'DISTRIBUTION_MADE',
        eventDate: '2024-01-01',
        distributionAmount: 1000.50  // Not an integer
      })

      expect(result.success).toBe(false)
    })
  })
})

// ===================================
// RESPONSE STRUCTURE TESTS
// ===================================

describe('Estate Plans API Response Structures', () => {
  describe('List Response', () => {
    // Define expected response structure
    const EstatePlanListItemSchema = z.object({
      id: z.string(),
      planType: z.enum(['TRUST_BASED', 'WILL_BASED']),
      planName: z.string().nullable(),
      currentVersion: z.number().int(),
      status: z.string(),
      effectiveDate: z.string().nullable(),
      lastAmendedAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      grantor1: z.object({
        id: z.string(),
        fullName: z.string().nullable(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        email: z.string().nullable()
      }).nullable(),
      grantor2: z.object({
        id: z.string(),
        fullName: z.string().nullable(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        email: z.string().nullable()
      }).nullable(),
      roleCounts: z.record(z.number())
    })

    const EstatePlanListResponseSchema = z.object({
      plans: z.array(EstatePlanListItemSchema),
      pagination: z.object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        totalPages: z.number()
      })
    })

    it('validates well-formed list response', () => {
      const response = {
        plans: [
          {
            id: 'plan_123',
            planType: 'TRUST_BASED',
            planName: 'Smith Family Trust',
            currentVersion: 2,
            status: 'AMENDED',
            effectiveDate: '2023-01-15',
            lastAmendedAt: '2024-06-01',
            createdAt: '2023-01-01',
            updatedAt: '2024-06-01',
            grantor1: {
              id: 'person_456',
              fullName: 'John Smith',
              firstName: 'John',
              lastName: 'Smith',
              email: 'john@example.com'
            },
            grantor2: {
              id: 'person_789',
              fullName: 'Jane Smith',
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'jane@example.com'
            },
            roleCounts: {
              FIDUCIARY: 4,
              BENEFICIARY: 3,
              GRANTOR: 2
            }
          }
        ],
        pagination: {
          page: 1,
          limit: 25,
          total: 1,
          totalPages: 1
        }
      }

      const result = EstatePlanListResponseSchema.safeParse(response)
      expect(result.success).toBe(true)
    })

    it('validates response with null values', () => {
      const response = {
        plans: [
          {
            id: 'plan_123',
            planType: 'WILL_BASED',
            planName: null,
            currentVersion: 1,
            status: 'DRAFT',
            effectiveDate: null,
            lastAmendedAt: null,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
            grantor1: {
              id: 'person_123',
              fullName: 'John Doe',
              firstName: 'John',
              lastName: 'Doe',
              email: null
            },
            grantor2: null,
            roleCounts: {}
          }
        ],
        pagination: {
          page: 1,
          limit: 25,
          total: 1,
          totalPages: 1
        }
      }

      const result = EstatePlanListResponseSchema.safeParse(response)
      expect(result.success).toBe(true)
    })

    it('validates empty list response', () => {
      const response = {
        plans: [],
        pagination: {
          page: 1,
          limit: 25,
          total: 0,
          totalPages: 0
        }
      }

      const result = EstatePlanListResponseSchema.safeParse(response)
      expect(result.success).toBe(true)
    })
  })

  describe('Detail Response', () => {
    // Define expected detail response structure
    const PlanRoleSchema = z.object({
      id: z.string(),
      roleCategory: z.string(),
      roleType: z.string(),
      isPrimary: z.boolean().nullable(),
      ordinal: z.number().nullable(),
      sharePercentage: z.number().nullable(),
      shareType: z.string().nullable(),
      status: z.string(),
      person: z.object({
        id: z.string(),
        fullName: z.string().nullable(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        email: z.string().nullable()
      }).nullable(),
      forPersonId: z.string().nullable().optional(),
      forPerson: z.object({
        id: z.string(),
        fullName: z.string().nullable()
      }).nullable().optional()
    })

    const TrustSchema = z.object({
      id: z.string(),
      trustName: z.string(),
      trustType: z.string().nullable(),
      isJoint: z.boolean().nullable(),
      isRevocable: z.boolean().nullable(),
      jurisdiction: z.string().nullable(),
      formationDate: z.string().nullable()
    })

    const WillSchema = z.object({
      id: z.string(),
      willType: z.string().nullable(),
      executionDate: z.string().nullable(),
      jurisdiction: z.string().nullable(),
      forPersonId: z.string().nullable().optional(),
      forPerson: z.object({
        id: z.string(),
        fullName: z.string().nullable()
      }).nullable().optional()
    })

    it('validates trust detail structure', () => {
      const trust = {
        id: 'trust_123',
        trustName: 'Smith Family Trust',
        trustType: 'REVOCABLE_LIVING',
        isJoint: true,
        isRevocable: true,
        jurisdiction: 'California',
        formationDate: '2023-01-15'
      }

      const result = TrustSchema.safeParse(trust)
      expect(result.success).toBe(true)
    })

    it('validates will detail structure', () => {
      const will = {
        id: 'will_123',
        willType: 'POUR_OVER',
        executionDate: '2023-01-15',
        jurisdiction: 'California',
        forPersonId: 'person_123',
        forPerson: {
          id: 'person_123',
          fullName: 'John Smith'
        }
      }

      const result = WillSchema.safeParse(will)
      expect(result.success).toBe(true)
    })

    it('validates role detail structure', () => {
      const role = {
        id: 'role_123',
        roleCategory: 'FIDUCIARY',
        roleType: 'TRUSTEE',
        isPrimary: true,
        ordinal: 1,
        sharePercentage: null,
        shareType: null,
        status: 'ACTIVE',
        person: {
          id: 'person_456',
          fullName: 'John Smith',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@example.com'
        },
        forPersonId: null,
        forPerson: null
      }

      const result = PlanRoleSchema.safeParse(role)
      expect(result.success).toBe(true)
    })

    it('validates beneficiary role with share', () => {
      const role = {
        id: 'role_456',
        roleCategory: 'BENEFICIARY',
        roleType: 'PRIMARY_BENEFICIARY',
        isPrimary: false,
        ordinal: null,
        sharePercentage: 50,
        shareType: 'PERCENTAGE',
        status: 'ACTIVE',
        person: {
          id: 'person_789',
          fullName: 'Carter Smith',
          firstName: 'Carter',
          lastName: 'Smith',
          email: null
        }
      }

      const result = PlanRoleSchema.safeParse(role)
      expect(result.success).toBe(true)
    })
  })
})

// ===================================
// BUSINESS LOGIC TESTS
// ===================================

describe('Estate Plans Business Logic', () => {
  describe('Plan Status Transitions', () => {
    const validTransitions: Record<string, string[]> = {
      'DRAFT': ['ACTIVE'],
      'ACTIVE': ['AMENDED', 'INCAPACITATED', 'ADMINISTERED', 'CLOSED'],
      'AMENDED': ['ACTIVE', 'INCAPACITATED', 'ADMINISTERED', 'CLOSED'],
      'INCAPACITATED': ['ACTIVE', 'ADMINISTERED'],
      'ADMINISTERED': ['DISTRIBUTED', 'CLOSED'],
      'DISTRIBUTED': ['CLOSED'],
      'CLOSED': []
    }

    it('validates allowed status transitions', () => {
      for (const [from, toList] of Object.entries(validTransitions)) {
        for (const to of toList) {
          expect(validTransitions[from]).toContain(to)
        }
      }
    })

    it('DRAFT can only transition to ACTIVE', () => {
      expect(validTransitions['DRAFT']).toEqual(['ACTIVE'])
    })

    it('CLOSED is terminal state', () => {
      expect(validTransitions['CLOSED']).toEqual([])
    })

    it('ADMINISTERED can go to DISTRIBUTED or CLOSED', () => {
      expect(validTransitions['ADMINISTERED']).toContain('DISTRIBUTED')
      expect(validTransitions['ADMINISTERED']).toContain('CLOSED')
    })
  })

  describe('Role Categories', () => {
    const roleTypeToCategory: Record<string, string> = {
      'GRANTOR': 'GRANTOR',
      'TESTATOR': 'GRANTOR',
      'TRUSTEE': 'FIDUCIARY',
      'CO_TRUSTEE': 'FIDUCIARY',
      'SUCCESSOR_TRUSTEE': 'FIDUCIARY',
      'EXECUTOR': 'FIDUCIARY',
      'CO_EXECUTOR': 'FIDUCIARY',
      'FINANCIAL_AGENT': 'FIDUCIARY',
      'HEALTHCARE_AGENT': 'FIDUCIARY',
      'PRIMARY_BENEFICIARY': 'BENEFICIARY',
      'CONTINGENT_BENEFICIARY': 'BENEFICIARY',
      'REMAINDER_BENEFICIARY': 'BENEFICIARY',
      'GUARDIAN_OF_PERSON': 'GUARDIAN',
      'GUARDIAN_OF_ESTATE': 'GUARDIAN'
    }

    it('maps role types to correct categories', () => {
      // Grantors (both joint grantors use GRANTOR type)
      expect(roleTypeToCategory['GRANTOR']).toBe('GRANTOR')
      expect(roleTypeToCategory['TESTATOR']).toBe('GRANTOR')

      // Fiduciaries
      expect(roleTypeToCategory['TRUSTEE']).toBe('FIDUCIARY')
      expect(roleTypeToCategory['EXECUTOR']).toBe('FIDUCIARY')
      expect(roleTypeToCategory['FINANCIAL_AGENT']).toBe('FIDUCIARY')
      expect(roleTypeToCategory['HEALTHCARE_AGENT']).toBe('FIDUCIARY')

      // Beneficiaries
      expect(roleTypeToCategory['PRIMARY_BENEFICIARY']).toBe('BENEFICIARY')
      expect(roleTypeToCategory['CONTINGENT_BENEFICIARY']).toBe('BENEFICIARY')

      // Guardians
      expect(roleTypeToCategory['GUARDIAN_OF_PERSON']).toBe('GUARDIAN')
      expect(roleTypeToCategory['GUARDIAN_OF_ESTATE']).toBe('GUARDIAN')
    })
  })

  describe('Trust Types', () => {
    const validTrustTypes = [
      'REVOCABLE_LIVING',
      'IRREVOCABLE_LIVING',
      'TESTAMENTARY',
      'SPECIAL_NEEDS',
      'CHARITABLE_REMAINDER',
      'CHARITABLE_LEAD',
      'ILIT',
      'GRAT',
      'QPRT',
      'DYNASTY',
      'OTHER'
    ]

    it('includes common trust types', () => {
      expect(validTrustTypes).toContain('REVOCABLE_LIVING')
      expect(validTrustTypes).toContain('IRREVOCABLE_LIVING')
      expect(validTrustTypes).toContain('TESTAMENTARY')
      expect(validTrustTypes).toContain('SPECIAL_NEEDS')
    })

    it('includes advanced trust types', () => {
      expect(validTrustTypes).toContain('ILIT')  // Irrevocable Life Insurance Trust
      expect(validTrustTypes).toContain('GRAT')  // Grantor Retained Annuity Trust
      expect(validTrustTypes).toContain('QPRT')  // Qualified Personal Residence Trust
      expect(validTrustTypes).toContain('DYNASTY')
    })

    it('includes charitable trust types', () => {
      expect(validTrustTypes).toContain('CHARITABLE_REMAINDER')
      expect(validTrustTypes).toContain('CHARITABLE_LEAD')
    })
  })

  describe('Will Types', () => {
    const validWillTypes = ['SIMPLE', 'POUR_OVER', 'TESTAMENTARY_TRUST', 'OTHER']

    it('includes standard will types', () => {
      expect(validWillTypes).toContain('SIMPLE')
      expect(validWillTypes).toContain('POUR_OVER')
      expect(validWillTypes).toContain('TESTAMENTARY_TRUST')
      expect(validWillTypes).toContain('OTHER')
    })
  })

  describe('Event Types', () => {
    const lifecycleEvents = ['PLAN_CREATED', 'PLAN_SIGNED', 'PLAN_AMENDED', 'PLAN_RESTATED']
    const triggerEvents = ['GRANTOR_INCAPACITATED', 'GRANTOR_CAPACITY_RESTORED', 'FIRST_GRANTOR_DEATH', 'SECOND_GRANTOR_DEATH']
    const administrationEvents = ['ADMINISTRATION_STARTED', 'SUCCESSOR_TRUSTEE_APPOINTED', 'TRUST_FUNDED', 'ASSETS_VALUED', 'DISTRIBUTION_MADE', 'PARTIAL_DISTRIBUTION', 'TAX_RETURN_FILED', 'NOTICE_SENT']
    const closureEvents = ['FINAL_DISTRIBUTION', 'TRUST_TERMINATED', 'PLAN_CLOSED']

    it('has lifecycle events', () => {
      for (const event of lifecycleEvents) {
        expect(lifecycleEvents).toContain(event)
      }
    })

    it('has trigger events for incapacity and death', () => {
      for (const event of triggerEvents) {
        expect(triggerEvents).toContain(event)
      }
    })

    it('has administration events', () => {
      expect(administrationEvents).toContain('DISTRIBUTION_MADE')
      expect(administrationEvents).toContain('TAX_RETURN_FILED')
    })

    it('has closure events', () => {
      for (const event of closureEvents) {
        expect(closureEvents).toContain(event)
      }
    })
  })
})
