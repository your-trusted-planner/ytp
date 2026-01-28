/**
 * WealthCounsel XML Parser
 *
 * Parses WealthCounsel XML export files and extracts estate plan data.
 * Uses fast-xml-parser for robust XML handling.
 *
 * WealthCounsel XML Format:
 * - Root element: <wc:set xmlns:wc="http://counsel.com">
 * - Data elements: <wc:data key="Field Name">
 * - Values wrapped in: <wc:repeat><wc:string|boolean|number|date>value</wc:...></wc:repeat>
 */

import { XMLParser } from 'fast-xml-parser'
import type {
  WealthCounselData,
  WealthCounselPerson,
  WealthCounselTrust,
  WealthCounselWill,
  WealthCounselRole,
  WealthCounselBeneficiary,
  IndividualFiduciaries
} from './wealthcounsel-types'

/**
 * Parse WealthCounsel XML string into structured data
 */
export function parseWealthCounselXml(xmlString: string): WealthCounselData {
  // Parse the XML using fast-xml-parser
  const rawFields = extractAllFields(xmlString)

  // Extract client information
  const client = extractClient(rawFields)

  // Extract spouse if present
  const spouse = extractSpouse(rawFields)

  // Extract children
  const children = extractChildren(rawFields)

  // Determine plan type based on trust presence
  const hasTrust = !!rawFields.get('RLT trust name')
  const planType: 'TRUST_BASED' | 'WILL_BASED' = hasTrust ? 'TRUST_BASED' : 'WILL_BASED'

  // Extract trust information
  const trust = hasTrust ? extractTrust(rawFields) : undefined

  // Extract will information
  const will = extractWill(rawFields)

  // Extract fiduciary roles
  const fiduciaries = extractFiduciaries(rawFields)

  // Extract beneficiaries
  const beneficiaries = extractBeneficiaries(rawFields)

  return {
    clientId: rawFields.get('Client_id') as string | undefined,
    dataFileVersion: rawFields.get('Data File Version') as string | undefined,
    client,
    spouse,
    children,
    planType,
    trust,
    will,
    fiduciaries,
    beneficiaries,
    rawFields
  }
}

/**
 * Extract all key-value pairs from the XML using fast-xml-parser
 */
function extractAllFields(xmlString: string): Map<string, any> {
  const fields = new Map<string, any>()

  // Configure the parser to handle namespaces and preserve attributes
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true, // Remove wc: prefix
    isArray: (name) => name === 'data' || name === 'repeat', // These can have multiple children
    parseAttributeValue: false, // Keep attribute values as strings
    parseTagValue: true, // Parse tag text content
  })

  try {
    const parsed = parser.parse(xmlString)

    // Navigate to the data elements: set > data[]
    const set = parsed.set
    if (!set || !set.data) {
      return fields
    }

    // Ensure data is an array
    const dataElements = Array.isArray(set.data) ? set.data : [set.data]

    for (const dataElement of dataElements) {
      const key = dataElement['@_key']
      if (!key) continue

      // Get the value from the repeat > (string|boolean|number|date) structure
      const repeat = dataElement.repeat
      if (!repeat) continue

      // Handle repeat as array or single object
      const repeatItems = Array.isArray(repeat) ? repeat : [repeat]

      for (const repeatItem of repeatItems) {
        // Extract the value from whichever type element is present
        // Note: fast-xml-parser returns an array if there are multiple elements of the same type
        let rawValues: any[] = []
        let valueType: string = 'string'

        if (repeatItem.string !== undefined) {
          rawValues = Array.isArray(repeatItem.string) ? repeatItem.string : [repeatItem.string]
          valueType = 'string'
        } else if (repeatItem.boolean !== undefined) {
          rawValues = Array.isArray(repeatItem.boolean) ? repeatItem.boolean : [repeatItem.boolean]
          valueType = 'boolean'
        } else if (repeatItem.number !== undefined) {
          rawValues = Array.isArray(repeatItem.number) ? repeatItem.number : [repeatItem.number]
          valueType = 'number'
        } else if (repeatItem.date !== undefined) {
          rawValues = Array.isArray(repeatItem.date) ? repeatItem.date : [repeatItem.date]
          valueType = 'date'
        }

        // Process each value found
        for (const rawValue of rawValues) {
          let value: any = extractTextValue(rawValue)
          if (value === null || value === undefined) continue

          // Convert value based on type
          switch (valueType) {
            case 'boolean':
              value = String(value).toLowerCase() === 'true'
              break
            case 'number':
              value = parseFloat(String(value)) || 0
              break
            case 'date':
              value = parseWealthCounselDate(String(value))
              break
            default:
              value = String(value)
          }

          // Handle array-like keys (e.g., "Child name" may appear multiple times)
          if (fields.has(key)) {
            const existing = fields.get(key)
            if (Array.isArray(existing)) {
              existing.push(value)
            } else {
              fields.set(key, [existing, value])
            }
          } else {
            fields.set(key, value)
          }
        }
      }
    }
  } catch (error) {
    console.error('Error parsing WealthCounsel XML:', error)
  }

  return fields
}

