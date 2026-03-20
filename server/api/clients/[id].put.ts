// Update a client by ID
import { markFieldsAsLocallyModified } from '../../utils/sync-metadata'

const TRACKABLE_CLIENT_FIELDS = [
  'firstName', 'lastName', 'email', 'phone',
  'address', 'city', 'state', 'zipCode'
]

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const clientId = getRouterParam(event, 'id')

  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID is required'
    })
  }

  const body = await readBody(event)
  const { first_name, last_name, email, phone, status, address, city, state, zip_code } = body

  if (!first_name || !last_name || !email) {
    throw createError({
      statusCode: 400,
      message: 'First name, last name, and email are required'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq, and } = await import('drizzle-orm')
  const { resolveClientIds } = await import('../../utils/client-ids')
  const db = useDrizzle()

  // URL param is clients.id — resolve to get person and user IDs
  const resolved = await resolveClientIds(clientId)

  if (!resolved) {
    throw createError({
      statusCode: 404,
      message: 'Client not found'
    })
  }

  const now = new Date()

  // Update person record (source of truth for identity data)
  await db.update(schema.people)
    .set({
      firstName: first_name,
      lastName: last_name,
      fullName: `${first_name} ${last_name}`,
      email,
      phone: phone || null,
      updatedAt: now
    })
    .where(eq(schema.people.id, resolved.personId))

  // Update user record if one exists (keeps auth data in sync)
  const legacyUserId = resolved.userIds[0]
  if (legacyUserId) {
    const existingUser = await db.select()
      .from(schema.users)
      .where(eq(schema.users.id, legacyUserId))
      .get()

    const userUpdateData = {
      firstName: first_name,
      lastName: last_name,
      email,
      phone: phone || null,
      status: status || 'ACTIVE'
    }

    await db.update(schema.users)
      .set({
        ...userUpdateData,
        updatedAt: now
      })
      .where(eq(schema.users.id, legacyUserId))

    // Track locally modified fields for sync protection (non-blocking)
    if (existingUser) {
      try {
        await markFieldsAsLocallyModified(
          'users',
          legacyUserId,
          existingUser as Record<string, any>,
          userUpdateData,
          TRACKABLE_CLIENT_FIELDS
        )
      }
      catch (err) {
        console.error('[Clients PUT] Failed to track locally modified fields:', err)
      }
    }

    // Update client profile (address data)
    const existingProfile = await db.select({ userId: schema.clientProfiles.userId })
      .from(schema.clientProfiles)
      .where(eq(schema.clientProfiles.userId, legacyUserId))
      .get()

    if (existingProfile) {
      await db.update(schema.clientProfiles)
        .set({
          address: address || null,
          city: city || null,
          state: state || null,
          zipCode: zip_code || null,
          updatedAt: now
        })
        .where(eq(schema.clientProfiles.userId, legacyUserId))
    }
    else {
      await db.insert(schema.clientProfiles).values({
        id: crypto.randomUUID(),
        userId: legacyUserId,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zip_code || null,
        createdAt: now,
        updatedAt: now
      })
    }
  }

  // Note: client status is now derived from matters via the clients_with_status view
  // No manual status updates needed

  // Return updated data from people table (source of truth)
  const updatedPerson = await db.select()
    .from(schema.people)
    .where(eq(schema.people.id, resolved.personId))
    .get()

  const updatedProfile = legacyUserId ?
      await db.select()
        .from(schema.clientProfiles)
        .where(eq(schema.clientProfiles.userId, legacyUserId))
        .get() :
    null

  return {
    success: true,
    client: updatedPerson,
    profile: updatedProfile || null
  }
})
