/**
 * Tests for app/composables/useFormBuilder.ts
 *
 * Tests the builder's local state management: sections, fields,
 * reordering, drag-and-drop, and field selection.
 */
import { describe, it, expect, beforeEach } from 'vitest'

// Mock Vue reactivity for composable testing
import { ref, computed } from 'vue'

// We need to test the composable functions directly.
// Since useFormBuilder uses Vue reactivity, we import it in a Vue-compatible test env.
import { useFormBuilder } from 'app/composables/useFormBuilder'

describe('useFormBuilder', () => {
  let builder: ReturnType<typeof useFormBuilder>

  beforeEach(() => {
    builder = useFormBuilder()
  })

  describe('initialization', () => {
    it('starts with one empty section', () => {
      expect(builder.definition.value.sections).toHaveLength(1)
      expect(builder.definition.value.sections[0].fields).toHaveLength(0)
    })

    it('starts not dirty', () => {
      expect(builder.isDirty.value).toBe(false)
    })

    it('starts with no selection', () => {
      expect(builder.selectedFieldId.value).toBeNull()
      expect(builder.selectedField.value).toBeNull()
    })
  })

  describe('loadDefinition', () => {
    it('loads a definition and resets state', () => {
      builder.addField(builder.definition.value.sections[0].id, 'text', 'Name')
      expect(builder.isDirty.value).toBe(true)

      builder.loadDefinition({
        id: 'test-form',
        name: 'Test',
        slug: 'test',
        formType: 'questionnaire',
        isMultiStep: false,
        isPublic: false,
        isActive: true,
        sections: [{
          id: 'sec-1',
          sectionOrder: 0,
          fields: [{ id: 'f-1', fieldType: 'email', label: 'Email', fieldOrder: 0, isRequired: true }]
        }]
      })

      expect(builder.isDirty.value).toBe(false)
      expect(builder.selectedFieldId.value).toBeNull()
      expect(builder.definition.value.sections[0].fields[0].label).toBe('Email')
    })
  })

  describe('section management', () => {
    it('adds a section', () => {
      builder.addSection('Page 2')
      expect(builder.definition.value.sections).toHaveLength(2)
      expect(builder.definition.value.sections[1].title).toBe('Page 2')
      expect(builder.isDirty.value).toBe(true)
    })

    it('removes a section', () => {
      builder.addSection('Page 2')
      const id = builder.definition.value.sections[1].id
      builder.removeSection(id)
      expect(builder.definition.value.sections).toHaveLength(1)
    })

    it('does not remove the last section', () => {
      const id = builder.definition.value.sections[0].id
      builder.removeSection(id)
      expect(builder.definition.value.sections).toHaveLength(1)
    })

    it('updates section title', () => {
      const id = builder.definition.value.sections[0].id
      builder.updateSection(id, { title: 'Contact Info' })
      expect(builder.definition.value.sections[0].title).toBe('Contact Info')
    })

    it('moves sections up and down', () => {
      builder.addSection('Second')
      builder.addSection('Third')

      const thirdId = builder.definition.value.sections[2].id
      builder.moveSectionUp(thirdId)
      expect(builder.definition.value.sections[1].id).toBe(thirdId)

      builder.moveSectionDown(thirdId)
      expect(builder.definition.value.sections[2].id).toBe(thirdId)
    })
  })

  describe('field management', () => {
    it('adds a field with default label', () => {
      const sectionId = builder.definition.value.sections[0].id
      const field = builder.addField(sectionId, 'text')
      expect(field.label).toBe('Text Field')
      expect(field.fieldType).toBe('text')
      expect(field.isRequired).toBe(false)
    })

    it('adds a field with custom label', () => {
      const sectionId = builder.definition.value.sections[0].id
      const field = builder.addField(sectionId, 'email', 'Work Email')
      expect(field.label).toBe('Work Email')
    })

    it('auto-selects newly added field', () => {
      const sectionId = builder.definition.value.sections[0].id
      const field = builder.addField(sectionId, 'text')
      expect(builder.selectedFieldId.value).toBe(field.id)
    })

    it('adds default options for select/radio/multi_select/checkbox', () => {
      const sectionId = builder.definition.value.sections[0].id

      const select = builder.addField(sectionId, 'select')
      expect((select.config as any)?.options).toEqual(['Option 1', 'Option 2'])

      const radio = builder.addField(sectionId, 'radio')
      expect((radio.config as any)?.options).toEqual(['Option 1', 'Option 2'])
    })

    it('adds default HTML for content fields', () => {
      const sectionId = builder.definition.value.sections[0].id
      const content = builder.addField(sectionId, 'content')
      expect((content.config as any)?.html).toContain('Enter your content')
    })

    it('removes a field', () => {
      const sectionId = builder.definition.value.sections[0].id
      builder.addField(sectionId, 'text', 'First')
      const second = builder.addField(sectionId, 'text', 'Second')

      builder.removeField(sectionId, second.id)
      expect(builder.definition.value.sections[0].fields).toHaveLength(1)
      expect(builder.definition.value.sections[0].fields[0].label).toBe('First')
    })

    it('clears selection when selected field is removed', () => {
      const sectionId = builder.definition.value.sections[0].id
      const field = builder.addField(sectionId, 'text')
      expect(builder.selectedFieldId.value).toBe(field.id)

      builder.removeField(sectionId, field.id)
      expect(builder.selectedFieldId.value).toBeNull()
    })

    it('updates a field', () => {
      const sectionId = builder.definition.value.sections[0].id
      const field = builder.addField(sectionId, 'text')
      builder.updateField(field.id, { label: 'Full Name', isRequired: true })

      const updated = builder.definition.value.sections[0].fields[0]
      expect(updated.label).toBe('Full Name')
      expect(updated.isRequired).toBe(true)
    })

    it('moves fields up and down', () => {
      const sectionId = builder.definition.value.sections[0].id
      builder.addField(sectionId, 'text', 'First')
      const second = builder.addField(sectionId, 'text', 'Second')
      builder.addField(sectionId, 'text', 'Third')

      builder.moveFieldUp(sectionId, second.id)
      expect(builder.definition.value.sections[0].fields[0].label).toBe('Second')
      expect(builder.definition.value.sections[0].fields[1].label).toBe('First')
    })
  })

  describe('swapFields', () => {
    it('swaps two fields within a section', () => {
      const sectionId = builder.definition.value.sections[0].id
      const first = builder.addField(sectionId, 'text', 'First')
      builder.addField(sectionId, 'text', 'Second')
      const third = builder.addField(sectionId, 'text', 'Third')

      builder.swapFields(sectionId, first.id, third.id)

      const labels = builder.definition.value.sections[0].fields.map(f => f.label)
      expect(labels).toEqual(['Second', 'Third', 'First'])
    })
  })

  describe('moveFieldToSection', () => {
    it('moves a field from one section to another', () => {
      builder.addSection('Section 2')
      const sec1 = builder.definition.value.sections[0].id
      const sec2 = builder.definition.value.sections[1].id

      const field = builder.addField(sec1, 'email', 'Email')
      builder.addField(sec1, 'text', 'Name')

      builder.moveFieldToSection(field.id, sec2)

      expect(builder.definition.value.sections[0].fields).toHaveLength(1)
      expect(builder.definition.value.sections[0].fields[0].label).toBe('Name')
      expect(builder.definition.value.sections[1].fields).toHaveLength(1)
      expect(builder.definition.value.sections[1].fields[0].label).toBe('Email')
    })
  })

  describe('allFields', () => {
    it('returns fields from all sections', () => {
      builder.addSection('Section 2')
      const sec1 = builder.definition.value.sections[0].id
      const sec2 = builder.definition.value.sections[1].id

      builder.addField(sec1, 'text', 'A')
      builder.addField(sec1, 'text', 'B')
      builder.addField(sec2, 'text', 'C')

      expect(builder.allFields.value).toHaveLength(3)
    })
  })
})
