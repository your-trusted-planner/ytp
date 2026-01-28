/**
 * WealthCounsel Data Transformers
 *
 * Transform parsed WealthCounsel data into our schema format
 */

import type {
  WealthCounselData,
  WealthCounselPerson,
  WealthCounselImportDecisions,
  WC_ROLE_MAPPING,
  WC_TRUST_TYPE_MAPPING
} from './wealthcounsel-types'

// Types matching our schema
export interface WCTransformedPerson {
  id: string
  personType: 'individual' | 'entity'
  firstName?: string
  lastName?: string
  middleNames?: string[]
  fullName?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  dateOfBirth?: Date
  ssnLast4?: string
  notes?: string
  importMetadata?: string
}

export interface TransformedEstatePlan {
  id: string
  primaryPersonId: string
  secondaryPersonId?: string
  planType: 'TRUST_BASED' | 'WILL_BASED'
  planName?: string
  currentVersion: number
  status: 'DRAFT' | 'ACTIVE'
  effectiveDate?: Date
  wealthCounselClientId?: string
  importMetadata?: string
}

export interface TransformedPlanVersion {
  id: string
  planId: string
  version: number
  changeType: 'CREATION' | 'AMENDMENT'
  changeDescription?: string
  changeSummary?: string
  effectiveDate?: Date
  sourceType: 'WEALTHCOUNSEL'
  sourceXml?: string
  sourceData?: string
}

export interface TransformedTrust {
  id: string
  planId: string
  trustName: string
  trustType?: string
  isJoint: boolean
  isRevocable: boolean
  jurisdiction?: string
  formationDate?: Date
  wealthCounselTrustId?: string
  trustSettings?: string
}

export interface TransformedWill {
  id: string
  planId: string
  willType?: string
  executionDate?: Date
  jurisdiction?: string
  codicilCount: number
}

export interface TransformedPlanRole {
  id: string
  planId: string
  establishedInVersion: number
  personId: string
  personSnapshot?: string
  roleCategory: string
  roleType: string
  isPrimary: boolean
  ordinal: number
  sharePercentage?: number
  shareType?: string
  status: 'ACTIVE'
  // For joint plans: whose individual document does this role apply to?
  // null = plan-level role (trustee, beneficiary)
  // personId = individual document role (financial agent for Matt's FPOA)
  forPersonId?: string
}

/**
 * Generate a unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Extract all unique people from WealthCounsel data
 */
