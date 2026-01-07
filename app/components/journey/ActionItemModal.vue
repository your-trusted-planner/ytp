<template>
  <UiModal v-model="isOpen" :title="editingItem ? 'Edit Action Item' : 'Add Action Item'" size="xl">
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Engagement Journey Banner -->
      <div v-if="journeyType === 'ENGAGEMENT'" class="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p class="text-sm text-blue-800">
          <strong>Engagement Journey:</strong> Only certain action types are available.
        </p>
      </div>

      <!-- Action Type Selector -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-3">Action Type</label>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          <button
            v-for="type in availableActionTypes"
            :key="type.value"
            type="button"
            @click="form.actionType = type.value"
            :class="[
              'p-4 border-2 rounded-lg text-left transition-all hover:shadow-md',
              form.actionType === type.value
                ? 'border-burgundy-600 bg-burgundy-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            ]"
          >
            <component
              :is="type.icon"
              class="w-6 h-6 mb-2"
              :class="form.actionType === type.value ? 'text-burgundy-600' : 'text-gray-400'"
            />
            <div class="font-semibold text-sm mb-1">{{ type.label }}</div>
            <div class="text-xs text-gray-600">{{ type.description }}</div>
          </button>
        </div>
      </div>

      <!-- Basic Information -->
      <div class="grid grid-cols-1 gap-4">
        <UiInput
          v-model="form.title"
          label="Action Title"
          placeholder="e.g., Complete personal information questionnaire"
          required
        />

        <UiTextarea
          v-model="form.description"
          label="Description"
          placeholder="Additional details or instructions..."
          :rows="3"
        />
      </div>

      <!-- Assignment & Priority -->
      <div class="grid grid-cols-2 gap-4">
        <UiSelect
          v-model="form.assignedTo"
          label="Assigned To"
          required
        >
          <option value="CLIENT">Client</option>
          <option value="LAWYER">Lawyer</option>
          <option value="STAFF">Staff</option>
          <option value="AUTOMATION">Automation</option>
          <option value="THIRD_PARTY">Third Party</option>
        </UiSelect>

        <UiSelect
          v-model="form.priority"
          label="Priority"
          required
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </UiSelect>
      </div>

      <!-- Type-Specific Configuration -->
      <div v-if="form.actionType" class="border-t border-gray-200 pt-4">
        <h3 class="text-sm font-semibold text-gray-900 mb-3">{{ getActionTypeLabel(form.actionType) }} Configuration</h3>

        <!-- Meeting Configuration -->
        <div v-if="form.actionType === 'MEETING'" class="space-y-3">
          <UiSelect v-model="form.config.meetingType" label="Meeting Type">
            <option value="PHONE">Phone Call</option>
            <option value="VIDEO">Video Call</option>
            <option value="IN_PERSON">In Person</option>
          </UiSelect>
          <UiInput
            v-model.number="form.config.durationMinutes"
            type="number"
            label="Duration (minutes)"
            placeholder="30"
          />
          <div class="flex items-center">
            <input
              v-model="form.systemIntegrationType"
              type="checkbox"
              id="calendar-integration"
              value="calendar"
              class="h-4 w-4 text-burgundy-600 focus:ring-burgundy-500 border-gray-300 rounded"
            />
            <label for="calendar-integration" class="ml-2 block text-sm text-gray-900">
              Integrate with calendar system
            </label>
          </div>
        </div>

        <!-- Upload Configuration -->
        <div v-else-if="form.actionType === 'UPLOAD'" class="space-y-3">
          <UiInput
            v-model="form.config.fileTypes"
            label="Accepted File Types"
            placeholder="e.g., PDF, DOCX, JPG"
          />
          <UiInput
            v-model.number="form.config.maxFiles"
            type="number"
            label="Maximum Number of Files"
            placeholder="1"
          />
          <div class="flex items-center">
            <input
              v-model="form.systemIntegrationType"
              type="checkbox"
              id="document-integration"
              value="document"
              class="h-4 w-4 text-burgundy-600 focus:ring-burgundy-500 border-gray-300 rounded"
            />
            <label for="document-integration" class="ml-2 block text-sm text-gray-900">
              Integrate with document management system
            </label>
          </div>
        </div>

        <!-- Payment Configuration -->
        <div v-else-if="form.actionType === 'PAYMENT'" class="space-y-3">
          <UiInput
            v-model.number="form.config.amount"
            type="number"
            step="0.01"
            label="Payment Amount ($)"
            placeholder="0.00"
          />
          <UiSelect v-model="form.config.paymentType" label="Payment Type">
            <option value="DEPOSIT">Deposit</option>
            <option value="INSTALLMENT">Installment</option>
            <option value="FINAL">Final Payment</option>
            <option value="FEE">Fee</option>
          </UiSelect>
          <div class="flex items-center">
            <input
              v-model="form.systemIntegrationType"
              type="checkbox"
              id="payment-integration"
              value="payment"
              class="h-4 w-4 text-burgundy-600 focus:ring-burgundy-500 border-gray-300 rounded"
            />
            <label for="payment-integration" class="ml-2 block text-sm text-gray-900">
              Integrate with payment processing system
            </label>
          </div>
        </div>

        <!-- Questionnaire Configuration -->
        <div v-else-if="form.actionType === 'QUESTIONNAIRE'" class="space-y-3">
          <UiInput
            v-model="form.config.templateId"
            label="Questionnaire Template ID"
            placeholder="Optional: Link to specific template"
          />
          <UiInput
            v-model.number="form.config.estimatedMinutes"
            type="number"
            label="Estimated Time to Complete (minutes)"
            placeholder="15"
          />
        </div>

        <!-- E-Signature Configuration -->
        <div v-else-if="form.actionType === 'ESIGN'" class="space-y-3">
          <UiInput
            v-model="form.config.documentName"
            label="Document Name"
            placeholder="e.g., Trust Agreement"
          />
          <div class="flex items-center">
            <input
              v-model="form.config.requiresWitness"
              type="checkbox"
              id="requires-witness"
              class="h-4 w-4 text-burgundy-600 focus:ring-burgundy-500 border-gray-300 rounded"
            />
            <label for="requires-witness" class="ml-2 block text-sm text-gray-900">
              Requires witness
            </label>
          </div>
          <div class="flex items-center">
            <input
              v-model="form.systemIntegrationType"
              type="checkbox"
              id="esign-integration"
              value="document"
              class="h-4 w-4 text-burgundy-600 focus:ring-burgundy-500 border-gray-300 rounded"
            />
            <label for="esign-integration" class="ml-2 block text-sm text-gray-900">
              Integrate with e-signature platform
            </label>
          </div>
        </div>

        <!-- Draft Document Configuration -->
        <div v-else-if="form.actionType === 'DRAFT_DOCUMENT'" class="space-y-3">
          <UiInput
            v-model="form.config.documentName"
            label="Document Name"
            placeholder="e.g., Wyoming Asset Protection Trust Agreement"
          />
          <UiInput
            v-model="form.config.templateId"
            label="Template ID"
            placeholder="Optional: ID of document template to use"
          />
          <UiTextarea
            v-model="form.config.notes"
            label="Drafting Notes"
            placeholder="Special instructions or requirements for drafting this document..."
            :rows="2"
          />
          <div class="flex items-center">
            <input
              v-model="form.systemIntegrationType"
              type="checkbox"
              id="document-integration"
              value="document"
              class="h-4 w-4 text-burgundy-600 focus:ring-burgundy-500 border-gray-300 rounded"
            />
            <label for="document-integration" class="ml-2 block text-sm text-gray-900">
              Integrate with document generation system
            </label>
          </div>
          <div class="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <p>This action type will be fully integrated with the document drafting system in a future release. For now, use it to track document completion tasks.</p>
          </div>
        </div>

        <!-- Generic configuration for other types -->
        <div v-else class="text-sm text-gray-600">
          <p>Additional configuration options for {{ getActionTypeLabel(form.actionType) }} will be available soon.</p>
        </div>
      </div>

      <!-- Service Delivery Verification (for final step actions) -->
      <div v-if="step?.is_final_step || step?.requires_verification" class="border-t border-gray-200 pt-4">
        <div class="flex items-start mb-3">
          <input
            v-model="form.isServiceDeliveryVerification"
            type="checkbox"
            id="service-delivery"
            class="h-4 w-4 text-burgundy-600 focus:ring-burgundy-500 border-gray-300 rounded mt-1"
          />
          <div class="ml-2">
            <label for="service-delivery" class="block text-sm font-medium text-gray-900">
              🔔 Ring the Bell - Service Delivery Verification
            </label>
            <p class="text-xs text-gray-600 mt-1">
              Mark this action as objective proof that the service has been delivered
            </p>
          </div>
        </div>

        <div v-if="form.isServiceDeliveryVerification" class="space-y-3 ml-6">
          <UiTextarea
            v-model="form.verificationCriteriaText"
            label="Verification Criteria"
            placeholder="e.g., Client has received and signed the final trust documents"
            :rows="2"
          />
        </div>
      </div>
    </form>

    <template #footer>
      <UiButton variant="outline" @click="handleCancel">
        Cancel
      </UiButton>
      <UiButton @click="handleSubmit" :is-loading="saving">
        {{ editingItem ? 'Update' : 'Add' }} Action Item
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import {
  FileText, CheckSquare, Upload, Eye, PenTool, UserCheck, CreditCard, Calendar,
  Zap, Users, ClipboardList, DollarSign, FormInput as FormInputIcon, FilePenLine
} from 'lucide-vue-next'