/**
 * Extract text value from a parsed element
 * The element might be a string, object with #text, or object with attributes
 */
function extractTextValue(element: any): string | null {
  if (element === null || element === undefined) {
    return null
  }

  // If it's a simple string/number/boolean
  if (typeof element === 'string' || typeof element === 'number' || typeof element === 'boolean') {
    return String(element)
  }

  // If it's an object, look for #text (text content when attributes are present)
  if (typeof element === 'object') {
    if ('#text' in element) {
      return String(element['#text'])
    }
    // Sometimes the value is in a nested structure
    // Check common patterns
    for (const key of Object.keys(element)) {
      if (!key.startsWith('@_')) {
        const val = element[key]
        if (typeof val === 'string' || typeof val === 'number') {
          return String(val)
        }
      }
    }
  }

  return null
}

/**
 * Parse WealthCounsel date format (DD/MM/YYYY) to ISO string
 */
function parseWealthCounselDate(dateStr: string): string | undefined {
  if (!dateStr || dateStr === 'None') return undefined

  // Try DD/MM/YYYY format
  const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateStr)
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy
    // Heuristic: if first number > 12, it's definitely DD/MM/YYYY
    if (parseInt(day) > 12) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    // Otherwise assume DD/MM/YYYY (European format commonly used in legal docs)
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Return as-is if we can't parse
  return dateStr
}

/**
 * Extract client information
 */
function extractClient(fields: Map<string, any>): WealthCounselPerson {
  return {
    firstName: normalizeEmpty(fields.get('Client name first')),
    lastName: normalizeEmpty(fields.get('Client name last')),
    middleName: normalizeEmpty(fields.get('Client name middle')),
    fullName: normalizeEmpty(fields.get('Client name')),
    suffix: normalizeEmpty(fields.get('Client name suffix')),
    email: normalizeEmpty(fields.get('Client email')),
    phone: normalizeEmpty(fields.get('Client phone')),
    cellPhone: normalizeEmpty(fields.get('Client phone cell')),
    workPhone: normalizeEmpty(fields.get('Client work phone') || fields.get('Client phone work')),
    address: normalizeEmpty(fields.get('Client street address')),
    city: normalizeEmpty(fields.get('Client city')),
    county: normalizeEmpty(fields.get('Client county')),
    state: undefined, // State often needs to be inferred from jurisdiction
    zipCode: normalizeEmpty(fields.get('Client zip')),
    dateOfBirth: normalizeEmpty(fields.get('Client dob')),
    ssn: normalizeEmpty(fields.get('Client ssn'))
  }
}

/**
 * Extract spouse information
 */
function extractSpouse(fields: Map<string, any>): WealthCounselPerson | undefined {
  const spouseName = normalizeEmpty(fields.get('Spouse name'))
  if (!spouseName) return undefined

  return {
    firstName: normalizeEmpty(fields.get('Spouse name first')),
    lastName: normalizeEmpty(fields.get('Spouse name last')),
    middleName: normalizeEmpty(fields.get('Spouse name middle')),
    fullName: spouseName,
    suffix: normalizeEmpty(fields.get('Spouse name suffix')),
    email: normalizeEmpty(fields.get('Spouse email')),
    phone: normalizeEmpty(fields.get('Spouse phone')),
    cellPhone: normalizeEmpty(fields.get('Spouse phone cell')),
    workPhone: normalizeEmpty(fields.get('Spouse work phone') || fields.get('Spouse phone work')),
    address: normalizeEmpty(fields.get('Spouse street address')),
    city: normalizeEmpty(fields.get('Spouse city')),
    county: normalizeEmpty(fields.get('Spouse county')),
    zipCode: normalizeEmpty(fields.get('Spouse zip')),
    dateOfBirth: normalizeEmpty(fields.get('Spouse dob')),
    ssn: normalizeEmpty(fields.get('Spouse ssn')),
    dateOfDeath: normalizeEmpty(fields.get('Spouse dod'))
  }
}

/**
 * Extract children
 */
