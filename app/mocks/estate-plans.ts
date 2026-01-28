// Mock data for estate plans - based on WealthCounsel sample data
// This data is used for UI development before the backend is ready

export interface MockPerson {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  dateOfBirth?: string
  relationship?: string
}

export interface MockPlanRole {
  id: string
  planId: string
  personId: string
  person: MockPerson
  // For joint plans: whose document does this role apply to?
  // undefined = plan-level (trust, beneficiaries)
  // personId = person-level (executor for their will, agent for their POA)
  forPersonId?: string
  forPerson?: MockPerson  // Resolved person data
  // Link to specific document
  willId?: string
  ancillaryDocumentId?: string
  roleCategory: 'GRANTOR' | 'FIDUCIARY' | 'BENEFICIARY' | 'GUARDIAN' | 'OTHER'
  roleType: string
  isPrimary: boolean
  ordinal: number
  sharePercentage?: number
  shareType?: string
  conditions?: string
  status: 'ACTIVE' | 'SUCCEEDED' | 'DECLINED' | 'DECEASED' | 'REMOVED' | 'TERMINATED'
}

export interface MockPlanVersion {
  id: string
  planId: string
  version: number
  changeType: 'CREATION' | 'AMENDMENT' | 'RESTATEMENT' | 'CORRECTION' | 'ADMIN_UPDATE'
  changeDescription?: string
  changeSummary?: string
  effectiveDate: string
  createdAt: string
  createdBy?: string
}

export interface MockPlanEvent {
  id: string
  planId: string
  eventType: string
  eventDate: string
  description?: string
  notes?: string
  personName?: string
  createdAt: string
}

export interface MockTrust {
  id: string
  planId: string
  trustName: string
  trustType: string
  isJoint: boolean
  isRevocable: boolean
  jurisdiction?: string
  formationDate?: string
}

export interface MockWill {
  id: string
  planId: string
  personId?: string  // Whose will (for joint plans, each spouse has their own)
  person?: MockPerson  // Resolved person data
  willType: string
  executionDate?: string
  jurisdiction?: string
  codicilCount: number
}

export interface MockAncillaryDocument {
  id: string
  planId: string
  personId: string  // Whose document (always person-specific)
  person?: MockPerson  // Resolved person data
  documentType: 'FINANCIAL_POA' | 'HEALTHCARE_POA' | 'ADVANCE_DIRECTIVE' | 'HIPAA_AUTHORIZATION' | 'NOMINATION_OF_GUARDIAN' | 'DECLARATION_OF_GUARDIAN' | 'OTHER'
  title?: string
  executionDate?: string
  jurisdiction?: string
  status: 'DRAFT' | 'EXECUTED' | 'REVOKED' | 'SUPERSEDED'
}

export interface MockEstatePlan {
  id: string
  grantor1: MockPerson
  grantor2?: MockPerson
  planType: 'TRUST_BASED' | 'WILL_BASED'
  planName: string
  currentVersion: number
  status: 'DRAFT' | 'ACTIVE' | 'AMENDED' | 'INCAPACITATED' | 'ADMINISTERED' | 'DISTRIBUTED' | 'CLOSED'
  effectiveDate?: string
  lastAmendedAt?: string
  trust?: MockTrust
  // Multiple wills supported - in joint plans, each spouse has their own
  wills: MockWill[]
  // Ancillary documents - POAs, healthcare directives, etc. (each spouse has their own)
  ancillaryDocuments: MockAncillaryDocument[]
  roles: MockPlanRole[]
  versions: MockPlanVersion[]
  events: MockPlanEvent[]
  createdAt: string
  updatedAt: string
}

