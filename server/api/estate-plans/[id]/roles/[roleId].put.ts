/**
 * PUT /api/estate-plans/:id/roles/:roleId
 *
 * Update an existing role on an estate plan.
 */

import { useDrizzle, schema } from '../../../../db'
import { eq, and } from 'drizzle-orm'
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

const roleStatusEnum = z.enum(['ACTIVE', 'SUCCEEDED', 'DECLINED', 'DECEASED', 'REMOVED', 'TERMINATED'])

const shareTypeEnum = z.enum([
  'PERCENTAGE', 'SPECIFIC_AMOUNT', 'SPECIFIC_PROPERTY', 'REMAINDER', 'PER_STIRPES', 'PER_CAPITA'
])

// Update schema allows partial updates
const updateRoleSchema = z.object({
  personId: z.string().min(1).optional(),
  roleCategory: roleCategoryEnum.optional(),
  roleType: roleTypeEnum.optional(),
  forPersonId: z.string().nullable().optional(),
  willId: z.string().nullable().optional(),
  ancillaryDocumentId: z.string().nullable().optional(),
  trustId: z.string().nullable().optional(),
  isPrimary: z.boolean().optional(),
  ordinal: z.number().int().min(0).optional(),
  sharePercentage: z.number().int().min(0).max(100).nullable().optional(),
  shareType: shareTypeEnum.nullable().optional(),
  shareAmount: z.number().int().nullable().optional(),
  shareDescription: z.string().nullable().optional(),
  conditions: z.string().nullable().optional(),
  subtrustName: z.string().nullable().optional(),
  status: roleStatusEnum.optional(),
  effectiveDate: z.string().nullable().optional(),
  terminationDate: z.string().nullable().optional(),
  terminationReason: z.string().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const planId = getRouterParam(event, 'id')
  const roleId = getRouterParam(event, 'roleId')

  if (!planId) {
    throw createError({ statusCode: 400, message: 'Plan ID required' })
  }
  if (!roleId) {
    throw createError({ statusCode: 400, message: 'Role ID required' })
  }

  const body = await readBody(event)
  const parsed = updateRoleSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid role data',
      data: parsed.error.flatten()
    })
  }

  const updateData = parsed.data
  const db = useDrizzle()

  // Verify role exists and belongs to this plan
  const [existingRole] = await db.select()
    .from(schema.planRoles)
    .where(and(
      eq(schema.planRoles.id, roleId),
      eq(schema.planRoles.planId, planId)
    ))

  if (!existingRole) {
    throw createError({ statusCode: 404, message: 'Role not found' })
  }

  // Verify new personId exists if being changed
  if (updateData.personId && updateData.personId !== existingRole.personId) {
    const [person] = await db.select()
      .from(schema.people)
      .where(eq(schema.people.id, updateData.personId))

    if (!person) {
      throw createError({ statusCode: 404, message: 'Person not found' })
    }

    // Update person snapshot
    updateData.personSnapshot = JSON.stringify({
      fullName: person.fullName,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      address: person.address,
      snapshotAt: new Date().toISOString()
    }) as any
  }

  // Build update object with only provided fields
  const fieldsToUpdate: Record<string, any> = {
    updatedAt: new Date()
  }

  // Track changed fields for activity logging
  const changedFields: string[] = []

  // Map fields from updateData to database columns
  const fieldMappings: Record<string, string> = {
    personId: 'personId',
    roleCategory: 'roleCategory',
    roleType: 'roleType',
    forPersonId: 'forPersonId',
    willId: 'willId',
    ancillaryDocumentId: 'ancillaryDocumentId',
    trustId: 'trustId',
    isPrimary: 'isPrimary',
    ordinal: 'ordinal',
    sharePercentage: 'sharePercentage',
    shareType: 'shareType',
    shareAmount: 'shareAmount',
    shareDescription: 'shareDescription',
    conditions: 'conditions',
    subtrustName: 'subtrustName',
    status: 'status',
    terminationReason: 'terminationReason'
  }

  for (const [key, dbField] of Object.entries(fieldMappings)) {
    if (key in updateData) {
      const value = updateData[key as keyof typeof updateData]
      fieldsToUpdate[dbField] = value
      changedFields.push(key)
    }
  }

  // Handle date fields
  if ('effectiveDate' in updateData) {
    fieldsToUpdate.effectiveDate = updateData.effectiveDate ? new Date(updateData.effectiveDate) : null
    changedFields.push('effectiveDate')
  }

  if ('terminationDate' in updateData) {
    fieldsToUpdate.terminationDate = updateData.terminationDate ? new Date(updateData.terminationDate) : null
    changedFields.push('terminationDate')
  }

  // Include person snapshot if it was updated
  if ('personSnapshot' in updateData) {
    fieldsToUpdate.personSnapshot = updateData.personSnapshot
  }

  // Perform the update
  await db.update(schema.planRoles)
    .set(fieldsToUpdate)
    .where(eq(schema.planRoles.id, roleId))

  // Log activity
  const planName = await resolveEntityName('estate_plan', planId)

  await logActivity({
    type: 'ESTATE_PLAN_UPDATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'estate_plan', id: planId, name: planName || 'Estate Plan' },
    event,
    details: {
      action: 'ROLE_UPDATED',
      roleId,
      roleType: updateData.roleType || existingRole.roleType,
      changes: changedFields
    }
  })

  // Fetch and return the updated role
  const [updatedRole] = await db.select({
    role: schema.planRoles,
    person: schema.people
  })
    .from(schema.planRoles)
    .leftJoin(schema.people, eq(schema.planRoles.personId, schema.people.id))
    .where(eq(schema.planRoles.id, roleId))

  return {
    success: true,
    role: {
      id: updatedRole.role.id,
      planId: updatedRole.role.planId,
      personId: updatedRole.role.personId,
      person: updatedRole.person ? {
        id: updatedRole.person.id,
        fullName: updatedRole.person.fullName,
        firstName: updatedRole.person.firstName,
        lastName: updatedRole.person.lastName,
        email: updatedRole.person.email
      } : null,
      forPersonId: updatedRole.role.forPersonId,
      willId: updatedRole.role.willId,
      ancillaryDocumentId: updatedRole.role.ancillaryDocumentId,
      trustId: updatedRole.role.trustId,
      roleCategory: updatedRole.role.roleCategory,
      roleType: updatedRole.role.roleType,
      isPrimary: updatedRole.role.isPrimary,
      ordinal: updatedRole.role.ordinal,
      sharePercentage: updatedRole.role.sharePercentage,
      shareType: updatedRole.role.shareType,
      shareAmount: updatedRole.role.shareAmount,
      shareDescription: updatedRole.role.shareDescription,
      conditions: updatedRole.role.conditions,
      subtrustName: updatedRole.role.subtrustName,
      status: updatedRole.role.status,
      effectiveDate: updatedRole.role.effectiveDate,
      terminationDate: updatedRole.role.terminationDate,
      terminationReason: updatedRole.role.terminationReason,
      updatedAt: updatedRole.role.updatedAt
    }
  }
})
