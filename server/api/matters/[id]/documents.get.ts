// Get all documents for a matter
import { eq, desc } from 'drizzle-orm'
import { requireRole } from '../../../utils/rbac'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const matterId = getRouterParam(event, 'id')

  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  // Verify matter exists
  const matter = await db
    .select({ id: schema.matters.id })
    .from(schema.matters)
    .where(eq(schema.matters.id, matterId))
    .get()

  if (!matter) {
    throw createError({
      statusCode: 404,
      message: 'Matter not found'
    })
  }

  // Get all documents for this matter
  const documents = await db
    .select({
      id: schema.documents.id,
      title: schema.documents.title,
      description: schema.documents.description,
      status: schema.documents.status,
      mimeType: schema.documents.mimeType,
      fileSize: schema.documents.fileSize,
      requiresNotary: schema.documents.requiresNotary,
      attorneyApproved: schema.documents.attorneyApproved,
      readyForSignature: schema.documents.readyForSignature,
      signedAt: schema.documents.signedAt,
      googleDriveFileUrl: schema.documents.googleDriveFileUrl,
      googleDriveSyncStatus: schema.documents.googleDriveSyncStatus,
      createdAt: schema.documents.createdAt,
      updatedAt: schema.documents.updatedAt
    })
    .from(schema.documents)
    .where(eq(schema.documents.matterId, matterId))
    .orderBy(desc(schema.documents.createdAt))
    .all()

  // Get document uploads for journeys associated with this matter
  const uploads = await db
    .select({
      id: schema.documentUploads.id,
      fileName: schema.documentUploads.fileName,
      originalFileName: schema.documentUploads.originalFileName,
      documentCategory: schema.documentUploads.documentCategory,
      fileSize: schema.documentUploads.fileSize,
      mimeType: schema.documentUploads.mimeType,
      status: schema.documentUploads.status,
      googleDriveFileUrl: schema.documentUploads.googleDriveFileUrl,
      googleDriveSyncStatus: schema.documentUploads.googleDriveSyncStatus,
      createdAt: schema.documentUploads.createdAt,
      reviewedAt: schema.documentUploads.reviewedAt
    })
    .from(schema.documentUploads)
    .innerJoin(
      schema.clientJourneys,
      eq(schema.documentUploads.clientJourneyId, schema.clientJourneys.id)
    )
    .where(eq(schema.clientJourneys.matterId, matterId))
    .orderBy(desc(schema.documentUploads.createdAt))
    .all()

  return {
    documents,
    uploads
  }
})
