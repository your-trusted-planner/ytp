<template>
  <UiModal
    :model-value="modelValue"
    title="Generate Document"
    size="lg"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="space-y-5">
      <div
        v-if="loading"
        class="flex justify-center py-8"
      >
        <Loader class="w-6 h-6 animate-spin text-burgundy-600" />
      </div>

      <template v-else>
        <!-- Template picker -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Template <span class="text-red-500">*</span>
          </label>
          <input
            v-model="templateSearch"
            type="text"
            placeholder="Search templates..."
            class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 sm:text-sm mb-2"
          >
          <div class="border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-100">
            <div
              v-if="filteredTemplates.length === 0"
              class="px-4 py-6 text-center text-sm text-gray-400"
            >
              No templates found
            </div>
            <button
              v-for="t in filteredTemplates"
              :key="t.id"
              type="button"
              class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              :class="selectedTemplateId === t.id ? 'bg-burgundy-50' : ''"
              @click="selectedTemplateId = t.id"
            >
              <div
                class="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                :class="selectedTemplateId === t.id
                  ? 'border-burgundy-600 bg-burgundy-600'
                  : 'border-gray-300'"
              >
                <div
                  v-if="selectedTemplateId === t.id"
                  class="w-1.5 h-1.5 rounded-full bg-white"
                />
              </div>
              <span class="text-sm text-gray-900">{{ t.name }}</span>
            </button>
          </div>
        </div>

        <!-- Client -->
        <div v-if="defaultClientId">
          <label class="block text-sm font-medium text-gray-700 mb-1">Client</label>
          <div class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
            {{ defaultClientName || defaultClientId }}
          </div>
        </div>
        <div v-else>
          <UiSelect
            v-model="selectedClientId"
            label="Client"
            placeholder="Select a client..."
            required
            @update:model-value="onClientChange"
          >
            <option
              v-for="c in clients"
              :key="c.id"
              :value="c.id"
            >
              {{ c.firstName }} {{ c.lastName }}
            </option>
          </UiSelect>
        </div>

        <!-- Matter (optional) -->
        <div v-if="defaultMatterId">
          <label class="block text-sm font-medium text-gray-700 mb-1">Matter</label>
          <div class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
            {{ defaultMatterName || defaultMatterId }}
          </div>
        </div>
        <div v-else-if="effectiveClientId">
          <UiSelect
            v-model="selectedMatterId"
            label="Matter"
            placeholder="No matter (optional)"
          >
            <option value="">
              No matter
            </option>
            <option
              v-for="m in matters"
              :key="m.id"
              :value="m.id"
            >
              {{ m.title }}
            </option>
          </UiSelect>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <UiButton
            variant="outline"
            @click="$emit('update:modelValue', false)"
          >
            Cancel
          </UiButton>
          <UiButton
            :is-loading="submitting"
            :disabled="!canSubmit"
            @click="submit"
          >
            <FileText class="w-4 h-4 mr-1.5" />
            Generate Document
          </UiButton>
        </div>
      </template>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { Loader, FileText } from 'lucide-vue-next'

interface Props {
  modelValue: boolean
  defaultClientId?: string
  defaultClientName?: string
  defaultMatterId?: string
  defaultMatterName?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'generated': [doc: any]
}>()

const toast = useToast()

const loading = ref(false)
const submitting = ref(false)
const templates = ref<any[]>([])
const clients = ref<any[]>([])
const matters = ref<any[]>([])
const templateSearch = ref('')
const selectedTemplateId = ref('')
const selectedClientId = ref(props.defaultClientId || '')
const selectedMatterId = ref(props.defaultMatterId || '')

const effectiveClientId = computed(
  () => props.defaultClientId || selectedClientId.value
)

const filteredTemplates = computed(() => {
  const q = templateSearch.value.toLowerCase()
  if (!q) return templates.value
  return templates.value.filter(t => t.name.toLowerCase().includes(q))
})

const canSubmit = computed(
  () => !!selectedTemplateId.value && !!effectiveClientId.value
)

watch(() => props.modelValue, async (open) => {
  if (!open) return
  reset()
  await loadData()
})

function reset() {
  templateSearch.value = ''
  selectedTemplateId.value = ''
  selectedClientId.value = props.defaultClientId || ''
  selectedMatterId.value = props.defaultMatterId || ''
  matters.value = []
}

async function loadData() {
  loading.value = true
  try {
    const [templatesRes, clientsRes] = await Promise.all([
      $fetch<any>('/api/templates').catch(() => []),
      !props.defaultClientId
        ? $fetch<any>('/api/clients').catch(() => ({ clients: [] }))
        : Promise.resolve(null)
    ])
    templates.value = Array.isArray(templatesRes)
      ? templatesRes
      : (templatesRes?.templates || [])
    if (clientsRes) {
      clients.value = clientsRes.clients || clientsRes || []
    }
    if (props.defaultClientId && !props.defaultMatterId) {
      await loadMatters(props.defaultClientId)
    }
  }
  finally {
    loading.value = false
  }
}

async function loadMatters(clientId: string) {
  if (!clientId) {
    matters.value = []
    return
  }
  try {
    const res = await $fetch<any>(`/api/clients/${clientId}/matters`)
    matters.value = res.matters || res || []
  }
  catch {
    matters.value = []
  }
}

async function onClientChange(clientId: string) {
  selectedMatterId.value = ''
  await loadMatters(clientId)
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const res = await $fetch<any>('/api/documents/generate-from-template', {
      method: 'POST',
      body: {
        templateId: selectedTemplateId.value,
        clientId: effectiveClientId.value,
        ...(props.defaultMatterId
          ? { matterId: props.defaultMatterId }
          : selectedMatterId.value
            ? { matterId: selectedMatterId.value }
            : {})
      }
    })
    toast.success('Document generated')
    emit('generated', res)
    emit('update:modelValue', false)
  }
  catch (err: any) {
    toast.error(err.data?.message || 'Failed to generate document')
  }
  finally {
    submitting.value = false
  }
}
</script>
