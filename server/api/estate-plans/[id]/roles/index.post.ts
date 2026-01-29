/**
 * POST /api/estate-plans/:id/roles
 *
 * Add a new role to an estate plan.
 */

import { useDrizzle, schema } from '../../../../db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logActivity } from '../../../../utils/activity-logger'
import { resolveEntityName } from '../../../../utils/entity-resolver'

// Role type enum matching schema
const roleTypeEnum = z.enum([
  // Grantors/Settlors
  'GRANTOR', 'TESTATOR',
  // Trustees
  'TRUSTEE', 'CO_TRUSTEE', 'SUCCESSOR_TRUSTEE', 'DISTRIBUTION_TRUSTEE',
  // Beneficiaries
  'PRIMARY_BENEFICIARY', 'CONTINGENT_BENEFICIARY', 'REMAINDER_BENEFICIARY',
  'INCOME_BENEFICIARY', 'PRINCIPAL_BENEFICIARY',
  // Will-specific
  'EXECUTOR', 'CO_EXECUTOR', 'ALTERNATE_EXECUTOR',
  // Powers of Attorney
  'FINANCIAL_AGENT', 'ALTERNATE_FINANCIAL_AGENT',
  'HEALTHCARE_AGENT', 'ALTERNATE_HEALTHCARE_AGENT',
  // Guardians
  'GUARDIAN_OF_PERSON', 'GUARDIAN_OF_ESTATE',
  'ALTERNATE_GUARDIAN_OF_PERSON', 'ALTERNATE_GUARDIAN_OF_ESTATE',
  // Other fiduciaries
  'TRUST_PROTECTOR', 'INVESTMENT_ADVISOR',
  // Witnesses/Notary
  'WITNESS', 'NOTARY'
])

const roleCategoryEnum = z.enum(['GRANTOR', 'FIDUCIARY', 'BENEFICIARY', 'GUARDIAN', 'OTHER'])

const shareTypeEnum = z.enum([
  'PERCENTAGE', 'SPECIFIC_AMOUNT', 'SPECIFIC_PROPERTY', 'REMAINDER', 'PER_STIRPES', 'PER_CAPITA'
])

const createRoleSchema = z.object({
  personId: z.string().min(1),
  roleCategory: roleCategoryEnum,
  roleType: roleTypeEnum,
  // Optional fields
  forPersonId: z.string().optional(),
  willId: z.string().optional(),
  ancillaryDocumentId: z.string().optional(),
  trustId: z.string().optional(),
  isPrimary: z.boolean().optional(),
  ordinal: z.number().int().min(0).optional(),
  sharePercentage: z.number().int().min(0).max(100).optional(),
  shareType: shareTypeEnum.optional(),
  shareAmount: z.number().int().optional(),
  shareDescription: z.string().optional(),
  conditions: z.string().optional(),
  subtrustName: z.string().optional(),
  effectiveDate: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const planId = getRouterParam(event, 'id')
  if (!planId) {
    throw createError({ statusCode: 400, message: 'Plan ID required' })
  }

  const body = await readBody(event)
  const parsed = createRoleSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid role data',
      data: parsed.error.flatten()
    })
  }

  const roleData = parsed.data
  const db = useDrizzle()

  // Verify plan exists
  const [plan] = await db.select()
    .from(schema.estatePlans)
    .where(eq(schema.estatePlans.id, planId))

  if (!plan) {
    throw createError({ statusCode: 404, message: 'Estate plan not found' })
  }

  // Verify person exists
  const [person] = await db.select()
    .from(schema.people)
    .where(eq(schema.people.id, roleData.personId))

  if (!person) {
    throw createError({ statusCode: 404, message: 'Person not found' })
  }

  // Verify forPersonId exists if provided
  if (roleData.forPersonId) {
    const [forPerson] = await db.select()
      .from(schema.people)
      .where(eq(schema.people.id, roleData.forPersonId))

    if (!forPerson) {
      throw createError({ statusCode: 404, message: 'forPersonId person not found' })
    }
  }

  // Generate role ID
  const roleId = `role_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  // Create person snapshot for historical accuracy
  const personSnapshot = JSON.stringify({
    fullName: person.fullName,
    firstName: person.firstName,
    lastName: person.lastName,
    email: person.email,
    address: person.address,
    snapshotAt: new Date().toISOString()
  })

  // Insert the role
  await db.insert(schema.planRoles).values({
    id: roleId,
    planId,
    establishedInVersion: plan.currentVersion,
    personId: roleData.personId,
    forPersonId: roleData.forPersonId || null,
    willId: roleData.willId || null,
    ancillaryDocumentId: roleData.ancillaryDocumentId || null,
    trustId: roleData.trustId || null,
    personSnapshot,
    roleCategory: roleData.roleCategory,
    roleType: roleData.roleType,
    isPrimary: roleData.isPrimary ?? false,
    ordinal: roleData.ordinal ?? 0,
    sharePercentage: roleData.sharePercentage || null,
    shareType: roleData.shareType || null,
    shareAmount: roleData.shareAmount || null,
    shareDescription: roleData.shareDescription || null,
    conditions: roleData.conditions || null,
    subtrustName: roleData.subtrustName || null,
    status: 'ACTIVE',
    effectiveDate: roleData.effectiveDate ? new Date(roleData.effectiveDate) : new Date()
  })

  // Log activity
  const planName = await resolveEntityName('estate_plan', planId)
  const personName = person.fullName || [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Unknown'

  await logActivity({
    type: 'ESTATE_PLAN_UPDATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'estate_plan', id: planId, name: planName || 'Estate Plan' },
    relatedEntities: [
      { type: 'person', id: roleData.personId, name: personName }
    ],
    event,
    details: {
      action: 'ROLE_ADDED',
      roleId,
      roleType: roleData.roleType,
      roleCategory: roleData.roleCategory,
      personId: roleData.personId,
      personName
    }
  })

  // Return the created role
  return {
    success: true,
    role: {
      id: roleId,
      planId,
      personId: roleData.personId,
      person: {
        id: person.id,
        fullName: person.fullName,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email
      },
      forPersonId: roleData.forPersonId,
      willId: roleData.willId,
      ancillaryDocumentId: roleData.ancillaryDocumentId,
      trustId: roleData.trustId,
      roleCategory: roleData.roleCategory,
      roleType: roleData.roleType,
      isPrimary: roleData.isPrimary ?? false,
      ordinal: roleData.ordinal ?? 0,
      sharePercentage: roleData.sharePercentage,
      shareType: roleData.shareType,
      shareAmount: roleData.shareAmount,
      shareDescription: roleData.shareDescription,
      conditions: roleData.conditions,
      subtrustName: roleData.subtrustName,
      status: 'ACTIVE',
      effectiveDate: roleData.effectiveDate || new Date().toISOString()
    }
  }
})
