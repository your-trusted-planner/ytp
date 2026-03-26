<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">
        Form Submissions
      </h1>
      <p class="text-gray-600 mt-1">
        View and manage responses from all forms
      </p>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-4 flex flex-wrap items-end gap-4">
      <div class="w-48">
        <label class="block text-xs font-medium text-gray-600 mb-1">Form</label>
        <select
          v-model="filters.formId"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          @change="fetchSubmissions()"
        >
          <option value="">
            All forms
          </option>
          <option
            v-for="f in availableForms"
            :key="f.id"
            :value="f.id"
          >
            {{ f.name }}
          </option>
        </select>
      </div>
      <div class="w-36">
        <label class="block text-xs font-medium text-gray-600 mb-1">Status</label>
        <select
          v-model="filters.status"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          @change="fetchSubmissions()"
        >
          <option value="">All</option>
          <option value="submitted">Submitted</option>
          <option value="draft">Drafts</option>
        </select>
      </div>
      <div class="w-40">
        <label class="block text-xs font-medium text-gray-600 mb-1">From</label>
        <input
          v-model="filters.startDate"
          type="date"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          @change="fetchSubmissions()"
        >
      </div>
      <div class="w-40">
        <label class="block text-xs font-medium text-gray-600 mb-1">To</label>
        <input
          v-model="filters.endDate"
          type="date"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          @change="fetchSubmissions()"
        >
      </div>
      <UiButton
        variant="outline"
        size="sm"
        @click="clearFilters"
      >
        Clear
      </UiButton>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="text-center py-12"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="submissions.length === 0"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <Inbox class="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        No submissions yet
      </h3>
      <p class="text-gray-500">
        Submissions will appear here as people fill out your forms.
      </p>
    </div>

    <!-- Submissions Table -->
    <div
      v-else
      class="bg-white rounded-lg shadow overflow-hidden"
    >
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Submitter
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Form
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Context
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <template
            v-for="sub in submissions"
            :key="sub.id"
          >
            <!-- Row -->
            <tr
              class="hover:bg-gray-50 cursor-pointer"
              @click="toggleDetail(sub.id)"
            >
              <td class="px-4 py-3">
                <div class="text-sm font-medium text-gray-900">
                  {{ sub.submitterName }}
                </div>
                <div
                  v-if="sub.submitterEmail && sub.submitterName !== sub.submitterEmail"
                  class="text-xs text-gray-500"
                >
                  {{ sub.submitterEmail }}
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-700">
                {{ sub.formName }}
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="sub.status === 'submitted'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'"
                >
                  {{ sub.status === 'submitted' ? 'Submitted' : 'Draft' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="text-xs text-gray-500 capitalize">
                  {{ sub.context }}
                </span>
                <span
                  v-if="sub.utmSource"
                  class="ml-1 text-xs text-blue-500"
                  :title="`utm_source=${sub.utmSource}`"
                >
                  ({{ sub.utmSource }})
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-500">
                {{ formatDate(sub.submittedAt) }}
              </td>
              <td class="px-4 py-3 text-right">
                <ChevronDown
                  class="w-4 h-4 text-gray-400 inline-block transition-transform"
                  :class="expandedId === sub.id ? 'rotate-180' : ''"
                />
              </td>
            </tr>

            <!-- Expanded Detail -->
            <tr v-if="expandedId === sub.id">
              <td
                colspan="6"
                class="px-4 py-4 bg-gray-50"
              >
                <SubmissionDetail
                  :submission-id="sub.id"
                />
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <!-- Pagination -->
      <div
        v-if="total > submissions.length"
        class="px-4 py-3 border-t bg-gray-50 flex items-center justify-between text-sm text-gray-600"
      >
        <span>Showing {{ submissions.length }} of {{ total }}</span>
        <UiButton
          variant="outline"
          size="sm"
          @click="loadMore"
        >
          Load more
        </UiButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Inbox, ChevronDown } from 'lucide-vue-next'
import SubmissionDetail from '~/components/form/SubmissionDetail.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const loading = ref(true)
const submissions = ref<any[]>([])
const total = ref(0)
const expandedId = ref<string | null>(null)
const availableForms = ref<Array<{ id: string; name: string }>>([])

const filters = ref({
  formId: '',
  status: '',
  startDate: '',
  endDate: ''
})

onMounted(async () => {
  // Load forms for filter dropdown
  try {
    const forms = await $fetch<any[]>('/api/admin/forms')
    availableForms.value = forms.map(f => ({ id: f.id, name: f.name }))
  } catch { /* ignore */ }

  await fetchSubmissions()
})

async function fetchSubmissions(append = false) {
  if (!append) loading.value = true
  try {
    const params: Record<string, string> = {}
    if (filters.value.formId) params.formId = filters.value.formId
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.startDate) params.startDate = filters.value.startDate
    if (filters.value.endDate) params.endDate = filters.value.endDate
    if (append) params.offset = String(submissions.value.length)

    const result = await $fetch<{ submissions: any[]; total: number }>('/api/admin/form-submissions', { params })

    if (append) {
      submissions.value.push(...result.submissions)
    } else {
      submissions.value = result.submissions
    }
    total.value = result.total
  } catch (err: any) {
    console.error('Failed to fetch submissions:', err)
  } finally {
    loading.value = false
  }
}

function loadMore() {
  fetchSubmissions(true)
}

function clearFilters() {
  filters.value = { formId: '', status: '', startDate: '', endDate: '' }
  fetchSubmissions()
}

function toggleDetail(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function formatDate(ts: number | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}
</script>
