/**
 * POST /api/admin/integrations/wealthcounsel/parse
 *
 * Parse a WealthCounsel XML file and return structured preview data
 * with match suggestions for existing people and plans.
 */

import { parseWealthCounselXml, summarizeParsedData } from '../../../../utils/wealthcounsel-parser'
import type { WealthCounselParseResult, ExtractedPersonWithMatches } from '../../../../utils/wealthcounsel-types'
import { useDrizzle, schema } from '../../../../db'
import { eq } from 'drizzle-orm'
import { PersonExtractor } from '../../../../utils/person-matching'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Read multipart form data
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }

  // Find the XML file
  const xmlFile = formData.find(f => f.name === 'file' && f.filename?.endsWith('.xml'))
  if (!xmlFile || !xmlFile.data) {
    throw createError({ statusCode: 400, message: 'Invalid file. Please upload a WealthCounsel XML file.' })
  }

  // Parse the XML
  const xmlString = xmlFile.data.toString('utf-8')

  let parsedData
  try {
    parsedData = parseWealthCounselXml(xmlString)
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: `Failed to parse XML: ${error.message}`
    })
  }

  // Generate a unique parse ID for this session
  const parseId = `parse_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  // Convert rawFields Map to object for JSON serialization
  // (Maps don't serialize to JSON properly)
  const serializableParsedData = {
    ...parsedData,
    rawFields: Object.fromEntries(parsedData.rawFields)
  }

  // Store the parsed data in KV for the import step
  const { kv } = await import('@nuxthub/kv')
  await kv.set(`wc_parse:${parseId}`, {
    parsedData: serializableParsedData,
    xmlString,
    userId: user.id,
    createdAt: new Date().toISOString()
  }, { ttl: 3600 }) // 1 hour TTL

  // Look for existing matches
  const db = useDrizzle()

  // Use PersonExtractor to extract all unique people
  type WCPersonRole = 'client' | 'spouse' | 'child' | 'beneficiary' | 'fiduciary'
  const extractor = new PersonExtractor<WCPersonRole>()

  // Extract client (first grantor)
  if (parsedData.client.fullName) {
    extractor.add(
      parsedData.client.fullName,
      'client',
      ['Client'],
      parsedData.client.email,
      parsedData.client.dateOfBirth
    )
  }

  // Extract spouse (second grantor for joint plans)
  // For joint plans, both grantors are equal clients - no hierarchy
  if (parsedData.spouse?.fullName) {
    const isJointPlan = parsedData.trust?.isJoint === true
    extractor.add(
      parsedData.spouse.fullName,
      isJointPlan ? 'client' : 'spouse',
      isJointPlan ? ['Client'] : ['Spouse'],
      parsedData.spouse.email,
      parsedData.spouse.dateOfBirth
    )
  }

  // Extract children
  for (const child of parsedData.children) {
    if (child.fullName) {
      extractor.add(child.fullName, 'child', ['Child'], undefined, child.dateOfBirth)
    }
  }

  // Extract beneficiaries
  for (const beneficiary of parsedData.beneficiaries) {
    if (beneficiary.name) {
      extractor.add(beneficiary.name, 'beneficiary', ['Beneficiary'], undefined, undefined)
    }
  }

  // Extract fiduciaries - use addRole to aggregate multiple roles per person
  // Trust-level fiduciaries
  for (const t of parsedData.fiduciaries.trustees) {
    if (!extractor.has(t.personName)) {
      extractor.add(t.personName, 'fiduciary', ['Trustee'], undefined, undefined)
    } else {
      extractor.addRole(t.personName, 'Trustee')
    }
  }
  for (const t of parsedData.fiduciaries.successorTrustees) {
    if (!extractor.has(t.personName)) {
      extractor.add(t.personName, 'fiduciary', ['Successor Trustee'], undefined, undefined)
    } else {
      extractor.addRole(t.personName, 'Successor Trustee')
    }
  }
  for (const t of parsedData.fiduciaries.trustProtectors) {
    if (!extractor.has(t.personName)) {
      extractor.add(t.personName, 'fiduciary', ['Trust Protector'], undefined, undefined)
    } else {
      extractor.addRole(t.personName, 'Trust Protector')
    }
  }

  // Client's individual document fiduciaries
  for (const t of parsedData.fiduciaries.client.financialAgents) {
    if (!extractor.has(t.personName)) {
      extractor.add(t.personName, 'fiduciary', ['Financial Agent (Client)'], undefined, undefined)
    } else {
      extractor.addRole(t.personName, 'Financial Agent (Client)')
    }
  }
  for (const t of parsedData.fiduciaries.client.financialAgentSuccessors) {
    if (!extractor.has(t.personName)) {
      extractor.add(t.personName, 'fiduciary', ['Successor Financial Agent (Client)'], undefined, undefined)
    } else {
      extractor.addRole(t.personName, 'Successor Financial Agent (Client)')
    }
  }
  for (const t of parsedData.fiduciaries.client.healthcareAgents) {
    if (!extractor.has(t.personName)) {
      extractor.add(t.personName, 'fiduciary', ['Healthcare Agent (Client)'], undefined, undefined)
    } else {
      extractor.addRole(t.personName, 'Healthcare Agent (Client)')
    }
  }
  for (const t of parsedData.fiduciaries.client.healthcareAgentSuccessors) {
    if (!extractor.has(t.personName)) {
      extractor.add(t.personName, 'fiduciary', ['Successor Healthcare Agent (Client)'], undefined, undefined)
    } else {
      extractor.addRole(t.personName, 'Successor Healthcare Agent (Client)')
    }
  }
  for (const t of parsedData.fiduciaries.client.executors) {
    if (!extractor.has(t.personName)) {
      extractor.add(t.personName, 'fiduciary', ['Executor (Client)'], undefined, undefined)
    } else {
      extractor.addRole(t.personName, 'Executor (Client)')
    }
  }
  for (const t of parsedData.fiduciaries.client.guardians) {
    if (!extractor.has(t.personName)) {
      extractor.add(t.personName, 'fiduciary', ['Guardian (Client)'], undefined, undefined)
    } else {
      extractor.addRole(t.personName, 'Guardian (Client)')
    }
  }

  // Spouse's individual document fiduciaries
  for (const t of parsedData.fiduciaries.spouse.financialAgents) {
    if (!extractor.has(t.personName)) {
      extractor.add(t.personName, 'fiduciary', ['Financial Agent (Spouse)'], undefined, undefined)
    } else {
      extractor.addRole(t.personName, 'Financial Agent (Spouse)')
    }
  }
  for (const t of parsedData.fiduciaries.spouse.financialAgentSuccessors) {
    if (!extractor.has(t.personName)) {
      extractor.add(t.personName, 'fiduciary', ['Successor Financial Agent (Spouse)'], undefined, undefined)
    } else {
      extractor.addRole(t.personName, 'Successor Financial Agent (Spouse)')
    }
  }
  for (const t of parsedData.fiduciaries.spouse.healthcareAgents) {
    if (!extractor.has(t.personName)) {
      extractor.add(t.personName, 'fiduciary', ['Healthcare Agent (Spouse)'], undefined, undefined)
    } else {
      extractor.addRole(t.personName, 'Healthcare Agent (Spouse)')
    }
  }
  for (const t of parsedData.fiduciaries.spouse.healthcareAgentSuccessors) {
    if (!extractor.has(t.personName)) {
      extractor.add(t.personName, 'fiduciary', ['Successor Healthcare Agent (Spouse)'], undefined, undefined)
    } else {
      extractor.addRole(t.personName, 'Successor Healthcare Agent (Spouse)')
    }
  }
  for (const t of parsedData.fiduciaries.spouse.executors) {
    if (!extractor.has(t.personName)) {
      extractor.add(t.personName, 'fiduciary', ['Executor (Spouse)'], undefined, undefined)
    } else {
      extractor.addRole(t.personName, 'Executor (Spouse)')
    }
  }
  for (const t of parsedData.fiduciaries.spouse.guardians) {
    if (!extractor.has(t.personName)) {
      extractor.add(t.personName, 'fiduciary', ['Guardian (Spouse)'], undefined, undefined)
    } else {
      extractor.addRole(t.personName, 'Guardian (Spouse)')
    }
  }

  // Find matches for all extracted people
  await extractor.findAllMatches({ limit: 5 })

  // Convert to the expected type format
  const extractedPeople: ExtractedPersonWithMatches[] = extractor.getAll().map(p => ({
    extractedName: p.extractedName,
    extractedEmail: p.extractedEmail,
    extractedDateOfBirth: p.extractedDateOfBirth,
    role: p.role,
    rolesInPlan: p.rolesInPlan,
    matches: p.matches.map(m => ({
      personId: m.personId,
      personName: m.personName,
      email: m.email,
      dateOfBirth: m.dateOfBirth,
      matchType: m.matchType,
      confidence: m.confidence,
      matchingFields: m.matchingFields
    }))
  }))

  // Get legacy client/spouse matches for backward compatibility
  const clientMatches = extractedPeople.find(p => p.role === 'client')?.matches || []
  const spouseMatches = extractedPeople.find(p => p.role === 'spouse')?.matches || []

  // Find existing plans for matched clients
  const existingPlans: WealthCounselParseResult['suggestions']['existingPlans'] = []

  if (clientMatches.length > 0) {
    const matchedPersonIds = clientMatches.map(m => m.personId)

    for (const personId of matchedPersonIds) {
      const plans = await db.select()
        .from(schema.estatePlans)
        .where(eq(schema.estatePlans.grantorPersonId1, personId))
        .limit(5)

      for (const plan of plans) {
        existingPlans.push({
          planId: plan.id,
          planName: plan.planName || 'Unnamed Plan',
          status: plan.status
        })
      }
    }
  }

  // Prepare the result
  const result: WealthCounselParseResult = {
    parseId,
    parsed: {
      client: {
        fullName: parsedData.client.fullName || '',
        firstName: parsedData.client.firstName,
        lastName: parsedData.client.lastName,
        email: parsedData.client.email,
        phone: parsedData.client.phone,
        address: parsedData.client.address,
        city: parsedData.client.city,
        state: parsedData.client.state,
        zipCode: parsedData.client.zipCode,
        dateOfBirth: parsedData.client.dateOfBirth
      },
      spouse: parsedData.spouse ? {
        fullName: parsedData.spouse.fullName || '',
        firstName: parsedData.spouse.firstName,
        lastName: parsedData.spouse.lastName,
        email: parsedData.spouse.email,
        phone: parsedData.spouse.phone,
        dateOfBirth: parsedData.spouse.dateOfBirth
      } : undefined,
      children: parsedData.children.map(c => ({
        name: c.fullName || '',
        dateOfBirth: c.dateOfBirth
      })),
      planType: parsedData.planType,
      trust: parsedData.trust ? {
        name: parsedData.trust.name,
        type: parsedData.trust.type,
        isJoint: parsedData.trust.isJoint,
        signDate: parsedData.trust.signDate
      } : undefined,
      will: parsedData.will ? {
        executionDate: parsedData.will.executionDate
      } : undefined,
      fiduciaries: [
        // Trust-level fiduciaries
        ...parsedData.fiduciaries.trustees.map(t => ({ name: t.personName, role: 'Trustee', forPerson: 'TRUST' })),
        ...parsedData.fiduciaries.successorTrustees.map(t => ({ name: t.personName, role: 'Successor Trustee', forPerson: 'TRUST' })),
        ...parsedData.fiduciaries.trustProtectors.map(t => ({ name: t.personName, role: 'Trust Protector', forPerson: 'TRUST' })),
        // Client's individual document fiduciaries
        ...parsedData.fiduciaries.client.financialAgents.map(t => ({ name: t.personName, role: 'Financial Agent', forPerson: 'CLIENT' })),
        ...parsedData.fiduciaries.client.financialAgentSuccessors.map(t => ({ name: t.personName, role: 'Successor Financial Agent', forPerson: 'CLIENT' })),
        ...parsedData.fiduciaries.client.healthcareAgents.map(t => ({ name: t.personName, role: 'Healthcare Agent', forPerson: 'CLIENT' })),
        ...parsedData.fiduciaries.client.healthcareAgentSuccessors.map(t => ({ name: t.personName, role: 'Successor Healthcare Agent', forPerson: 'CLIENT' })),
        ...parsedData.fiduciaries.client.executors.map(t => ({ name: t.personName, role: 'Executor', forPerson: 'CLIENT' })),
        ...parsedData.fiduciaries.client.guardians.map(t => ({ name: t.personName, role: 'Guardian', forPerson: 'CLIENT' })),
        // Spouse's individual document fiduciaries
        ...parsedData.fiduciaries.spouse.financialAgents.map(t => ({ name: t.personName, role: 'Financial Agent', forPerson: 'SPOUSE' })),
        ...parsedData.fiduciaries.spouse.financialAgentSuccessors.map(t => ({ name: t.personName, role: 'Successor Financial Agent', forPerson: 'SPOUSE' })),
        ...parsedData.fiduciaries.spouse.healthcareAgents.map(t => ({ name: t.personName, role: 'Healthcare Agent', forPerson: 'SPOUSE' })),
        ...parsedData.fiduciaries.spouse.healthcareAgentSuccessors.map(t => ({ name: t.personName, role: 'Successor Healthcare Agent', forPerson: 'SPOUSE' })),
        ...parsedData.fiduciaries.spouse.executors.map(t => ({ name: t.personName, role: 'Executor', forPerson: 'SPOUSE' })),
        ...parsedData.fiduciaries.spouse.guardians.map(t => ({ name: t.personName, role: 'Guardian', forPerson: 'SPOUSE' }))
      ],
      beneficiaries: parsedData.beneficiaries.map(b => ({
        name: b.name,
        share: b.percentage,
        relationship: b.relationship
      })),
      fiduciarySummary: summarizeParsedData(parsedData).fiduciarySummary,
      rawFieldCount: parsedData.rawFields.size
    },
    suggestions: {
      clientMatch: clientMatches[0],
      spouseMatch: spouseMatches[0],
      existingPlans,
      matterSuggestions: [] // TODO: Implement matter matching
    },
    extractedPeople
  }

  return result
})
