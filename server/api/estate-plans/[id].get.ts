/**
 * GET /api/estate-plans/:id
 *
 * Get a single estate plan with all related data.
 * Supports joint plans with multiple wills and ancillary documents.
 */

import { useDrizzle, schema } from '../../db'
import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const planId = getRouterParam(event, 'id')
  if (!planId) {
    throw createError({ statusCode: 400, message: 'Plan ID required' })
  }

  const db = useDrizzle()

  // Get the plan
  const [planRow] = await db.select()
    .from(schema.estatePlans)
    .where(eq(schema.estatePlans.id, planId))

  if (!planRow) {
    throw createError({ statusCode: 404, message: 'Estate plan not found' })
  }

  // Get first grantor
  const [grantor1] = await db.select()
    .from(schema.people)
    .where(eq(schema.people.id, planRow.grantorPersonId1))

  // Get second grantor if present (joint plan)
  let grantor2 = null
  if (planRow.grantorPersonId2) {
    const [g2] = await db.select()
      .from(schema.people)
      .where(eq(schema.people.id, planRow.grantorPersonId2))
    grantor2 = g2 || null
  }

  // Get trust if present
  const [trust] = await db.select()
    .from(schema.trusts)
    .where(eq(schema.trusts.planId, planId))

  // Get ALL wills (joint plans can have multiple)
  const wills = await db.select()
    .from(schema.wills)
    .where(eq(schema.wills.planId, planId))

  // Get ancillary documents (POAs, healthcare directives, etc.)
  const ancillaryDocuments = await db.select()
    .from(schema.ancillaryDocuments)
    .where(eq(schema.ancillaryDocuments.planId, planId))

  // Get all roles with person data
  const rolesData = await db.select({
    role: schema.planRoles,
    person: schema.people
  })
    .from(schema.planRoles)
    .leftJoin(schema.people, eq(schema.planRoles.personId, schema.people.id))
    .where(eq(schema.planRoles.planId, planId))

  // Build a map of forPersonId -> person for roles
  const forPersonIds = [...new Set(rolesData
    .filter(r => r.role.forPersonId)
    .map(r => r.role.forPersonId!))]

  const forPersonMap = new Map<string, any>()
  if (forPersonIds.length > 0) {
    for (const fpId of forPersonIds) {
      const [forPerson] = await db.select()
        .from(schema.people)
        .where(eq(schema.people.id, fpId))
      if (forPerson) {
        forPersonMap.set(fpId, forPerson)
      }
    }
  }

  // Get versions
  const versions = await db.select()
    .from(schema.planVersions)
    .where(eq(schema.planVersions.planId, planId))
    .orderBy(schema.planVersions.version)

  // Get events (most recent first)
  const events = await db.select()
    .from(schema.planEvents)
    .where(eq(schema.planEvents.planId, planId))
    .orderBy(desc(schema.planEvents.eventDate))

  // Get linked matters
  const matterLinks = await db.select({
    link: schema.planToMatters,
    matter: schema.matters
  })
    .from(schema.planToMatters)
    .leftJoin(schema.matters, eq(schema.planToMatters.matterId, schema.matters.id))
    .where(eq(schema.planToMatters.planId, planId))

  // Format person helper
  const formatPerson = (person: any) => person ? {
    id: person.id,
    fullName: person.fullName,
    firstName: person.firstName,
    lastName: person.lastName,
    email: person.email,
    phone: person.phone,
    address: person.address,
    city: person.city,
    state: person.state,
    zipCode: person.zipCode,
    dateOfBirth: person.dateOfBirth
  } : null

  return {
    id: planRow.id,
    planType: planRow.planType,
    planName: planRow.planName,
    currentVersion: planRow.currentVersion,
    status: planRow.status,
    effectiveDate: planRow.effectiveDate,
    lastAmendedAt: planRow.lastAmendedAt,
    administrationStartedAt: planRow.administrationStartedAt,
    closedAt: planRow.closedAt,
    wealthCounselClientId: planRow.wealthCounselClientId,
    createdAt: planRow.createdAt,
    updatedAt: planRow.updatedAt,

    grantor1: formatPerson(grantor1),

    grantor2: grantor2 ? {
      id: grantor2.id,
      fullName: grantor2.fullName,
      firstName: grantor2.firstName,
      lastName: grantor2.lastName,
      email: grantor2.email,
      phone: grantor2.phone
    } : null,

    trust: trust ? {
      id: trust.id,
      trustName: trust.trustName,
      trustType: trust.trustType,
      isJoint: trust.isJoint,
      isRevocable: trust.isRevocable,
      jurisdiction: trust.jurisdiction,
      formationDate: trust.formationDate,
      fundingDate: trust.fundingDate
    } : null,

    // Array of wills (for joint plans)
    wills: wills.map(w => ({
      id: w.id,
      personId: w.personId,
      willType: w.willType,
      executionDate: w.executionDate,
      jurisdiction: w.jurisdiction,
      codicilCount: w.codicilCount,
      probateStatus: w.probateStatus,
      probateFiledAt: w.probateFiledAt,
      probateCaseNumber: w.probateCaseNumber
    })),

    // Ancillary documents (POAs, healthcare directives, etc.)
    ancillaryDocuments: ancillaryDocuments.map(doc => ({
      id: doc.id,
      personId: doc.personId,
      documentType: doc.documentType,
      executionDate: doc.executionDate,
      jurisdiction: doc.jurisdiction,
      status: doc.status
    })),

    roles: rolesData.map(({ role, person }) => {
      const forPerson = role.forPersonId ? forPersonMap.get(role.forPersonId) : null
      return {
        id: role.id,
        personId: role.personId,
        person: person ? {
          id: person.id,
          fullName: person.fullName,
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email
        } : null,
        // Joint plan support
        forPersonId: role.forPersonId,
        forPerson: forPerson ? {
          id: forPerson.id,
          fullName: forPerson.fullName,
          firstName: forPerson.firstName,
          lastName: forPerson.lastName
        } : null,
        willId: role.willId,
        ancillaryDocumentId: role.ancillaryDocumentId,
        // Standard fields
        roleCategory: role.roleCategory,
        roleType: role.roleType,
        isPrimary: role.isPrimary,
        ordinal: role.ordinal,
        sharePercentage: role.sharePercentage,
        shareType: role.shareType,
        conditions: role.conditions,
        subtrustName: role.subtrustName,
        status: role.status,
        effectiveDate: role.effectiveDate,
        terminationDate: role.terminationDate
      }
    }),

    versions: versions.map(v => ({
      id: v.id,
      version: v.version,
      changeType: v.changeType,
      changeDescription: v.changeDescription,
      changeSummary: v.changeSummary,
      effectiveDate: v.effectiveDate,
      sourceType: v.sourceType,
      createdAt: v.createdAt
    })),

    events: events.map(e => ({
      id: e.id,
      eventType: e.eventType,
      eventDate: e.eventDate,
      description: e.description,
      notes: e.notes,
      distributionAmount: e.distributionAmount,
      distributionDescription: e.distributionDescription,
      createdAt: e.createdAt
    })),

    linkedMatters: matterLinks.map(({ link, matter }) => ({
      linkId: link.id,
      relationshipType: link.relationshipType,
      matter: matter ? {
        id: matter.id,
        title: matter.title,
        matterNumber: matter.matterNumber,
        status: matter.status
      } : null
    }))
  }
})
