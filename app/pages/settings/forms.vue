<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">
          Forms
        </h1>
        <p class="text-gray-600 mt-1">
          Build intake forms, questionnaires, and booking forms with a visual editor
        </p>
      </div>
      <UiButton @click="openAddModal">
        Create Form
      </UiButton>
    </div>

    <!-- Loading -->
    <div
      v-if="formStore.formsLoading || !formStore.formsLoaded"
      class="text-center py-12"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="formStore.forms.length === 0"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <FileText class="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        No forms yet
      </h3>
      <p class="text-gray-500 mb-6">
        Create your first form to start collecting information from clients and prospects.
      </p>
      <UiButton @click="openAddModal">
        Create Your First Form
      </UiButton>
    </div>

    <!-- Form Cards -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <div
        v-for="form in formStore.forms"
        :key="form.id"
        class="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-100"
      >
        <div class="p-5">
          <div class="flex items-start justify-between mb-2">
            <h3 class="font-semibold text-gray-900">
              {{ form.name }}
            </h3>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              :class="form.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
            >
              {{ form.isActive ? 'Active' : 'Inactive' }}
            </span>
          </div>
          <p class="text-xs text-gray-400 font-mono mb-2">
            /f/{{ form.slug }}
          </p>
          <p
            v-if="form.description"
            class="text-sm text-gray-500 mb-3 line-clamp-2"
          >
            {{ form.description }}
          </p>
          <div class="flex items-center gap-3 text-xs text-gray-400">
            <span class="inline-flex items-center gap-1">
              <Layers class="w-3.5 h-3.5" />
              {{ form.sectionCount }} {{ form.sectionCount === 1 ? 'section' : 'sections' }}
            </span>
            <span class="inline-flex items-center gap-1">
              <ListChecks class="w-3.5 h-3.5" />
              {{ form.fieldCount }} {{ form.fieldCount === 1 ? 'field' : 'fields' }}
            </span>
          </div>
        </div>
        <div class="border-t px-5 py-3 flex justify-end gap-2">
          <UiButton
            variant="ghost"
            size="sm"
            @click="editForm(form.id)"
          >
            Edit
          </UiButton>
          <UiButton
            v-if="form.isActive"
            variant="ghost"
            size="sm"
            class="text-red-600 hover:text-red-700"
            @click="deactivateForm(form.id)"
          >
            Deactivate
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <UiModal
      v-model="showCreateModal"
      title="Create Form"
      size="md"
    >
      <div class="space-y-4">
        <UiInput
          v-model="createForm.name"
          label="Form Name"
          placeholder="e.g., Consultation Intake"
          required
        />
        <UiInput
          v-model="createForm.description"
          label="Description"
          placeholder="Brief description of this form's purpose"
        />
        <UiToggle
          v-model="createForm.isMultiStep"
          label="Multi-step"
          description="Show sections as separate pages"
        />
      </div>
      <template #footer>
        <UiButton
          variant="outline"
          @click="showCreateModal = false"
        >
          Cancel
        </UiButton>
        <UiButton
          :disabled="!createForm.name.trim()"
          :is-loading="creating"
          @click="handleCreate"
        >
          Create
        </UiButton>
      </template>
    </UiModal>

    <!-- Edit Modal (full-width with FormBuilder) -->
    <UiModal
      v-model="showEditModal"
      :title="editingForm?.name || 'Edit Form'"
      size="full"
    >
      <div v-if="formStore.currentFormLoading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" />
      </div>
      <div v-else-if="editingForm">
        <!-- Form metadata -->
        <div class="grid grid-cols-2 gap-4 mb-6 pb-6 border-b">
          <UiInput
            :model-value="editingForm.name"
            label="Form Name"
            @update:model-value="editingForm.name = $event"
          />
          <div class="space-y-3">
            <UiToggle
              :model-value="editingForm.isMultiStep"
              label="Multi-step"
              description="Show sections as separate pages"
              @update:model-value="editingForm.isMultiStep = $event"
            />
            <UiToggle
              :model-value="editingForm.isPublic"
              label="Public"
              :description="`Accessible at /f/${editingForm.slug}`"
              @update:model-value="editingForm.isPublic = $event"
            />
          </div>
        </div>

        <!-- Form Builder -->
        <FormBuilder
          v-model="editingForm"
          :appointment-types="appointmentTypes"
        />
      </div>
      <template #footer>
        <UiButton
          variant="outline"
          @click="closeEditModal"
        >
          Cancel
        </UiButton>
        <UiButton
          :is-loading="saving"
          @click="handleSave"
        >
          Save Changes
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FileText, Layers, ListChecks } from 'lucide-vue-next'
import { useFormStore } from '~/stores/useFormStore'
import type { FormDefinition } from '~/types/form'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const formStore = useFormStore()
const toast = useToast()