// Sample people - based on Christensen Estate Plan
export const mockPeople: MockPerson[] = [
  {
    id: 'person_matt_christensen',
    firstName: 'Matt',
    lastName: 'Christensen',
    fullName: 'Matt Christensen',
    email: 'matt@enjoyrealty.net',
    address: '5006 Hollycomb Dr',
    city: 'Windsor',
    state: 'CO',
    zipCode: '80550',
    dateOfBirth: '1989-05-09'
  },
  {
    id: 'person_desiree_christensen',
    firstName: 'Desiree',
    lastName: 'Christensen',
    fullName: 'Desiree Christensen',
    email: 'des_mccabe7@yahoo.com',
    address: '5006 Hollycomb Dr',
    city: 'Windsor',
    state: 'CO',
    zipCode: '80550',
    dateOfBirth: '1991-08-29'
  },
  {
    id: 'person_carter_christensen',
    firstName: 'Carter',
    lastName: 'Christensen',
    fullName: 'Carter Christensen',
    dateOfBirth: '2023-08-08',
    relationship: 'Son'
  },
  {
    id: 'person_laura_mccabe',
    firstName: 'Laura Lee',
    lastName: 'McCabe',
    fullName: 'Laura Lee McCabe'
  },
  // Jenkins sample (will-based)
  {
    id: 'person_sandra_jenkins',
    firstName: 'Sandra',
    lastName: 'Jenkins',
    fullName: 'Sandra Jenkins',
    email: 'sandra.jenkins@email.com',
    address: '123 Oak Street',
    city: 'Denver',
    state: 'CO',
    zipCode: '80202',
    dateOfBirth: '1955-03-15'
  },
  {
    id: 'person_michael_jenkins',
    firstName: 'Michael',
    lastName: 'Jenkins',
    fullName: 'Michael Jenkins',
    relationship: 'Son'
  },
  {
    id: 'person_sarah_jenkins',
    firstName: 'Sarah',
    lastName: 'Jenkins-Brown',
    fullName: 'Sarah Jenkins-Brown',
    relationship: 'Daughter'
  }
]

