/**
 * Mock Repository for Architecture Enforcement Tests
 *
 * This is NOT a database mock - it's an architectural guardrail that enforces:
 * - Belly Button Principle: person must exist before user/client
 * - Estate Plan Architecture: plan must exist before trusts/wills/roles
 *
 * Use this in tests to catch violations of core data patterns.
 */

import { nanoid } from 'nanoid'
import type {
  Person, User, Client, Relationship,
  EstatePlan, Trust, Will, AncillaryDocument, PlanRole,
  CreateInput, CreatePlanInput
} from './mock-types'

// Re-export types and factories for convenient imports
export * from './mock-types'
export * from './mock-factories'

// =============================================================================
// Violation Errors
// =============================================================================

export class BellyButtonViolationError extends Error {
  constructor(message: string) {
    super(`Belly Button Violation: ${message}`)
    this.name = 'BellyButtonViolationError'
  }
}

export class RelationshipViolationError extends Error {
  constructor(message: string) {
    super(`Relationship Violation: ${message}`)
    this.name = 'RelationshipViolationError'
  }
}

export class EstatePlanViolationError extends Error {
  constructor(message: string) {
    super(`Estate Plan Violation: ${message}`)
    this.name = 'EstatePlanViolationError'
  }
}

// =============================================================================
// Mock Repository
// =============================================================================

export class MockRepository {
  // Entity stores
  private people = new Map<string, Person>()
  private users = new Map<string, User>()
  private clients = new Map<string, Client>()
  private relationships = new Map<string, Relationship>()
  private estatePlans = new Map<string, EstatePlan>()
  private trusts = new Map<string, Trust>()
  private wills = new Map<string, Will>()
  private ancillaryDocuments = new Map<string, AncillaryDocument>()
  private planRoles = new Map<string, PlanRole>()

  // ---------------------------------------------------------------------------
  // Validation Helpers
  // ---------------------------------------------------------------------------

  private requirePerson(personId: string | undefined, context: string): void {
    if (!personId) throw new BellyButtonViolationError(`${context}: personId is required`)
    if (!this.people.has(personId)) throw new BellyButtonViolationError(`${context}: person ${personId} does not exist`)
  }

  private requirePlan(planId: string | undefined, context: string): void {
    if (!planId) throw new EstatePlanViolationError(`${context}: planId is required`)
    if (!this.estatePlans.has(planId)) throw new EstatePlanViolationError(`${context}: plan ${planId} does not exist`)
  }

  private requireTrustInPlan(trustId: string, planId: string, context: string): void {
    const trust = this.trusts.get(trustId)
    if (!trust) throw new EstatePlanViolationError(`${context}: trust ${trustId} does not exist`)
    if (trust.planId !== planId) throw new EstatePlanViolationError(`${context}: trust ${trustId} belongs to different plan`)
  }

  private stamp<T>(data: T, id?: string): T & { id: string; createdAt: Date; updatedAt: Date } {
    const now = new Date()
    return { ...data, id: id || nanoid(), createdAt: now, updatedAt: now }
  }

  // ---------------------------------------------------------------------------
  // People
  // ---------------------------------------------------------------------------

  createPerson(data: CreateInput<Person>): Person {
    const person = this.stamp({
      personType: data.personType || 'individual',
      firstName: data.firstName,
      lastName: data.lastName,
      fullName: data.fullName || [data.firstName, data.lastName].filter(Boolean).join(' '),
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      dateOfBirth: data.dateOfBirth,
      ssnLast4: data.ssnLast4
    }, data.id)
    this.people.set(person.id, person)
    return person
  }

  getPerson(id: string): Person | undefined { return this.people.get(id) }
  personExists(id: string): boolean { return this.people.has(id) }

  // ---------------------------------------------------------------------------
  // Users (requires person)
  // ---------------------------------------------------------------------------

  createUser(data: CreateInput<User>): User {
    this.requirePerson(data.personId, 'createUser')
    const user = this.stamp({
      personId: data.personId,
      email: data.email,
      password: data.password,
      role: data.role,
      adminLevel: data.adminLevel ?? 0,
      status: data.status || 'ACTIVE'
    }, data.id)
    this.users.set(user.id, user)
    return user
  }

  getUser(id: string): User | undefined { return this.users.get(id) }
  getUserByPersonId(personId: string): User | undefined {
    for (const u of this.users.values()) if (u.personId === personId) return u
    return undefined
  }

  // ---------------------------------------------------------------------------
  // Clients (requires person)
  // ---------------------------------------------------------------------------

