// Add Additional Grantor account to existing client account
import { z } from 'zod'
import { requireAuth, generateId, hashPassword } from '../../../utils/auth'

const addGrantorSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  relationship: z.enum(['SPOUSE', 'CO_TRUSTEE', 'PARTNER', 'OTHER']).optional(),
  matterId: z.string().optional(), // Link to specific matter
  password: z.string().min(8), // Separate login for additional grantor
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  
  // Only clients can add additional grantors to their account
  if (user.role !== 'CLIENT') {
    throw createError({
      statusCode: 403,
      message: 'Only clients can add additional grantors'
    })
  }
  
  const body = await readBody(event)
  const result = addGrantorSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid grantor data',
      data: result.error.errors
    })
  }
  
  const { email, firstName, lastName, phone, relationship, matterId, password } = result.data
  const db = hubDatabase()
  
  // Check if email already exists
  const existingUser = await db.prepare(`
    SELECT id FROM users WHERE email = ?
  `).bind(email).first()
  
  if (existingUser) {
    throw createError({
      statusCode: 400,
      message: 'A user with this email already exists'
    })
  }
  
  // Create new user account for additional grantor
  const grantorUserId = generateId()
  const hashedPassword = await hashPassword(password)
  const now = Date.now()
  
  await db.prepare(`
    INSERT INTO users (
      id, email, password, role, first_name, last_name, phone, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    grantorUserId,
    email,
    hashedPassword,
    'CLIENT',
    firstName,
    lastName,
    phone || null,
    'ACTIVE',
    now,
    now
  ).run()
  
  // Create client profile for grantor
  const profileId = generateId()
  await db.prepare(`
    INSERT INTO client_profiles (
      id, user_id, grantor_type, assigned_lawyer_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    profileId,
    grantorUserId,
    'ADDITIONAL',
    null, // Will inherit from primary
    now,
    now
  ).run()
  
  // Link additional grantor to primary user
  const linkId = generateId()
  await db.prepare(`
    INSERT INTO additional_grantors (
      id, primary_user_id, grantor_user_id, relationship, matter_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    linkId,
    user.id, // Primary user
    grantorUserId, // Additional grantor
    relationship || 'SPOUSE',
    matterId || null,
    now,
    now
  ).run()
  
  return {
    success: true,
    grantorUserId,
    message: 'Additional grantor account created successfully'
  }
})

