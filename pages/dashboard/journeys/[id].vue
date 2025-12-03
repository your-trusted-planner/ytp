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
        <UiButton variant="ghost" @click="showPreview = true">
          <IconEye class="w-4 h-4 mr-2" />
          Preview
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

    <!-- Journey Builder -->
    <div v-else class="bg-white rounded-lg border border-gray-200 p-8">
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

                  <!-- Actions -->
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
          rows="3"
        />

        <UiSelect
          v-model="stepForm.responsibleParty"
          label="Responsible Party"
          required
        >
          <option value="CLIENT">Client</option>
          <option value="COUNCIL">Council/Lawyer</option>
          <option value="STAFF">Staff</option>
          <option value="BOTH">Both (Client & Council)</option>
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
          rows="4"
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
  </div>
</template>

<script setup lang="ts">
import { 
  ArrowLeft as IconArrowLeft, Eye as IconEye, Plus as IconPlus, Loader as IconLoader, GitBranch as IconGitBranch,
  GripVertical as IconGripVertical, CircleDot as IconCircleDot, Repeat as IconRepeat, ArrowDown as IconArrowDown,
  HelpCircle as IconHelpCircle
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
const showPreview = ref(false)
const editingStep = ref(null)

const journey = ref(null)
const steps = ref([])

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
  } catch (error) {
    console.error('Error fetching journey:', error)
  } finally {
    loading.value = false
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
    COUNCIL: 'Council/Lawyer',
    STAFF: 'Staff',
    BOTH: 'Client & Council'
  }
  return map[party] || party
}

onMounted(() => {
  fetchJourney()
})
</script>

