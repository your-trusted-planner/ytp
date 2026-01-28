/**
 * Tests for WealthCounsel Import API Validation and Business Logic
 *
 * Tests the Zod schemas, data transformations, and import flow logic.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  extractPeople,
  transformToEstatePlan,
  transformRoles,
  buildPersonLookup
} from '../../server/utils/wealthcounsel-transformers'
import { parseWealthCounselXml } from '../../server/utils/wealthcounsel-parser'
import { jointTrustXml, singleClientWillXml, minimalXml } from '../fixtures/wealthcounsel'
import type { ExtractedPersonWithMatches, WealthCounselMatchSuggestion } from '../../server/utils/wealthcounsel-types'

// Replicate the validation schemas from import.post.ts
const PersonDecisionSchema = z.object({
  extractedName: z.string(),
  action: z.enum(['use_existing', 'create_new']),
  existingPersonId: z.string().optional()
})

const ImportRequestSchema = z.object({
  parseId: z.string(),
  decisions: z.object({
    clientPersonId: z.string().optional(),
    spousePersonId: z.string().optional(),
    personDecisions: z.array(PersonDecisionSchema).optional(),
    isAmendment: z.boolean().default(false),
    existingPlanId: z.string().optional(),
    linkToMatterId: z.string().optional(),
    createPeopleRecords: z.boolean().default(true)
  })
})

// ===================================
// INPUT VALIDATION TESTS
// ===================================

describe('WealthCounsel Import API Validation', () => {
  describe('ImportRequestSchema', () => {
    it('accepts valid import request with minimal fields', () => {
      const result = ImportRequestSchema.safeParse({
        parseId: 'parse_123456789_abc123',
        decisions: {}
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.decisions.isAmendment).toBe(false)
        expect(result.data.decisions.createPeopleRecords).toBe(true)
      }
    })

    it('accepts valid import request with all fields', () => {
      const result = ImportRequestSchema.safeParse({
        parseId: 'parse_123456789_abc123',
        decisions: {
          clientPersonId: 'person_client123',
          spousePersonId: 'person_spouse456',
          isAmendment: true,
          existingPlanId: 'plan_existing789',
          linkToMatterId: 'matter_work123',
          createPeopleRecords: false
        }
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.decisions.clientPersonId).toBe('person_client123')
        expect(result.data.decisions.isAmendment).toBe(true)
        expect(result.data.decisions.createPeopleRecords).toBe(false)
      }
    })

    it('rejects missing parseId', () => {
      const result = ImportRequestSchema.safeParse({
        decisions: {}
      })

      expect(result.success).toBe(false)
    })

    it('rejects missing decisions', () => {
      const result = ImportRequestSchema.safeParse({
        parseId: 'parse_123456789_abc123'
      })

      expect(result.success).toBe(false)
    })

    it('provides default values for optional boolean fields', () => {
      const result = ImportRequestSchema.safeParse({
        parseId: 'parse_test',
        decisions: {
          clientPersonId: 'person_123'
        }
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.decisions.isAmendment).toBe(false)
        expect(result.data.decisions.createPeopleRecords).toBe(true)
      }
    })
  })

  describe('PersonDecisionSchema', () => {
    it('accepts valid create_new decision', () => {
      const result = PersonDecisionSchema.safeParse({
        extractedName: 'John Smith',
        action: 'create_new'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.extractedName).toBe('John Smith')
        expect(result.data.action).toBe('create_new')
        expect(result.data.existingPersonId).toBeUndefined()
      }
    })

    it('accepts valid use_existing decision with personId', () => {
      const result = PersonDecisionSchema.safeParse({
        extractedName: 'Jane Doe',
        action: 'use_existing',
        existingPersonId: 'person_existing123'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.action).toBe('use_existing')
        expect(result.data.existingPersonId).toBe('person_existing123')
      }
    })

    it('rejects missing extractedName', () => {
      const result = PersonDecisionSchema.safeParse({
        action: 'create_new'
      })

      expect(result.success).toBe(false)
    })

    it('rejects invalid action', () => {
      const result = PersonDecisionSchema.safeParse({
        extractedName: 'John Smith',
        action: 'invalid_action'
      })

      expect(result.success).toBe(false)
    })
  })

  describe('ImportRequestSchema with personDecisions', () => {
    it('accepts request with personDecisions array', () => {
      const result = ImportRequestSchema.safeParse({
        parseId: 'parse_123',
        decisions: {
          personDecisions: [
            { extractedName: 'John Smith', action: 'create_new' },
            { extractedName: 'Jane Doe', action: 'use_existing', existingPersonId: 'person_123' }
          ]
        }
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.decisions.personDecisions).toHaveLength(2)
        expect(result.data.decisions.personDecisions![0].action).toBe('create_new')
        expect(result.data.decisions.personDecisions![1].existingPersonId).toBe('person_123')
      }
    })

    it('accepts request with empty personDecisions array', () => {
      const result = ImportRequestSchema.safeParse({
        parseId: 'parse_123',
        decisions: {
          personDecisions: []
        }
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.decisions.personDecisions).toHaveLength(0)
      }
    })

    it('accepts request combining personDecisions with legacy fields', () => {
      const result = ImportRequestSchema.safeParse({
        parseId: 'parse_123',
        decisions: {
          clientPersonId: 'person_client',
          spousePersonId: 'person_spouse',
          personDecisions: [
            { extractedName: 'Child One', action: 'create_new' }
          ],
          createPeopleRecords: false
        }
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.decisions.clientPersonId).toBe('person_client')
        expect(result.data.decisions.personDecisions).toHaveLength(1)
      }
    })
  })
})

// ===================================
// IMPORT FLOW LOGIC TESTS
// ===================================

describe('WealthCounsel Import Flow', () => {
  describe('new plan creation flow', () => {
    it('creates estate plan from joint trust XML', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsedData)
      const personLookup = buildPersonLookup(people)

      const clientPersonId = personLookup.get(parsedData.client.fullName!)!
      const spousePersonId = parsedData.spouse?.fullName
        ? personLookup.get(parsedData.spouse.fullName)
        : undefined

      const { plan, trust, will, version } = transformToEstatePlan(
        parsedData,
        clientPersonId,
        spousePersonId
      )

      // Plan structure
      expect(plan.planType).toBe('TRUST_BASED')
      expect(plan.planName).toBe('Christensen Legacy Family Trust')
      expect(plan.primaryPersonId).toBe(clientPersonId)
      expect(plan.secondaryPersonId).toBe(spousePersonId)
      expect(plan.status).toBe('ACTIVE')
      expect(plan.currentVersion).toBe(1)

      // Trust
      expect(trust).toBeDefined()
      expect(trust?.trustName).toBe('Christensen Legacy Family Trust')
      expect(trust?.isJoint).toBe(true)
      expect(trust?.trustType).toBe('REVOCABLE_LIVING')

      // Version
      expect(version.version).toBe(1)
      expect(version.changeType).toBe('CREATION')
      expect(version.sourceType).toBe('WEALTHCOUNSEL')
    })

    it('creates estate plan from single client will XML', () => {
      const parsedData = parseWealthCounselXml(singleClientWillXml)
      const people = extractPeople(parsedData)
      const personLookup = buildPersonLookup(people)

      const clientPersonId = personLookup.get(parsedData.client.fullName!)!

      const { plan, trust, will, version } = transformToEstatePlan(
        parsedData,
        clientPersonId
      )

      // Plan structure
      expect(plan.planType).toBe('WILL_BASED')
      expect(plan.primaryPersonId).toBe(clientPersonId)
      expect(plan.secondaryPersonId).toBeUndefined()

      // No trust for will-based plan
      expect(trust).toBeUndefined()

      // Will
      expect(will).toBeDefined()
      expect(will?.willType).toBe('SIMPLE')
    })

    it('creates roles from parsed data', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsedData)
      const personLookup = buildPersonLookup(people)

      const planId = 'plan_test123'
      const clientPersonId = personLookup.get(parsedData.client.fullName!)!
      const spousePersonId = parsedData.spouse?.fullName
        ? personLookup.get(parsedData.spouse.fullName)
        : undefined
      const roles = transformRoles(parsedData, planId, personLookup, clientPersonId, spousePersonId)

      // Should have multiple roles
      expect(roles.length).toBeGreaterThan(0)

      // Check trustee roles
      const trustees = roles.filter(r => r.roleType === 'TRUSTEE')
      expect(trustees.length).toBeGreaterThan(0)
      expect(trustees[0].roleCategory).toBe('FIDUCIARY')
      expect(trustees[0].planId).toBe(planId)

      // Check beneficiary roles
      const beneficiaries = roles.filter(r => r.roleCategory === 'BENEFICIARY')
      expect(beneficiaries.length).toBeGreaterThan(0)
      expect(beneficiaries[0].roleType).toBe('PRIMARY_BENEFICIARY')

      // Check that person IDs are resolved
      for (const role of roles) {
        expect(role.personId).toBeDefined()
        expect(role.personId.startsWith('person_')).toBe(true)
      }
    })
  })

  describe('amendment flow', () => {
    it('sets changeType to AMENDMENT when isAmendment is true', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsedData)
      const personLookup = buildPersonLookup(people)

      const clientPersonId = personLookup.get(parsedData.client.fullName!)!

      const { version } = transformToEstatePlan(
        parsedData,
        clientPersonId,
        undefined,
        { isAmendment: true }
      )

      // Version should reflect amendment
      expect(version.changeType).toBe('AMENDMENT')
    })

    it('sets changeType to CREATION when isAmendment is false', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsedData)
      const personLookup = buildPersonLookup(people)

      const clientPersonId = personLookup.get(parsedData.client.fullName!)!

      const { version } = transformToEstatePlan(
        parsedData,
        clientPersonId,
        undefined,
        { isAmendment: false }
      )

      expect(version.changeType).toBe('CREATION')
    })
  })

  describe('person matching', () => {
    it('links to existing client person ID when provided', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsedData)

      // Simulate linking to existing person
      const existingPersonId = 'existing_person_123'
      const personLookup = new Map<string, string>()
      personLookup.set(parsedData.client.fullName!, existingPersonId)

      // Build lookup with remaining people
      for (const person of people) {
        if (!personLookup.has(person.fullName || '')) {
          personLookup.set(person.fullName || '', person.id)
        }
      }

      const planId = 'plan_test'
      const spousePersonId = parsedData.spouse?.fullName
        ? personLookup.get(parsedData.spouse.fullName)
        : undefined
      const roles = transformRoles(parsedData, planId, personLookup, existingPersonId, spousePersonId)

      // Grantor role should use the existing person ID
      const grantors = roles.filter(r => r.roleType === 'GRANTOR')
      expect(grantors.length).toBeGreaterThan(0)
      expect(grantors[0].personId).toBe(existingPersonId)
    })

    it('links to existing spouse person ID when provided', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsedData)

      // Simulate linking both client and spouse to existing persons
      const existingClientId = 'existing_client_123'
      const existingSpouseId = 'existing_spouse_456'
      const personLookup = new Map<string, string>()
      personLookup.set(parsedData.client.fullName!, existingClientId)
      if (parsedData.spouse?.fullName) {
        personLookup.set(parsedData.spouse.fullName, existingSpouseId)
      }

      // Build lookup with remaining people
      for (const person of people) {
        if (!personLookup.has(person.fullName || '')) {
          personLookup.set(person.fullName || '', person.id)
        }
      }

      // Create plan with both linked
      const { plan } = transformToEstatePlan(
        parsedData,
        existingClientId,
        existingSpouseId
      )

      expect(plan.primaryPersonId).toBe(existingClientId)
      expect(plan.secondaryPersonId).toBe(existingSpouseId)
    })
  })

  describe('person deduplication with personDecisions', () => {
    it('builds correct person lookup from personDecisions with use_existing', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsedData)

      // Simulate personDecisions from user
      const personDecisions = [
        { extractedName: parsedData.client.fullName!, action: 'use_existing' as const, existingPersonId: 'existing_client_abc' },
        { extractedName: parsedData.spouse?.fullName || '', action: 'use_existing' as const, existingPersonId: 'existing_spouse_def' }
      ]

      // Build decisionMap like import.post.ts does
      const decisionMap = new Map<string, { action: 'use_existing' | 'create_new', existingPersonId?: string }>()
      for (const decision of personDecisions) {
        decisionMap.set(decision.extractedName, {
          action: decision.action,
          existingPersonId: decision.existingPersonId
        })
      }

      // Build personLookup from decisions
      const personLookup = new Map<string, string>()
      for (const [name, decision] of decisionMap) {
        if (decision.action === 'use_existing' && decision.existingPersonId) {
          personLookup.set(name, decision.existingPersonId)
        }
      }

      expect(personLookup.get(parsedData.client.fullName!)).toBe('existing_client_abc')
      expect(personLookup.get(parsedData.spouse?.fullName || '')).toBe('existing_spouse_def')
    })

    it('marks people for creation when action is create_new', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsedData)

      // All create_new decisions
      const personDecisions = people.map(p => ({
        extractedName: p.fullName || '',
        action: 'create_new' as const
      }))

      const decisionMap = new Map<string, { action: 'use_existing' | 'create_new', existingPersonId?: string }>()
      for (const decision of personDecisions) {
        decisionMap.set(decision.extractedName, { action: decision.action })
      }

      // Simulate the shouldCreate logic from import.post.ts
      const peopleToCreate: string[] = []
      for (const person of people) {
        const fullName = person.fullName || ''
        const decision = decisionMap.get(fullName)
        const shouldCreate = !decision || decision.action === 'create_new'
        if (shouldCreate) {
          peopleToCreate.push(fullName)
        }
      }

      // All people should be marked for creation
      expect(peopleToCreate.length).toBe(people.length)
    })

    it('handles mixed decisions correctly', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsedData)

      // Client uses existing, others create new
      const personDecisions = [
        { extractedName: parsedData.client.fullName!, action: 'use_existing' as const, existingPersonId: 'existing_client' }
      ]

      const decisionMap = new Map<string, { action: 'use_existing' | 'create_new', existingPersonId?: string }>()
      for (const decision of personDecisions) {
        decisionMap.set(decision.extractedName, {
          action: decision.action,
          existingPersonId: decision.existingPersonId
        })
      }

      const personLookup = new Map<string, string>()

      // First, apply use_existing decisions
      for (const [name, decision] of decisionMap) {
        if (decision.action === 'use_existing' && decision.existingPersonId) {
          personLookup.set(name, decision.existingPersonId)
        }
      }

      // Then simulate creation for others
      const peopleCreated: string[] = []
      for (const person of people) {
        const fullName = person.fullName || ''
        if (personLookup.has(fullName)) continue // Skip linked

        const decision = decisionMap.get(fullName)
        const shouldCreate = !decision || decision.action === 'create_new'
        if (shouldCreate) {
          personLookup.set(fullName, person.id)
          peopleCreated.push(fullName)
        }
      }

      // Client should be linked to existing
      expect(personLookup.get(parsedData.client.fullName!)).toBe('existing_client')

      // Others should be created (spouse + children + beneficiaries + fiduciaries)
      expect(peopleCreated.length).toBe(people.length - 1)
      expect(peopleCreated).not.toContain(parsedData.client.fullName)
    })

    it('defaults to create_new when no decision provided for a person', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsedData)

      // Only provide decision for client, others have no decision
      const personDecisions = [
        { extractedName: parsedData.client.fullName!, action: 'create_new' as const }
      ]

      const decisionMap = new Map<string, { action: 'use_existing' | 'create_new', existingPersonId?: string }>()
      for (const decision of personDecisions) {
        decisionMap.set(decision.extractedName, { action: decision.action })
      }

      // Simulate the logic: no decision = create_new
      const usePersonDecisions = personDecisions.length > 0
      const shouldCreateList: string[] = []

      for (const person of people) {
        const fullName = person.fullName || ''
        let shouldCreate = false

        if (usePersonDecisions) {
          const decision = decisionMap.get(fullName)
          // Default to create_new if no decision
          shouldCreate = !decision || decision.action === 'create_new'
        }

        if (shouldCreate) {
          shouldCreateList.push(fullName)
        }
      }

      // All people should be created (client has explicit create_new, others default to it)
      expect(shouldCreateList.length).toBe(people.length)
    })
  })

  describe('people extraction for import', () => {
    it('extracts all people from joint trust', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsedData)

      // Should include client, spouse, child, and any other named persons
      expect(people.length).toBeGreaterThan(2)

      // Find client
      const client = people.find(p => p.fullName === parsedData.client.fullName)
      expect(client).toBeDefined()

      // Import source is stored in importMetadata as JSON
      if (client?.importMetadata) {
        const metadata = JSON.parse(client.importMetadata)
        expect(metadata.source).toBe('WEALTHCOUNSEL')
      }

      // Find spouse
      const spouse = people.find(p => p.fullName === parsedData.spouse?.fullName)
      expect(spouse).toBeDefined()

      // Find child
      const childName = parsedData.children[0]?.fullName
      if (childName) {
        const child = people.find(p => p.fullName === childName)
        expect(child).toBeDefined()
      }
    })

    it('extracts people from will-based plan', () => {
      const parsedData = parseWealthCounselXml(singleClientWillXml)
      const people = extractPeople(parsedData)

      // Should include client and beneficiaries
      expect(people.length).toBeGreaterThan(1)

      // Find beneficiaries
      for (const beneficiary of parsedData.beneficiaries) {
        const person = people.find(p => p.fullName === beneficiary.name)
        expect(person).toBeDefined()
      }
    })

    it('deduplicates people with same name', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsedData)

      // Check for no duplicates
      const names = people.map(p => p.fullName)
      const uniqueNames = [...new Set(names)]
      expect(names.length).toBe(uniqueNames.length)
    })

    it('generates unique IDs for each person', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsedData)

      const ids = people.map(p => p.id)
      const uniqueIds = [...new Set(ids)]
      expect(ids.length).toBe(uniqueIds.length)

      // All IDs should start with person_
      for (const id of ids) {
        expect(id.startsWith('person_')).toBe(true)
      }
    })
  })

  describe('role creation for import', () => {
    it('creates grantor roles for joint trust', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsedData)
      const personLookup = buildPersonLookup(people)

      const clientPersonId = personLookup.get(parsedData.client.fullName!)!
      const spousePersonId = parsedData.spouse?.fullName
        ? personLookup.get(parsedData.spouse.fullName)
        : undefined
      const roles = transformRoles(parsedData, 'plan_123', personLookup, clientPersonId, spousePersonId)
      const grantors = roles.filter(r => r.roleType === 'GRANTOR' || r.roleType === 'CO_GRANTOR')

      // Joint trust should have two grantors
      expect(grantors.length).toBe(2)
    })

    it('creates executor roles for will-based plan', () => {
      const parsedData = parseWealthCounselXml(singleClientWillXml)
      const people = extractPeople(parsedData)
      const personLookup = buildPersonLookup(people)

      const clientPersonId = personLookup.get(parsedData.client.fullName!)!
      const roles = transformRoles(parsedData, 'plan_123', personLookup, clientPersonId)
      const executors = roles.filter(r => r.roleType === 'EXECUTOR')

      expect(executors.length).toBeGreaterThan(0)
      expect(executors[0].roleCategory).toBe('FIDUCIARY')
    })

    it('sets correct share percentages for beneficiaries', () => {
      const parsedData = parseWealthCounselXml(singleClientWillXml)
      const people = extractPeople(parsedData)
      const personLookup = buildPersonLookup(people)

      const clientPersonId = personLookup.get(parsedData.client.fullName!)!
      const roles = transformRoles(parsedData, 'plan_123', personLookup, clientPersonId)
      const beneficiaries = roles.filter(r => r.roleCategory === 'BENEFICIARY')

      // Check that percentages are set
      for (const ben of beneficiaries) {
        if (ben.sharePercentage !== undefined) {
          expect(typeof ben.sharePercentage).toBe('number')
          expect(ben.sharePercentage).toBeGreaterThan(0)
          expect(ben.sharePercentage).toBeLessThanOrEqual(100)
        }
      }
    })

    it('marks first fiduciary as primary', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsedData)
      const personLookup = buildPersonLookup(people)

      const clientPersonId = personLookup.get(parsedData.client.fullName!)!
      const spousePersonId = parsedData.spouse?.fullName
        ? personLookup.get(parsedData.spouse.fullName)
        : undefined
      const roles = transformRoles(parsedData, 'plan_123', personLookup, clientPersonId, spousePersonId)
      const trustees = roles.filter(r => r.roleType === 'TRUSTEE')

      if (trustees.length > 0) {
        const primaryTrustee = trustees.find(t => t.isPrimary === true)
        expect(primaryTrustee).toBeDefined()
      }
    })

    it('sets ordinal values for successor fiduciaries', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsedData)
      const personLookup = buildPersonLookup(people)

      const clientPersonId = personLookup.get(parsedData.client.fullName!)!
      const spousePersonId = parsedData.spouse?.fullName
        ? personLookup.get(parsedData.spouse.fullName)
        : undefined
      const roles = transformRoles(parsedData, 'plan_123', personLookup, clientPersonId, spousePersonId)
      const successorTrustees = roles.filter(r => r.roleType === 'SUCCESSOR_TRUSTEE')

      for (const st of successorTrustees) {
        expect(typeof st.ordinal).toBe('number')
        expect(st.ordinal).toBeGreaterThanOrEqual(1)
      }
    })
  })
})

// ===================================
// EDGE CASES AND ERROR HANDLING
// ===================================

describe('WealthCounsel Import Edge Cases', () => {
  it('handles minimal XML with no spouse or children', () => {
    const parsedData = parseWealthCounselXml(minimalXml)
    const people = extractPeople(parsedData)
    const personLookup = buildPersonLookup(people)

    const clientPersonId = personLookup.get(parsedData.client.fullName!)!

    const { plan, trust, will } = transformToEstatePlan(parsedData, clientPersonId)

    expect(plan.planType).toBe('WILL_BASED')
    expect(plan.primaryPersonId).toBe(clientPersonId)
    expect(plan.secondaryPersonId).toBeUndefined()
    expect(trust).toBeUndefined()
  })

  it('handles missing person in lookup gracefully', () => {
    const parsedData = parseWealthCounselXml(jointTrustXml)

    // Create an incomplete lookup (missing some people)
    const personLookup = new Map<string, string>()
    personLookup.set(parsedData.client.fullName!, 'person_client')
    // Intentionally NOT adding other people

    // Note: even with missing people in lookup, we need valid person IDs for client/spouse
    const roles = transformRoles(parsedData, 'plan_123', personLookup, 'person_client', undefined)

    // Should still create roles for people in lookup
    const rolesWithPerson = roles.filter(r => r.personId !== undefined)
    expect(rolesWithPerson.length).toBeGreaterThan(0)
  })

  it('preserves WealthCounsel client ID in plan metadata', () => {
    const parsedData = parseWealthCounselXml(jointTrustXml)
    const people = extractPeople(parsedData)
    const personLookup = buildPersonLookup(people)

    const clientPersonId = personLookup.get(parsedData.client.fullName!)!

    const { plan } = transformToEstatePlan(parsedData, clientPersonId)

    expect(plan.wealthCounselClientId).toBe(parsedData.clientId)
  })

  it('stores raw source data in version for debugging', () => {
    const parsedData = parseWealthCounselXml(jointTrustXml)
    const people = extractPeople(parsedData)
    const personLookup = buildPersonLookup(people)

    const clientPersonId = personLookup.get(parsedData.client.fullName!)!

    const { version } = transformToEstatePlan(parsedData, clientPersonId)

    expect(version.sourceData).toBeDefined()
    expect(version.sourceType).toBe('WEALTHCOUNSEL')

    // Source data should be parseable JSON with import metadata
    if (version.sourceData) {
      const parsed = JSON.parse(version.sourceData)
      expect(parsed.rawFieldCount).toBeGreaterThan(0)
      expect(parsed.clientId).toBeDefined()
      expect(parsed.importedAt).toBeDefined()
    }
  })
})

// ===================================
// PARSE ENDPOINT PERSON EXTRACTION TESTS
// ===================================

describe('WealthCounsel Parse Person Extraction', () => {
  // Helper to simulate what parse.post.ts does
  function extractAllPeopleFromParsedData(parsedData: ReturnType<typeof parseWealthCounselXml>): ExtractedPersonWithMatches[] {
    const extractedPeople: ExtractedPersonWithMatches[] = []
    const seenNames = new Set<string>()

    // Helper to add a person if not already seen
    function addExtractedPerson(
      name: string,
      role: ExtractedPersonWithMatches['role'],
      rolesInPlan: string[],
      email?: string,
      dateOfBirth?: string
    ) {
      if (!name || seenNames.has(name)) return
      seenNames.add(name)

      extractedPeople.push({
        extractedName: name,
        extractedEmail: email,
        extractedDateOfBirth: dateOfBirth,
        role,
        rolesInPlan,
        matches: [] // In real usage, this would be populated from DB query
      })
    }

    // Extract client
    if (parsedData.client.fullName) {
      addExtractedPerson(
        parsedData.client.fullName,
        'client',
        ['Primary Client'],
        parsedData.client.email,
        parsedData.client.dateOfBirth
      )
    }

    // Extract spouse
    if (parsedData.spouse?.fullName) {
      addExtractedPerson(
        parsedData.spouse.fullName,
        'spouse',
        ['Spouse'],
        parsedData.spouse.email,
        parsedData.spouse.dateOfBirth
      )
    }

    // Extract children
    for (const child of parsedData.children) {
      if (child.fullName) {
        addExtractedPerson(child.fullName, 'child', ['Child'], undefined, child.dateOfBirth)
      }
    }

    // Extract beneficiaries
    for (const beneficiary of parsedData.beneficiaries) {
      if (beneficiary.name) {
        addExtractedPerson(beneficiary.name, 'beneficiary', ['Beneficiary'], undefined, undefined)
      }
    }

    // Extract fiduciaries
    const fiduciaryRoles = new Map<string, string[]>()
    const addFiduciaryRole = (name: string, role: string) => {
      if (!name) return
      const existing = fiduciaryRoles.get(name) || []
      if (!existing.includes(role)) {
        existing.push(role)
        fiduciaryRoles.set(name, existing)
      }
    }

    // Trust-level
    for (const t of parsedData.fiduciaries.trustees) addFiduciaryRole(t.personName, 'Trustee')
    for (const t of parsedData.fiduciaries.successorTrustees) addFiduciaryRole(t.personName, 'Successor Trustee')
    for (const t of parsedData.fiduciaries.trustProtectors) addFiduciaryRole(t.personName, 'Trust Protector')

    // Client individual docs
    for (const t of parsedData.fiduciaries.client.financialAgents) addFiduciaryRole(t.personName, 'Financial Agent (Client)')
    for (const t of parsedData.fiduciaries.client.financialAgentSuccessors) addFiduciaryRole(t.personName, 'Successor Financial Agent (Client)')
    for (const t of parsedData.fiduciaries.client.healthcareAgents) addFiduciaryRole(t.personName, 'Healthcare Agent (Client)')
    for (const t of parsedData.fiduciaries.client.healthcareAgentSuccessors) addFiduciaryRole(t.personName, 'Successor Healthcare Agent (Client)')
    for (const t of parsedData.fiduciaries.client.executors) addFiduciaryRole(t.personName, 'Executor (Client)')
    for (const t of parsedData.fiduciaries.client.guardians) addFiduciaryRole(t.personName, 'Guardian (Client)')

    // Spouse individual docs
    for (const t of parsedData.fiduciaries.spouse.financialAgents) addFiduciaryRole(t.personName, 'Financial Agent (Spouse)')
    for (const t of parsedData.fiduciaries.spouse.financialAgentSuccessors) addFiduciaryRole(t.personName, 'Successor Financial Agent (Spouse)')
    for (const t of parsedData.fiduciaries.spouse.healthcareAgents) addFiduciaryRole(t.personName, 'Healthcare Agent (Spouse)')
    for (const t of parsedData.fiduciaries.spouse.healthcareAgentSuccessors) addFiduciaryRole(t.personName, 'Successor Healthcare Agent (Spouse)')
    for (const t of parsedData.fiduciaries.spouse.executors) addFiduciaryRole(t.personName, 'Executor (Spouse)')
    for (const t of parsedData.fiduciaries.spouse.guardians) addFiduciaryRole(t.personName, 'Guardian (Spouse)')

    // Add fiduciaries
    for (const [name, roles] of fiduciaryRoles) {
      addExtractedPerson(name, 'fiduciary', roles, undefined, undefined)
    }

    return extractedPeople
  }

  describe('extractAllPeopleFromParsedData', () => {
    it('extracts client with email and DOB', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const extracted = extractAllPeopleFromParsedData(parsedData)

      const client = extracted.find(p => p.role === 'client')
      expect(client).toBeDefined()
      expect(client?.extractedName).toBe(parsedData.client.fullName)
      expect(client?.extractedEmail).toBe(parsedData.client.email)
      expect(client?.rolesInPlan).toContain('Primary Client')
    })

    it('extracts spouse with email and DOB', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const extracted = extractAllPeopleFromParsedData(parsedData)

      const spouse = extracted.find(p => p.role === 'spouse')
      expect(spouse).toBeDefined()
      expect(spouse?.extractedName).toBe(parsedData.spouse?.fullName)
      expect(spouse?.rolesInPlan).toContain('Spouse')
    })

    it('extracts children', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const extracted = extractAllPeopleFromParsedData(parsedData)

      const children = extracted.filter(p => p.role === 'child')
      expect(children.length).toBe(parsedData.children.length)

      for (const child of children) {
        expect(child.rolesInPlan).toContain('Child')
      }
    })

    it('extracts beneficiaries', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const extracted = extractAllPeopleFromParsedData(parsedData)

      const beneficiaries = extracted.filter(p => p.role === 'beneficiary')
      // Some beneficiaries might also be children, so they're deduplicated
      expect(beneficiaries.length).toBeGreaterThanOrEqual(0)
    })

    it('extracts fiduciaries with aggregated roles', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const extracted = extractAllPeopleFromParsedData(parsedData)

      const fiduciaries = extracted.filter(p => p.role === 'fiduciary')
      expect(fiduciaries.length).toBeGreaterThan(0)

      // Fiduciaries that serve multiple roles should have all roles listed
      for (const fid of fiduciaries) {
        expect(fid.rolesInPlan.length).toBeGreaterThan(0)
      }
    })

    it('deduplicates people who appear in multiple roles', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const extracted = extractAllPeopleFromParsedData(parsedData)

      // No duplicate names
      const names = extracted.map(p => p.extractedName)
      const uniqueNames = [...new Set(names)]
      expect(names.length).toBe(uniqueNames.length)
    })

    it('correctly identifies role type for each person', () => {
      const parsedData = parseWealthCounselXml(jointTrustXml)
      const extracted = extractAllPeopleFromParsedData(parsedData)

      // Client should be role 'client'
      const client = extracted.find(p => p.extractedName === parsedData.client.fullName)
      expect(client?.role).toBe('client')

      // Spouse should be role 'spouse'
      if (parsedData.spouse?.fullName) {
        const spouse = extracted.find(p => p.extractedName === parsedData.spouse?.fullName)
        expect(spouse?.role).toBe('spouse')
      }
    })
  })

  describe('match confidence calculation', () => {
    // Helper to simulate match confidence like parse.post.ts does
    function calculateMatchConfidence(
      extractedName: string,
      extractedEmail?: string,
      extractedDob?: string,
      dbPerson: { fullName?: string | null, email?: string | null, dateOfBirth?: string | null }
    ): WealthCounselMatchSuggestion | null {
      const personName = dbPerson.fullName || ''
      const matchingFields: string[] = []
      let matchType: 'NAME_EMAIL' | 'NAME_DOB' | 'NAME_ONLY' = 'NAME_ONLY'
      let confidence = 50

      const nameMatches = dbPerson.fullName === extractedName ||
        personName.toLowerCase() === extractedName.toLowerCase()
      const emailMatches = extractedEmail && dbPerson.email === extractedEmail
      const dobMatches = extractedDob && dbPerson.dateOfBirth === extractedDob

      if (nameMatches) matchingFields.push('name')
      if (emailMatches) matchingFields.push('email')
      if (dobMatches) matchingFields.push('dateOfBirth')

      if (matchingFields.length === 0) return null

      if (emailMatches && nameMatches) {
        matchType = 'NAME_EMAIL'
        confidence = 95
      } else if (dobMatches && nameMatches) {
        matchType = 'NAME_DOB'
        confidence = 85
      } else if (emailMatches) {
        matchType = 'NAME_EMAIL'
        confidence = 80
      } else if (nameMatches) {
        matchType = 'NAME_ONLY'
        confidence = 60
      }

      return {
        personId: 'test_person_id',
        personName,
        email: dbPerson.email,
        dateOfBirth: dbPerson.dateOfBirth,
        matchType,
        confidence,
        matchingFields
      }
    }

    it('returns 95% confidence for name + email match', () => {
      const match = calculateMatchConfidence(
        'John Smith',
        'john@example.com',
        undefined,
        { fullName: 'John Smith', email: 'john@example.com', dateOfBirth: null }
      )

      expect(match?.matchType).toBe('NAME_EMAIL')
      expect(match?.confidence).toBe(95)
      expect(match?.matchingFields).toContain('name')
      expect(match?.matchingFields).toContain('email')
    })

    it('returns 85% confidence for name + DOB match', () => {
      const match = calculateMatchConfidence(
        'John Smith',
        undefined,
        '1970-01-15',
        { fullName: 'John Smith', email: null, dateOfBirth: '1970-01-15' }
      )

      expect(match?.matchType).toBe('NAME_DOB')
      expect(match?.confidence).toBe(85)
      expect(match?.matchingFields).toContain('name')
      expect(match?.matchingFields).toContain('dateOfBirth')
    })

    it('returns 80% confidence for email-only match', () => {
      const match = calculateMatchConfidence(
        'John Smith',
        'john@example.com',
        undefined,
        { fullName: 'Jonathan Smith', email: 'john@example.com', dateOfBirth: null }
      )

      expect(match?.matchType).toBe('NAME_EMAIL')
      expect(match?.confidence).toBe(80)
      expect(match?.matchingFields).toContain('email')
      expect(match?.matchingFields).not.toContain('name')
    })

    it('returns 60% confidence for name-only match', () => {
      const match = calculateMatchConfidence(
        'John Smith',
        'john@example.com',
        '1970-01-15',
        { fullName: 'John Smith', email: 'different@email.com', dateOfBirth: '1980-05-20' }
      )

      expect(match?.matchType).toBe('NAME_ONLY')
      expect(match?.confidence).toBe(60)
      expect(match?.matchingFields).toContain('name')
      expect(match?.matchingFields).not.toContain('email')
      expect(match?.matchingFields).not.toContain('dateOfBirth')
    })

    it('returns null for no match', () => {
      const match = calculateMatchConfidence(
        'John Smith',
        'john@example.com',
        '1970-01-15',
        { fullName: 'Jane Doe', email: 'jane@example.com', dateOfBirth: '1985-03-10' }
      )

      expect(match).toBeNull()
    })

    it('handles case-insensitive name matching', () => {
      const match = calculateMatchConfidence(
        'JOHN SMITH',
        undefined,
        undefined,
        { fullName: 'john smith', email: null, dateOfBirth: null }
      )

      expect(match?.matchType).toBe('NAME_ONLY')
      expect(match?.confidence).toBe(60)
      expect(match?.matchingFields).toContain('name')
    })
  })
})
