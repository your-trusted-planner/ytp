// Update a client by ID
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const clientId = getRouterParam(event, 'id')

  // Only lawyers/admins can update client details
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

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

  const db = hubDatabase()

  // Check if client exists
  const existingClient = await db.prepare(`
    SELECT id FROM users WHERE id = ? AND role = 'CLIENT'
  `).bind(clientId).first()

  if (!existingClient) {
    throw createError({
      statusCode: 404,
      message: 'Client not found'
    })
  }

  // Update user table
  await db.prepare(`
    UPDATE users
    SET first_name = ?,
        last_name = ?,
        email = ?,
        phone = ?,
        status = ?,
        updated_at = ?
    WHERE id = ?
  `).bind(
    first_name,
    last_name,
    email,
    phone || null,
    status || 'ACTIVE',
    Date.now(),
    clientId
  ).run()

  // Check if profile exists
  const existingProfile = await db.prepare(`
    SELECT user_id FROM client_profiles WHERE user_id = ?
  `).bind(clientId).first()

  if (existingProfile) {
    // Update existing profile
    await db.prepare(`
      UPDATE client_profiles
      SET address = ?,
          city = ?,
          state = ?,
          zip_code = ?,
          updated_at = ?
      WHERE user_id = ?
    `).bind(
      address || null,
      city || null,
      state || null,
      zip_code || null,
      Date.now(),
      clientId
    ).run()
  } else {
    // Create new profile if it doesn't exist
    await db.prepare(`
      INSERT INTO client_profiles (id, user_id, address, city, state, zip_code, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      clientId,
      address || null,
      city || null,
      state || null,
      zip_code || null,
      Date.now(),
      Date.now()
    ).run()
  }

  // Get updated client data
  const updatedClient = await db.prepare(`
    SELECT * FROM users WHERE id = ?
  `).bind(clientId).first()

  const updatedProfile = await db.prepare(`
    SELECT * FROM client_profiles WHERE user_id = ?
  `).bind(clientId).first()

  return {
    success: true,
    client: updatedClient,
    profile: updatedProfile || null
  }
})
