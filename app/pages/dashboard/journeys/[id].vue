<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <button @click="$router.back()" class="text-gray-600 hover:text-gray-900">
          <IconArrowLeft class="w-5 h-5" />
        </button>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{{ journey?.name || 'Journey Builder' }}</h1>
          <p v-if="journey?.description" class="text-gray-600 mt-1">{{ journey.description }}</p>
        </div>
      </div>
      <div class="flex items-center space-x-3">
        <!-- Preview feature disabled for now - not on critical path
        <UiButton variant="ghost" @click="showPreview = true">
          <IconEye class="w-4 h-4 mr-2" />
          Preview
        </UiButton>
        -->
        <UiButton variant="outline" @click="showEditModal = true">
          <IconEdit class="w-4 h-4 mr-2" />
          Edit Journey
        </UiButton>
        <UiButton @click="addStep">
          <IconPlus class="w-4 h-4 mr-2" />
          Add Step
        </UiButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <IconLoader class="w-8 h-8 animate-spin text-burgundy-600" />
    </div>

    <!-- Validation Warning -->
    <div v-if="!loading && validationWarnings.length > 0" class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div class="flex">
        <div class="flex-shrink-0">
          <IconAlertTriangle class="h-5 w-5 text-yellow-400" />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-yellow-800">Journey Validation Warnings</h3>
          <div class="mt-2 text-sm text-yellow-700">
            <ul class="list-disc list-inside space-y-1">
              <li v-for="warning in validationWarnings" :key="warning">{{ warning }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Journey Builder -->
    <div v-if="!loading" class="bg-white rounded-lg border border-gray-200 p-8">
      <!-- Empty State -->
      <div v-if="steps.length === 0" class="text-center py-12">
        <IconGitBranch class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">No steps yet</h3>
        <p class="text-gray-600 mb-4">Add your first step to start building this journey</p>
        <UiButton @click="addStep">Add First Step</UiButton>
      </div>

      <!-- Journey Steps -->
      <div v-else class="space-y-4">
        <draggable
          v-model="steps"
          item-key="id"
          handle=".drag-handle"
          @end="reorderSteps"
          class="space-y-4"
        >
          <template #item="{ element: step, index }">
            <div
              :class="[
                'border-2 rounded-lg p-6 transition-all',
                step.step_type === 'BRIDGE' 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-200 bg-white',
                'hover:shadow-md'
              ]"
            >
              <div class="flex items-start space-x-4">
                <!-- Drag Handle -->
                <button class="drag-handle cursor-move text-gray-400 hover:text-gray-600 mt-1">
                  <IconGripVertical class="w-5 h-5" />
                </button>

                <!-- Step Number/Icon -->
                <div
                  :class="[
                    'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold',
                    step.step_type === 'BRIDGE'
                      ? 'bg-blue-500 text-white'
                      : 'bg-burgundy-600 text-white'
                  ]"
                >
                  <IconCircleDot v-if="step.step_type === 'MILESTONE'" class="w-5 h-5" />
                  <IconRepeat v-else class="w-5 h-5" />
                </div>

                <!-- Step Content -->
                <div class="flex-1">
                  <div class="flex items-start justify-between mb-3">
                    <div class="flex-1">
                      <h3 class="text-lg font-semibold text-gray-900">{{ step.name }}</h3>
                      <p v-if="step.description" class="text-sm text-gray-600 mt-1">{{ step.description }}</p>
                    </div>
                    <div class="flex items-center space-x-2 ml-4">
                      <span
                        :class="[
                          'px-3 py-1 rounded-full text-xs font-medium',
                          step.step_type === 'BRIDGE'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        ]"
                      >
                        {{ step.step_type === 'BRIDGE' ? 'Bridge Step' : 'Milestone' }}
                      </span>
                    </div>
                  </div>

                  <!-- Step Details -->
                  <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span class="text-gray-500">Responsible:</span>
                      <span class="ml-2 text-gray-900 font-medium">{{ formatResponsibleParty(step.responsible_party) }}</span>
                    </div>
                    <div v-if="step.expected_duration_days">
                      <span class="text-gray-500">Duration:</span>
                      <span class="ml-2 text-gray-900 font-medium">{{ step.expected_duration_days }} days</span>
                    </div>
                    <div v-if="step.step_type === 'BRIDGE' && step.allow_multiple_iterations">
                      <span class="inline-flex items-center text-blue-600">
                        <IconRepeat class="w-4 h-4 mr-1" />
                        Allows multiple iterations
                      </span>
                    </div>
                  </div>

                  <!-- Help Content Preview -->
                  <div v-if="step.help_content" class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    <IconHelpCircle class="w-4 h-4 inline mr-1" />
                    Help content available
                  </div>

                  <!-- Action Items Section -->
                  <div class="mt-4 border-t border-gray-200 pt-4">
                    <button
                      @click="toggleActionItems(step.id)"
                      class="flex items-center justify-between w-full text-left"
                    >
                      <div class="flex items-center space-x-2">
                        <IconCheckSquare class="w-5 h-5 text-gray-600" />
                        <span class="font-semibold text-gray-900">Action Items</span>
                        <span
                          v-if="getActionItemsForStep(step.id).length > 0"
                          class="px-2 py-0.5 text-xs font-medium bg-burgundy-100 text-burgundy-700 rounded-full"
                        >
                          {{ getActionItemsForStep(step.id).length }}
                        </span>
                        <span
                          v-else
                          class="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full"
                        >
                          Required
                        </span>
                      </div>
                      <IconChevronDown
                        class="w-5 h-5 text-gray-400 transition-transform"
                        :class="{ 'rotate-180': expandedSteps.has(step.id) }"
                      />
                    </button>

                    <!-- Expanded Action Items List -->
                    <div v-if="expandedSteps.has(step.id)" class="mt-3 space-y-2">
                      <!-- Action Items List -->
                      <div
                        v-for="actionItem in getActionItemsForStep(step.id)"
                        :key="actionItem.id"
                        class="p-3 bg-gray-50 rounded border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div class="flex items-start justify-between">
                          <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-1">
                              <component
                                :is="getActionTypeIcon(actionItem.actionType)"
                                class="w-4 h-4 text-gray-600"
                              />
                              <span class="font-medium text-gray-900">{{ actionItem.title }}</span>
                              <span class="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                                {{ formatActionType(actionItem.actionType) }}
                              </span>
                            </div>
                            <p v-if="actionItem.description" class="text-sm text-gray-600 ml-6">
                              {{ actionItem.description }}
                            </p>
                            <div class="flex items-center space-x-3 ml-6 mt-1 text-xs text-gray-500">
                              <span>Assigned: {{ actionItem.assignedTo }}</span>
                              <span>Priority: {{ actionItem.priority }}</span>
                            </div>
                          </div>
                          <div class="flex items-center space-x-1 ml-2">
                            <button
                              @click="editActionItem(step, actionItem)"
                              class="p-1 text-gray-400 hover:text-gray-600"
                              title="Edit"
                            >
                              <IconEdit class="w-4 h-4" />
                            </button>
                            <button
                              @click="deleteActionItem(actionItem.id, step.id)"
                              class="p-1 text-gray-400 hover:text-red-600"
                              title="Delete"
                            >
                              <IconTrash class="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <!-- Empty State -->
                      <div
                        v-if="getActionItemsForStep(step.id).length === 0"
                        class="text-center py-6 text-gray-500 text-sm"
                      >
                        No action items yet. At least one action item is required.
                      </div>

                      <!-- Add Action Item Button -->
                      <button
                        @click="addActionItem(step)"
                        class="w-full py-2 px-3 border-2 border-dashed border-gray-300 rounded text-sm text-gray-600 hover:border-burgundy-500 hover:text-burgundy-600 transition-colors flex items-center justify-center space-x-2"
                      >
                        <IconPlus class="w-4 h-4" />
                        <span>Add Action Item</span>
                      </button>
                    </div>
                  </div>

                  <!-- Step Actions -->
                  <div class="mt-4 flex items-center space-x-3">
                    <button
                      @click="editStep(step)"
                      class="text-sm text-burgundy-600 hover:text-burgundy-700 font-medium"
                    >
                      Edit Step
                    </button>
                    <button
                      @click="duplicateStep(step)"
                      class="text-sm text-gray-600 hover:text-gray-700 font-medium"
                    >
                      Duplicate
                    </button>
                    <button
                      @click="deleteStep(step.id)"
                      class="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <!-- Arrow to Next Step -->
              <div v-if="index < steps.length - 1" class="flex justify-center my-4">
                <IconArrowDown class="w-6 h-6 text-gray-400" />
              </div>
            </div>
          </template>
        </draggable>
      </div>
    </div>

    <!-- Add/Edit Step Modal -->
    <UiModal v-model="showStepModal" :title="editingStep ? 'Edit Step' : 'Add Step'" size="xl">
      <form @submit.prevent="saveStep" class="space-y-4">
        <!-- Step Type -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Step Type</label>
          <div class="grid grid-cols-2 gap-4">
            <button
              type="button"
              @click="stepForm.stepType = 'MILESTONE'"
              :class="[
                'p-4 border-2 rounded-lg text-left transition-all',
                stepForm.stepType === 'MILESTONE'
                  ? 'border-burgundy-600 bg-burgundy-50'
                  : 'border-gray-200 hover:border-gray-300'
              ]"
            >
              <IconCircleDot class="w-6 h-6 mb-2" :class="stepForm.stepType === 'MILESTONE' ? 'text-burgundy-600' : 'text-gray-400'" />
              <div class="font-semibold mb-1">Milestone</div>
              <div class="text-xs text-gray-600">A binary destination point in the journey</div>
            </button>
            <button
              type="button"
              @click="stepForm.stepType = 'BRIDGE'"
              :class="[
                'p-4 border-2 rounded-lg text-left transition-all',
                stepForm.stepType === 'BRIDGE'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              ]"
            >
              <IconRepeat class="w-6 h-6 mb-2" :class="stepForm.stepType === 'BRIDGE' ? 'text-blue-600' : 'text-gray-400'" />
              <div class="font-semibold mb-1">Bridge Step</div>
              <div class="text-xs text-gray-600">A circular feedback loop requiring approval from both parties</div>
            </button>
          </div>
        </div>

        <UiInput
          v-model="stepForm.name"
          label="Step Name"
          placeholder="e.g., Homework Assigned, Snapshot Review & Revision"
          required
        />

        <UiTextarea
          v-model="stepForm.description"
          label="Description"
          placeholder="Describe what happens in this step..."
          :rows="3"
        />

        <UiSelect
          v-model="stepForm.responsibleParty"
          label="Responsible Party"
          required
        >
          <option value="CLIENT">Client</option>
          <option value="COUNSEL">Counsel/Lawyer</option>
          <option value="STAFF">Staff</option>
          <option value="BOTH">Both (Client & Counsel)</option>
        </UiSelect>

        <UiInput
          v-model.number="stepForm.expectedDurationDays"
          type="number"
          label="Expected Duration (Days)"
          placeholder="e.g., 7"
        />

        <UiTextarea
          v-model="stepForm.helpContent"
          label="Help Content"
          placeholder="Instructions or help text for clients..."
          :rows="4"
        />

        <div v-if="stepForm.stepType === 'BRIDGE'" class="flex items-center">
          <input
            v-model="stepForm.allowMultipleIterations"
            type="checkbox"
            id="allowMultipleIterations"
            class="h-4 w-4 text-burgundy-600 focus:ring-burgundy-500 border-gray-300 rounded"
          />
          <label for="allowMultipleIterations" class="ml-2 block text-sm text-gray-900">
            Allow multiple iterations (revisions)
          </label>
        </div>

        <div class="flex justify-end space-x-3 pt-4 border-t">
          <UiButton type="button" variant="ghost" @click="showStepModal = false">
            Cancel
          </UiButton>
          <UiButton type="submit" :loading="savingStep">
            {{ editingStep ? 'Update Step' : 'Add Step' }}
          </UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Edit Journey Modal -->
    <JourneyEditModal
      v-model="showEditModal"
      :journey="journey"
      :service-catalog="serviceCatalog"
      @save="handleJourneySaved"
    />

    <!-- Action Item Modal -->
    <JourneyActionItemModal
      v-model="showActionItemModal"
      :step="currentStep"
      :editing-item="editingActionItem"
      @save="handleActionItemSaved"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeft as IconArrowLeft, Plus as IconPlus, Loader as IconLoader, GitBranch as IconGitBranch,
  GripVertical as IconGripVertical, CircleDot as IconCircleDot, Repeat as IconRepeat, ArrowDown as IconArrowDown,
  HelpCircle as IconHelpCircle, Edit as IconEdit, ChevronDown as IconChevronDown, CheckSquare as IconCheckSquare,
  Trash as IconTrash, FileText as IconFileText, Upload as IconUpload, Eye as IconEye, PenTool as IconPenTool,
  CreditCard as IconCreditCard, Calendar as IconCalendar, UserCheck as IconUserCheck, Zap as IconZap,
  Users as IconUsers, ClipboardList as IconClipboardList, DollarSign as IconDollarSign, FormInput as IconFormInput,
  AlertTriangle as IconAlertTriangle, FilePenLine as IconFilePenLine
} from 'lucide-vue-next'
import draggable from 'vuedraggable'

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

