/**
 * Zoom Video Meeting Provider
 *
 * Implements the VideoMeetingProvider interface for Zoom.
 * Uses the Zoom REST API v2 with OAuth access tokens.
 */

import type { H3Event } from 'h3'
import { getZoomAccessToken } from './zoom-tokens'
import type { VideoMeetingProvider, CreateMeetingParams, MeetingResult, UpdateMeetingParams } from './video-meeting'

const ZOOM_API = 'https://api.zoom.us/v2'

export class ZoomProvider implements VideoMeetingProvider {
  async createMeeting(params: CreateMeetingParams): Promise<MeetingResult> {
    const accessToken = await getZoomAccessToken(params.hostUserId, params.event)

    const response = await fetch(`${ZOOM_API}/users/me/meetings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic: params.topic,
        type: 2, // Scheduled meeting
        start_time: params.startTime,
        duration: params.durationMinutes,
        timezone: params.timezone,
        agenda: params.description || '',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          waiting_room: true,
          meeting_authentication: false
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create Zoom meeting: ${error}`)
    }

    const data = await response.json()

    return {
      providerMeetingId: String(data.id),
      joinUrl: data.join_url,
      hostUrl: data.start_url,
      passcode: data.password || undefined,
      providerData: {
        uuid: data.uuid,
        hostId: data.host_id,
        hostEmail: data.host_email,
        registrationUrl: data.registration_url
      }
    }
  }

  async updateMeeting(
    providerMeetingId: string,
    hostUserId: string,
    params: UpdateMeetingParams,
    event: H3Event
  ): Promise<void> {
    const accessToken = await getZoomAccessToken(hostUserId, event)

    const body: Record<string, any> = {}
    if (params.topic) body.topic = params.topic
    if (params.startTime) body.start_time = params.startTime
    if (params.durationMinutes) body.duration = params.durationMinutes
    if (params.timezone) body.timezone = params.timezone

    const response = await fetch(`${ZOOM_API}/meetings/${providerMeetingId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to update Zoom meeting: ${error}`)
    }
  }

  async deleteMeeting(
    providerMeetingId: string,
    hostUserId: string,
    event: H3Event
  ): Promise<void> {
    const accessToken = await getZoomAccessToken(hostUserId, event)

    const response = await fetch(`${ZOOM_API}/meetings/${providerMeetingId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      // 404 means the meeting was already deleted — that's fine
      if (response.status !== 404) {
        const error = await response.text()
        throw new Error(`Failed to delete Zoom meeting: ${error}`)
      }
    }
  }
}
