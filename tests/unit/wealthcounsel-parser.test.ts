/**
 * Unit Tests for WealthCounsel XML Parser
 *
 * Tests parsing of WealthCounsel XML export files into structured data.
 */

import { describe, it, expect } from 'vitest'
import { parseWealthCounselXml, summarizeParsedData } from '../../server/utils/wealthcounsel-parser'
import {
  singleClientWillXml,
  jointTrustXml,
  minimalXml,
  multipleChildrenXml,
  emptyValuesXml,
  mixedTypesXml,
  emptyXml,
  realJointTrustXml,
  realSingleWillXml
} from '../fixtures/wealthcounsel'

// ===================================
// BASIC PARSING TESTS
// ===================================

describe('parseWealthCounselXml', () => {
  describe('client extraction', () => {
    it('extracts basic client information', () => {
      const result = parseWealthCounselXml(singleClientWillXml)

      expect(result.client.firstName).toBe('Sandra')
      expect(result.client.lastName).toBe('Jenkins')
      expect(result.client.middleName).toBe('Lynn')
      expect(result.client.fullName).toBe('Sandra Lynn Jenkins')
    })

    it('extracts client contact information', () => {
      const result = parseWealthCounselXml(singleClientWillXml)

      expect(result.client.email).toBe('sandra@example.com')
      expect(result.client.phone).toBe('(555) 123-4567')
    })

    it('extracts client address', () => {
      const result = parseWealthCounselXml(singleClientWillXml)

      expect(result.client.address).toBe('123 Main Street')
      expect(result.client.city).toBe('Springfield')
      expect(result.client.zipCode).toBe('12345')
    })

    it('extracts client sensitive data', () => {
      const result = parseWealthCounselXml(singleClientWillXml)

      expect(result.client.ssn).toBe('123-45-6789')
      expect(result.client.dateOfBirth).toBeDefined()
    })

    it('handles minimal client data', () => {
      const result = parseWealthCounselXml(minimalXml)

      expect(result.client.fullName).toBe('John Doe')
      expect(result.client.firstName).toBe('John')
      expect(result.client.lastName).toBe('Doe')
      expect(result.client.email).toBeUndefined()
    })
  })

  describe('spouse extraction', () => {
    it('extracts spouse when present', () => {
      const result = parseWealthCounselXml(jointTrustXml)

      expect(result.spouse).toBeDefined()
      expect(result.spouse?.firstName).toBe('Desiree')
      expect(result.spouse?.lastName).toBe('Christensen')
      expect(result.spouse?.fullName).toBe('Desiree Marie Christensen')
      expect(result.spouse?.email).toBe('desiree@example.com')
    })

    it('returns undefined spouse for single client', () => {
      const result = parseWealthCounselXml(singleClientWillXml)

      expect(result.spouse).toBeUndefined()
    })

    it('treats "None" spouse as undefined', () => {
      const result = parseWealthCounselXml(emptyValuesXml)

      expect(result.spouse).toBeUndefined()
    })
  })

  describe('children extraction', () => {
    it('extracts single child', () => {
      const result = parseWealthCounselXml(jointTrustXml)

      expect(result.children).toHaveLength(1)
      expect(result.children[0].fullName).toBe('Carter Christensen')
    })

    it('extracts multiple children', () => {
      const result = parseWealthCounselXml(multipleChildrenXml)

      expect(result.children).toHaveLength(3)
      expect(result.children.map(c => c.fullName)).toEqual([
        'Alice Smith',
        'Bob Smith',
        'Charlie Smith'
      ])
    })

    it('returns empty array when no children', () => {
      const result = parseWealthCounselXml(minimalXml)

      expect(result.children).toHaveLength(0)
    })

    it('deduplicates children by name', () => {
      // Create XML with duplicate child names
      const duplicateChildXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<wc:set xmlns:wc="http://counsel.com">
<wc:data key="Client name"><wc:repeat><wc:string>Parent</wc:string></wc:repeat></wc:data>
<wc:data key="Child name"><wc:repeat><wc:string>Duplicate Child</wc:string></wc:repeat></wc:data>
<wc:data key="Child name h"><wc:repeat><wc:string>Duplicate Child</wc:string></wc:repeat></wc:data>
</wc:set>`

      const result = parseWealthCounselXml(duplicateChildXml)

      expect(result.children).toHaveLength(1)
      expect(result.children[0].fullName).toBe('Duplicate Child')
    })
  })

  describe('plan type detection', () => {
    it('detects trust-based plan', () => {
      const result = parseWealthCounselXml(jointTrustXml)

      expect(result.planType).toBe('TRUST_BASED')
    })

    it('detects will-based plan', () => {
      const result = parseWealthCounselXml(singleClientWillXml)

      expect(result.planType).toBe('WILL_BASED')
    })

    it('defaults to will-based when no trust name', () => {
      const result = parseWealthCounselXml(minimalXml)

      expect(result.planType).toBe('WILL_BASED')
    })
  })

  describe('trust extraction', () => {
    it('extracts trust information for trust-based plans', () => {
      const result = parseWealthCounselXml(jointTrustXml)

      expect(result.trust).toBeDefined()
      expect(result.trust?.name).toBe('Christensen Legacy Family Trust')
      expect(result.trust?.isJoint).toBe(true)
      expect(result.trust?.type).toBe('Revocable Living Trust')
    })

    it('extracts trustee names', () => {
      const result = parseWealthCounselXml(jointTrustXml)

      expect(result.trust?.trusteeNames).toContain('Matthew James Christensen')
    })

    it('extracts successor trustee names', () => {
      const result = parseWealthCounselXml(jointTrustXml)

      expect(result.trust?.successorTrusteeNames).toContain('Robert Christensen')
    })

    it('returns undefined trust for will-based plans', () => {
      const result = parseWealthCounselXml(singleClientWillXml)

      expect(result.trust).toBeUndefined()
    })
  })

  describe('will extraction', () => {
    it('extracts will information', () => {
      const result = parseWealthCounselXml(singleClientWillXml)

      expect(result.will).toBeDefined()
      expect(result.will.personalRepNames).toContain('John Jenkins')
    })

    it('extracts will execution date', () => {
      const result = parseWealthCounselXml(singleClientWillXml)

      expect(result.will.executionDate).toBeDefined()
    })
  })

  describe('fiduciary extraction', () => {
    it('extracts trustees', () => {
      const result = parseWealthCounselXml(jointTrustXml)

      expect(result.fiduciaries.trustees.length).toBeGreaterThan(0)
      expect(result.fiduciaries.trustees[0].personName).toBe('Matthew James Christensen')
      expect(result.fiduciaries.trustees[0].roleType).toBe('TRUSTEE')
    })

    it('extracts successor trustees', () => {
      const result = parseWealthCounselXml(jointTrustXml)

      expect(result.fiduciaries.successorTrustees.length).toBeGreaterThan(0)
      expect(result.fiduciaries.successorTrustees[0].personName).toBe('Robert Christensen')
    })

    it('extracts client financial agents', () => {
      const result = parseWealthCounselXml(jointTrustXml)

      // Client's financial agent (from base field without wf suffix)
      expect(result.fiduciaries.client.financialAgents.length).toBeGreaterThan(0)
    })

    it('extracts spouse financial agents', () => {
      const result = parseWealthCounselXml(jointTrustXml)

      // Spouse's financial agent (from field with wf suffix)
      expect(result.fiduciaries.spouse.financialAgents.length).toBeGreaterThan(0)
    })

    it('extracts client healthcare agents', () => {
      const result = parseWealthCounselXml(jointTrustXml)

      expect(result.fiduciaries.client.healthcareAgents.length).toBeGreaterThan(0)
    })

    it('extracts client executors/personal representatives', () => {
      const result = parseWealthCounselXml(singleClientWillXml)

      expect(result.fiduciaries.client.executors.length).toBeGreaterThan(0)
      expect(result.fiduciaries.client.executors[0].personName).toBe('John Jenkins')
    })

    it('extracts client guardians when present', () => {
      const result = parseWealthCounselXml(jointTrustXml)

      // Guardians are extracted from "Will Guardian name" field
      expect(result.fiduciaries.client.guardians.length).toBeGreaterThan(0)
      expect(result.fiduciaries.client.guardians[0].personName).toBe('Robert Christensen')
    })

    it('marks first fiduciary as primary', () => {
      const result = parseWealthCounselXml(jointTrustXml)

      expect(result.fiduciaries.trustees[0].isPrimary).toBe(true)
    })
  })

  describe('beneficiary extraction', () => {
    it('extracts numbered beneficiaries', () => {
      const result = parseWealthCounselXml(singleClientWillXml)

      expect(result.beneficiaries).toHaveLength(2)
      expect(result.beneficiaries[0].name).toBe('Michael Jenkins')
      expect(result.beneficiaries[1].name).toBe('Sarah Jenkins')
    })

    it('extracts beneficiary percentages', () => {
      const result = parseWealthCounselXml(singleClientWillXml)

      expect(result.beneficiaries[0].percentage).toBe('50%')
      expect(result.beneficiaries[1].percentage).toBe('50%')
    })

    it('extracts beneficiary relationships', () => {
      const result = parseWealthCounselXml(singleClientWillXml)

      expect(result.beneficiaries[0].relationship).toBe('Son')
      expect(result.beneficiaries[1].relationship).toBe('Daughter')
    })
  })

  describe('data type handling', () => {
    it('parses boolean values correctly', () => {
      const result = parseWealthCounselXml(mixedTypesXml)

      expect(result.rawFields.get('Joint Trust')).toBe(true)
      expect(result.rawFields.get('Assemble Ancillaries')).toBe(false)
    })

    it('parses number values correctly', () => {
      const result = parseWealthCounselXml(mixedTypesXml)

      expect(result.rawFields.get('Some Number')).toBe(42)
    })

    it('extracts MC options', () => {
      const result = parseWealthCounselXml(mixedTypesXml)

      // mixedTypesXml has no RLT trust name, so trust is undefined
      // MC options are captured in rawFields when no trust is present
      expect(result.rawFields.get('MC RLT Option 1')).toBe('value1')
      expect(result.rawFields.get('MC RLT Option 2')).toBe(true)
    })
  })

  describe('empty value handling', () => {
    it('normalizes "None" to undefined', () => {
      const result = parseWealthCounselXml(emptyValuesXml)

      expect(result.client.email).toBeUndefined()
    })

    it('normalizes empty strings to undefined', () => {
      const result = parseWealthCounselXml(emptyValuesXml)

      expect(result.client.phone).toBeUndefined()
    })
  })

  describe('metadata extraction', () => {
    it('extracts client ID', () => {
      const result = parseWealthCounselXml(singleClientWillXml)

      expect(result.clientId).toBe('11111111111111111111')
    })

    it('extracts data file version', () => {
      const result = parseWealthCounselXml(singleClientWillXml)

      expect(result.dataFileVersion).toBe('2.5')
    })

    it('provides raw fields for debugging', () => {
      const result = parseWealthCounselXml(singleClientWillXml)

      expect(result.rawFields).toBeInstanceOf(Map)
      expect(result.rawFields.size).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('handles empty XML', () => {
      const result = parseWealthCounselXml(emptyXml)

      expect(result.client.fullName).toBeUndefined()
      expect(result.children).toHaveLength(0)
      expect(result.beneficiaries).toHaveLength(0)
    })

    it('handles XML with only whitespace values', () => {
      const whitespaceXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<wc:set xmlns:wc="http://counsel.com">
<wc:data key="Client name"><wc:repeat><wc:string>   </wc:string></wc:repeat></wc:data>
</wc:set>`

      const result = parseWealthCounselXml(whitespaceXml)

      // Whitespace-only names should be normalized to undefined
      expect(result.client.fullName).toBeUndefined()
    })
  })
})

