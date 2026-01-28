import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDrizzle, schema } from '../../db'
import { hashPassword, generateId } from '../../utils/auth'
import { requireRole } from '../../utils/rbac'
import { logActivity } from '../../utils/activity-logger'
import { isDriveEnabled, createClientFolder } from '../../utils/google-drive'
import { notifyDriveSyncError } from '../../utils/notice-service'

const createClientSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  password: z.string().min(6)
})

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['LAWYER', 'ADMIN'])
  
  const body = await readBody(event)
  const result = createClientSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input'
    })
  }
  
  const { email, firstName, lastName, phone, password } = result.data
  const db = useDrizzle()
  
  // Check if user already exists
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .get()
  
  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'User already exists'
    })
  }
  
  const hashedPassword = await hashPassword(password)
  const userId = generateId()
  
  // Create user
  await db.insert(schema.users).values({
    id: userId,
    email,
    firstName,
    lastName,
    phone,
    password: hashedPassword,
    role: 'CLIENT',
    status: 'ACTIVE'
  })
  
  // Create client profile
  await db.insert(schema.clientProfiles).values({
    id: generateId(),
    userId
  })

  // Log activity
  const clientName = `${firstName} ${lastName}`
  await logActivity({
    type: 'CLIENT_CREATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'client', id: userId, name: clientName },
    event,
    details: {
      clientEmail: email
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
      const clientName = `${lastName}, ${firstName}`
      const folder = await createClientFolder(userId, clientName)
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
        userId,
        `${firstName} ${lastName}`,
        errorMessage
      )
    } catch (noticeError) {
      console.error('Failed to create Drive sync error notice:', noticeError)
    }
  }

  return { success: true, userId, googleDrive }
})

