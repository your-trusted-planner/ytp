<template>
  <UiModal
    v-model="isOpen"
    :title="editingMatter ? 'Edit Matter' : 'Add New Matter'"
    size="xl"
  >
    <form
      class="space-y-4"
      @submit.prevent="handleSubmit"
    >
      <!-- Matter Details -->
      <UiInput
        v-model="form.title"
        label="Matter Title"
        placeholder="e.g., Smith Family Trust 2024"
        required
      />

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Client <span class="text-red-500">*</span>
        </label>
        <!-- Selected client chip -->
        <div
          v-if="selectedClient && !showClientQuickAdd"
          class="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
        >
          <span class="text-sm text-gray-900 flex-1">{{ selectedClient.name }}</span>
          <span
            v-if="selectedClient.email"
            class="text-xs text-gray-500"
          >{{ selectedClient.email }}</span>
          <button
            v-if="!editingMatter"
            type="button"
            class="text-gray-400 hover:text-gray-600"
            @click="clearClient"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
        <!-- Quick Add Person (inline) -->
        <PeopleQuickAddPerson
          v-else-if="showClientQuickAdd"
          :initial-first-name="quickAddFirstName"
          :initial-last-name="quickAddLastName"
          submit-label="Add as client"
          @person-created="onQuickAddClientCreated"
          @cancel="showClientQuickAdd = false"
        />
        <!-- Search input -->
        <div
          v-else
          class="relative"
        >
          <input
            ref="clientSearchRef"
            v-model="clientSearch"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
            placeholder="Search for a client..."
            @input="onClientSearchInput"
            @focus="showClientDropdown = true"
            @blur="hideClientDropdown"
          >
          <div
            v-if="clientSearchLoading"
            class="absolute right-2 top-1/2 -translate-y-1/2"
          >
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-burgundy-600" />
          </div>
          <div
            v-if="showClientDropdown && (clientOptions.length > 0 || (clientSearch.length >= 2 && !clientSearchLoading))"
            class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
          >
            <button
              v-for="option in clientOptions"
              :key="option.id"
              type="button"
              class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              @mousedown.prevent="selectClient(option)"
            >
              <div class="font-medium text-gray-900">{{ option.name }}</div>
              <div
                v-if="option.email"
                class="text-xs text-gray-500"
              >{{ option.email }}</div>
            </button>
            <button
              v-if="clientSearch.length >= 2 && !clientSearchLoading"
              type="button"
              class="w-full px-3 py-2 text-left text-sm text-burgundy-600 hover:bg-gray-50 italic border-t border-gray-100"
              @mousedown.prevent="openClientQuickAdd"
            >
              Add "{{ clientSearch }}" as a new client...
            </button>
          </div>
        </div>
      </div>

      <UiTextarea
        v-model="form.description"
        label="Description"
        placeholder="Brief description of the matter..."
        :rows="3"
      />

      <UiSelect
        v-model="form.status"
        label="Status"
        required
      >
        <option value="PENDING">
          Pending
        </option>
        <option value="OPEN">
          Open
        </option>
        <option value="CLOSED">
          Closed
        </option>
      </UiSelect>

      <!-- Engagement Details Section -->
      <div class="border-t pt-4 mt-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">
          Engagement Details
        </h3>

        <div class="grid grid-cols-1 gap-4">
          <UiSelect
            v-model="form.leadAttorneyId"
            label="Lead Attorney (Optional)"
          >
            <option value="">
              -- Select Lead Attorney --
            </option>
            <option
              v-for="lawyer in lawyers"
              :key="lawyer.id"
              :value="lawyer.id"
            >
              {{ lawyer.firstName }} {{ lawyer.lastName }}
            </option>
          </UiSelect>

          <UiSelect
            v-model="form.engagementJourneyTemplateId"
            label="Engagement Journey (Optional)"
          >
            <option value="">
              -- Select Engagement Journey --
            </option>
            <option
              v-for="journey in engagementJourneys"
              :key="journey.id"
              :value="journey.id"
            >
              {{ journey.name }}
              <span v-if="journey.step_count">({{ journey.step_count }} steps)</span>
            </option>
          </UiSelect>

          <p class="text-sm text-gray-600">
            Select an engagement journey template to guide the client through initial onboarding.
          </p>
        </div>
      </div>

      <!-- Services Section (only for new matters) -->
      <div
        v-if="!editingMatter"
        class="border-t pt-4 mt-6"
      >
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900">
            Services
          </h3>
          <span class="text-sm text-gray-500">(Optional)</span>
        </div>

        <label class="block text-sm font-medium text-gray-700 mb-2">Select Services to Engage</label>
        <div class="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
          <label
            v-for="item in catalog"
            :key="item.id"
            class="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
          >
            <input
              v-model="selectedServices"
              type="checkbox"
              :value="item.id"
              class="mt-1 h-4 w-4 text-burgundy-600 focus:ring-burgundy-500 border-gray-300 rounded"
            >
            <div class="flex-1">
              <div class="text-sm font-medium text-gray-900">{{ item.name }}</div>
              <div class="text-xs text-gray-500">{{ formatCurrency(item.price) }}</div>
            </div>
          </label>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-between w-full">
        <!-- Delete button (left side, only in edit mode) -->
        <div v-if="editingMatter">
          <button
            type="button"
            disabled
            class="px-4 py-2 text-red-600 border border-red-300 rounded-md bg-red-50 opacity-50 cursor-not-allowed"
            title="Matter deletion will be available in a future release. Please close the matter instead."
          >
            Delete Matter
          </button>
        </div>
        <div v-else />

        <!-- Action buttons (right side) -->
        <div class="flex space-x-3">
          <UiButton
            type="button"
            variant="outline"
            @click="handleCancel"
          >
            Cancel
          </UiButton>
          <UiButton
            :is-loading="saving"
            @click="handleSubmit"
          >
            {{ editingMatter ? 'Update Matter' : 'Create Matter' }}
          </UiButton>
        </div>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { formatCurrency } from '~/utils/format'

