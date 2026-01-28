/**
 * Matter types for the application
 * Using camelCase for frontend consistency
 */

export type MatterStatus = 'OPEN' | 'CLOSED' | 'PENDING'

export type DriveSyncStatus = 'NOT_SYNCED' | 'SYNCED' | 'ERROR'

export interface Matter {
  id: string
  clientId: string
  title: string
  matterNumber: string | null
  description: string | null
  status: MatterStatus
  leadAttorneyId: string | null
  engagementJourneyId: string | null

  // Google Drive sync
  googleDriveFolderId: string | null
  googleDriveFolderUrl: string | null
  googleDriveSyncStatus: DriveSyncStatus | null
  googleDriveSyncError: string | null
  googleDriveLastSyncAt: number | null
  googleDriveSubfolderIds: string | null // JSON string

  // Timestamps (Unix seconds)
  createdAt: number
  updatedAt: number

  // Joined fields (from related tables)
  clientFirstName?: string | null
  clientLastName?: string | null
  clientEmail?: string | null
  leadAttorneyFirstName?: string | null
  leadAttorneyLastName?: string | null
  leadAttorneyEmail?: string | null
  engagementJourneyName?: string | null
}

export interface MatterService {
  catalogId: string
  name: string
  category: string | null
  price: number
  status: string
  engagedAt: number
  assignedAttorneyId: string | null
  assignedAttorneyName: string | null
}

export interface MatterJourney {
  id: string
  journeyName: string
  serviceName: string | null
  currentStepName: string | null
  status: string
}

export interface MatterPayment {
  id: string
  paymentType: string
  amount: number
  status: string
  paidAt: number | null
}

export interface MatterDocument {
  id: string
  title: string
  description: string | null
  status: string
  mimeType: string | null
  fileSize: number | null
  requiresNotary: boolean
  attorneyApproved: boolean
  readyForSignature: boolean
  signedAt: number | null
  googleDriveFileUrl: string | null
  googleDriveSyncStatus: string | null
  createdAt: number
  updatedAt: number
}

export interface MatterUpload {
  id: string
  fileName: string
  originalFileName: string
  documentCategory: string | null
  fileSize: number
  mimeType: string
  status: string
  googleDriveFileUrl: string | null
  googleDriveSyncStatus: string | null
  createdAt: number
  reviewedAt: number | null
}

/**
 * Transform snake_case API response to camelCase Matter
 */
export function transformMatter(apiResponse: Record<string, any>): Matter {
  return {
    id: apiResponse.id,
    clientId: apiResponse.client_id,
    title: apiResponse.title,
    matterNumber: apiResponse.matter_number,
    description: apiResponse.description,
    status: apiResponse.status,
    leadAttorneyId: apiResponse.lead_attorney_id,
    engagementJourneyId: apiResponse.engagement_journey_id,
    googleDriveFolderId: apiResponse.google_drive_folder_id,
    googleDriveFolderUrl: apiResponse.google_drive_folder_url,
    googleDriveSyncStatus: apiResponse.google_drive_sync_status,
    googleDriveSyncError: apiResponse.google_drive_sync_error,
    googleDriveLastSyncAt: apiResponse.google_drive_last_sync_at,
    googleDriveSubfolderIds: apiResponse.google_drive_subfolder_ids,
    createdAt: apiResponse.created_at,
    updatedAt: apiResponse.updated_at,
    // Joined fields
    clientFirstName: apiResponse.client_first_name,
    clientLastName: apiResponse.client_last_name,
    clientEmail: apiResponse.client_email,
    leadAttorneyFirstName: apiResponse.lead_attorney_first_name,
    leadAttorneyLastName: apiResponse.lead_attorney_last_name,
    leadAttorneyEmail: apiResponse.lead_attorney_email,
    engagementJourneyName: apiResponse.engagement_journey_name
  }
}

/**
 * Transform snake_case API response to camelCase MatterService
 */
export function transformMatterService(apiResponse: Record<string, any>): MatterService {
  return {
    catalogId: apiResponse.catalog_id,
    name: apiResponse.name,
    category: apiResponse.category,
    price: apiResponse.price,
    status: apiResponse.status,
    engagedAt: apiResponse.engaged_at,
    assignedAttorneyId: apiResponse.assigned_attorney_id,
    assignedAttorneyName: apiResponse.assigned_attorney_name
  }
}

/**
 * Transform snake_case API response to camelCase MatterJourney
 */
export function transformMatterJourney(apiResponse: Record<string, any>): MatterJourney {
  return {
    id: apiResponse.id,
    journeyName: apiResponse.journey_name,
    serviceName: apiResponse.service_name,
    currentStepName: apiResponse.current_step_name,
    status: apiResponse.status
  }
}

/**
 * Transform snake_case API response to camelCase MatterPayment
 */
export function transformMatterPayment(apiResponse: Record<string, any>): MatterPayment {
  return {
    id: apiResponse.id,
    paymentType: apiResponse.payment_type,
    amount: apiResponse.amount,
    status: apiResponse.status,
    paidAt: apiResponse.paid_at
  }
}