  createClient(data: CreateInput<Client>): Client {
    this.requirePerson(data.personId, 'createClient')
    if (data.referredByPersonId && !this.people.has(data.referredByPersonId)) {
      throw new RelationshipViolationError(`referredByPersonId ${data.referredByPersonId} does not exist`)
    }
    const client = this.stamp({
      personId: data.personId,
      status: data.status || 'PROSPECT',
      hasMinorChildren: data.hasMinorChildren,
      childrenInfo: data.childrenInfo,
      hasWill: data.hasWill,
      hasTrust: data.hasTrust,
      businessName: data.businessName,
      businessType: data.businessType,
      referralType: data.referralType,
      referredByPersonId: data.referredByPersonId,
      referredByPartnerId: data.referredByPartnerId,
      referralNotes: data.referralNotes
    }, data.id)
    this.clients.set(client.id, client)
    return client
  }

  getClient(id: string): Client | undefined { return this.clients.get(id) }
  getClientByPersonId(personId: string): Client | undefined {
    for (const c of this.clients.values()) if (c.personId === personId) return c
    return undefined
  }

  // ---------------------------------------------------------------------------
  // Relationships (requires both people)
  // ---------------------------------------------------------------------------

  createRelationship(data: CreateInput<Relationship>): Relationship {
    if (!this.people.has(data.fromPersonId)) throw new RelationshipViolationError(`fromPersonId ${data.fromPersonId} does not exist`)
    if (!this.people.has(data.toPersonId)) throw new RelationshipViolationError(`toPersonId ${data.toPersonId} does not exist`)
    const rel = this.stamp({
      fromPersonId: data.fromPersonId,
      toPersonId: data.toPersonId,
      relationshipType: data.relationshipType,
      context: data.context,
      contextId: data.contextId
    }, data.id)
    this.relationships.set(rel.id, rel)
    return rel
  }

  // ---------------------------------------------------------------------------
  // Estate Plans (requires grantor person)
  // ---------------------------------------------------------------------------

  createEstatePlan(data: CreatePlanInput): EstatePlan {
    this.requirePerson(data.grantorPersonId1, 'createEstatePlan (grantor1)')
    if (data.grantorPersonId2) this.requirePerson(data.grantorPersonId2, 'createEstatePlan (grantor2)')
    const plan = this.stamp({
      grantorPersonId1: data.grantorPersonId1,
      grantorPersonId2: data.grantorPersonId2,
      planType: data.planType,
      planName: data.planName,
      currentVersion: 1,
      status: data.status || 'DRAFT'
    }, data.id)
    this.estatePlans.set(plan.id, plan)
    return plan
  }

  getEstatePlan(id: string): EstatePlan | undefined { return this.estatePlans.get(id) }
  estatePlanExists(id: string): boolean { return this.estatePlans.has(id) }

  // ---------------------------------------------------------------------------
  // Trusts (requires plan)
  // ---------------------------------------------------------------------------

  createTrust(data: CreateInput<Trust>): Trust {
    this.requirePlan(data.planId, 'createTrust')
    const trust = this.stamp({
      planId: data.planId,
      trustName: data.trustName,
      trustType: data.trustType,
      isJoint: data.isJoint,
      isRevocable: data.isRevocable,
      jurisdiction: data.jurisdiction
    }, data.id)
    this.trusts.set(trust.id, trust)
    return trust
  }

  getTrust(id: string): Trust | undefined { return this.trusts.get(id) }
  getTrustsByPlanId(planId: string): Trust[] { return [...this.trusts.values()].filter(t => t.planId === planId) }

  // ---------------------------------------------------------------------------
  // Wills (requires plan, validates person and trust references)
  // ---------------------------------------------------------------------------

  createWill(data: CreateInput<Will>): Will {
    this.requirePlan(data.planId, 'createWill')
    if (data.personId && !this.people.has(data.personId)) {
      throw new EstatePlanViolationError(`createWill: person ${data.personId} does not exist`)
    }
    if (data.pourOverTrustId) this.requireTrustInPlan(data.pourOverTrustId, data.planId, 'createWill')
    const will = this.stamp({
      planId: data.planId,
      personId: data.personId,
      willType: data.willType,
      jurisdiction: data.jurisdiction,
      pourOverTrustId: data.pourOverTrustId
    }, data.id)
    this.wills.set(will.id, will)
    return will
  }

  getWill(id: string): Will | undefined { return this.wills.get(id) }
  getWillsByPlanId(planId: string): Will[] { return [...this.wills.values()].filter(w => w.planId === planId) }

  // ---------------------------------------------------------------------------
  // Ancillary Documents (requires plan AND person)
  // ---------------------------------------------------------------------------

  createAncillaryDocument(data: CreateInput<AncillaryDocument>): AncillaryDocument {
    this.requirePlan(data.planId, 'createAncillaryDocument')
    this.requirePerson(data.personId, 'createAncillaryDocument')
    const doc = this.stamp({
      planId: data.planId,
      personId: data.personId,
      documentType: data.documentType,
      title: data.title,
      status: data.status || 'DRAFT'
    }, data.id)
    this.ancillaryDocuments.set(doc.id, doc)
    return doc
  }

