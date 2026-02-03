/**
 * Type definitions for Mock Repository
 * These mirror the schema shapes for architectural enforcement tests.
 */

// =============================================================================
// Core Entity Types (Belly Button Principle)
// =============================================================================

export interface Person {
  id: string
  personType: 'individual' | 'entity'
  firstName?: string
  lastName?: string
  fullName?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  dateOfBirth?: string
  ssnLast4?: string
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  personId: string
  email: string
  password?: string
  role: 'ADMIN' | 'LAWYER' | 'STAFF' | 'CLIENT' | 'LEAD' | 'PROSPECT' | 'INACTIVE'
  adminLevel: number
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: Date
  updatedAt: Date
}

export interface Client {
  id: string
  personId: string
  status: 'LEAD' | 'PROSPECT' | 'ACTIVE' | 'INACTIVE'
  hasMinorChildren?: boolean
  childrenInfo?: string
  hasWill?: boolean
  hasTrust?: boolean
  businessName?: string
  businessType?: string
  referralType?: string
  referredByPersonId?: string
  referredByPartnerId?: string
  referralNotes?: string
  createdAt: Date
  updatedAt: Date
}

export interface Relationship {
  id: string
  fromPersonId: string
  toPersonId: string
  relationshipType: string
  context?: 'client' | 'matter' | null
  contextId?: string
  createdAt: Date
  updatedAt: Date
}

// =============================================================================
// Estate Plan Types
// =============================================================================

export type PlanType = 'TRUST_BASED' | 'WILL_BASED'
export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'AMENDED' | 'INCAPACITATED' | 'ADMINISTERED' | 'DISTRIBUTED' | 'CLOSED'
export type TrustType = 'REVOCABLE_LIVING' | 'IRREVOCABLE_LIVING' | 'TESTAMENTARY' | 'SPECIAL_NEEDS' | 'CHARITABLE_REMAINDER' | 'OTHER'
export type WillType = 'SIMPLE' | 'POUR_OVER' | 'TESTAMENTARY_TRUST' | 'OTHER'
export type AncillaryDocType = 'FINANCIAL_POA' | 'HEALTHCARE_POA' | 'ADVANCE_DIRECTIVE' | 'HIPAA_AUTHORIZATION' | 'NOMINATION_OF_GUARDIAN' | 'OTHER'
export type RoleCategory = 'GRANTOR' | 'FIDUCIARY' | 'BENEFICIARY' | 'GUARDIAN' | 'OTHER'
export type RoleType =
  | 'GRANTOR' | 'TESTATOR'
  | 'TRUSTEE' | 'CO_TRUSTEE' | 'SUCCESSOR_TRUSTEE'
  | 'PRIMARY_BENEFICIARY' | 'CONTINGENT_BENEFICIARY' | 'REMAINDER_BENEFICIARY'
  | 'EXECUTOR' | 'CO_EXECUTOR' | 'ALTERNATE_EXECUTOR'
  | 'FINANCIAL_AGENT' | 'ALTERNATE_FINANCIAL_AGENT'
  | 'HEALTHCARE_AGENT' | 'ALTERNATE_HEALTHCARE_AGENT'
  | 'GUARDIAN_OF_PERSON' | 'GUARDIAN_OF_ESTATE' | 'WITNESS' | 'NOTARY'

export interface EstatePlan {
  id: string
  grantorPersonId1: string
  grantorPersonId2?: string
  planType: PlanType
  planName?: string
  currentVersion: number
  status: PlanStatus
  createdAt: Date
  updatedAt: Date
}

export interface Trust {
  id: string
  planId: string
  trustName: string
  trustType?: TrustType
  isJoint?: boolean
  isRevocable?: boolean
  jurisdiction?: string
  createdAt: Date
  updatedAt: Date
}

export interface Will {
  id: string
  planId: string
  personId?: string
  willType?: WillType
  jurisdiction?: string
  pourOverTrustId?: string
  createdAt: Date
  updatedAt: Date
}

export interface AncillaryDocument {
  id: string
  planId: string
  personId: string
  documentType: AncillaryDocType
  title?: string
  status: 'DRAFT' | 'EXECUTED' | 'REVOKED' | 'SUPERSEDED'
  createdAt: Date
  updatedAt: Date
}

export interface PlanRole {
  id: string
  planId: string
  personId: string
  forPersonId?: string
  roleCategory: RoleCategory
  roleType: RoleType
  isPrimary?: boolean
  ordinal?: number
  sharePercentage?: number
  trustId?: string
  status: 'ACTIVE' | 'SUCCEEDED' | 'DECLINED' | 'DECEASED' | 'REMOVED' | 'TERMINATED'
  createdAt: Date
  updatedAt: Date
}

// =============================================================================
// Input Types (for create methods)
// =============================================================================

export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
export type CreatePlanInput = Omit<EstatePlan, 'id' | 'createdAt' | 'updatedAt' | 'currentVersion'> & { id?: string }