const toast = useToast()

interface Matter {
  id: string
  title: string
  clientId: string
  description?: string
  status: string
  leadAttorneyId?: string
  engagementJourneyId?: string
}

interface Props {
  modelValue: boolean
  editingMatter?: Matter | null
  clients: any[]
  lawyers: any[]
  engagementJourneys: any[]
  catalog: any[]
  defaultClientId?: string
}

const props = withDefaults(defineProps<Props>(), {
  editingMatter: null,
  defaultClientId: ''
})

interface GoogleDriveStatus {
  enabled: boolean
  success: boolean
  folderUrl?: string
  error?: string
  clientHasFolder?: boolean
}

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': [matterId?: string, googleDrive?: GoogleDriveStatus]
  'cancel': []
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const saving = ref(false)
const selectedServices = ref<string[]>([])

// Client search state
const clientSearchRef = ref<HTMLInputElement>()
const clientSearch = ref('')
const clientOptions = ref<Array<{ id: string, name: string, email: string | null }>>([])
const showClientDropdown = ref(false)
const clientSearchLoading = ref(false)
const selectedClient = ref<{ id: string, name: string, email: string | null } | null>(null)
let clientSearchTimeout: ReturnType<typeof setTimeout> | null = null

// Quick add state
const showClientQuickAdd = ref(false)
const quickAddFirstName = ref('')
const quickAddLastName = ref('')

function onClientSearchInput() {
  if (clientSearchTimeout) clearTimeout(clientSearchTimeout)
  if (clientSearch.value.length < 2) {
    clientOptions.value = []
    return
  }
  clientSearchLoading.value = true
  clientSearchTimeout = setTimeout(async () => {
    try {
      const response = await $fetch<{ clients: any[] }>(`/api/clients?search=${encodeURIComponent(clientSearch.value)}&page=1&limit=10`)
      const clients = response.clients || []
      clientOptions.value = clients.map((c: any) => ({
        id: c.id,
        name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.fullName || c.email || c.id,
        email: c.email || null
      }))
    } catch {
      clientOptions.value = []
    } finally {
      clientSearchLoading.value = false
    }
  }, 300)
}

function selectClient(option: { id: string, name: string, email: string | null }) {
  selectedClient.value = option
  form.value.clientId = option.id
  clientSearch.value = ''
  clientOptions.value = []
  showClientDropdown.value = false
}

function clearClient() {
  selectedClient.value = null
  form.value.clientId = ''
  clientSearch.value = ''
  nextTick(() => clientSearchRef.value?.focus())
}

function hideClientDropdown() {
  setTimeout(() => { showClientDropdown.value = false }, 200)
}

function openClientQuickAdd() {
  const parts = clientSearch.value.trim().split(/\s+/)
  quickAddFirstName.value = parts[0] || ''
  quickAddLastName.value = parts.slice(1).join(' ')
  showClientQuickAdd.value = true
  showClientDropdown.value = false
}

