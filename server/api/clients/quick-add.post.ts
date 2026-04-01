import { z } from 'zod'
import { nanoid } from 'nanoid'
import { useDrizzle, schema } from '../../db'
import { requireRole } from '../../utils/rbac'
import { logActivity } from '../../utils/activity-logger'

const quickAddClientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  // If a person was already created (e.g., via PeopleQuickAddPerson), pass their ID to avoid duplicates
  personId: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const body = await readBody(event)
  const parsed = quickAddClientSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message || 'Invalid input'
    })
  }

  const { firstName, lastName, email, phone, personId: existingPersonId } = parsed.data
  const db = useDrizzle()
  const personId = existingPersonId || nanoid()
  const clientId = nanoid()
  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  // Create person record only if one wasn't already provided
  if (!existingPersonId) {
    await db.insert(schema.people).values({
      id: personId,
      firstName,
      lastName: lastName || null,
      fullName,
      email: email || null,
      phone: phone || null
    })
  }

  // Create client record linked to person
  await db.insert(schema.clients).values({
    id: clientId,
    personId,
    status: 'PROSPECTIVE'
  })

  await logActivity({
    type: 'CLIENT_CREATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'client', id: clientId, name: fullName },
    event,
    details: { source: 'quick-add' }
  })

  return {
    success: true,
    client: {
      id: clientId,
      personId,
      firstName,
      lastName: lastName || null,
      fullName,
      email: email || null,
      phone: phone || null,
      status: 'PROSPECTIVE'
    }
  }
})