  getAncillaryDocument(id: string): AncillaryDocument | undefined { return this.ancillaryDocuments.get(id) }
  getAncillaryDocumentsByPlanId(planId: string): AncillaryDocument[] { return [...this.ancillaryDocuments.values()].filter(d => d.planId === planId) }

  // ---------------------------------------------------------------------------
  // Plan Roles (requires plan AND person, validates trust reference)
  // ---------------------------------------------------------------------------

  createPlanRole(data: CreateInput<PlanRole>): PlanRole {
    this.requirePlan(data.planId, 'createPlanRole')
    this.requirePerson(data.personId, 'createPlanRole')
    if (data.forPersonId && !this.people.has(data.forPersonId)) {
      throw new EstatePlanViolationError(`createPlanRole: forPersonId ${data.forPersonId} does not exist`)
    }
    if (data.trustId) this.requireTrustInPlan(data.trustId, data.planId, 'createPlanRole')
    const role = this.stamp({
      planId: data.planId,
      personId: data.personId,
      forPersonId: data.forPersonId,
      roleCategory: data.roleCategory,
      roleType: data.roleType,
      isPrimary: data.isPrimary,
      ordinal: data.ordinal,
      sharePercentage: data.sharePercentage,
      trustId: data.trustId,
      status: data.status || 'ACTIVE'
    }, data.id)
    this.planRoles.set(role.id, role)
    return role
  }

  getPlanRole(id: string): PlanRole | undefined { return this.planRoles.get(id) }
  getPlanRolesByPlanId(planId: string): PlanRole[] { return [...this.planRoles.values()].filter(r => r.planId === planId) }

  // ---------------------------------------------------------------------------
  // Verification Helpers
  // ---------------------------------------------------------------------------

  /** Verify Belly Button Principle for a client */
  verifyBellyButton(clientId: string) {
    const errors: string[] = []
    const client = this.clients.get(clientId)
    if (!client) return { valid: false, person: null, user: null, client: null, errors: ['Client not found'] }

    const person = this.people.get(client.personId)
    if (!person) errors.push(`Client ${clientId} references non-existent person ${client.personId}`)

    return { valid: errors.length === 0, person: person || null, user: this.getUserByPersonId(client.personId) || null, client, errors }
  }

  /** Verify estate plan architecture */
  verifyEstatePlan(planId: string) {
    const errors: string[] = []
    const plan = this.estatePlans.get(planId)
    if (!plan) return { valid: false, plan: null, grantors: [], trusts: [], wills: [], ancillaryDocuments: [], roles: [], errors: ['Estate plan not found'] }

    const grantors: Person[] = []
    const g1 = this.people.get(plan.grantorPersonId1)
    if (g1) grantors.push(g1); else errors.push(`Grantor1 ${plan.grantorPersonId1} does not exist`)
    if (plan.grantorPersonId2) {
      const g2 = this.people.get(plan.grantorPersonId2)
      if (g2) grantors.push(g2); else errors.push(`Grantor2 ${plan.grantorPersonId2} does not exist`)
    }

    const trusts = this.getTrustsByPlanId(planId)
    const wills = this.getWillsByPlanId(planId)
    const ancillaryDocuments = this.getAncillaryDocumentsByPlanId(planId)
    const roles = this.getPlanRolesByPlanId(planId)

    for (const r of roles) {
      if (!this.people.has(r.personId)) errors.push(`Role ${r.id} references non-existent person ${r.personId}`)
      if (r.forPersonId && !this.people.has(r.forPersonId)) errors.push(`Role ${r.id} forPersonId ${r.forPersonId} does not exist`)
    }
    for (const d of ancillaryDocuments) {
      if (!this.people.has(d.personId)) errors.push(`AncillaryDoc ${d.id} references non-existent person ${d.personId}`)
    }

    return { valid: errors.length === 0, plan, grantors, trusts, wills, ancillaryDocuments, roles, errors }
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  getCounts() {
    return {
      people: this.people.size,
      users: this.users.size,
      clients: this.clients.size,
      relationships: this.relationships.size,
      estatePlans: this.estatePlans.size,
      trusts: this.trusts.size,
      wills: this.wills.size,
      ancillaryDocuments: this.ancillaryDocuments.size,
      planRoles: this.planRoles.size
    }
  }

  reset(): void {
    this.people.clear()
    this.users.clear()
    this.clients.clear()
    this.relationships.clear()
    this.estatePlans.clear()
    this.trusts.clear()
    this.wills.clear()
    this.ancillaryDocuments.clear()
    this.planRoles.clear()
  }
}