function extractChildren(fields: Map<string, any>): WealthCounselPerson[] {
  const children: WealthCounselPerson[] = []

  // Try to get children from various field patterns
  // Pattern 1: "Child name", "Child name h", "Child name wf" (single or array)
  const childNameFields = ['Child name', 'Child name h', 'Child name wf']

  for (const fieldName of childNameFields) {
    const value = fields.get(fieldName)
    if (!value) continue

    const names = Array.isArray(value) ? value : [value]
    const dobField = fieldName.replace('name', 'dob')
    const dobs = fields.get(dobField)
    const dobArray = Array.isArray(dobs) ? dobs : dobs ? [dobs] : []

    for (let i = 0; i < names.length; i++) {
      const name = normalizeEmpty(names[i])
      if (name) {
        children.push({
          fullName: name,
          dateOfBirth: normalizeEmpty(dobArray[i])
        })
      }
    }
  }

  // Deduplicate by name
  const seen = new Set<string>()
  return children.filter(child => {
    if (!child.fullName || seen.has(child.fullName)) return false
    seen.add(child.fullName)
    return true
  })
}

/**
 * Extract trust information
 */
function extractTrust(fields: Map<string, any>): WealthCounselTrust {
  return {
    name: normalizeEmpty(fields.get('RLT trust name')) || 'Unnamed Trust',
    type: normalizeEmpty(fields.get('MC RLT Trust Type')),
    isJoint: fields.get('Joint Trust') === true,
    signDate: normalizeEmpty(fields.get('Trust sign date')),
    jurisdiction: undefined, // Need to infer from state fields
    trusteeNames: extractNameList(fields, 'RLT Trustee Initial name'),
    successorTrusteeNames: extractNameList(fields, 'RLT Trustee Successor name'),
    mcOptions: extractMcOptions(fields)
  }
}

/**
 * Extract will information
 */
function extractWill(fields: Map<string, any>): WealthCounselWill {
  return {
    executionDate: normalizeEmpty(fields.get('Will execution date')),
    jurisdiction: undefined,
    personalRepNames: extractNameList(fields, 'Personal Representative name')
  }
}

/**
 * Extract fiduciary roles - organized by trust vs individual documents
 *
 * In a joint plan:
 * - Trust fiduciaries (trustees) are shared
 * - Individual document fiduciaries (POA, healthcare, will) are per-person
 *   - Base fields (no suffix) → Client's documents
 *   - Fields with "wf" suffix → Spouse's documents (wife)
 */
function extractFiduciaries(fields: Map<string, any>): WealthCounselData['fiduciaries'] {
  return {
    // Trust-level fiduciaries (shared)
    trustees: extractRolesForPerson(fields, 'RLT Trustee Initial name', 'TRUSTEE', 'TRUST'),
    // Note: WealthCounsel uses "Successor Trustee incapacity" for successor trustees
    successorTrustees: extractRolesForPerson(fields, 'Successor Trustee incapacity', 'SUCCESSOR_TRUSTEE', 'TRUST'),
    trustProtectors: extractRolesForPerson(fields, 'Trust Protector name RLT', 'TRUST_PROTECTOR', 'TRUST'),

    // Client's individual document fiduciaries
    client: extractIndividualFiduciaries(fields, 'CLIENT'),

    // Spouse's individual document fiduciaries
    spouse: extractIndividualFiduciaries(fields, 'SPOUSE')
  }
}

/**
 * Extract individual document fiduciaries for a specific person
 */
function extractIndividualFiduciaries(
  fields: Map<string, any>,
  forPerson: 'CLIENT' | 'SPOUSE'
): IndividualFiduciaries {
  // Spouse fields have "wf" suffix, client fields don't
  const suffix = forPerson === 'SPOUSE' ? ' wf' : ''

  return {
    financialAgents: extractRolesForPerson(
      fields,
      `Financial Agent initial name${suffix}`,
      'FINANCIAL_AGENT',
      forPerson
    ),
    financialAgentSuccessors: extractRolesForPerson(
      fields,
      `Financial Agent successor name${suffix}`,
      'ALTERNATE_FINANCIAL_AGENT',
      forPerson
    ),
    healthcareAgents: extractRolesForPerson(
      fields,
      `Healthcare Agent name${suffix}`,
      'HEALTHCARE_AGENT',
      forPerson
    ),
    healthcareAgentSuccessors: extractRolesForPerson(
      fields,
      `Healthcare Agent Successor name${suffix}`,
      'ALTERNATE_HEALTHCARE_AGENT',
      forPerson
    ),
    executors: extractRolesForPerson(
      fields,
      `Personal Representative name${suffix}`,
      'EXECUTOR',
      forPerson
    ),
    guardians: extractRolesForPerson(
      fields,
      `Will Guardian name${suffix}`,
      'GUARDIAN',
      forPerson
    )
  }
}

