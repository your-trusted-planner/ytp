/**
 * Belly Button Principle - Architectural Enforcement Tests
 *
 * These tests serve as guardrails to ensure the core data architecture
 * is followed: every human has a person record, and clients/users link to it.
 *
 * The "Belly Button Principle" states:
 * - Every human in the system has a person record (like everyone has a belly button)
 * - Users (authentication) link to people via personId
 * - Clients (client-specific data) link to people via personId
 * - Not every person has a user (some people don't need to log in)
 * - Not every person is a client (staff, beneficiaries, spouses, etc.)
 *
 * These tests catch architectural violations during unit testing,
 * before E2E tests would catch them at runtime.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  MockRepository,
  BellyButtonViolationError,
  RelationshipViolationError,
  createCompleteClient,
  createClientWithoutPortalAccess,
  createStaffUser
} from '../../utils/mock-repository'

describe('Belly Button Principle', () => {
  let repo: MockRepository

  beforeEach(() => {
    repo = new MockRepository()
  })

  describe('Core Invariants', () => {
    it('allows creating a person without user or client', () => {
      // A person can exist on their own (e.g., a beneficiary, spouse)
      const person = repo.createPerson({
        personType: 'individual',
        firstName: 'Jane',
        lastName: 'Beneficiary'
      })

      expect(person.id).toBeDefined()
      expect(repo.personExists(person.id)).toBe(true)
      expect(repo.getUserByPersonId(person.id)).toBeUndefined()
      expect(repo.getClientByPersonId(person.id)).toBeUndefined()
    })

    it('requires person to exist before creating user', () => {
      expect(() => {
        repo.createUser({
          personId: 'nonexistent-person',
          email: 'test@example.com',
          role: 'CLIENT',
          adminLevel: 0,
          status: 'ACTIVE'
        })
      }).toThrow(BellyButtonViolationError)
    })

    it('requires person to exist before creating client', () => {
      expect(() => {
        repo.createClient({
          personId: 'nonexistent-person',
          status: 'PROSPECT'
        })
      }).toThrow(BellyButtonViolationError)
    })

    it('requires personId field on user', () => {
      expect(() => {
        repo.createUser({
          personId: '', // Empty string
          email: 'test@example.com',
          role: 'CLIENT',
          adminLevel: 0,
          status: 'ACTIVE'
        })
      }).toThrow(BellyButtonViolationError)
    })

    it('requires personId field on client', () => {
      expect(() => {
        repo.createClient({
          personId: '', // Empty string
          status: 'PROSPECT'
        })
      }).toThrow(BellyButtonViolationError)
    })
  })

  describe('Valid Entity Creation Patterns', () => {
    it('creates complete client with person → user → client chain', () => {
      const { person, user, client } = createCompleteClient(repo)

      // All entities exist
      expect(repo.getPerson(person.id)).toBeDefined()
      expect(repo.getUser(user.id)).toBeDefined()
      expect(repo.getClient(client.id)).toBeDefined()

      // User links to person
      expect(user.personId).toBe(person.id)

      // Client links to person
      expect(client.personId).toBe(person.id)

      // Verification passes
      const verification = repo.verifyBellyButton(client.id)
      expect(verification.valid).toBe(true)
      expect(verification.person).toEqual(person)
      expect(verification.user).toEqual(user)
      expect(verification.client).toEqual(client)
      expect(verification.errors).toHaveLength(0)
    })

    it('creates client without portal access (no user)', () => {
      const { person, client } = createClientWithoutPortalAccess(repo)

      // Person and client exist
      expect(repo.getPerson(person.id)).toBeDefined()
      expect(repo.getClient(client.id)).toBeDefined()

      // No user for this person
      expect(repo.getUserByPersonId(person.id)).toBeUndefined()

      // Client still links to person
      expect(client.personId).toBe(person.id)

      // Verification passes (user is optional)
      const verification = repo.verifyBellyButton(client.id)
      expect(verification.valid).toBe(true)
      expect(verification.user).toBeNull()
    })

    it('creates staff user who is not a client', () => {
      const { person, user } = createStaffUser(repo, 'LAWYER')

      // Person and user exist
      expect(repo.getPerson(person.id)).toBeDefined()
      expect(repo.getUser(user.id)).toBeDefined()

      // No client record
      expect(repo.getClientByPersonId(person.id)).toBeUndefined()

      // User links to person
      expect(user.personId).toBe(person.id)
      expect(user.role).toBe('LAWYER')
    })

    it('creates admin user who is not a client', () => {
      const { person, user } = createStaffUser(repo, 'ADMIN', {
        user: { adminLevel: 3 }
      })

      expect(user.role).toBe('ADMIN')
      expect(user.adminLevel).toBe(3)
      expect(repo.getClientByPersonId(person.id)).toBeUndefined()
    })
  })

  describe('Entity Type Matrix', () => {
    /**
     * This test documents the valid combinations per CLAUDE.md:
     *
     * | Entity | people | users | clients |
     * |--------|--------|-------|---------|
     * | Lawyer | ✓ | ✓ (role=LAWYER) | ✗ |
     * | Staff | ✓ | ✓ (role=STAFF) | ✗ |
     * | Admin | ✓ | ✓ (role=ADMIN) | ✗ |
     * | Client (portal) | ✓ | ✓ (role=CLIENT) | ✓ |
     * | Client (no login) | ✓ | ✗ | ✓ |
     * | Spouse/Child | ✓ | ✗ | ✗ |
     * | Beneficiary | ✓ | ✗ | ✗ |
     */

    it('Lawyer: person ✓, user ✓, client ✗', () => {
      const { person, user } = createStaffUser(repo, 'LAWYER')

      expect(repo.personExists(person.id)).toBe(true)
      expect(repo.getUser(user.id)).toBeDefined()
      expect(repo.getClientByPersonId(person.id)).toBeUndefined()
    })

    it('Staff: person ✓, user ✓, client ✗', () => {
      const { person, user } = createStaffUser(repo, 'STAFF')

      expect(repo.personExists(person.id)).toBe(true)
      expect(repo.getUser(user.id)).toBeDefined()
      expect(repo.getClientByPersonId(person.id)).toBeUndefined()
    })

    it('Admin: person ✓, user ✓, client ✗', () => {
      const { person, user } = createStaffUser(repo, 'ADMIN')

      expect(repo.personExists(person.id)).toBe(true)
      expect(repo.getUser(user.id)).toBeDefined()
      expect(repo.getClientByPersonId(person.id)).toBeUndefined()
    })

    it('Client with portal: person ✓, user ✓, client ✓', () => {
      const { person, user, client } = createCompleteClient(repo)

      expect(repo.personExists(person.id)).toBe(true)
      expect(repo.getUser(user.id)).toBeDefined()
      expect(repo.getClient(client.id)).toBeDefined()
      expect(user.role).toBe('CLIENT')
    })

    it('Client without portal: person ✓, user ✗, client ✓', () => {
      const { person, client } = createClientWithoutPortalAccess(repo)

      expect(repo.personExists(person.id)).toBe(true)
      expect(repo.getUserByPersonId(person.id)).toBeUndefined()
      expect(repo.getClient(client.id)).toBeDefined()
    })

    it('Spouse/Child: person ✓, user ✗, client ✗', () => {
      const person = repo.createPerson({
        personType: 'individual',
        firstName: 'Sarah',
        lastName: 'Spouse'
      })

      expect(repo.personExists(person.id)).toBe(true)
      expect(repo.getUserByPersonId(person.id)).toBeUndefined()
      expect(repo.getClientByPersonId(person.id)).toBeUndefined()
    })

    it('Beneficiary: person ✓, user ✗, client ✗', () => {
      const person = repo.createPerson({
        personType: 'individual',
        firstName: 'Bob',
        lastName: 'Beneficiary'
      })

      expect(repo.personExists(person.id)).toBe(true)
      expect(repo.getUserByPersonId(person.id)).toBeUndefined()
      expect(repo.getClientByPersonId(person.id)).toBeUndefined()
    })
  })

  describe('Relationships', () => {
    it('requires both people to exist for relationship', () => {
      const person1 = repo.createPerson({
        personType: 'individual',
        firstName: 'Person',
        lastName: 'One'
      })

      expect(() => {
        repo.createRelationship({
          fromPersonId: person1.id,
          toPersonId: 'nonexistent',
          relationshipType: 'SPOUSE'
        })
      }).toThrow(RelationshipViolationError)
    })

    it('creates valid relationship between two people', () => {
      const person1 = repo.createPerson({
        personType: 'individual',
        firstName: 'John',
        lastName: 'Doe'
      })
      const person2 = repo.createPerson({
        personType: 'individual',
        firstName: 'Jane',
        lastName: 'Doe'
      })

      const relationship = repo.createRelationship({
        fromPersonId: person1.id,
        toPersonId: person2.id,
        relationshipType: 'SPOUSE'
      })

      expect(relationship.fromPersonId).toBe(person1.id)
      expect(relationship.toPersonId).toBe(person2.id)
      expect(relationship.relationshipType).toBe('SPOUSE')
    })

    it('validates referredByPersonId exists when creating client', () => {
      const person = repo.createPerson({
        personType: 'individual',
        firstName: 'New',
        lastName: 'Client'
      })

      expect(() => {
        repo.createClient({
          personId: person.id,
          status: 'PROSPECT',
          referralType: 'CLIENT',
          referredByPersonId: 'nonexistent-referrer'
        })
      }).toThrow(RelationshipViolationError)
    })

    it('allows valid referredByPersonId', () => {
      const referrer = repo.createPerson({
        personType: 'individual',
        firstName: 'Existing',
        lastName: 'Client'
      })
      const newPerson = repo.createPerson({
        personType: 'individual',
        firstName: 'Referred',
        lastName: 'Client'
      })

      const client = repo.createClient({
        personId: newPerson.id,
        status: 'PROSPECT',
        referralType: 'CLIENT',
        referredByPersonId: referrer.id
      })

      expect(client.referredByPersonId).toBe(referrer.id)
    })
  })

  describe('Verification Helper', () => {
    it('reports error for non-existent client', () => {
      const result = repo.verifyBellyButton('nonexistent')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Client not found')
    })

    it('reports full chain for valid client', () => {
      const { person, user, client } = createCompleteClient(repo, {
        person: { firstName: 'Verified', lastName: 'Client' }
      })

      const result = repo.verifyBellyButton(client.id)

      expect(result.valid).toBe(true)
      expect(result.person?.firstName).toBe('Verified')
      expect(result.user?.personId).toBe(person.id)
      expect(result.client?.personId).toBe(person.id)
    })
  })

  describe('Repository Isolation', () => {
    it('reset clears all data', () => {
      createCompleteClient(repo)
      createStaffUser(repo, 'ADMIN')

      expect(repo.getCounts().people).toBeGreaterThan(0)
      expect(repo.getCounts().users).toBeGreaterThan(0)
      expect(repo.getCounts().clients).toBeGreaterThan(0)

      repo.reset()

      expect(repo.getCounts()).toEqual({
        people: 0,
        users: 0,
        clients: 0,
        relationships: 0,
        estatePlans: 0,
        trusts: 0,
        wills: 0,
        ancillaryDocuments: 0,
        planRoles: 0
      })
    })
  })
})

