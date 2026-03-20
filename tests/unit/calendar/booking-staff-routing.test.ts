/**
 * Tests for staff-specific booking link logic.
 *
 * These test the eligibility and routing rules for per-staff booking links.
 */
import { describe, it, expect } from 'vitest'

// Simulate the eligibility check logic from the public API endpoints

interface AppointmentType {
  assignedAttorneyIds: string[] | null
}

interface StaffMember {
  id: string
  hasActiveCalendar: boolean
}

/**
 * Determine if a staff member is eligible for a given appointment type.
 */
function isStaffEligible(type: AppointmentType, staff: StaffMember): { eligible: boolean, reason?: string } {
  if (!staff.hasActiveCalendar) {
    return { eligible: false, reason: 'Staff member does not have an active calendar' }
  }

  // null or empty array means any staff with a calendar is eligible
  if (!type.assignedAttorneyIds || type.assignedAttorneyIds.length === 0) {
    return { eligible: true }
  }

  if (!type.assignedAttorneyIds.includes(staff.id)) {
    return { eligible: false, reason: 'Staff member is not eligible for this appointment type' }
  }

  return { eligible: true }
}

/**
 * Determine which attorneys' availability to return for a generic booking link.
 */
function resolveEligibleAttorneys(
  type: AppointmentType,
  allStaff: StaffMember[]
): StaffMember[] {
  const staffWithCalendar = allStaff.filter(s => s.hasActiveCalendar)

  if (!type.assignedAttorneyIds || type.assignedAttorneyIds.length === 0) {
    // Any staff with an active calendar
    return staffWithCalendar
  }

  // Only assigned attorneys with active calendars
  return staffWithCalendar.filter(s => type.assignedAttorneyIds!.includes(s.id))
}

describe('Staff Eligibility', () => {
  const staffWithCalendar: StaffMember = { id: 'user-1', hasActiveCalendar: true }
  const staffWithoutCalendar: StaffMember = { id: 'user-2', hasActiveCalendar: false }
  const anotherStaff: StaffMember = { id: 'user-3', hasActiveCalendar: true }

  it('null assignedAttorneyIds allows any staff with calendar', () => {
    const type: AppointmentType = { assignedAttorneyIds: null }
    expect(isStaffEligible(type, staffWithCalendar).eligible).toBe(true)
  })

  it('empty array allows any staff with calendar (same as null)', () => {
    const type: AppointmentType = { assignedAttorneyIds: [] }
    expect(isStaffEligible(type, staffWithCalendar).eligible).toBe(true)
  })

  it('specific IDs restrict to those users', () => {
    const type: AppointmentType = { assignedAttorneyIds: ['user-1'] }
    expect(isStaffEligible(type, staffWithCalendar).eligible).toBe(true)
    expect(isStaffEligible(type, anotherStaff).eligible).toBe(false)
  })

  it('staff without active calendar is never eligible', () => {
    const type: AppointmentType = { assignedAttorneyIds: null }
    expect(isStaffEligible(type, staffWithoutCalendar).eligible).toBe(false)
    expect(isStaffEligible(type, staffWithoutCalendar).reason).toContain('calendar')
  })

  it('staff not in assigned list gets rejection reason', () => {
    const type: AppointmentType = { assignedAttorneyIds: ['user-1'] }
    const result = isStaffEligible(type, anotherStaff)
    expect(result.eligible).toBe(false)
    expect(result.reason).toContain('not eligible')
  })
})

describe('Generic Link Attorney Resolution', () => {
  const allStaff: StaffMember[] = [
    { id: 'user-1', hasActiveCalendar: true },
    { id: 'user-2', hasActiveCalendar: false },
    { id: 'user-3', hasActiveCalendar: true },
    { id: 'user-4', hasActiveCalendar: true }
  ]

  it('null assignedAttorneyIds returns all staff with calendars', () => {
    const type: AppointmentType = { assignedAttorneyIds: null }
    const eligible = resolveEligibleAttorneys(type, allStaff)
    expect(eligible).toHaveLength(3) // user-2 excluded (no calendar)
    expect(eligible.map(e => e.id)).toEqual(['user-1', 'user-3', 'user-4'])
  })

  it('empty array returns all staff with calendars (same as null)', () => {
    const type: AppointmentType = { assignedAttorneyIds: [] }
    const eligible = resolveEligibleAttorneys(type, allStaff)
    expect(eligible).toHaveLength(3)
  })

  it('specific IDs filter to assigned + calendar', () => {
    const type: AppointmentType = { assignedAttorneyIds: ['user-1', 'user-2'] }
    const eligible = resolveEligibleAttorneys(type, allStaff)
    expect(eligible).toHaveLength(1) // only user-1 (user-2 has no calendar)
    expect(eligible[0].id).toBe('user-1')
  })

  it('single eligible attorney for auto-assignment', () => {
    const type: AppointmentType = { assignedAttorneyIds: ['user-3'] }
    const eligible = resolveEligibleAttorneys(type, allStaff)
    expect(eligible).toHaveLength(1)
    expect(eligible[0].id).toBe('user-3')
  })

  it('no eligible attorneys when all assigned lack calendars', () => {
    const type: AppointmentType = { assignedAttorneyIds: ['user-2'] }
    const eligible = resolveEligibleAttorneys(type, allStaff)
    expect(eligible).toHaveLength(0)
  })
})