const route = useRoute()
const loading = ref(true)
const savingStep = ref(false)
const showStepModal = ref(false)
const showEditModal = ref(false)
const editingStep = ref(null)

const journey = ref(null)
const steps = ref([])
const serviceCatalog = ref([])

// Action items state
const actionItemsByStep = ref<Map<string, any[]>>(new Map())
const expandedSteps = ref<Set<string>>(new Set())
const showActionItemModal = ref(false)
const editingActionItem = ref(null)
const currentStep = ref(null)

// Validation state
const validationWarnings = ref<string[]>([])

const stepForm = ref({
  stepType: 'MILESTONE',
  name: '',
  description: '',
  responsibleParty: 'CLIENT',
  expectedDurationDays: null,
  helpContent: '',
  allowMultipleIterations: true
})

// Fetch journey and steps
async function fetchJourney() {
  loading.value = true
  try {
    const data = await $fetch(`/api/journeys/${route.params.id}`)
    journey.value = data.journey
    steps.value = data.steps || []

    // Validate journey after fetching
    await validateJourney()
  } catch (error) {
    console.error('Error fetching journey:', error)
  } finally {
    loading.value = false
  }
}

// Validate journey
async function validateJourney() {
  if (!route.params.id) return

  try {
    const validation = await $fetch(`/api/journeys/${route.params.id}/validate`)

    // Build warnings array
    const warnings: string[] = []

    if (!validation.valid && validation.stepsWithoutActions.length > 0) {
      warnings.push(`${validation.stepsWithoutActions.length} step(s) require at least one action item`)
    }

    if (validation.warnings) {
      warnings.push(...validation.warnings)
    }

    validationWarnings.value = warnings
  } catch (error) {
    console.error('Error validating journey:', error)
  }
}

