/**
 * Tests for the team calendar event dedup logic.
 *
 * The dedup algorithm in GET /api/calendar/events groups Google Calendar events
 * by event ID so shared events (where 2+ staff attend) appear once with an
 * avatar stack showing all attendees. This is the core innovation of the
 * team calendar feature.
 *
 * The dedup logic is replicated here since the endpoint imports NuxtHub modules.
 */

interface StaffAttendee {
  userId: string
  firstName: string
  lastName: string
  avatar: string | null
  email: string
}

interface TeamEvent {
  id: string
  source: 'google' | 'ytp' | 'both'
  ytpAppointmentId?: string
  title: string
  startTime: string
  endTime: string
  location?: string
  isAllDay: boolean
  staffAttendees: StaffAttendee[]
  appointmentType?: string
  status?: string
}

interface GoogleEvent {
  id?: string
  iCalUID?: string
  summary: string
  start: { dateTime?: string, date?: string }
  end: { dateTime?: string, date?: string }
  location?: string
}

interface CalendarConfig {
  attorneyId: string
  calendarEmail: string
}

interface StaffInfo {
  id: string
  firstName: string
  lastName: string
  avatar: string | null
  email: string
}

/**
 * Replicated dedup logic from server/api/calendar/events.get.ts
 */
function deduplicateEvents(
  calendarEvents: Map<string, GoogleEvent[]>,
  calendars: CalendarConfig[],
  staffMap: Map<string, StaffInfo>
): TeamEvent[] {
  const eventMap = new Map<string, TeamEvent>()

  for (const cal of calendars) {
    const events = calendarEvents.get(cal.calendarEmail) || []
    const staffInfo = staffMap.get(cal.attorneyId)

    const attendee: StaffAttendee = {
      userId: cal.attorneyId,
      firstName: staffInfo?.firstName || '',
      lastName: staffInfo?.lastName || '',
      avatar: staffInfo?.avatar || null,
      email: cal.calendarEmail
    }

    for (const gEvent of events) {
      const eventId = gEvent.id || gEvent.iCalUID || `${cal.calendarEmail}:${gEvent.summary}:${gEvent.start?.dateTime || gEvent.start?.date}`
      const isAllDay = !gEvent.start?.dateTime && !!gEvent.start?.date

      if (eventMap.has(eventId)) {
        const existing = eventMap.get(eventId)!
        if (!existing.staffAttendees.some(a => a.userId === attendee.userId)) {
          existing.staffAttendees.push(attendee)
        }
      }
      else {
        eventMap.set(eventId, {
          id: eventId,
          source: 'google',
          title: gEvent.summary || '(No title)',
          startTime: gEvent.start?.dateTime || gEvent.start?.date || '',
          endTime: gEvent.end?.dateTime || gEvent.end?.date || '',
          location: gEvent.location,
          isAllDay,
          staffAttendees: [attendee]
        })
      }
    }
  }

  return Array.from(eventMap.values()).sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )
}

// Test fixtures
const staff: Record<string, StaffInfo> = {
  alice: { id: 'user-alice', firstName: 'Alice', lastName: 'Attorney', avatar: null, email: 'alice@firm.com' },
  bob: { id: 'user-bob', firstName: 'Bob', lastName: 'Lawyer', avatar: '/avatars/bob.png', email: 'bob@firm.com' },
  carol: { id: 'user-carol', firstName: 'Carol', lastName: 'Paralegal', avatar: null, email: 'carol@firm.com' }
}

const staffMap = new Map(Object.values(staff).map(s => [s.id, s]))

const calendars: CalendarConfig[] = [
  { attorneyId: 'user-alice', calendarEmail: 'alice@firm.com' },
  { attorneyId: 'user-bob', calendarEmail: 'bob@firm.com' },
  { attorneyId: 'user-carol', calendarEmail: 'carol@firm.com' }
]

