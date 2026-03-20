/**
 * Tests for appointment CRUD Zod validation schemas.
 *
 * Replicated inline since the schemas are defined inside endpoint files
 * that import NuxtHub modules. Tests verify the validation rules match
 * what the API expects.
 */
import { z } from 'zod'

// Replicate from server/api/calendar/appointments/index.post.ts
const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().optional(),
  timezone: z.string().default('America/New_York'),
  clientId: z.string().optional(),
  matterId: z.string().optional(),
  appointmentType: z.enum(['CONSULTATION', 'MEETING', 'CALL', 'FOLLOW_UP', 'SIGNING', 'OTHER']).default('MEETING'),
  appointmentTypeId: z.string().optional(),
  attendeeIds: z.array(z.string()).default([]),
  syncToGoogle: z.boolean().default(false)
})

// Replicate from server/api/calendar/appointments/[id].put.ts
const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  timezone: z.string().default('America/New_York'),
  clientId: z.string().nullable().optional(),
  matterId: z.string().nullable().optional(),
  appointmentType: z.enum(['CONSULTATION', 'MEETING', 'CALL', 'FOLLOW_UP', 'SIGNING', 'OTHER']).optional(),
  appointmentTypeId: z.string().nullable().optional(),
  attendeeIds: z.array(z.string()).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional()
})

// Replicate from server/api/public/booking/book-slot.post.ts
const bookSlotSchema = z.object({
  bookingId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  timezone: z.string().default('America/New_York')
})

// Replicate from server/api/public/booking/availability.get.ts
const availabilityQuerySchema = z.object({
  attorneyId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().default('America/New_York'),
  durationMinutes: z.coerce.number().default(60),
  appointmentTypeId: z.string().optional()
})

