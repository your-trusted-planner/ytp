/**
 * POST /api/admin/google-drive/test
 * Test Google Drive connection and permissions
 */

import { z } from 'zod'
import { requireRole } from '../../../utils/rbac'
import { testDriveConnection, getDriveConfig } from '../../../utils/google-drive'

const testSchema = z.object({
  // Optional: Test with provided credentials instead of stored ones
  serviceAccountEmail: z.string().email().optional(),
  serviceAccountPrivateKey: z.string().optional(),
  sharedDriveId: z.string().optional(),
  impersonateEmail: z.string().email().optional().nullable()
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])

  const body = await readBody(event).catch(() => ({}))
  const result = testSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error
    })
  }

  // If credentials provided in request, use those. Otherwise use stored config.
  let testConfig: {
    serviceAccountEmail: string
    serviceAccountPrivateKey: string
    sharedDriveId: string
    impersonateEmail?: string | null
  }

  // Merge: use provided values, fall back to stored config for anything missing
  const storedConfig = await getDriveConfig()

  const email = result.data.serviceAccountEmail || storedConfig?.serviceAccountEmail
  const key = result.data.serviceAccountPrivateKey || storedConfig?.serviceAccountPrivateKey
  const driveId = result.data.sharedDriveId || storedConfig?.sharedDriveId
  const impersonate = result.data.impersonateEmail ?? storedConfig?.impersonateEmail

  if (!email || !key) {
    throw createError({
      statusCode: 400,
      message: 'Service account credentials not configured. Go to Settings > Google Workspace to set up credentials.'
    })
  }

  if (!driveId) {
    throw createError({
      statusCode: 400,
      message: 'Shared Drive ID is required. Enter a Drive ID above or configure one in the form.'
    })
  }

  testConfig = {
    serviceAccountEmail: email,
    serviceAccountPrivateKey: key,
    sharedDriveId: driveId,
    impersonateEmail: impersonate
  }

  const testResult = await testDriveConnection(testConfig)

  if (!testResult.success) {
    return {
      success: false,
      error: testResult.error,
      accessibleDrives: testResult.accessibleDrives
    }
  }

  return {
    success: true,
    message: `Successfully connected to Shared Drive: ${testResult.driveName}`,
    driveName: testResult.driveName,
    accessibleDrives: testResult.accessibleDrives
  }
})
