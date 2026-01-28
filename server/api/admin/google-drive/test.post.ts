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

  if (result.data.serviceAccountEmail && result.data.serviceAccountPrivateKey && result.data.sharedDriveId) {
    testConfig = {
      serviceAccountEmail: result.data.serviceAccountEmail,
      serviceAccountPrivateKey: result.data.serviceAccountPrivateKey,
      sharedDriveId: result.data.sharedDriveId,
      impersonateEmail: result.data.impersonateEmail
    }
  } else {
    // Use stored config
    const storedConfig = await getDriveConfig()
    if (!storedConfig) {
      throw createError({
        statusCode: 400,
        message: 'Google Drive is not configured. Please provide credentials or save configuration first.'
      })
    }

    if (!storedConfig.serviceAccountEmail || !storedConfig.serviceAccountPrivateKey || !storedConfig.sharedDriveId) {
      throw createError({
        statusCode: 400,
        message: 'Incomplete configuration. Please provide service account credentials and Shared Drive ID.'
      })
    }

    testConfig = {
      serviceAccountEmail: storedConfig.serviceAccountEmail,
      serviceAccountPrivateKey: storedConfig.serviceAccountPrivateKey,
      sharedDriveId: storedConfig.sharedDriveId,
      impersonateEmail: storedConfig.impersonateEmail
    }
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