describe('Create Appointment Schema', () => {
  it('accepts valid minimal appointment', () => {
    const result = createSchema.safeParse({
      title: 'Team Meeting',
      startTime: '2030-01-07T10:00:00Z',
      endTime: '2030-01-07T11:00:00Z'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.appointmentType).toBe('MEETING')
      expect(result.data.syncToGoogle).toBe(false)
      expect(result.data.attendeeIds).toEqual([])
      expect(result.data.timezone).toBe('America/New_York')
    }
  })

  it('accepts fully populated appointment', () => {
    const result = createSchema.safeParse({
      title: 'Client Consultation',
      description: 'Initial meeting with client',
      startTime: '2030-01-07T10:00:00Z',
      endTime: '2030-01-07T11:00:00Z',
      location: 'Office',
      timezone: 'America/Chicago',
      clientId: 'client-123',
      matterId: 'matter-456',
      appointmentType: 'CONSULTATION',
      attendeeIds: ['user-1', 'user-2'],
      syncToGoogle: true
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.appointmentType).toBe('CONSULTATION')
      expect(result.data.attendeeIds).toHaveLength(2)
      expect(result.data.syncToGoogle).toBe(true)
    }
  })

  it('rejects empty title', () => {
    const result = createSchema.safeParse({
      title: '',
      startTime: '2030-01-07T10:00:00Z',
      endTime: '2030-01-07T11:00:00Z'
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing title', () => {
    const result = createSchema.safeParse({
      startTime: '2030-01-07T10:00:00Z',
      endTime: '2030-01-07T11:00:00Z'
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing startTime', () => {
    const result = createSchema.safeParse({
      title: 'Test',
      endTime: '2030-01-07T11:00:00Z'
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing endTime', () => {
    const result = createSchema.safeParse({
      title: 'Test',
      startTime: '2030-01-07T10:00:00Z'
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid appointment type', () => {
    const result = createSchema.safeParse({
      title: 'Test',
      startTime: '2030-01-07T10:00:00Z',
      endTime: '2030-01-07T11:00:00Z',
      appointmentType: 'INVALID_TYPE'
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional appointmentTypeId', () => {
    const result = createSchema.safeParse({
      title: 'Typed Appointment',
      startTime: '2030-01-07T10:00:00Z',
      endTime: '2030-01-07T11:00:00Z',
      appointmentTypeId: 'type-123'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.appointmentTypeId).toBe('type-123')
    }
  })

  it('appointmentTypeId defaults to undefined when omitted', () => {
    const result = createSchema.safeParse({
      title: 'No Type ID',
      startTime: '2030-01-07T10:00:00Z',
      endTime: '2030-01-07T11:00:00Z'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.appointmentTypeId).toBeUndefined()
    }
  })

  it('accepts all valid appointment types', () => {
    const types = ['CONSULTATION', 'MEETING', 'CALL', 'FOLLOW_UP', 'SIGNING', 'OTHER']
    for (const type of types) {
      const result = createSchema.safeParse({
        title: 'Test',
        startTime: '2030-01-07T10:00:00Z',
        endTime: '2030-01-07T11:00:00Z',
        appointmentType: type
      })
      expect(result.success).toBe(true)
    }
  })
})

describe('Update Appointment Schema', () => {
  it('accepts empty object (no changes)', () => {
    const result = updateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial updates', () => {
    const result = updateSchema.safeParse({ title: 'Updated Title' })
    expect(result.success).toBe(true)
  })

  it('allows setting clientId to null (unlink client)', () => {
    const result = updateSchema.safeParse({ clientId: null })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.clientId).toBeNull()
    }
  })

  it('allows setting matterId to null (unlink matter)', () => {
    const result = updateSchema.safeParse({ matterId: null })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.matterId).toBeNull()
    }
  })

  it('accepts all valid statuses', () => {
    const statuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']
    for (const status of statuses) {
      const result = updateSchema.safeParse({ status })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = updateSchema.safeParse({ status: 'DELETED' })
    expect(result.success).toBe(false)
  })

  it('rejects empty title (min length 1)', () => {
    const result = updateSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })
})

describe('Book Slot Schema', () => {
  it('accepts valid booking', () => {
    const result = bookSlotSchema.safeParse({
      bookingId: 'booking-123',
      startTime: '2030-01-07T10:00:00Z',
      endTime: '2030-01-07T11:00:00Z'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.timezone).toBe('America/New_York')
    }
  })

  it('accepts custom timezone', () => {
    const result = bookSlotSchema.safeParse({
      bookingId: 'booking-123',
      startTime: '2030-01-07T10:00:00Z',
      endTime: '2030-01-07T11:00:00Z',
      timezone: 'America/Los_Angeles'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.timezone).toBe('America/Los_Angeles')
    }
  })

  it('rejects missing bookingId', () => {
    const result = bookSlotSchema.safeParse({
      startTime: '2030-01-07T10:00:00Z',
      endTime: '2030-01-07T11:00:00Z'
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing startTime', () => {
    const result = bookSlotSchema.safeParse({
      bookingId: 'booking-123',
      endTime: '2030-01-07T11:00:00Z'
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing endTime', () => {
    const result = bookSlotSchema.safeParse({
      bookingId: 'booking-123',
      startTime: '2030-01-07T10:00:00Z'
    })
    expect(result.success).toBe(false)
  })
})

describe('Availability Query Schema', () => {
  it('accepts valid query', () => {
    const result = availabilityQuerySchema.safeParse({
      attorneyId: 'atty-1',
      date: '2030-01-07'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.timezone).toBe('America/New_York')
      expect(result.data.durationMinutes).toBe(60)
    }
  })

  it('accepts custom duration', () => {
    const result = availabilityQuerySchema.safeParse({
      attorneyId: 'atty-1',
      date: '2030-01-07',
      durationMinutes: '30' // query params come as strings
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.durationMinutes).toBe(30)
    }
  })

  it('rejects invalid date format', () => {
    const result = availabilityQuerySchema.safeParse({
      attorneyId: 'atty-1',
      date: 'Jan 7, 2030'
    })
    expect(result.success).toBe(false)
  })

  it('rejects date with time component', () => {
    const result = availabilityQuerySchema.safeParse({
      attorneyId: 'atty-1',
      date: '2030-01-07T10:00:00Z'
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing attorneyId', () => {
    const result = availabilityQuerySchema.safeParse({
      date: '2030-01-07'
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing date', () => {
    const result = availabilityQuerySchema.safeParse({
      attorneyId: 'atty-1'
    })
    expect(result.success).toBe(false)
  })
})
