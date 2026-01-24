import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { verifyFirebaseIdToken } from '../../utils/firebase-admin'

const firebaseAuthSchema = z.object({
  idToken: z.string().min(1, 'ID token is required')
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Validate input
  const result = firebaseAuthSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input: ID token is required'
    })
  }

  const { idToken } = result.data

  // Verify Firebase ID token
  const decodedToken = await verifyFirebaseIdToken(idToken)

  if (!decodedToken) {
    throw createError({
      statusCode: 401,
      message: 'Invalid or expired token'
    })
  }

  const { email, uid: firebaseUid, name, picture } = decodedToken

  if (!email) {
    throw createError({
      statusCode: 400,
      message: 'Email is required for authentication'
    })
  }

  // Get database access
  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Look up user by email (link accounts by email)
  let user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .get()

  if (user) {
    // User exists - check if account is active
    if (user.status === 'INACTIVE') {
      throw createError({
        statusCode: 403,
        message: 'Your account has been disabled. Please contact support.',
        data: { reason: 'disabled' }
      })
    }

    // Link Firebase UID if not already linked
    if (!user.firebaseUid) {
      await db
        .update(schema.users)
        .set({
          firebaseUid,
          updatedAt: new Date()
        })
        .where(eq(schema.users.id, user.id))

      console.log(`[Firebase Auth] Linked Firebase UID to existing user: ${email}`)
    }
  } else {
    // Create new user with linked person record (Belly Button Principle)
    const userId = crypto.randomUUID()
    const personId = `person_${userId}`

    // Extract name parts from Firebase profile
    let firstName = null
    let lastName = null
    if (name) {
      const nameParts = name.split(' ')
      firstName = nameParts[0] || null
      lastName = nameParts.slice(1).join(' ') || null
    }

    const now = new Date()

    // First create the person record
    await db.insert(schema.people).values({
      id: personId,
      personType: 'individual',
      firstName,
      lastName,
      fullName: name || null,
      email,
      createdAt: now,
      updatedAt: now
    })

    // Then create the user record linked to the person
    await db.insert(schema.users).values({
      id: userId,
      personId, // Link to person identity
      email,
      password: null, // OAuth-only user
      firebaseUid,
      role: 'PROSPECT',
      status: 'PROSPECT',
      firstName,
      lastName,
      avatar: picture || null,
      createdAt: now,
      updatedAt: now
    })

    // Fetch the newly created user
    user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .get()

    console.log(`[Firebase Auth] Created new user with person record via OAuth: ${email}`)
  }

  if (!user) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create or retrieve user'
    })
  }

  // Fetch person data if user has a linked personId (Belly Button Principle)
  let personData = null
  if (user.personId) {
    personData = await db
      .select({
        id: schema.people.id,
        firstName: schema.people.firstName,
        lastName: schema.people.lastName,
        fullName: schema.people.fullName
      })
      .from(schema.people)
      .where(eq(schema.people.id, user.personId))
      .get()
  }

  // Use person data for name if available, otherwise fall back to user data
  const sessionFirstName = personData?.firstName || user.firstName
  const sessionLastName = personData?.lastName || user.lastName

  // Create session using nuxt-auth-utils
  await setUserSession(event, {
    user: {
      id: user.id,
      personId: user.personId || null, // Include personId in session
      email: user.email,
      role: user.role,
      adminLevel: user.adminLevel || 0,
      firstName: sessionFirstName,
      lastName: sessionLastName
    },
    loggedInAt: new Date()
  })

  // Return user data (without password)
  const { password: _, ...userWithoutPassword } = user

  return {
    success: true,
    user: userWithoutPassword
  }
})
