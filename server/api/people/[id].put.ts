import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'
import { markFieldsAsLocallyModified } from '../../utils/sync-metadata'
import { storeSensitiveField } from '../../utils/sensitive-fields'

// Fields that can be tracked for sync conflict protection
const TRACKABLE_PERSON_FIELDS = [
  'firstName', 'lastName', 'email', 'phone',
  'address', 'address2', 'city', 'state', 'zipCode', 'country',
  'dateOfBirth', 'tinLast4', 'notes'
]

// Update a person
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const personId = getRouterParam(event, 'id')
  if (!personId) {
    throw createError({ statusCode: 400, message: 'Person ID required' })
  }

  const body = await readBody(event)
  const db = useDrizzle()

  // Check if person exists
  const existing = await db.select().from(schema.people).where(eq(schema.people.id, personId)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Person not found' })
  }

  const personType = existing.personType

  // Encrypt TIN if provided (a new full TIN value)
  let tinEncrypted = existing.tinEncrypted
  let tinLast4 = existing.tinLast4
  if (body.tin && typeof body.tin === 'string' && body.tin.trim()) {
    const result = await storeSensitiveField(event, 'tin', body.tin)
    tinEncrypted = result.encrypted
    tinLast4 = result.display
  }

  // Compute fullName based on personType
  let fullName: string
  if (personType === 'individual') {
    const firstName = body.firstName ?? existing.firstName
    const lastName = body.lastName ?? existing.lastName
    const middleNames = body.middleNames ?? (existing as any).middleNames
    const nameParts = [firstName]
    if (middleNames && Array.isArray(middleNames) && middleNames.length > 0) {
      nameParts.push(...middleNames)
    }
    if (lastName) nameParts.push(lastName)
    fullName = nameParts.filter(Boolean).join(' ')
  }
  else {
    // Trust or entity — fullName is entered directly
    fullName = body.fullName ?? existing.fullName ?? ''
  }

  // Build people update
  const updateData: Record<string, any> = {
    fullName,
    email: body.email ?? existing.email,
    phone: body.phone ?? existing.phone,
    address: body.address ?? existing.address,
    address2: body.address2 ?? existing.address2,
    city: body.city ?? existing.city,
    state: body.state ?? existing.state,
    zipCode: body.zipCode ?? existing.zipCode,
    country: body.country ?? existing.country,
    notes: body.notes ?? existing.notes,
    tinEncrypted,
    tinLast4,
    updatedAt: new Date()
  }

  // Individual-specific fields
  if (personType === 'individual') {
    updateData.firstName = body.firstName ?? existing.firstName
    updateData.lastName = body.lastName ?? existing.lastName
    updateData.middleNames = body.middleNames ?? (existing as any).middleNames ?? []
    updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : existing.dateOfBirth
    updateData.maritalStatus = body.maritalStatus ?? existing.maritalStatus
  }

  await db.update(schema.people).set(updateData).where(eq(schema.people.id, personId))

  // Upsert detail table if trust- or entity-specific fields provided
  if (personType === 'trust') {
    const trustFields: Record<string, any> = {}
    if (body.trustType !== undefined) trustFields.trustType = body.trustType
    if (body.isRevocable !== undefined) trustFields.isRevocable = body.isRevocable
    if (body.isJoint !== undefined) trustFields.isJoint = body.isJoint
    if (body.jurisdiction !== undefined) trustFields.jurisdiction = body.jurisdiction
    if (body.formationDate !== undefined) trustFields.formationDate = body.formationDate ? new Date(body.formationDate) : null
    if (body.fullName !== undefined) trustFields.trustName = body.fullName

    if (Object.keys(trustFields).length > 0) {
      trustFields.updatedAt = new Date()
      // Check if trust detail record exists — create if missing
      const existingTrust = await db.select({ id: schema.trusts.id })
        .from(schema.trusts)
        .where(eq(schema.trusts.personId, personId))
        .get()

      if (existingTrust) {
        await db.update(schema.trusts)
          .set(trustFields)
          .where(eq(schema.trusts.personId, personId))
      }
      else {
        const { nanoid } = await import('nanoid')
        await db.insert(schema.trusts).values({
          id: nanoid(),
          personId,
          trustName: fullName,
          ...trustFields
        } as any)
      }
    }
  }
  else if (personType === 'entity') {
    const entityFields: Record<string, any> = {}
    if (body.entityType !== undefined) entityFields.entityType = body.entityType
    if (body.jurisdiction !== undefined) entityFields.jurisdiction = body.jurisdiction
    if (body.formationDate !== undefined) entityFields.formationDate = body.formationDate ? new Date(body.formationDate) : null
    if (body.stateFileNumber !== undefined) entityFields.stateFileNumber = body.stateFileNumber
    if (body.managementType !== undefined) entityFields.managementType = body.managementType

    if (Object.keys(entityFields).length > 0) {
      entityFields.updatedAt = new Date()
      // Check if entity detail record exists — create if missing
      const existingEntity = await db.select({ id: schema.entities.id })
        .from(schema.entities)
        .where(eq(schema.entities.personId, personId))
        .get()

      if (existingEntity) {
        await db.update(schema.entities)
          .set(entityFields)
          .where(eq(schema.entities.personId, personId))
      }
      else {
        const { nanoid } = await import('nanoid')
        await db.insert(schema.entities).values({
          id: nanoid(),
          personId,
          ...entityFields
        } as any)
      }
    }
  }

  // Track locally modified fields for sync protection (non-blocking)
  try {
    await markFieldsAsLocallyModified(
      'people',
      personId,
      existing as Record<string, any>,
      updateData,
      TRACKABLE_PERSON_FIELDS
    )
  }
  catch (err) {
    console.error('[People PUT] Failed to track locally modified fields:', err)
  }

  return {
    success: true,
    person: {
      id: personId,
      personType,
      ...updateData,
      dateOfBirth: updateData.dateOfBirth || null,
      // Never return encrypted TIN
      tinEncrypted: undefined
    }
  }
})