// ===================================
// SUMMARY FUNCTION TESTS
// ===================================

describe('summarizeParsedData', () => {
  it('creates client summary for single client', () => {
    const parsed = parseWealthCounselXml(singleClientWillXml)
    const summary = summarizeParsedData(parsed)

    expect(summary.clientSummary).toContain('Sandra Lynn Jenkins')
  })

  it('creates client summary for joint clients', () => {
    const parsed = parseWealthCounselXml(jointTrustXml)
    const summary = summarizeParsedData(parsed)

    expect(summary.clientSummary).toContain('Matthew James Christensen')
    expect(summary.clientSummary).toContain('Desiree Marie Christensen')
  })

  it('includes child count in summary', () => {
    const parsed = parseWealthCounselXml(jointTrustXml)
    const summary = summarizeParsedData(parsed)

    expect(summary.clientSummary).toContain('1 children')
  })

  it('creates plan summary for trust-based plan', () => {
    const parsed = parseWealthCounselXml(jointTrustXml)
    const summary = summarizeParsedData(parsed)

    expect(summary.planSummary).toContain('Christensen Legacy Family Trust')
    expect(summary.planSummary).toContain('Joint')
  })

  it('creates plan summary for will-based plan', () => {
    const parsed = parseWealthCounselXml(singleClientWillXml)
    const summary = summarizeParsedData(parsed)

    expect(summary.planSummary).toBe('Will-Based Plan')
  })

  it('counts roles by category', () => {
    const parsed = parseWealthCounselXml(jointTrustXml)
    const summary = summarizeParsedData(parsed)

    expect(summary.roleCounts.trustees).toBeGreaterThan(0)
    expect(summary.roleCounts.successorTrustees).toBeGreaterThan(0)
    expect(summary.roleCounts.beneficiaries).toBeGreaterThan(0)
  })

  it('provides field count', () => {
    const parsed = parseWealthCounselXml(jointTrustXml)
    const summary = summarizeParsedData(parsed)

    expect(summary.fieldCount).toBeGreaterThan(0)
  })
})

