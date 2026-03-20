/**
 * Tests for appointment types validation, slug generation, and business logic.
 */
import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// --- Slug generation (replicated from server/api/admin/appointment-types/index.post.ts) ---

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// --- Create schema (replicated) ---

const createSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().max(2000).optional(),
  defaultDurationMinutes: z.number().int().min(5).max(480).default(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  consultationFee: z.number().int().min(0).default(0),
  consultationFeeEnabled: z.boolean().default(false),
  questionnaireId: z.string().optional(),
  serviceCatalogId: z.string().optional(),
  assignedAttorneyIds: z.array(z.string()).nullable().optional(),
  businessHours: z.object({
    start: z.number().int().min(0).max(23),
    end: z.number().int().min(1).max(24),
    days: z.array(z.number().int().min(0).max(6))
  }).nullable().optional(),
  defaultLocation: z.string().max(500).optional(),
  isPubliclyBookable: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0)
})

// --- Update schema (replicated) ---

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().max(2000).nullable().optional(),
  defaultDurationMinutes: z.number().int().min(5).max(480).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  consultationFee: z.number().int().min(0).optional(),
  consultationFeeEnabled: z.boolean().optional(),
  questionnaireId: z.string().nullable().optional(),
  serviceCatalogId: z.string().nullable().optional(),
  assignedAttorneyIds: z.array(z.string()).nullable().optional(),
  businessHours: z.object({
    start: z.number().int().min(0).max(23),
    end: z.number().int().min(1).max(24),
    days: z.array(z.number().int().min(0).max(6))
  }).nullable().optional(),
  defaultLocation: z.string().max(500).nullable().optional(),
  isPubliclyBookable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional()
})

// --- Tests ---

describe('Slug Generation', () => {
  it('converts name to lowercase hyphenated slug', () => {
    expect(slugify('Initial WYDAPT Consultation')).toBe('initial-wydapt-consultation')
  })

  it('handles special characters', () => {
    expect(slugify('Estate Plan Review (30-min)')).toBe('estate-plan-review-30-min')
  })

  it('collapses consecutive hyphens', () => {
    expect(slugify('Trust --- Formation')).toBe('trust-formation')
  })

  it('strips leading and trailing hyphens', () => {
    expect(slugify('---hello world---')).toBe('hello-world')
  })

  it('handles underscores as separators', () => {
    expect(slugify('my_appointment_type')).toBe('my-appointment-type')
  })

  it('handles empty after stripping', () => {
    expect(slugify('!!!@@@###')).toBe('')
  })
})

