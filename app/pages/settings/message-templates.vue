<template>
  <div class="space-y-6">
    <div>
      <NuxtLink
        to="/settings"
        class="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
      >
        &larr; Back to Settings
      </NuxtLink>
      <h1 class="text-3xl font-bold text-gray-900">
        Message Templates
      </h1>
      <p class="text-gray-600 mt-1">
        Customize email and SMS templates for system notifications and client communications
      </p>
    </div>

    <!-- Category Filter -->
    <div class="flex gap-2">
      <button
        v-for="cat in categories"
        :key="cat.value"
        class="px-3 py-1.5 text-sm rounded-full border transition-colors"
        :class="activeCategory === cat.value
          ? 'bg-burgundy-600 text-white border-burgundy-600'
          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'"
        @click="activeCategory = cat.value"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="flex justify-center py-12"
    >
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-600" />
    </div>

    <!-- Templates Table -->
    <UiCard v-else-if="filteredTemplates.length > 0">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Template
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Category
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Channels
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="tmpl in filteredTemplates"
              :key="tmpl.id"
            >
              <td class="px-6 py-4">
                <div class="font-medium text-gray-900">
                  {{ tmpl.name }}
                </div>
                <div class="text-sm text-gray-500">
                  {{ tmpl.description }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="categoryBadgeClass(tmpl.category)"
                >
                  {{ tmpl.category }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex gap-1.5">
                  <span
                    v-if="tmpl.channelConfig?.email"
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700"
                  >
                    <MailIcon class="w-3 h-3 mr-1" />
                    Email
                  </span>
                  <span
                    v-if="tmpl.channelConfig?.sms"
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700"
                  >
                    <MessageSquareIcon class="w-3 h-3 mr-1" />
                    SMS
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <UiToggle
                  :model-value="tmpl.isActive"
                  @update:model-value="toggleActive(tmpl)"
                />
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right space-x-2">
                <UiButton
                  variant="ghost"
                  size="sm"
                  :loading="sendingTestId === tmpl.id"
                  @click="sendTestEmail(tmpl)"
                >
                  Test Email
                </UiButton>
                <UiButton
                  variant="ghost"
                  size="sm"
                  @click="previewTemplate(tmpl)"
                >
                  Preview
                </UiButton>
                <UiButton
                  variant="ghost"
                  size="sm"
                  @click="editTemplate(tmpl)"
                >
                  Edit
                </UiButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <!-- Empty State -->
    <UiCard v-else>
      <div class="text-center py-12 text-gray-500">
        <MessageSquareIcon class="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No templates found. Run the seed to create default templates.</p>
      </div>
    </UiCard>

    <!-- Edit Modal -->
    <UiModal
      v-model="showEditModal"
      size="lg"
    >
      <template #header>
        <h2 class="text-lg font-semibold">
          Edit: {{ editingTemplate?.name }}
        </h2>
      </template>

      <div class="space-y-6 max-h-[70vh] overflow-y-auto">
        <!-- Name & Description -->
        <div class="grid grid-cols-1 gap-4">
          <UiInput
            v-model="editForm.name"
            label="Template Name"
          />
          <UiInput
            v-model="editForm.description"
            label="Description"
          />
        </div>

        <!-- Email Section -->
        <div class="border-t pt-4">
          <h3 class="font-medium text-gray-900 mb-3">
            Email Content
          </h3>
          <div class="space-y-4">
            <UiInput
              v-model="editForm.emailSubject"
              label="Subject Line"
              placeholder="e.g., Appointment Confirmed: {{appointmentType}}"
            />
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email Header</label>
              <div class="flex gap-3">
                <UiInput
                  v-model="editForm.emailHeaderText"
                  placeholder="Header text"
                  class="flex-1"
                />
                <div class="flex items-center gap-2">
                  <input
                    v-model="editForm.emailHeaderColor"
                    type="color"
                    class="h-9 w-12 rounded border border-gray-300 cursor-pointer"
                  >
                </div>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email Body</label>
              <textarea
                v-model="editForm.emailBody"
                rows="8"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-burgundy-500 focus:ring-burgundy-500"
                placeholder="HTML body content with {{variables}}"
              />
            </div>
            <UiInput
              v-model="editForm.emailActionLabel"
              label="CTA Button Text (leave empty for no button)"
              placeholder="e.g., View in Portal"
            />
          </div>
        </div>

        <!-- SMS Section -->
        <div class="border-t pt-4">
          <h3 class="font-medium text-gray-900 mb-3">
            SMS Content
          </h3>
          <div>
            <textarea
              v-model="editForm.smsBody"
              rows="3"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-burgundy-500 focus:ring-burgundy-500"
              placeholder="SMS body with {{variables}} (aim for 160 characters)"
            />
            <p class="text-xs text-gray-500 mt-1">
              {{ (editForm.smsBody || '').length }} / 160 characters
              ({{ Math.ceil((editForm.smsBody || '').length / 160) || 0 }} segment{{ Math.ceil((editForm.smsBody || '').length / 160) !== 1 ? 's' : '' }})
            </p>
          </div>
        </div>

        <!-- Channel Config -->
        <div class="border-t pt-4">
          <h3 class="font-medium text-gray-900 mb-3">
            Active Channels
          </h3>
          <div class="flex gap-6">
            <label class="flex items-center gap-2">
              <input
                v-model="editForm.channelConfig.email"
                type="checkbox"
                class="rounded border-gray-300 text-burgundy-600 focus:ring-burgundy-500"
              >
              <span class="text-sm">Email</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                v-model="editForm.channelConfig.sms"
                type="checkbox"
                class="rounded border-gray-300 text-burgundy-600 focus:ring-burgundy-500"
              >
              <span class="text-sm">SMS</span>
            </label>
          </div>
        </div>

        <!-- Available Variables -->
        <div class="border-t pt-4">
          <h3 class="font-medium text-gray-900 mb-2">
            Available Variables
          </h3>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="v in editingTemplate.variableSchema"
              :key="v.key"
              class="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-xs font-mono text-gray-700 hover:bg-gray-200 transition-colors"
              title="Click to copy"
              @click="copyVariable(v.key)"
            >
              {{ `\{\{${v.key}\}\}` }}
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            Click a variable to copy it to your clipboard
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton
            variant="outline"
            @click="showEditModal = false"
          >
            Cancel
          </UiButton>
          <UiButton
            :loading="saving"
            @click="saveTemplate"
          >
            Save Changes
          </UiButton>
        </div>
      </template>
    </UiModal>

    <!-- Preview Modal -->
    <UiModal
      v-model="showPreviewModal"
      size="lg"
    >
      <template #header>
        <h2 class="text-lg font-semibold">
          Preview: {{ previewingTemplate?.name }}
        </h2>
      </template>

      <div class="space-y-4">
        <!-- Preview Tabs -->
        <div class="flex gap-2 border-b">
          <button
            v-for="tab in previewTabs"
            :key="tab.key"
            class="px-3 py-2 text-sm border-b-2 -mb-px transition-colors"
            :class="activePreviewTab === tab.key
              ? 'border-burgundy-600 text-burgundy-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'"
            @click="activePreviewTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Email HTML Preview -->
        <div
          v-if="activePreviewTab === 'email'"
          class="border rounded-lg overflow-hidden"
        >
          <div class="bg-gray-50 px-4 py-2 border-b text-sm text-gray-600">
            Subject: {{ previewData.emailSubject }}
          </div>
          <iframe
            :srcdoc="previewData.emailHtml"
            class="w-full h-[500px] border-0"
          />
        </div>

        <!-- Plain Text Preview -->
        <div
          v-if="activePreviewTab === 'text'"
          class="border rounded-lg p-4"
        >
          <pre class="text-sm text-gray-700 whitespace-pre-wrap font-mono">{{ previewData.emailText }}</pre>
        </div>

        <!-- SMS Preview -->
        <div
          v-if="activePreviewTab === 'sms'"
          class="flex justify-center"
        >
          <div class="w-80">
            <div class="bg-gray-100 rounded-2xl p-4">
              <div class="bg-green-500 text-white rounded-2xl rounded-br-md px-4 py-2 text-sm max-w-[85%] ml-auto">
                {{ previewData.smsBody || '(no SMS content)' }}
              </div>
              <p class="text-xs text-gray-500 mt-2 text-center">
                {{ previewData.smsCharacterCount }} chars / {{ previewData.smsSegments }} segment{{ previewData.smsSegments !== 1 ? 's' : '' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <UiButton
          variant="outline"
          @click="showPreviewModal = false"
        >
          Close
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { Mail as MailIcon, MessageSquare as MessageSquareIcon } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

interface VariableDefinition {
  key: string
  label: string
  sampleValue: string
}

interface MessageTemplate {
  id: string
  slug: string
  name: string
  description: string | null
  category: string
  triggerEvent: string | null
  emailSubject: string | null
  emailBody: string | null
  emailText: string | null
  emailHeaderText: string | null
  emailHeaderColor: string | null
  emailActionLabel: string | null
  smsBody: string | null
  variableSchema: VariableDefinition[]
  channelConfig: { email: boolean, sms: boolean }
  isActive: boolean
  isSystemTemplate: boolean
}

interface PreviewData {
  emailSubject: string
  emailHtml: string
  emailText: string
  smsBody: string
  smsCharacterCount: number
  smsSegments: number
}

const loading = ref(true)
const saving = ref(false)
const templates = ref<MessageTemplate[]>([])
const activeCategory = ref('ALL')
const editingTemplate = ref<MessageTemplate | null>(null)
const showEditModal = ref(false)
const previewingTemplate = ref<MessageTemplate | null>(null)
const previewData = ref<PreviewData | null>(null)
const showPreviewModal = ref(false)
const activePreviewTab = ref('email')
const sendingTestId = ref<string | null>(null)

const editForm = reactive({
  name: '',
  description: '',
  emailSubject: '',
  emailBody: '',
  emailHeaderText: '',
  emailHeaderColor: '#0A2540',
  emailActionLabel: '',
  smsBody: '',
  channelConfig: { email: true, sms: false }
})

const categories = [
  { value: 'ALL', label: 'All' },
  { value: 'TRANSACTIONAL', label: 'Transactional' },
  { value: 'OPERATIONAL', label: 'Operational' },
  { value: 'MARKETING', label: 'Marketing' }
]

const previewTabs = [
  { key: 'email', label: 'Email' },
  { key: 'text', label: 'Plain Text' },
  { key: 'sms', label: 'SMS' }
]

const filteredTemplates = computed(() => {
  if (activeCategory.value === 'ALL') return templates.value
  return templates.value.filter(t => t.category === activeCategory.value)
})

function categoryBadgeClass(category: string) {
  switch (category) {
    case 'TRANSACTIONAL': return 'bg-blue-100 text-blue-800'
    case 'OPERATIONAL': return 'bg-amber-100 text-amber-800'
    case 'MARKETING': return 'bg-purple-100 text-purple-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

async function fetchTemplates() {
  loading.value = true
  try {
    const { data } = await $fetch<{ data: MessageTemplate[] }>('/api/admin/message-templates', {
      query: { activeOnly: 'false' }
    })
    templates.value = data
  }
  catch (err) {
    console.error('Failed to fetch templates:', err)
  }
  finally {
    loading.value = false
  }
}

function editTemplate(tmpl: MessageTemplate) {
  editingTemplate.value = tmpl
  editForm.name = tmpl.name
  editForm.description = tmpl.description || ''
  editForm.emailSubject = tmpl.emailSubject || ''
  editForm.emailBody = tmpl.emailBody || ''
  editForm.emailHeaderText = tmpl.emailHeaderText || ''
  editForm.emailHeaderColor = tmpl.emailHeaderColor || '#0A2540'
  editForm.emailActionLabel = tmpl.emailActionLabel || ''
  editForm.smsBody = tmpl.smsBody || ''
  editForm.channelConfig = { ...tmpl.channelConfig }
  showEditModal.value = true
}

async function saveTemplate() {
  if (!editingTemplate.value) return
  saving.value = true
  try {
    await $fetch(`/api/admin/message-templates/${editingTemplate.value.id}`, {
      method: 'PUT',
      body: {
        name: editForm.name,
        description: editForm.description || null,
        emailSubject: editForm.emailSubject,
        emailBody: editForm.emailBody,
        emailHeaderText: editForm.emailHeaderText,
        emailHeaderColor: editForm.emailHeaderColor,
        emailActionLabel: editForm.emailActionLabel || null,
        smsBody: editForm.smsBody || null,
        channelConfig: editForm.channelConfig
      }
    })
    showEditModal.value = false
    await fetchTemplates()
  }
  catch (err) {
    console.error('Failed to save template:', err)
  }
  finally {
    saving.value = false
  }
}

async function toggleActive(tmpl: MessageTemplate) {
  try {
    await $fetch(`/api/admin/message-templates/${tmpl.id}`, {
      method: 'PUT',
      body: { isActive: !tmpl.isActive }
    })
    await fetchTemplates()
  }
  catch (err) {
    console.error('Failed to toggle template:', err)
  }
}

async function previewTemplate(tmpl: MessageTemplate) {
  previewingTemplate.value = tmpl
  activePreviewTab.value = 'email'
  try {
    const { data } = await $fetch<{ data: PreviewData }>(`/api/admin/message-templates/${tmpl.id}/preview`, {
      method: 'POST'
    })
    previewData.value = data
    showPreviewModal.value = true
  }
  catch (err) {
    console.error('Failed to preview template:', err)
  }
}

async function sendTestEmail(tmpl: MessageTemplate) {
  sendingTestId.value = tmpl.id
  try {
    const { message } = await $fetch<{ message: string }>(`/api/admin/message-templates/${tmpl.id}/test-send`, {
      method: 'POST'
    })
    alert(message)
  }
  catch (err: any) {
    alert(err?.data?.message || 'Failed to send test email')
  }
  finally {
    sendingTestId.value = null
  }
}

function copyVariable(key: string) {
  navigator.clipboard.writeText(`{{${key}}}`)
}

onMounted(fetchTemplates)
</script>
