<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center space-x-4">
      <button
        class="text-gray-600 hover:text-gray-900"
        @click="$router.back()"
      >
        <IconArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-2xl font-bold text-gray-900">
          {{ clientJourney?.journey_name || 'Journey Progress' }}
        </h1>
        <p
          v-if="clientJourney?.journey_description"
          class="text-gray-600 mt-1"
        >
          {{ clientJourney.journey_description }}
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="flex justify-center py-12"
    >
      <IconLoader class="w-8 h-8 animate-spin text-burgundy-600" />
    </div>

    <!-- Journey Progress -->
    <div
      v-else
      class="space-y-6"
    >
      <!-- Overall Progress Card -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          Overall Progress
        </h2>
        <div class="space-y-4">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">Completion</span>
            <span class="font-medium text-gray-900">{{ progressPercentage }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3">
            <div
              class="bg-burgundy-600 h-3 rounded-full transition-all"
              :style="{ width: progressPercentage + '%' }"
            />
          </div>
          <div class="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-900">
                {{ completedSteps }}
              </div>
              <div class="text-sm text-gray-600">
                Completed
              </div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-burgundy-600">
                {{ inProgressSteps }}
              </div>
              <div class="text-sm text-gray-600">
                In Progress
              </div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-400">
                {{ pendingSteps }}
              </div>
              <div class="text-sm text-gray-600">
                Remaining
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Steps Timeline -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-6">
          Journey Steps
        </h2>
        <div class="space-y-6">
          <div
            v-for="(step, index) in steps"
            :key="step.id"
            class="relative"
          >
            <!-- Step Card -->
            <div
              :class="[
                'flex items-start space-x-4 p-4 rounded-lg transition-all',
                step.progress_status === 'COMPLETE' ? 'bg-green-50 border border-green-200'
                : step.progress_status === 'IN_PROGRESS' ? 'bg-blue-50 border border-blue-200'
                  : step.progress_status === 'WAITING_CLIENT' ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-gray-50 border border-gray-200'
              ]"
            >
              <!-- Step Icon -->
              <div
                :class="[
                  'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg',
                  step.progress_status === 'COMPLETE' ? 'bg-green-500 text-white'
                  : step.progress_status === 'IN_PROGRESS' || step.progress_status === 'WAITING_CLIENT' ? 'bg-burgundy-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                ]"
              >
                <IconCheck
                  v-if="step.progress_status === 'COMPLETE'"
                  class="w-6 h-6"
                />
                <IconCircleDot
                  v-else-if="step.step_type === 'MILESTONE'"
                  class="w-6 h-6"
                />
                <IconRepeat
                  v-else
                  class="w-6 h-6"
                />
              </div>

              <!-- Step Content -->
              <div class="flex-1">
                <div class="flex items-start justify-between mb-2">
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">
                      {{ step.name }}
                    </h3>
                    <p
                      v-if="step.description"
                      class="text-sm text-gray-600 mt-1"
                    >
                      {{ step.description }}
                    </p>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span
                      :class="[
                        'px-3 py-1 rounded-full text-xs font-medium',
                        step.step_type === 'BRIDGE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      ]"
                    >
                      {{ step.step_type === 'BRIDGE' ? 'Bridge Step' : 'Milestone' }}
                    </span>
                  </div>
                </div>

                <!-- Step Status -->
                <div class="mt-3 flex items-center space-x-4 text-sm">
                  <span
                    :class="[
                      'inline-flex items-center px-3 py-1 rounded-full font-medium',
                      step.progress_status === 'COMPLETE' ? 'bg-green-100 text-green-700'
                      : step.progress_status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700'
                        : step.progress_status === 'WAITING_CLIENT' ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                    ]"
                  >
                    {{ formatProgressStatus(step.progress_status) }}
                  </span>
                  <span
                    v-if="step.iteration_count > 0"
                    class="text-gray-600"
                  >
                    Revision #{{ step.iteration_count }}
                  </span>
                </div>

                <!-- Help Content -->
                <div
                  v-if="step.help_content && step.progress_status !== 'COMPLETE'"
                  class="mt-3 p-3 bg-white border border-gray-200 rounded text-sm"
                >
                  <div class="flex items-start">
                    <IconHelpCircle class="w-4 h-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div class="text-gray-700">
                      {{ step.help_content }}
                    </div>
                  </div>
                </div>

                <!-- Bridge Step Approvals -->
                <div
                  v-if="step.step_type === 'BRIDGE' && step.progress_status !== 'PENDING'"
                  class="mt-3 grid grid-cols-2 gap-3"
                >
                  <div class="flex items-center space-x-2 text-sm">
                    <IconCheckCircle
                      :class="step.client_approved ? 'text-green-500' : 'text-gray-300'"
                      class="w-5 h-5"
                    />
                    <span :class="step.client_approved ? 'text-green-700 font-medium' : 'text-gray-600'">
                      Client Approved
                    </span>
                  </div>
                  <div class="flex items-center space-x-2 text-sm">
                    <IconCheckCircle
                      :class="step.attorney_approved ? 'text-green-500' : 'text-gray-300'"
                      class="w-5 h-5"
                    />
                    <span :class="step.attorney_approved ? 'text-green-700 font-medium' : 'text-gray-600'">
                      Attorney Approved
                    </span>
                  </div>
                </div>

                <!-- Action Items (forms, uploads, etc.) -->
                <div
                  v-if="stepActionItems[step.id]?.length > 0 && step.progress_status !== 'COMPLETE'"
                  class="mt-4 space-y-3"
                >
                  <template
                    v-for="item in stepActionItems[step.id]"
                    :key="item.id"
                  >
                    <JourneyFormActionItem
                      v-if="item.action_type === 'FORM' || item.action_type === 'QUESTIONNAIRE'"
                      :action-item="item"
                      @completed="onActionItemCompleted"
                    />
                    <!-- Wet signature: read-only status for clients -->
                    <div
                      v-else-if="item.action_type === 'WET_SIGN'"
                      class="border rounded-lg bg-white overflow-hidden"
                    >
                      <div class="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <IconSignature class="w-4 h-4 text-gray-600" />
                          <h4 class="text-sm font-semibold text-gray-800">{{ item.title }}</h4>
                        </div>
                        <span
                          v-if="item.status === 'COMPLETE'"
                          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"
                        >
                          Signed
                        </span>
                        <span
                          v-else
                          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700"
                        >
                          Awaiting signature
                        </span>
                      </div>
                      <div class="p-4">
                        <ul class="space-y-1.5">
                          <li
                            v-for="(doc, dIdx) in parseWetSignDocs(item.config)"
                            :key="dIdx"
                            class="flex items-center gap-2 text-sm text-gray-700"
                          >
                            <IconFileText class="w-3.5 h-3.5 text-gray-400" />
                            {{ doc.label }}
                          </li>
                        </ul>
                        <p
                          v-if="parseWetSignNotarization(item.config)"
                          class="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5"
                        >
                          These documents require notarization
                        </p>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <!-- Connector Line -->
            <div
              v-if="index < steps.length - 1"
              class="flex justify-center my-2"
            >
              <IconArrowDown class="w-6 h-6 text-gray-300" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeft as IconArrowLeft, Loader as IconLoader, Check as IconCheck, CircleDot as IconCircleDot, Repeat as IconRepeat,
  HelpCircle as IconHelpCircle, CheckCircle as IconCheckCircle, ArrowDown as IconArrowDown,
  Signature as IconSignature, FileText as IconFileText
} from 'lucide-vue-next'

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