describe('Team Calendar Event Dedup', () => {
  describe('shared event deduplication', () => {
    it('merges the same event appearing on multiple calendars into one', () => {
      // Same event ID on Alice and Bob's calendars
      const calendarEvents = new Map<string, GoogleEvent[]>([
        ['alice@firm.com', [
          { id: 'shared-event-1', summary: 'Morning Huddle', start: { dateTime: '2030-01-07T09:00:00Z' }, end: { dateTime: '2030-01-07T09:30:00Z' } }
        ]],
        ['bob@firm.com', [
          { id: 'shared-event-1', summary: 'Morning Huddle', start: { dateTime: '2030-01-07T09:00:00Z' }, end: { dateTime: '2030-01-07T09:30:00Z' } }
        ]]
      ])

      const result = deduplicateEvents(calendarEvents, calendars, staffMap)

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Morning Huddle')
      expect(result[0].staffAttendees).toHaveLength(2)

      const attendeeIds = result[0].staffAttendees.map(a => a.userId)
      expect(attendeeIds).toContain('user-alice')
      expect(attendeeIds).toContain('user-bob')
    })

    it('merges event shared across 3 staff into one with 3 attendees', () => {
      const calendarEvents = new Map<string, GoogleEvent[]>([
        ['alice@firm.com', [{ id: 'team-mtg', summary: 'Team Meeting', start: { dateTime: '2030-01-07T14:00:00Z' }, end: { dateTime: '2030-01-07T15:00:00Z' } }]],
        ['bob@firm.com', [{ id: 'team-mtg', summary: 'Team Meeting', start: { dateTime: '2030-01-07T14:00:00Z' }, end: { dateTime: '2030-01-07T15:00:00Z' } }]],
        ['carol@firm.com', [{ id: 'team-mtg', summary: 'Team Meeting', start: { dateTime: '2030-01-07T14:00:00Z' }, end: { dateTime: '2030-01-07T15:00:00Z' } }]]
      ])

      const result = deduplicateEvents(calendarEvents, calendars, staffMap)

      expect(result).toHaveLength(1)
      expect(result[0].staffAttendees).toHaveLength(3)
    })

    it('does not duplicate attendees if same staff appears twice', () => {
      // Edge case: same calendar email listed for two calendar configs with same attorneyId
      const dupeCalendars: CalendarConfig[] = [
        { attorneyId: 'user-alice', calendarEmail: 'alice@firm.com' },
        { attorneyId: 'user-alice', calendarEmail: 'alice@firm.com' }
      ]

      const calendarEvents = new Map<string, GoogleEvent[]>([
        ['alice@firm.com', [
          { id: 'event-1', summary: 'Solo', start: { dateTime: '2030-01-07T10:00:00Z' }, end: { dateTime: '2030-01-07T11:00:00Z' } }
        ]]
      ])

      const result = deduplicateEvents(calendarEvents, dupeCalendars, staffMap)

      expect(result).toHaveLength(1)
      // Should only have Alice once, not twice
      expect(result[0].staffAttendees).toHaveLength(1)
    })
  })

  describe('independent events', () => {
    it('keeps events with different IDs as separate entries', () => {
      const calendarEvents = new Map<string, GoogleEvent[]>([
        ['alice@firm.com', [
          { id: 'alice-only', summary: 'Client Call', start: { dateTime: '2030-01-07T10:00:00Z' }, end: { dateTime: '2030-01-07T10:30:00Z' } }
        ]],
        ['bob@firm.com', [
          { id: 'bob-only', summary: 'Deposition Prep', start: { dateTime: '2030-01-07T10:00:00Z' }, end: { dateTime: '2030-01-07T11:00:00Z' } }
        ]]
      ])

      const result = deduplicateEvents(calendarEvents, calendars, staffMap)

      expect(result).toHaveLength(2)
      expect(result[0].staffAttendees).toHaveLength(1)
      expect(result[1].staffAttendees).toHaveLength(1)
    })

    it('handles mix of shared and independent events', () => {
      const calendarEvents = new Map<string, GoogleEvent[]>([
        ['alice@firm.com', [
          { id: 'shared', summary: 'Huddle', start: { dateTime: '2030-01-07T09:00:00Z' }, end: { dateTime: '2030-01-07T09:30:00Z' } },
          { id: 'alice-solo', summary: 'Client Meeting', start: { dateTime: '2030-01-07T11:00:00Z' }, end: { dateTime: '2030-01-07T12:00:00Z' } }
        ]],
        ['bob@firm.com', [
          { id: 'shared', summary: 'Huddle', start: { dateTime: '2030-01-07T09:00:00Z' }, end: { dateTime: '2030-01-07T09:30:00Z' } },
          { id: 'bob-solo', summary: 'Research Time', start: { dateTime: '2030-01-07T13:00:00Z' }, end: { dateTime: '2030-01-07T14:00:00Z' } }
        ]]
      ])

      const result = deduplicateEvents(calendarEvents, calendars, staffMap)

      expect(result).toHaveLength(3) // 1 shared + 2 solo
      const huddle = result.find(e => e.title === 'Huddle')!
      expect(huddle.staffAttendees).toHaveLength(2)
    })
  })

  describe('all-day events', () => {
    it('correctly detects all-day events (date without dateTime)', () => {
      const calendarEvents = new Map<string, GoogleEvent[]>([
        ['alice@firm.com', [
          { id: 'holiday', summary: 'Office Holiday', start: { date: '2030-01-07' }, end: { date: '2030-01-08' } }
        ]]
      ])

      const result = deduplicateEvents(calendarEvents, calendars, staffMap)

      expect(result).toHaveLength(1)
      expect(result[0].isAllDay).toBe(true)
    })

    it('timed events are not all-day', () => {
      const calendarEvents = new Map<string, GoogleEvent[]>([
        ['alice@firm.com', [
          { id: 'mtg', summary: 'Meeting', start: { dateTime: '2030-01-07T10:00:00Z' }, end: { dateTime: '2030-01-07T11:00:00Z' } }
        ]]
      ])

      const result = deduplicateEvents(calendarEvents, calendars, staffMap)

      expect(result[0].isAllDay).toBe(false)
    })
  })

  describe('sorting', () => {
    it('sorts events by start time ascending', () => {
      const calendarEvents = new Map<string, GoogleEvent[]>([
        ['alice@firm.com', [
          { id: 'late', summary: 'Late', start: { dateTime: '2030-01-07T16:00:00Z' }, end: { dateTime: '2030-01-07T17:00:00Z' } },
          { id: 'early', summary: 'Early', start: { dateTime: '2030-01-07T08:00:00Z' }, end: { dateTime: '2030-01-07T09:00:00Z' } },
          { id: 'mid', summary: 'Mid', start: { dateTime: '2030-01-07T12:00:00Z' }, end: { dateTime: '2030-01-07T13:00:00Z' } }
        ]]
      ])

      const result = deduplicateEvents(calendarEvents, calendars, staffMap)

      expect(result[0].title).toBe('Early')
      expect(result[1].title).toBe('Mid')
      expect(result[2].title).toBe('Late')
    })
  })

  describe('edge cases', () => {
    it('handles empty calendar', () => {
      const calendarEvents = new Map<string, GoogleEvent[]>([
        ['alice@firm.com', []]
      ])

      const result = deduplicateEvents(calendarEvents, calendars, staffMap)
      expect(result).toEqual([])
    })

    it('handles no calendars', () => {
      const result = deduplicateEvents(new Map(), [], staffMap)
      expect(result).toEqual([])
    })

    it('handles event with no title', () => {
      const calendarEvents = new Map<string, GoogleEvent[]>([
        ['alice@firm.com', [
          { id: 'no-title', summary: '', start: { dateTime: '2030-01-07T10:00:00Z' }, end: { dateTime: '2030-01-07T11:00:00Z' } }
        ]]
      ])

      const result = deduplicateEvents(calendarEvents, calendars, staffMap)
      expect(result[0].title).toBe('(No title)')
    })

    it('generates fallback ID when event has no id or iCalUID', () => {
      const calendarEvents = new Map<string, GoogleEvent[]>([
        ['alice@firm.com', [
          { summary: 'Mystery Event', start: { dateTime: '2030-01-07T10:00:00Z' }, end: { dateTime: '2030-01-07T11:00:00Z' } }
        ]]
      ])

      const result = deduplicateEvents(calendarEvents, calendars, staffMap)

      expect(result).toHaveLength(1)
      expect(result[0].id).toContain('alice@firm.com')
    })

    it('preserves location from Google event', () => {
      const calendarEvents = new Map<string, GoogleEvent[]>([
        ['alice@firm.com', [
          { id: 'loc-test', summary: 'Offsite', start: { dateTime: '2030-01-07T10:00:00Z' }, end: { dateTime: '2030-01-07T11:00:00Z' }, location: '123 Main St' }
        ]]
      ])

      const result = deduplicateEvents(calendarEvents, calendars, staffMap)
      expect(result[0].location).toBe('123 Main St')
    })

    it('handles staff not in staffMap', () => {
      const unknownCalendars: CalendarConfig[] = [
        { attorneyId: 'user-unknown', calendarEmail: 'unknown@firm.com' }
      ]

      const calendarEvents = new Map<string, GoogleEvent[]>([
        ['unknown@firm.com', [
          { id: 'evt', summary: 'Event', start: { dateTime: '2030-01-07T10:00:00Z' }, end: { dateTime: '2030-01-07T11:00:00Z' } }
        ]]
      ])

      const result = deduplicateEvents(calendarEvents, unknownCalendars, staffMap)

      expect(result).toHaveLength(1)
      expect(result[0].staffAttendees[0].firstName).toBe('')
      expect(result[0].staffAttendees[0].userId).toBe('user-unknown')
    })

    it('correctly deduplicates when calendars have overlapping fetch results', () => {
      // Alice has 3 events, Bob has 2 events, 1 is shared
      const calendarEvents = new Map<string, GoogleEvent[]>([
        ['alice@firm.com', [
          { id: 'shared-1', summary: 'Shared', start: { dateTime: '2030-01-07T09:00:00Z' }, end: { dateTime: '2030-01-07T10:00:00Z' } },
          { id: 'alice-1', summary: 'Alice 1', start: { dateTime: '2030-01-07T11:00:00Z' }, end: { dateTime: '2030-01-07T12:00:00Z' } },
          { id: 'alice-2', summary: 'Alice 2', start: { dateTime: '2030-01-07T14:00:00Z' }, end: { dateTime: '2030-01-07T15:00:00Z' } }
        ]],
        ['bob@firm.com', [
          { id: 'shared-1', summary: 'Shared', start: { dateTime: '2030-01-07T09:00:00Z' }, end: { dateTime: '2030-01-07T10:00:00Z' } },
          { id: 'bob-1', summary: 'Bob 1', start: { dateTime: '2030-01-07T13:00:00Z' }, end: { dateTime: '2030-01-07T14:00:00Z' } }
        ]]
      ])

      const result = deduplicateEvents(calendarEvents, calendars, staffMap)

      // 1 shared + 2 alice-only + 1 bob-only = 4
      expect(result).toHaveLength(4)

      const shared = result.find(e => e.title === 'Shared')!
      expect(shared.staffAttendees).toHaveLength(2)

      const aliceOnly = result.filter(e => e.title.startsWith('Alice'))
      expect(aliceOnly).toHaveLength(2)
      expect(aliceOnly.every(e => e.staffAttendees.length === 1)).toBe(true)
    })
  })
})
