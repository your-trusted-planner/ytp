import { nanoid } from 'nanoid'
import type {
  FormDefinition,
  FormSection,
  FormField,
  FieldType,
  FormFieldConfig
} from '~/types/form'

/**
 * Composable for managing form builder state.
 * Handles local mutations to sections/fields before persisting via the store.
 */
export function useFormBuilder(initial?: FormDefinition) {
  const definition = ref<FormDefinition>(initial || createEmptyDefinition())
  const selectedFieldId = ref<string | null>(null)
  const previewMode = ref(false)
  const isDirty = ref(false)

  function markDirty() {
    isDirty.value = true
  }

  // ── Definition Management ──────────────────────────────────────────────

  function loadDefinition(def: FormDefinition) {
    definition.value = JSON.parse(JSON.stringify(def)) // deep clone
    isDirty.value = false
    selectedFieldId.value = null
    previewMode.value = false
  }

  function createEmptyDefinition(): FormDefinition {
    return {
      id: '',
      name: 'New Form',
      slug: '',
      formType: 'questionnaire',
      isMultiStep: false,
      isActive: true,
      sections: [{
        id: nanoid(),
        sectionOrder: 0,
        fields: []
      }]
    }
  }

  // ── Section Management ─────────────────────────────────────────────────

  function addSection(title?: string) {
    const maxOrder = Math.max(...definition.value.sections.map(s => s.sectionOrder), -1)
    definition.value.sections.push({
      id: nanoid(),
      title: title || `Section ${definition.value.sections.length + 1}`,
      sectionOrder: maxOrder + 1,
      fields: []
    })
    markDirty()
  }

  function removeSection(sectionId: string) {
    if (definition.value.sections.length <= 1) return // keep at least one
    const idx = definition.value.sections.findIndex(s => s.id === sectionId)
    if (idx === -1) return
    // If selected field is in this section, deselect
    const section = definition.value.sections[idx]!
    if (section.fields.some(f => f.id === selectedFieldId.value)) {
      selectedFieldId.value = null
    }
    definition.value.sections.splice(idx, 1)
    // Reorder remaining
    definition.value.sections.forEach((s, i) => { s.sectionOrder = i })
    markDirty()
  }

  function updateSection(sectionId: string, updates: Partial<Pick<FormSection, 'title' | 'description'>>) {
    const section = definition.value.sections.find(s => s.id === sectionId)
    if (!section) return
    if (updates.title !== undefined) section.title = updates.title
    if (updates.description !== undefined) section.description = updates.description
    markDirty()
  }

  function moveSectionUp(sectionId: string) {
    const idx = definition.value.sections.findIndex(s => s.id === sectionId)
    if (idx <= 0) return
    const sections = definition.value.sections
    ;[sections[idx - 1], sections[idx]] = [sections[idx]!, sections[idx - 1]!]
    sections.forEach((s, i) => { s.sectionOrder = i })
    markDirty()
  }

  function moveSectionDown(sectionId: string) {
    const idx = definition.value.sections.findIndex(s => s.id === sectionId)
    if (idx === -1 || idx >= definition.value.sections.length - 1) return
    const sections = definition.value.sections
    ;[sections[idx], sections[idx + 1]] = [sections[idx + 1]!, sections[idx]!]
    sections.forEach((s, i) => { s.sectionOrder = i })
    markDirty()
  }

  // ── Field Management ───────────────────────────────────────────────────

  function addField(sectionId: string, fieldType: FieldType, label?: string): FormField {
    const section = definition.value.sections.find(s => s.id === sectionId)
    if (!section) throw new Error('Section not found')

    const maxOrder = Math.max(...section.fields.map(f => f.fieldOrder), -1)
    const field: FormField = {
      id: nanoid(),
      fieldType,
      label: label || defaultLabelForType(fieldType),
      fieldOrder: maxOrder + 1,
      isRequired: false
    }

    // Add default config for types that need options
    if (['select', 'multi_select', 'radio', 'checkbox'].includes(fieldType)) {
      field.config = { options: ['Option 1', 'Option 2'] } as FormFieldConfig
    }
    if (fieldType === 'content') {
      field.config = { html: '<p>Enter your content here...</p>' } as FormFieldConfig
    }

    section.fields.push(field)
    selectedFieldId.value = field.id
    markDirty()
    return field
  }

  function removeField(sectionId: string, fieldId: string) {
    const section = definition.value.sections.find(s => s.id === sectionId)
    if (!section) return
    const idx = section.fields.findIndex(f => f.id === fieldId)
    if (idx === -1) return
    section.fields.splice(idx, 1)
    section.fields.forEach((f, i) => { f.fieldOrder = i })
    if (selectedFieldId.value === fieldId) {
      selectedFieldId.value = null
    }
    markDirty()
  }

  function updateField(fieldId: string, updates: Partial<FormField>) {
    for (const section of definition.value.sections) {
      const field = section.fields.find(f => f.id === fieldId)
      if (field) {
        Object.assign(field, updates)
        markDirty()
        return
      }
    }
  }

  function moveFieldUp(sectionId: string, fieldId: string) {
    const section = definition.value.sections.find(s => s.id === sectionId)
    if (!section) return
    const idx = section.fields.findIndex(f => f.id === fieldId)
    if (idx <= 0) return
    ;[section.fields[idx - 1], section.fields[idx]] = [section.fields[idx]!, section.fields[idx - 1]!]
    section.fields.forEach((f, i) => { f.fieldOrder = i })
    markDirty()
  }

  function moveFieldDown(sectionId: string, fieldId: string) {
    const section = definition.value.sections.find(s => s.id === sectionId)
    if (!section) return
    const idx = section.fields.findIndex(f => f.id === fieldId)
    if (idx === -1 || idx >= section.fields.length - 1) return
    ;[section.fields[idx], section.fields[idx + 1]] = [section.fields[idx + 1]!, section.fields[idx]!]
    section.fields.forEach((f, i) => { f.fieldOrder = i })
    markDirty()
  }

  function moveFieldToSection(fieldId: string, toSectionId: string) {
    // Find and remove the field from its current section
    let movedField: FormField | undefined
    for (const section of definition.value.sections) {
      const idx = section.fields.findIndex(f => f.id === fieldId)
      if (idx !== -1) {
        movedField = section.fields.splice(idx, 1)[0]
        section.fields.forEach((f, i) => { f.fieldOrder = i })
        break
      }
    }
    if (!movedField) return

    // Add to the target section at the end
    const targetSection = definition.value.sections.find(s => s.id === toSectionId)
    if (!targetSection) return
    movedField.fieldOrder = targetSection.fields.length
    targetSection.fields.push(movedField)
    markDirty()
  }

  function swapFields(sectionId: string, fromId: string, toId: string) {
    const section = definition.value.sections.find(s => s.id === sectionId)
    if (!section) return
    const fromIdx = section.fields.findIndex(f => f.id === fromId)
    const toIdx = section.fields.findIndex(f => f.id === toId)
    if (fromIdx === -1 || toIdx === -1) return
    // Move the dragged field to the drop target's position
    const [moved] = section.fields.splice(fromIdx, 1)
    section.fields.splice(toIdx, 0, moved!)
    section.fields.forEach((f, i) => { f.fieldOrder = i })
    markDirty()
  }

  // ── Selection ──────────────────────────────────────────────────────────

  function selectField(fieldId: string | null) {
    selectedFieldId.value = fieldId
  }

  const selectedField = computed<FormField | null>(() => {
    if (!selectedFieldId.value) return null
    for (const section of definition.value.sections) {
      const field = section.fields.find(f => f.id === selectedFieldId.value)
      if (field) return field
    }
    return null
  })

  const selectedFieldSectionId = computed<string | null>(() => {
    if (!selectedFieldId.value) return null
    for (const section of definition.value.sections) {
      if (section.fields.some(f => f.id === selectedFieldId.value)) {
        return section.id
      }
    }
    return null
  })

  // ── Helpers ────────────────────────────────────────────────────────────

  function defaultLabelForType(type: FieldType): string {
    const labels: Record<FieldType, string> = {
      text: 'Text Field',
      textarea: 'Text Area',
      email: 'Email Address',
      phone: 'Phone Number',
      number: 'Number',
      date: 'Date',
      select: 'Dropdown',
      multi_select: 'Multi-Select',
      radio: 'Radio Choice',
      checkbox: 'Checkboxes',
      yes_no: 'Yes / No',
      file_upload: 'File Upload',
      scheduler: 'Appointment Scheduler',
      content: 'Content Block'
    }
    return labels[type] || 'Field'
  }

  /** Get all field IDs across all sections (for conditional logic field picker) */
  const allFields = computed<FormField[]>(() =>
    definition.value.sections.flatMap(s => s.fields)
  )

  return {
    definition,
    selectedFieldId,
    selectedField,
    selectedFieldSectionId,
    previewMode,
    isDirty,
    loadDefinition,
    addSection,
    removeSection,
    updateSection,
    moveSectionUp,
    moveSectionDown,
    addField,
    removeField,
    updateField,
    moveFieldUp,
    moveFieldDown,
    swapFields,
    moveFieldToSection,
    selectField,
    allFields
  }
}
