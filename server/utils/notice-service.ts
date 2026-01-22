import { useDrizzle, schema } from '../db'
import { eq, and, or, isNull, desc, sql } from 'drizzle-orm'

type NoticeType =
  | 'DRIVE_SYNC_ERROR'
  | 'DOCUMENT_SIGNED'
  | 'CLIENT_FILE_UPLOADED'
  | 'JOURNEY_ACTION_REQUIRED'
  | 'SYSTEM_ANNOUNCEMENT'
  | 'PAYMENT_RECEIVED'

type NoticeSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS'

interface CreateNoticeParams {
  type: NoticeType
  severity?: NoticeSeverity
  title: string
  message: string
  targetType?: string
  targetId?: string
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, any>
  createdByUserId?: string
}

interface NoticeRecipient {
  userId?: string
  targetRole?: string
}

/**
 * Create a notice and assign it to specified recipients
 */
export async function createNotice(
  params: CreateNoticeParams,
  recipients: NoticeRecipient[]
): Promise<string> {
  const db = useDrizzle()
  const noticeId = crypto.randomUUID()

  // Create the notice
  await db.insert(schema.notices).values({
    id: noticeId,
    type: params.type,
    severity: params.severity || 'INFO',
    title: params.title,
    message: params.message,
    targetType: params.targetType,
    targetId: params.targetId,
    actionUrl: params.actionUrl,
    actionLabel: params.actionLabel,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    createdByUserId: params.createdByUserId
  })

  // Create recipient entries
  if (recipients.length > 0) {
    await db.insert(schema.noticeRecipients).values(
      recipients.map(r => ({
        id: crypto.randomUUID(),
        noticeId,
        userId: r.userId,
        targetRole: r.targetRole
      }))
    )
  }

  return noticeId
}

/**
 * Notify about a Drive sync error
 */
export async function notifyDriveSyncError(
  userId: string,
  entityType: 'client' | 'matter',
  entityId: string,
  entityName: string,
  error: string
): Promise<string> {
  return createNotice(
    {
      type: 'DRIVE_SYNC_ERROR',
      severity: 'ERROR',
      title: `Google Drive sync failed for ${entityType}`,
      message: `Failed to sync "${entityName}" to Google Drive: ${error}`,
      targetType: entityType,
      targetId: entityId,
      actionUrl: `/${entityType}s/${entityId}`,
      actionLabel: `View ${entityType === 'client' ? 'Client' : 'Matter'}`
    },
    [{ userId }]
  )
}

/**
 * Notify when a document is signed
 */
export async function notifyDocumentSigned(
  documentId: string,
  documentTitle: string,
  matterId: string,
  matterTitle: string,
  signerName: string
): Promise<string> {
  // Notify all lawyers and staff
  return createNotice(
    {
      type: 'DOCUMENT_SIGNED',
      severity: 'SUCCESS',
      title: 'Document Signed',
      message: `${signerName} signed "${documentTitle}" for matter "${matterTitle}"`,
      targetType: 'document',
      targetId: documentId,
      actionUrl: `/documents/${documentId}`,
      actionLabel: 'View Document',
      metadata: { matterId, matterTitle }
    },
    [{ targetRole: 'LAWYER' }, { targetRole: 'STAFF' }]
  )
}

/**
 * Notify when a client uploads a file
 */
export async function notifyFileUploaded(
  uploadId: string,
  fileName: string,
  clientId: string,
  clientName: string,
  uploadedByUserId: string
): Promise<string> {
  // Notify all lawyers
  return createNotice(
    {
      type: 'CLIENT_FILE_UPLOADED',
      severity: 'INFO',
      title: 'New Client Upload',
      message: `${clientName} uploaded "${fileName}"`,
      targetType: 'upload',
      targetId: uploadId,
      actionUrl: `/clients/${clientId}`,
      actionLabel: 'View Client',
      createdByUserId: uploadedByUserId
    },
    [{ targetRole: 'LAWYER' }]
  )
}

/**
 * Notify when a journey action requires attention
 */
export async function notifyJourneyActionRequired(
  clientJourneyId: string,
  journeyName: string,
  stepName: string,
  clientName: string,
  responsibleParty: 'CLIENT' | 'COUNSEL' | 'STAFF' | 'BOTH'
): Promise<string> {
  const recipients: NoticeRecipient[] = []

  // Determine who should receive the notice
  if (responsibleParty === 'COUNSEL' || responsibleParty === 'BOTH') {
    recipients.push({ targetRole: 'LAWYER' })
  }
  if (responsibleParty === 'STAFF' || responsibleParty === 'BOTH') {
    recipients.push({ targetRole: 'STAFF' })
  }

  return createNotice(
    {
      type: 'JOURNEY_ACTION_REQUIRED',
      severity: 'WARNING',
      title: 'Action Required',
      message: `${clientName} - ${journeyName}: "${stepName}" needs attention`,
      targetType: 'journey',
      targetId: clientJourneyId,
      actionUrl: `/my-journeys/${clientJourneyId}`,
      actionLabel: 'View Journey'
    },
    recipients
  )
}

/**
 * Create a system announcement for all users of specific roles
 */
