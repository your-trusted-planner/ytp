<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Activity Log</h1>
        <p class="text-gray-600 mt-1">View all system activity and audit trail</p>
      </div>
      <button
        @click="exportCsv"
        class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
      >
        <Download class="w-4 h-4" />
        Export CSV
      </button>
    </div>

    <!-- Filters -->
    <UiCard title="Filters" :collapsible="true" :defaultOpen="false">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
          <select
            v-model="filters.type"
            @change="applyFilters"
            class="w-full rounded-lg border-gray-300 shadow-sm focus:border-burgundy-500 focus:ring-burgundy-500"
          >
            <option value="">All Types</option>
            <optgroup label="User Events">
              <option value="USER_LOGIN">Login</option>
              <option value="USER_LOGOUT">Logout</option>
              <option value="USER_CREATED">User Created</option>
            </optgroup>
            <optgroup label="Client Events">
              <option value="CLIENT_CREATED">Client Created</option>
              <option value="CLIENT_UPDATED">Client Updated</option>
              <option value="CLIENT_VIEWED">Client Viewed</option>
            </optgroup>
            <optgroup label="Document Events">
              <option value="DOCUMENT_CREATED">Document Created</option>
              <option value="DOCUMENT_VIEWED">Document Viewed</option>
              <option value="DOCUMENT_SIGNED">Document Signed</option>
              <option value="DOCUMENT_DOWNLOADED">Document Downloaded</option>
            </optgroup>
            <optgroup label="Journey Events">
              <option value="JOURNEY_STARTED">Journey Started</option>
              <option value="JOURNEY_STEP_COMPLETED">Step Completed</option>
              <option value="JOURNEY_COMPLETED">Journey Completed</option>
            </optgroup>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Target Type</label>
          <select
            v-model="filters.targetType"
            @change="applyFilters"
            class="w-full rounded-lg border-gray-300 shadow-sm focus:border-burgundy-500 focus:ring-burgundy-500"
          >
            <option value="">All Targets</option>
            <option value="user">Users</option>
            <option value="client">Clients</option>
            <option value="document">Documents</option>
            <option value="matter">Matters</option>
            <option value="journey">Journeys</option>
            <option value="template">Templates</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            v-model="filters.startDate"
            @change="applyFilters"
            class="w-full rounded-lg border-gray-300 shadow-sm focus:border-burgundy-500 focus:ring-burgundy-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            v-model="filters.endDate"
            @change="applyFilters"
            class="w-full rounded-lg border-gray-300 shadow-sm focus:border-burgundy-500 focus:ring-burgundy-500"
          />
        </div>
      </div>

      <div class="mt-4 flex justify-end">
        <button
          @click="clearFilters"
          class="text-sm text-gray-600 hover:text-gray-900"
        >
          Clear all filters
        </button>
      </div>
    </UiCard>

    <!-- Activity Feed -->
    <UiCard>
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-burgundy-500 mx-auto"></div>
        <p class="text-gray-500 mt-4">Loading activity...</p>
      </div>

      <div v-else-if="activities.length === 0" class="text-center py-12">
        <Activity class="w-12 h-12 text-gray-400 mx-auto" />
        <p class="text-gray-500 mt-4">No activity found</p>
        <p class="text-sm text-gray-400">Try adjusting your filters</p>
      </div>

      <div v-else class="divide-y divide-gray-100">
        <div
          v-for="activity in activities"
          :key="activity.id"
          class="py-4 first:pt-0 last:pb-0"
        >
          <div class="flex items-start gap-4">
            <!-- Icon -->
            <div :class="[
              'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
              getActivityIconBg(activity.type)
            ]">
              <component
                :is="getActivityIcon(activity.type)"
                :class="['w-5 h-5', getActivityIconColor(activity.type)]"
              />
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900">{{ activity.description }}</p>
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <span class="text-xs text-gray-500">
                  {{ formatDateTime(activity.createdAt) }}
                </span>
                <span v-if="activity.user" class="text-xs text-gray-500">
                  by {{ activity.user.firstName }} {{ activity.user.lastName }}
                </span>
                <span v-if="activity.ipAddress" class="text-xs text-gray-400">
                  IP: {{ activity.ipAddress }}
                </span>
                <span v-if="activity.country" class="text-xs text-gray-400">
                  {{ activity.city ? `${activity.city}, ` : '' }}{{ activity.country }}
                </span>
              </div>

              <!-- Metadata badges -->
              <div v-if="activity.metadata" class="flex flex-wrap gap-2 mt-2">
                <span
                  v-for="(value, key) in getDisplayMetadata(activity.metadata)"
                  :key="key"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                >
                  {{ formatMetadataKey(key) }}: {{ value }}
                </span>
              </div>
            </div>

            <!-- Link -->
            <NuxtLink
              v-if="getTargetLink(activity)"
              :to="getTargetLink(activity)"
              class="text-burgundy-600 hover:text-burgundy-700 text-sm font-medium flex-shrink-0"
            >
              View
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.total > 0" class="mt-6 flex items-center justify-between border-t pt-4">
        <p class="text-sm text-gray-500">
          Showing {{ pagination.offset + 1 }} to {{ Math.min(pagination.offset + activities.length, pagination.total) }}
          of {{ pagination.total }} activities
        </p>
        <div class="flex gap-2">
          <button
            @click="prevPage"
            :disabled="pagination.offset === 0"
            class="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            @click="nextPage"
            :disabled="!pagination.hasMore"
            class="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import {
  User,
  Users,
  FileText,
  PenTool,
  Download,
  Eye,
  Play,
  CheckCircle,
  Settings,
  LogIn,
  LogOut,
  UserPlus,
  Briefcase,
  Activity,
  Route
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

