/**
 * Video Meeting Provider Abstraction
 *
 * Provider-agnostic interface for creating/updating/deleting video meetings.
 * Factory pattern returns the appropriate provider implementation.
 *
 * All methods accept an H3Event because provider credentials are stored
 * encrypted in the database and need the request context for decryption.
 */

import type { H3Event } from 'h3'

export interface CreateMeetingParams {
  topic: string
  startTime: string // ISO 8601
  durationMinutes: number
  timezone: string
  hostUserId: string // YTP user ID
  description?: string
  attendeeEmails?: string[]
  event: H3Event // Request context for credential decryption
}

export interface MeetingResult {
  providerMeetingId: string
  joinUrl: string
  hostUrl: string
  passcode?: string
  providerData?: Record<string, any>
}

export interface UpdateMeetingParams {
  topic?: string
  startTime?: string
  durationMinutes?: number
  timezone?: string
}

export interface VideoMeetingProvider {
  createMeeting(params: CreateMeetingParams): Promise<MeetingResult>
  updateMeeting(providerMeetingId: string, hostUserId: string, params: UpdateMeetingParams, event: H3Event): Promise<void>
  deleteMeeting(providerMeetingId: string, hostUserId: string, event: H3Event): Promise<void>
}

/**
 * Factory function that returns the appropriate video meeting provider.
 * Currently supports Zoom; Google Meet throws 501 (not yet implemented).
 */
export async function getVideoProvider(provider: 'zoom' | 'google_meet'): Promise<VideoMeetingProvider> {
  switch (provider) {
    case 'zoom': {
      const { ZoomProvider } = await import('./zoom-provider')
      return new ZoomProvider()
    }
    case 'google_meet':
      throw createError({
        statusCode: 501,
        message: 'Google Meet integration is not yet available'
      })
    default:
      throw createError({
        statusCode: 400,
        message: `Unknown video provider: ${provider}`
      })
  }
}