// Christensen Estate Plan (Trust-based, Joint)
export const mockChristensenPlan: MockEstatePlan = {
  id: 'plan_christensen_2024',
  grantor1: mockPeople[0],  // Matt
  grantor2: mockPeople[1],  // Desiree
  planType: 'TRUST_BASED',
  planName: 'Christensen Legacy Family Trust',
  currentVersion: 1,
  status: 'ACTIVE',
  effectiveDate: '2025-12-23',
  trust: {
    id: 'trust_christensen_rlt',
    planId: 'plan_christensen_2024',
    trustName: 'Christensen Legacy Family Trust',
    trustType: 'REVOCABLE_LIVING',
    isJoint: true,
    isRevocable: true,
    jurisdiction: 'CO',
    formationDate: '2025-12-23'
  },
  // Each spouse has their own pour-over will
  wills: [
    {
      id: 'will_matt_pourover',
      planId: 'plan_christensen_2024',
      personId: 'person_matt_christensen',
      person: mockPeople[0],
      willType: 'POUR_OVER',
      executionDate: '2025-12-23',
      jurisdiction: 'CO',
      codicilCount: 0
    },
    {
      id: 'will_desiree_pourover',
      planId: 'plan_christensen_2024',
      personId: 'person_desiree_christensen',
      person: mockPeople[1],
      willType: 'POUR_OVER',
      executionDate: '2025-12-23',
      jurisdiction: 'CO',
      codicilCount: 0
    }
  ],
  // Each spouse has their own ancillary documents
  ancillaryDocuments: [
    // Matt's documents
    {
      id: 'doc_matt_fpoa',
      planId: 'plan_christensen_2024',
      personId: 'person_matt_christensen',
      person: mockPeople[0],
      documentType: 'FINANCIAL_POA',
      title: 'Matt Christensen Financial Power of Attorney',
      executionDate: '2025-12-23',
      jurisdiction: 'CO',
      status: 'EXECUTED'
    },
    {
      id: 'doc_matt_hcpoa',
      planId: 'plan_christensen_2024',
      personId: 'person_matt_christensen',
      person: mockPeople[0],
      documentType: 'HEALTHCARE_POA',
      title: 'Matt Christensen Healthcare Power of Attorney',
      executionDate: '2025-12-23',
      jurisdiction: 'CO',
      status: 'EXECUTED'
    },
    {
      id: 'doc_matt_hipaa',
      planId: 'plan_christensen_2024',
      personId: 'person_matt_christensen',
      person: mockPeople[0],
      documentType: 'HIPAA_AUTHORIZATION',
      title: 'Matt Christensen HIPAA Authorization',
      executionDate: '2025-12-23',
      jurisdiction: 'CO',
      status: 'EXECUTED'
    },
    // Desiree's documents
    {
      id: 'doc_desiree_fpoa',
      planId: 'plan_christensen_2024',
      personId: 'person_desiree_christensen',
      person: mockPeople[1],
      documentType: 'FINANCIAL_POA',
      title: 'Desiree Christensen Financial Power of Attorney',
      executionDate: '2025-12-23',
      jurisdiction: 'CO',
      status: 'EXECUTED'
    },
    {
      id: 'doc_desiree_hcpoa',
      planId: 'plan_christensen_2024',
      personId: 'person_desiree_christensen',
      person: mockPeople[1],
      documentType: 'HEALTHCARE_POA',
      title: 'Desiree Christensen Healthcare Power of Attorney',
      executionDate: '2025-12-23',
      jurisdiction: 'CO',
      status: 'EXECUTED'
    },
    {
      id: 'doc_desiree_hipaa',
      planId: 'plan_christensen_2024',
      personId: 'person_desiree_christensen',
      person: mockPeople[1],
      documentType: 'HIPAA_AUTHORIZATION',
      title: 'Desiree Christensen HIPAA Authorization',
      executionDate: '2025-12-23',
      jurisdiction: 'CO',
      status: 'EXECUTED'
    },
    // Shared - nomination of guardian for Carter
    {
      id: 'doc_guardian_nomination',
      planId: 'plan_christensen_2024',
      personId: 'person_matt_christensen',  // Primary signer
      person: mockPeople[0],
      documentType: 'DECLARATION_OF_GUARDIAN',
      title: 'Nomination of Guardian for Minor Children',
      executionDate: '2025-12-23',
      jurisdiction: 'CO',
      status: 'EXECUTED'
    }
  ],
  roles: [
    // === PLAN-LEVEL ROLES (Joint Trust) ===
    {
      id: 'role_matt_grantor',
      planId: 'plan_christensen_2024',
      personId: 'person_matt_christensen',
      person: mockPeople[0],
      // forPersonId: undefined = plan-level
      roleCategory: 'GRANTOR',
      roleType: 'GRANTOR',
      isPrimary: true,
      ordinal: 1,
      status: 'ACTIVE'
    },
    {
      id: 'role_desiree_grantor',
      planId: 'plan_christensen_2024',
      personId: 'person_desiree_christensen',
      person: mockPeople[1],
      roleCategory: 'GRANTOR',
      roleType: 'GRANTOR',  // Both grantors use GRANTOR - no hierarchy
      isPrimary: false,
      ordinal: 2,
      status: 'ACTIVE'
    },
    {
      id: 'role_matt_trustee',
      planId: 'plan_christensen_2024',
      personId: 'person_matt_christensen',
      person: mockPeople[0],
      roleCategory: 'FIDUCIARY',
      roleType: 'TRUSTEE',
      isPrimary: true,
      ordinal: 1,
      status: 'ACTIVE'
    },
    {
      id: 'role_desiree_cotrustee',
      planId: 'plan_christensen_2024',
      personId: 'person_desiree_christensen',
      person: mockPeople[1],
      roleCategory: 'FIDUCIARY',
      roleType: 'CO_TRUSTEE',
      isPrimary: false,
      ordinal: 2,
      status: 'ACTIVE'
    },
    {
      id: 'role_laura_successor_trustee',
      planId: 'plan_christensen_2024',
      personId: 'person_laura_mccabe',
      person: mockPeople[3],
      roleCategory: 'FIDUCIARY',
      roleType: 'SUCCESSOR_TRUSTEE',
      isPrimary: false,
      ordinal: 3,
      status: 'ACTIVE'
    },
    {
      id: 'role_carter_beneficiary',
      planId: 'plan_christensen_2024',
      personId: 'person_carter_christensen',
      person: mockPeople[2],
      roleCategory: 'BENEFICIARY',
      roleType: 'PRIMARY_BENEFICIARY',
      isPrimary: true,
      ordinal: 1,
      sharePercentage: 100,
      shareType: 'PERCENTAGE',
      status: 'ACTIVE'
    },

    // === MATT'S INDIVIDUAL DOCUMENT ROLES ===
    // Matt's Will - Executor
    {
      id: 'role_desiree_executor_matt_will',
      planId: 'plan_christensen_2024',
      personId: 'person_desiree_christensen',
      person: mockPeople[1],
      forPersonId: 'person_matt_christensen',
      forPerson: mockPeople[0],
      willId: 'will_matt_pourover',
      roleCategory: 'FIDUCIARY',
      roleType: 'EXECUTOR',
      isPrimary: true,
      ordinal: 1,
      status: 'ACTIVE'
    },
    {
      id: 'role_laura_alt_executor_matt_will',
      planId: 'plan_christensen_2024',
      personId: 'person_laura_mccabe',
      person: mockPeople[3],
      forPersonId: 'person_matt_christensen',
      forPerson: mockPeople[0],
      willId: 'will_matt_pourover',
      roleCategory: 'FIDUCIARY',
      roleType: 'ALTERNATE_EXECUTOR',
      isPrimary: false,
      ordinal: 2,
      status: 'ACTIVE'
    },
    // Matt's FPOA - Agent
    {
      id: 'role_desiree_financial_agent_matt',
      planId: 'plan_christensen_2024',
      personId: 'person_desiree_christensen',
      person: mockPeople[1],
      forPersonId: 'person_matt_christensen',
      forPerson: mockPeople[0],
      ancillaryDocumentId: 'doc_matt_fpoa',
      roleCategory: 'FIDUCIARY',
      roleType: 'FINANCIAL_AGENT',
      isPrimary: true,
      ordinal: 1,
      status: 'ACTIVE'
    },
    // Matt's Healthcare POA - Agent
    {
      id: 'role_desiree_healthcare_agent_matt',
      planId: 'plan_christensen_2024',
      personId: 'person_desiree_christensen',
      person: mockPeople[1],
      forPersonId: 'person_matt_christensen',
      forPerson: mockPeople[0],
      ancillaryDocumentId: 'doc_matt_hcpoa',
      roleCategory: 'FIDUCIARY',
      roleType: 'HEALTHCARE_AGENT',
      isPrimary: true,
      ordinal: 1,
      status: 'ACTIVE'
    },

    // === DESIREE'S INDIVIDUAL DOCUMENT ROLES ===
    // Desiree's Will - Executor
    {
      id: 'role_matt_executor_desiree_will',
      planId: 'plan_christensen_2024',
      personId: 'person_matt_christensen',
      person: mockPeople[0],
      forPersonId: 'person_desiree_christensen',
      forPerson: mockPeople[1],
      willId: 'will_desiree_pourover',
      roleCategory: 'FIDUCIARY',
      roleType: 'EXECUTOR',
      isPrimary: true,
      ordinal: 1,
      status: 'ACTIVE'
    },
    {
      id: 'role_laura_alt_executor_desiree_will',
      planId: 'plan_christensen_2024',
      personId: 'person_laura_mccabe',
      person: mockPeople[3],
      forPersonId: 'person_desiree_christensen',
      forPerson: mockPeople[1],
      willId: 'will_desiree_pourover',
      roleCategory: 'FIDUCIARY',
      roleType: 'ALTERNATE_EXECUTOR',
      isPrimary: false,
      ordinal: 2,
      status: 'ACTIVE'
    },
    // Desiree's FPOA - Agent
    {
      id: 'role_matt_financial_agent_desiree',
      planId: 'plan_christensen_2024',
      personId: 'person_matt_christensen',
      person: mockPeople[0],
      forPersonId: 'person_desiree_christensen',
      forPerson: mockPeople[1],
      ancillaryDocumentId: 'doc_desiree_fpoa',
      roleCategory: 'FIDUCIARY',
      roleType: 'FINANCIAL_AGENT',
      isPrimary: true,
      ordinal: 1,
      status: 'ACTIVE'
    },
    // Desiree's Healthcare POA - Agent
    {
      id: 'role_matt_healthcare_agent_desiree',
      planId: 'plan_christensen_2024',
      personId: 'person_matt_christensen',
      person: mockPeople[0],
      forPersonId: 'person_desiree_christensen',
      forPerson: mockPeople[1],
      ancillaryDocumentId: 'doc_desiree_hcpoa',
      roleCategory: 'FIDUCIARY',
      roleType: 'HEALTHCARE_AGENT',
      isPrimary: true,
      ordinal: 1,
      status: 'ACTIVE'
    },

    // === GUARDIAN FOR MINOR CHILD ===
    {
      id: 'role_laura_guardian',
      planId: 'plan_christensen_2024',
      personId: 'person_laura_mccabe',
      person: mockPeople[3],
      ancillaryDocumentId: 'doc_guardian_nomination',
      roleCategory: 'GUARDIAN',
      roleType: 'GUARDIAN_OF_PERSON',
      isPrimary: true,
      ordinal: 1,
      status: 'ACTIVE'
    }
  ],
  versions: [
    {
      id: 'version_christensen_v1',
      planId: 'plan_christensen_2024',
      version: 1,
      changeType: 'CREATION',
      changeDescription: 'Initial trust creation',
      changeSummary: 'Created Christensen Legacy Family Trust as joint revocable living trust',
      effectiveDate: '2025-12-23',
      createdAt: '2025-12-23T10:00:00Z',
      createdBy: 'Attorney Smith'
    }
  ],
  events: [
    {
      id: 'event_christensen_created',
      planId: 'plan_christensen_2024',
      eventType: 'PLAN_CREATED',
      eventDate: '2025-12-23',
      description: 'Christensen Legacy Family Trust created',
      createdAt: '2025-12-23T10:00:00Z'
    },
    {
      id: 'event_christensen_signed',
      planId: 'plan_christensen_2024',
      eventType: 'PLAN_SIGNED',
      eventDate: '2025-12-23',
      description: 'Trust documents executed',
      notes: 'Signing ceremony at law office',
      createdAt: '2025-12-23T14:00:00Z'
    }
  ],
  createdAt: '2025-12-23T10:00:00Z',
  updatedAt: '2025-12-23T14:00:00Z'
}

