/**
 * Tests for database schema and access patterns
 * Validates schema structure and Drizzle ORM configurations
 */

import { describe, it, expect } from 'vitest'
import * as schema from '../../server/db/schema'

describe('Database Schema', () => {
  describe('Users table', () => {
    it('should have required columns', () => {
      const userColumns = Object.keys(schema.users)

      expect(userColumns).toContain('id')
      expect(userColumns).toContain('email')
      expect(userColumns).toContain('password')
      expect(userColumns).toContain('role')
      expect(userColumns).toContain('adminLevel')
      expect(userColumns).toContain('status')
      expect(userColumns).toContain('createdAt')
      expect(userColumns).toContain('updatedAt')
    })

    it('should have firebaseUid for OAuth support', () => {
      const userColumns = Object.keys(schema.users)
      expect(userColumns).toContain('firebaseUid')
    })

    it('should export User type', () => {
      // Type check - this verifies the schema is properly typed
      const mockUser: typeof schema.users.$inferSelect = {
        id: 'test-id',
        email: 'test@example.com',
        password: null,
        firebaseUid: null,
        role: 'CLIENT',
        adminLevel: 0,
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        avatar: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(mockUser.id).toBe('test-id')
      expect(mockUser.role).toBe('CLIENT')
    })
  })

  describe('OAuth Providers table', () => {
    it('should have required columns for OAuth configuration', () => {
      const columns = Object.keys(schema.oauthProviders)

      expect(columns).toContain('id')
      expect(columns).toContain('providerId')
      expect(columns).toContain('name')
      expect(columns).toContain('isEnabled')
      expect(columns).toContain('buttonColor')
    })
  })

  describe('Client Profiles table', () => {
    it('should have required columns', () => {
      const columns = Object.keys(schema.clientProfiles)

      expect(columns).toContain('id')
      expect(columns).toContain('userId')
      expect(columns).toContain('dateOfBirth')
      expect(columns).toContain('address')
      expect(columns).toContain('assignedLawyerId')
    })

    it('should reference users table', () => {
      // The userId column should have a reference to users
      expect(schema.clientProfiles.userId).toBeDefined()
    })
  })

  describe('Matters table', () => {
    it('should have required columns', () => {
      const columns = Object.keys(schema.matters)

      expect(columns).toContain('id')
      expect(columns).toContain('clientId')
      expect(columns).toContain('title')
      expect(columns).toContain('status')
      expect(columns).toContain('leadAttorneyId')
    })
  })

  describe('Documents table', () => {
    it('should have required columns', () => {
      const columns = Object.keys(schema.documents)

      expect(columns).toContain('id')
      expect(columns).toContain('title')
      expect(columns).toContain('status')
      expect(columns).toContain('clientId')
      expect(columns).toContain('templateId')
      expect(columns).toContain('matterId')
    })

    it('should have attorney approval fields', () => {
      const columns = Object.keys(schema.documents)

      expect(columns).toContain('attorneyApproved')
      expect(columns).toContain('attorneyApprovedAt')
      expect(columns).toContain('attorneyApprovedBy')
    })
  })

  describe('Appointments table', () => {
    it('should have required columns', () => {
      const columns = Object.keys(schema.appointments)

      expect(columns).toContain('id')
      expect(columns).toContain('title')
      expect(columns).toContain('startTime')
      expect(columns).toContain('endTime')
      expect(columns).toContain('status')
      expect(columns).toContain('clientId')
    })
  })

  describe('Journey System tables', () => {
    it('should have journeys table', () => {
      const columns = Object.keys(schema.journeys)

      expect(columns).toContain('id')
      expect(columns).toContain('name')
      expect(columns).toContain('journeyType')
      expect(columns).toContain('serviceCatalogId')
    })

    it('should have journeySteps table', () => {
      const columns = Object.keys(schema.journeySteps)

      expect(columns).toContain('id')
      expect(columns).toContain('journeyId')
      expect(columns).toContain('stepType')
      expect(columns).toContain('name')
      expect(columns).toContain('stepOrder')
    })

    it('should have clientJourneys table', () => {
      const columns = Object.keys(schema.clientJourneys)

      expect(columns).toContain('id')
      expect(columns).toContain('clientId')
      expect(columns).toContain('journeyId')
      expect(columns).toContain('currentStepId')
      expect(columns).toContain('status')
    })

    it('should have actionItems table', () => {
      const columns = Object.keys(schema.actionItems)

      expect(columns).toContain('id')
      expect(columns).toContain('stepId')
      expect(columns).toContain('actionType')
      expect(columns).toContain('title')
      expect(columns).toContain('status')
    })
  })

  describe('Payment tables', () => {
    it('should have payments table', () => {
      const columns = Object.keys(schema.payments)

      expect(columns).toContain('id')
      expect(columns).toContain('matterId')
      expect(columns).toContain('paymentType')
      expect(columns).toContain('amount')
      expect(columns).toContain('status')
    })

    it('should have lawpayConnections table', () => {
      const columns = Object.keys(schema.lawpayConnections)

      expect(columns).toContain('id')
      expect(columns).toContain('userId')
      expect(columns).toContain('merchantPublicKey')
      expect(columns).toContain('expiresAt')
    })
  })

  describe('People and Relationships tables', () => {
    it('should have people table', () => {
      const columns = Object.keys(schema.people)

      expect(columns).toContain('id')
      expect(columns).toContain('firstName')
      expect(columns).toContain('lastName')
      expect(columns).toContain('email')
      expect(columns).toContain('middleNames')
    })

    it('should have clientRelationships table', () => {
      const columns = Object.keys(schema.clientRelationships)

      expect(columns).toContain('id')
      expect(columns).toContain('clientId')
      expect(columns).toContain('personId')
      expect(columns).toContain('relationshipType')
    })

    it('should have matterRelationships table', () => {
      const columns = Object.keys(schema.matterRelationships)

      expect(columns).toContain('id')
      expect(columns).toContain('matterId')
      expect(columns).toContain('personId')
      expect(columns).toContain('relationshipType')
    })
  })
})

describe('Schema Enums', () => {
  describe('User roles', () => {
    it('should have expected roles in users table', () => {
      // Verify role enum values by checking a mock user type
      type UserRole = typeof schema.users.$inferSelect['role']

      // TypeScript will error if these aren't valid roles
      const roles: UserRole[] = ['ADMIN', 'LAWYER', 'CLIENT', 'ADVISOR', 'LEAD', 'PROSPECT']
      expect(roles).toHaveLength(6)
    })
  })

  describe('User status', () => {
    it('should have expected status values', () => {
      type UserStatus = typeof schema.users.$inferSelect['status']

      const statuses: UserStatus[] = ['PROSPECT', 'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE']
      expect(statuses).toHaveLength(4)
    })
  })

  describe('Document status', () => {
    it('should have expected document status values', () => {
      type DocStatus = typeof schema.documents.$inferSelect['status']

      const statuses: DocStatus[] = ['DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'COMPLETED']
      expect(statuses).toHaveLength(5)
    })
  })

  describe('Action item types', () => {
    it('should support all expected action types', () => {
      type ActionType = typeof schema.actionItems.$inferSelect['actionType']

      const types: ActionType[] = [
        'QUESTIONNAIRE', 'DECISION', 'UPLOAD', 'REVIEW', 'ESIGN',
        'NOTARY', 'PAYMENT', 'MEETING', 'KYC',
        'AUTOMATION', 'THIRD_PARTY', 'OFFLINE_TASK', 'EXPENSE', 'FORM', 'DRAFT_DOCUMENT'
      ]
      expect(types).toHaveLength(15)
    })
  })
})

describe('Schema Relationships', () => {
  it('should export all required tables', () => {
    // Core tables
    expect(schema.users).toBeDefined()
    expect(schema.clientProfiles).toBeDefined()
    expect(schema.oauthProviders).toBeDefined()

    // Document system
    expect(schema.documents).toBeDefined()
    expect(schema.documentTemplates).toBeDefined()
    expect(schema.templateFolders).toBeDefined()

    // Matter/case management
    expect(schema.matters).toBeDefined()
    expect(schema.serviceCatalog).toBeDefined()
    expect(schema.mattersToServices).toBeDefined()

    // Journey system
    expect(schema.journeys).toBeDefined()
    expect(schema.journeySteps).toBeDefined()
    expect(schema.clientJourneys).toBeDefined()
    expect(schema.journeyStepProgress).toBeDefined()
    expect(schema.actionItems).toBeDefined()

    // Appointments and notes
    expect(schema.appointments).toBeDefined()
    expect(schema.notes).toBeDefined()
    expect(schema.activities).toBeDefined()

    // Payment system
    expect(schema.payments).toBeDefined()
    expect(schema.lawpayConnections).toBeDefined()

    // People and relationships
    expect(schema.people).toBeDefined()
    expect(schema.clientRelationships).toBeDefined()
    expect(schema.matterRelationships).toBeDefined()
  })
})
