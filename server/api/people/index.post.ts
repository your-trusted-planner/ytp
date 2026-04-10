import { nanoid } from 'nanoid'
import { z } from 'zod'
import { useDrizzle, schema } from '../../db'
import { logActivity } from '../../utils/activity-logger'
import { storeSensitiveField } from '../../utils/sensitive-fields'

const individualSchema = z.object({
  personType: z.literal('individual').default('individual'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  middleNames: z.array(z.string()).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  dateOfBirth: z.string().optional(),
  maritalStatus: z.string().optional(),
  tin: z.string().optional(), // Full SSN — will be encrypted
  notes: z.string().optional()
})

const trustSchema = z.object({
  personType: z.literal('trust'),
  fullName: z.string().min(1, 'Trust name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  tin: z.string().optional(), // Full EIN — will be encrypted (optional: grantor trusts use grantor's TIN)
  notes: z.string().optional(),
  // Trust-specific fields → trusts table
  trustType: z.string().optional(),
  isRevocable: z.boolean().optional(),
  isJoint: z.boolean().optional(),
  jurisdiction: z.string().optional(),
  formationDate: z.string().optional()
})

const entitySchema = z.object({
  personType: z.literal('entity'),
  fullName: z.string().min(1, 'Entity name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  tin: z.string().optional(), // Full EIN — will be encrypted
  notes: z.string().optional(),
  // Entity-specific fields → entities table
  entityType: z.string().optional(),
  jurisdiction: z.string().optional(),
  formationDate: z.string().optional(),
  stateFileNumber: z.string().optional(),
  managementType: z.string().optional()
})

const createPersonSchema = z.discriminatedUnion('personType', [
  individualSchema,
  trustSchema,
  entitySchema
])

// Create a new person, trust, or entity
export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const body = await readBody(event)
  const parsed = createPersonSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation error',
      data: parsed.error.flatten()
    })
  }

  const data = parsed.data
  const db = useDrizzle()
  const personId = nanoid()
  const now = new Date()

  // Encrypt TIN if provided
  let tinEncrypted: string | null = null
  let tinLast4: string | null = null
  if (data.tin) {
    const result = await storeSensitiveField(event, 'tin', data.tin)
    tinEncrypted = result.encrypted
    tinLast4 = result.display
  }

  // Compute fullName
  let fullName: string
  if (data.personType === 'individual') {
    const nameParts = [data.firstName]
    if (data.middleNames?.length) nameParts.push(...data.middleNames)
    if (data.lastName) nameParts.push(data.lastName)
    fullName = nameParts.filter(Boolean).join(' ')
  }
  else {
    fullName = data.fullName
  }

  // Insert people record
  await db.insert(schema.people).values({
    id: personId,
    personType: data.personType,
    firstName: data.personType === 'individual' ? data.firstName || null : null,
    lastName: data.personType === 'individual' ? (data as any).lastName || null : null,
    middleNames: data.personType === 'individual' ? (data as any).middleNames || [] : [],
    fullName,
    email: data.email || null,
    phone: data.phone || null,
    address: data.address || null,
    address2: data.address2 || null,
    city: data.city || null,
    state: data.state || null,
    zipCode: data.zipCode || null,
    country: data.country || null,
    dateOfBirth: data.personType === 'individual' && (data as any).dateOfBirth
      ? new Date((data as any).dateOfBirth) : null,
    maritalStatus: data.personType === 'individual' ? (data as any).maritalStatus || null : null,
    tinEncrypted,
    tinLast4,
    notes: data.notes || null,
    createdAt: now,
    updatedAt: now
  })

  // Insert detail record for trust or entity
  let trustRecord = null
  let entityRecord = null

  if (data.personType === 'trust') {
    const trustId = nanoid()
    const trustValues: Record<string, any> = {
      id: trustId,
      personId,
      trustName: fullName,
      createdAt: now,
      updatedAt: now
    }
    if (data.trustType) trustValues.trustType = data.trustType
    if (data.isRevocable !== undefined) trustValues.isRevocable = data.isRevocable
    if (data.isJoint !== undefined) trustValues.isJoint = data.isJoint
    if (data.jurisdiction) trustValues.jurisdiction = data.jurisdiction
    if (data.formationDate) trustValues.formationDate = new Date(data.formationDate)

    await db.insert(schema.trusts).values(trustValues as any)
    trustRecord = trustValues
  }
  else if (data.personType === 'entity') {
    const entityId = nanoid()
    const entityValues: Record<string, any> = {
      id: entityId,
      personId,
      createdAt: now,
      updatedAt: now
    }
    if (data.entityType) entityValues.entityType = data.entityType
    if (data.jurisdiction) entityValues.jurisdiction = data.jurisdiction
    if (data.formationDate) entityValues.formationDate = new Date(data.formationDate)
    if (data.stateFileNumber) entityValues.stateFileNumber = data.stateFileNumber
    if (data.managementType) entityValues.managementType = data.managementType

    await db.insert(schema.entities).values(entityValues as any)
    entityRecord = entityValues
  }

  // Log activity
  await logActivity({
    type: 'PERSON_CREATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'person', id: personId, name: fullName },
    event,
    details: { personType: data.personType }
  })

  return {
    success: true,
    person: {
      id: personId,
      personType: data.personType,
      fullName,
      tinLast4,
      createdAt: now,
      updatedAt: now
    },
    trust: trustRecord,
    entity: entityRecord
  }
})
