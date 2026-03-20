/**
 * Tests for appointment activity descriptions in server/utils/activity-description.ts
 *
 * The generateDescription function is pure: activity type + actor + target in,
 * human-readable string out. Tests verify the new APPOINTMENT_* cases.
 */
import { generateDescription } from 'server/utils/activity-description'
import type { EntityRef } from 'server/utils/activity-logger'

const actor = 'Jane Doe'

function ref(type: string, name: string): EntityRef {
  return { type: type as any, id: 'test-id', name }
}

describe('Appointment Activity Descriptions', () => {
  describe('APPOINTMENT_CREATED', () => {
    it('includes appointment title', () => {
      const desc = generateDescription('APPOINTMENT_CREATED', actor, ref('appointment', 'Trust Review'))
      expect(desc).toBe('Jane Doe scheduled "Trust Review"')
    })

    it('includes client name when provided as related entity', () => {
      const target = ref('appointment', 'Initial Consultation')
      const related = [ref('client', 'John Smith')]
      const desc = generateDescription('APPOINTMENT_CREATED', actor, target, related)
      expect(desc).toBe('Jane Doe scheduled "Initial Consultation" with John Smith')
    })

    it('falls back when no target', () => {
      const desc = generateDescription('APPOINTMENT_CREATED', actor)
      expect(desc).toBe('Jane Doe scheduled an appointment')
    })
  })

  describe('APPOINTMENT_UPDATED', () => {
    it('includes appointment title', () => {
      const desc = generateDescription('APPOINTMENT_UPDATED', actor, ref('appointment', 'Signing Meeting'))
      expect(desc).toBe('Jane Doe updated appointment "Signing Meeting"')
    })

    it('falls back when no target', () => {
      const desc = generateDescription('APPOINTMENT_UPDATED', actor)
      expect(desc).toBe('Jane Doe updated an appointment')
    })
  })

  describe('APPOINTMENT_CANCELLED', () => {
    it('includes appointment title', () => {
      const desc = generateDescription('APPOINTMENT_CANCELLED', actor, ref('appointment', 'Follow-up Call'))
      expect(desc).toBe('Jane Doe cancelled appointment "Follow-up Call"')
    })

    it('falls back when no target', () => {
      const desc = generateDescription('APPOINTMENT_CANCELLED', actor)
      expect(desc).toBe('Jane Doe cancelled an appointment')
    })
  })

  describe('APPOINTMENT_TYPE_CREATED', () => {
    it('includes type name', () => {
      const desc = generateDescription('APPOINTMENT_TYPE_CREATED', actor, ref('appointment_type', 'WYDAPT Consultation'))
      expect(desc).toBe('Jane Doe created appointment type "WYDAPT Consultation"')
    })

    it('falls back when no target', () => {
      const desc = generateDescription('APPOINTMENT_TYPE_CREATED', actor)
      expect(desc).toBe('Jane Doe created an appointment type')
    })
  })

  describe('APPOINTMENT_TYPE_UPDATED', () => {
    it('includes type name', () => {
      const desc = generateDescription('APPOINTMENT_TYPE_UPDATED', actor, ref('appointment_type', 'Initial Meeting'))
      expect(desc).toBe('Jane Doe updated appointment type "Initial Meeting"')
    })

    it('falls back when no target', () => {
      const desc = generateDescription('APPOINTMENT_TYPE_UPDATED', actor)
      expect(desc).toBe('Jane Doe updated an appointment type')
    })
  })

  describe('APPOINTMENT_TYPE_DELETED', () => {
    it('includes type name', () => {
      const desc = generateDescription('APPOINTMENT_TYPE_DELETED', actor, ref('appointment_type', 'Old Type'))
      expect(desc).toBe('Jane Doe deleted appointment type "Old Type"')
    })

    it('falls back when no target', () => {
      const desc = generateDescription('APPOINTMENT_TYPE_DELETED', actor)
      expect(desc).toBe('Jane Doe deleted an appointment type')
    })
  })

  describe('consistency with other entity types', () => {
    it('appointment descriptions follow the same actor-verb-target pattern', () => {
      const apptCreated = generateDescription('APPOINTMENT_CREATED', actor, ref('appointment', 'Test'))
      const docCreated = generateDescription('DOCUMENT_CREATED', actor, ref('document', 'Test'))

      // Both should start with actor name
      expect(apptCreated.startsWith('Jane Doe')).toBe(true)
      expect(docCreated.startsWith('Jane Doe')).toBe(true)

      // Both should contain the entity name
      expect(apptCreated).toContain('Test')
      expect(docCreated).toContain('Test')
    })
  })
})