/**
 * Extract roles from a name field for a specific person/document owner
 *
 * @param fields - The parsed fields map
 * @param fieldName - The exact field name to look up (already includes suffix if needed)
 * @param roleType - The role type (e.g., 'TRUSTEE', 'FINANCIAL_AGENT')
 * @param forPerson - Who this role belongs to ('CLIENT', 'SPOUSE', or 'TRUST')
 */
function extractRolesForPerson(
  fields: Map<string, any>,
  fieldName: string,
  roleType: string,
  forPerson: 'CLIENT' | 'SPOUSE' | 'TRUST'
): WealthCounselRole[] {
  const roles: WealthCounselRole[] = []

  // Try the field name and mc variation (mc = maybe corrected?)
  const variations = ['', ' mc']

  for (const suffix of variations) {
    const fullFieldName = fieldName + suffix
    const value = fields.get(fullFieldName)
    if (!value) continue

    const names = Array.isArray(value) ? value : [value]
    for (let i = 0; i < names.length; i++) {
      const name = normalizeEmpty(names[i])
      if (name) {
        roles.push({
          personName: name,
          roleType,
          isPrimary: i === 0 && suffix === '',
          ordinal: i + 1,
          forPerson
        })
      }
    }
  }

  // Deduplicate by person name within same role type
  const seen = new Set<string>()
  return roles.filter(role => {
    if (seen.has(role.personName)) return false
    seen.add(role.personName)
    return true
  })
}

/**
 * Extract beneficiaries
 */
function extractBeneficiaries(fields: Map<string, any>): WealthCounselBeneficiary[] {
  const beneficiaries: WealthCounselBeneficiary[] = []

  // Try numbered beneficiary fields (Residuary Beneficiary name 1, 2, etc.)
  for (let i = 1; i <= 10; i++) {
    const name = normalizeEmpty(fields.get(`Residuary Beneficiary name ${i}`))
    if (!name) continue

    beneficiaries.push({
      name,
      percentage: normalizeEmpty(fields.get(`Residuary Beneficiary percentage ${i}`)),
      relationship: normalizeEmpty(fields.get(`Residuary Beneficiary relationship ${i}`)),
      address: normalizeEmpty(fields.get(`Residuary Beneficiary physical address ${i}`))
    })
  }

  // Also try non-numbered pattern
  const baseName = normalizeEmpty(fields.get('Residuary Beneficiary name'))
  if (baseName && !beneficiaries.find(b => b.name === baseName)) {
    beneficiaries.push({
      name: baseName,
      percentage: normalizeEmpty(fields.get('Residuary Beneficiary percentage')),
      relationship: normalizeEmpty(fields.get('Residuary Beneficiary relationship'))
    })
  }

  return beneficiaries
}

/**
 * Extract a list of names from a field
 * Only uses base field and 'mc' variation - does NOT include 'wf' (spouse) fields
 */
function extractNameList(fields: Map<string, any>, baseFieldName: string): string[] {
  const names: string[] = []

  // Only try base and mc variation - not h/wf which are person-specific
  const variations = ['', ' mc']
  for (const suffix of variations) {
    const value = fields.get(baseFieldName + suffix)
    if (!value) continue

    const valueArray = Array.isArray(value) ? value : [value]
    for (const val of valueArray) {
      const name = normalizeEmpty(val)
      if (name && !names.includes(name)) {
        names.push(name)
      }
    }
  }

  return names
}

/**
 * Extract MC_ prefixed options for trust configuration
 */
function extractMcOptions(fields: Map<string, any>): Record<string, any> {
  const options: Record<string, any> = {}

  for (const [key, value] of fields.entries()) {
    if (key.startsWith('MC ') || key.startsWith('MC_')) {
      options[key] = value
    }
  }

  return options
}

/**
 * Normalize empty/null values to undefined
 * Also filters out invalid values like "None", numbers where strings expected, etc.
 */
function normalizeEmpty(value: any): string | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  const strValue = String(value).trim()

  // Filter out common "empty" markers
  if (
    strValue === '' ||
    strValue === 'None' ||
    strValue === 'null' ||
    strValue === 'undefined'
  ) {
    return undefined
  }

  // Filter out values that are just numbers (likely field counts, not actual names)
  // This helps avoid parsing issues like "Client name: 2" instead of "Client name: John Smith"
  if (/^\d+$/.test(strValue) && strValue.length < 4) {
    return undefined
  }

  return strValue
}

