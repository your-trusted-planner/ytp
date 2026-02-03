/**
 * Factory functions for creating test entities.
 * Use these to quickly set up valid entity chains in tests.
 */

import { nanoid } from 'nanoid'
import type { MockRepository } from './mock-repository'
import type {
  Person, User, Client, EstatePlan, Trust, Will, AncillaryDocument, PlanRole,
  AncillaryDocType
} from './mock-types'

// =============================================================================
// Client/User Factories (Belly Button Principle)
// =============================================================================

/** Create person → user → client chain (client with portal access) */
export function createCompleteClient(
  repo: MockRepository,
  overrides: { person?: Partial<Person>; user?: Partial<User>; client?: Partial<Client> } = {}
): { person: Person; user: User; client: Client } {
  const person = repo.createPerson({
    personType: 'individual',
    firstName: 'Test',
    lastName: 'Client',
    email: `test-${nanoid(6)}@example.com`,
    ...overrides.person
  })

  const user = repo.createUser({
    personId: person.id,
    email: person.email || `test-${nanoid(6)}@example.com`,
    role: 'CLIENT',
    adminLevel: 0,
    status: 'ACTIVE',
    ...overrides.user
  })

  const client = repo.createClient({
    personId: person.id,
    status: 'PROSPECT',
    ...overrides.client
  })

  return { person, user, client }
}

/** Create person → client chain (no portal access) */
export function createClientWithoutPortalAccess(
  repo: MockRepository,
  overrides: { person?: Partial<Person>; client?: Partial<Client> } = {}
): { person: Person; client: Client } {
  const person = repo.createPerson({
    personType: 'individual',
    firstName: 'No Portal',
    lastName: 'Client',
    ...overrides.person
  })

  const client = repo.createClient({
    personId: person.id,
    status: 'PROSPECT',
    ...overrides.client
  })

  return { person, client }
}

/** Create person → user chain (staff/lawyer, not a client) */
export function createStaffUser(
  repo: MockRepository,
  role: 'ADMIN' | 'LAWYER' | 'STAFF',
  overrides: { person?: Partial<Person>; user?: Partial<User> } = {}
): { person: Person; user: User } {
  const person = repo.createPerson({
    personType: 'individual',
    firstName: 'Staff',
    lastName: 'Member',
    email: `staff-${nanoid(6)}@firm.com`,
    ...overrides.person
  })

  const user = repo.createUser({
    personId: person.id,
    email: person.email || `staff-${nanoid(6)}@firm.com`,
    role,
    adminLevel: role === 'ADMIN' ? 3 : 0,
    status: 'ACTIVE',
    ...overrides.user
  })

  return { person, user }
}

// =============================================================================
// Estate Plan Factories
// =============================================================================

/** Create single-grantor trust plan with trust + pour-over will */
export function createSingleGrantorTrustPlan(
  repo: MockRepository,
  overrides: { grantor?: Partial<Person>; plan?: Partial<EstatePlan>; trust?: Partial<Trust>; will?: Partial<Will> } = {}
): { grantor: Person; plan: EstatePlan; trust: Trust; will: Will } {
  const grantor = repo.createPerson({
    personType: 'individual',
    firstName: 'John',
    lastName: 'Doe',
    ...overrides.grantor
  })

  const plan = repo.createEstatePlan({
    grantorPersonId1: grantor.id,
    planType: 'TRUST_BASED',
    planName: `${grantor.lastName} Family Trust`,
    status: 'DRAFT',
    ...overrides.plan
  })

  const trust = repo.createTrust({
    planId: plan.id,
    trustName: `${grantor.lastName} Revocable Living Trust`,
    trustType: 'REVOCABLE_LIVING',
    isRevocable: true,
    ...overrides.trust
  })

  const will = repo.createWill({
    planId: plan.id,
    personId: grantor.id,
    willType: 'POUR_OVER',
    pourOverTrustId: trust.id,
    ...overrides.will
  })

  repo.createPlanRole({
    planId: plan.id,
    personId: grantor.id,
    roleCategory: 'GRANTOR',
    roleType: 'GRANTOR',
    isPrimary: true,
    status: 'ACTIVE'
  })

  return { grantor, plan, trust, will }
}