const showCreateModal = ref(false)
const showEditModal = ref(false)
const creating = ref(false)
const saving = ref(false)
const editingForm = ref<FormDefinition | null>(null)
const appointmentTypes = ref<Array<{ id: string; name: string }>>([])

const createForm = ref({
  name: '',
  description: '',
  isMultiStep: false
})

onMounted(async () => {
  await formStore.loadForms()
  // Load appointment types for scheduler field config
  try {
    const types = await $fetch<any[]>('/api/admin/appointment-types')
    appointmentTypes.value = types.map(t => ({ id: t.id, name: t.name }))
  } catch { /* ignore */ }
})

function openAddModal() {
  createForm.value = { name: '', description: '', isMultiStep: false }
  showCreateModal.value = true
}

async function handleCreate() {
  if (!createForm.value.name.trim()) return
  creating.value = true
  try {
    const form = await formStore.createForm({
      name: createForm.value.name.trim(),
      description: createForm.value.description.trim() || undefined,
      isMultiStep: createForm.value.isMultiStep
    })
    showCreateModal.value = false
    toast.success('Form created')
    // Open the builder immediately
    await editForm(form.id)
  } catch (err: any) {
    toast.error(err.data?.message || 'Failed to create form')
  } finally {
    creating.value = false
  }
}

async function editForm(formId: string) {
  await formStore.loadForm(formId)
  if (formStore.currentForm) {
    editingForm.value = JSON.parse(JSON.stringify(formStore.currentForm))
    showEditModal.value = true
  }
}

function closeEditModal() {
  showEditModal.value = false
  editingForm.value = null
  formStore.clearCurrentForm()
}

async function handleSave() {
  if (!editingForm.value) return
  saving.value = true
  try {
    const form = editingForm.value

    // Save form metadata
    await formStore.updateForm(form.id, {
      name: form.name,
      description: form.description || undefined,
      isMultiStep: form.isMultiStep,
      isPublic: form.isPublic,
      settings: form.settings || undefined
    })

    // Bulk save sections + fields in one call
    await $fetch<void>(`/api/admin/forms/${form.id}/definition`, {
      method: 'PUT',
      body: {
        sections: form.sections.map((s, si) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          sectionOrder: si,
          fields: s.fields.map((f, fi) => ({
            id: f.id,
            fieldType: f.fieldType,
            label: f.label,
            fieldOrder: fi,
            isRequired: f.isRequired,
            colSpan: f.colSpan || 12,
            config: f.config || null,
            conditionalLogic: f.conditionalLogic || null,
            personFieldMapping: f.personFieldMapping || null
          }))
        }))
      }
    })

    // Refresh the list
    await formStore.loadForms(true)

    toast.success('Form saved')
    closeEditModal()
  } catch (err: any) {
    toast.error(err.data?.message || 'Failed to save form')
  } finally {
    saving.value = false
  }
}

async function deactivateForm(formId: string) {
  try {
    await formStore.deleteForm(formId)
    toast.success('Form deactivated')
  } catch (err: any) {
    toast.error(err.data?.message || 'Failed to deactivate form')
  }
}
</script>