// Jenkins Estate Plan (Will-based, Single)
export const mockJenkinsPlan: MockEstatePlan = {
  id: 'plan_jenkins_2024',
  grantor1: mockPeople[4],
  planType: 'WILL_BASED',
  planName: 'Sandra Jenkins Estate Plan',
  currentVersion: 2,
  status: 'AMENDED',
  effectiveDate: '2024-06-15',
  lastAmendedAt: '2025-01-10',
  wills: [
    {
      id: 'will_jenkins_simple',
      planId: 'plan_jenkins_2024',
      personId: 'person_sandra_jenkins',
      person: mockPeople[4],
      willType: 'SIMPLE',
      executionDate: '2024-06-15',
      jurisdiction: 'CO',
      codicilCount: 1
    }
  ],
  ancillaryDocuments: [
    {
      id: 'doc_sandra_fpoa',
      planId: 'plan_jenkins_2024',
      personId: 'person_sandra_jenkins',
      person: mockPeople[4],
      documentType: 'FINANCIAL_POA',
      title: 'Sandra Jenkins Financial Power of Attorney',
      executionDate: '2024-06-15',
      jurisdiction: 'CO',
      status: 'EXECUTED'
    },
    {
      id: 'doc_sandra_hcpoa',
      planId: 'plan_jenkins_2024',
      personId: 'person_sandra_jenkins',
      person: mockPeople[4],
      documentType: 'HEALTHCARE_POA',
      title: 'Sandra Jenkins Healthcare Power of Attorney',
      executionDate: '2024-06-15',
      jurisdiction: 'CO',
      status: 'EXECUTED'
    }
  ],
  roles: [
    {
      id: 'role_sandra_testator',
      planId: 'plan_jenkins_2024',
      personId: 'person_sandra_jenkins',
      person: mockPeople[4],
      roleCategory: 'GRANTOR',
      roleType: 'TESTATOR',
      isPrimary: true,
      ordinal: 1,
      status: 'ACTIVE'
    },
    {
      id: 'role_michael_executor',
      planId: 'plan_jenkins_2024',
      personId: 'person_michael_jenkins',
      person: mockPeople[5],
      roleCategory: 'FIDUCIARY',
      roleType: 'EXECUTOR',
      isPrimary: true,
      ordinal: 1,
      status: 'ACTIVE'
    },
    {
      id: 'role_sarah_executor_alt',
      planId: 'plan_jenkins_2024',
      personId: 'person_sarah_jenkins',
      person: mockPeople[6],
      roleCategory: 'FIDUCIARY',
      roleType: 'ALTERNATE_EXECUTOR',
      isPrimary: false,
      ordinal: 2,
      status: 'ACTIVE'
    },
    {
      id: 'role_michael_beneficiary',
      planId: 'plan_jenkins_2024',
      personId: 'person_michael_jenkins',
      person: mockPeople[5],
      roleCategory: 'BENEFICIARY',
      roleType: 'PRIMARY_BENEFICIARY',
      isPrimary: true,
      ordinal: 1,
      sharePercentage: 50,
      shareType: 'PERCENTAGE',
      status: 'ACTIVE'
    },
    {
      id: 'role_sarah_beneficiary',
      planId: 'plan_jenkins_2024',
      personId: 'person_sarah_jenkins',
      person: mockPeople[6],
      roleCategory: 'BENEFICIARY',
      roleType: 'PRIMARY_BENEFICIARY',
      isPrimary: true,
      ordinal: 2,
      sharePercentage: 50,
      shareType: 'PERCENTAGE',
      status: 'ACTIVE'
    }
  ],
  versions: [
    {
      id: 'version_jenkins_v1',
      planId: 'plan_jenkins_2024',
      version: 1,
      changeType: 'CREATION',
      changeDescription: 'Initial will creation',
      changeSummary: 'Created simple will with equal distribution to children',
      effectiveDate: '2024-06-15',
      createdAt: '2024-06-15T10:00:00Z',
      createdBy: 'Attorney Jones'
    },
    {
      id: 'version_jenkins_v2',
      planId: 'plan_jenkins_2024',
      version: 2,
      changeType: 'AMENDMENT',
      changeDescription: 'First codicil - updated executor',
      changeSummary: 'Changed primary executor from former spouse to son Michael',
      effectiveDate: '2025-01-10',
      createdAt: '2025-01-10T10:00:00Z',
      createdBy: 'Attorney Jones'
    }
  ],
  events: [
    {
      id: 'event_jenkins_created',
      planId: 'plan_jenkins_2024',
      eventType: 'PLAN_CREATED',
      eventDate: '2024-06-15',
      description: 'Will created',
      createdAt: '2024-06-15T10:00:00Z'
    },
    {
      id: 'event_jenkins_signed',
      planId: 'plan_jenkins_2024',
      eventType: 'PLAN_SIGNED',
      eventDate: '2024-06-15',
      description: 'Will executed with witnesses',
      createdAt: '2024-06-15T14:00:00Z'
    },
    {
      id: 'event_jenkins_amended',
      planId: 'plan_jenkins_2024',
      eventType: 'PLAN_AMENDED',
      eventDate: '2025-01-10',
      description: 'First codicil executed',
      notes: 'Updated executor designation following divorce',
      createdAt: '2025-01-10T10:00:00Z'
    }
  ],
  createdAt: '2024-06-15T10:00:00Z',
  updatedAt: '2025-01-10T14:00:00Z'
}

