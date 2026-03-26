/**
 * Form system types — shared between frontend components and API layer.
 *
 * These types define the canonical shape of form definitions, fields,
 * conditions, and submissions. They are used by:
 * - FormRenderer (renders a form from a definition)
 * - FormBuilder (admin UI for creating/editing forms)
 * - useFormState / useFormValidation composables
 * - Server-side submission validation
 */

// ─── Field Types ─────────────────────────────────────────────────────────────

export type FieldType =
  | 'text' | 'textarea' | 'email' | 'phone' | 'number' | 'date'
  | 'select' | 'multi_select' | 'radio' | 'checkbox'
  | 'yes_no' | 'file_upload' | 'scheduler' | 'content'

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Short Text',
  textarea: 'Long Text',
  email: 'Email',
  phone: 'Phone',
  number: 'Number',
  date: 'Date',
  select: 'Dropdown',
  multi_select: 'Multi-Select',
  radio: 'Radio Buttons',
  checkbox: 'Checkboxes',
  yes_no: 'Yes / No',
  file_upload: 'File Upload',
  scheduler: 'Appointment Scheduler',
  content: 'Content Block'
}

// ─── Person Field Mapping ────────────────────────────────────────────────────

export type PersonFieldTarget =
  | 'firstName' | 'lastName' | 'email' | 'phone'
  | 'address' | 'city' | 'state' | 'zipCode'
  | 'dateOfBirth' | 'country' | 'maritalStatus'

export const PERSON_FIELD_OPTIONS: Array<{ value: PersonFieldTarget; label: string }> = [
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'zipCode', label: 'Zip Code' },
  { value: 'country', label: 'Country' },
  { value: 'dateOfBirth', label: 'Date of Birth' },
  { value: 'maritalStatus', label: 'Marital Status' }
]

// ─── Conditional Logic ───────────────────────────────────────────────────────

export type ConditionalOperator = 'eq' | 'neq' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty'

export interface ConditionalRule {
  fieldId: string
  operator: ConditionalOperator
  value?: string | string[]
}

export interface ConditionalLogic {
  action: 'show' | 'hide'
  match: 'all' | 'any'
  rules: ConditionalRule[]
}

// ─── Field Configuration (type-specific) ─────────────────────────────────────

export interface BaseFieldConfig {
  placeholder?: string
  helpText?: string
}

export interface SelectFieldConfig extends BaseFieldConfig {
  options: string[]
  allowOther?: boolean
}

export interface FileUploadFieldConfig extends BaseFieldConfig {
  accept?: string[]
  maxSizeMb?: number
  maxFiles?: number
}

export interface SchedulerFieldConfig extends BaseFieldConfig {
  appointmentTypeId: string
  durationOverrideMinutes?: number
  allowAttorneySelection?: boolean
}

export interface NumberFieldConfig extends BaseFieldConfig {
  min?: number
  max?: number
  step?: number
}

export interface ContentFieldConfig extends BaseFieldConfig {
  html: string
}

export type FormFieldConfig =
  | SelectFieldConfig
  | FileUploadFieldConfig
  | SchedulerFieldConfig
  | NumberFieldConfig
  | ContentFieldConfig
  | BaseFieldConfig

// ─── Form Definition ─────────────────────────────────────────────────────────

export interface FormField {
  id: string
  fieldType: FieldType
  label: string
  fieldOrder: number
  isRequired: boolean
  /** Grid column span (1-12). Default 12 (full width). */
  colSpan?: number
  config?: FormFieldConfig
  conditionalLogic?: ConditionalLogic
  personFieldMapping?: PersonFieldTarget
}

export interface FormSection {
  id: string
  title?: string
  description?: string
  sectionOrder: number
  fields: FormField[]
}

export interface FormSettings {
  submitButtonLabel?: string
  successMessage?: string
  redirectUrl?: string
  requireAuth?: boolean
}

export interface FormDefinition {
  id: string
  name: string
  slug: string
  description?: string
  formType: 'questionnaire' | 'intake' | 'standalone' | 'action'
  isMultiStep: boolean
  isPublic: boolean
  isActive: boolean
  settings?: FormSettings
  sections: FormSection[]
}

// ─── Form Values & Submission ────────────────────────────────────────────────

export type FormFieldValue = string | string[] | boolean | number | null

export interface SchedulerSlotValue {
  startTime: string
  endTime: string
  timezone: string
  attorneyId?: string
  appointmentTypeId: string
}

export interface FormSubmissionPayload {
  /** Field values keyed by field ID */
  responses: Record<string, FormFieldValue>
  /** Extracted person fields from personFieldMapping */
  personFields: Partial<Record<PersonFieldTarget, string>>
  /** Slot selection if form contains a scheduler field */
  schedulerSlot?: SchedulerSlotValue
  /** Turnstile CAPTCHA token (present on public forms) */
  turnstileToken?: string
}

// ─── Scheduler Context (passed to FormRenderer when form has scheduler fields) ─

export interface SchedulerContext {
  attorneyIds?: string[]
  timezone?: string
}

// ─── Admin/API Types ─────────────────────────────────────────────────────────

export interface FormSummary {
  id: string
  name: string
  slug: string
  description?: string | null
  formType: string
  isMultiStep: boolean
  isActive: boolean
  fieldCount: number
  sectionCount: number
  createdAt: number
  updatedAt: number
}
