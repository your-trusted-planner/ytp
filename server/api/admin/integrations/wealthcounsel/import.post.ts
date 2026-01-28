/**
 * POST /api/admin/integrations/wealthcounsel/import
 *
 * Execute the import using the parsed data and user decisions.
 */

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'
import {
  extractPeople,
  transformToEstatePlan,
  transformRoles,
  buildPersonLookup,
  extractClientsToCreate
} from '../../../../utils/wealthcounsel-transformers'
import type { WealthCounselImportResult } from '../../../../utils/wealthcounsel-types'
import {
  buildDecisionLookup,
  buildPersonIdLookupFromDecisions,
  shouldCreatePerson,
  type PersonMatchDecision
} from '../../../../utils/person-matching'
import { logActivity } from '../../../../utils/activity-logger'

// Schema for individual person matching decisions
const PersonDecisionSchema = z.object({
  extractedName: z.string(),
  action: z.enum(['use_existing', 'create_new']),
  existingPersonId: z.string().optional()
})

const ImportRequestSchema = z.object({
  parseId: z.string(),
  decisions: z.object({
    clientPersonId: z.string().optional(),
    spousePersonId: z.string().optional(),
    // New: array of decisions for each extracted person
    personDecisions: z.array(PersonDecisionSchema).optional(),
    isAmendment: z.boolean().default(false),
    existingPlanId: z.string().optional(),
    linkToMatterId: z.string().optional(),
    // Whether to create client records for grantors (primary + spouse)
    // If false, only people records are created, not client records
    createClientRecords: z.boolean().default(false),
    // Deprecated: use personDecisions instead
    createPeopleRecords: z.boolean().default(true)
  })
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Parse and validate request
  const body = await readBody(event)
  const { parseId, decisions } = ImportRequestSchema.parse(body)

  // Retrieve the parsed data from KV
  const { kv } = await import('@nuxthub/kv')
  const storedData = await kv.get<{
    parsedData: any
    xmlString: string
    userId: string
    createdAt: string
  }>(`wc_parse:${parseId}`)

  if (!storedData) {
    throw createError({
      statusCode: 400,
      message: 'Parse session expired or not found. Please re-upload the file.'
    })
  }

  const { parsedData: storedParsedData, xmlString } = storedData

  // Convert rawFields back to Map (it was serialized as an object for KV storage)
  const parsedData = {
    ...storedParsedData,
    rawFields: new Map(Object.entries(storedParsedData.rawFields || {}))
  }

  const db = useDrizzle()
  const result: WealthCounselImportResult = {
    success: false,
    peopleCreated: 0,
    clientsCreated: 0,
    rolesCreated: 0,
    errors: []
  }

  try {
    // Step 1: Extract or link people
    const peopleToCreate = extractPeople(parsedData)
    const personLookup = new Map<string, string>()

    // Build decision lookup from personDecisions using utility
    const decisionLookup = decisions.personDecisions
      ? buildDecisionLookup(decisions.personDecisions as PersonMatchDecision[])
      : new Map()

    // Apply legacy clientPersonId/spousePersonId for backward compatibility
    if (decisions.clientPersonId) {
      personLookup.set(parsedData.client.fullName || '', decisions.clientPersonId)
    }
    if (decisions.spousePersonId && parsedData.spouse?.fullName) {
      personLookup.set(parsedData.spouse.fullName, decisions.spousePersonId)
    }

    // Apply personDecisions: add existing person IDs to lookup using utility
    if (decisions.personDecisions) {
      const existingPersonLookup = buildPersonIdLookupFromDecisions(
        decisions.personDecisions as PersonMatchDecision[]
      )
      for (const [name, personId] of existingPersonLookup) {
        personLookup.set(name, personId)
      }
    }

    // Determine whether to use new personDecisions mode or legacy createPeopleRecords mode
    const usePersonDecisions = decisions.personDecisions && decisions.personDecisions.length > 0

    // Create new people records based on decisions
    for (const person of peopleToCreate) {
      const fullName = person.fullName || ''

      // Skip if already in lookup (linked to existing person)
      if (personLookup.has(fullName)) continue

      // Determine if we should create this person using utility
      let shouldCreate = false

      if (usePersonDecisions) {
        // New mode: use shouldCreatePerson utility (defaults to create if no decision)
        shouldCreate = shouldCreatePerson(fullName, decisionLookup, true)
      } else {
        // Legacy mode: use createPeopleRecords flag
        shouldCreate = decisions.createPeopleRecords
      }

      if (shouldCreate) {
        // Insert the person
        await db.insert(schema.people).values({
          id: person.id,
          personType: person.personType,
          firstName: person.firstName,
          lastName: person.lastName,
          middleNames: person.middleNames,
          fullName: person.fullName,
          email: person.email,
          phone: person.phone,
          address: person.address,
          city: person.city,
          state: person.state,
          zipCode: person.zipCode,
          dateOfBirth: person.dateOfBirth,
          ssnLast4: person.ssnLast4,
          notes: person.notes,
          importMetadata: person.importMetadata
        })

        personLookup.set(fullName, person.id)
        result.peopleCreated++
      }
      // Note: If not creating and not linked, roles referencing this person will fail.
      // The UI should ensure all people have either use_existing or create_new decisions.
    }

    // Step 2: Determine client and spouse person IDs
    const clientPersonId = decisions.clientPersonId ||
      personLookup.get(parsedData.client.fullName || '') ||
      peopleToCreate.find(p => p.fullName === parsedData.client.fullName)?.id

    if (!clientPersonId) {
      throw new Error('Could not determine client person ID')
    }

    // Resolve spouse person ID with multiple fallbacks (matching client pattern)
    let spousePersonId = decisions.spousePersonId
    if (!spousePersonId && parsedData.spouse) {
      // Try lookup by full name
      if (parsedData.spouse.fullName) {
        spousePersonId = personLookup.get(parsedData.spouse.fullName)
      }

      // Fallback: find in extracted people by full name
      if (!spousePersonId && parsedData.spouse.fullName) {
        spousePersonId = peopleToCreate.find(p => p.fullName === parsedData.spouse?.fullName)?.id
      }

      // Fallback: find in extracted people by import metadata role
      // This works even if fullName differs between parsedData and transformed person
      if (!spousePersonId) {
        spousePersonId = peopleToCreate.find(p => {
          try {
            const metadata = p.importMetadata ? JSON.parse(p.importMetadata) : {}
            return metadata.role === 'spouse'
          } catch {
            return false
          }
        })?.id
      }
    }

    // Step 2b: Optionally create client records for primary client and spouse (if joint plan)
    // Per the Belly Button Principle, clients need both a person record AND a clients record
    // But not all imported plans are for clients - some may be for reference/archival
    if (decisions.createClientRecords) {
      const clientsToCreate = extractClientsToCreate(parsedData, clientPersonId, spousePersonId)

      for (const clientData of clientsToCreate) {
        // Check if a client record already exists for this person
        const [existingClient] = await db.select()
          .from(schema.clients)
          .where(eq(schema.clients.personId, clientData.personId))

        if (!existingClient) {
          await db.insert(schema.clients).values({
            id: clientData.id,
            personId: clientData.personId,
            status: clientData.status,
            hasMinorChildren: clientData.hasMinorChildren,
            childrenInfo: clientData.childrenInfo,
            hasTrust: clientData.hasTrust,
            hasWill: clientData.hasWill,
            importMetadata: clientData.importMetadata
          })
          result.clientsCreated++
        }
      }
    }

    // Step 3: Create or amend estate plan
    let planId: string
    let versionNumber: number

    if (decisions.isAmendment && decisions.existingPlanId) {
      // Get existing plan
      const [existingPlan] = await db.select()
        .from(schema.estatePlans)
        .where(eq(schema.estatePlans.id, decisions.existingPlanId))

      if (!existingPlan) {
        throw new Error('Existing plan not found')
      }

      planId = decisions.existingPlanId
      versionNumber = existingPlan.currentVersion + 1

      // Update plan
      await db.update(schema.estatePlans)
        .set({
          currentVersion: versionNumber,
          status: 'AMENDED',
          lastAmendedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(schema.estatePlans.id, planId))

    } else {
      // Create new plan
      const { plan, trust, will, version } = transformToEstatePlan(
        parsedData,
        clientPersonId,
        spousePersonId,
        decisions
      )

      planId = plan.id
      versionNumber = 1

      // Insert plan
      await db.insert(schema.estatePlans).values({
        id: plan.id,
        grantorPersonId1: plan.grantorPersonId1,
        grantorPersonId2: plan.grantorPersonId2,
        planType: plan.planType,
        planName: plan.planName,
        currentVersion: plan.currentVersion,
        status: plan.status,
        effectiveDate: plan.effectiveDate,
        wealthCounselClientId: plan.wealthCounselClientId,
        importMetadata: plan.importMetadata
      })

      // Insert trust if present
      if (trust) {
        await db.insert(schema.trusts).values({
          id: trust.id,
          planId: trust.planId,
          trustName: trust.trustName,
          trustType: trust.trustType as any,
          isJoint: trust.isJoint,
          isRevocable: trust.isRevocable,
          jurisdiction: trust.jurisdiction,
          formationDate: trust.formationDate,
          wealthCounselTrustId: trust.wealthCounselTrustId,
          trustSettings: trust.trustSettings
        })
      }

      // Insert will if present
      if (will) {
        await db.insert(schema.wills).values({
          id: will.id,
          planId: will.planId,
          willType: will.willType as any,
          executionDate: will.executionDate,
          jurisdiction: will.jurisdiction,
          codicilCount: will.codicilCount
        })
      }

      // Insert version
      await db.insert(schema.planVersions).values({
        id: version.id,
        planId: version.planId,
        version: version.version,
        changeType: version.changeType,
        changeDescription: version.changeDescription,
        changeSummary: version.changeSummary,
        effectiveDate: version.effectiveDate,
        sourceType: version.sourceType,
        sourceXml: xmlString,
        sourceData: version.sourceData,
        createdBy: user.id
      })

      // Insert creation event
      const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      await db.insert(schema.planEvents).values({
        id: eventId,
        planId,
        eventType: 'PLAN_CREATED',
        eventDate: new Date(),
        description: 'Estate plan imported from WealthCounsel',
        createdBy: user.id
      })
    }

    // Step 4: Create roles
    const roles = transformRoles(parsedData, planId, personLookup, clientPersonId, spousePersonId)

    for (const role of roles) {
      try {
        await db.insert(schema.planRoles).values({
          id: role.id,
          planId: role.planId,
          establishedInVersion: versionNumber,
          personId: role.personId,
          forPersonId: role.forPersonId, // For individual document roles (POA, healthcare, will)
          personSnapshot: role.personSnapshot,
          roleCategory: role.roleCategory as any,
          roleType: role.roleType as any,
          isPrimary: role.isPrimary,
          ordinal: role.ordinal,
          sharePercentage: role.sharePercentage,
          shareType: role.shareType as any,
          status: role.status
        })
        result.rolesCreated++
      } catch (error: any) {
        // Log role creation errors but continue
        result.errors?.push(`Failed to create role: ${error.message}`)
      }
    }

    // Step 5: Link to matter if specified
    if (decisions.linkToMatterId) {
      const relationshipId = `ptm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      await db.insert(schema.planToMatters).values({
        id: relationshipId,
        planId,
        matterId: decisions.linkToMatterId,
        relationshipType: decisions.isAmendment ? 'AMENDMENT' : 'CREATION'
      })
    }

    // Clean up the parse session
    await kv.del(`wc_parse:${parseId}`)

    result.success = true
    result.planId = planId
    result.versionId = `version_${versionNumber}`

    // Get plan name for activity logging
    const planName = parsedData.trust?.name ||
      (parsedData.client.fullName ? `${parsedData.client.fullName} Estate Plan` : 'Estate Plan')

    // Count people linked vs created
    const peopleLinked = decisions.personDecisions
      ? decisions.personDecisions.filter(d => d.action === 'use_existing').length
      : (decisions.clientPersonId ? 1 : 0) + (decisions.spousePersonId ? 1 : 0)

    // Log activity
    await logActivity({
      type: decisions.isAmendment ? 'ESTATE_PLAN_AMENDED' : 'ESTATE_PLAN_IMPORTED',
      userId: user.id,
      userRole: user.role,
      target: { type: 'estate_plan', id: planId, name: planName },
      event,
      details: {
        source: 'WealthCounsel',
        isAmendment: decisions.isAmendment,
        peopleCreated: result.peopleCreated,
        clientsCreated: result.clientsCreated,
        peopleLinked,
        rolesCreated: result.rolesCreated,
        planType: parsedData.planType,
        linkedToMatterId: decisions.linkToMatterId
      }
    })

    return result

  } catch (error: any) {
    result.errors?.push(error.message)
    throw createError({
      statusCode: 500,
      message: `Import failed: ${error.message}`,
      data: result
    })
  }
})