// Sample estate plan in administration
export const mockSmithPlanInAdmin: MockEstatePlan = {
  id: 'plan_smith_2020',
  grantor1: {
    id: 'person_john_smith',
    firstName: 'John',
    lastName: 'Smith',
    fullName: 'John Smith (Deceased)',
    dateOfBirth: '1945-02-20'
  },
  grantor2: {
    id: 'person_mary_smith',
    firstName: 'Mary',
    lastName: 'Smith',
    fullName: 'Mary Smith',
    email: 'mary.smith@email.com'
  },
  planType: 'TRUST_BASED',
  planName: 'Smith Family Trust',
  currentVersion: 3,
  status: 'ADMINISTERED',
  effectiveDate: '2020-03-15',
  lastAmendedAt: '2023-11-01',
  trust: {
    id: 'trust_smith_rlt',
    planId: 'plan_smith_2020',
    trustName: 'Smith Family Trust',
    trustType: 'REVOCABLE_LIVING',
    isJoint: true,
    isRevocable: true,
    jurisdiction: 'CA',
    formationDate: '2020-03-15'
  },
  wills: [
    {
      id: 'will_john_pourover',
      planId: 'plan_smith_2020',
      personId: 'person_john_smith',
      willType: 'POUR_OVER',
      executionDate: '2020-03-15',
      jurisdiction: 'CA',
      codicilCount: 0
    },
    {
      id: 'will_mary_pourover',
      planId: 'plan_smith_2020',
      personId: 'person_mary_smith',
      willType: 'POUR_OVER',
      executionDate: '2020-03-15',
      jurisdiction: 'CA',
      codicilCount: 0
    }
  ],
  ancillaryDocuments: [],  // Simplified for this example
  roles: [
    {
      id: 'role_john_grantor',
      planId: 'plan_smith_2020',
      personId: 'person_john_smith',
      person: {
        id: 'person_john_smith',
        firstName: 'John',
        lastName: 'Smith',
        fullName: 'John Smith (Deceased)',
        dateOfBirth: '1945-02-20'
      },
      roleCategory: 'GRANTOR',
      roleType: 'GRANTOR',
      isPrimary: true,
      ordinal: 1,
      status: 'DECEASED'
    },
    {
      id: 'role_mary_successor_trustee',
      planId: 'plan_smith_2020',
      personId: 'person_mary_smith',
      person: {
        id: 'person_mary_smith',
        firstName: 'Mary',
        lastName: 'Smith',
        fullName: 'Mary Smith',
        email: 'mary.smith@email.com'
      },
      roleCategory: 'FIDUCIARY',
      roleType: 'SUCCESSOR_TRUSTEE',
      isPrimary: true,
      ordinal: 1,
      status: 'ACTIVE'
    }
  ],
  versions: [
    {
      id: 'version_smith_v1',
      planId: 'plan_smith_2020',
      version: 1,
      changeType: 'CREATION',
      changeDescription: 'Initial trust creation',
      changeSummary: 'Created Smith Family Trust',
      effectiveDate: '2020-03-15',
      createdAt: '2020-03-15T10:00:00Z'
    },
    {
      id: 'version_smith_v2',
      planId: 'plan_smith_2020',
      version: 2,
      changeType: 'AMENDMENT',
      changeDescription: 'Updated distribution provisions',
      changeSummary: 'Modified distribution to include grandchildren',
      effectiveDate: '2022-06-01',
      createdAt: '2022-06-01T10:00:00Z'
    },
    {
      id: 'version_smith_v3',
      planId: 'plan_smith_2020',
      version: 3,
      changeType: 'ADMIN_UPDATE',
      changeDescription: 'Administration initiated',
      changeSummary: 'John Smith passed away, Mary serving as successor trustee',
      effectiveDate: '2025-01-05',
      createdAt: '2025-01-05T10:00:00Z'
    }
  ],
  events: [
    {
      id: 'event_smith_created',
      planId: 'plan_smith_2020',
      eventType: 'PLAN_CREATED',
      eventDate: '2020-03-15',
      description: 'Smith Family Trust created',
      createdAt: '2020-03-15T10:00:00Z'
    },
    {
      id: 'event_smith_signed',
      planId: 'plan_smith_2020',
      eventType: 'PLAN_SIGNED',
      eventDate: '2020-03-15',
      description: 'Trust documents executed',
      createdAt: '2020-03-15T14:00:00Z'
    },
    {
      id: 'event_smith_amended',
      planId: 'plan_smith_2020',
      eventType: 'PLAN_AMENDED',
      eventDate: '2022-06-01',
      description: 'First amendment executed',
      createdAt: '2022-06-01T10:00:00Z'
    },
    {
      id: 'event_smith_death',
      planId: 'plan_smith_2020',
      eventType: 'FIRST_GRANTOR_DEATH',
      eventDate: '2025-01-05',
      description: 'John Smith passed away',
      personName: 'John Smith',
      createdAt: '2025-01-05T09:00:00Z'
    },
    {
      id: 'event_smith_admin_start',
      planId: 'plan_smith_2020',
      eventType: 'ADMINISTRATION_STARTED',
      eventDate: '2025-01-10',
      description: 'Trust administration initiated',
      notes: 'Mary Smith appointed as successor trustee',
      createdAt: '2025-01-10T10:00:00Z'
    },
    {
      id: 'event_smith_successor',
      planId: 'plan_smith_2020',
      eventType: 'SUCCESSOR_TRUSTEE_APPOINTED',
      eventDate: '2025-01-10',
      description: 'Mary Smith began serving as successor trustee',
      personName: 'Mary Smith',
      createdAt: '2025-01-10T10:00:00Z'
    }
  ],
  createdAt: '2020-03-15T10:00:00Z',
  updatedAt: '2025-01-10T10:00:00Z'
}

