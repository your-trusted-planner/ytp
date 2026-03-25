/**
 * Tests for server/utils/form-logic.ts
 *
 * Pure functions for condition evaluation, validation, and person field extraction.
 * These are the core business logic of the form system.
 */
import { describe, it, expect } from 'vitest'
import {
  evaluateRule,
  evaluateConditions,
  getVisibleFields,
  validateField,
  validateSection,
  extractPersonFields
} from 'app/utils/form-logic'
import type { FormField, ConditionalLogic, FormFieldValue } from 'app/types/form'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeField(overrides: Partial<FormField> = {}): FormField {
  return {
    id: 'field1',
    fieldType: 'text',
    label: 'Test Field',
    fieldOrder: 0,
    isRequired: false,
    ...overrides
  }
}

// ─── evaluateRule ────────────────────────────────────────────────────────────

describe('evaluateRule', () => {
  describe('eq operator', () => {
    it('matches equal string values', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'eq', value: 'yes' }, { f1: 'yes' })).toBe(true)
    })

    it('does not match different string values', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'eq', value: 'yes' }, { f1: 'no' })).toBe(false)
    })

    it('matches when array contains the target value', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'eq', value: 'a' }, { f1: ['a', 'b'] })).toBe(true)
    })

    it('does not match when array does not contain target', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'eq', value: 'c' }, { f1: ['a', 'b'] })).toBe(false)
    })

    it('handles null/undefined values', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'eq', value: '' }, { f1: null })).toBe(true)
      expect(evaluateRule({ fieldId: 'f1', operator: 'eq', value: 'x' }, {})).toBe(false)
    })
  })

  describe('neq operator', () => {
    it('matches different values', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'neq', value: 'yes' }, { f1: 'no' })).toBe(true)
    })

    it('does not match equal values', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'neq', value: 'yes' }, { f1: 'yes' })).toBe(false)
    })
  })

  describe('contains operator', () => {
    it('matches substring in string value', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'contains', value: 'plan' }, { f1: 'estate planning' })).toBe(true)
    })

    it('is case insensitive', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'contains', value: 'PLAN' }, { f1: 'estate planning' })).toBe(true)
    })

    it('matches in array elements', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'contains', value: 'plan' }, { f1: ['estate planning', 'trust'] })).toBe(true)
    })

    it('does not match when substring absent', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'contains', value: 'xyz' }, { f1: 'estate planning' })).toBe(false)
    })
  })

  describe('not_contains operator', () => {
    it('matches when substring is absent', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'not_contains', value: 'xyz' }, { f1: 'estate planning' })).toBe(true)
    })

    it('does not match when substring is present', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'not_contains', value: 'plan' }, { f1: 'estate planning' })).toBe(false)
    })
  })

  describe('is_empty operator', () => {
    it('matches null', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'is_empty' }, { f1: null })).toBe(true)
    })

    it('matches undefined', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'is_empty' }, {})).toBe(true)
    })

    it('matches empty string', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'is_empty' }, { f1: '' })).toBe(true)
    })

    it('matches empty array', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'is_empty' }, { f1: [] })).toBe(true)
    })

    it('does not match non-empty values', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'is_empty' }, { f1: 'hello' })).toBe(false)
    })
  })

  describe('is_not_empty operator', () => {
    it('matches non-empty string', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'is_not_empty' }, { f1: 'hello' })).toBe(true)
    })

    it('does not match empty string', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'is_not_empty' }, { f1: '' })).toBe(false)
    })

    it('does not match null', () => {
      expect(evaluateRule({ fieldId: 'f1', operator: 'is_not_empty' }, { f1: null })).toBe(false)
    })
  })
})

// ─── evaluateConditions ──────────────────────────────────────────────────────

