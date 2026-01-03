<template>
  <div class="space-y-6">
    <!-- Snapshot Header -->
    <div class="bg-white rounded-lg border border-gray-200 p-6">
      <div class="flex items-start justify-between mb-4">
        <div>
          <div class="flex items-center space-x-3">
            <h2 class="text-2xl font-bold text-gray-900">Snapshot - Version {{ snapshot.version_number }}</h2>
            <span
              :class="[
                'px-3 py-1 rounded-full text-sm font-medium',
                snapshot.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                snapshot.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                snapshot.status === 'UNDER_REVISION' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              ]"
            >
              {{ formatStatus(snapshot.status) }}
            </span>
          </div>
          <p class="text-gray-600 mt-2">Executive summary of your estate plan</p>
        </div>
        <div v-if="canApprove" class="flex items-center space-x-2">
          <UiButton
            v-if="!isApproved"
            variant="ghost"
            @click="requestRevision"
          >
            <IconEdit class="w-4 h-4 mr-2" />
            Request Changes
          </UiButton>
          <UiButton
            v-if="!isApproved"
            @click="approveSnapshot"
            :loading="approving"
          >
            <IconCheck class="w-4 h-4 mr-2" />
            Approve
          </UiButton>
        </div>
      </div>

      <!-- Approval Status -->
      <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
        <div class="flex items-center space-x-3">
          <IconCheckCircle
            :class="snapshot.approved_by_client ? 'text-green-500' : 'text-gray-300'"
            class="w-6 h-6"
          />
          <div>
            <div class="text-sm font-medium text-gray-900">Client Approval</div>
            <div class="text-xs text-gray-600">
              {{ snapshot.approved_by_client ? 'Approved' : 'Pending' }}
            </div>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <IconCheckCircle
            :class="snapshot.approved_by_counsel ? 'text-green-500' : 'text-gray-300'"
            class="w-6 h-6"
          />
          <div>
            <div class="text-sm font-medium text-gray-900">Counsel Approval</div>
            <div class="text-xs text-gray-600">
              {{ snapshot.approved_by_counsel ? 'Approved' : 'Pending' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Snapshot Content -->
    <div class="bg-white rounded-lg border border-gray-200 p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Plan Details</h3>
      <div class="space-y-6">
        <!-- Parse and display snapshot content -->
        <div v-for="(section, key) in snapshotContent" :key="key" class="space-y-2">
          <h4 class="text-sm font-medium text-gray-700 uppercase tracking-wide">{{ formatKey(key) }}</h4>
          <div v-if="typeof section === 'object'" class="pl-4 space-y-2">
            <div v-for="(value, subKey) in section" :key="subKey" class="flex">
              <span class="text-sm text-gray-600 w-40">{{ formatKey(subKey) }}:</span>
              <span class="text-sm text-gray-900 font-medium">{{ formatValue(value) }}</span>
            </div>
          </div>
          <div v-else class="pl-4">
            <span class="text-sm text-gray-900">{{ formatValue(section) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Feedback/Notes -->
    <div v-if="snapshot.client_feedback || snapshot.counsel_notes" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div v-if="snapshot.client_feedback" class="mb-3">
        <div class="flex items-start">
          <IconMessageSquare class="w-5 h-5 text-yellow-700 mr-2 mt-0.5" />
          <div>
            <div class="text-sm font-medium text-yellow-900">Client Feedback</div>
            <div class="text-sm text-yellow-800 mt-1">{{ snapshot.client_feedback }}</div>
          </div>
        </div>
      </div>
      <div v-if="snapshot.counsel_notes" class="mt-3 pt-3 border-t border-yellow-300">
        <div class="flex items-start">
          <IconMessageSquare class="w-5 h-5 text-yellow-700 mr-2 mt-0.5" />
          <div>
            <div class="text-sm font-medium text-yellow-900">Counsel Notes</div>
            <div class="text-sm text-yellow-800 mt-1">{{ snapshot.counsel_notes }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Request Revision Modal -->
    <UiModal v-model="showRevisionModal" title="Request Changes" size="lg">
      <form @submit.prevent="submitRevisionRequest" class="space-y-4">
        <UiTextarea
          v-model="revisionFeedback"
          label="What changes would you like to request?"
          placeholder="Please describe the changes you'd like to see..."
          :rows="6"
          required
        />
        <div class="flex justify-end space-x-3 pt-4">
          <UiButton type="button" variant="ghost" @click="showRevisionModal = false">
            Cancel
          </UiButton>
          <UiButton type="submit" :loading="submitting">
            Submit Request
          </UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Approve Modal -->
    <UiModal v-model="showApproveModal" title="Approve Snapshot" size="md">
      <div class="space-y-4">
        <p class="text-gray-600">
          By approving this snapshot, you confirm that all the information is correct and you're ready to proceed with drafting.
        </p>
        <UiTextarea
          v-model="approvalNotes"
          label="Additional Notes (Optional)"
          placeholder="Any additional comments..."
          :rows="3"
        />
        <div class="flex justify-end space-x-3 pt-4">
          <UiButton type="button" variant="ghost" @click="showApproveModal = false">
            Cancel
          </UiButton>
          <UiButton @click="submitApproval" :loading="approving">
            Confirm Approval
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { 
  Edit as IconEdit, Check as IconCheck, CheckCircle as IconCheckCircle, MessageSquare as IconMessageSquare
} from 'lucide-vue-next'

const props = defineProps({
  snapshot: {
    type: Object,
    required: true
  },
  canApprove: {
    type: Boolean,
    default: false
  },
  isClient: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['approved', 'revision-requested', 'refresh'])

const approving = ref(false)
const submitting = ref(false)
const showRevisionModal = ref(false)
const showApproveModal = ref(false)
const revisionFeedback = ref('')
const approvalNotes = ref('')

const snapshotContent = computed(() => {
  try {
    return JSON.parse(props.snapshot.content)
  } catch {
    return {}
  }
})

const isApproved = computed(() => {
  if (props.isClient) {
    return props.snapshot.approved_by_client
  }
  return props.snapshot.approved_by_counsel
})

// Format status
function formatStatus(status: string) {
  const map = {
    'DRAFT': 'Draft',
    'SENT': 'Sent to Client',
    'UNDER_REVISION': 'Under Revision',
    'APPROVED': 'Approved'
  }
  return map[status] || status
}

// Format keys for display
function formatKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Format values
function formatValue(value: any) {
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  return value
}

// Request revision
function requestRevision() {
  showRevisionModal.value = true
}

// Submit revision request
async function submitRevisionRequest() {
  submitting.value = true
  try {
    await $fetch(`/api/snapshots/${props.snapshot.id}/request-revision`, {
      method: 'POST',
      body: {
        feedback: revisionFeedback.value
      }
    })
    showRevisionModal.value = false
    revisionFeedback.value = ''
    emit('revision-requested')
    emit('refresh')
  } catch (error) {
    console.error('Error requesting revision:', error)
  } finally {
    submitting.value = false
  }
}

// Approve snapshot
function approveSnapshot() {
  showApproveModal.value = true
}

// Submit approval
async function submitApproval() {
  approving.value = true
  try {
    const { bothApproved } = await $fetch(`/api/snapshots/${props.snapshot.id}/approve`, {
      method: 'POST',
      body: {
        [props.isClient ? 'feedback' : 'notes']: approvalNotes.value
      }
    })
    showApproveModal.value = false
    approvalNotes.value = ''
    emit('approved', bothApproved)
    emit('refresh')
  } catch (error) {
    console.error('Error approving snapshot:', error)
  } finally {
    approving.value = false
  }
}
</script>

