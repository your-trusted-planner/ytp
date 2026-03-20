/**
 * Tests for server/utils/availability.ts
 *
 * calculateAvailableSlots is a pure function: busy periods in, time slots out.
 * This is the most important unit to test — it controls what prospects see
 * when booking a consultation.
 */
import { calculateAvailableSlots, type TimeSlot, type BusinessHours } from 'server/utils/availability'

// Helper: create a busy period in ISO strings for a given date
function busy(date: string, startHour: number, startMin: number, endHour: number, endMin: number) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    start: `${date}T${pad(startHour)}:${pad(startMin)}:00Z`,
    end: `${date}T${pad(endHour)}:${pad(endMin)}:00Z`
  }
}

// Use UTC timezone for predictable testing (no DST surprises)
const TZ = 'UTC'

describe('calculateAvailableSlots', () => {
  describe('basic slot generation', () => {
    it('generates 30-min interval slots within business hours', () => {
      // A far-future Monday with no busy periods
      const slots = calculateAvailableSlots([], '2030-01-07', TZ, 60)

      // Business hours 9-17 with 60-min duration: last slot starts at 16:00
      // 30-min intervals from 9:00 to 16:00 = 15 slots
      expect(slots.length).toBe(15)
      expect(slots.every(s => s.available)).toBe(true)
    })

    it('respects 30-minute slot duration', () => {
      const slots = calculateAvailableSlots([], '2030-01-07', TZ, 30)

      // 30-min slots from 9:00 to 16:30 = 16 slots
      expect(slots.length).toBe(16)
    })

    it('returns empty array for weekends', () => {
      // 2030-01-05 is a Saturday, 2030-01-06 is a Sunday
      const saturday = calculateAvailableSlots([], '2030-01-05', TZ, 60)
      const sunday = calculateAvailableSlots([], '2030-01-06', TZ, 60)

      expect(saturday).toEqual([])
      expect(sunday).toEqual([])
    })

    it('generates slots for all weekdays', () => {
      // Mon-Fri of the same week in 2030
      const weekdays = ['2030-01-07', '2030-01-08', '2030-01-09', '2030-01-10', '2030-01-11']
      for (const day of weekdays) {
        const slots = calculateAvailableSlots([], day, TZ, 60)
        expect(slots.length).toBeGreaterThan(0)
      }
    })
  })

  describe('busy period filtering', () => {
    it('marks slots as unavailable when overlapping a busy period', () => {
      const busyPeriods = [busy('2030-01-07', 10, 0, 11, 0)]
      const slots = calculateAvailableSlots(busyPeriods, '2030-01-07', TZ, 60)

      // The 10:00 slot (10:00-11:00) should be blocked
      const tenAm = slots.find(s => s.startTime.includes('T10:00'))
      expect(tenAm?.available).toBe(false)

      // 9:00 and 11:00 should still be available
      const nineAm = slots.find(s => s.startTime.includes('T09:00'))
      const elevenAm = slots.find(s => s.startTime.includes('T11:00'))
      expect(nineAm?.available).toBe(true)
      expect(elevenAm?.available).toBe(true)
    })

    it('blocks slots that partially overlap a busy period', () => {
      // Busy 10:15-10:45 should block the 10:00 (10:00-11:00) and 10:30 (10:30-11:30) slots
      const busyPeriods = [busy('2030-01-07', 10, 15, 10, 45)]
      const slots = calculateAvailableSlots(busyPeriods, '2030-01-07', TZ, 60)

      const ten = slots.find(s => s.startTime.includes('T10:00'))
      const tenThirty = slots.find(s => s.startTime.includes('T10:30'))
      expect(ten?.available).toBe(false)
      expect(tenThirty?.available).toBe(false)
    })

    it('handles multiple busy periods', () => {
      const busyPeriods = [
        busy('2030-01-07', 9, 0, 10, 0), // blocks 9:00
        busy('2030-01-07', 14, 0, 15, 0) // blocks 14:00
      ]
      const slots = calculateAvailableSlots(busyPeriods, '2030-01-07', TZ, 60)

      const nineAm = slots.find(s => s.startTime.includes('T09:00'))
      const twoPm = slots.find(s => s.startTime.includes('T14:00'))
      const elevenAm = slots.find(s => s.startTime.includes('T11:00'))

      expect(nineAm?.available).toBe(false)
      expect(twoPm?.available).toBe(false)
      expect(elevenAm?.available).toBe(true)
    })

    it('blocks all slots when entire day is busy', () => {
      const busyPeriods = [busy('2030-01-07', 0, 0, 23, 59)]
      const slots = calculateAvailableSlots(busyPeriods, '2030-01-07', TZ, 60)

      expect(slots.every(s => !s.available)).toBe(true)
    })

    it('handles back-to-back busy periods', () => {
      const busyPeriods = [
        busy('2030-01-07', 10, 0, 11, 0),
        busy('2030-01-07', 11, 0, 12, 0)
      ]
      const slots = calculateAvailableSlots(busyPeriods, '2030-01-07', TZ, 60)

      const ten = slots.find(s => s.startTime.includes('T10:00'))
      const tenThirty = slots.find(s => s.startTime.includes('T10:30'))
      const eleven = slots.find(s => s.startTime.includes('T11:00'))
      const elevenThirty = slots.find(s => s.startTime.includes('T11:30'))

      expect(ten?.available).toBe(false)
      expect(tenThirty?.available).toBe(false)
      expect(eleven?.available).toBe(false)
      expect(elevenThirty?.available).toBe(false)
    })
  })

  describe('slot duration variations', () => {
    it('generates fewer slots with longer duration', () => {
      const thirtyMin = calculateAvailableSlots([], '2030-01-07', TZ, 30)
      const sixtyMin = calculateAvailableSlots([], '2030-01-07', TZ, 60)
      const ninetyMin = calculateAvailableSlots([], '2030-01-07', TZ, 90)

      expect(thirtyMin.length).toBeGreaterThan(sixtyMin.length)
      expect(sixtyMin.length).toBeGreaterThan(ninetyMin.length)
    })

    it('prevents slots that would extend past business hours', () => {
      const slots = calculateAvailableSlots([], '2030-01-07', TZ, 120) // 2-hour slots

      // Last 2-hour slot: 15:00-17:00. No slot should start after 15:00.
      for (const slot of slots) {
        const startHour = new Date(slot.startTime).getUTCHours()
        const endHour = new Date(slot.endTime).getUTCHours()
        expect(endHour).toBeLessThanOrEqual(17)
      }
    })

    it('returns no slots if duration exceeds business hours', () => {
      // 9-hour duration can't fit in 8-hour business day
      const slots = calculateAvailableSlots([], '2030-01-07', TZ, 540)
      expect(slots).toEqual([])
    })
  })

  describe('past time filtering', () => {
    it('excludes slots in the past', () => {
      // Use today's date — some slots will be in the past
      const today = new Date()
      const dateStr = today.toISOString().slice(0, 10)

      // Only test on a weekday
      const dayOfWeek = today.getUTCDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) return // skip weekends

      const slots = calculateAvailableSlots([], dateStr, TZ, 60)

      const now = new Date()
      for (const slot of slots) {
        expect(new Date(slot.startTime).getTime()).toBeGreaterThan(now.getTime())
      }
    })
  })

  describe('custom business hours', () => {
    it('respects custom start/end hours', () => {
      const customHours: BusinessHours = { start: 10, end: 14, days: [1, 2, 3, 4, 5] }
      const slots = calculateAvailableSlots([], '2030-01-07', TZ, 60, customHours)

      // 10:00-14:00 with 60-min slots at 30-min intervals: 10:00, 10:30, 11:00, 11:30, 12:00, 12:30, 13:00 = 7
      expect(slots.length).toBe(7)

      for (const slot of slots) {
        const startHour = new Date(slot.startTime).getUTCHours()
        expect(startHour).toBeGreaterThanOrEqual(10)
        expect(startHour).toBeLessThan(14)
      }
    })

    it('respects custom working days', () => {
      // Only Saturday and Sunday
      const weekendHours: BusinessHours = { start: 9, end: 17, days: [0, 6] }

      const saturday = calculateAvailableSlots([], '2030-01-05', TZ, 60, weekendHours)
      const monday = calculateAvailableSlots([], '2030-01-07', TZ, 60, weekendHours)

      expect(saturday.length).toBeGreaterThan(0)
      expect(monday).toEqual([])
    })
  })

  describe('slot structure', () => {
    it('returns properly structured TimeSlot objects', () => {
      const slots = calculateAvailableSlots([], '2030-01-07', TZ, 60)

      for (const slot of slots) {
        expect(slot).toHaveProperty('startTime')
        expect(slot).toHaveProperty('endTime')
        expect(slot).toHaveProperty('available')
        expect(typeof slot.startTime).toBe('string')
        expect(typeof slot.endTime).toBe('string')
        expect(typeof slot.available).toBe('boolean')
      }
    })

    it('produces ISO 8601 timestamps', () => {
      const slots = calculateAvailableSlots([], '2030-01-07', TZ, 60)

      for (const slot of slots) {
        expect(() => new Date(slot.startTime)).not.toThrow()
        expect(() => new Date(slot.endTime)).not.toThrow()
        expect(new Date(slot.startTime).toISOString()).toBe(slot.startTime)
      }
    })

    it('end time is exactly duration minutes after start time', () => {
      const duration = 60
      const slots = calculateAvailableSlots([], '2030-01-07', TZ, duration)

      for (const slot of slots) {
        const start = new Date(slot.startTime).getTime()
        const end = new Date(slot.endTime).getTime()
        expect(end - start).toBe(duration * 60 * 1000)
      }
    })

    it('slots are sorted by start time', () => {
      const slots = calculateAvailableSlots([], '2030-01-07', TZ, 60)

      for (let i = 1; i < slots.length; i++) {
        const prev = new Date(slots[i - 1].startTime).getTime()
        const curr = new Date(slots[i].startTime).getTime()
        expect(curr).toBeGreaterThan(prev)
      }
    })
  })

  describe('edge cases', () => {
    it('handles empty busy periods array', () => {
      const slots = calculateAvailableSlots([], '2030-01-07', TZ, 60)
      expect(slots.length).toBeGreaterThan(0)
      expect(slots.every(s => s.available)).toBe(true)
    })

    it('handles busy period that starts before business hours', () => {
      const busyPeriods = [busy('2030-01-07', 7, 0, 10, 0)]
      const slots = calculateAvailableSlots(busyPeriods, '2030-01-07', TZ, 60)

      const nineAm = slots.find(s => s.startTime.includes('T09:00'))
      const nineThirty = slots.find(s => s.startTime.includes('T09:30'))
      const tenAm = slots.find(s => s.startTime.includes('T10:00'))

      expect(nineAm?.available).toBe(false)
      expect(nineThirty?.available).toBe(false)
      expect(tenAm?.available).toBe(true)
    })

    it('handles busy period that extends past business hours', () => {
      const busyPeriods = [busy('2030-01-07', 15, 0, 20, 0)]
      const slots = calculateAvailableSlots(busyPeriods, '2030-01-07', TZ, 60)

      const threePm = slots.find(s => s.startTime.includes('T15:00'))
      const twoPm = slots.find(s => s.startTime.includes('T14:00'))

      expect(threePm?.available).toBe(false)
      expect(twoPm?.available).toBe(true)
    })

    it('handles 1-minute busy period', () => {
      // A tiny busy period at 10:30 should still block the overlapping slots
      const busyPeriods = [busy('2030-01-07', 10, 30, 10, 31)]
      const slots = calculateAvailableSlots(busyPeriods, '2030-01-07', TZ, 60)

      // 10:00-11:00 overlaps with 10:30-10:31 → blocked
      const tenAm = slots.find(s => s.startTime.includes('T10:00'))
      // 10:30-11:30 overlaps with 10:30-10:31 → blocked
      const tenThirty = slots.find(s => s.startTime.includes('T10:30'))

      expect(tenAm?.available).toBe(false)
      expect(tenThirty?.available).toBe(false)
    })
  })
})
