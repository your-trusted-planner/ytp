import { z } from 'zod'
import { sql, eq } from 'drizzle-orm'
import { isDatabaseAvailable } from '../../db'
import { requireRole, generateId } from '../../utils/auth'
import { isDriveEnabled, createMatterFolder, createClientFolder, getFile } from '../../utils/google-drive'
import { notifyDriveSyncError } from '../../utils/notice-service'

const createMatterSchema = z.object({
  title: z.string().min(1),
  clientId: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['OPEN', 'CLOSED', 'PENDING']).default('PENDING'),
  leadAttorneyId: z.string().optional(),
  engagementJourneyTemplateId: z.string().optional(), // Journey template ID
})

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['LAWYER', 'ADMIN'])
  
  const body = await readBody(event)
  const result = createMatterSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error
    })
  }
  
  if (!isDatabaseAvailable()) {
    const mockMatter = {
      id: generateId(),
      ...result.data,
      matterNumber: `${new Date().getFullYear()}-001`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    return { success: true, matter: mockMatter } // Mock response
  }

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Auto-generate matter number: YYYY-NNN format
  const currentYear = new Date().getFullYear()
  const yearStart = new Date(currentYear, 0, 1)
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59)

  // Count matters created this year
  const yearMatters = await db
    .select()
    .from(schema.matters)
    .where(sql`created_at >= ${yearStart.getTime() / 1000} AND created_at <= ${yearEnd.getTime() / 1000}`)
    .all()

  const nextNumber = (yearMatters.length + 1).toString().padStart(3, '0')
  const matterNumber = `${currentYear}-${nextNumber}`

  const newMatter = {
    id: generateId(),
    title: result.data.title,
    clientId: result.data.clientId,
    description: result.data.description,
    status: result.data.status,
    matterNumber,
    leadAttorneyId: result.data.leadAttorneyId || null,
    engagementJourneyId: null, // Will be set if engagement journey template is selected
    createdAt: new Date(),
    updatedAt: new Date()
  }

  await db.insert(schema.matters).values(newMatter)

  // If engagement journey template is selected, create a clientJourney instance
  if (result.data.engagementJourneyTemplateId) {
    const clientJourneyId = generateId()

    await db.insert(schema.clientJourneys).values({
      id: clientJourneyId,
      clientId: result.data.clientId,
      matterId: newMatter.id,
      catalogId: null, // Engagement journeys are not tied to a specific service
      journeyId: result.data.engagementJourneyTemplateId,
      currentStepId: null,
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
      startedAt: null,
      completedAt: null,
      pausedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // Update matter with clientJourney reference
    await db.update(schema.matters)
      .set({ engagementJourneyId: clientJourneyId })
      .where(eq(schema.matters.id, newMatter.id))

    // Update the returned matter object to include the engagement journey ID
    newMatter.engagementJourneyId = clientJourneyId
  }

  // Create Google Drive folder for matter
  let googleDrive: {
    enabled: boolean
    success: boolean
    folderUrl?: string
    error?: string
    clientHasFolder?: boolean
  } = { enabled: false, success: false }

  try {
    const driveEnabled = await isDriveEnabled()
    console.log('[Matter Create] Drive enabled:', driveEnabled)

    if (driveEnabled) {
      googleDrive.enabled = true

      // Get client info for folder creation
      const clientUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, result.data.clientId))
        .get()

      // Get client profile to check for existing Drive folder
      const clientProfile = await db
        .select()
        .from(schema.clientProfiles)
        .where(eq(schema.clientProfiles.userId, result.data.clientId))
        .get()

      console.log('[Matter Create] Client profile found:', !!clientProfile)
      console.log('[Matter Create] Client googleDriveFolderId:', clientProfile?.googleDriveFolderId)

      let clientFolderId = clientProfile?.googleDriveFolderId

      // If client has a folder ID, verify it's still accessible
      if (clientFolderId) {
        try {
          console.log('[Matter Create] Verifying client folder is accessible...')
          await getFile(clientFolderId)
          console.log('[Matter Create] Client folder verified')
          googleDrive.clientHasFolder = true
        } catch (folderError) {
          // Client folder is not accessible - need to create a new one
          console.warn('[Matter Create] Client folder not accessible, will create new one:', folderError)
          clientFolderId = null
        }
      }

      // If no accessible client folder, create one automatically
      if (!clientFolderId) {
        console.log('[Matter Create] Creating client folder automatically...')
        googleDrive.clientHasFolder = false

        if (clientUser) {
          try {
            const clientName = `${clientUser.lastName || ''}, ${clientUser.firstName || ''}`.trim() || 'Unknown Client'
            console.log('[Matter Create] Creating client folder for:', clientName)
            const clientFolder = await createClientFolder(result.data.clientId, clientName)
            clientFolderId = clientFolder.id
            googleDrive.clientHasFolder = true
            console.log('[Matter Create] Client folder created:', clientFolderId)
          } catch (clientFolderError) {
            const errorMsg = clientFolderError instanceof Error ? clientFolderError.message : 'Unknown error'
            console.error('[Matter Create] Failed to create client folder:', errorMsg)
            googleDrive.error = `Failed to create client folder: ${errorMsg}`
          }
        } else {
          googleDrive.error = 'Client not found'
        }
      }

      // Now create the matter folder if we have a client folder
      if (clientFolderId) {
        try {
          console.log('[Matter Create] Creating matter folder in client folder:', clientFolderId)
          const folderResult = await createMatterFolder(
            newMatter.id,
            newMatter.title,
            matterNumber,
            clientFolderId
          )
          googleDrive.success = true
          googleDrive.folderUrl = folderResult.folder.webViewLink
          console.log('[Matter Create] Matter folder created successfully:', folderResult.folder.id)
        } catch (matterFolderError) {
          const errorMsg = matterFolderError instanceof Error ? matterFolderError.message : 'Unknown error'
          console.error('[Matter Create] Failed to create matter folder:', errorMsg)
          googleDrive.success = false
          googleDrive.error = `Failed to create matter folder: ${errorMsg}`
        }
      }
    }
  } catch (error) {
    // Log error but don't fail the matter creation
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Matter Create] Failed to create Google Drive folder:', error)
    console.error('[Matter Create] Error message:', errorMessage)
    googleDrive.success = false
    googleDrive.error = errorMessage

    // Create notice for the user about the sync failure
    try {
      await notifyDriveSyncError(
        user.id,
        'matter',
        newMatter.id,
        newMatter.title,
        errorMessage
      )
    } catch (noticeError) {
      console.error('Failed to create Drive sync error notice:', noticeError)
    }
  }

  return { success: true, matter: newMatter, googleDrive }
})