describe('Client Creation Order', () => {
  /**
   * These tests verify that client creation follows the correct order:
   * 1. Create person (identity)
   * 2. Create user (optional, for portal access)
   * 3. Create client (client-specific data)
   *
   * This mirrors what server/api/clients/index.post.ts should do.
   */

  let repo: MockRepository

  beforeEach(() => {
    repo = new MockRepository()
  })

  it('demonstrates correct creation order with portal access', () => {
    // Step 1: Create person FIRST
    const person = repo.createPerson({
      personType: 'individual',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com'
    })

    // Step 2: Create user linked to person
    const user = repo.createUser({
      personId: person.id,
      email: person.email!,
      role: 'CLIENT',
      adminLevel: 0,
      status: 'ACTIVE'
    })

    // Step 3: Create client linked to person
    const client = repo.createClient({
      personId: person.id,
      status: 'PROSPECT',
      hasMinorChildren: true
    })

    // Verify chain
    expect(user.personId).toBe(person.id)
    expect(client.personId).toBe(person.id)

    const verification = repo.verifyBellyButton(client.id)
    expect(verification.valid).toBe(true)
  })

  it('demonstrates correct creation order without portal access', () => {
    // Step 1: Create person FIRST
    const person = repo.createPerson({
      personType: 'individual',
      firstName: 'Jane',
      lastName: 'Doe'
    })

    // Step 2: Skip user creation (no portal access needed)

    // Step 3: Create client linked to person
    const client = repo.createClient({
      personId: person.id,
      status: 'LEAD'
    })

    // Verify chain (no user is OK)
    expect(client.personId).toBe(person.id)
    expect(repo.getUserByPersonId(person.id)).toBeUndefined()

    const verification = repo.verifyBellyButton(client.id)
    expect(verification.valid).toBe(true)
    expect(verification.user).toBeNull()
  })

  it('fails when trying to create user before person', () => {
    // This simulates a bug where code tries to create user first
    expect(() => {
      repo.createUser({
        personId: 'will-create-later', // Person doesn't exist yet!
        email: 'test@example.com',
        role: 'CLIENT',
        adminLevel: 0,
        status: 'ACTIVE'
      })
    }).toThrow(BellyButtonViolationError)
  })

  it('fails when trying to create client before person', () => {
    // This simulates a bug where code tries to create client first
    expect(() => {
      repo.createClient({
        personId: 'will-create-later', // Person doesn't exist yet!
        status: 'PROSPECT'
      })
    }).toThrow(BellyButtonViolationError)
  })
})