// Add step
function addStep() {
  editingStep.value = null
  stepForm.value = {
    stepType: 'MILESTONE',
    name: '',
    description: '',
    responsibleParty: 'CLIENT',
    expectedDurationDays: null,
    helpContent: '',
    allowMultipleIterations: true
  }
  showStepModal.value = true
}

// Edit step
function editStep(step: any) {
  editingStep.value = step
  stepForm.value = {
    stepType: step.step_type,
    name: step.name,
    description: step.description || '',
    responsibleParty: step.responsible_party,
    expectedDurationDays: step.expected_duration_days,
    helpContent: step.help_content || '',
    allowMultipleIterations: Boolean(step.allow_multiple_iterations)
  }
  showStepModal.value = true
}

// Save step
async function saveStep() {
  savingStep.value = true
  try {
    if (editingStep.value) {
      // Update existing step
      await $fetch(`/api/journey-steps/${editingStep.value.id}`, {
        method: 'PUT',
        body: {
          ...stepForm.value,
          stepOrder: editingStep.value.step_order
        }
      })
    } else {
      // Create new step
      await $fetch('/api/journey-steps', {
        method: 'POST',
        body: {
          journeyId: route.params.id,
          ...stepForm.value,
          stepOrder: steps.value.length
        }
      })
    }
    showStepModal.value = false
    await fetchJourney()
  } catch (error) {
    console.error('Error saving step:', error)
  } finally {
    savingStep.value = false
  }
}

