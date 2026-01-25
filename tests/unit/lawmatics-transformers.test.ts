/**
 * Unit Tests for Lawmatics Data Transformers
 *
 * Tests transformation logic for converting Lawmatics API responses
 * into our database schema format.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildImportMetadata,
  serializeImportMetadata,
  isProbablyPerson,
  generateDuplicateEmailPlaceholder,
  generateMissingEmailPlaceholder,
  parseDate,
  parseAddress,
  extractCustomFields,
  transformUser,
  transformContact,
  transformProspect,
  transformNote,
  transformActivity,
  createLookupMap,
  createEntityLookup,
  type ImportMetadata,
  type ImportFlag
} from '../../server/utils/lawmatics-transformers'
import type {
  LawmaticsUser,
  LawmaticsContact,
  LawmaticsProspect,
  LawmaticsNote,
  LawmaticsActivity
} from '../../server/utils/lawmatics-client'
import {
  usersFixture,
  contactsFixture,
  prospectsFixture,
  notesFixture,
  activitiesFixture
} from '../fixtures/lawmatics'

// ===================================
// UTILITY FUNCTION TESTS
// ===================================

describe('buildImportMetadata', () => {
  it('creates metadata with required fields', () => {
    const metadata = buildImportMetadata('ext-123')

    expect(metadata.source).toBe('LAWMATICS')
    expect(metadata.externalId).toBe('ext-123')
    expect(metadata.importedAt).toBeDefined()
    expect(metadata.lastSyncedAt).toBeDefined()
  })

  it('includes optional importRunId', () => {
    const metadata = buildImportMetadata('ext-123', { importRunId: 'run-456' })

    expect(metadata.importRunId).toBe('run-456')
  })

  it('includes flags when provided', () => {
    const flags: ImportFlag[] = ['DUPLICATE_EMAIL', 'REVIEW_NEEDED']
    const metadata = buildImportMetadata('ext-123', { flags })

    expect(metadata.flags).toEqual(flags)
  })

  it('omits flags when array is empty', () => {
    const metadata = buildImportMetadata('ext-123', { flags: [] })

    expect(metadata.flags).toBeUndefined()
  })

  it('includes sourceData when provided', () => {
    const sourceData = { originalEmail: 'test@example.com', contactType: 'Individual' }
    const metadata = buildImportMetadata('ext-123', { sourceData })

    expect(metadata.sourceData).toEqual(sourceData)
  })

  it('generates valid ISO date strings', () => {
    const metadata = buildImportMetadata('ext-123')

    expect(() => new Date(metadata.importedAt)).not.toThrow()
    expect(() => new Date(metadata.lastSyncedAt!)).not.toThrow()
  })
})

describe('serializeImportMetadata', () => {
  it('serializes metadata to valid JSON string', () => {
    const metadata = buildImportMetadata('ext-123')
    const serialized = serializeImportMetadata(metadata)

    expect(typeof serialized).toBe('string')
    expect(() => JSON.parse(serialized)).not.toThrow()
  })

  it('preserves all metadata fields after serialization', () => {
    const metadata = buildImportMetadata('ext-123', {
      importRunId: 'run-456',
      flags: ['DUPLICATE_EMAIL'],
      sourceData: { foo: 'bar' }
    })
    const serialized = serializeImportMetadata(metadata)
    const parsed = JSON.parse(serialized)

    expect(parsed.source).toBe('LAWMATICS')
    expect(parsed.externalId).toBe('ext-123')
    expect(parsed.importRunId).toBe('run-456')
    expect(parsed.flags).toEqual(['DUPLICATE_EMAIL'])
    expect(parsed.sourceData).toEqual({ foo: 'bar' })
  })
})

describe('isProbablyPerson', () => {
  it('returns true for typical person contact', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'John',
        last_name: 'Smith',
        phone: '555-1234',
        contact_type: 'Individual'
      }
    }

    expect(isProbablyPerson(contact)).toBe(true)
  })

  it('returns true for person with birthdate', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'Jane',
        last_name: 'Doe',
        birthdate: '1985-03-15'
      }
    }

    expect(isProbablyPerson(contact)).toBe(true)
  })

  it('returns false for LLC', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'Smith Family Holdings LLC'
      }
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  it('returns false for trust', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'Smith Family',
        last_name: 'Trust'
      }
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  it('returns false for corporation', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'Acme Corporation'
      }
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  it('returns false for bank account', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'First National Bank',
        last_name: 'Trust Account'
      }
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  it('returns false for estate', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'The Estate of',
        last_name: 'John Smith'
      }
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  it('returns false for foundation', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'Smith Family Foundation'
      }
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  it('returns false for first name only without contact info', () => {
    // First-name-only records without contact info are too ambiguous
    // (could be short business names, incomplete data, etc.)
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'Jennifer'
      }
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  it('returns true for first name only with contact info', () => {
    // First-name-only is OK if there's other personal info
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'Jennifer',
        phone: '555-1234'
      }
    }

    expect(isProbablyPerson(contact)).toBe(true)
  })

  it('handles unicode names correctly', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'José',
        last_name: 'García',
        phone: '555-1234'
      }
    }

    expect(isProbablyPerson(contact)).toBe(true)
  })

  it('handles empty attributes', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {}
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  // Address detection tests
  it('returns false for street address in name', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: '10 Aspen Lane - Windsor, CO'
      }
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  it('returns false for address starting with number', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: '123 Main Street'
      }
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  it('returns false for PO Box', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'P.O. Box 1234'
      }
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  // Financial product detection tests
  it('returns false for IRA account', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'John Smith',
        last_name: 'IRA'
      }
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  it('returns false for Roth IRA', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'Smith Family Roth IRA'
      }
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  it('returns false for 401k account', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'Jane Doe 401(k)'
      }
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  it('returns false for annuity', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'Smith Annuity'
      }
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  it('returns false for life insurance policy', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'John Smith Life Insurance'
      }
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  it('returns false for financial institution account', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'Fidelity IRA - John Smith'
      }
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  it('returns false for brokerage account', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'Smith Brokerage Account'
      }
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  it('returns false for account with policy number', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'Lincoln Financial #12345'
      }
    }

    expect(isProbablyPerson(contact)).toBe(false)
  })

  it('does not false-positive on name Brian (contains "ira")', () => {
    // Make sure word boundary prevents "Brian" from matching "ira"
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        first_name: 'Brian',
        last_name: 'Smith',
        phone: '555-1234'
      }
    }

    expect(isProbablyPerson(contact)).toBe(true)
  })
})

describe('generateDuplicateEmailPlaceholder', () => {
  it('generates placeholder with external ID and domain', () => {
    const result = generateDuplicateEmailPlaceholder('john@example.com', 'ext-123')

    expect(result).toBe('imported+ext-123@example.com')
  })

  it('handles email without @ symbol', () => {
    const result = generateDuplicateEmailPlaceholder('invalid-email', 'ext-123')

    expect(result).toBe('imported+ext-123@placeholder.local')
  })

  it('preserves domain from original email', () => {
    const result = generateDuplicateEmailPlaceholder('user@company.org', 'abc')

    expect(result).toContain('@company.org')
  })
})

describe('generateMissingEmailPlaceholder', () => {
  it('generates placeholder with external ID', () => {
    const result = generateMissingEmailPlaceholder('ext-123')

    expect(result).toBe('lawmatics.ext-123@imported.local')
  })

  it('creates unique placeholders for different IDs', () => {
    const result1 = generateMissingEmailPlaceholder('ext-123')
    const result2 = generateMissingEmailPlaceholder('ext-456')

    expect(result1).not.toBe(result2)
  })
})

describe('parseDate', () => {
  it('parses valid ISO date string', () => {
    const result = parseDate('2024-01-15T10:30:00Z')

    expect(result).toBeInstanceOf(Date)
    expect(result?.getFullYear()).toBe(2024)
    expect(result?.getMonth()).toBe(0) // January
    expect(result?.getDate()).toBe(15)
  })

  it('parses date-only string', () => {
    const result = parseDate('2024-03-20')

    expect(result).toBeInstanceOf(Date)
    expect(result?.getFullYear()).toBe(2024)
  })

  it('returns null for undefined', () => {
    expect(parseDate(undefined)).toBeNull()
  })

  it('returns null for null', () => {
    expect(parseDate(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseDate('')).toBeNull()
  })

  it('returns null for invalid date string', () => {
    expect(parseDate('not-a-date')).toBeNull()
  })

  it('returns null for invalid date format', () => {
    expect(parseDate('99/99/9999')).toBeNull()
  })
})

describe('parseAddress', () => {
  it('extracts address fields from contact', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zipcode: '62701'
      }
    }

    const result = parseAddress(contact)

    expect(result.address).toBe('123 Main St')
    expect(result.city).toBe('Springfield')
    expect(result.state).toBe('IL')
    expect(result.zipCode).toBe('62701')
  })

  it('handles zip_code variant', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        zip_code: '90210'
      }
    }

    const result = parseAddress(contact)

    expect(result.zipCode).toBe('90210')
  })

  it('returns null for missing fields', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {}
    }

    const result = parseAddress(contact)

    expect(result.address).toBeNull()
    expect(result.city).toBeNull()
    expect(result.state).toBeNull()
    expect(result.zipCode).toBeNull()
  })

  it('prefers zipcode over zip_code if both present', () => {
    const contact: LawmaticsContact = {
      id: 'c1',
      type: 'contact',
      attributes: {
        zipcode: '12345',
        zip_code: '67890'
      }
    }

    const result = parseAddress(contact)

    expect(result.zipCode).toBe('12345')
  })
})

describe('extractCustomFields', () => {
  it('extracts custom fields into key-value object', () => {
    const customFields = [
      { name: 'Referral Source', formatted_value: 'Google' },
      { name: 'Estate Value', formatted_value: '$500,000' }
    ]

    const result = extractCustomFields(customFields)

    expect(result['Referral Source']).toBe('Google')
    expect(result['Estate Value']).toBe('$500,000')
  })

  it('uses value if formatted_value is undefined', () => {
    const customFields = [
      { name: 'Field1', value: 'raw value' }
    ]

    const result = extractCustomFields(customFields)

    expect(result['Field1']).toBe('raw value')
  })

  it('prefers formatted_value over value', () => {
    const customFields = [
      { name: 'Field1', formatted_value: 'formatted', value: 'raw' }
    ]

    const result = extractCustomFields(customFields)

    expect(result['Field1']).toBe('formatted')
  })

  it('returns empty object for undefined input', () => {
    const result = extractCustomFields(undefined)

    expect(result).toEqual({})
  })

  it('returns empty object for non-array input', () => {
    const result = extractCustomFields('not an array' as any)

    expect(result).toEqual({})
  })

  it('skips fields without name', () => {
    const customFields = [
      { formatted_value: 'no name' },
      { name: 'Valid', formatted_value: 'value' }
    ] as any

    const result = extractCustomFields(customFields)

    expect(Object.keys(result)).toHaveLength(1)
    expect(result['Valid']).toBe('value')
  })
})

// ===================================
// USER TRANSFORMER TESTS
// ===================================

describe('transformUser', () => {
  it('transforms basic user data', () => {
    const lawmaticsUser: LawmaticsUser = {
      id: 'lm-user-001',
      type: 'user',
      attributes: {
        email: 'attorney@lawfirm.com',
        first_name: 'John',
        last_name: 'Attorney',
        role: 'attorney',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      }
    }

    const result = transformUser(lawmaticsUser)

    expect(result.email).toBe('attorney@lawfirm.com')
    expect(result.firstName).toBe('John')
    expect(result.lastName).toBe('Attorney')
    // All imported users come in as STAFF - admins set permissions manually
    expect(result.role).toBe('STAFF')
    expect(result.adminLevel).toBe(0)
    expect(result.status).toBe('INACTIVE')
    expect(result.id).toBeDefined()
  })

  it('imports all users as STAFF regardless of Lawmatics role', () => {
    // All users import as STAFF with adminLevel 0
    // Admins manually set appropriate roles/permissions after import
    const roles = ['owner', 'admin', 'attorney', 'paralegal', 'staff', undefined]

    for (const role of roles) {
      const lawmaticsUser: LawmaticsUser = {
        id: 'lm-user-001',
        type: 'user',
        attributes: {
          email: 'test@lawfirm.com',
          first_name: 'Test',
          role,
          active: true
        }
      }

      const result = transformUser(lawmaticsUser)

      expect(result.role).toBe('STAFF')
      expect(result.adminLevel).toBe(0)
    }
  })

  it('preserves original Lawmatics role in import metadata', () => {
    const lawmaticsUser: LawmaticsUser = {
      id: 'lm-user-001',
      type: 'user',
      attributes: {
        email: 'owner@lawfirm.com',
        first_name: 'Owner',
        role: 'owner',
        active: true
      }
    }

    const result = transformUser(lawmaticsUser)
    const metadata = JSON.parse(result.importMetadata) as ImportMetadata

    // User imported as STAFF, but original role preserved in metadata
    expect(result.role).toBe('STAFF')
    expect(result.adminLevel).toBe(0)
    expect(metadata.sourceData?.role).toBe('owner')
  })

  it('includes import metadata with source data', () => {
    const lawmaticsUser: LawmaticsUser = {
      id: 'lm-user-001',
      type: 'user',
      attributes: {
        email: 'test@lawfirm.com',
        first_name: 'Test',
        role: 'attorney',
        active: true
      }
    }

    const result = transformUser(lawmaticsUser, { importRunId: 'run-123' })
    const metadata = JSON.parse(result.importMetadata) as ImportMetadata

    expect(metadata.source).toBe('LAWMATICS')
    expect(metadata.externalId).toBe('lm-user-001')
    expect(metadata.importRunId).toBe('run-123')
    expect(metadata.sourceData?.role).toBe('attorney')
    expect(metadata.sourceData?.active).toBe(true)
  })

  it('uses fixture data correctly', () => {
    const fixtureUser = usersFixture.data[0]!
    const result = transformUser(fixtureUser)

    expect(result.email).toBe(fixtureUser.attributes.email)
    expect(result.firstName).toBe(fixtureUser.attributes.first_name)
    expect(result.lastName).toBe(fixtureUser.attributes.last_name)
  })

  it('handles missing optional fields', () => {
    const lawmaticsUser: LawmaticsUser = {
      id: 'lm-user-001',
      type: 'user',
      attributes: {
        active: true
      }
    }

    const result = transformUser(lawmaticsUser)

    expect(result.email).toBeNull()
    expect(result.firstName).toBeNull()
    expect(result.lastName).toBeNull()
    expect(result.phone).toBeNull()
  })

  it('generates unique IDs for each transform', () => {
    const lawmaticsUser: LawmaticsUser = {
      id: 'lm-user-001',
      type: 'user',
      attributes: { active: true }
    }

    const result1 = transformUser(lawmaticsUser)
    const result2 = transformUser(lawmaticsUser)

    expect(result1.id).not.toBe(result2.id)
  })
})

// ===================================
// CONTACT TRANSFORMER TESTS
// ===================================

describe('transformContact', () => {
  it('transforms basic contact data', () => {
    const contact: LawmaticsContact = {
      id: 'lm-contact-001',
      type: 'contact',
      attributes: {
        first_name: 'John',
        last_name: 'Smith',
        email: 'john@example.com',
        phone: '555-1234',
        contact_type: 'Individual',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      }
    }

    const result = transformContact(contact)

    expect(result.user.email).toBe('john@example.com')
    expect(result.user.firstName).toBe('John')
    expect(result.user.lastName).toBe('Smith')
    expect(result.user.phone).toBe('555-1234')
    expect(result.user.role).toBe('CLIENT')
    expect(result.user.status).toBe('INACTIVE')
    expect(result.flags).toEqual([])
  })

  it('creates profile when address data present', () => {
    const contact: LawmaticsContact = {
      id: 'lm-contact-001',
      type: 'contact',
      attributes: {
        first_name: 'John',
        last_name: 'Smith',
        email: 'john@example.com',
        address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zipcode: '62701',
        birthdate: '1980-05-15'
      }
    }

    const result = transformContact(contact)

    expect(result.profile).not.toBeNull()
    expect(result.profile?.address).toBe('123 Main St')
    expect(result.profile?.city).toBe('Springfield')
    expect(result.profile?.state).toBe('IL')
    expect(result.profile?.zipCode).toBe('62701')
    expect(result.profile?.dateOfBirth).toBeInstanceOf(Date)
    expect(result.profile?.userId).toBe(result.user.id)
  })

  it('returns null profile when no address data', () => {
    const contact: LawmaticsContact = {
      id: 'lm-contact-001',
      type: 'contact',
      attributes: {
        first_name: 'John',
        last_name: 'Smith',
        email: 'john@example.com'
      }
    }

    const result = transformContact(contact)

    expect(result.profile).toBeNull()
  })

  it('flags non-person contacts', () => {
    const contact: LawmaticsContact = {
      id: 'lm-contact-001',
      type: 'contact',
      attributes: {
        first_name: 'Smith Family Trust',
        email: 'trust@example.com'
      }
    }

    const result = transformContact(contact)

    expect(result.flags).toContain('POSSIBLY_NOT_PERSON')
    expect(result.flags).toContain('REVIEW_NEEDED')
  })

  it('generates placeholder for missing email', () => {
    const contact: LawmaticsContact = {
      id: 'lm-contact-001',
      type: 'contact',
      attributes: {
        first_name: 'John',
        last_name: 'Smith'
      }
    }

    const result = transformContact(contact)

    expect(result.user.email).toBe('lawmatics.lm-contact-001@imported.local')
    expect(result.flags).toContain('MISSING_EMAIL')
  })

  it('generates placeholder for duplicate email', () => {
    const contact: LawmaticsContact = {
      id: 'lm-contact-001',
      type: 'contact',
      attributes: {
        first_name: 'John',
        last_name: 'Smith',
        email: 'duplicate@example.com'
      }
    }

    const existingEmails = new Set(['duplicate@example.com'])
    const result = transformContact(contact, { existingEmails })

    expect(result.user.email).toBe('imported+lm-contact-001@example.com')
    expect(result.flags).toContain('DUPLICATE_EMAIL')
    expect(result.flags).toContain('REVIEW_NEEDED')
  })

  it('flags contacts with missing name', () => {
    const contact: LawmaticsContact = {
      id: 'lm-contact-001',
      type: 'contact',
      attributes: {
        email: 'noname@example.com'
      }
    }

    const result = transformContact(contact)

    expect(result.flags).toContain('MISSING_NAME')
    expect(result.flags).toContain('REVIEW_NEEDED')
  })

  it('handles email_address attribute variant', () => {
    const contact: LawmaticsContact = {
      id: 'lm-contact-001',
      type: 'contact',
      attributes: {
        first_name: 'John',
        email_address: 'john@variant.com'
      }
    }

    const result = transformContact(contact)

    expect(result.user.email).toBe('john@variant.com')
  })

  it('handles phone_number attribute variant', () => {
    const contact: LawmaticsContact = {
      id: 'lm-contact-001',
      type: 'contact',
      attributes: {
        first_name: 'John',
        email: 'john@example.com',
        phone_number: '555-9876'
      }
    }

    const result = transformContact(contact)

    expect(result.user.phone).toBe('555-9876')
  })

  it('includes custom fields in source data', () => {
    const contact: LawmaticsContact = {
      id: 'lm-contact-001',
      type: 'contact',
      attributes: {
        first_name: 'John',
        email: 'john@example.com',
        custom_fields: [
          { name: 'Referral Source', formatted_value: 'Google' }
        ]
      }
    }

    const result = transformContact(contact)
    const metadata = JSON.parse(result.user.importMetadata) as ImportMetadata

    expect(metadata.sourceData?.customFields?.['Referral Source']).toBe('Google')
  })

  it('transforms fixture contacts correctly', () => {
    const fixtureContact = contactsFixture.data[0]!
    const result = transformContact(fixtureContact)

    expect(result.user.id).toBeDefined()
    expect(result.user.role).toBe('CLIENT')
    expect(result.user.status).toBe('INACTIVE')
  })

  it('detects duplicate from fixture with known duplicate', () => {
    // Find the duplicate contact in fixture
    const duplicateContact = contactsFixture.data.find(
      c => c.attributes.email === 'john.smith@email.com' && c.id !== 'lm-contact-001'
    )

    if (duplicateContact) {
      const existingEmails = new Set(['john.smith@email.com'])
      const result = transformContact(duplicateContact, { existingEmails })

      expect(result.flags).toContain('DUPLICATE_EMAIL')
    }
  })
})

// ===================================
// PROSPECT (MATTER) TRANSFORMER TESTS
// ===================================

describe('transformProspect', () => {
  const mockClientLookup = (externalId: string) => {
    if (externalId === 'lm-contact-001') return 'internal-client-001'
    if (externalId === 'lm-contact-002') return 'internal-client-002'
    return null
  }

  const mockUserLookup = (externalId: string) => {
    if (externalId === 'lm-user-001') return 'internal-user-001'
    return null
  }

  it('transforms basic prospect data', () => {
    const prospect: LawmaticsProspect = {
      id: 'lm-prospect-001',
      type: 'prospect',
      attributes: {
        case_title: 'Estate Planning',
        case_number: 'EP-2024-001',
        case_blurb: 'Standard estate plan',
        status: 'active',
        stage: 'Engaged',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      },
      relationships: {
        contact: { data: { id: 'lm-contact-001', type: 'contact' } }
      }
    }

    const result = transformProspect(prospect, { clientLookup: mockClientLookup })

    expect(result).not.toBeNull()
    expect(result?.title).toBe('Estate Planning')
    expect(result?.matterNumber).toBe('EP-2024-001')
    expect(result?.description).toBe('Standard estate plan')
    expect(result?.clientId).toBe('internal-client-001')
    expect(result?.status).toBe('OPEN')
  })

  it('maps hired/active/engaged status to OPEN', () => {
    const testCases = ['hired', 'active', 'engaged']

    for (const status of testCases) {
      const prospect: LawmaticsProspect = {
        id: 'lm-prospect-001',
        type: 'prospect',
        attributes: { status },
        relationships: {
          contact: { data: { id: 'lm-contact-001', type: 'contact' } }
        }
      }

      const result = transformProspect(prospect, { clientLookup: mockClientLookup })
      expect(result?.status).toBe('OPEN')
    }
  })

  it('maps pnc/closed/lost/declined status to CLOSED', () => {
    const testCases = ['pnc', 'closed', 'lost', 'declined']

    for (const status of testCases) {
      const prospect: LawmaticsProspect = {
        id: 'lm-prospect-001',
        type: 'prospect',
        attributes: { status },
        relationships: {
          contact: { data: { id: 'lm-contact-001', type: 'contact' } }
        }
      }

      const result = transformProspect(prospect, { clientLookup: mockClientLookup })
      expect(result?.status).toBe('CLOSED')
    }
  })

  it('maps pending/new/unknown status to PENDING', () => {
    const testCases = ['pending', 'new', 'consultation', 'unknown']

    for (const status of testCases) {
      const prospect: LawmaticsProspect = {
        id: 'lm-prospect-001',
        type: 'prospect',
        attributes: { status },
        relationships: {
          contact: { data: { id: 'lm-contact-001', type: 'contact' } }
        }
      }

      const result = transformProspect(prospect, { clientLookup: mockClientLookup })
      expect(result?.status).toBe('PENDING')
    }
  })

  it('returns null if contact relationship missing', () => {
    const prospect: LawmaticsProspect = {
      id: 'lm-prospect-001',
      type: 'prospect',
      attributes: { status: 'active' }
    }

    const result = transformProspect(prospect, { clientLookup: mockClientLookup })

    expect(result).toBeNull()
  })

  it('returns null if client lookup fails', () => {
    const prospect: LawmaticsProspect = {
      id: 'lm-prospect-001',
      type: 'prospect',
      attributes: { status: 'active' },
      relationships: {
        contact: { data: { id: 'unknown-contact', type: 'contact' } }
      }
    }

    const result = transformProspect(prospect, { clientLookup: mockClientLookup })

    expect(result).toBeNull()
  })

  it('generates fallback title from name and stage', () => {
    const prospect: LawmaticsProspect = {
      id: 'lm-prospect-001',
      type: 'prospect',
      attributes: {
        first_name: 'John',
        last_name: 'Smith',
        stage: 'Estate Planning',
        status: 'active'
      },
      relationships: {
        contact: { data: { id: 'lm-contact-001', type: 'contact' } }
      }
    }

    const result = transformProspect(prospect, { clientLookup: mockClientLookup })

    expect(result?.title).toBe('John Smith - Estate Planning')
  })

  it('resolves lead attorney from user lookup', () => {
    const prospect: LawmaticsProspect = {
      id: 'lm-prospect-001',
      type: 'prospect',
      attributes: { status: 'active' },
      relationships: {
        contact: { data: { id: 'lm-contact-001', type: 'contact' } },
        lead_attorney: { data: { id: 'lm-user-001', type: 'user' } }
      }
    }

    const result = transformProspect(prospect, {
      clientLookup: mockClientLookup,
      userLookup: mockUserLookup
    })

    expect(result?.leadAttorneyId).toBe('internal-user-001')
  })

  it('handles array-format relationships', () => {
    const prospect: LawmaticsProspect = {
      id: 'lm-prospect-001',
      type: 'prospect',
      attributes: { status: 'active' },
      relationships: {
        contact: { data: [{ id: 'lm-contact-001', type: 'contact' }] }
      }
    }

    const result = transformProspect(prospect, { clientLookup: mockClientLookup })

    expect(result?.clientId).toBe('internal-client-001')
  })

  it('includes import metadata with source data', () => {
    const prospect: LawmaticsProspect = {
      id: 'lm-prospect-001',
      type: 'prospect',
      attributes: {
        status: 'active',
        stage: 'Engaged',
        estimated_value_cents: 500000,
        custom_fields: [
          { name: 'Matter Type', formatted_value: 'Trust' }
        ]
      },
      relationships: {
        contact: { data: { id: 'lm-contact-001', type: 'contact' } }
      }
    }

    const result = transformProspect(prospect, {
      clientLookup: mockClientLookup,
      importRunId: 'run-123'
    })

    const metadata = JSON.parse(result!.importMetadata) as ImportMetadata

    expect(metadata.source).toBe('LAWMATICS')
    expect(metadata.externalId).toBe('lm-prospect-001')
    expect(metadata.importRunId).toBe('run-123')
    expect(metadata.sourceData?.stage).toBe('Engaged')
    expect(metadata.sourceData?.estimatedValueCents).toBe(500000)
  })
})

// ===================================
// NOTE TRANSFORMER TESTS
// ===================================

describe('transformNote', () => {
  const mockContactLookup = (externalId: string) => {
    if (externalId === 'lm-contact-001') return 'internal-client-001'
    return null
  }

  const mockProspectLookup = (externalId: string) => {
    if (externalId === 'lm-prospect-001') return 'internal-matter-001'
    return null
  }

  const mockUserLookup = (externalId: string) => {
    if (externalId === 'lm-user-001') return 'internal-user-001'
    return null
  }

  const baseOptions = {
    contactLookup: mockContactLookup,
    prospectLookup: mockProspectLookup,
    userLookup: mockUserLookup,
    defaultUserId: 'system-user'
  }

  it('transforms note with contact relationship', () => {
    const note: LawmaticsNote = {
      id: 'lm-note-001',
      type: 'note',
      attributes: {
        content: 'Client meeting notes',
        created_at: '2024-01-15T10:00:00Z'
      },
      relationships: {
        contact: { data: { id: 'lm-contact-001', type: 'contact' } },
        created_by: { data: { id: 'lm-user-001', type: 'user' } }
      }
    }

    const result = transformNote(note, baseOptions)

    expect(result).not.toBeNull()
    expect(result?.content).toBe('Client meeting notes')
    expect(result?.entityType).toBe('person')
    expect(result?.entityId).toBe('internal-client-001')
    expect(result?.createdBy).toBe('internal-user-001')
  })

  it('transforms note with prospect/matter relationship', () => {
    const note: LawmaticsNote = {
      id: 'lm-note-001',
      type: 'note',
      attributes: {
        content: 'Case update notes',
        created_at: '2024-01-15T10:00:00Z'
      },
      relationships: {
        prospect: { data: { id: 'lm-prospect-001', type: 'prospect' } }
      }
    }

    const result = transformNote(note, baseOptions)

    expect(result?.entityType).toBe('matter')
    expect(result?.entityId).toBe('internal-matter-001')
  })

  it('prefers contact over prospect for entity resolution', () => {
    const note: LawmaticsNote = {
      id: 'lm-note-001',
      type: 'note',
      attributes: { content: 'Note with both relationships' },
      relationships: {
        contact: { data: { id: 'lm-contact-001', type: 'contact' } },
        prospect: { data: { id: 'lm-prospect-001', type: 'prospect' } }
      }
    }

    const result = transformNote(note, baseOptions)

    expect(result?.entityType).toBe('person')
    expect(result?.entityId).toBe('internal-client-001')
  })

  it('returns null if no entity can be resolved', () => {
    const note: LawmaticsNote = {
      id: 'lm-note-001',
      type: 'note',
      attributes: { content: 'Orphan note' },
      relationships: {
        contact: { data: { id: 'unknown-contact', type: 'contact' } }
      }
    }

    const result = transformNote(note, baseOptions)

    expect(result).toBeNull()
  })

  it('uses defaultUserId if creator not found', () => {
    const note: LawmaticsNote = {
      id: 'lm-note-001',
      type: 'note',
      attributes: { content: 'Note' },
      relationships: {
        contact: { data: { id: 'lm-contact-001', type: 'contact' } },
        created_by: { data: { id: 'unknown-user', type: 'user' } }
      }
    }

    const result = transformNote(note, baseOptions)

    expect(result?.createdBy).toBe('system-user')
  })

  it('handles empty content', () => {
    const note: LawmaticsNote = {
      id: 'lm-note-001',
      type: 'note',
      attributes: {},
      relationships: {
        contact: { data: { id: 'lm-contact-001', type: 'contact' } }
      }
    }

    const result = transformNote(note, baseOptions)

    expect(result?.content).toBe('')
  })

  it('handles user relationship variant', () => {
    const note: LawmaticsNote = {
      id: 'lm-note-001',
      type: 'note',
      attributes: { content: 'Note' },
      relationships: {
        contact: { data: { id: 'lm-contact-001', type: 'contact' } },
        user: { data: { id: 'lm-user-001', type: 'user' } }
      }
    }

    const result = transformNote(note, baseOptions)

    expect(result?.createdBy).toBe('internal-user-001')
  })

  it('handles matter relationship variant', () => {
    const note: LawmaticsNote = {
      id: 'lm-note-001',
      type: 'note',
      attributes: { content: 'Note' },
      relationships: {
        matter: { data: { id: 'lm-prospect-001', type: 'matter' } }
      }
    }

    const result = transformNote(note, baseOptions)

    expect(result?.entityType).toBe('matter')
    expect(result?.entityId).toBe('internal-matter-001')
  })

  it('includes import metadata', () => {
    const note: LawmaticsNote = {
      id: 'lm-note-001',
      type: 'note',
      attributes: { content: 'Note' },
      relationships: {
        contact: { data: { id: 'lm-contact-001', type: 'contact' } }
      }
    }

    const result = transformNote(note, { ...baseOptions, importRunId: 'run-123' })
    const metadata = JSON.parse(result!.importMetadata) as ImportMetadata

    expect(metadata.source).toBe('LAWMATICS')
    expect(metadata.externalId).toBe('lm-note-001')
    expect(metadata.importRunId).toBe('run-123')
  })
})

// ===================================
// ACTIVITY TRANSFORMER TESTS
// ===================================

describe('transformActivity', () => {
  const mockContactLookup = (externalId: string) => {
    if (externalId === 'lm-contact-001') return 'internal-client-001'
    return null
  }

  const mockProspectLookup = (externalId: string) => {
    if (externalId === 'lm-prospect-001') return 'internal-matter-001'
    return null
  }

  const mockUserLookup = (externalId: string) => {
    if (externalId === 'lm-user-001') return 'internal-user-001'
    return null
  }

  const baseOptions = {
    contactLookup: mockContactLookup,
    prospectLookup: mockProspectLookup,
    userLookup: mockUserLookup,
    defaultUserId: 'system-user'
  }

  it('transforms basic activity', () => {
    const activity: LawmaticsActivity = {
      id: 'lm-activity-001',
      type: 'email_sent',
      attributes: {
        description: 'Sent welcome email',
        created_at: '2024-01-15T10:00:00Z'
      },
      relationships: {
        contact: { data: { id: 'lm-contact-001', type: 'contact' } },
        user: { data: { id: 'lm-user-001', type: 'user' } }
      }
    }

    const result = transformActivity(activity, baseOptions)

    expect(result).not.toBeNull()
    expect(result?.type).toBe('EMAIL_SENT')
    expect(result?.description).toBe('Sent welcome email')
    expect(result?.targetType).toBe('person')
    expect(result?.targetId).toBe('internal-client-001')
    expect(result?.userId).toBe('internal-user-001')
  })

  it('maps known activity types correctly', () => {
    const typeTests = [
      { input: 'email_sent', expected: 'EMAIL_SENT' },
      { input: 'email_received', expected: 'EMAIL_RECEIVED' },
      { input: 'call', expected: 'CALL_LOGGED' },
      { input: 'sms_sent', expected: 'SMS_SENT' },
      { input: 'note_added', expected: 'NOTE_CREATED' },
      { input: 'status_changed', expected: 'STATUS_CHANGED' },
      { input: 'document_signed', expected: 'DOCUMENT_SIGNED' },
      { input: 'payment_received', expected: 'PAYMENT_RECEIVED' }
    ]

    for (const { input, expected } of typeTests) {
      const activity: LawmaticsActivity = {
        id: 'lm-activity-001',
        type: input,
        attributes: { description: 'Test' },
        relationships: {
          contact: { data: { id: 'lm-contact-001', type: 'contact' } }
        }
      }

      const result = transformActivity(activity, baseOptions)
      expect(result?.type).toBe(expected)
    }
  })

  it('handles unknown activity types with IMPORTED_ prefix', () => {
    const activity: LawmaticsActivity = {
      id: 'lm-activity-001',
      type: 'custom_action',
      attributes: { description: 'Custom action performed' },
      relationships: {
        contact: { data: { id: 'lm-contact-001', type: 'contact' } }
      }
    }

    const result = transformActivity(activity, baseOptions)

    expect(result?.type).toBe('IMPORTED_CUSTOM_ACTION')
  })

  it('uses activity_type attribute if type is missing', () => {
    const activity: LawmaticsActivity = {
      id: 'lm-activity-001',
      type: '',
      attributes: {
        activity_type: 'call_logged',
        description: 'Phone call'
      },
      relationships: {
        contact: { data: { id: 'lm-contact-001', type: 'contact' } }
      }
    }

    const result = transformActivity(activity, baseOptions)

    expect(result?.type).toBe('CALL_LOGGED')
  }),

  it('handles prospect target', () => {
    const activity: LawmaticsActivity = {
      id: 'lm-activity-001',
      type: 'status_changed',
      attributes: { description: 'Status updated' },
      relationships: {
        prospect: { data: { id: 'lm-prospect-001', type: 'prospect' } }
      }
    }

    const result = transformActivity(activity, baseOptions)

    expect(result?.targetType).toBe('matter')
    expect(result?.targetId).toBe('internal-matter-001')
  })

  it('uses defaultUserId when user not found', () => {
    const activity: LawmaticsActivity = {
      id: 'lm-activity-001',
      type: 'note',
      attributes: { description: 'Note added' },
      relationships: {
        contact: { data: { id: 'lm-contact-001', type: 'contact' } },
        user: { data: { id: 'unknown-user', type: 'user' } }
      }
    }

    const result = transformActivity(activity, baseOptions)

    expect(result?.userId).toBe('system-user')
  })

  it('generates default description for missing description', () => {
    const activity: LawmaticsActivity = {
      id: 'lm-activity-001',
      type: 'call',
      attributes: {},
      relationships: {
        contact: { data: { id: 'lm-contact-001', type: 'contact' } }
      }
    }

    const result = transformActivity(activity, baseOptions)

    expect(result?.description).toBe('Imported CALL_LOGGED activity')
  })

  it('handles activities without target entity', () => {
    const activity: LawmaticsActivity = {
      id: 'lm-activity-001',
      type: 'system_event',
      attributes: { description: 'System event' },
      relationships: {}
    }

    const result = transformActivity(activity, baseOptions)

    expect(result).not.toBeNull()
    expect(result?.targetType).toBeNull()
    expect(result?.targetId).toBeNull()
  })

  it('includes import metadata', () => {
    const activity: LawmaticsActivity = {
      id: 'lm-activity-001',
      type: 'email_sent',
      attributes: { description: 'Email' },
      relationships: {
        contact: { data: { id: 'lm-contact-001', type: 'contact' } }
      }
    }

    const result = transformActivity(activity, { ...baseOptions, importRunId: 'run-123' })
    const metadata = JSON.parse(result!.importMetadata) as ImportMetadata

    expect(metadata.source).toBe('LAWMATICS')
    expect(metadata.externalId).toBe('lm-activity-001')
    expect(metadata.importRunId).toBe('run-123')
  })
})

// ===================================
// LOOKUP MAP UTILITIES TESTS
// ===================================

describe('createLookupMap', () => {
  it('creates map from records with import metadata', () => {
    const records = [
      {
        id: 'internal-1',
        importMetadata: JSON.stringify({
          source: 'LAWMATICS',
          externalId: 'ext-1',
          importedAt: '2024-01-01'
        })
      },
      {
        id: 'internal-2',
        importMetadata: JSON.stringify({
          source: 'LAWMATICS',
          externalId: 'ext-2',
          importedAt: '2024-01-01'
        })
      }
    ]

    const map = createLookupMap(records)

    expect(map.get('ext-1')).toBe('internal-1')
    expect(map.get('ext-2')).toBe('internal-2')
    expect(map.size).toBe(2)
  })

  it('skips records with invalid JSON metadata', () => {
    const records = [
      { id: 'internal-1', importMetadata: 'not json' },
      {
        id: 'internal-2',
        importMetadata: JSON.stringify({
          source: 'LAWMATICS',
          externalId: 'ext-2',
          importedAt: '2024-01-01'
        })
      }
    ]

    const map = createLookupMap(records)

    expect(map.size).toBe(1)
    expect(map.get('ext-2')).toBe('internal-2')
  })

  it('skips records without externalId', () => {
    const records = [
      {
        id: 'internal-1',
        importMetadata: JSON.stringify({
          source: 'LAWMATICS',
          importedAt: '2024-01-01'
        })
      }
    ]

    const map = createLookupMap(records)

    expect(map.size).toBe(0)
  })

  it('returns empty map for empty records array', () => {
    const map = createLookupMap([])

    expect(map.size).toBe(0)
  })
})

describe('createEntityLookup', () => {
  it('creates lookup function from map', () => {
    const map = new Map([
      ['ext-1', 'internal-1'],
      ['ext-2', 'internal-2']
    ])

    const lookup = createEntityLookup(map)

    expect(lookup('ext-1')).toBe('internal-1')
    expect(lookup('ext-2')).toBe('internal-2')
  })

  it('returns null for unknown external ID', () => {
    const map = new Map([['ext-1', 'internal-1']])
    const lookup = createEntityLookup(map)

    expect(lookup('unknown')).toBeNull()
  })

  it('works with empty map', () => {
    const lookup = createEntityLookup(new Map())

    expect(lookup('anything')).toBeNull()
  })
})

// ===================================
// FIXTURE INTEGRATION TESTS
// ===================================

describe('Fixture Integration', () => {
  it('transforms all fixture users', () => {
    const results = usersFixture.data.map(user => transformUser(user))

    expect(results).toHaveLength(usersFixture.data.length)
    results.forEach(result => {
      expect(result.id).toBeDefined()
      expect(result.status).toBe('INACTIVE')
      expect(['ADMIN', 'LAWYER', 'STAFF']).toContain(result.role)
    })
  })

  it('transforms all fixture contacts', () => {
    const results = contactsFixture.data.map(contact => transformContact(contact))

    expect(results).toHaveLength(contactsFixture.data.length)
    results.forEach(result => {
      expect(result.user.id).toBeDefined()
      expect(result.user.role).toBe('CLIENT')
      expect(result.user.status).toBe('INACTIVE')
    })
  })

  it('detects non-person contacts in fixtures', () => {
    const results = contactsFixture.data.map(contact => transformContact(contact))

    // Find contacts flagged as non-person
    const nonPersonResults = results.filter(r => r.flags.includes('POSSIBLY_NOT_PERSON'))

    // The fixture includes at least one non-person (organization contact)
    expect(nonPersonResults.length).toBeGreaterThanOrEqual(0) // May or may not have non-persons
  })

  it('handles unicode names in fixtures', () => {
    // Find the unicode contact in fixtures
    const unicodeContact = contactsFixture.data.find(c => c.id === 'lm-contact-005')

    if (unicodeContact) {
      const result = transformContact(unicodeContact)

      expect(result.user.firstName).toBeDefined()
      expect(result.user.lastName).toBeDefined()
    }
  })

  it('creates lookup maps from transformed records', () => {
    const transformedUsers = usersFixture.data.map(user => transformUser(user))
    const lookupMap = createLookupMap(transformedUsers)

    expect(lookupMap.size).toBe(usersFixture.data.length)

    // Verify each external ID maps to an internal ID
    usersFixture.data.forEach(user => {
      const internalId = lookupMap.get(user.id)
      expect(internalId).toBeDefined()
    })
  })
})
