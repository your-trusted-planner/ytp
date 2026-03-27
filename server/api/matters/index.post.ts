import { z } from 'zod'
import { sql, eq } from 'drizzle-orm'
import { isDatabaseAvailable } from '../../db'
import { generateId } from '../../utils/auth'
import { requireRole } from '../../utils/rbac'
import { isDriveEnabled, createMatterFolder, createClientFolder, getFile } from '../../utils/google-drive'
import { notifyDriveSyncError } from '../../utils/notice-service'

const createMatterSchema = z.object({
  title: z.string().min(1),
  clientId: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['OPEN', 'CLOSED', 'PENDING']).default('PENDING'),
  leadAttorneyId: z.string().optional(),
  engagementJourneyTemplateId: z.string().optional() // Journey template ID
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
  const { resolveClientIds } = await import('../../utils/client-ids')
  const db = useDrizzle()

  // matters.clientId references users.id, but request may send clients.id
  const resolved = await resolveClientIds(result.data.clientId)
  const legacyClientId = resolved?.userIds[0] || result.data.clientId

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
    clientId: legacyClientId,
    description: result.data.description,
    status: result.data.status,
    matterNumber,
    leadAttorneyId: result.data.leadAttorneyId || null,
    engagementJourneyId: null, // Will be set if engagement journey template is selected
    createdAt: new Date(),
    updatedAt: new Date()
  }

  await db.insert(schema.matters).values(newMatter)

  // If engagement journey template is selected, initiate the engagement journey
  if (result.data.engagementJourneyTemplateId && resolved) {
    try {
      const { initiateEngagementJourney } = await import('../../utils/journey-initiator')
      const journeyResult = await initiateEngagementJourney({
        personId: resolved.personId,
        journeyTemplateId: result.data.engagementJourneyTemplateId,
        matterId: newMatter.id,
        initiatedBy: user.id,
        event
      })

      // Update matter with clientJourney reference
      await db.update(schema.matters)
        .set({ engagementJourneyId: journeyResult.clientJourneyId })
        .where(eq(schema.matters.id, newMatter.id))

      newMatter.engagementJourneyId = journeyResult.clientJourneyId
    } catch (err: any) {
      console.error('Failed to initiate engagement journey:', err.message)
      // Non-fatal — matter was still created
    }
  }

  // Create Google Drive folder for matter
  const googleDrive: {
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
        .where(eq(schema.users.id, legacyClientId))
        .get()

      // Get client profile to check for existing Drive folder
      const clientProfile = await db
        .select()
        .from(schema.clientProfiles)
        .where(eq(schema.clientProfiles.userId, legacyClientId))
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
        }
        catch (folderError) {
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
            const clientFolder = await createClientFolder(legacyClientId, clientName)
            clientFolderId = clientFolder.id
            googleDrive.clientHasFolder = true
            console.log('[Matter Create] Client folder created:', clientFolderId)
          }
          catch (clientFolderError) {
            const errorMsg = clientFolderError instanceof Error ? clientFolderError.message : 'Unknown error'
            console.error('[Matter Create] Failed to create client folder:', errorMsg)
            googleDrive.error = `Failed to create client folder: ${errorMsg}`
          }
        }
        else {
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
        }
        catch (matterFolderError) {
          const errorMsg = matterFolderError instanceof Error ? matterFolderError.message : 'Unknown error'
          console.error('[Matter Create] Failed to create matter folder:', errorMsg)
          googleDrive.success = false
          googleDrive.error = `Failed to create matter folder: ${errorMsg}`
        }
      }
    }
  }
  catch (error) {
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
    }
    catch (noticeError) {
      console.error('Failed to create Drive sync error notice:', noticeError)
    }
  }

  return { success: true, matter: newMatter, googleDrive }
})
