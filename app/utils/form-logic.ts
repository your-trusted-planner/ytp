/**
 * Form Logic — pure functions for condition evaluation and field validation.
 *
 * Used by both the Vue composables (client-side) and the server-side
 * submission handler. No framework dependencies — fully unit-testable.
 */

import type {
  ConditionalLogic,
  ConditionalRule,
  FormField,
  FormFieldValue,
  PersonFieldTarget
} from '~/types/form'

// ─── Condition Evaluation ────────────────────────────────────────────────────

/**
 * Evaluate a single conditional rule against current form values.
 */
export function evaluateRule(
  rule: ConditionalRule,
  values: Record<string, FormFieldValue>
): boolean {
  const fieldValue = values[rule.fieldId]

  switch (rule.operator) {
    case 'is_empty':
      return fieldValue === null || fieldValue === undefined || fieldValue === '' ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)

    case 'is_not_empty':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '' &&
        !(Array.isArray(fieldValue) && fieldValue.length === 0)

    case 'eq': {
      const target = rule.value
      if (Array.isArray(fieldValue)) {
        return Array.isArray(target)
          ? JSON.stringify(fieldValue.sort()) === JSON.stringify([...target].sort())
          : fieldValue.includes(target as string)
      }
      return String(fieldValue ?? '') === String(target ?? '')
    }

    case 'neq': {
      const target = rule.value
      if (Array.isArray(fieldValue)) {
        return Array.isArray(target)
          ? JSON.stringify(fieldValue.sort()) !== JSON.stringify([...target].sort())
          : !fieldValue.includes(target as string)
      }
      return String(fieldValue ?? '') !== String(target ?? '')
    }

    case 'contains': {
      const target = String(rule.value ?? '')
      if (Array.isArray(fieldValue)) {
        return fieldValue.some(v => String(v).toLowerCase().includes(target.toLowerCase()))
      }
      return String(fieldValue ?? '').toLowerCase().includes(target.toLowerCase())
    }

    case 'not_contains': {
      const target = String(rule.value ?? '')
      if (Array.isArray(fieldValue)) {
        return !fieldValue.some(v => String(v).toLowerCase().includes(target.toLowerCase()))
      }
      return !String(fieldValue ?? '').toLowerCase().includes(target.toLowerCase())
    }

    default:
      return true
  }
}

/**
 * Evaluate conditional logic for a field. Returns true if the field should be visible.
 */
export function evaluateConditions(
  logic: ConditionalLogic | undefined,
  values: Record<string, FormFieldValue>
): boolean {
  if (!logic || !logic.rules || logic.rules.length === 0) {
    return true // No conditions = always visible
  }

  const results = logic.rules.map(rule => evaluateRule(rule, values))

  const conditionMet = logic.match === 'any'
    ? results.some(r => r)
    : results.every(r => r)

  // 'show' action: visible when condition met; 'hide' action: visible when condition NOT met
  return logic.action === 'show' ? conditionMet : !conditionMet
}

/**
 * Get the list of visible fields for a section, given current form values.
 */
export function getVisibleFields(
  fields: FormField[],
  values: Record<string, FormFieldValue>
): FormField[] {
  return fields.filter(f => evaluateConditions(f.conditionalLogic, values))
}

// ─── Validation ──────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/

export interface ValidationError {
  fieldId: string
  message: string
}

/**
 * Validate a single field value. Returns an error message or null if valid.
 */
export function validateField(
  field: FormField,
  value: FormFieldValue
): string | null {
  // Content blocks are display-only, never validated
  if (field.fieldType === 'content') return null

  const isEmpty = value === null || value === undefined || value === '' ||
    (Array.isArray(value) && value.length === 0)

  // Required check
  if (field.isRequired && isEmpty) {
    return `${field.label} is required`
  }

  // If empty and not required, skip format validation
  if (isEmpty) return null

  // Type-specific validation
  switch (field.fieldType) {
    case 'email':
      if (typeof value === 'string' && !EMAIL_REGEX.test(value)) {
        return 'Please enter a valid email address'
      }
      break

    case 'phone':
      if (typeof value === 'string' && !PHONE_REGEX.test(value)) {
        return 'Please enter a valid phone number'
      }
      break

    case 'number': {
      const num = Number(value)
      if (isNaN(num)) return 'Please enter a valid number'
      const config = field.config as { min?: number; max?: number } | undefined
      if (config?.min !== undefined && num < config.min) {
        return `Minimum value is ${config.min}`
      }
      if (config?.max !== undefined && num > config.max) {
        return `Maximum value is ${config.max}`
      }
      break
    }

    case 'select':
    case 'radio': {
      const config = field.config as { options?: string[] } | undefined
      if (config?.options && typeof value === 'string' && !config.options.includes(value)) {
        return 'Please select a valid option'
      }
      break
    }

    case 'multi_select':
    case 'checkbox': {
      const config = field.config as { options?: string[] } | undefined
      if (config?.options && Array.isArray(value)) {
        const invalid = value.filter(v => !config.options!.includes(v))
        if (invalid.length > 0) return 'One or more selections are invalid'
      }
      break
    }
  }

  return null
}

/**
 * Validate all visible fields in a section. Returns array of errors (empty = valid).
 */
export function validateSection(
  fields: FormField[],
  values: Record<string, FormFieldValue>
): ValidationError[] {
  const visibleFields = getVisibleFields(fields, values)
  const errors: ValidationError[] = []

  for (const field of visibleFields) {
    const error = validateField(field, values[field.id] ?? null)
    if (error) {
      errors.push({ fieldId: field.id, message: error })
    }
  }

  return errors
}

// ─── Person Field Extraction ─────────────────────────────────────────────────

/**
 * Extract person field values from form responses based on field mappings.
 */
export function extractPersonFields(
  fields: FormField[],
  values: Record<string, FormFieldValue>
): Partial<Record<PersonFieldTarget, string>> {
  const result: Partial<Record<PersonFieldTarget, string>> = {}

  for (const field of fields) {
    if (field.personFieldMapping && values[field.id]) {
      const val = values[field.id]
      if (typeof val === 'string' && val.trim()) {
        result[field.personFieldMapping] = val.trim()
      }
    }
  }

  return result
}
