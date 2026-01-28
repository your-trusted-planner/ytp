// WealthCounsel Import Types

export interface WealthCounselPerson {
  firstName?: string
  lastName?: string
  middleName?: string
  fullName?: string
  suffix?: string
  email?: string
  phone?: string
  cellPhone?: string
  workPhone?: string
  address?: string
  city?: string
  county?: string
  state?: string
  zipCode?: string
  dateOfBirth?: string
  ssn?: string
  dateOfDeath?: string
  relationship?: string
}

export interface WealthCounselTrust {
  name: string
  type?: string
  isJoint: boolean
  signDate?: string
  jurisdiction?: string
  trusteeNames: string[]
  successorTrusteeNames: string[]
  mcOptions?: Record<string, any>
}

export interface WealthCounselWill {
  executionDate?: string
  jurisdiction?: string
  personalRepNames: string[]
}

export interface WealthCounselRole {
  personName: string
  roleType: string
  isPrimary: boolean
  ordinal: number
  // Which person/document this role belongs to
  forPerson?: 'CLIENT' | 'SPOUSE' | 'TRUST'
  // Beneficiary-specific
  sharePercentage?: number
  shareType?: string
  relationship?: string
}

// Individual document fiduciaries (POA, healthcare directive, will)
export interface IndividualFiduciaries {
  financialAgents: WealthCounselRole[]
  financialAgentSuccessors: WealthCounselRole[]
  healthcareAgents: WealthCounselRole[]
  healthcareAgentSuccessors: WealthCounselRole[]
  executors: WealthCounselRole[]
  guardians: WealthCounselRole[]
}

export interface WealthCounselBeneficiary {
  name: string
  percentage?: string
  relationship?: string
  address?: string
}

export interface WealthCounselData {
  // Source identification
  clientId?: string
  dataFileVersion?: string

  // Primary client
  client: WealthCounselPerson

  // Spouse (if any)
  spouse?: WealthCounselPerson

  // Children
  children: WealthCounselPerson[]

  // Plan type
  planType: 'TRUST_BASED' | 'WILL_BASED'

  // Trust information (if trust-based)
  trust?: WealthCounselTrust

  // Will information
  will?: WealthCounselWill

  // Fiduciary roles - organized by document ownership
  fiduciaries: {
    // Trust-level fiduciaries (shared for joint trusts)
    trustees: WealthCounselRole[]
    successorTrustees: WealthCounselRole[]
    trustProtectors: WealthCounselRole[]
    // Client's individual document fiduciaries (POA, healthcare directive, will)
    client: IndividualFiduciaries
    // Spouse's individual document fiduciaries (from "wf" suffix fields)
    spouse: IndividualFiduciaries
  }

  // Legacy flat structure for backward compatibility
  // TODO: Remove after updating all consumers
  legacyFiduciaries?: {
    trustees: WealthCounselRole[]
    successorTrustees: WealthCounselRole[]
    financialAgents: WealthCounselRole[]
    healthcareAgents: WealthCounselRole[]
    executors: WealthCounselRole[]
    guardians: WealthCounselRole[]
  }

  // Beneficiaries
  beneficiaries: WealthCounselBeneficiary[]

  // Raw fields for debugging/reference
  rawFields: Map<string, any>
}

// Person matching decision for import
export interface PersonMatchDecision {
  extractedName: string  // Key to identify which extracted person this is for
  action: 'use_existing' | 'create_new'
  existingPersonId?: string  // Required if action is 'use_existing'
}

// Import decisions from user
export interface WealthCounselImportDecisions {
  // Whether to link to existing person or create new
  clientPersonId?: string
  spousePersonId?: string

  // Person matching decisions for all extracted people
  personDecisions?: PersonMatchDecision[]

  // Whether this is an amendment to existing plan
  isAmendment: boolean
  existingPlanId?: string

  // Optional matter to link
  linkToMatterId?: string

  // Whether to create people records for family members (deprecated - use personDecisions instead)
  createPeopleRecords: boolean
}

// Import result
export interface WealthCounselImportResult {
  success: boolean
  planId?: string
  versionId?: string
  peopleCreated: number
  rolesCreated: number
  errors?: string[]
}

