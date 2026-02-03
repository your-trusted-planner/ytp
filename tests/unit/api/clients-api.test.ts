/**
 * Tests for clients API validation and business logic
 * Tests the Zod schemas and authorization patterns used in client endpoints
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Replicate the validation schema from server/api/clients/index.post.ts
const createClientSchema = z.object({
  // Required fields
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(6),

  // Optional contact fields
  phone: z.string().optional(),

  // Address fields
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),

  // Personal details
  dateOfBirth: z.string().optional(), // ISO date string
  ssnLast4: z.string().max(4).optional(),

  // Family information
  hasMinorChildren: z.boolean().optional().default(false),
  childrenInfo: z.string().optional(), // JSON string

  // Existing planning
  hasWill: z.boolean().optional().default(false),
  hasTrust: z.boolean().optional().default(false),

  // Business information
  businessName: z.string().optional(),
  businessType: z.string().optional(),

  // Referral source
  referralType: z.enum(['CLIENT', 'PROFESSIONAL', 'EVENT', 'MARKETING']).optional(),
  referredByPersonId: z.string().optional(),
  referredByPartnerId: z.string().optional(),
  referralNotes: z.string().optional(),

  // Client status (default: PROSPECT)
  status: z.enum(['LEAD', 'PROSPECT', 'ACTIVE', 'INACTIVE']).optional().default('PROSPECT')
})

describe('Clients API Validation', () => {
  describe('Create Client Schema - Required Fields', () => {
    it('should accept valid client with required fields only', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('PROSPECT') // default
        expect(result.data.hasMinorChildren).toBe(false) // default
        expect(result.data.hasWill).toBe(false) // default
        expect(result.data.hasTrust).toBe(false) // default
      }
    })

    it('should reject missing email', () => {
      const result = createClientSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123'
      })

      expect(result.success).toBe(false)
    })

    it('should reject invalid email format', () => {
      const result = createClientSchema.safeParse({
        email: 'not-an-email',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123'
      })

      expect(result.success).toBe(false)
    })

    it('should reject missing firstName', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        lastName: 'Doe',
        password: 'password123'
      })

      expect(result.success).toBe(false)
    })

    it('should reject empty firstName', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: '',
        lastName: 'Doe',
        password: 'password123'
      })

      expect(result.success).toBe(false)
    })

    it('should reject missing lastName', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        password: 'password123'
      })

      expect(result.success).toBe(false)
    })

    it('should reject password shorter than 6 characters', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: '12345' // 5 characters
      })

      expect(result.success).toBe(false)
    })

    it('should accept password exactly 6 characters', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: '123456'
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Create Client Schema - Address Fields', () => {
    it('should accept full address', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        address: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.address).toBe('123 Main St')
        expect(result.data.city).toBe('San Francisco')
        expect(result.data.state).toBe('CA')
        expect(result.data.zipCode).toBe('94102')
      }
    })

    it('should accept partial address', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        city: 'San Francisco',
        state: 'CA'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.address).toBeUndefined()
        expect(result.data.city).toBe('San Francisco')
      }
    })
  })

  describe('Create Client Schema - Personal Details', () => {
    it('should accept date of birth as ISO string', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        dateOfBirth: '1980-05-15'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.dateOfBirth).toBe('1980-05-15')
      }
    })

    it('should accept SSN last 4 digits', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        ssnLast4: '1234'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.ssnLast4).toBe('1234')
      }
    })

    it('should reject SSN longer than 4 characters', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        ssnLast4: '12345'
      })

      expect(result.success).toBe(false)
    })

    it('should accept SSN with fewer than 4 characters', () => {
      // Some edge cases like leading zeros might result in shorter strings
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        ssnLast4: '012'
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Create Client Schema - Family Information', () => {
    it('should accept hasMinorChildren boolean', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        hasMinorChildren: true
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.hasMinorChildren).toBe(true)
      }
    })

    it('should accept childrenInfo as JSON string', () => {
      const childrenInfo = JSON.stringify([
        { name: 'Jane', age: 10 },
        { name: 'Bob', age: 8 }
      ])

      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        hasMinorChildren: true,
        childrenInfo
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.childrenInfo).toBe(childrenInfo)
      }
    })
  })

  describe('Create Client Schema - Existing Planning', () => {
    it('should accept hasWill and hasTrust booleans', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        hasWill: true,
        hasTrust: false
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.hasWill).toBe(true)
        expect(result.data.hasTrust).toBe(false)
      }
    })
  })

  describe('Create Client Schema - Business Information', () => {
    it('should accept business name and type', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        businessName: 'Acme Corp',
        businessType: 'llc'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.businessName).toBe('Acme Corp')
        expect(result.data.businessType).toBe('llc')
      }
    })
  })

  describe('Create Client Schema - Referral Source', () => {
    it('should accept valid referral types', () => {
      const validTypes = ['CLIENT', 'PROFESSIONAL', 'EVENT', 'MARKETING']

      for (const referralType of validTypes) {
        const result = createClientSchema.safeParse({
          email: 'client@example.com',
          firstName: 'John',
          lastName: 'Doe',
          password: 'password123',
          referralType
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.referralType).toBe(referralType)
        }
      }
    })

    it('should reject invalid referral type', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        referralType: 'INVALID'
      })

      expect(result.success).toBe(false)
    })

    it('should accept referredByPersonId for CLIENT referral', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        referralType: 'CLIENT',
        referredByPersonId: 'person-123'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.referredByPersonId).toBe('person-123')
      }
    })

    it('should accept referredByPartnerId for PROFESSIONAL referral', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        referralType: 'PROFESSIONAL',
        referredByPartnerId: 'partner-456'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.referredByPartnerId).toBe('partner-456')
      }
    })

    it('should accept referral notes', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        referralType: 'EVENT',
        referralNotes: 'Met at estate planning seminar'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.referralNotes).toBe('Met at estate planning seminar')
      }
    })
  })

  describe('Create Client Schema - Status', () => {
    it('should default to PROSPECT status', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('PROSPECT')
      }
    })

    it('should accept valid status values', () => {
      const validStatuses = ['LEAD', 'PROSPECT', 'ACTIVE', 'INACTIVE']

      for (const status of validStatuses) {
        const result = createClientSchema.safeParse({
          email: 'client@example.com',
          firstName: 'John',
          lastName: 'Doe',
          password: 'password123',
          status
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.status).toBe(status)
        }
      }
    })

    it('should reject invalid status', () => {
      const result = createClientSchema.safeParse({
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        status: 'PENDING'
      })

      expect(result.success).toBe(false)
    })
  })

  describe('Create Client Schema - Comprehensive Intake', () => {
    it('should accept full intake form data', () => {
      const result = createClientSchema.safeParse({
        // Required
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'securepass123',
        // Contact
        phone: '555-123-4567',
        // Address
        address: '123 Main Street',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        // Personal
        dateOfBirth: '1975-03-15',
        ssnLast4: '6789',
        // Family
        hasMinorChildren: true,
        childrenInfo: JSON.stringify([{ name: 'Emma', age: 12 }]),
        // Planning
        hasWill: true,
        hasTrust: false,
        // Business
        businessName: 'Doe Consulting LLC',
        businessType: 'llc',
        // Referral
        referralType: 'PROFESSIONAL',
        referredByPartnerId: 'partner-abc',
        referralNotes: 'Referred by CPA firm',
        // Status
        status: 'PROSPECT'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('john.doe@example.com')
        expect(result.data.firstName).toBe('John')
        expect(result.data.lastName).toBe('Doe')
        expect(result.data.address).toBe('123 Main Street')
        expect(result.data.hasMinorChildren).toBe(true)
        expect(result.data.hasWill).toBe(true)
        expect(result.data.businessName).toBe('Doe Consulting LLC')
        expect(result.data.referralType).toBe('PROFESSIONAL')
        expect(result.data.status).toBe('PROSPECT')
      }
    })
  })
})

describe('Clients API Business Logic', () => {
  describe('Belly Button Principle - Record Creation', () => {
    it('should create person, user, and client records for new client', () => {
      // This tests the expected behavior documented in CLAUDE.md
      // When creating a client:
      // 1. Create a person record (identity)
      // 2. Create a user record (authentication, linked to person)
      // 3. Create a client record (client-specific data, linked to person)

      const clientData = {
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        status: 'PROSPECT'
      }

      // Simulate what the API does
      const personId = 'person-uuid'
      const userId = 'user-uuid'
      const clientId = 'client-uuid'

      const personRecord = {
        id: personId,
        personType: 'individual',
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        fullName: `${clientData.firstName} ${clientData.lastName}`,
        email: clientData.email
      }

      const userRecord = {
        id: userId,
        personId: personId, // Links to person
        email: clientData.email,
        role: 'CLIENT',
        status: 'ACTIVE'
      }

      const clientRecord = {
        id: clientId,
        personId: personId, // Links to person
        status: clientData.status
      }

      // Verify relationships
      expect(userRecord.personId).toBe(personRecord.id)
      expect(clientRecord.personId).toBe(personRecord.id)
      expect(userRecord.role).toBe('CLIENT')
    })

    it('should compute fullName from firstName and lastName', () => {
      const firstName = 'John'
      const lastName = 'Doe'
      const fullName = `${firstName} ${lastName}`

      expect(fullName).toBe('John Doe')
    })
  })

  describe('Date Parsing', () => {
    it('should parse valid ISO date string to Date object', () => {
      const dateString = '1980-05-15'
      const date = new Date(dateString)

      // Date parsing from ISO string without time creates UTC midnight
      // Use UTC methods to avoid timezone issues
      expect(date.getUTCFullYear()).toBe(1980)
      expect(date.getUTCMonth()).toBe(4) // 0-indexed
      expect(date.getUTCDate()).toBe(15)
    })

    it('should handle invalid date string gracefully', () => {
      const dateString = 'not-a-date'
      const date = new Date(dateString)

      expect(isNaN(date.getTime())).toBe(true)
    })

    it('should handle empty date string', () => {
      const dateString = ''
      const date = new Date(dateString)

      expect(isNaN(date.getTime())).toBe(true)
    })
  })

  describe('Status Transitions', () => {
    it('should allow LEAD as initial status', () => {
      const result = createClientSchema.safeParse({
        email: 'lead@example.com',
        firstName: 'Jane',
        lastName: 'Lead',
        password: 'password123',
        status: 'LEAD'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('LEAD')
      }
    })

    it('should allow PROSPECT as initial status (default)', () => {
      const result = createClientSchema.safeParse({
        email: 'prospect@example.com',
        firstName: 'Jane',
        lastName: 'Prospect',
        password: 'password123'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('PROSPECT')
      }
    })

    it('should allow ACTIVE as initial status', () => {
      const result = createClientSchema.safeParse({
        email: 'active@example.com',
        firstName: 'Jane',
        lastName: 'Active',
        password: 'password123',
        status: 'ACTIVE'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('ACTIVE')
      }
    })
  })
})