export function extractPeople(data: WealthCounselData): WCTransformedPerson[] {
  const people: WCTransformedPerson[] = []
  const seenNames = new Set<string>()

  // Add client
  if (data.client.fullName) {
    people.push(transformPerson(data.client, 'client'))
    seenNames.add(data.client.fullName.toLowerCase())
  }

  // Add spouse
  if (data.spouse?.fullName && !seenNames.has(data.spouse.fullName.toLowerCase())) {
    people.push(transformPerson(data.spouse, 'spouse'))
    seenNames.add(data.spouse.fullName.toLowerCase())
  }

  // Add children
  for (const child of data.children) {
    if (child.fullName && !seenNames.has(child.fullName.toLowerCase())) {
      people.push(transformPerson(child, 'child'))
      seenNames.add(child.fullName.toLowerCase())
    }
  }

  // Add beneficiaries (who may be different from children)
  for (const beneficiary of data.beneficiaries) {
    if (beneficiary.name && !seenNames.has(beneficiary.name.toLowerCase())) {
      people.push({
        id: generateId('person'),
        personType: 'individual',
        fullName: beneficiary.name,
        address: beneficiary.address,
        notes: beneficiary.relationship ? `Relationship: ${beneficiary.relationship}` : undefined,
        importMetadata: JSON.stringify({
          source: 'WEALTHCOUNSEL',
          role: 'beneficiary',
          importedAt: new Date().toISOString()
        })
      })
      seenNames.add(beneficiary.name.toLowerCase())
    }
  }

  // Add fiduciaries (who may be different from family)
  // Collect from trust-level and both client/spouse individual fiduciaries
  const allFiduciaries = [
    // Trust-level fiduciaries
    ...data.fiduciaries.trustees,
    ...data.fiduciaries.successorTrustees,
    ...data.fiduciaries.trustProtectors,
    // Client's individual document fiduciaries
    ...data.fiduciaries.client.financialAgents,
    ...data.fiduciaries.client.financialAgentSuccessors,
    ...data.fiduciaries.client.healthcareAgents,
    ...data.fiduciaries.client.healthcareAgentSuccessors,
    ...data.fiduciaries.client.executors,
    ...data.fiduciaries.client.guardians,
    // Spouse's individual document fiduciaries
    ...data.fiduciaries.spouse.financialAgents,
    ...data.fiduciaries.spouse.financialAgentSuccessors,
    ...data.fiduciaries.spouse.healthcareAgents,
    ...data.fiduciaries.spouse.healthcareAgentSuccessors,
    ...data.fiduciaries.spouse.executors,
    ...data.fiduciaries.spouse.guardians
  ]

  for (const fiduciary of allFiduciaries) {
    if (fiduciary.personName && !seenNames.has(fiduciary.personName.toLowerCase())) {
      // Parse name into first/last
      const nameParts = fiduciary.personName.trim().split(' ')
      const firstName = nameParts[0]
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined

      people.push({
        id: generateId('person'),
        personType: 'individual',
        firstName,
        lastName,
        fullName: fiduciary.personName,
        importMetadata: JSON.stringify({
          source: 'WEALTHCOUNSEL',
          role: fiduciary.roleType,
          importedAt: new Date().toISOString()
        })
      })
      seenNames.add(fiduciary.personName.toLowerCase())
    }
  }

  return people
}

/**
 * Transform a WealthCounsel person to our schema
 */
function transformPerson(wcPerson: WealthCounselPerson, role: string): WCTransformedPerson {
  return {
    id: generateId('person'),
    personType: 'individual',
    firstName: wcPerson.firstName,
    lastName: wcPerson.lastName,
    middleNames: wcPerson.middleName ? [wcPerson.middleName] : undefined,
    fullName: wcPerson.fullName || `${wcPerson.firstName || ''} ${wcPerson.lastName || ''}`.trim(),
    email: wcPerson.email,
    phone: wcPerson.phone || wcPerson.cellPhone,
    address: wcPerson.address,
    city: wcPerson.city,
    zipCode: wcPerson.zipCode,
    dateOfBirth: wcPerson.dateOfBirth ? new Date(wcPerson.dateOfBirth) : undefined,
    ssnLast4: wcPerson.ssn ? wcPerson.ssn.slice(-4) : undefined,
    importMetadata: JSON.stringify({
      source: 'WEALTHCOUNSEL',
      role,
      originalSsn: wcPerson.ssn ? '****' + wcPerson.ssn.slice(-4) : undefined,
      county: wcPerson.county,
      workPhone: wcPerson.workPhone,
      cellPhone: wcPerson.cellPhone,
      dateOfDeath: wcPerson.dateOfDeath,
      importedAt: new Date().toISOString()
    })
  }
}

/**
 * Transform WealthCounsel data to estate plan
 */