const route = useRoute()
const loading = ref(true)
const clientJourney = ref<any>(null)
const steps = ref<any[]>([])
const stepActionItems = ref<Record<string, any[]>>({})

// Computed stats
const completedSteps = computed(() =>
  steps.value.filter(s => s.progress_status === 'COMPLETE').length
)
const inProgressSteps = computed(() =>
  steps.value.filter(s => ['IN_PROGRESS', 'WAITING_CLIENT', 'WAITING_ATTORNEY'].includes(s.progress_status)).length
)
const pendingSteps = computed(() =>
  steps.value.filter(s => s.progress_status === 'PENDING').length
)
const progressPercentage = computed(() => {
  if (steps.value.length === 0) return 0
  return Math.round((completedSteps.value / steps.value.length) * 100)
})

// Fetch journey progress
async function fetchProgress() {
  loading.value = true
  try {
    const data = await $fetch(`/api/client-journeys/${route.params.id}/progress`)
    clientJourney.value = data.clientJourney
    steps.value = data.steps || []
  }
  catch (error) {
    console.error('Error fetching progress:', error)
  }
  finally {
    loading.value = false
  }
}

// Format progress status
function formatProgressStatus(status: string) {
  const map = {
    PENDING: 'Not Started',
    IN_PROGRESS: 'In Progress',
    WAITING_CLIENT: 'Waiting on You',
    WAITING_ATTORNEY: 'Waiting on Attorney',
    COMPLETE: 'Completed',
    SKIPPED: 'Skipped'
  }
  return map[status] || status
}

async function fetchActionItems() {
  if (!clientJourney.value?.id) return
  try {
    const data = await $fetch<{ actionItems: any[] }>(
      `/api/action-items/client-journey/${clientJourney.value.id}`
    )
    // Group action items by step_id
    const grouped: Record<string, any[]> = {}
    for (const item of data.actionItems) {
      const stepId = item.step_id as string
      if (!stepId) continue
      if (!grouped[stepId]) grouped[stepId] = []
      grouped[stepId]!.push(item)
    }
    stepActionItems.value = grouped
  } catch {
    // Action items may not be available for all journeys
  }
}

function onActionItemCompleted(actionItemId: string) {
  // Update local state to reflect completion
  for (const items of Object.values(stepActionItems.value)) {
    const item = items.find((i: any) => i.id === actionItemId)
    if (item) {
      item.status = 'COMPLETE'
      break
    }
  }
}

// WET_SIGN helpers for client view
function parseWetSignDocs(config: string | null): Array<{ label: string }> {
  if (!config) return []
  try {
    const parsed = JSON.parse(config)
    return Array.isArray(parsed.documents) ? parsed.documents : []
  } catch { return [] }
}

function parseWetSignNotarization(config: string | null): boolean {
  if (!config) return false
  try {
    return JSON.parse(config).requiresNotarization === true
  } catch { return false }
}

onMounted(async () => {
  await fetchProgress()
  await fetchActionItems()
})
</script>
