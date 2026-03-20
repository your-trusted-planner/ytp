/**
 * Tests for public booking business rules.
 *
 * The booking flow has several state transitions and validation rules:
 * - Bookings follow a status machine: PENDING_PAYMENT → PENDING_BOOKING → BOOKED
 * - Double-booking prevention: slot must still be free when confirmed
 * - Cancelled bookings cannot be booked
 * - Already-booked bookings cannot be booked again
 *
 * These rules are replicated here since the endpoint imports NuxtHub modules.
 */

type BookingStatus = 'PENDING_PAYMENT' | 'PENDING_BOOKING' | 'BOOKED' | 'CONVERTED' | 'CANCELLED'

interface Booking {
  id: string
  status: BookingStatus
  appointmentId: string | null
  attorneyId: string | null
}

interface BusyPeriod {
  start: string
  end: string
}

/**
 * Validate whether a booking can proceed to slot selection.
 * Replicated from server/api/public/booking/book-slot.post.ts
 */
function validateBookingForSlotSelection(booking: Booking): { valid: boolean, error?: string } {
  if (booking.status === 'BOOKED') {
    return { valid: false, error: 'This booking already has an appointment scheduled' }
  }
  if (booking.status === 'CANCELLED') {
    return { valid: false, error: 'This booking has been cancelled' }
  }
  if (booking.status === 'CONVERTED') {
    return { valid: false, error: 'This booking has already been converted to a client' }
  }
  if (booking.status === 'PENDING_PAYMENT') {
    return { valid: false, error: 'Payment must be completed before booking a slot' }
  }
  return { valid: true }
}

/**
 * Check if a time slot is still available (no overlapping busy periods).
 * Replicated double-book prevention logic.
 */
function isSlotAvailable(
  busyPeriods: BusyPeriod[],
  slotStart: string,
  slotEnd: string
): boolean {
  const start = new Date(slotStart).getTime()
  const end = new Date(slotEnd).getTime()

  return !busyPeriods.some((busy) => {
    const busyStart = new Date(busy.start).getTime()
    const busyEnd = new Date(busy.end).getTime()
    // Overlap: slot starts before busy ends AND slot ends after busy starts
    return start < busyEnd && end > busyStart
  })
}

/**
 * Determine the correct step to show for a booking.
 */
function getBookingStep(booking: Booking): 'payment' | 'schedule' | 'confirmation' | 'cancelled' {
  switch (booking.status) {
    case 'PENDING_PAYMENT': return 'payment'
    case 'PENDING_BOOKING': return 'schedule'
    case 'BOOKED': return 'confirmation'
    case 'CONVERTED': return 'confirmation'
    case 'CANCELLED': return 'cancelled'
  }
}

describe('Booking Status Validation', () => {
  const baseBooking: Booking = {
    id: 'booking-1',
    status: 'PENDING_BOOKING',
    appointmentId: null,
    attorneyId: 'atty-1'
  }

  describe('validateBookingForSlotSelection', () => {
    it('allows PENDING_BOOKING status', () => {
      const result = validateBookingForSlotSelection({ ...baseBooking, status: 'PENDING_BOOKING' })
      expect(result.valid).toBe(true)
    })

    it('rejects already BOOKED', () => {
      const result = validateBookingForSlotSelection({ ...baseBooking, status: 'BOOKED' })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('already has an appointment')
    })

    it('rejects CANCELLED', () => {
      const result = validateBookingForSlotSelection({ ...baseBooking, status: 'CANCELLED' })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('cancelled')
    })

    it('rejects CONVERTED', () => {
      const result = validateBookingForSlotSelection({ ...baseBooking, status: 'CONVERTED' })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('converted')
    })

    it('rejects PENDING_PAYMENT (must pay first)', () => {
      const result = validateBookingForSlotSelection({ ...baseBooking, status: 'PENDING_PAYMENT' })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Payment')
    })
  })
})

