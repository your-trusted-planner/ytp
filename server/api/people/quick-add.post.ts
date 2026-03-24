import { z } from 'zod'
import { nanoid } from 'nanoid'
import { useDrizzle, schema } from '../../db'
import { logActivity } from '../../utils/activity-logger'

const quickAddSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const body = await readBody(event)
  const parsed = quickAddSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message || 'Invalid input'
    })
  }

  const { firstName, lastName, email, phone } = parsed.data
  const db = useDrizzle()
  const personId = nanoid()
  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  await db.insert(schema.people).values({
    id: personId,
    firstName,
    lastName: lastName || null,
    fullName,
    email: email || null,
    phone: phone || null
  })

  await logActivity({
    type: 'PERSON_CREATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'person', id: personId, name: fullName },
    event,
    details: { source: 'quick-add' }
  })

  return {
    success: true,
    person: {
      id: personId,
      firstName,
      lastName: lastName || null,
      fullName,
      email: email || null,
      phone: phone || null
    }
  }
})
