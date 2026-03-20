import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'
import { isServiceAccountConfigured } from '../../utils/google-calendar'

export default defineEventHandler(async (event) => {
  // Admin middleware auto-protects /api/admin/* routes
  const db = useDrizzle()

  // Check service account (shared credentials)
  const serviceAccountConfigured = await isServiceAccountConfigured()

  // Check Drive config
  let driveEnabled = false
  let driveConfigured = false
  let hasSharedDrive = false
  let hasRootFolder = false

  try {
    const [driveConfig] = await db
      .select()
      .from(schema.googleDriveConfig)
      .all()

    if (driveConfig) {
      driveEnabled = !!driveConfig.isEnabled
      driveConfigured = !!(driveConfig.serviceAccountEmail && driveConfig.serviceAccountPrivateKey && driveConfig.sharedDriveId)
      hasSharedDrive = !!driveConfig.sharedDriveId
      hasRootFolder = !!driveConfig.rootFolderId
    }
  }
  catch {}

  // Check calendar config (count active attorney calendars)
  let calendarCount = 0
  try {
    const calendars = await db
      .select({ id: schema.attorneyCalendars.id })
      .from(schema.attorneyCalendars)
      .where(eq(schema.attorneyCalendars.isActive, true))
      .all()
    calendarCount = calendars.length
  }
  catch {}

  return {
    serviceAccount: {
      configured: serviceAccountConfigured
    },
    drive: {
      enabled: driveEnabled,
      configured: driveConfigured,
      hasSharedDrive,
      hasRootFolder
    },
    calendar: {
      activeCalendars: calendarCount,
      configured: calendarCount > 0
    }
  }
})