describe('Double-Book Prevention', () => {
  describe('isSlotAvailable', () => {
    it('returns true when no busy periods', () => {
      expect(isSlotAvailable([], '2030-01-07T10:00:00Z', '2030-01-07T11:00:00Z')).toBe(true)
    })

    it('returns false when slot exactly matches a busy period', () => {
      const busy = [{ start: '2030-01-07T10:00:00Z', end: '2030-01-07T11:00:00Z' }]
      expect(isSlotAvailable(busy, '2030-01-07T10:00:00Z', '2030-01-07T11:00:00Z')).toBe(false)
    })

    it('returns false when slot overlaps start of busy period', () => {
      const busy = [{ start: '2030-01-07T10:30:00Z', end: '2030-01-07T11:30:00Z' }]
      expect(isSlotAvailable(busy, '2030-01-07T10:00:00Z', '2030-01-07T11:00:00Z')).toBe(false)
    })

    it('returns false when slot overlaps end of busy period', () => {
      const busy = [{ start: '2030-01-07T09:30:00Z', end: '2030-01-07T10:30:00Z' }]
      expect(isSlotAvailable(busy, '2030-01-07T10:00:00Z', '2030-01-07T11:00:00Z')).toBe(false)
    })

    it('returns false when slot is entirely within busy period', () => {
      const busy = [{ start: '2030-01-07T09:00:00Z', end: '2030-01-07T12:00:00Z' }]
      expect(isSlotAvailable(busy, '2030-01-07T10:00:00Z', '2030-01-07T11:00:00Z')).toBe(false)
    })

    it('returns false when busy period is entirely within slot', () => {
      const busy = [{ start: '2030-01-07T10:15:00Z', end: '2030-01-07T10:45:00Z' }]
      expect(isSlotAvailable(busy, '2030-01-07T10:00:00Z', '2030-01-07T11:00:00Z')).toBe(false)
    })

    it('returns true when busy period ends exactly when slot starts (adjacent, no overlap)', () => {
      const busy = [{ start: '2030-01-07T09:00:00Z', end: '2030-01-07T10:00:00Z' }]
      expect(isSlotAvailable(busy, '2030-01-07T10:00:00Z', '2030-01-07T11:00:00Z')).toBe(true)
    })

    it('returns true when busy period starts exactly when slot ends (adjacent, no overlap)', () => {
      const busy = [{ start: '2030-01-07T11:00:00Z', end: '2030-01-07T12:00:00Z' }]
      expect(isSlotAvailable(busy, '2030-01-07T10:00:00Z', '2030-01-07T11:00:00Z')).toBe(true)
    })

    it('handles multiple busy periods — available between them', () => {
      const busy = [
        { start: '2030-01-07T09:00:00Z', end: '2030-01-07T10:00:00Z' },
        { start: '2030-01-07T11:00:00Z', end: '2030-01-07T12:00:00Z' }
      ]
      // 10:00-11:00 is between the two busy periods
      expect(isSlotAvailable(busy, '2030-01-07T10:00:00Z', '2030-01-07T11:00:00Z')).toBe(true)
    })

    it('handles multiple busy periods — blocked by one of them', () => {
      const busy = [
        { start: '2030-01-07T09:00:00Z', end: '2030-01-07T10:00:00Z' },
        { start: '2030-01-07T10:30:00Z', end: '2030-01-07T11:30:00Z' }
      ]
      // 10:00-11:00 overlaps with second busy period
      expect(isSlotAvailable(busy, '2030-01-07T10:00:00Z', '2030-01-07T11:00:00Z')).toBe(false)
    })
  })
})

describe('Booking Step Routing', () => {
  it('routes PENDING_PAYMENT to payment step', () => {
    expect(getBookingStep({ id: '1', status: 'PENDING_PAYMENT', appointmentId: null, attorneyId: null })).toBe('payment')
  })

  it('routes PENDING_BOOKING to schedule step', () => {
    expect(getBookingStep({ id: '1', status: 'PENDING_BOOKING', appointmentId: null, attorneyId: null })).toBe('schedule')
  })

  it('routes BOOKED to confirmation step', () => {
    expect(getBookingStep({ id: '1', status: 'BOOKED', appointmentId: 'appt-1', attorneyId: null })).toBe('confirmation')
  })

  it('routes CONVERTED to confirmation step', () => {
    expect(getBookingStep({ id: '1', status: 'CONVERTED', appointmentId: 'appt-1', attorneyId: null })).toBe('confirmation')
  })

  it('routes CANCELLED to cancelled step', () => {
    expect(getBookingStep({ id: '1', status: 'CANCELLED', appointmentId: null, attorneyId: null })).toBe('cancelled')
  })
})