export function transformToEstatePlan(
  data: WealthCounselData,
  clientPersonId: string,
  spousePersonId?: string,
  decisions?: WealthCounselImportDecisions
): {
  plan: TransformedEstatePlan
  trust?: TransformedTrust
  will?: TransformedWill
  version: TransformedPlanVersion
} {
  const planId = generateId('plan')
  const versionId = generateId('version')

  // Determine effective date
  let effectiveDate: Date | undefined
  if (data.trust?.signDate) {
    effectiveDate = new Date(data.trust.signDate)
  } else if (data.will?.executionDate) {
    effectiveDate = new Date(data.will.executionDate)
  }

  // Plan name
  const planName = data.trust?.name || `${data.client.fullName || 'Unknown'} Estate Plan`

  // Create plan
  const plan: TransformedEstatePlan = {
    id: planId,
    primaryPersonId: clientPersonId,
    secondaryPersonId: spousePersonId,
    planType: data.planType,
    planName,
    currentVersion: 1,
    status: effectiveDate ? 'ACTIVE' : 'DRAFT',
    effectiveDate,
    wealthCounselClientId: data.clientId,
    importMetadata: JSON.stringify({
      source: 'WEALTHCOUNSEL',
      dataFileVersion: data.dataFileVersion,
      importedAt: new Date().toISOString(),
      fieldCount: data.rawFields.size
    })
  }

  // Create trust if trust-based
  let trust: TransformedTrust | undefined
  if (data.planType === 'TRUST_BASED' && data.trust) {
    trust = {
      id: generateId('trust'),
      planId,
      trustName: data.trust.name,
      trustType: mapTrustType(data.trust.type),
      isJoint: data.trust.isJoint,
      isRevocable: true, // Default for RLT
      jurisdiction: data.trust.jurisdiction,
      formationDate: data.trust.signDate ? new Date(data.trust.signDate) : undefined,
      wealthCounselTrustId: data.clientId,
      trustSettings: data.trust.mcOptions ? JSON.stringify(data.trust.mcOptions) : undefined
    }
  }

  // Create will if present
  let will: TransformedWill | undefined
  if (data.will?.personalRepNames?.length || data.planType === 'WILL_BASED') {
    will = {
      id: generateId('will'),
      planId,
      willType: data.trust ? 'POUR_OVER' : 'SIMPLE',
      executionDate: data.will?.executionDate ? new Date(data.will.executionDate) : effectiveDate,
      jurisdiction: data.will?.jurisdiction,
      codicilCount: 0
    }
  }

  // Create version
  const version: TransformedPlanVersion = {
    id: versionId,
    planId,
    version: 1,
    changeType: decisions?.isAmendment ? 'AMENDMENT' : 'CREATION',
    changeDescription: 'Imported from WealthCounsel',
    changeSummary: `${data.planType === 'TRUST_BASED' ? 'Trust' : 'Will'} created`,
    effectiveDate,
    sourceType: 'WEALTHCOUNSEL',
    sourceData: JSON.stringify({
      rawFieldCount: data.rawFields.size,
      clientId: data.clientId,
      importedAt: new Date().toISOString()
    })
  }

  return { plan, trust, will, version }
}

/**
 * Transform roles for a plan
 */