/** Create joint (married couple) trust plan */
export function createJointTrustPlan(
  repo: MockRepository,
  overrides: { grantor1?: Partial<Person>; grantor2?: Partial<Person>; plan?: Partial<EstatePlan>; trust?: Partial<Trust> } = {}
): { grantor1: Person; grantor2: Person; plan: EstatePlan; trust: Trust; will1: Will; will2: Will } {
  const grantor1 = repo.createPerson({ personType: 'individual', firstName: 'John', lastName: 'Smith', ...overrides.grantor1 })
  const grantor2 = repo.createPerson({ personType: 'individual', firstName: 'Jane', lastName: 'Smith', ...overrides.grantor2 })

  const plan = repo.createEstatePlan({
    grantorPersonId1: grantor1.id,
    grantorPersonId2: grantor2.id,
    planType: 'TRUST_BASED',
    planName: 'Smith Family Trust',
    status: 'DRAFT',
    ...overrides.plan
  })

  const trust = repo.createTrust({
    planId: plan.id,
    trustName: 'Smith Joint Revocable Living Trust',
    trustType: 'REVOCABLE_LIVING',
    isJoint: true,
    isRevocable: true,
    ...overrides.trust
  })

  const will1 = repo.createWill({ planId: plan.id, personId: grantor1.id, willType: 'POUR_OVER', pourOverTrustId: trust.id })
  const will2 = repo.createWill({ planId: plan.id, personId: grantor2.id, willType: 'POUR_OVER', pourOverTrustId: trust.id })

  // Both grantors are equal (no hierarchy)
  repo.createPlanRole({ planId: plan.id, personId: grantor1.id, roleCategory: 'GRANTOR', roleType: 'GRANTOR', isPrimary: true, status: 'ACTIVE' })
  repo.createPlanRole({ planId: plan.id, personId: grantor2.id, roleCategory: 'GRANTOR', roleType: 'GRANTOR', isPrimary: true, status: 'ACTIVE' })

  return { grantor1, grantor2, plan, trust, will1, will2 }
}

/** Create will-based plan (no trust) */
export function createWillBasedPlan(
  repo: MockRepository,
  overrides: { grantor?: Partial<Person>; plan?: Partial<EstatePlan>; will?: Partial<Will> } = {}
): { grantor: Person; plan: EstatePlan; will: Will } {
  const grantor = repo.createPerson({ personType: 'individual', firstName: 'Mary', lastName: 'Johnson', ...overrides.grantor })

  const plan = repo.createEstatePlan({
    grantorPersonId1: grantor.id,
    planType: 'WILL_BASED',
    status: 'DRAFT',
    ...overrides.plan
  })

  const will = repo.createWill({ planId: plan.id, personId: grantor.id, willType: 'SIMPLE', ...overrides.will })

  repo.createPlanRole({ planId: plan.id, personId: grantor.id, roleCategory: 'GRANTOR', roleType: 'TESTATOR', isPrimary: true, status: 'ACTIVE' })

  return { grantor, plan, will }
}

// =============================================================================
// Role Factories
// =============================================================================

/** Add beneficiary to existing plan */
export function addBeneficiaryToPlan(
  repo: MockRepository,
  planId: string,
  overrides: { beneficiary?: Partial<Person>; role?: Partial<PlanRole> } = {}
): { beneficiary: Person; role: PlanRole } {
  const beneficiary = repo.createPerson({ personType: 'individual', firstName: 'Child', lastName: 'Beneficiary', ...overrides.beneficiary })

  const role = repo.createPlanRole({
    planId,
    personId: beneficiary.id,
    roleCategory: 'BENEFICIARY',
    roleType: 'PRIMARY_BENEFICIARY',
    isPrimary: true,
    sharePercentage: 100,
    status: 'ACTIVE',
    ...overrides.role
  })

  return { beneficiary, role }
}

/** Add fiduciary (trustee/executor) to existing plan */
export function addFiduciaryToPlan(
  repo: MockRepository,
  planId: string,
  roleType: 'TRUSTEE' | 'SUCCESSOR_TRUSTEE' | 'EXECUTOR' | 'ALTERNATE_EXECUTOR',
  overrides: { fiduciary?: Partial<Person>; role?: Partial<PlanRole> } = {}
): { fiduciary: Person; role: PlanRole } {
  const fiduciary = repo.createPerson({ personType: 'individual', firstName: 'Trusted', lastName: 'Fiduciary', ...overrides.fiduciary })

  const role = repo.createPlanRole({
    planId,
    personId: fiduciary.id,
    roleCategory: 'FIDUCIARY',
    roleType,
    isPrimary: roleType === 'TRUSTEE' || roleType === 'EXECUTOR',
    ordinal: roleType.includes('SUCCESSOR') || roleType.includes('ALTERNATE') ? 1 : 0,
    status: 'ACTIVE',
    ...overrides.role
  })

  return { fiduciary, role }
}

/** Add standard ancillary documents for a person */
export function addAncillaryDocuments(
  repo: MockRepository,
  planId: string,
  personId: string,
  documents: AncillaryDocType[] = ['FINANCIAL_POA', 'HEALTHCARE_POA', 'ADVANCE_DIRECTIVE', 'HIPAA_AUTHORIZATION']
): AncillaryDocument[] {
  return documents.map(docType =>
    repo.createAncillaryDocument({ planId, personId, documentType: docType, status: 'DRAFT' })
  )
}