interface ActivityItem {
  id: string
  type: string
  description: string
  userId: string
  userRole: string | null
  targetType: string | null
  targetId: string | null
  journeyId: string | null
  matterId: string | null
  ipAddress: string | null
  country: string | null
  city: string | null
  createdAt: string
  user: {
    firstName: string | null
    lastName: string | null
    email: string
  } | null
  metadata: Record<string, any> | null
}

const activities = ref<ActivityItem[]>([])
const loading = ref(true)
const pagination = reactive({
  total: 0,
  limit: 20,
  offset: 0,
  hasMore: false
})

const filters = reactive({
  type: '',
  targetType: '',
  startDate: '',
  endDate: ''
})

async function fetchActivities() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      limit: pagination.limit.toString(),
      offset: pagination.offset.toString()
    })

    if (filters.type) params.set('type', filters.type)
    if (filters.targetType) params.set('targetType', filters.targetType)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)

    const response = await $fetch(`/api/dashboard/activity?${params.toString()}`)

    activities.value = response.activities
    pagination.total = response.pagination.total
    pagination.hasMore = response.pagination.hasMore
  } catch (error) {
    console.error('Failed to fetch activities:', error)
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  pagination.offset = 0
  fetchActivities()
}

function clearFilters() {
  filters.type = ''
  filters.targetType = ''
  filters.startDate = ''
  filters.endDate = ''
  applyFilters()
}

function nextPage() {
  pagination.offset += pagination.limit
  fetchActivities()
}

function prevPage() {
  pagination.offset = Math.max(0, pagination.offset - pagination.limit)
  fetchActivities()
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function getActivityIcon(type: string) {
  const icons: Record<string, any> = {
    USER_LOGIN: LogIn,
    USER_LOGOUT: LogOut,
    USER_CREATED: UserPlus,
    USER_UPDATED: User,
    CLIENT_CREATED: UserPlus,
    CLIENT_UPDATED: Users,
    CLIENT_VIEWED: Eye,
    MATTER_CREATED: Briefcase,
    MATTER_UPDATED: Briefcase,
    DOCUMENT_CREATED: FileText,
    DOCUMENT_VIEWED: Eye,
    DOCUMENT_SIGNED: PenTool,
    DOCUMENT_DOWNLOADED: Download,
    JOURNEY_STARTED: Play,
    JOURNEY_STEP_COMPLETED: CheckCircle,
    JOURNEY_COMPLETED: CheckCircle,
    TEMPLATE_CREATED: FileText,
    TEMPLATE_UPDATED: FileText,
    ADMIN_ACTION: Settings,
    REFERRAL_PARTNER_CREATED: Users
  }
  return icons[type] || Route
}

function getActivityIconBg(type: string): string {
  if (type.startsWith('USER_LOGIN') || type.startsWith('USER_LOGOUT')) {
    return 'bg-blue-100'
  }
  if (type.includes('CLIENT') || type.includes('USER')) {
    return 'bg-green-100'
  }
  if (type.includes('DOCUMENT')) {
    return 'bg-purple-100'
  }
  if (type.includes('JOURNEY')) {
    return 'bg-orange-100'
  }
  if (type.includes('MATTER')) {
    return 'bg-indigo-100'
  }
  return 'bg-gray-100'
}

function getActivityIconColor(type: string): string {
  if (type.startsWith('USER_LOGIN') || type.startsWith('USER_LOGOUT')) {
    return 'text-blue-600'
  }
  if (type.includes('CLIENT') || type.includes('USER')) {
    return 'text-green-600'
  }
  if (type.includes('DOCUMENT')) {
    return 'text-purple-600'
  }
  if (type.includes('JOURNEY')) {
    return 'text-orange-600'
  }
  if (type.includes('MATTER')) {
    return 'text-indigo-600'
  }
  return 'text-gray-600'
}

function getTargetLink(activity: ActivityItem): string | null {
  if (!activity.targetType || !activity.targetId) return null

  const routes: Record<string, string> = {
    client: `/clients/${activity.targetId}`,
    document: `/documents/${activity.targetId}`,
    matter: `/matters/${activity.targetId}`,
    journey: `/journeys/${activity.targetId}`,
    template: `/templates/${activity.targetId}`
  }

  return routes[activity.targetType] || null
}

function getDisplayMetadata(metadata: Record<string, any>): Record<string, any> {
  // Filter out sensitive or internal fields
  const hiddenKeys = ['signedAt', 'templateId', 'clientId']
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(metadata)) {
    if (!hiddenKeys.includes(key) && value && typeof value !== 'object') {
      result[key] = value
    }
  }

  return result
}

function formatMetadataKey(key: string): string {
  // Convert camelCase to Title Case
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

async function exportCsv() {
  // Fetch all activities for export (up to 1000)
  const params = new URLSearchParams({ limit: '1000', offset: '0' })
  if (filters.type) params.set('type', filters.type)
  if (filters.targetType) params.set('targetType', filters.targetType)
  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)

  try {
    const response = await $fetch(`/api/dashboard/activity?${params.toString()}`)

    // Build CSV
    const headers = ['Date', 'Type', 'Description', 'User', 'IP Address', 'Country', 'City']
    const rows = response.activities.map((a: ActivityItem) => [
      formatDateTime(a.createdAt),
      a.type,
      `"${a.description.replace(/"/g, '""')}"`,
      a.user ? `${a.user.firstName} ${a.user.lastName}`.trim() : '',
      a.ipAddress || '',
      a.country || '',
      a.city || ''
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

    // Download
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to export CSV:', error)
  }
}

onMounted(() => {
  fetchActivities()
})
</script>
