// Start impersonating a client user
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'
import { logActivity } from '../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['ADMIN', 'LAWYER', 'STAFF'])

  const body = await readBody(event)
  if (!body.userId) {
    throw createError({ statusCode: 400, message: 'userId is required' })
  }

  const db = useDrizzle()

  // Validate target user exists, is a CLIENT, and is ACTIVE
  const targetUser = await db.select({
    id: schema.users.id,
    personId: schema.users.personId,
    email: schema.users.email,
    role: schema.users.role,
    firstName: schema.users.firstName,
    lastName: schema.users.lastName,
    status: schema.users.status
  })
    .from(schema.users)
    .where(eq(schema.users.id, body.userId))
    .get()

  if (!targetUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }
  if (targetUser.role !== 'CLIENT') {
    throw createError({ statusCode: 400, message: 'Can only impersonate CLIENT users' })
  }
  if (targetUser.status === 'INACTIVE') {
    throw createError({ statusCode: 400, message: 'Cannot impersonate an inactive user' })
  }

  // Resolve name from person record if available
  let firstName = targetUser.firstName
  let lastName = targetUser.lastName
  if (targetUser.personId) {
    const person = await db.select({
      firstName: schema.people.firstName,
      lastName: schema.people.lastName
    })
      .from(schema.people)
      .where(eq(schema.people.id, targetUser.personId))
      .get()
    if (person) {
      firstName = person.firstName || firstName
      lastName = person.lastName || lastName
    }
  }

  // Get current session and add impersonation data
  const session = await getUserSession(event)
  await setUserSession(event, {
    ...session,
    impersonating: {
      userId: targetUser.id,
      personId: targetUser.personId || null,
      email: targetUser.email,
      role: targetUser.role,
      firstName,
      lastName,
      startedAt: new Date()
    }
  })

  await logActivity({
    type: 'USER_IMPERSONATION_STARTED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'user', id: targetUser.id, name: `${firstName} ${lastName}` },
    event,
    details: {
      impersonatedUserId: targetUser.id,
      impersonatedEmail: targetUser.email
    }
  })

  return {
    success: true,
    impersonating: {
      userId: targetUser.id,
      firstName,
      lastName,
      email: targetUser.email
    }
  }
})
