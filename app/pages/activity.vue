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
              <option value="DOCUMENT_DELETED">Document Deleted</option>
            </optgroup>
            <optgroup label="Journey Events">
              <option value="JOURNEY_STARTED">Journey Started</option>
              <option value="JOURNEY_STEP_COMPLETED">Step Completed</option>
              <option value="JOURNEY_COMPLETED">Journey Completed</option>
            </optgroup>
            <optgroup label="Note Events">
              <option value="NOTE_CREATED">Note Created</option>
              <option value="NOTE_UPDATED">Note Updated</option>
              <option value="NOTE_DELETED">Note Deleted</option>
            </optgroup>
            <optgroup label="Template Events">
              <option value="TEMPLATE_CREATED">Template Created</option>
              <option value="TEMPLATE_DELETED">Template Deleted</option>
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
            <option value="note">Notes</option>
            <option value="referral_partner">Referral Partners</option>
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

              <!-- Entity link badges (new structured format) -->
              <div class="flex flex-wrap gap-2 mt-2">
                <!-- Primary target entity badge -->
                <NuxtLink
                  v-if="activity.target?.link"
                  :to="activity.target.link"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-burgundy-50 text-burgundy-700 hover:bg-burgundy-100 transition-colors group"
                  :title="getNameDiffTooltip(activity.target)"
                >
                  <component :is="getEntityTypeIcon(activity.target.type)" class="w-3 h-3" />
                  {{ formatEntityTypeLabel(activity.target.type) }}: {{ activity.target.currentName }}
                  <span
                    v-if="activity.target.snapshotName !== activity.target.currentName"
                    class="text-burgundy-400 text-[10px]"
                  >(was: {{ activity.target.snapshotName }})</span>
                  <ExternalLink class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </NuxtLink>

                <!-- Related entity badges -->
                <template v-if="activity.relatedEntities?.length">
                  <NuxtLink
                    v-for="entity in activity.relatedEntities"
                    :key="`${entity.type}:${entity.id}`"
                    :to="entity.link || '#'"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors group"
                    :class="{ 'pointer-events-none': !entity.link }"
                    :title="getNameDiffTooltip(entity)"
                  >
                    <component :is="getEntityTypeIcon(entity.type)" class="w-3 h-3" />
                    {{ formatEntityTypeLabel(entity.type) }}: {{ entity.currentName }}
                    <ExternalLink v-if="entity.link" class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </NuxtLink>
                </template>

                <!-- Legacy entity link badge (backward compatibility) -->
                <NuxtLink
                  v-else-if="!activity.target && activity.metadata?.entityType && activity.metadata?.entityId"
                  :to="getLegacyEntityLink(activity.metadata.entityType, activity.metadata.entityId)"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-burgundy-50 text-burgundy-700 hover:bg-burgundy-100 transition-colors"
                >
                  {{ formatEntityTypeLabel(activity.metadata.entityType) }}: {{ activity.metadata.entityName || activity.metadata.entityId }}
                  <ExternalLink class="w-3 h-3" />
                </NuxtLink>
              </div>

              <!-- Other metadata badges -->
              <div v-if="activity.metadata && hasOtherMetadata(activity.metadata)" class="flex flex-wrap gap-2 mt-2">
                <span
                  v-for="(value, key) in getDisplayMetadata(activity.metadata)"
                  :key="key"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                >
                  {{ formatMetadataKey(key) }}: {{ value }}
                </span>
              </div>
            </div>

            <!-- View Link (legacy fallback for targetType/targetId) -->
            <NuxtLink
              v-if="!activity.target && getTargetLink(activity)"
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
  Route,
  ExternalLink,
  StickyNote,
  Calendar,
  Handshake,
  Package
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

// Entity reference with resolved names
interface ResolvedEntityRef {
  type: string
  id: string
  snapshotName: string
  currentName: string
  link: string | null
}

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
  // New structured entity references
  target?: ResolvedEntityRef
  relatedEntities?: ResolvedEntityRef[]
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
      offset: pagination.offset.toString(),
      resolveNames: 'true' // Request resolved entity names
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
    DOCUMENT_DELETED: FileText,
    JOURNEY_STARTED: Play,
    JOURNEY_STEP_COMPLETED: CheckCircle,
    JOURNEY_COMPLETED: CheckCircle,
    TEMPLATE_CREATED: FileText,
    TEMPLATE_UPDATED: FileText,
    TEMPLATE_DELETED: FileText,
    ADMIN_ACTION: Settings,
    REFERRAL_PARTNER_CREATED: Users,
    REFERRAL_PARTNER_UPDATED: Users,
    NOTE_CREATED: StickyNote,
    NOTE_UPDATED: StickyNote,
    NOTE_DELETED: StickyNote
  }
  return icons[type] || Route
}

function getEntityTypeIcon(type: string) {
  const icons: Record<string, any> = {
    user: User,
    client: Users,
    matter: Briefcase,
    document: FileText,
    journey: Route,
    template: FileText,
    referral_partner: Handshake,
    service: Package,
    appointment: Calendar,
    note: StickyNote,
    setting: Settings
  }
  return icons[type] || FileText
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
  if (type.includes('NOTE')) {
    return 'bg-yellow-100'
  }
  if (type.includes('TEMPLATE')) {
    return 'bg-pink-100'
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
  if (type.includes('NOTE')) {
    return 'text-yellow-600'
  }
  if (type.includes('TEMPLATE')) {
    return 'text-pink-600'
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
    template: `/templates/${activity.targetId}`,
    referral_partner: `/referral-partners/${activity.targetId}`
  }

  return routes[activity.targetType] || null
}

function getLegacyEntityLink(entityType: string, entityId: string): string {
  const routes: Record<string, string> = {
    client: `/clients/${entityId}`,
    matter: `/matters/${entityId}`,
    document: `/documents/${entityId}`,
    journey: `/journeys/${entityId}`,
    appointment: `/appointments/${entityId}`,
    template: `/templates/${entityId}`,
    referral_partner: `/referral-partners/${entityId}`
  }
  return routes[entityType] || '#'
}

function formatEntityTypeLabel(entityType: string): string {
  const typeMap: Record<string, string> = {
    user: 'User',
    client: 'Client',
    matter: 'Matter',
    document: 'Document',
    journey: 'Journey',
    template: 'Template',
    referral_partner: 'Referral Partner',
    service: 'Service',
    appointment: 'Appointment',
    note: 'Note',
    setting: 'Setting'
  }
  return typeMap[entityType] || entityType
}

function getNameDiffTooltip(entity: ResolvedEntityRef): string {
  if (entity.snapshotName !== entity.currentName) {
    return `Originally: "${entity.snapshotName}", now: "${entity.currentName}"`
  }
  return entity.currentName
}

function getDisplayMetadata(metadata: Record<string, any>): Record<string, any> {
  // Filter out sensitive, internal, and entity-related fields (entity fields shown as linked badge)
  const hiddenKeys = [
    'signedAt', 'templateId', 'clientId',
    'entityType', 'entityId', 'entityName',
    'target', 'relatedEntities', 'details' // Hide new structured fields
  ]
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(metadata)) {
    if (!hiddenKeys.includes(key) && value && typeof value !== 'object') {
      result[key] = value
    }
  }

  return result
}

function hasOtherMetadata(metadata: Record<string, any>): boolean {
  return Object.keys(getDisplayMetadata(metadata)).length > 0
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