export function transformRoles(
  data: WealthCounselData,
  planId: string,
  personLookup: Map<string, string>,  // name -> personId
  clientPersonId: string,
  spousePersonId?: string
): TransformedPlanRole[] {
  const roles: TransformedPlanRole[] = []
  let ordinalCounter = 1

  // Helper to add a role
  const addRole = (
    personName: string,
    roleType: string,
    roleCategory: string,
    isPrimary: boolean,
    ordinal: number,
    options?: Partial<TransformedPlanRole>
  ) => {
    const personId = findPersonId(personName, personLookup)
    if (!personId) return

    roles.push({
      id: generateId('role'),
      planId,
      establishedInVersion: 1,
      personId,
      personSnapshot: JSON.stringify({ name: personName }),
      roleCategory,
      roleType,
      isPrimary,
      ordinal,
      status: 'ACTIVE',
      ...options
    })
  }

  // Add grantors (client and spouse)
  if (data.client.fullName) {
    addRole(data.client.fullName, 'GRANTOR', 'GRANTOR', true, 1)
  }
  if (data.spouse?.fullName) {
    addRole(data.spouse.fullName, 'CO_GRANTOR', 'GRANTOR', false, 2)
  }

  // Add trustees (trust-level)
  ordinalCounter = 1
  for (const trustee of data.fiduciaries.trustees) {
    addRole(trustee.personName, trustee.isPrimary ? 'TRUSTEE' : 'CO_TRUSTEE', 'FIDUCIARY', trustee.isPrimary, ordinalCounter++)
  }

  // Add successor trustees (trust-level)
  for (const trustee of data.fiduciaries.successorTrustees) {
    addRole(trustee.personName, 'SUCCESSOR_TRUSTEE', 'FIDUCIARY', false, ordinalCounter++)
  }

  // Add trust protectors (trust-level)
  ordinalCounter = 1
  for (const protector of data.fiduciaries.trustProtectors) {
    addRole(protector.personName, 'TRUST_PROTECTOR', 'FIDUCIARY', protector.isPrimary, ordinalCounter++)
  }

  // Add client's individual document fiduciaries (POA, healthcare directive, will)
  // These roles are specific to the client's individual documents
  ordinalCounter = 1
  for (const agent of data.fiduciaries.client.financialAgents) {
    addRole(agent.personName, 'FINANCIAL_AGENT', 'FIDUCIARY', true, ordinalCounter++, { forPersonId: clientPersonId })
  }
  for (const agent of data.fiduciaries.client.financialAgentSuccessors) {
    addRole(agent.personName, 'ALTERNATE_FINANCIAL_AGENT', 'FIDUCIARY', false, ordinalCounter++, { forPersonId: clientPersonId })
  }

  ordinalCounter = 1
  for (const agent of data.fiduciaries.client.healthcareAgents) {
    addRole(agent.personName, 'HEALTHCARE_AGENT', 'FIDUCIARY', true, ordinalCounter++, { forPersonId: clientPersonId })
  }
  for (const agent of data.fiduciaries.client.healthcareAgentSuccessors) {
    addRole(agent.personName, 'ALTERNATE_HEALTHCARE_AGENT', 'FIDUCIARY', false, ordinalCounter++, { forPersonId: clientPersonId })
  }

  ordinalCounter = 1
  for (const executor of data.fiduciaries.client.executors) {
    const isPrimary = ordinalCounter === 1
    addRole(executor.personName, isPrimary ? 'EXECUTOR' : 'ALTERNATE_EXECUTOR', 'FIDUCIARY', isPrimary, ordinalCounter++, { forPersonId: clientPersonId })
  }

  ordinalCounter = 1
  for (const guardian of data.fiduciaries.client.guardians) {
    addRole(guardian.personName, 'GUARDIAN_OF_PERSON', 'GUARDIAN', guardian.isPrimary, ordinalCounter++, { forPersonId: clientPersonId })
  }

  // Add spouse's individual document fiduciaries (if spouse exists)
  // These roles are specific to the spouse's individual documents
  if (data.spouse && spousePersonId) {
    ordinalCounter = 1
    for (const agent of data.fiduciaries.spouse.financialAgents) {
      addRole(agent.personName, 'FINANCIAL_AGENT', 'FIDUCIARY', true, ordinalCounter++, { forPersonId: spousePersonId })
    }
    for (const agent of data.fiduciaries.spouse.financialAgentSuccessors) {
      addRole(agent.personName, 'ALTERNATE_FINANCIAL_AGENT', 'FIDUCIARY', false, ordinalCounter++, { forPersonId: spousePersonId })
    }

    ordinalCounter = 1
    for (const agent of data.fiduciaries.spouse.healthcareAgents) {
      addRole(agent.personName, 'HEALTHCARE_AGENT', 'FIDUCIARY', true, ordinalCounter++, { forPersonId: spousePersonId })
    }
    for (const agent of data.fiduciaries.spouse.healthcareAgentSuccessors) {
      addRole(agent.personName, 'ALTERNATE_HEALTHCARE_AGENT', 'FIDUCIARY', false, ordinalCounter++, { forPersonId: spousePersonId })
    }

    ordinalCounter = 1
    for (const executor of data.fiduciaries.spouse.executors) {
      const isPrimary = ordinalCounter === 1
      addRole(executor.personName, isPrimary ? 'EXECUTOR' : 'ALTERNATE_EXECUTOR', 'FIDUCIARY', isPrimary, ordinalCounter++, { forPersonId: spousePersonId })
    }

    ordinalCounter = 1
    for (const guardian of data.fiduciaries.spouse.guardians) {
      addRole(guardian.personName, 'GUARDIAN_OF_PERSON', 'GUARDIAN', guardian.isPrimary, ordinalCounter++, { forPersonId: spousePersonId })
    }
  }

  // Add beneficiaries
  ordinalCounter = 1
  for (const beneficiary of data.beneficiaries) {
    const sharePercent = beneficiary.percentage
      ? parseInt(beneficiary.percentage.replace('%', ''))
      : undefined

    addRole(beneficiary.name, 'PRIMARY_BENEFICIARY', 'BENEFICIARY', ordinalCounter === 1, ordinalCounter++, {
      sharePercentage: sharePercent,
      shareType: sharePercent ? 'PERCENTAGE' : undefined
    })
  }

  // Deduplicate roles based on (personId, roleType, forPersonId) tuple
  // This prevents the same person having the same role multiple times
  const seen = new Set<string>()
  const deduplicatedRoles = roles.filter(role => {
    const key = `${role.personId}:${role.roleType}:${role.forPersonId || 'null'}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })

  return deduplicatedRoles
}

/**
 * Find a person ID by name (case-insensitive matching)
 */
function findPersonId(name: string, lookup: Map<string, string>): string | undefined {
  // Try exact match first
  if (lookup.has(name)) return lookup.get(name)

  // Try case-insensitive match
  const lowerName = name.toLowerCase()
  for (const [key, value] of lookup.entries()) {
    if (key.toLowerCase() === lowerName) return value
  }

  // Try partial match (first name + last name anywhere)
  const nameParts = lowerName.split(' ')
  for (const [key, value] of lookup.entries()) {
    const keyLower = key.toLowerCase()
    if (nameParts.every(part => keyLower.includes(part))) return value
  }

  return undefined
}

/**
 * Map WealthCounsel trust type to our schema
 */
function mapTrustType(wcType?: string): string | undefined {
  if (!wcType) return 'REVOCABLE_LIVING' // Default

  const mapping: Record<string, string> = {
    'Revocable Living Trust': 'REVOCABLE_LIVING',
    'RLT': 'REVOCABLE_LIVING',
    'Irrevocable Living Trust': 'IRREVOCABLE_LIVING',
    'Testamentary Trust': 'TESTAMENTARY',
    'Special Needs Trust': 'SPECIAL_NEEDS',
    'SNT': 'SPECIAL_NEEDS',
    'Charitable Remainder Trust': 'CHARITABLE_REMAINDER',
    'CRT': 'CHARITABLE_REMAINDER',
    'Charitable Lead Trust': 'CHARITABLE_LEAD',
    'CLT': 'CHARITABLE_LEAD',
    'ILIT': 'ILIT',
    'Irrevocable Life Insurance Trust': 'ILIT',
    'GRAT': 'GRAT',
    'Grantor Retained Annuity Trust': 'GRAT',
    'QPRT': 'QPRT',
    'Qualified Personal Residence Trust': 'QPRT',
    'Dynasty Trust': 'DYNASTY'
  }

  return mapping[wcType] || 'OTHER'
}

/**
 * Build a person lookup map from transformed people
 */
export function buildPersonLookup(people: WCTransformedPerson[]): Map<string, string> {
  const lookup = new Map<string, string>()

  for (const person of people) {
    if (person.fullName) {
      lookup.set(person.fullName, person.id)
    }
    // Also add by first + last name
    if (person.firstName && person.lastName) {
      lookup.set(`${person.firstName} ${person.lastName}`, person.id)
    }
  }

  return lookup
}
