import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDrizzle, schema } from '../../db'
import { hashPassword, generateId } from '../../utils/auth'
import { requireRole } from '../../utils/rbac'
import { logActivity } from '../../utils/activity-logger'
import { isDriveEnabled, createClientFolder } from '../../utils/google-drive'
import { notifyDriveSyncError } from '../../utils/notice-service'

const createClientSchema = z.object({
  // Required fields
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(6),

  // Optional contact fields
  phone: z.string().optional(),

  // Address fields
  address: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),

  // Personal details
  dateOfBirth: z.string().optional(), // ISO date string
  ssnLast4: z.string().max(4).optional(),

  // Family information
  hasMinorChildren: z.boolean().optional().default(false),
  childrenInfo: z.string().optional(), // JSON string

  // Existing planning
  hasWill: z.boolean().optional().default(false),
  hasTrust: z.boolean().optional().default(false),

  // Business information
  businessName: z.string().optional(),
  businessType: z.string().optional(),

  // Referral source
  referralType: z.enum(['CLIENT', 'PROFESSIONAL', 'EVENT', 'MARKETING']).optional(),
  referredByPersonId: z.string().optional(),
  referredByPartnerId: z.string().optional(),
  referralNotes: z.string().optional(),

  // Client status (default: PROSPECT)
  status: z.enum(['LEAD', 'PROSPECT', 'ACTIVE', 'INACTIVE']).optional().default('PROSPECT')
})

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['LAWYER', 'ADMIN'])

  const body = await readBody(event)
  const result = createClientSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error.flatten()
    })
  }

  const data = result.data
  const db = useDrizzle()

  // Check if user already exists by email
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, data.email))
    .get()

  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'A user with this email already exists'
    })
  }

  // Also check people table for existing person with same email
  const existingPerson = await db
    .select()
    .from(schema.people)
    .where(eq(schema.people.email, data.email))
    .get()

  if (existingPerson) {
    throw createError({
      statusCode: 409,
      message: 'A person with this email already exists'
    })
  }

  const hashedPassword = await hashPassword(data.password)
  const personId = generateId()
  const userId = generateId()
  const clientId = generateId()

  // Parse date of birth if provided
  let dateOfBirth: Date | undefined
  if (data.dateOfBirth) {
    dateOfBirth = new Date(data.dateOfBirth)
    if (isNaN(dateOfBirth.getTime())) {
      dateOfBirth = undefined
    }
  }

  // Create person record (Belly Button Principle)
  await db.insert(schema.people).values({
    id: personId,
    personType: 'individual',
    firstName: data.firstName,
    lastName: data.lastName,
    fullName: `${data.firstName} ${data.lastName}`,
    email: data.email,
    phone: data.phone || null,
    address: data.address || null,
    address2: data.address2 || null,
    city: data.city || null,
    state: data.state || null,
    zipCode: data.zipCode || null,
    dateOfBirth: dateOfBirth || null,
    ssnLast4: data.ssnLast4 || null
  })

  // Create user record for portal access
  await db.insert(schema.users).values({
    id: userId,
    personId,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone || null,
    password: hashedPassword,
    role: 'CLIENT',
    status: 'ACTIVE'
  })

  // Create client record with all intake data
  await db.insert(schema.clients).values({
    id: clientId,
    personId,
    status: data.status,
    hasMinorChildren: data.hasMinorChildren,
    childrenInfo: data.childrenInfo || null,
    businessName: data.businessName || null,
    businessType: data.businessType || null,
    hasWill: data.hasWill,
    hasTrust: data.hasTrust,
    referralType: data.referralType || null,
    referredByPersonId: data.referredByPersonId || null,
    referredByPartnerId: data.referredByPartnerId || null,
    referralNotes: data.referralNotes || null
  })

  // Also create legacy client profile for backward compatibility
  // TODO: Remove after full migration to clients table
  await db.insert(schema.clientProfiles).values({
    id: generateId(),
    userId,
    dateOfBirth: dateOfBirth || null,
    address: data.address || null,
    city: data.city || null,
    state: data.state || null,
    zipCode: data.zipCode || null,
    hasMinorChildren: data.hasMinorChildren,
    childrenInfo: data.childrenInfo || null,
    businessName: data.businessName || null,
    businessType: data.businessType || null,
    hasWill: data.hasWill,
    hasTrust: data.hasTrust,
    referralType: data.referralType || null,
    referredByPartnerId: data.referredByPartnerId || null,
    referralNotes: data.referralNotes || null
  })

  // Log activity
  const clientName = `${data.firstName} ${data.lastName}`
  await logActivity({
    type: 'CLIENT_CREATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'client', id: clientId, name: clientName },
    event,
    details: {
      clientEmail: data.email,
      status: data.status,
      hasReferral: Boolean(data.referralType)
    }
  })

  // Create Google Drive folder for client
  let googleDrive: {
    enabled: boolean
    success: boolean
    folderUrl?: string
    error?: string
  } = { enabled: false, success: false }

  try {
    if (await isDriveEnabled()) {
      googleDrive.enabled = true
      const folderName = `${data.lastName}, ${data.firstName}`
      const folder = await createClientFolder(userId, folderName)
      googleDrive.success = true
      googleDrive.folderUrl = folder.webViewLink
    }
  } catch (error) {
    // Log error but don't fail the client creation
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Failed to create Google Drive folder for client:', error)
    googleDrive.enabled = true
    googleDrive.success = false
    googleDrive.error = errorMessage

    // Create notice for the user about the sync failure
    try {
      await notifyDriveSyncError(
        user.id,
        'client',
        clientId,
        `${data.firstName} ${data.lastName}`,
        errorMessage
      )
    } catch (noticeError) {
      console.error('Failed to create Drive sync error notice:', noticeError)
    }
  }

  return {
    success: true,
    clientId,
    userId,
    personId,
    googleDrive
  }
})
