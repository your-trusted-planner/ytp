import { z } from 'zod'
import { useDrizzle, schema } from '../../../db'
import { generateId } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity-logger'
import { createCalendarEvent } from '../../../utils/google-calendar'
import { eq } from 'drizzle-orm'

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string(), // ISO 8601
  endTime: z.string(),
  location: z.string().optional(),
  locationConfig: z.string().optional(), // JSON LocationConfig
  roomId: z.string().optional(),
  timezone: z.string().default('America/New_York'),
  clientId: z.string().optional(),
  matterId: z.string().optional(),
  appointmentType: z.enum(['CONSULTATION', 'MEETING', 'CALL', 'FOLLOW_UP', 'SIGNING', 'OTHER']).default('MEETING'),
  appointmentTypeId: z.string().optional(),
  attendeeIds: z.array(z.string()).default([]),
  inviteeIds: z.array(z.string()).default([]),
  checkAvailability: z.boolean().default(true),
  syncToGoogle: z.boolean().default(false)
})

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const body = await readBody(event)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const data = parsed.data
  const db = useDrizzle()
  const appointmentId = generateId()

  // Resolve clientId from invitees for client-facing appointment types
  if (data.appointmentTypeId && !data.clientId && data.inviteeIds.length > 0) {
    const apptType = await db.select({ isClientFacing: schema.appointmentTypes.isClientFacing })
      .from(schema.appointmentTypes)
      .where(eq(schema.appointmentTypes.id, data.appointmentTypeId))
      .get()

    if (apptType?.isClientFacing) {
      // First invitee is the client — resolve their person ID to a user ID
      const personId = data.inviteeIds[0]

      // Check if person has a user account
      const existingUser = await db.select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.personId, personId))
        .get()

      if (existingUser) {
        data.clientId = existingUser.id
      } else {
        // Create user + client records via the journey initiator's pattern
        const person = await db.select()
          .from(schema.people)
          .where(eq(schema.people.id, personId))
          .get()

        if (person) {
          const { nanoid } = await import('nanoid')
          const { hashPassword } = await import('../../../utils/auth')
          const userId = nanoid()
          const hashedPw = await hashPassword(nanoid(32))

          await db.insert(schema.users).values({
            id: userId,
            personId,
            email: person.email || `${userId}@placeholder.internal`,
            firstName: person.firstName || '',
            lastName: person.lastName || '',
            phone: person.phone || null,
            password: hashedPw,
            role: 'CLIENT',
            status: 'ACTIVE',
            adminLevel: 0
          })

          // Ensure client record exists
          const existingClient = await db.select({ id: schema.clients.id })
            .from(schema.clients)
            .where(eq(schema.clients.personId, personId))
            .get()

          if (!existingClient) {
            await db.insert(schema.clients).values({
              id: nanoid(),
              personId,
              status: 'PROSPECTIVE',
              createdAt: new Date(),
              updatedAt: new Date()
            })
          }

          data.clientId = userId
        }
      }
    }
  }

  // Validate client-facing appointment types have a client after resolution
  if (data.appointmentTypeId && !data.clientId) {
    const apptType = await db.select({ isClientFacing: schema.appointmentTypes.isClientFacing })
      .from(schema.appointmentTypes)
      .where(eq(schema.appointmentTypes.id, data.appointmentTypeId))
      .get()

    if (apptType?.isClientFacing) {
      throw createError({
        statusCode: 400,
        message: 'This appointment type is client-facing and requires a client or invitee'
      })
    }
  }

  // Check staff availability if requested
  if (data.checkAvailability && data.attendeeIds.length > 0) {
    const { getMultiCalendarFreeBusy } = await import('../../../utils/google-calendar')
    const { inArray } = await import('drizzle-orm')

    // Get calendars for all staff attendees
    const staffCalendars = await db
      .select({
        attorneyId: schema.attorneyCalendars.attorneyId,
        calendarEmail: schema.attorneyCalendars.calendarEmail
      })
      .from(schema.attorneyCalendars)
      .where(inArray(schema.attorneyCalendars.attorneyId, data.attendeeIds))
      .all()

    if (staffCalendars.length > 0) {
      try {
        const calendarEmails = staffCalendars.map(c => c.calendarEmail)
        const busyPeriods = await getMultiCalendarFreeBusy(
          calendarEmails[0]!,
          calendarEmails,
          data.startTime,
          data.endTime
        )

        if (busyPeriods.length > 0) {
          // Identify which staff members are busy
          const busyStaff: string[] = []
          for (const cal of staffCalendars) {
            const calBusy = await import('../../../utils/google-calendar').then(m =>
              m.getFreeBusy(cal.calendarEmail, data.startTime, data.endTime)
            )
            if (calBusy.length > 0) {
              const staffUser = await db
                .select({ firstName: schema.users.firstName, lastName: schema.users.lastName })
                .from(schema.users)
                .where(eq(schema.users.id, cal.attorneyId))
                .get()
              busyStaff.push(staffUser ? [staffUser.firstName, staffUser.lastName].filter(Boolean).join(' ') : cal.calendarEmail)
            }
          }

          throw createError({
            statusCode: 409,
            message: busyStaff.length > 0
              ? `Schedule conflict: ${busyStaff.join(', ')} ${busyStaff.length === 1 ? 'is' : 'are'} not available at this time`
              : 'One or more staff members have a schedule conflict at this time'
          })
        }
      } catch (err: any) {
        if (err.statusCode === 409) throw err
        console.error('Availability check failed:', err.message)
        // Continue without check if calendar API fails
      }
    }
  }

  let googleCalendarEventId: string | null = null
  let googleCalendarEmail: string | null = null

  // Sync to Google Calendar if requested
  if (data.syncToGoogle) {
    // Find the creator's primary calendar
    const [calendar] = await db
      .select()
      .from(schema.attorneyCalendars)
      .where(eq(schema.attorneyCalendars.attorneyId, user.id))
      .all()

    if (calendar) {
      // Build attendee list from attendeeIds
      const attendeeEmails: Array<{ email: string, displayName?: string }> = []
      if (data.attendeeIds.length > 0) {
        const attendeeUsers = await db
          .select({
            id: schema.users.id,
            email: schema.users.email,
            firstName: schema.users.firstName,
            lastName: schema.users.lastName
          })
          .from(schema.users)
          .all()

        for (const uid of data.attendeeIds) {
          const u = attendeeUsers.find(au => au.id === uid)
          if (u?.email) {
            attendeeEmails.push({
              email: u.email,
              displayName: [u.firstName, u.lastName].filter(Boolean).join(' ') || undefined
            })
          }
        }
      }

      try {
        const gcalEvent = await createCalendarEvent(calendar.calendarEmail, {
          summary: data.title,
          description: data.description,
          start: { dateTime: data.startTime, timeZone: data.timezone },
          end: { dateTime: data.endTime, timeZone: data.timezone },
          location: data.location,
          attendees: attendeeEmails.length > 0 ? attendeeEmails : undefined
        })

        googleCalendarEventId = gcalEvent.id || null
        googleCalendarEmail = calendar.calendarEmail
      }
      catch (err: any) {
        console.error('Failed to create Google Calendar event:', err.message)
        // Continue without Google sync — appointment still created in DB
      }
    }
  }

  // Insert appointment first (video meeting FK references it)
  await db.insert(schema.appointments).values({
    id: appointmentId,
    title: data.title,
    description: data.description || null,
    startTime: new Date(data.startTime),
    endTime: new Date(data.endTime),
    location: data.location || null,
    locationConfig: data.locationConfig || null,
    roomId: data.roomId || null,
    clientId: data.clientId || null,
    matterId: data.matterId || null,
    appointmentType: data.appointmentType,
    appointmentTypeId: data.appointmentTypeId || null,
    attendeeIds: data.attendeeIds.length > 0 ? JSON.stringify(data.attendeeIds) : null,
    createdById: user.id,
    googleCalendarEventId,
    googleCalendarEmail,
    status: 'CONFIRMED'
  })

  // Handle video meeting creation if locationConfig indicates video
  let videoMeetingId: string | null = null

  if (data.locationConfig) {
    try {
      const config = JSON.parse(data.locationConfig)
      if (config.type === 'video' && config.provider) {
        const { getVideoProvider } = await import('../../../utils/video-meeting')
        try {
          const provider = await getVideoProvider(config.provider)
          const durationMs = new Date(data.endTime).getTime() - new Date(data.startTime).getTime()
          const durationMinutes = Math.round(durationMs / 60000)

          const meeting = await provider.createMeeting({
            topic: data.title,
            startTime: data.startTime,
            durationMinutes,
            timezone: data.timezone,
            hostUserId: user.id,
            description: data.description,
            event
          })

          // Store video meeting record (appointment exists now, FK is satisfied)
          const vmId = generateId()
          await db.insert(schema.videoMeetings).values({
            id: vmId,
            appointmentId,
            provider: config.provider,
            providerMeetingId: meeting.providerMeetingId,
            hostUserId: user.id,
            joinUrl: meeting.joinUrl,
            hostUrl: meeting.hostUrl,
            passcode: meeting.passcode || null,
            status: 'ACTIVE',
            providerData: meeting.providerData ? JSON.stringify(meeting.providerData) : null,
            createdAt: new Date(),
            updatedAt: new Date()
          })

          videoMeetingId = vmId

          // Update appointment with video meeting link and ID
          await db.update(schema.appointments)
            .set({
              videoMeetingId: vmId,
              location: meeting.joinUrl
            })
            .where(eq(schema.appointments.id, appointmentId))
        }
        catch (err: any) {
          console.error('Failed to create video meeting:', err.message)
        }
      }
    }
    catch { /* ignore parse errors */ }
  }

  // Auto-link to MEETING action items on active client journeys
  if (data.clientId && data.appointmentTypeId) {
    try {
      const { and, inArray } = await import('drizzle-orm')

      // Find pending MEETING action items on this client's active journeys
      // that reference the same appointment type
      const pendingMeetingItems = await db.select({
        id: schema.actionItems.id,
        config: schema.actionItems.config
      })
        .from(schema.actionItems)
        .innerJoin(schema.clientJourneys, eq(schema.actionItems.clientJourneyId, schema.clientJourneys.id))
        .where(and(
          eq(schema.clientJourneys.clientId, data.clientId),
          eq(schema.actionItems.actionType, 'MEETING'),
          inArray(schema.actionItems.status, ['PENDING', 'IN_PROGRESS']),
          inArray(schema.clientJourneys.status, ['NOT_STARTED', 'IN_PROGRESS'])
        ))
        .all()

      // Filter by matching appointmentTypeId in config and no existing link
      const now = new Date()
      for (const item of pendingMeetingItems) {
        if (!item.config) continue
        try {
          const itemConfig = JSON.parse(item.config)
          if (itemConfig.appointmentTypeId !== data.appointmentTypeId) continue

          // Link the appointment to this action item
          const updates: any = {
            resourceId: appointmentId,
            updatedAt: now
          }

          // If completionTrigger is SCHEDULED, mark complete immediately
          if (itemConfig.completionTrigger === 'SCHEDULED') {
            updates.status = 'COMPLETE'
            updates.completedAt = now
            updates.completedBy = user.id
          }

          await db.update(schema.actionItems)
            .set(updates)
            .where(eq(schema.actionItems.id, item.id))

          // Only link to the first matching action item
          break
        } catch { /* skip items with unparseable config */ }
      }
    } catch (err: any) {
      console.error('Failed to auto-link MEETING action item:', err.message)
      // Non-fatal — appointment was still created successfully
    }
  }

  // Auto-initiate engagement journey if appointment type has a journeyTemplateId
  if (data.appointmentTypeId) {
    try {
      const appointmentType = await db.select({
        journeyTemplateId: schema.appointmentTypes.journeyTemplateId
      })
        .from(schema.appointmentTypes)
        .where(eq(schema.appointmentTypes.id, data.appointmentTypeId))
        .get()

      if (appointmentType?.journeyTemplateId) {
        // Determine personId from clientId
        let personId: string | null = null
        if (data.clientId) {
          const clientUser = await db.select({ personId: schema.users.personId })
            .from(schema.users)
            .where(eq(schema.users.id, data.clientId))
            .get()
          personId = clientUser?.personId || null
        }

        if (personId) {
          const { initiateEngagementJourney } = await import('../../../utils/journey-initiator')
          const result = await initiateEngagementJourney({
            personId,
            journeyTemplateId: appointmentType.journeyTemplateId,
            appointmentId,
            initiatedBy: user.id,
            event
          })

          // If journey was just created (actionItemsCreated > 0), link any MEETING items
          // that match this appointment type to this appointment
          if (result.actionItemsCreated > 0) {
            const { and: andOp, inArray: inArrayOp } = await import('drizzle-orm')
            const newMeetingItems = await db.select({
              id: schema.actionItems.id,
              config: schema.actionItems.config
            })
              .from(schema.actionItems)
              .where(andOp(
                eq(schema.actionItems.clientJourneyId, result.clientJourneyId),
                eq(schema.actionItems.actionType, 'MEETING'),
                inArrayOp(schema.actionItems.status, ['PENDING', 'IN_PROGRESS'])
              ))
              .all()

            const now = new Date()
            for (const item of newMeetingItems) {
              if (!item.config) continue
              try {
                const itemConfig = JSON.parse(item.config)
                if (itemConfig.appointmentTypeId !== data.appointmentTypeId) continue

                const updates: any = { resourceId: appointmentId, updatedAt: now }
                if (itemConfig.completionTrigger === 'SCHEDULED') {
                  updates.status = 'COMPLETE'
                  updates.completedAt = now
                  updates.completedBy = user.id
                }

                await db.update(schema.actionItems)
                  .set(updates)
                  .where(eq(schema.actionItems.id, item.id))
                break
              } catch { /* skip */ }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to auto-initiate engagement journey:', err.message)
      // Non-fatal — appointment was still created successfully
    }
  }

  await logActivity({
    type: 'APPOINTMENT_CREATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'appointment', id: appointmentId, name: data.title },
    event,
    details: {
      appointmentType: data.appointmentType,
      syncedToGoogle: !!googleCalendarEventId,
      videoMeetingCreated: !!videoMeetingId
    }
  })

  return {
    success: true,
    appointmentId,
    googleCalendarEventId,
    videoMeetingId
  }
})