/**
 * Get a summary of parsed data for preview
 */
export function summarizeParsedData(data: WealthCounselData): {
  clientSummary: string
  planSummary: string
  roleCounts: Record<string, number>
  fiduciarySummary: {
    uniquePeople: number
    totalRoleAssignments: number
    roleTypes: string[]
  }
  fieldCount: number
} {
  const clientSummary = [
    data.client.fullName,
    data.spouse ? `& ${data.spouse.fullName}` : '',
    data.children.length > 0 ? `(${data.children.length} children)` : ''
  ].filter(Boolean).join(' ')

  const planSummary = data.trust
    ? `${data.trust.name}${data.trust.isJoint ? ' (Joint)' : ''}`
    : 'Will-Based Plan'

  // Count roles across both client and spouse individual fiduciaries
  const clientFids = data.fiduciaries.client
  const spouseFids = data.fiduciaries.spouse

  const roleCounts = {
    trustees: data.fiduciaries.trustees.length,
    successorTrustees: data.fiduciaries.successorTrustees.length,
    trustProtectors: data.fiduciaries.trustProtectors.length,
    // Combine client and spouse individual fiduciaries for totals
    financialAgents: clientFids.financialAgents.length + spouseFids.financialAgents.length,
    financialAgentSuccessors: clientFids.financialAgentSuccessors.length + spouseFids.financialAgentSuccessors.length,
    healthcareAgents: clientFids.healthcareAgents.length + spouseFids.healthcareAgents.length,
    healthcareAgentSuccessors: clientFids.healthcareAgentSuccessors.length + spouseFids.healthcareAgentSuccessors.length,
    executors: clientFids.executors.length + spouseFids.executors.length,
    guardians: clientFids.guardians.length + spouseFids.guardians.length,
    beneficiaries: data.beneficiaries.length
  }

  // Collect all fiduciary names to count unique people
  const allFiduciaryNames = new Set<string>()
  const roleTypesWithPeople = new Set<string>()

  // Helper to add names and track role types
  const addRoles = (roles: { personName: string; roleType: string }[], roleLabel: string) => {
    if (roles.length > 0) {
      roleTypesWithPeople.add(roleLabel)
      roles.forEach(r => allFiduciaryNames.add(r.personName.toLowerCase()))
    }
  }

  // Trust-level fiduciaries
  addRoles(data.fiduciaries.trustees, 'Trustee')
  addRoles(data.fiduciaries.successorTrustees, 'Successor Trustee')
  addRoles(data.fiduciaries.trustProtectors, 'Trust Protector')

  // Client individual fiduciaries
  addRoles(clientFids.financialAgents, 'Financial Agent')
  addRoles(clientFids.financialAgentSuccessors, 'Successor Financial Agent')
  addRoles(clientFids.healthcareAgents, 'Healthcare Agent')
  addRoles(clientFids.healthcareAgentSuccessors, 'Successor Healthcare Agent')
  addRoles(clientFids.executors, 'Executor')
  addRoles(clientFids.guardians, 'Guardian')

  // Spouse individual fiduciaries (same role types, different document owner)
  addRoles(spouseFids.financialAgents, 'Financial Agent')
  addRoles(spouseFids.financialAgentSuccessors, 'Successor Financial Agent')
  addRoles(spouseFids.healthcareAgents, 'Healthcare Agent')
  addRoles(spouseFids.healthcareAgentSuccessors, 'Successor Healthcare Agent')
  addRoles(spouseFids.executors, 'Executor')
  addRoles(spouseFids.guardians, 'Guardian')

  // Calculate total role assignments
  const totalRoleAssignments =
    data.fiduciaries.trustees.length +
    data.fiduciaries.successorTrustees.length +
    data.fiduciaries.trustProtectors.length +
    clientFids.financialAgents.length +
    clientFids.financialAgentSuccessors.length +
    clientFids.healthcareAgents.length +
    clientFids.healthcareAgentSuccessors.length +
    clientFids.executors.length +
    clientFids.guardians.length +
    spouseFids.financialAgents.length +
    spouseFids.financialAgentSuccessors.length +
    spouseFids.healthcareAgents.length +
    spouseFids.healthcareAgentSuccessors.length +
    spouseFids.executors.length +
    spouseFids.guardians.length

  return {
    clientSummary,
    planSummary,
    roleCounts,
    fiduciarySummary: {
      uniquePeople: allFiduciaryNames.size,
      totalRoleAssignments,
      roleTypes: Array.from(roleTypesWithPeople)
    },
    fieldCount: data.rawFields.size
  }
}