describe('Create Schema Validation', () => {
  it('accepts minimal valid input', () => {
    const result = createSchema.safeParse({ name: 'Consultation' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Consultation')
      expect(result.data.defaultDurationMinutes).toBe(60)
      expect(result.data.color).toBe('#6366f1')
      expect(result.data.consultationFee).toBe(0)
      expect(result.data.consultationFeeEnabled).toBe(false)
      expect(result.data.isPubliclyBookable).toBe(false)
      expect(result.data.isActive).toBe(true)
      expect(result.data.displayOrder).toBe(0)
    }
  })

  it('rejects empty name', () => {
    const result = createSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('validates slug format (lowercase, hyphens only)', () => {
    const valid = createSchema.safeParse({ name: 'Test', slug: 'initial-consultation' })
    expect(valid.success).toBe(true)

    const invalid = createSchema.safeParse({ name: 'Test', slug: 'Initial Consultation' })
    expect(invalid.success).toBe(false)

    const invalidChars = createSchema.safeParse({ name: 'Test', slug: 'test_slug' })
    expect(invalidChars.success).toBe(false)
  })

  it('validates hex color format', () => {
    const valid = createSchema.safeParse({ name: 'Test', color: '#3b82f6' })
    expect(valid.success).toBe(true)

    const invalid = createSchema.safeParse({ name: 'Test', color: 'blue' })
    expect(invalid.success).toBe(false)

    const short = createSchema.safeParse({ name: 'Test', color: '#fff' })
    expect(short.success).toBe(false)
  })

  it('validates duration range', () => {
    const tooShort = createSchema.safeParse({ name: 'Test', defaultDurationMinutes: 1 })
    expect(tooShort.success).toBe(false)

    const tooLong = createSchema.safeParse({ name: 'Test', defaultDurationMinutes: 500 })
    expect(tooLong.success).toBe(false)

    const valid = createSchema.safeParse({ name: 'Test', defaultDurationMinutes: 30 })
    expect(valid.success).toBe(true)
  })

  it('accepts null assignedAttorneyIds (any staff)', () => {
    const result = createSchema.safeParse({ name: 'Test', assignedAttorneyIds: null })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.assignedAttorneyIds).toBeNull()
    }
  })

  it('accepts specific attorney IDs', () => {
    const result = createSchema.safeParse({ name: 'Test', assignedAttorneyIds: ['user-1', 'user-2'] })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.assignedAttorneyIds).toEqual(['user-1', 'user-2'])
    }
  })

  it('validates business hours structure', () => {
    const valid = createSchema.safeParse({
      name: 'Test',
      businessHours: { start: 9, end: 17, days: [1, 2, 3, 4, 5] }
    })
    expect(valid.success).toBe(true)

    const nullHours = createSchema.safeParse({ name: 'Test', businessHours: null })
    expect(nullHours.success).toBe(true)

    const invalidStart = createSchema.safeParse({
      name: 'Test',
      businessHours: { start: 25, end: 17, days: [1] }
    })
    expect(invalidStart.success).toBe(false)

    const invalidDay = createSchema.safeParse({
      name: 'Test',
      businessHours: { start: 9, end: 17, days: [8] }
    })
    expect(invalidDay.success).toBe(false)
  })
})

describe('Update Schema Validation', () => {
  it('accepts partial updates', () => {
    const result = updateSchema.safeParse({ name: 'New Name' })
    expect(result.success).toBe(true)
  })

  it('accepts empty update (only updatedAt will change)', () => {
    const result = updateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('allows nullable fields to be set to null', () => {
    const result = updateSchema.safeParse({
      description: null,
      questionnaireId: null,
      assignedAttorneyIds: null,
      businessHours: null,
      defaultLocation: null
    })
    expect(result.success).toBe(true)
  })
})

describe('Consultation Fee Logic', () => {
  it('fee=0 + enabled=false means skip payment', () => {
    const result = createSchema.parse({ name: 'Free Consult', consultationFee: 0, consultationFeeEnabled: false })
    expect(result.consultationFeeEnabled).toBe(false)
    expect(result.consultationFee).toBe(0)
  })

  it('fee>0 + enabled=true means require payment', () => {
    const result = createSchema.parse({ name: 'Paid Consult', consultationFee: 37500, consultationFeeEnabled: true })
    expect(result.consultationFeeEnabled).toBe(true)
    expect(result.consultationFee).toBe(37500)
  })

  it('fee>0 + enabled=false means fee configured but waived', () => {
    const result = createSchema.parse({ name: 'Waived Consult', consultationFee: 37500, consultationFeeEnabled: false })
    expect(result.consultationFeeEnabled).toBe(false)
    expect(result.consultationFee).toBe(37500)
  })

  it('rejects negative fees', () => {
    const result = createSchema.safeParse({ name: 'Test', consultationFee: -100 })
    expect(result.success).toBe(false)
  })
})

describe('Public Visibility', () => {
  it('defaults to not publicly bookable', () => {
    const result = createSchema.parse({ name: 'Internal Type' })
    expect(result.isPubliclyBookable).toBe(false)
  })

  it('can be set to publicly bookable', () => {
    const result = createSchema.parse({ name: 'Public Type', isPubliclyBookable: true })
    expect(result.isPubliclyBookable).toBe(true)
  })

  it('defaults to active', () => {
    const result = createSchema.parse({ name: 'New Type' })
    expect(result.isActive).toBe(true)
  })
})