// Delete step
async function deleteStep(stepId: string) {
  if (!confirm('Are you sure you want to delete this step?')) return
  
  try {
    await $fetch(`/api/journey-steps/${stepId}`, { method: 'DELETE' })
    await fetchJourney()
  } catch (error) {
    console.error('Error deleting step:', error)
  }
}

// Duplicate step
function duplicateStep(step: any) {
  editingStep.value = null
  stepForm.value = {
    stepType: step.step_type,
    name: `${step.name} (Copy)`,
    description: step.description || '',
    responsibleParty: step.responsible_party,
    expectedDurationDays: step.expected_duration_days,
    helpContent: step.help_content || '',
    allowMultipleIterations: Boolean(step.allow_multiple_iterations)
  }
  showStepModal.value = true
}

// Reorder steps after drag and drop
async function reorderSteps() {
  const updates = steps.value.map((step, index) => ({
    id: step.id,
    order: index
  }))
  
  try {
    await $fetch('/api/journey-steps/reorder', {
      method: 'POST',
      body: { steps: updates }
    })
  } catch (error) {
    console.error('Error reordering steps:', error)
  }
}

// Format responsible party for display
function formatResponsibleParty(party: string) {
  const map = {
    CLIENT: 'Client',
    COUNSEL: 'Counsel/Lawyer',
    STAFF: 'Staff',
    BOTH: 'Client & Counsel'
  }
  return map[party] || party
}