// All mock estate plans
export const mockEstatePlans: MockEstatePlan[] = [
  mockChristensenPlan,
  mockJenkinsPlan,
  mockSmithPlanInAdmin
]

// Helper to get plan by ID
export function getMockPlanById(id: string): MockEstatePlan | undefined {
  return mockEstatePlans.find(p => p.id === id)
}

// Helper to filter plans by status
export function getMockPlansByStatus(status: string): MockEstatePlan[] {
  return mockEstatePlans.filter(p => p.status === status)
}

// Status badge configurations
export const planStatusConfig: Record<string, { label: string; variant: string; description: string }> = {
  DRAFT: {
    label: 'Draft',
    variant: 'default',
    description: 'Plan is being created'
  },
  ACTIVE: {
    label: 'Active',
    variant: 'success',
    description: 'Plan is signed and in effect'
  },
  AMENDED: {
    label: 'Amended',
    variant: 'info',
    description: 'Plan has been amended'
  },
  INCAPACITATED: {
    label: 'Incapacitated',
    variant: 'warning',
    description: 'Grantor incapacitated, successor acting'
  },
  ADMINISTERED: {
    label: 'In Administration',
    variant: 'warning',
    description: 'Death occurred, plan in administration'
  },
  DISTRIBUTED: {
    label: 'Distributed',
    variant: 'info',
    description: 'Assets distributed, pending close'
  },
  CLOSED: {
    label: 'Closed',
    variant: 'default',
    description: 'Fully administered and closed'
  }
}