async function onQuickAddClientCreated(person: { id: string; name: string; email: string | null; phone: string | null }) {
  // PeopleQuickAddPerson already created the person record — now create a client record linked to them
  try {
    const nameParts = person.name.split(' ')
    const result = await $fetch<{ success: boolean; client: any }>('/api/clients/quick-add', {
      method: 'POST',
      body: {
        personId: person.id,
        firstName: nameParts[0] || person.name,
        lastName: nameParts.slice(1).join(' ') || undefined,
        email: person.email || undefined,
        phone: person.phone || undefined
      }
    })

    if (result.success) {
      selectClient({
        id: result.client.id,
        name: result.client.fullName || person.name,
        email: result.client.email
      })
    }
  } catch (err: any) {
    toast.error(err.data?.message || 'Failed to create client')
  } finally {
    showClientQuickAdd.value = false
  }
}

const form = ref({
  title: '',
  clientId: '',
  description: '',
  status: 'PENDING',
  leadAttorneyId: '',
  engagementJourneyTemplateId: ''
})

// Resolve a client ID to a display object using the clients prop
function resolveClientFromProp(clientId: string): { id: string, name: string, email: string | null } | null {
  const match = props.clients.find((c: any) => c.id === clientId)
  if (match) {
    return {
      id: match.id,
      name: [match.firstName, match.lastName].filter(Boolean).join(' ') || match.fullName || match.email || match.id,
      email: match.email || null
    }
  }
  return null
}

// Watch for editing matter changes
watch(() => props.editingMatter, (matter) => {
  if (matter) {
    form.value = {
      title: matter.title,
      clientId: matter.clientId,
      description: matter.description || '',
      status: matter.status,
      leadAttorneyId: matter.leadAttorneyId || '',
      engagementJourneyTemplateId: matter.engagementJourneyId || ''
    }
    selectedClient.value = resolveClientFromProp(matter.clientId)
  }
  else {
    // Reset form for new matter, using defaultClientId if provided
    form.value = {
      title: '',
      clientId: props.defaultClientId || '',
      description: '',
      status: 'PENDING',
      leadAttorneyId: '',
      engagementJourneyTemplateId: ''
    }
    selectedClient.value = props.defaultClientId ? resolveClientFromProp(props.defaultClientId) : null
    selectedServices.value = []
    showClientQuickAdd.value = false
    clientSearch.value = ''
  }
}, { immediate: true })

// Watch for defaultClientId changes (for pre-filling new matter forms)
watch(() => props.defaultClientId, (clientId) => {
  if (!props.editingMatter && clientId) {
    form.value.clientId = clientId
    selectedClient.value = resolveClientFromProp(clientId)
  }
})

// Resolve selectedClient from clients prop once loaded (covers async load)
watch(() => props.clients, () => {
  if (form.value.clientId && !selectedClient.value) {
    selectedClient.value = resolveClientFromProp(form.value.clientId)
  }
})

async function handleSubmit() {
  if (!form.value.title || !form.value.clientId || !form.value.status) {
    toast.warning('Please fill in all required fields')
    return
  }

  saving.value = true
  try {
    let googleDriveStatus: GoogleDriveStatus | undefined

    if (props.editingMatter) {
      // Update existing matter
      await $fetch<void>(`/api/matters/${props.editingMatter.id}`, {
        method: 'PUT',
        body: {
          title: form.value.title,
          description: form.value.description,
          status: form.value.status,
          leadAttorneyId: form.value.leadAttorneyId || null,
          engagementJourneyTemplateId: form.value.engagementJourneyTemplateId || null
        }
      })
    }
    else {
      // Create new matter
      const response = await $fetch<{
        success: boolean
        matter: any
        googleDrive?: GoogleDriveStatus
      }>('/api/matters', {
        method: 'POST',
        body: {
          title: form.value.title,
          clientId: form.value.clientId,
          description: form.value.description,
          status: form.value.status,
          leadAttorneyId: form.value.leadAttorneyId || undefined,
          engagementJourneyTemplateId: form.value.engagementJourneyTemplateId || undefined,
          serviceIds: selectedServices.value
        }
      })
      googleDriveStatus = response.googleDrive
    }

    emit('save', props.editingMatter?.id, googleDriveStatus)
    isOpen.value = false
  }
  catch (error: any) {
    console.error('Error saving matter:', error)
    toast.error(error.data?.message || 'Failed to save matter')
  }
  finally {
    saving.value = false
  }
}

function handleCancel() {
  emit('cancel')
  isOpen.value = false
}
</script>