// Fetch service catalog for dropdown
async function fetchServiceCatalog() {
  try {
    const { catalog: data } = await $fetch('/api/service-catalog')
    serviceCatalog.value = data
  } catch (error) {
    console.error('Error fetching service catalog:', error)
  }
}

// Handle journey saved from modal
async function handleJourneySaved() {
  // Refresh journey data to get updated values
  await fetchJourney()
}

// Action Items Management
function toggleActionItems(stepId: string) {
  if (expandedSteps.value.has(stepId)) {
    expandedSteps.value.delete(stepId)
  } else {
    expandedSteps.value.add(stepId)
    // Fetch action items if not already loaded
    if (!actionItemsByStep.value.has(stepId)) {
      fetchActionItemsForStep(stepId)
    }
  }
}

async function fetchActionItemsForStep(stepId: string) {
  try {
    const { actionItems } = await $fetch(`/api/action-items/step/${stepId}`)
    actionItemsByStep.value.set(stepId, actionItems || [])
  } catch (error) {
    console.error('Error fetching action items:', error)
    actionItemsByStep.value.set(stepId, [])
  }
}

function getActionItemsForStep(stepId: string): any[] {
  return actionItemsByStep.value.get(stepId) || []
}

function addActionItem(step: any) {
  currentStep.value = step
  editingActionItem.value = null
  showActionItemModal.value = true
}

function editActionItem(step: any, actionItem: any) {
  currentStep.value = step
  editingActionItem.value = actionItem
  showActionItemModal.value = true
}

async function deleteActionItem(actionItemId: string, stepId: string) {
  if (!confirm('Are you sure you want to delete this action item?')) return

  try {
    await $fetch(`/api/action-items/${actionItemId}`, { method: 'DELETE' })
    await fetchActionItemsForStep(stepId)
    // Revalidate after deleting action item
    await validateJourney()
  } catch (error) {
    console.error('Error deleting action item:', error)
    alert('Failed to delete action item')
  }
}

async function handleActionItemSaved(stepId: string) {
  showActionItemModal.value = false
  await fetchActionItemsForStep(stepId)
  // Revalidate after adding/editing action item
  await validateJourney()
}

// Action type formatting
function formatActionType(type: string): string {
  const typeMap = {
    QUESTIONNAIRE: 'Questionnaire',
    DECISION: 'Decision',
    UPLOAD: 'Upload',
    REVIEW: 'Review',
    ESIGN: 'E-Signature',
    NOTARY: 'Notary',
    PAYMENT: 'Payment',
    MEETING: 'Meeting',
    KYC: 'KYC/Identity',
    AUTOMATION: 'Automation',
    THIRD_PARTY: 'Third Party',
    OFFLINE_TASK: 'Offline Task',
    EXPENSE: 'Expense',
    FORM: 'Form',
    DRAFT_DOCUMENT: 'Draft Document'
  }
  return typeMap[type] || type
}

function getActionTypeIcon(type: string) {
  const iconMap = {
    QUESTIONNAIRE: IconFileText,
    DECISION: IconCheckSquare,
    UPLOAD: IconUpload,
    REVIEW: IconEye,
    ESIGN: IconPenTool,
    NOTARY: IconUserCheck,
    PAYMENT: IconCreditCard,
    MEETING: IconCalendar,
    KYC: IconUserCheck,
    AUTOMATION: IconZap,
    THIRD_PARTY: IconUsers,
    OFFLINE_TASK: IconClipboardList,
    EXPENSE: IconDollarSign,
    FORM: IconFormInput,
    DRAFT_DOCUMENT: IconFilePenLine
  }
  return iconMap[type] || IconCheckSquare
}

onMounted(() => {
  fetchJourney()
  fetchServiceCatalog()
})
</script>
