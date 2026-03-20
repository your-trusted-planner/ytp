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

/**
 * Convert a UTC ISO string to a local datetime string in the given IANA timezone.
 * Zoom expects `start_time` as local time (no Z) paired with the `timezone` field.
 * E.g., "2026-03-20T16:00:00.000Z" with tz "America/Denver" → "2026-03-20T10:00:00"
 */
function toLocalTimeForZoom(utcIso: string, timezone: string): string {
  const date = new Date(utcIso)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  const parts = formatter.formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value || '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`
}

export class ZoomProvider implements VideoMeetingProvider {
  async createMeeting(params: CreateMeetingParams): Promise<MeetingResult> {
    const accessToken = await getZoomAccessToken(params.hostUserId, params.event)

    // Zoom expects start_time as local time (no Z suffix) paired with timezone.
    const startTime = toLocalTimeForZoom(params.startTime, params.timezone)

    const response = await fetch(`${ZOOM_API}/users/me/meetings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic: params.topic,
        type: 2, // Scheduled meeting
        start_time: startTime,
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
    if (params.startTime) body.start_time = toLocalTimeForZoom(params.startTime, params.timezone || 'UTC')
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