// Role category configurations
export const roleCategoryConfig: Record<string, { label: string; icon: string }> = {
  GRANTOR: { label: 'Grantors', icon: 'user' },
  FIDUCIARY: { label: 'Fiduciaries', icon: 'briefcase' },
  BENEFICIARY: { label: 'Beneficiaries', icon: 'gift' },
  GUARDIAN: { label: 'Guardians', icon: 'shield' },
  OTHER: { label: 'Other', icon: 'users' }
}

// Role type display names (CO_GRANTOR removed - both grantors use GRANTOR)
export const roleTypeLabels: Record<string, string> = {
  GRANTOR: 'Grantor',
  TESTATOR: 'Testator',
  TRUSTEE: 'Trustee',
  CO_TRUSTEE: 'Co-Trustee',
  SUCCESSOR_TRUSTEE: 'Successor Trustee',
  DISTRIBUTION_TRUSTEE: 'Distribution Trustee',
  PRIMARY_BENEFICIARY: 'Primary Beneficiary',
  CONTINGENT_BENEFICIARY: 'Contingent Beneficiary',
  REMAINDER_BENEFICIARY: 'Remainder Beneficiary',
  INCOME_BENEFICIARY: 'Income Beneficiary',
  PRINCIPAL_BENEFICIARY: 'Principal Beneficiary',
  EXECUTOR: 'Executor',
  CO_EXECUTOR: 'Co-Executor',
  ALTERNATE_EXECUTOR: 'Alternate Executor',
  FINANCIAL_AGENT: 'Financial Agent (POA)',
  ALTERNATE_FINANCIAL_AGENT: 'Alternate Financial Agent',
  HEALTHCARE_AGENT: 'Healthcare Agent',
  ALTERNATE_HEALTHCARE_AGENT: 'Alternate Healthcare Agent',
  GUARDIAN_OF_PERSON: 'Guardian of Person',
  GUARDIAN_OF_ESTATE: 'Guardian of Estate',
  ALTERNATE_GUARDIAN_OF_PERSON: 'Alternate Guardian of Person',
  ALTERNATE_GUARDIAN_OF_ESTATE: 'Alternate Guardian of Estate',
  TRUST_PROTECTOR: 'Trust Protector',
  INVESTMENT_ADVISOR: 'Investment Advisor',
  WITNESS: 'Witness',
  NOTARY: 'Notary'
}

