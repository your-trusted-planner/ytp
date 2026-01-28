/**
 * GET /api/admin/integrations/wealthcounsel/pending/:parseId
 *
 * Get a specific pending WealthCounsel parse session to resume import
 */

import type { WealthCounselParseResult, ExtractedPersonWithMatches } from '../../../../../utils/wealthcounsel-types'
import { useDrizzle, schema } from '../../../../../db'
import { eq, or } from 'drizzle-orm'
import { PersonExtractor } from '../../../../../utils/person-matching'

/**
 * Compute fiduciary summary from stored parsed data
 */
function computeFiduciarySummary(parsedData: any): {
  uniquePeople: number
  totalRoleAssignments: number
  roleTypes: string[]
} {
  const allNames = new Set<string>()
  const roleTypes = new Set<string>()
  let total = 0

  const addRoles = (roles: any[] | undefined, roleType: string) => {
    if (!roles) return
    if (roles.length > 0) roleTypes.add(roleType)
    for (const r of roles) {
      if (r.personName) {
        allNames.add(r.personName.toLowerCase())
        total++
      }
    }
  }

  // Trust-level
  addRoles(parsedData.fiduciaries?.trustees, 'Trustee')
  addRoles(parsedData.fiduciaries?.successorTrustees, 'Successor Trustee')
  addRoles(parsedData.fiduciaries?.trustProtectors, 'Trust Protector')

  // Client individual
  addRoles(parsedData.fiduciaries?.client?.financialAgents, 'Financial Agent')
  addRoles(parsedData.fiduciaries?.client?.financialAgentSuccessors, 'Successor Financial Agent')
  addRoles(parsedData.fiduciaries?.client?.healthcareAgents, 'Healthcare Agent')
  addRoles(parsedData.fiduciaries?.client?.healthcareAgentSuccessors, 'Successor Healthcare Agent')
  addRoles(parsedData.fiduciaries?.client?.executors, 'Executor')
  addRoles(parsedData.fiduciaries?.client?.guardians, 'Guardian')

  // Spouse individual
  addRoles(parsedData.fiduciaries?.spouse?.financialAgents, 'Financial Agent')
  addRoles(parsedData.fiduciaries?.spouse?.financialAgentSuccessors, 'Successor Financial Agent')
  addRoles(parsedData.fiduciaries?.spouse?.healthcareAgents, 'Healthcare Agent')
  addRoles(parsedData.fiduciaries?.spouse?.healthcareAgentSuccessors, 'Successor Healthcare Agent')
  addRoles(parsedData.fiduciaries?.spouse?.executors, 'Executor')
  addRoles(parsedData.fiduciaries?.spouse?.guardians, 'Guardian')

  return {
    uniquePeople: allNames.size,
    totalRoleAssignments: total,
    roleTypes: Array.from(roleTypes)
  }
}

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const parseId = getRouterParam(event, 'parseId')
  if (!parseId) {
    throw createError({ statusCode: 400, message: 'Parse ID is required' })
  }

  const { kv } = await import('@nuxthub/kv')

  // Get the stored session
  const key = `wc_parse:${parseId}`
  const storedData = await kv.get<{
    parsedData: any
    xmlString: string
    userId: string
    createdAt: string
  }>(key)

  if (!storedData) {
    throw createError({
      statusCode: 404,
      message: 'Parse session not found or expired'
    })
  }

  const { parsedData } = storedData

  // Look for existing matches (same as parse.post.ts)
  const db = useDrizzle()

  const clientMatches: WealthCounselParseResult['suggestions']['clientMatch'][] = []

  if (parsedData.client?.email || parsedData.client?.fullName) {
    const conditions = []

    if (parsedData.client.email) {
      conditions.push(eq(schema.people.email, parsedData.client.email))
    }
    if (parsedData.client.fullName) {
      conditions.push(eq(schema.people.fullName, parsedData.client.fullName))
    }

    if (conditions.length > 0) {
      const existingPeople = await db.select()
        .from(schema.people)
        .where(or(...conditions))
        .limit(5)

      for (const person of existingPeople) {
        const matchType = person.email === parsedData.client.email ? 'NAME_EMAIL' : 'NAME_ONLY'
        const confidence = matchType === 'NAME_EMAIL' ? 90 : 60

        clientMatches.push({
          personId: person.id,
          personName: person.fullName || `${person.firstName} ${person.lastName}`,
          matchType,
          confidence,
          matchingFields: matchType === 'NAME_EMAIL' ? ['email', 'name'] : ['name']
        })
      }
    }
  }

  // Find existing plans for matched clients
  const existingPlans: WealthCounselParseResult['suggestions']['existingPlans'] = []

  if (clientMatches.length > 0) {
    const matchedPersonIds = clientMatches.map(m => m!.personId)

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

  // Use PersonExtractor to extract all unique people and find matches
  type WCPersonRole = 'client' | 'spouse' | 'child' | 'beneficiary' | 'fiduciary'
  const extractor = new PersonExtractor<WCPersonRole>()

  // Extract client (first grantor)
  if (parsedData.client?.fullName) {
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
  for (const child of (parsedData.children || [])) {
    if (child.fullName) {
      extractor.add(child.fullName, 'child', ['Child'], undefined, child.dateOfBirth)
    }
  }

  // Extract beneficiaries
  for (const beneficiary of (parsedData.beneficiaries || [])) {
    if (beneficiary.name) {
      extractor.add(beneficiary.name, 'beneficiary', ['Beneficiary'], undefined, undefined)
    }
  }

  // Extract fiduciaries - use addRole to aggregate multiple roles per person
  const fiduciaryCategories = [
    { data: parsedData.fiduciaries?.trustees, role: 'Trustee' },
    { data: parsedData.fiduciaries?.successorTrustees, role: 'Successor Trustee' },
    { data: parsedData.fiduciaries?.trustProtectors, role: 'Trust Protector' },
    { data: parsedData.fiduciaries?.client?.financialAgents, role: 'Financial Agent (Client)' },
    { data: parsedData.fiduciaries?.client?.financialAgentSuccessors, role: 'Successor Financial Agent (Client)' },
    { data: parsedData.fiduciaries?.client?.healthcareAgents, role: 'Healthcare Agent (Client)' },
    { data: parsedData.fiduciaries?.client?.healthcareAgentSuccessors, role: 'Successor Healthcare Agent (Client)' },
    { data: parsedData.fiduciaries?.client?.executors, role: 'Executor (Client)' },
    { data: parsedData.fiduciaries?.client?.guardians, role: 'Guardian (Client)' },
    { data: parsedData.fiduciaries?.spouse?.financialAgents, role: 'Financial Agent (Spouse)' },
    { data: parsedData.fiduciaries?.spouse?.financialAgentSuccessors, role: 'Successor Financial Agent (Spouse)' },
    { data: parsedData.fiduciaries?.spouse?.healthcareAgents, role: 'Healthcare Agent (Spouse)' },
    { data: parsedData.fiduciaries?.spouse?.healthcareAgentSuccessors, role: 'Successor Healthcare Agent (Spouse)' },
    { data: parsedData.fiduciaries?.spouse?.executors, role: 'Executor (Spouse)' },
    { data: parsedData.fiduciaries?.spouse?.guardians, role: 'Guardian (Spouse)' }
  ]

  for (const category of fiduciaryCategories) {
    for (const t of (category.data || [])) {
      if (t.personName) {
        if (!extractor.has(t.personName)) {
          extractor.add(t.personName, 'fiduciary', [category.role], undefined, undefined)
        } else {
          extractor.addRole(t.personName, category.role)
        }
      }
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

  // Return the same format as parse.post.ts
  const result: WealthCounselParseResult = {
    parseId,
    parsed: {
      client: {
        fullName: parsedData.client?.fullName || '',
        firstName: parsedData.client?.firstName,
        lastName: parsedData.client?.lastName,
        email: parsedData.client?.email,
        phone: parsedData.client?.phone,
        address: parsedData.client?.address,
        city: parsedData.client?.city,
        state: parsedData.client?.state,
        zipCode: parsedData.client?.zipCode,
        dateOfBirth: parsedData.client?.dateOfBirth
      },
      spouse: parsedData.spouse ? {
        fullName: parsedData.spouse.fullName || '',
        firstName: parsedData.spouse.firstName,
        lastName: parsedData.spouse.lastName,
        email: parsedData.spouse.email,
        phone: parsedData.spouse.phone,
        dateOfBirth: parsedData.spouse.dateOfBirth
      } : undefined,
      children: (parsedData.children || []).map((c: any) => ({
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
        ...(parsedData.fiduciaries?.trustees || []).map((t: any) => ({ name: t.personName, role: 'Trustee', forPerson: 'TRUST' })),
        ...(parsedData.fiduciaries?.successorTrustees || []).map((t: any) => ({ name: t.personName, role: 'Successor Trustee', forPerson: 'TRUST' })),
        ...(parsedData.fiduciaries?.trustProtectors || []).map((t: any) => ({ name: t.personName, role: 'Trust Protector', forPerson: 'TRUST' })),
        // Client's individual document fiduciaries
        ...(parsedData.fiduciaries?.client?.financialAgents || []).map((t: any) => ({ name: t.personName, role: 'Financial Agent', forPerson: 'CLIENT' })),
        ...(parsedData.fiduciaries?.client?.financialAgentSuccessors || []).map((t: any) => ({ name: t.personName, role: 'Successor Financial Agent', forPerson: 'CLIENT' })),
        ...(parsedData.fiduciaries?.client?.healthcareAgents || []).map((t: any) => ({ name: t.personName, role: 'Healthcare Agent', forPerson: 'CLIENT' })),
        ...(parsedData.fiduciaries?.client?.healthcareAgentSuccessors || []).map((t: any) => ({ name: t.personName, role: 'Successor Healthcare Agent', forPerson: 'CLIENT' })),
        ...(parsedData.fiduciaries?.client?.executors || []).map((t: any) => ({ name: t.personName, role: 'Executor', forPerson: 'CLIENT' })),
        ...(parsedData.fiduciaries?.client?.guardians || []).map((t: any) => ({ name: t.personName, role: 'Guardian', forPerson: 'CLIENT' })),
        // Spouse's individual document fiduciaries
        ...(parsedData.fiduciaries?.spouse?.financialAgents || []).map((t: any) => ({ name: t.personName, role: 'Financial Agent', forPerson: 'SPOUSE' })),
        ...(parsedData.fiduciaries?.spouse?.financialAgentSuccessors || []).map((t: any) => ({ name: t.personName, role: 'Successor Financial Agent', forPerson: 'SPOUSE' })),
        ...(parsedData.fiduciaries?.spouse?.healthcareAgents || []).map((t: any) => ({ name: t.personName, role: 'Healthcare Agent', forPerson: 'SPOUSE' })),
        ...(parsedData.fiduciaries?.spouse?.healthcareAgentSuccessors || []).map((t: any) => ({ name: t.personName, role: 'Successor Healthcare Agent', forPerson: 'SPOUSE' })),
        ...(parsedData.fiduciaries?.spouse?.executors || []).map((t: any) => ({ name: t.personName, role: 'Executor', forPerson: 'SPOUSE' })),
        ...(parsedData.fiduciaries?.spouse?.guardians || []).map((t: any) => ({ name: t.personName, role: 'Guardian', forPerson: 'SPOUSE' }))
      ],
      beneficiaries: (parsedData.beneficiaries || []).map((b: any) => ({
        name: b.name,
        share: b.percentage,
        relationship: b.relationship
      })),
      fiduciarySummary: computeFiduciarySummary(parsedData),
      rawFieldCount: Object.keys(parsedData.rawFields || {}).length
    },
    suggestions: {
      clientMatch: clientMatches[0],
      spouseMatch: undefined,
      existingPlans,
      matterSuggestions: []
    },
    extractedPeople
  }

  return result
})