describe('evaluateConditions', () => {
  it('returns true when no conditions', () => {
    expect(evaluateConditions(undefined, {})).toBe(true)
  })

  it('returns true when rules array is empty', () => {
    expect(evaluateConditions({ action: 'show', match: 'all', rules: [] }, {})).toBe(true)
  })

  describe('show action', () => {
    it('shows field when all conditions met (match: all)', () => {
      const logic: ConditionalLogic = {
        action: 'show',
        match: 'all',
        rules: [
          { fieldId: 'f1', operator: 'eq', value: 'yes' },
          { fieldId: 'f2', operator: 'is_not_empty' }
        ]
      }
      expect(evaluateConditions(logic, { f1: 'yes', f2: 'data' })).toBe(true)
    })

    it('hides field when not all conditions met (match: all)', () => {
      const logic: ConditionalLogic = {
        action: 'show',
        match: 'all',
        rules: [
          { fieldId: 'f1', operator: 'eq', value: 'yes' },
          { fieldId: 'f2', operator: 'is_not_empty' }
        ]
      }
      expect(evaluateConditions(logic, { f1: 'yes', f2: '' })).toBe(false)
    })

    it('shows field when any condition met (match: any)', () => {
      const logic: ConditionalLogic = {
        action: 'show',
        match: 'any',
        rules: [
          { fieldId: 'f1', operator: 'eq', value: 'yes' },
          { fieldId: 'f2', operator: 'eq', value: 'yes' }
        ]
      }
      expect(evaluateConditions(logic, { f1: 'no', f2: 'yes' })).toBe(true)
    })

    it('hides field when no conditions met (match: any)', () => {
      const logic: ConditionalLogic = {
        action: 'show',
        match: 'any',
        rules: [
          { fieldId: 'f1', operator: 'eq', value: 'yes' },
          { fieldId: 'f2', operator: 'eq', value: 'yes' }
        ]
      }
      expect(evaluateConditions(logic, { f1: 'no', f2: 'no' })).toBe(false)
    })
  })

  describe('hide action', () => {
    it('hides field when condition met', () => {
      const logic: ConditionalLogic = {
        action: 'hide',
        match: 'all',
        rules: [{ fieldId: 'f1', operator: 'eq', value: 'no' }]
      }
      expect(evaluateConditions(logic, { f1: 'no' })).toBe(false)
    })

    it('shows field when condition not met', () => {
      const logic: ConditionalLogic = {
        action: 'hide',
        match: 'all',
        rules: [{ fieldId: 'f1', operator: 'eq', value: 'no' }]
      }
      expect(evaluateConditions(logic, { f1: 'yes' })).toBe(true)
    })
  })
})

// ─── getVisibleFields ────────────────────────────────────────────────────────

describe('getVisibleFields', () => {
  it('returns all fields when none have conditions', () => {
    const fields = [makeField({ id: 'a' }), makeField({ id: 'b' })]
    expect(getVisibleFields(fields, {})).toHaveLength(2)
  })

  it('filters out conditionally hidden fields', () => {
    const fields: FormField[] = [
      makeField({ id: 'married', fieldType: 'yes_no' }),
      makeField({
        id: 'spouse_name',
        conditionalLogic: { action: 'show', match: 'all', rules: [{ fieldId: 'married', operator: 'eq', value: 'yes' }] }
      })
    ]
    expect(getVisibleFields(fields, { married: 'no' })).toHaveLength(1)
    expect(getVisibleFields(fields, { married: 'yes' })).toHaveLength(2)
  })
})

// ─── validateField ───────────────────────────────────────────────────────────

describe('validateField', () => {
  describe('required check', () => {
    it('returns error for empty required field', () => {
      const field = makeField({ isRequired: true, label: 'Name' })
      expect(validateField(field, '')).toBe('Name is required')
      expect(validateField(field, null)).toBe('Name is required')
    })

    it('returns error for empty required array field', () => {
      const field = makeField({ isRequired: true, fieldType: 'multi_select', label: 'Options' })
      expect(validateField(field, [])).toBe('Options is required')
    })

    it('passes for non-empty required field', () => {
      const field = makeField({ isRequired: true })
      expect(validateField(field, 'John')).toBeNull()
    })

    it('passes for empty optional field', () => {
      const field = makeField({ isRequired: false })
      expect(validateField(field, '')).toBeNull()
    })
  })

  describe('email validation', () => {
    it('rejects invalid email', () => {
      const field = makeField({ fieldType: 'email' })
      expect(validateField(field, 'not-an-email')).toBe('Please enter a valid email address')
    })

    it('accepts valid email', () => {
      const field = makeField({ fieldType: 'email' })
      expect(validateField(field, 'test@example.com')).toBeNull()
    })

    it('skips validation for empty non-required email', () => {
      const field = makeField({ fieldType: 'email', isRequired: false })
      expect(validateField(field, '')).toBeNull()
    })
  })

  describe('phone validation', () => {
    it('rejects too-short phone', () => {
      const field = makeField({ fieldType: 'phone' })
      expect(validateField(field, '123')).toBe('Please enter a valid phone number')
    })

    it('accepts valid phone formats', () => {
      const field = makeField({ fieldType: 'phone' })
      expect(validateField(field, '970-820-0090')).toBeNull()
      expect(validateField(field, '(970) 820-0090')).toBeNull()
      expect(validateField(field, '+1 970 820 0090')).toBeNull()
    })
  })

  describe('number validation', () => {
    it('rejects non-numeric value', () => {
      const field = makeField({ fieldType: 'number' })
      expect(validateField(field, 'abc')).toBe('Please enter a valid number')
    })

    it('validates min/max', () => {
      const field = makeField({ fieldType: 'number', config: { min: 0, max: 100 } })
      expect(validateField(field, -1)).toBe('Minimum value is 0')
      expect(validateField(field, 101)).toBe('Maximum value is 100')
      expect(validateField(field, 50)).toBeNull()
    })
  })

  describe('select validation', () => {
    it('rejects value not in options', () => {
      const field = makeField({ fieldType: 'select', config: { options: ['a', 'b', 'c'] } })
      expect(validateField(field, 'z')).toBe('Please select a valid option')
    })

    it('accepts value in options', () => {
      const field = makeField({ fieldType: 'select', config: { options: ['a', 'b', 'c'] } })
      expect(validateField(field, 'b')).toBeNull()
    })
  })

  describe('multi_select validation', () => {
    it('rejects invalid selections', () => {
      const field = makeField({ fieldType: 'multi_select', config: { options: ['a', 'b'] } })
      expect(validateField(field, ['a', 'z'])).toBe('One or more selections are invalid')
    })

    it('accepts valid selections', () => {
      const field = makeField({ fieldType: 'multi_select', config: { options: ['a', 'b', 'c'] } })
      expect(validateField(field, ['a', 'c'])).toBeNull()
    })
  })
})