// Event type display names and icons
export const eventTypeConfig: Record<string, { label: string; icon: string; color: string }> = {
  PLAN_CREATED: { label: 'Plan Created', icon: 'file-plus', color: 'blue' },
  PLAN_SIGNED: { label: 'Documents Signed', icon: 'pen-tool', color: 'green' },
  PLAN_AMENDED: { label: 'Plan Amended', icon: 'edit', color: 'purple' },
  PLAN_RESTATED: { label: 'Plan Restated', icon: 'refresh-cw', color: 'purple' },
  GRANTOR_INCAPACITATED: { label: 'Grantor Incapacitated', icon: 'alert-circle', color: 'orange' },
  GRANTOR_CAPACITY_RESTORED: { label: 'Capacity Restored', icon: 'check-circle', color: 'green' },
  FIRST_GRANTOR_DEATH: { label: 'First Grantor Passed Away', icon: 'heart', color: 'gray' },
  SECOND_GRANTOR_DEATH: { label: 'Second Grantor Passed Away', icon: 'heart', color: 'gray' },
  ADMINISTRATION_STARTED: { label: 'Administration Started', icon: 'play', color: 'blue' },
  SUCCESSOR_TRUSTEE_APPOINTED: { label: 'Successor Trustee Appointed', icon: 'user-check', color: 'blue' },
  TRUST_FUNDED: { label: 'Trust Funded', icon: 'dollar-sign', color: 'green' },
  ASSETS_VALUED: { label: 'Assets Valued', icon: 'clipboard-list', color: 'blue' },
  DISTRIBUTION_MADE: { label: 'Distribution Made', icon: 'send', color: 'green' },
  PARTIAL_DISTRIBUTION: { label: 'Partial Distribution', icon: 'send', color: 'blue' },
  TAX_RETURN_FILED: { label: 'Tax Return Filed', icon: 'file-text', color: 'blue' },
  NOTICE_SENT: { label: 'Notice Sent', icon: 'mail', color: 'blue' },
  FINAL_DISTRIBUTION: { label: 'Final Distribution', icon: 'check-square', color: 'green' },
  TRUST_TERMINATED: { label: 'Trust Terminated', icon: 'x-square', color: 'gray' },
  PLAN_CLOSED: { label: 'Plan Closed', icon: 'archive', color: 'gray' },
  NOTE_ADDED: { label: 'Note Added', icon: 'message-square', color: 'blue' },
  DOCUMENT_ADDED: { label: 'Document Added', icon: 'file', color: 'blue' },
  OTHER: { label: 'Other Event', icon: 'calendar', color: 'gray' }
}
