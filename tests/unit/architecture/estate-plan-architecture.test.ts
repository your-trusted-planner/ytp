/**
 * Estate Plan Architecture - Enforcement Tests
 *
 * These tests serve as guardrails to ensure the Plan-Centric Architecture
 * is followed for estate plans. Key invariants:
 *
 * 1. Every estate plan must have at least one grantor (person)
 * 2. Trusts, wills, ancillary docs must belong to a plan
 * 3. All roles must reference both a plan AND a person
 * 4. Ancillary documents must specify whose document it is
 * 5. Person references (grantors, roles, etc.) must exist
 *
 * The Plan-Centric Architecture states:
 * - Plans exist independently of matters but connect when work is done
 * - Plans are owned by people (grantors), not clients
 * - A plan can have one grantor (individual) or two grantors (joint/married)
 * - All plan components (trusts, wills, roles) cascade from the plan
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  MockRepository,
  EstatePlanViolationError,
  BellyButtonViolationError,
  createSingleGrantorTrustPlan,
  createJointTrustPlan,
  createWillBasedPlan,
  addBeneficiaryToPlan,
  addFiduciaryToPlan,
  addAncillaryDocuments
} from '../../utils/mock-repository'

describe('Estate Plan Architecture', () => {
  let repo: MockRepository

  beforeEach(() => {
    repo = new MockRepository()
  })

  describe('Core Invariants', () => {
    it('requires grantor person to exist before creating plan', () => {
      // Grantor validation uses BellyButtonViolationError (person must exist)
      expect(() => {
        repo.createEstatePlan({
          grantorPersonId1: 'nonexistent-person',
          planType: 'TRUST_BASED',
          status: 'DRAFT'
        })
      }).toThrow(BellyButtonViolationError)
    })

    it('requires grantorPersonId1 to be set', () => {
      expect(() => {
        repo.createEstatePlan({
          grantorPersonId1: '',
          planType: 'TRUST_BASED',
          status: 'DRAFT'
        })
      }).toThrow(BellyButtonViolationError)
    })

    it('validates second grantor exists for joint plans', () => {
      const grantor1 = repo.createPerson({
        personType: 'individual',
        firstName: 'John',
        lastName: 'Doe'
      })

      expect(() => {
        repo.createEstatePlan({
          grantorPersonId1: grantor1.id,
          grantorPersonId2: 'nonexistent-spouse',
          planType: 'TRUST_BASED',
          status: 'DRAFT'
        })
      }).toThrow(BellyButtonViolationError)
    })

    it('allows plan with only one grantor', () => {
      const grantor = repo.createPerson({
        personType: 'individual',
        firstName: 'Solo',
        lastName: 'Grantor'
      })

      const plan = repo.createEstatePlan({
        grantorPersonId1: grantor.id,
        planType: 'TRUST_BASED',
        status: 'DRAFT'
      })

      expect(plan.grantorPersonId1).toBe(grantor.id)
      expect(plan.grantorPersonId2).toBeUndefined()
    })
  })

  describe('Trust Constraints', () => {
    it('requires trust to belong to a plan', () => {
      expect(() => {
        repo.createTrust({
          planId: 'nonexistent-plan',
          trustName: 'Orphan Trust'
        })
      }).toThrow(EstatePlanViolationError)
    })

    it('requires planId to be set', () => {
      expect(() => {
        repo.createTrust({
          planId: '',
          trustName: 'No Plan Trust'
        })
      }).toThrow(EstatePlanViolationError)
    })

    it('creates trust linked to valid plan', () => {
      const { plan } = createSingleGrantorTrustPlan(repo)

      const additionalTrust = repo.createTrust({
        planId: plan.id,
        trustName: 'Special Needs Trust',
        trustType: 'SPECIAL_NEEDS'
      })

      expect(additionalTrust.planId).toBe(plan.id)
      expect(repo.getTrustsByPlanId(plan.id)).toHaveLength(2)
    })
  })

  describe('Will Constraints', () => {
    it('requires will to belong to a plan', () => {
      expect(() => {
        repo.createWill({
          planId: 'nonexistent-plan',
          willType: 'SIMPLE'
        })
      }).toThrow(EstatePlanViolationError)
    })

    it('validates personId if specified (whose will)', () => {
      const grantor = repo.createPerson({
        personType: 'individual',
        firstName: 'Test',
        lastName: 'Grantor'
      })

      const plan = repo.createEstatePlan({
        grantorPersonId1: grantor.id,
        planType: 'WILL_BASED',
        status: 'DRAFT'
      })

      expect(() => {
        repo.createWill({
          planId: plan.id,
          personId: 'nonexistent-person',
          willType: 'SIMPLE'
        })
      }).toThrow(EstatePlanViolationError)
    })

    it('validates pour-over trust exists and belongs to same plan', () => {
      const grantor = repo.createPerson({
        personType: 'individual',
        firstName: 'Test',
        lastName: 'Grantor'
      })

      const plan = repo.createEstatePlan({
        grantorPersonId1: grantor.id,
        planType: 'TRUST_BASED',
        status: 'DRAFT'
      })

      // Try to link to non-existent trust
      expect(() => {
        repo.createWill({
          planId: plan.id,
          willType: 'POUR_OVER',
          pourOverTrustId: 'nonexistent-trust'
        })
      }).toThrow(EstatePlanViolationError)
    })

    it('prevents linking will to trust from different plan', () => {
      const { plan: plan1, trust: trust1 } = createSingleGrantorTrustPlan(repo, {
        grantor: { firstName: 'Plan1', lastName: 'Grantor' }
      })

      const grantor2 = repo.createPerson({
        personType: 'individual',
        firstName: 'Plan2',
        lastName: 'Grantor'
      })

      const plan2 = repo.createEstatePlan({
        grantorPersonId1: grantor2.id,
        planType: 'TRUST_BASED',
        status: 'DRAFT'
      })

      // Try to link plan2's will to plan1's trust
      expect(() => {
        repo.createWill({
          planId: plan2.id,
          willType: 'POUR_OVER',
          pourOverTrustId: trust1.id  // Wrong plan!
        })
      }).toThrow(EstatePlanViolationError)
    })
  })

  describe('Ancillary Document Constraints', () => {
    it('requires ancillary document to belong to a plan', () => {
      const person = repo.createPerson({
        personType: 'individual',
        firstName: 'Test',
        lastName: 'Person'
      })

      expect(() => {
        repo.createAncillaryDocument({
          planId: 'nonexistent-plan',
          personId: person.id,
          documentType: 'FINANCIAL_POA',
          status: 'DRAFT'
        })
      }).toThrow(EstatePlanViolationError)
    })

    it('requires ancillary document to specify whose document', () => {
      const { plan } = createSingleGrantorTrustPlan(repo)

      // Person validation uses BellyButtonViolationError
      expect(() => {
        repo.createAncillaryDocument({
          planId: plan.id,
          personId: '', // Missing!
          documentType: 'HEALTHCARE_POA',
          status: 'DRAFT'
        })
      }).toThrow(BellyButtonViolationError)
    })

    it('validates person exists for ancillary document', () => {
      const { plan } = createSingleGrantorTrustPlan(repo)

      expect(() => {
        repo.createAncillaryDocument({
          planId: plan.id,
          personId: 'nonexistent-person',
          documentType: 'ADVANCE_DIRECTIVE',
          status: 'DRAFT'
        })
      }).toThrow(BellyButtonViolationError)
    })

    it('creates valid ancillary documents for grantor', () => {
      const { grantor, plan } = createSingleGrantorTrustPlan(repo)

      const docs = addAncillaryDocuments(repo, plan.id, grantor.id)

      expect(docs).toHaveLength(4)
      expect(docs.map(d => d.documentType)).toEqual([
        'FINANCIAL_POA',
        'HEALTHCARE_POA',
        'ADVANCE_DIRECTIVE',
        'HIPAA_AUTHORIZATION'
      ])
    })
  })

  describe('Plan Role Constraints', () => {
    it('requires role to belong to a plan', () => {
      const person = repo.createPerson({
        personType: 'individual',
        firstName: 'Test',
        lastName: 'Person'
      })

      expect(() => {
        repo.createPlanRole({
          planId: 'nonexistent-plan',
          personId: person.id,
          roleCategory: 'BENEFICIARY',
          roleType: 'PRIMARY_BENEFICIARY',
          status: 'ACTIVE'
        })
      }).toThrow(EstatePlanViolationError)
    })

    it('requires role to specify the person in that role', () => {
      const { plan } = createSingleGrantorTrustPlan(repo)

      // Person validation uses BellyButtonViolationError
      expect(() => {
        repo.createPlanRole({
          planId: plan.id,
          personId: '', // Missing!
          roleCategory: 'FIDUCIARY',
          roleType: 'TRUSTEE',
          status: 'ACTIVE'
        })
      }).toThrow(BellyButtonViolationError)
    })

    it('validates person exists for role', () => {
      const { plan } = createSingleGrantorTrustPlan(repo)

      expect(() => {
        repo.createPlanRole({
          planId: plan.id,
          personId: 'nonexistent-person',
          roleCategory: 'BENEFICIARY',
          roleType: 'PRIMARY_BENEFICIARY',
          status: 'ACTIVE'
        })
      }).toThrow(BellyButtonViolationError)
    })

    it('validates forPersonId if specified', () => {
      const { plan, grantor } = createSingleGrantorTrustPlan(repo)

      const agent = repo.createPerson({
        personType: 'individual',
        firstName: 'POA',
        lastName: 'Agent'
      })

      // Valid: agent for grantor
      const role = repo.createPlanRole({
        planId: plan.id,
        personId: agent.id,
        forPersonId: grantor.id,
        roleCategory: 'FIDUCIARY',
        roleType: 'FINANCIAL_AGENT',
        status: 'ACTIVE'
      })
      expect(role.forPersonId).toBe(grantor.id)

      // Invalid: forPersonId doesn't exist
      expect(() => {
        repo.createPlanRole({
          planId: plan.id,
          personId: agent.id,
          forPersonId: 'nonexistent',
          roleCategory: 'FIDUCIARY',
          roleType: 'HEALTHCARE_AGENT',
          status: 'ACTIVE'
        })
      }).toThrow(EstatePlanViolationError)
    })

    it('validates trustId if specified', () => {
      const { plan, trust } = createSingleGrantorTrustPlan(repo)

      const beneficiary = repo.createPerson({
        personType: 'individual',
        firstName: 'Trust',
        lastName: 'Beneficiary'
      })

      // Valid: beneficiary of the trust
      const role = repo.createPlanRole({
        planId: plan.id,
        personId: beneficiary.id,
        trustId: trust.id,
        roleCategory: 'BENEFICIARY',
        roleType: 'PRIMARY_BENEFICIARY',
        status: 'ACTIVE'
      })
      expect(role.trustId).toBe(trust.id)

      // Invalid: trust doesn't exist
      expect(() => {
        repo.createPlanRole({
          planId: plan.id,
          personId: beneficiary.id,
          trustId: 'nonexistent-trust',
          roleCategory: 'BENEFICIARY',
          roleType: 'CONTINGENT_BENEFICIARY',
          status: 'ACTIVE'
        })
      }).toThrow(EstatePlanViolationError)
    })

    it('prevents linking role to trust from different plan', () => {
      const { plan: plan1, trust: trust1 } = createSingleGrantorTrustPlan(repo, {
        grantor: { firstName: 'Plan1', lastName: 'Grantor' }
      })

      const { plan: plan2 } = createSingleGrantorTrustPlan(repo, {
        grantor: { firstName: 'Plan2', lastName: 'Grantor' }
      })

      const beneficiary = repo.createPerson({
        personType: 'individual',
        firstName: 'Cross',
        lastName: 'Beneficiary'
      })

      // Try to create role in plan2 pointing to plan1's trust
      expect(() => {
        repo.createPlanRole({
          planId: plan2.id,
          personId: beneficiary.id,
          trustId: trust1.id,  // Wrong plan!
          roleCategory: 'BENEFICIARY',
          roleType: 'PRIMARY_BENEFICIARY',
          status: 'ACTIVE'
        })
      }).toThrow(EstatePlanViolationError)
    })
  })

  describe('Valid Plan Creation Patterns', () => {
    it('creates single-grantor trust plan with all components', () => {
      const { grantor, plan, trust, will } = createSingleGrantorTrustPlan(repo)

      // Verify plan
      expect(plan.grantorPersonId1).toBe(grantor.id)
      expect(plan.planType).toBe('TRUST_BASED')

      // Verify trust
      expect(trust.planId).toBe(plan.id)
      expect(trust.trustType).toBe('REVOCABLE_LIVING')

      // Verify will
      expect(will.planId).toBe(plan.id)
      expect(will.personId).toBe(grantor.id)
      expect(will.pourOverTrustId).toBe(trust.id)

      // Verify verification passes
      const verification = repo.verifyEstatePlan(plan.id)
      expect(verification.valid).toBe(true)
      expect(verification.grantors).toHaveLength(1)
      expect(verification.trusts).toHaveLength(1)
      expect(verification.wills).toHaveLength(1)
      expect(verification.roles.length).toBeGreaterThan(0)
    })

    it('creates joint trust plan with both grantors', () => {
      const { grantor1, grantor2, plan, trust, will1, will2 } = createJointTrustPlan(repo)

      // Verify plan has both grantors
      expect(plan.grantorPersonId1).toBe(grantor1.id)
      expect(plan.grantorPersonId2).toBe(grantor2.id)

      // Verify joint trust
      expect(trust.isJoint).toBe(true)

      // Verify each grantor has their own will
      expect(will1.personId).toBe(grantor1.id)
      expect(will2.personId).toBe(grantor2.id)

      // Both wills pour over to the same trust
      expect(will1.pourOverTrustId).toBe(trust.id)
      expect(will2.pourOverTrustId).toBe(trust.id)

      // Verify verification passes
      const verification = repo.verifyEstatePlan(plan.id)
      expect(verification.valid).toBe(true)
      expect(verification.grantors).toHaveLength(2)
      expect(verification.wills).toHaveLength(2)
    })

    it('creates will-based plan (no trust)', () => {
      const { grantor, plan, will } = createWillBasedPlan(repo)

      expect(plan.planType).toBe('WILL_BASED')
      expect(will.willType).toBe('SIMPLE')
      expect(will.pourOverTrustId).toBeUndefined()

      // Verify no trusts in this plan
      const verification = repo.verifyEstatePlan(plan.id)
      expect(verification.trusts).toHaveLength(0)
    })

    it('adds beneficiaries to existing plan', () => {
      const { plan } = createSingleGrantorTrustPlan(repo)

      const { beneficiary: child1 } = addBeneficiaryToPlan(repo, plan.id, {
        beneficiary: { firstName: 'Child', lastName: 'One' },
        role: { sharePercentage: 50 }
      })

      const { beneficiary: child2 } = addBeneficiaryToPlan(repo, plan.id, {
        beneficiary: { firstName: 'Child', lastName: 'Two' },
        role: { sharePercentage: 50 }
      })

      const roles = repo.getPlanRolesByPlanId(plan.id)
      const beneficiaryRoles = roles.filter(r => r.roleCategory === 'BENEFICIARY')

      expect(beneficiaryRoles).toHaveLength(2)
      expect(beneficiaryRoles[0].personId).toBe(child1.id)
      expect(beneficiaryRoles[1].personId).toBe(child2.id)
    })

    it('adds fiduciaries to existing plan', () => {
      const { plan } = createSingleGrantorTrustPlan(repo)

      const { fiduciary: trustee } = addFiduciaryToPlan(repo, plan.id, 'TRUSTEE', {
        fiduciary: { firstName: 'Main', lastName: 'Trustee' }
      })

      const { fiduciary: successor } = addFiduciaryToPlan(repo, plan.id, 'SUCCESSOR_TRUSTEE', {
        fiduciary: { firstName: 'Backup', lastName: 'Trustee' }
      })

      const roles = repo.getPlanRolesByPlanId(plan.id)
      const fiduciaryRoles = roles.filter(r => r.roleCategory === 'FIDUCIARY')

      expect(fiduciaryRoles).toHaveLength(2)
      expect(fiduciaryRoles.find(r => r.roleType === 'TRUSTEE')?.personId).toBe(trustee.id)
      expect(fiduciaryRoles.find(r => r.roleType === 'SUCCESSOR_TRUSTEE')?.personId).toBe(successor.id)
    })
  })

  describe('Plan Creation Order', () => {
    /**
     * These tests verify that estate plan creation follows the correct order:
     * 1. Create person(s) for grantor(s)
     * 2. Create estate plan linked to grantor(s)
     * 3. Create trusts linked to plan
     * 4. Create wills linked to plan (and optionally trust)
     * 5. Create ancillary documents linked to plan and person
     * 6. Create roles linked to plan and person
     */

    it('demonstrates correct creation order for trust-based plan', () => {
      // Step 1: Create grantor FIRST
      const grantor = repo.createPerson({
        personType: 'individual',
        firstName: 'John',
        lastName: 'Smith'
      })

      // Step 2: Create plan linked to grantor
      const plan = repo.createEstatePlan({
        grantorPersonId1: grantor.id,
        planType: 'TRUST_BASED',
        planName: 'Smith Family Trust',
        status: 'DRAFT'
      })

      // Step 3: Create trust linked to plan
      const trust = repo.createTrust({
        planId: plan.id,
        trustName: 'Smith Revocable Living Trust',
        trustType: 'REVOCABLE_LIVING'
      })

      // Step 4: Create will linked to plan and trust
      const will = repo.createWill({
        planId: plan.id,
        personId: grantor.id,
        willType: 'POUR_OVER',
        pourOverTrustId: trust.id
      })

      // Step 5: Create ancillary documents
      const fpoa = repo.createAncillaryDocument({
        planId: plan.id,
        personId: grantor.id,
        documentType: 'FINANCIAL_POA',
        status: 'DRAFT'
      })

      // Step 6: Create beneficiary
      const child = repo.createPerson({
        personType: 'individual',
        firstName: 'Junior',
        lastName: 'Smith'
      })

      const beneficiaryRole = repo.createPlanRole({
        planId: plan.id,
        personId: child.id,
        roleCategory: 'BENEFICIARY',
        roleType: 'PRIMARY_BENEFICIARY',
        sharePercentage: 100,
        status: 'ACTIVE'
      })

      // Verify chain
      expect(plan.grantorPersonId1).toBe(grantor.id)
      expect(trust.planId).toBe(plan.id)
      expect(will.planId).toBe(plan.id)
      expect(will.pourOverTrustId).toBe(trust.id)
      expect(fpoa.planId).toBe(plan.id)
      expect(fpoa.personId).toBe(grantor.id)
      expect(beneficiaryRole.planId).toBe(plan.id)
      expect(beneficiaryRole.personId).toBe(child.id)

      const verification = repo.verifyEstatePlan(plan.id)
      expect(verification.valid).toBe(true)
    })

    it('fails when trying to create plan before grantor', () => {
      // Grantor validation uses BellyButtonViolationError (person must exist)
      expect(() => {
        repo.createEstatePlan({
          grantorPersonId1: 'will-create-later',
          planType: 'TRUST_BASED',
          status: 'DRAFT'
        })
      }).toThrow(BellyButtonViolationError)
    })

    it('fails when trying to create trust before plan', () => {
      expect(() => {
        repo.createTrust({
          planId: 'will-create-later',
          trustName: 'Premature Trust'
        })
      }).toThrow(EstatePlanViolationError)
    })

    it('fails when trying to create role before plan', () => {
      const person = repo.createPerson({
        personType: 'individual',
        firstName: 'Eager',
        lastName: 'Beneficiary'
      })

      expect(() => {
        repo.createPlanRole({
          planId: 'will-create-later',
          personId: person.id,
          roleCategory: 'BENEFICIARY',
          roleType: 'PRIMARY_BENEFICIARY',
          status: 'ACTIVE'
        })
      }).toThrow(EstatePlanViolationError)
    })
  })

  describe('Verification Helper', () => {
    it('reports error for non-existent plan', () => {
      const result = repo.verifyEstatePlan('nonexistent')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Estate plan not found')
    })

    it('reports all components for valid plan', () => {
      const { grantor, plan, trust, will } = createSingleGrantorTrustPlan(repo)
      addAncillaryDocuments(repo, plan.id, grantor.id)
      addBeneficiaryToPlan(repo, plan.id)
      addFiduciaryToPlan(repo, plan.id, 'SUCCESSOR_TRUSTEE')

      const result = repo.verifyEstatePlan(plan.id)

      expect(result.valid).toBe(true)
      expect(result.plan).toEqual(plan)
      expect(result.grantors).toHaveLength(1)
      expect(result.trusts).toHaveLength(1)
      expect(result.wills).toHaveLength(1)
      expect(result.ancillaryDocuments).toHaveLength(4)
      expect(result.roles.length).toBeGreaterThanOrEqual(3) // grantor + beneficiary + fiduciary
    })
  })

  describe('Repository Isolation', () => {
    it('reset clears all estate plan data', () => {
      createJointTrustPlan(repo)

      expect(repo.getCounts().estatePlans).toBeGreaterThan(0)
      expect(repo.getCounts().trusts).toBeGreaterThan(0)
      expect(repo.getCounts().wills).toBeGreaterThan(0)
      expect(repo.getCounts().planRoles).toBeGreaterThan(0)

      repo.reset()

      expect(repo.getCounts().estatePlans).toBe(0)
      expect(repo.getCounts().trusts).toBe(0)
      expect(repo.getCounts().wills).toBe(0)
      expect(repo.getCounts().ancillaryDocuments).toBe(0)
      expect(repo.getCounts().planRoles).toBe(0)
    })
  })
})