// Match suggestion from duplicate detection
export interface WealthCounselMatchSuggestion {
  personId: string
  personName: string
  email?: string | null
  dateOfBirth?: string | null
  matchType: 'SSN' | 'NAME_EMAIL' | 'NAME_DOB' | 'NAME_ONLY'
  confidence: number  // 0-100
  matchingFields: string[]
}

// Extracted person with potential matches
export interface ExtractedPersonWithMatches {
  // Extracted data from XML
  extractedName: string
  extractedEmail?: string
  extractedDateOfBirth?: string
  role: 'client' | 'spouse' | 'child' | 'beneficiary' | 'fiduciary'
  rolesInPlan: string[]  // e.g., ['Trustee', 'Financial Agent']

  // Potential matches from database
  matches: WealthCounselMatchSuggestion[]

  // User's decision (set during import)
  decision?: 'use_existing' | 'create_new'
  selectedPersonId?: string  // If use_existing
}

// Parse result returned to frontend
export interface WealthCounselParseResult {
  parseId: string  // Temporary ID for this parse session

  parsed: {
    client: {
      fullName: string
      firstName?: string
      lastName?: string
      email?: string
      phone?: string
      address?: string
      city?: string
      state?: string
      zipCode?: string
      dateOfBirth?: string
    }
    spouse?: {
      fullName: string
      firstName?: string
      lastName?: string
      email?: string
      phone?: string
      dateOfBirth?: string
    }
    children: Array<{
      name: string
      dateOfBirth?: string
    }>
    planType: 'TRUST_BASED' | 'WILL_BASED'
    trust?: {
      name: string
      type?: string
      isJoint: boolean
      signDate?: string
    }
    will?: {
      executionDate?: string
    }
    fiduciaries: Array<{
      name: string
      role: string
      forPerson?: 'CLIENT' | 'SPOUSE' | 'TRUST'
    }>
    beneficiaries: Array<{
      name: string
      share?: string
      relationship?: string
    }>
    fiduciarySummary?: {
      uniquePeople: number
      totalRoleAssignments: number
      roleTypes: string[]
    }
    rawFieldCount: number
  }

  suggestions: {
    clientMatch?: WealthCounselMatchSuggestion
    spouseMatch?: WealthCounselMatchSuggestion
    existingPlans: Array<{
      planId: string
      planName: string
      status: string
    }>
    matterSuggestions: Array<{
      matterId: string
      title: string
      clientName: string
    }>
  }

  // All extracted people with their potential matches
  extractedPeople: ExtractedPersonWithMatches[]
}

// Mapping of WealthCounsel role types to our schema
export const WC_ROLE_MAPPING: Record<string, { roleType: string; roleCategory: string }> = {
  'RLT Trustee Initial': { roleType: 'TRUSTEE', roleCategory: 'FIDUCIARY' },
  'RLT Trustee Successor': { roleType: 'SUCCESSOR_TRUSTEE', roleCategory: 'FIDUCIARY' },
  'Financial Agent initial': { roleType: 'FINANCIAL_AGENT', roleCategory: 'FIDUCIARY' },
  'Financial Agent successor': { roleType: 'ALTERNATE_FINANCIAL_AGENT', roleCategory: 'FIDUCIARY' },
  'Healthcare Agent': { roleType: 'HEALTHCARE_AGENT', roleCategory: 'FIDUCIARY' },
  'Healthcare Agent Successor': { roleType: 'ALTERNATE_HEALTHCARE_AGENT', roleCategory: 'FIDUCIARY' },
  'Personal Representative': { roleType: 'EXECUTOR', roleCategory: 'FIDUCIARY' },
  'Will Guardian': { roleType: 'GUARDIAN_OF_PERSON', roleCategory: 'GUARDIAN' },
  'Residuary Beneficiary': { roleType: 'PRIMARY_BENEFICIARY', roleCategory: 'BENEFICIARY' }
}

// Trust type mapping
export const WC_TRUST_TYPE_MAPPING: Record<string, string> = {
  'Revocable Living Trust': 'REVOCABLE_LIVING',
  'Irrevocable Living Trust': 'IRREVOCABLE_LIVING',
  'Testamentary Trust': 'TESTAMENTARY',
  'Special Needs Trust': 'SPECIAL_NEEDS',
  'Charitable Remainder Trust': 'CHARITABLE_REMAINDER',
  'ILIT': 'ILIT',
  'GRAT': 'GRAT'
}