// ===================================
// REAL XML FILE TESTS
// ===================================

describe('parseWealthCounselXml with real anonymized files', () => {
  describe.runIf(realJointTrustXml.length > 0)('joint-trust-plan.xml (anonymized Christensen)', () => {
    it('parses client information correctly', () => {
      const result = parseWealthCounselXml(realJointTrustXml)

      expect(result.client.fullName).toBe('John Smith')
      expect(result.client.firstName).toBe('John')
      expect(result.client.lastName).toBe('Smith')
      expect(result.client.email).toBe('john.smith@example.com')
    })

    it('parses spouse information correctly', () => {
      const result = parseWealthCounselXml(realJointTrustXml)

      expect(result.spouse).toBeDefined()
      expect(result.spouse?.fullName).toBe('Jane Smith')
      expect(result.spouse?.firstName).toBe('Jane')
      expect(result.spouse?.email).toBe('jane.smith@example.com')
    })

    it('parses children correctly', () => {
      const result = parseWealthCounselXml(realJointTrustXml)

      expect(result.children.length).toBeGreaterThanOrEqual(1)
      expect(result.children[0].fullName).toBe('Tommy Smith')
    })

    it('detects trust-based plan type', () => {
      const result = parseWealthCounselXml(realJointTrustXml)

      expect(result.planType).toBe('TRUST_BASED')
    })

    it('parses trust information correctly', () => {
      const result = parseWealthCounselXml(realJointTrustXml)

      expect(result.trust).toBeDefined()
      expect(result.trust?.name).toContain('Smith')
      expect(result.trust?.isJoint).toBe(true)
    })

    it('extracts trustees from multi-value repeat elements', () => {
      const result = parseWealthCounselXml(realJointTrustXml)

      // This tests the fix for multiple <wc:string> in a single <wc:repeat>
      expect(result.fiduciaries.trustees.length).toBe(2)
      expect(result.fiduciaries.trustees.map(t => t.personName)).toContain('John Smith')
      expect(result.fiduciaries.trustees.map(t => t.personName)).toContain('Jane Smith')
    })

    it('extracts client financial agents', () => {
      const result = parseWealthCounselXml(realJointTrustXml)

      // Client's financial agent is in client fiduciaries
      expect(result.fiduciaries.client.financialAgents.length).toBe(1)
      expect(result.fiduciaries.client.financialAgents[0].forPerson).toBe('CLIENT')
    })

    it('extracts spouse financial agents', () => {
      const result = parseWealthCounselXml(realJointTrustXml)

      // Spouse's financial agent is in spouse fiduciaries
      expect(result.fiduciaries.spouse.financialAgents.length).toBe(1)
      expect(result.fiduciaries.spouse.financialAgents[0].forPerson).toBe('SPOUSE')
    })

    it('extracts client healthcare agents', () => {
      const result = parseWealthCounselXml(realJointTrustXml)

      expect(result.fiduciaries.client.healthcareAgents.length).toBe(1)
    })

    it('extracts spouse healthcare agents', () => {
      const result = parseWealthCounselXml(realJointTrustXml)

      expect(result.fiduciaries.spouse.healthcareAgents.length).toBe(1)
    })

    it('extracts client executors', () => {
      const result = parseWealthCounselXml(realJointTrustXml)

      expect(result.fiduciaries.client.executors.length).toBeGreaterThanOrEqual(1)
    })

    it('extracts spouse executors', () => {
      const result = parseWealthCounselXml(realJointTrustXml)

      expect(result.fiduciaries.spouse.executors.length).toBeGreaterThanOrEqual(1)
    })

    it('extracts beneficiaries', () => {
      const result = parseWealthCounselXml(realJointTrustXml)

      expect(result.beneficiaries.length).toBeGreaterThanOrEqual(1)
      expect(result.beneficiaries[0].name).toBe('Tommy Smith')
    })

    it('has many raw fields (real files have 500+ fields)', () => {
      const result = parseWealthCounselXml(realJointTrustXml)

      // Real WealthCounsel exports have hundreds of fields
      expect(result.rawFields.size).toBeGreaterThan(500)
    })
  })

  describe.runIf(realSingleWillXml.length > 0)('single-will-plan.xml (anonymized Jenkins)', () => {
    it('parses client information correctly', () => {
      const result = parseWealthCounselXml(realSingleWillXml)

      expect(result.client.fullName).toBe('Alice Brown')
      expect(result.client.firstName).toBe('Alice')
      expect(result.client.lastName).toBe('Brown')
      expect(result.client.email).toBe('alice.brown@example.com')
    })

    it('has no spouse for single client', () => {
      const result = parseWealthCounselXml(realSingleWillXml)

      expect(result.spouse).toBeUndefined()
    })

    it('has no children', () => {
      const result = parseWealthCounselXml(realSingleWillXml)

      expect(result.children.length).toBe(0)
    })

    it('detects will-based plan type', () => {
      const result = parseWealthCounselXml(realSingleWillXml)

      expect(result.planType).toBe('WILL_BASED')
    })

    it('has no trust for will-based plan', () => {
      const result = parseWealthCounselXml(realSingleWillXml)

      expect(result.trust).toBeUndefined()
    })

    it('extracts client executors', () => {
      const result = parseWealthCounselXml(realSingleWillXml)

      // Single client - executors are in client fiduciaries
      expect(result.fiduciaries.client.executors.length).toBeGreaterThanOrEqual(1)
      expect(result.fiduciaries.client.executors.map(e => e.personName)).toContain('Emily Davis')
    })

    it('extracts client financial agent', () => {
      const result = parseWealthCounselXml(realSingleWillXml)

      expect(result.fiduciaries.client.financialAgents.length).toBe(1)
      expect(result.fiduciaries.client.financialAgents[0].personName).toBe('Emily Davis')
    })

    it('extracts client healthcare agent', () => {
      const result = parseWealthCounselXml(realSingleWillXml)

      expect(result.fiduciaries.client.healthcareAgents.length).toBe(1)
      expect(result.fiduciaries.client.healthcareAgents[0].personName).toBe('Emily Davis')
    })

    it('extracts beneficiaries', () => {
      const result = parseWealthCounselXml(realSingleWillXml)

      expect(result.beneficiaries.length).toBe(1)
      expect(result.beneficiaries[0].name).toBe('Emily Davis')
      expect(result.beneficiaries[0].relationship).toBe('Niece')
    })

    it('has many raw fields', () => {
      const result = parseWealthCounselXml(realSingleWillXml)

      // Real WealthCounsel exports have hundreds of fields
      expect(result.rawFields.size).toBeGreaterThan(400)
    })
  })
})