export async function createSystemAnnouncement(
  title: string,
  message: string,
  targetRoles: string[] = ['ADMIN', 'LAWYER', 'STAFF']
): Promise<string> {
  return createNotice(
    {
      type: 'SYSTEM_ANNOUNCEMENT',
      severity: 'INFO',
      title,
      message
    },
    targetRoles.map(role => ({ targetRole: role }))
  )
}

/**
 * Notify about a payment received
 */
export async function notifyPaymentReceived(
  paymentId: string,
  amount: number,
  matterId: string,
  matterTitle: string,
  clientName: string
): Promise<string> {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount / 100)

  return createNotice(
    {
      type: 'PAYMENT_RECEIVED',
      severity: 'SUCCESS',
      title: 'Payment Received',
      message: `${clientName} paid ${formattedAmount} for "${matterTitle}"`,
      targetType: 'payment',
      targetId: paymentId,
      actionUrl: `/matters/${matterId}?tab=payments`,
      actionLabel: 'View Payment',
      metadata: { matterId, amount }
    },
    [{ targetRole: 'LAWYER' }, { targetRole: 'STAFF' }]
  )
}

/**
 * Get notices for a specific user (their own + role-broadcast notices)
 */
export async function getNoticesForUser(
  userId: string,
  userRole: string,
  options: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
  } = {}
): Promise<any[]> {
  const db = useDrizzle()
  const { limit = 50, offset = 0, unreadOnly = false } = options

  // Build the query to get notices for this user or their role
  let query = db
    .select({
      id: schema.notices.id,
      type: schema.notices.type,
      severity: schema.notices.severity,
      title: schema.notices.title,
      message: schema.notices.message,
      targetType: schema.notices.targetType,
      targetId: schema.notices.targetId,
      actionUrl: schema.notices.actionUrl,
      actionLabel: schema.notices.actionLabel,
      metadata: schema.notices.metadata,
      createdAt: schema.notices.createdAt,
      recipientId: schema.noticeRecipients.id,
      readAt: schema.noticeRecipients.readAt,
      dismissedAt: schema.noticeRecipients.dismissedAt
    })
    .from(schema.notices)
    .innerJoin(
      schema.noticeRecipients,
      eq(schema.notices.id, schema.noticeRecipients.noticeId)
    )
    .where(
      and(
        // Match user directly or by role
        or(
          eq(schema.noticeRecipients.userId, userId),
          eq(schema.noticeRecipients.targetRole, userRole)
        ),
        // Not dismissed
        isNull(schema.noticeRecipients.dismissedAt),
        // Optionally filter to unread only
        unreadOnly ? isNull(schema.noticeRecipients.readAt) : undefined
      )
    )
    .orderBy(desc(schema.notices.createdAt))
    .limit(limit)
    .offset(offset)

  const results = await query

  // Parse metadata JSON
  return results.map(notice => ({
    ...notice,
    metadata: notice.metadata ? JSON.parse(notice.metadata) : null,
    isRead: !!notice.readAt
  }))
}

/**
 * Get unread notice count for a user
 */
export async function getUnreadNoticeCount(
  userId: string,
  userRole: string
): Promise<number> {
  const db = useDrizzle()

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.notices)
    .innerJoin(
      schema.noticeRecipients,
      eq(schema.notices.id, schema.noticeRecipients.noticeId)
    )
    .where(
      and(
        or(
          eq(schema.noticeRecipients.userId, userId),
          eq(schema.noticeRecipients.targetRole, userRole)
        ),
        isNull(schema.noticeRecipients.readAt),
        isNull(schema.noticeRecipients.dismissedAt)
      )
    )

  return result[0]?.count || 0
}

/**
 * Mark a notice as read for a specific user
 */
export async function markNoticeAsRead(
  recipientId: string
): Promise<void> {
  const db = useDrizzle()

  await db
    .update(schema.noticeRecipients)
    .set({ readAt: sql`(unixepoch())` })
    .where(eq(schema.noticeRecipients.id, recipientId))
}

/**
 * Dismiss a notice for a specific user
 */
export async function dismissNotice(
  recipientId: string
): Promise<void> {
  const db = useDrizzle()

  await db
    .update(schema.noticeRecipients)
    .set({ dismissedAt: sql`(unixepoch())` })
    .where(eq(schema.noticeRecipients.id, recipientId))
}

/**
 * Mark all notices as read for a user
 */
export async function markAllNoticesAsRead(
  userId: string,
  userRole: string
): Promise<number> {
  const db = useDrizzle()

  // Get all unread recipient entries for this user
  const unreadRecipients = await db
    .select({ id: schema.noticeRecipients.id })
    .from(schema.noticeRecipients)
    .innerJoin(
      schema.notices,
      eq(schema.notices.id, schema.noticeRecipients.noticeId)
    )
    .where(
      and(
        or(
          eq(schema.noticeRecipients.userId, userId),
          eq(schema.noticeRecipients.targetRole, userRole)
        ),
        isNull(schema.noticeRecipients.readAt),
        isNull(schema.noticeRecipients.dismissedAt)
      )
    )

  // Update each one
  for (const recipient of unreadRecipients) {
    await db
      .update(schema.noticeRecipients)
      .set({ readAt: sql`(unixepoch())` })
      .where(eq(schema.noticeRecipients.id, recipient.id))
  }

  return unreadRecipients.length
}
