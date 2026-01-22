/**
 * POST /api/admin/google-drive/configure
 * Save Google Drive configuration
 */

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { requireRole, generateId } from '../../../utils/auth'

const configureSchema = z.object({
  isEnabled: z.boolean(),
  serviceAccountEmail: z.string().email().optional(),
  serviceAccountPrivateKey: z.string().optional(),
  sharedDriveId: z.string().optional(),
  rootFolderId: z.string().optional().nullable(),
  rootFolderName: z.string().min(1).default('YTP Client Files'),
  impersonateEmail: z.string().email().optional().nullable(),
  matterSubfolders: z.array(z.string()).default([
    'Generated Documents',
    'Client Uploads',
    'Signed Documents',
    'Correspondence'
  ]),
  syncGeneratedDocuments: z.boolean().default(true),
  syncClientUploads: z.boolean().default(true),
  syncSignedDocuments: z.boolean().default(true)
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])

  const body = await readBody(event)
  const result = configureSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  // Check if config already exists
  const existingConfig = await db
    .select()
    .from(schema.googleDriveConfig)
    .get()

  const configData = {
    isEnabled: result.data.isEnabled,
    serviceAccountEmail: result.data.serviceAccountEmail || null,
    // Only update private key if provided (allows partial updates)
    ...(result.data.serviceAccountPrivateKey && {
      serviceAccountPrivateKey: result.data.serviceAccountPrivateKey
    }),
    sharedDriveId: result.data.sharedDriveId || null,
    rootFolderId: result.data.rootFolderId || null,
    rootFolderName: result.data.rootFolderName,
    impersonateEmail: result.data.impersonateEmail || null,
    matterSubfolders: JSON.stringify(result.data.matterSubfolders),
    syncGeneratedDocuments: result.data.syncGeneratedDocuments,
    syncClientUploads: result.data.syncClientUploads,
    syncSignedDocuments: result.data.syncSignedDocuments,
    updatedAt: new Date()
  }

  if (existingConfig) {
    // Update existing config
    await db.update(schema.googleDriveConfig)
      .set(configData)
      .where(eq(schema.googleDriveConfig.id, existingConfig.id))
  } else {
    // Create new config
    await db.insert(schema.googleDriveConfig).values({
      id: generateId(),
      ...configData,
      // Ensure private key is set for new configs
      serviceAccountPrivateKey: result.data.serviceAccountPrivateKey || null,
      createdAt: new Date()
    })
  }

  return {
    success: true,
    message: 'Google Drive configuration saved'
  }
})
