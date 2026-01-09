// Update a client by ID
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
  const db = useDrizzle()

  // Check if client exists
  const existingClient = await db.select({ id: schema.users.id })
    .from(schema.users)
    .where(and(
      eq(schema.users.id, clientId),
      eq(schema.users.role, 'CLIENT')
    ))
    .get()

  if (!existingClient) {
    throw createError({
      statusCode: 404,
      message: 'Client not found'
    })
  }

  const now = new Date()

  // Update user table
  await db.update(schema.users)
    .set({
      firstName: first_name,
      lastName: last_name,
      email,
      phone: phone || null,
      status: status || 'ACTIVE',
      updatedAt: now
    })
    .where(eq(schema.users.id, clientId))

  // Check if profile exists
  const existingProfile = await db.select({ userId: schema.clientProfiles.userId })
    .from(schema.clientProfiles)
    .where(eq(schema.clientProfiles.userId, clientId))
    .get()

  if (existingProfile) {
    // Update existing profile
    await db.update(schema.clientProfiles)
      .set({
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zip_code || null,
        updatedAt: now
      })
      .where(eq(schema.clientProfiles.userId, clientId))
  } else {
    // Create new profile if it doesn't exist
    await db.insert(schema.clientProfiles).values({
      id: crypto.randomUUID(),
      userId: clientId,
      address: address || null,
      city: city || null,
      state: state || null,
      zipCode: zip_code || null,
      createdAt: now,
      updatedAt: now
    })
  }

  // Get updated client data
  const updatedClient = await db.select()
    .from(schema.users)
    .where(eq(schema.users.id, clientId))
    .get()

  const updatedProfile = await db.select()
    .from(schema.clientProfiles)
    .where(eq(schema.clientProfiles.userId, clientId))
    .get()

  return {
    success: true,
    client: updatedClient,
    profile: updatedProfile || null
  }
})
