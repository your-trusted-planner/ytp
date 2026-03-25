import { defineStore } from 'pinia'
import type { FormDefinition, FormSummary, FormSection, FormField } from '~/types/form'

interface FormState {
  /** List of all forms (summary view for settings page) */
  forms: FormSummary[]
  formsLoaded: boolean
  formsLoading: boolean

  /** Currently loaded full form definition (for builder/renderer) */
  currentForm: FormDefinition | null
  currentFormLoading: boolean

  error: string | null
}

export const useFormStore = defineStore('forms', {
  state: (): FormState => ({
    forms: [],
    formsLoaded: false,
    formsLoading: false,
    currentForm: null,
    currentFormLoading: false,
    error: null
  }),

  getters: {
    activeForms(): FormSummary[] {
      return this.forms.filter(f => f.isActive)
    },

    formById() {
      return (id: string) => this.forms.find(f => f.id === id)
    }
  },

  actions: {
    // ── List ──────────────────────────────────────────────────────────────

    async loadForms(force = false) {
      if (this.formsLoaded && !force) return
      this.formsLoading = true
      this.error = null
      try {
        this.forms = await $fetch<FormSummary[]>('/api/admin/forms')
        this.formsLoaded = true
      } catch (err: any) {
        this.error = err.data?.message || 'Failed to load forms'
      } finally {
        this.formsLoading = false
      }
    },

    // ── Get Full Definition ──────────────────────────────────────────────

    async loadForm(id: string) {
      this.currentFormLoading = true
      this.error = null
      try {
        this.currentForm = await $fetch<FormDefinition>(`/api/admin/forms/${id}`)
      } catch (err: any) {
        this.error = err.data?.message || 'Failed to load form'
        this.currentForm = null
      } finally {
        this.currentFormLoading = false
      }
    },

    clearCurrentForm() {
      this.currentForm = null
    },

    // ── Create ───────────────────────────────────────────────────────────

    async createForm(data: { name: string; description?: string; formType?: string; isMultiStep?: boolean }) {
      const result = await $fetch<{ success: boolean; form: FormDefinition }>('/api/admin/forms', {
        method: 'POST',
        body: data
      })
      // Refresh list
      this.formsLoaded = false
      await this.loadForms(true)
      return result.form
    },

    // ── Update Metadata ──────────────────────────────────────────────────

    async updateForm(id: string, data: Partial<{ name: string; description: string; formType: string; isMultiStep: boolean; isPublic: boolean; isActive: boolean; settings: Record<string, any> }>) {
      await $fetch(`/api/admin/forms/${id}`, {
        method: 'PUT',
        body: data
      })
      this.formsLoaded = false
      await this.loadForms(true)
      // Reload current form if it's the one being edited
      if (this.currentForm?.id === id) {
        await this.loadForm(id)
      }
    },

    // ── Delete ───────────────────────────────────────────────────────────

    async deleteForm(id: string) {
      await $fetch(`/api/admin/forms/${id}`, { method: 'DELETE' })
      this.formsLoaded = false
      await this.loadForms(true)
      if (this.currentForm?.id === id) {
        this.currentForm = null
      }
    },

    // ── Section CRUD ─────────────────────────────────────────────────────

    async addSection(formId: string, data: { title?: string; description?: string }) {
      await $fetch(`/api/admin/forms/${formId}/sections`, {
        method: 'POST',
        body: data
      })
      await this.loadForm(formId)
    },

    async updateSection(formId: string, sectionId: string, data: Partial<{ title: string; description: string; sectionOrder: number }>) {
      await $fetch(`/api/admin/forms/${formId}/sections/${sectionId}`, {
        method: 'PUT',
        body: data
      })
      await this.loadForm(formId)
    },

    async deleteSection(formId: string, sectionId: string) {
      await $fetch(`/api/admin/forms/${formId}/sections/${sectionId}`, {
        method: 'DELETE'
      })
      await this.loadForm(formId)
    },

    async reorderSections(formId: string, sectionIds: string[]) {
      await $fetch(`/api/admin/forms/${formId}/sections/reorder`, {
        method: 'POST',
        body: { sectionIds }
      })
      await this.loadForm(formId)
    },

    // ── Field CRUD ───────────────────────────────────────────────────────

    async addField(formId: string, sectionId: string, data: Partial<FormField> & { fieldType: string; label: string }) {
      await $fetch('/api/admin/form-fields', {
        method: 'POST',
        body: { ...data, formId, sectionId }
      })
      await this.loadForm(formId)
    },

    async updateField(formId: string, _sectionId: string, fieldId: string, data: Partial<FormField>) {
      await $fetch(`/api/admin/form-fields/${fieldId}`, {
        method: 'PUT',
        body: data
      })
      await this.loadForm(formId)
    },

    async deleteField(formId: string, _sectionId: string, fieldId: string) {
      await $fetch(`/api/admin/form-fields/${fieldId}`, {
        method: 'DELETE'
      })
      await this.loadForm(formId)
    },

    async reorderFields(formId: string, _sectionId: string, fieldIds: string[]) {
      await $fetch('/api/admin/form-fields/reorder', {
        method: 'POST',
        body: { formId, fieldIds }
      })
      await this.loadForm(formId)
    }
  }
})
