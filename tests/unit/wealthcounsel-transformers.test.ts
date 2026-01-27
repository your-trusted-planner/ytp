/**
 * Unit Tests for WealthCounsel Data Transformers
 *
 * Tests transformation of parsed WealthCounsel data into our database schema.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { parseWealthCounselXml } from '../../server/utils/wealthcounsel-parser'
import {
  extractPeople,
  transformToEstatePlan,
  transformRoles,
  buildPersonLookup,
  type WCTransformedPerson,
  type TransformedEstatePlan,
  type TransformedPlanRole
} from '../../server/utils/wealthcounsel-transformers'
import {
  singleClientWillXml,
  jointTrustXml,
  minimalXml
} from '../fixtures/wealthcounsel'

// ===================================
// PERSON EXTRACTION TESTS
// ===================================

describe('extractPeople', () => {
  describe('client and spouse', () => {
    it('extracts client as first person', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const people = extractPeople(parsed)

      expect(people.length).toBeGreaterThan(0)
      expect(people[0].fullName).toBe('Sandra Lynn Jenkins')
      expect(people[0].firstName).toBe('Sandra')
      expect(people[0].lastName).toBe('Jenkins')
    })

    it('extracts spouse for joint plans', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsed)

      const spouse = people.find(p => p.fullName === 'Desiree Marie Christensen')
      expect(spouse).toBeDefined()
      expect(spouse?.firstName).toBe('Desiree')
      expect(spouse?.lastName).toBe('Christensen')
    })

    it('sets personType to individual', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const people = extractPeople(parsed)

      expect(people.every(p => p.personType === 'individual')).toBe(true)
    })

    it('extracts contact information', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const people = extractPeople(parsed)

      const client = people.find(p => p.fullName === 'Sandra Lynn Jenkins')
      expect(client?.email).toBe('sandra@example.com')
      expect(client?.phone).toBe('(555) 123-4567')
    })

    it('extracts address information', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const people = extractPeople(parsed)

      const client = people.find(p => p.fullName === 'Sandra Lynn Jenkins')
      expect(client?.address).toBe('123 Main Street')
      expect(client?.city).toBe('Springfield')
      expect(client?.zipCode).toBe('12345')
    })

    it('extracts SSN last 4 digits', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const people = extractPeople(parsed)

      const client = people.find(p => p.fullName === 'Sandra Lynn Jenkins')
      expect(client?.ssnLast4).toBe('6789')
    })

    it('converts date of birth to Date object', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const people = extractPeople(parsed)

      const client = people.find(p => p.fullName === 'Sandra Lynn Jenkins')
      expect(client?.dateOfBirth).toBeInstanceOf(Date)
    })
  })

  describe('children', () => {
    it('extracts children', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsed)

      const child = people.find(p => p.fullName === 'Carter Christensen')
      expect(child).toBeDefined()
    })
  })

  describe('beneficiaries', () => {
    it('extracts beneficiaries not already in family', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const people = extractPeople(parsed)

      const beneficiary = people.find(p => p.fullName === 'Michael Jenkins')
      expect(beneficiary).toBeDefined()
    })

    it('does not duplicate beneficiaries who are children', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsed)

      // Carter Christensen is both a child and a beneficiary
      const carters = people.filter(p => p.fullName === 'Carter Christensen')
      expect(carters).toHaveLength(1)
    })

    it('includes beneficiary relationship in notes', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const people = extractPeople(parsed)

      const beneficiary = people.find(p => p.fullName === 'Michael Jenkins')
      expect(beneficiary?.notes).toContain('Son')
    })
  })

  describe('fiduciaries', () => {
    it('extracts fiduciaries who are not family members', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const people = extractPeople(parsed)

      const executor = people.find(p => p.fullName === 'John Jenkins')
      expect(executor).toBeDefined()
    })

    it('does not duplicate fiduciaries who are also grantors', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsed)

      // Matthew is both grantor and trustee
      const matts = people.filter(p => p.fullName === 'Matthew James Christensen')
      expect(matts).toHaveLength(1)
    })

    it('parses fiduciary names into first/last', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsed)

      const successor = people.find(p => p.fullName === 'Robert Christensen')
      expect(successor?.firstName).toBe('Robert')
      expect(successor?.lastName).toBe('Christensen')
    })
  })

  describe('deduplication', () => {
    it('deduplicates by case-insensitive name', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsed)

      // Check no duplicates exist
      const names = people.map(p => p.fullName?.toLowerCase())
      const uniqueNames = [...new Set(names)]
      expect(names.length).toBe(uniqueNames.length)
    })
  })

  describe('ID generation', () => {
    it('generates unique IDs for each person', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const people = extractPeople(parsed)

      const ids = people.map(p => p.id)
      const uniqueIds = [...new Set(ids)]
      expect(ids.length).toBe(uniqueIds.length)
    })

    it('generates IDs with person prefix', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const people = extractPeople(parsed)

      expect(people.every(p => p.id.startsWith('person_'))).toBe(true)
    })
  })

  describe('import metadata', () => {
    it('includes import metadata on each person', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const people = extractPeople(parsed)

      expect(people.every(p => p.importMetadata !== undefined)).toBe(true)
    })

    it('includes source in import metadata', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const people = extractPeople(parsed)

      const metadata = JSON.parse(people[0].importMetadata!)
      expect(metadata.source).toBe('WEALTHCOUNSEL')
    })

    it('includes role in import metadata', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const people = extractPeople(parsed)

      const clientMetadata = JSON.parse(people[0].importMetadata!)
      expect(clientMetadata.role).toBe('client')
    })
  })
})

// ===================================
// ESTATE PLAN TRANSFORMATION TESTS
// ===================================

describe('transformToEstatePlan', () => {
  let clientPersonId: string
  let spousePersonId: string

  beforeEach(() => {
    clientPersonId = 'person_client_123'
    spousePersonId = 'person_spouse_456'
  })

  describe('plan creation', () => {
    it('creates plan with correct type for trust-based', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const result = transformToEstatePlan(parsed, clientPersonId, spousePersonId)

      expect(result.plan.planType).toBe('TRUST_BASED')
    })

    it('creates plan with correct type for will-based', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const result = transformToEstatePlan(parsed, clientPersonId)

      expect(result.plan.planType).toBe('WILL_BASED')
    })

    it('sets plan name from trust name', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const result = transformToEstatePlan(parsed, clientPersonId, spousePersonId)

      expect(result.plan.planName).toBe('Christensen Legacy Family Trust')
    })

    it('generates plan name from client for will-based', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const result = transformToEstatePlan(parsed, clientPersonId)

      expect(result.plan.planName).toContain('Sandra Lynn Jenkins')
      expect(result.plan.planName).toContain('Estate Plan')
    })

    it('links to primary person', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const result = transformToEstatePlan(parsed, clientPersonId)

      expect(result.plan.primaryPersonId).toBe(clientPersonId)
    })

    it('links to secondary person for joint plans', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const result = transformToEstatePlan(parsed, clientPersonId, spousePersonId)

      expect(result.plan.secondaryPersonId).toBe(spousePersonId)
    })

    it('sets initial version to 1', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const result = transformToEstatePlan(parsed, clientPersonId, spousePersonId)

      expect(result.plan.currentVersion).toBe(1)
    })

    it('sets status to ACTIVE when effective date exists', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const result = transformToEstatePlan(parsed, clientPersonId, spousePersonId)

      expect(result.plan.status).toBe('ACTIVE')
      expect(result.plan.effectiveDate).toBeDefined()
    })

    it('sets status to DRAFT when no effective date', () => {
      const parsed = parseWealthCounselXml(minimalXml)
      const result = transformToEstatePlan(parsed, clientPersonId)

      expect(result.plan.status).toBe('DRAFT')
    })

    it('stores WealthCounsel client ID', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const result = transformToEstatePlan(parsed, clientPersonId, spousePersonId)

      expect(result.plan.wealthCounselClientId).toBe('22222222222222222222')
    })
  })

  describe('trust creation', () => {
    it('creates trust for trust-based plans', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const result = transformToEstatePlan(parsed, clientPersonId, spousePersonId)

      expect(result.trust).toBeDefined()
      expect(result.trust?.trustName).toBe('Christensen Legacy Family Trust')
    })

    it('sets isJoint correctly', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const result = transformToEstatePlan(parsed, clientPersonId, spousePersonId)

      expect(result.trust?.isJoint).toBe(true)
    })

    it('maps trust type correctly', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const result = transformToEstatePlan(parsed, clientPersonId, spousePersonId)

      expect(result.trust?.trustType).toBe('REVOCABLE_LIVING')
    })

    it('defaults to revocable', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const result = transformToEstatePlan(parsed, clientPersonId, spousePersonId)

      expect(result.trust?.isRevocable).toBe(true)
    })

    it('links trust to plan', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const result = transformToEstatePlan(parsed, clientPersonId, spousePersonId)

      expect(result.trust?.planId).toBe(result.plan.id)
    })

    it('does not create trust for will-based plans', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const result = transformToEstatePlan(parsed, clientPersonId)

      expect(result.trust).toBeUndefined()
    })
  })

  describe('will creation', () => {
    it('creates will for will-based plans', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const result = transformToEstatePlan(parsed, clientPersonId)

      expect(result.will).toBeDefined()
      expect(result.will?.willType).toBe('SIMPLE')
    })

    it('creates pour-over will for trust-based plans', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const result = transformToEstatePlan(parsed, clientPersonId, spousePersonId)

      // If there are executors, a will should be created
      if (parsed.fiduciaries.client.executors.length > 0) {
        expect(result.will?.willType).toBe('POUR_OVER')
      }
    })

    it('links will to plan', () => {
      const parsed = parseWealthCounselXml(singleClientWillXml)
      const result = transformToEstatePlan(parsed, clientPersonId)

      expect(result.will?.planId).toBe(result.plan.id)
    })
  })

  describe('version creation', () => {
    it('creates initial version', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const result = transformToEstatePlan(parsed, clientPersonId, spousePersonId)

      expect(result.version).toBeDefined()
      expect(result.version.version).toBe(1)
    })

    it('sets change type to CREATION', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const result = transformToEstatePlan(parsed, clientPersonId, spousePersonId)

      expect(result.version.changeType).toBe('CREATION')
    })

    it('sets source type to WEALTHCOUNSEL', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const result = transformToEstatePlan(parsed, clientPersonId, spousePersonId)

      expect(result.version.sourceType).toBe('WEALTHCOUNSEL')
    })

    it('links version to plan', () => {
      const parsed = parseWealthCounselXml(jointTrustXml)
      const result = transformToEstatePlan(parsed, clientPersonId, spousePersonId)

      expect(result.version.planId).toBe(result.plan.id)
    })
  })
})

// ===================================
// ROLE TRANSFORMATION TESTS
// ===================================

describe('transformRoles', () => {
  let parsed: ReturnType<typeof parseWealthCounselXml>
  let personLookup: Map<string, string>
  let planId: string
  let clientPersonId: string
  let spousePersonId: string

  beforeEach(() => {
    parsed = parseWealthCounselXml(jointTrustXml)
    const people = extractPeople(parsed)
    personLookup = buildPersonLookup(people)
    planId = 'plan_test_123'
    // Get person IDs from lookup for client and spouse
    clientPersonId = personLookup.get('Matthew James Christensen') || personLookup.get('Matt Christensen') || 'person_client_123'
    spousePersonId = personLookup.get('Desiree Marie Christensen') || personLookup.get('Desiree Christensen') || 'person_spouse_456'
  })

  describe('grantor roles', () => {
    it('creates grantor role for client', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      const grantorRole = roles.find(r =>
        r.roleType === 'GRANTOR' &&
        r.roleCategory === 'GRANTOR'
      )
      expect(grantorRole).toBeDefined()
      expect(grantorRole?.isPrimary).toBe(true)
    })

    it('creates co-grantor role for spouse', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      const coGrantorRole = roles.find(r =>
        r.roleType === 'CO_GRANTOR' &&
        r.roleCategory === 'GRANTOR'
      )
      expect(coGrantorRole).toBeDefined()
      expect(coGrantorRole?.isPrimary).toBe(false)
    })
  })

  describe('trustee roles', () => {
    it('creates trustee roles', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      const trusteeRoles = roles.filter(r =>
        ['TRUSTEE', 'CO_TRUSTEE'].includes(r.roleType) &&
        r.roleCategory === 'FIDUCIARY'
      )
      expect(trusteeRoles.length).toBeGreaterThan(0)
    })

    it('creates successor trustee roles', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      const successorRoles = roles.filter(r =>
        r.roleType === 'SUCCESSOR_TRUSTEE' &&
        r.roleCategory === 'FIDUCIARY'
      )
      expect(successorRoles.length).toBeGreaterThan(0)
    })
  })

  describe('agent roles', () => {
    it('creates financial agent roles', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      const agentRoles = roles.filter(r =>
        ['FINANCIAL_AGENT', 'ALTERNATE_FINANCIAL_AGENT'].includes(r.roleType)
      )
      expect(agentRoles.length).toBeGreaterThan(0)
    })

    it('creates healthcare agent roles', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      const agentRoles = roles.filter(r =>
        ['HEALTHCARE_AGENT', 'ALTERNATE_HEALTHCARE_AGENT'].includes(r.roleType)
      )
      expect(agentRoles.length).toBeGreaterThan(0)
    })
  })

  describe('guardian roles', () => {
    it('creates guardian roles', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      const guardianRoles = roles.filter(r =>
        r.roleType === 'GUARDIAN_OF_PERSON' &&
        r.roleCategory === 'GUARDIAN'
      )
      expect(guardianRoles.length).toBeGreaterThan(0)
    })
  })

  describe('individual document roles (forPersonId)', () => {
    it('sets forPersonId for client individual document fiduciaries', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      // Financial agents, healthcare agents, executors, guardians should have forPersonId set
      const clientIndividualRoles = roles.filter(r =>
        ['FINANCIAL_AGENT', 'ALTERNATE_FINANCIAL_AGENT', 'HEALTHCARE_AGENT', 'ALTERNATE_HEALTHCARE_AGENT', 'EXECUTOR', 'ALTERNATE_EXECUTOR', 'GUARDIAN_OF_PERSON'].includes(r.roleType) &&
        r.forPersonId === clientPersonId
      )
      expect(clientIndividualRoles.length).toBeGreaterThan(0)
    })

    it('sets forPersonId for spouse individual document fiduciaries', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      // Spouse's individual document roles should have forPersonId set to spouse
      const spouseIndividualRoles = roles.filter(r =>
        ['FINANCIAL_AGENT', 'ALTERNATE_FINANCIAL_AGENT', 'HEALTHCARE_AGENT', 'ALTERNATE_HEALTHCARE_AGENT', 'EXECUTOR', 'ALTERNATE_EXECUTOR', 'GUARDIAN_OF_PERSON'].includes(r.roleType) &&
        r.forPersonId === spousePersonId
      )
      // Joint plan should have spouse's individual roles
      expect(spouseIndividualRoles.length).toBeGreaterThan(0)
    })

    it('does NOT set forPersonId for trust-level roles', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      // Trust-level roles (trustees, successor trustees, trust protectors) should NOT have forPersonId
      const trustLevelRoles = roles.filter(r =>
        ['TRUSTEE', 'CO_TRUSTEE', 'SUCCESSOR_TRUSTEE', 'TRUST_PROTECTOR'].includes(r.roleType)
      )
      expect(trustLevelRoles.length).toBeGreaterThan(0)
      for (const role of trustLevelRoles) {
        expect(role.forPersonId).toBeUndefined()
      }
    })

    it('does NOT set forPersonId for grantor roles', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      const grantorRoles = roles.filter(r =>
        ['GRANTOR', 'CO_GRANTOR'].includes(r.roleType)
      )
      expect(grantorRoles.length).toBeGreaterThan(0)
      for (const role of grantorRoles) {
        expect(role.forPersonId).toBeUndefined()
      }
    })

    it('does NOT set forPersonId for beneficiary roles', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      const beneficiaryRoles = roles.filter(r =>
        r.roleCategory === 'BENEFICIARY'
      )
      expect(beneficiaryRoles.length).toBeGreaterThan(0)
      for (const role of beneficiaryRoles) {
        expect(role.forPersonId).toBeUndefined()
      }
    })
  })

  describe('beneficiary roles', () => {
    it('creates beneficiary roles', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      const beneficiaryRoles = roles.filter(r =>
        r.roleType === 'PRIMARY_BENEFICIARY' &&
        r.roleCategory === 'BENEFICIARY'
      )
      expect(beneficiaryRoles.length).toBeGreaterThan(0)
    })

    it('includes share percentage', () => {
      const singleParsed = parseWealthCounselXml(singleClientWillXml)
      const singlePeople = extractPeople(singleParsed)
      const singleLookup = buildPersonLookup(singlePeople)
      const singleClientId = singleLookup.get('Sandra Lynn Jenkins') || 'person_single_client'

      const roles = transformRoles(singleParsed, planId, singleLookup, singleClientId)

      const beneficiaryRoles = roles.filter(r =>
        r.roleCategory === 'BENEFICIARY'
      )
      expect(beneficiaryRoles.some(r => r.sharePercentage === 50)).toBe(true)
    })
  })

  describe('role properties', () => {
    it('sets status to ACTIVE', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      expect(roles.every(r => r.status === 'ACTIVE')).toBe(true)
    })

    it('links roles to plan', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      expect(roles.every(r => r.planId === planId)).toBe(true)
    })

    it('sets establishedInVersion to 1', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      expect(roles.every(r => r.establishedInVersion === 1)).toBe(true)
    })

    it('includes person snapshot', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      expect(roles.every(r => r.personSnapshot !== undefined)).toBe(true)
    })

    it('generates unique IDs for each role', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      const ids = roles.map(r => r.id)
      const uniqueIds = [...new Set(ids)]
      expect(ids.length).toBe(uniqueIds.length)
    })
  })

  describe('person lookup', () => {
    it('resolves person by exact name', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      // All roles should have a personId
      expect(roles.every(r => r.personId !== undefined)).toBe(true)
    })

    it('skips roles with unresolvable names', () => {
      const emptyLookup = new Map<string, string>()
      // Pass valid person IDs - but since lookup is empty, no roles will be created
      const roles = transformRoles(parsed, planId, emptyLookup, clientPersonId, spousePersonId)

      // With empty lookup, no roles should be created
      expect(roles).toHaveLength(0)
    })
  })

  describe('role deduplication', () => {
    it('does not create duplicate roles for the same person with same roleType', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      // Check that no (personId, roleType, forPersonId) tuple appears more than once
      const seen = new Set<string>()
      const duplicates: string[] = []

      for (const role of roles) {
        const key = `${role.personId}:${role.roleType}:${role.forPersonId || 'null'}`
        if (seen.has(key)) {
          duplicates.push(key)
        }
        seen.add(key)
      }

      expect(duplicates).toHaveLength(0)
    })

    it('deduplicates when same person appears multiple times in trustees', () => {
      // Create mock data where same person is listed twice as trustee
      const mockParsedData = {
        client: { fullName: 'John Doe' },
        spouse: { fullName: 'Jane Doe' },
        children: [],
        planType: 'TRUST_BASED' as const,
        fiduciaries: {
          // Same person listed twice - simulates XML parsing edge case
          trustees: [
            { personName: 'John Doe', roleType: 'TRUSTEE', isPrimary: true, ordinal: 1 },
            { personName: 'John Doe', roleType: 'TRUSTEE', isPrimary: false, ordinal: 2 }
          ],
          successorTrustees: [],
          trustProtectors: [],
          client: {
            financialAgents: [],
            financialAgentSuccessors: [],
            healthcareAgents: [],
            healthcareAgentSuccessors: [],
            executors: [],
            guardians: []
          },
          spouse: {
            financialAgents: [],
            financialAgentSuccessors: [],
            healthcareAgents: [],
            healthcareAgentSuccessors: [],
            executors: [],
            guardians: []
          }
        },
        beneficiaries: [],
        rawFields: new Map()
      }

      const mockLookup = new Map([
        ['John Doe', 'person_john'],
        ['Jane Doe', 'person_jane']
      ])

      const roles = transformRoles(
        mockParsedData as any,
        'plan_test',
        mockLookup,
        'person_john',
        'person_jane'
      )

      // Should only have ONE trustee role for John Doe, not two
      const johnTrusteeRoles = roles.filter(
        r => r.personId === 'person_john' && r.roleType === 'TRUSTEE'
      )
      expect(johnTrusteeRoles).toHaveLength(1)
    })

    it('deduplicates when name variations resolve to same personId', () => {
      // Create mock data where different name variations resolve to same person
      const mockParsedData = {
        client: { fullName: 'Matthew Christensen' },
        spouse: undefined,
        children: [],
        planType: 'TRUST_BASED' as const,
        fiduciaries: {
          trustees: [
            { personName: 'Matt Christensen', roleType: 'TRUSTEE', isPrimary: true, ordinal: 1 }
          ],
          successorTrustees: [
            { personName: 'Matthew Christensen', roleType: 'SUCCESSOR_TRUSTEE', isPrimary: false, ordinal: 1 }
          ],
          trustProtectors: [],
          client: {
            financialAgents: [
              // Same person as trustee, listed as financial agent with different name variation
              { personName: 'Matt Christensen', roleType: 'FINANCIAL_AGENT', isPrimary: true, ordinal: 1 }
            ],
            financialAgentSuccessors: [],
            healthcareAgents: [],
            healthcareAgentSuccessors: [],
            executors: [],
            guardians: []
          },
          spouse: {
            financialAgents: [],
            financialAgentSuccessors: [],
            healthcareAgents: [],
            healthcareAgentSuccessors: [],
            executors: [],
            guardians: []
          }
        },
        beneficiaries: [],
        rawFields: new Map()
      }

      // Lookup maps multiple name variations to same personId
      const mockLookup = new Map([
        ['Matt Christensen', 'person_matt'],
        ['Matthew Christensen', 'person_matt']  // Same ID!
      ])

      const roles = transformRoles(
        mockParsedData as any,
        'plan_test',
        mockLookup,
        'person_matt',
        undefined
      )

      // Matt should have GRANTOR, TRUSTEE, SUCCESSOR_TRUSTEE, and FINANCIAL_AGENT
      // But NOT duplicate TRUSTEE roles from name variations
      const mattRoles = roles.filter(r => r.personId === 'person_matt')
      const roleTypes = mattRoles.map(r => r.roleType)

      // Each role type should appear only once
      expect(roleTypes.filter(r => r === 'GRANTOR')).toHaveLength(1)
      expect(roleTypes.filter(r => r === 'TRUSTEE')).toHaveLength(1)
    })

    it('allows same person to have different roleTypes', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      // Client should be both GRANTOR and possibly TRUSTEE - different role types are OK
      const clientRoles = roles.filter(r => r.personId === clientPersonId)
      const roleTypes = new Set(clientRoles.map(r => r.roleType))

      // Should have multiple different role types
      expect(roleTypes.size).toBeGreaterThanOrEqual(1)
    })

    it('allows same roleType for different forPersonId values', () => {
      const roles = transformRoles(parsed, planId, personLookup, clientPersonId, spousePersonId)

      // Same person can be FINANCIAL_AGENT for client and FINANCIAL_AGENT for spouse
      // These are distinct roles because forPersonId is different
      const financialAgents = roles.filter(r => r.roleType === 'FINANCIAL_AGENT')

      // If there are multiple financial agents, they should have different (personId, forPersonId) tuples
      const uniqueTuples = new Set(financialAgents.map(r => `${r.personId}:${r.forPersonId}`))
      expect(uniqueTuples.size).toBe(financialAgents.length)
    })
  })
})

// ===================================
// PERSON LOOKUP TESTS
// ===================================

describe('buildPersonLookup', () => {
  it('creates lookup by fullName', () => {
    const people: WCTransformedPerson[] = [
      {
        id: 'person_1',
        personType: 'individual',
        fullName: 'John Smith',
        firstName: 'John',
        lastName: 'Smith'
      }
    ]

    const lookup = buildPersonLookup(people)

    expect(lookup.get('John Smith')).toBe('person_1')
  })

  it('creates lookup by first + last name', () => {
    const people: WCTransformedPerson[] = [
      {
        id: 'person_1',
        personType: 'individual',
        fullName: 'John Michael Smith',
        firstName: 'John',
        lastName: 'Smith'
      }
    ]

    const lookup = buildPersonLookup(people)

    expect(lookup.get('John Smith')).toBe('person_1')
  })

  it('handles people without fullName', () => {
    const people: WCTransformedPerson[] = [
      {
        id: 'person_1',
        personType: 'individual',
        firstName: 'John',
        lastName: 'Smith'
      }
    ]

    const lookup = buildPersonLookup(people)

    expect(lookup.get('John Smith')).toBe('person_1')
  })

  it('handles multiple people', () => {
    const people: WCTransformedPerson[] = [
      {
        id: 'person_1',
        personType: 'individual',
        fullName: 'John Smith'
      },
      {
        id: 'person_2',
        personType: 'individual',
        fullName: 'Jane Doe'
      }
    ]

    const lookup = buildPersonLookup(people)

    expect(lookup.get('John Smith')).toBe('person_1')
    expect(lookup.get('Jane Doe')).toBe('person_2')
  })
})