// ─── validateSection ─────────────────────────────────────────────────────────

describe('validateSection', () => {
  it('validates only visible fields', () => {
    const fields: FormField[] = [
      makeField({ id: 'name', isRequired: true, label: 'Name' }),
      makeField({
        id: 'hidden_field',
        isRequired: true,
        label: 'Hidden',
        conditionalLogic: { action: 'show', match: 'all', rules: [{ fieldId: 'name', operator: 'eq', value: 'trigger' }] }
      })
    ]
    // hidden_field is not visible because name != 'trigger', so only name is validated
    const errors = validateSection(fields, { name: '' })
    expect(errors).toHaveLength(1)
    expect(errors[0]!.fieldId).toBe('name')
  })

  it('returns empty array when all valid', () => {
    const fields: FormField[] = [
      makeField({ id: 'name', isRequired: true }),
      makeField({ id: 'email', fieldType: 'email' })
    ]
    expect(validateSection(fields, { name: 'John', email: 'j@test.com' })).toEqual([])
  })

  it('returns multiple errors', () => {
    const fields: FormField[] = [
      makeField({ id: 'name', isRequired: true, label: 'Name' }),
      makeField({ id: 'email', fieldType: 'email', isRequired: true, label: 'Email' })
    ]
    const errors = validateSection(fields, { name: '', email: '' })
    expect(errors).toHaveLength(2)
  })
})

// ─── extractPersonFields ─────────────────────────────────────────────────────

describe('extractPersonFields', () => {
  it('extracts mapped fields', () => {
    const fields: FormField[] = [
      makeField({ id: 'fn', personFieldMapping: 'firstName' }),
      makeField({ id: 'ln', personFieldMapping: 'lastName' }),
      makeField({ id: 'em', personFieldMapping: 'email' }),
      makeField({ id: 'notes' }) // no mapping
    ]
    const result = extractPersonFields(fields, { fn: 'John', ln: 'Smith', em: 'j@test.com', notes: 'hello' })
    expect(result).toEqual({ firstName: 'John', lastName: 'Smith', email: 'j@test.com' })
  })

  it('skips empty values', () => {
    const fields: FormField[] = [
      makeField({ id: 'fn', personFieldMapping: 'firstName' }),
      makeField({ id: 'ln', personFieldMapping: 'lastName' })
    ]
    expect(extractPersonFields(fields, { fn: 'John', ln: '' })).toEqual({ firstName: 'John' })
  })

  it('trims values', () => {
    const fields: FormField[] = [
      makeField({ id: 'fn', personFieldMapping: 'firstName' })
    ]
    expect(extractPersonFields(fields, { fn: '  John  ' })).toEqual({ firstName: 'John' })
  })

  it('returns empty object when no mappings', () => {
    const fields: FormField[] = [makeField({ id: 'a' }), makeField({ id: 'b' })]
    expect(extractPersonFields(fields, { a: 'x', b: 'y' })).toEqual({})
  })
})