interface Props {
  modelValue: boolean
  step: any
  editingItem?: any | null
  journeyType?: 'ENGAGEMENT' | 'SERVICE'
}

const props = withDefaults(defineProps<Props>(), {
  editingItem: null,
  journeyType: 'SERVICE'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': [stepId: string]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const saving = ref(false)

const actionTypes = [
  { value: 'QUESTIONNAIRE', label: 'Questionnaire', icon: FileText, description: 'Client fills out form' },
  { value: 'UPLOAD', label: 'Upload', icon: Upload, description: 'Client uploads documents' },
  { value: 'REVIEW', label: 'Review', icon: Eye, description: 'Review documents/info' },
  { value: 'ESIGN', label: 'E-Signature', icon: PenTool, description: 'Electronic signature required' },
  { value: 'PAYMENT', label: 'Payment', icon: CreditCard, description: 'Payment processing' },
  { value: 'MEETING', label: 'Meeting', icon: Calendar, description: 'Scheduled meeting/call' },
  { value: 'DRAFT_DOCUMENT', label: 'Draft Document', icon: FilePenLine, description: 'Complete/draft document' },
  { value: 'DECISION', label: 'Decision', icon: CheckSquare, description: 'Client makes a choice' },
  { value: 'KYC', label: 'KYC/Identity', icon: UserCheck, description: 'Identity verification' },
  { value: 'AUTOMATION', label: 'Automation', icon: Zap, description: 'Automated task' },
  { value: 'THIRD_PARTY', label: 'Third Party', icon: Users, description: 'External service' },
  { value: 'OFFLINE_TASK', label: 'Offline Task', icon: ClipboardList, description: 'Manual offline work' },
  { value: 'EXPENSE', label: 'Expense', icon: DollarSign, description: 'Expense/fee tracking' }
]

// Filter action types based on journey type
const ALLOWED_ENGAGEMENT_ACTIONS = [
  'DRAFT_DOCUMENT', 'ESIGN', 'PAYMENT', 'MEETING',
  'REVIEW', 'UPLOAD', 'DECISION'
]

const availableActionTypes = computed(() => {
  if (props.journeyType === 'ENGAGEMENT') {
    return actionTypes.filter(type =>
      ALLOWED_ENGAGEMENT_ACTIONS.includes(type.value)
    )
  }
  return actionTypes
})

const form = ref({
  actionType: 'QUESTIONNAIRE',
  title: '',
  description: '',
  assignedTo: 'CLIENT',
  priority: 'MEDIUM',
  systemIntegrationType: null,
  isServiceDeliveryVerification: false,
  verificationCriteriaText: '',
  config: {} as any
})

// Initialize form when editing
watch(() => props.editingItem, (item) => {
  if (item) {
    form.value = {
      actionType: item.actionType || 'QUESTIONNAIRE',
      title: item.title || '',
      description: item.description || '',
      assignedTo: item.assignedTo || 'CLIENT',
      priority: item.priority || 'MEDIUM',
      systemIntegrationType: item.systemIntegrationType || null,
      isServiceDeliveryVerification: item.isServiceDeliveryVerification || false,
      verificationCriteriaText: item.verificationCriteria ? JSON.parse(item.verificationCriteria) : '',
      config: item.config ? JSON.parse(item.config) : {}
    }
  } else {
    // Reset form for new item
    form.value = {
      actionType: 'QUESTIONNAIRE',
      title: '',
      description: '',
      assignedTo: 'CLIENT',
      priority: 'MEDIUM',
      systemIntegrationType: null,
      isServiceDeliveryVerification: false,
      verificationCriteriaText: '',
      config: {}
    }
  }
}, { immediate: true })

function getActionTypeLabel(type: string): string {
  const found = actionTypes.find(t => t.value === type)
  return found ? found.label : type
}

async function handleSubmit() {
  if (!form.value.title || !form.value.actionType) {
    alert('Please fill in all required fields')
    return
  }

  saving.value = true
  try {
    const payload = {
      stepId: props.step.id,
      actionType: form.value.actionType,
      title: form.value.title,
      description: form.value.description,
      assignedTo: form.value.assignedTo,
      priority: form.value.priority,
      config: form.value.config,
      systemIntegrationType: form.value.systemIntegrationType,
      isServiceDeliveryVerification: form.value.isServiceDeliveryVerification,
      verificationCriteria: form.value.isServiceDeliveryVerification ? form.value.verificationCriteriaText : null
    }

    if (props.editingItem) {
      // Update existing
      await $fetch(`/api/action-items/${props.editingItem.id}`, {
        method: 'PUT',
        body: payload
      })
    } else {
      // Create new
      await $fetch('/api/action-items', {
        method: 'POST',
        body: payload
      })
    }

    emit('save', props.step.id)
  } catch (error: any) {
    console.error('Error saving action item:', error)
    alert(error.data?.message || 'Failed to save action item')
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  isOpen.value = false
}
</script>
