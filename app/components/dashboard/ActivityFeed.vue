<template>
  <div class="space-y-4">
    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-500 mx-auto"></div>
      <p class="text-gray-500 mt-2">Loading activity...</p>
    </div>

    <div v-else-if="activities.length === 0" class="text-gray-500 text-center py-8">
      No recent activity
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="activity in activities"
        :key="activity.id"
        class="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
      >
        <!-- Activity Icon -->
        <div :class="[
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          getActivityIconBg(activity.type)
        ]">
          <component
            :is="getActivityIcon(activity.type)"
            :class="['w-4 h-4', getActivityIconColor(activity.type)]"
          />
        </div>

        <!-- Activity Content -->
        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-900">{{ activity.description }}</p>
          <div class="flex items-center gap-2 mt-1">
            <p class="text-xs text-gray-500">
              {{ formatTimeAgo(activity.createdAt) }}
            </p>
            <span v-if="activity.user" class="text-xs text-gray-400">
              by {{ activity.user.firstName || activity.user.email }}
            </span>
            <span v-if="activity.country" class="text-xs text-gray-400">
              from {{ activity.country }}
            </span>
          </div>
        </div>

        <!-- Link to target -->
        <NuxtLink
          v-if="activity.targetId && getTargetLink(activity)"
          :to="getTargetLink(activity)"
          class="text-gray-400 hover:text-burgundy-500 transition-colors flex-shrink-0"
        >
          <ExternalLink class="w-4 h-4" />
        </NuxtLink>
      </div>
    </div>

    <!-- Load More / Pagination -->
    <div v-if="hasMore && !loading" class="text-center pt-2">
      <button
        @click="loadMore"
        class="text-sm text-burgundy-600 hover:text-burgundy-700 font-medium"
      >
        Load more activity
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
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
  ExternalLink,
  LogIn,
  LogOut,
  UserPlus,
  Briefcase,
  Route
} from 'lucide-vue-next'
import { formatTimeAgo } from '~/utils/format'

interface Activity {
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

interface Props {
  limit?: number
  targetType?: string
  targetId?: string
  userId?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  limit: 10,
  autoRefresh: false,
  refreshInterval: 30000
})

const activities = ref<Activity[]>([])
const loading = ref(true)
const offset = ref(0)
const total = ref(0)

const hasMore = computed(() => offset.value + activities.value.length < total.value)

async function fetchActivities(append = false) {
  try {
    if (!append) {
      loading.value = true
    }

    const params = new URLSearchParams({
      limit: props.limit.toString(),
      offset: offset.value.toString()
    })

    if (props.targetType) params.set('targetType', props.targetType)
    if (props.targetId) params.set('targetId', props.targetId)
    if (props.userId) params.set('userId', props.userId)

    const response = await $fetch(`/api/dashboard/activity?${params.toString()}`)

    if (append) {
      activities.value = [...activities.value, ...response.activities]
    } else {
      activities.value = response.activities
    }
    total.value = response.pagination.total
  } catch (error) {
    console.error('Failed to fetch activities:', error)
  } finally {
    loading.value = false
  }
}

function loadMore() {
  offset.value += props.limit
  fetchActivities(true)
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
    SETTINGS_CHANGED: Settings,
    REFERRAL_PARTNER_CREATED: Users,
    REFERRAL_PARTNER_UPDATED: Users
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

function getTargetLink(activity: Activity): string | null {
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

// Auto-refresh functionality
let refreshTimer: ReturnType<typeof setInterval> | null = null

watch(() => props.autoRefresh, (newVal) => {
  if (newVal) {
    refreshTimer = setInterval(() => {
      offset.value = 0
      fetchActivities()
    }, props.refreshInterval)
  } else if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}, { immediate: true })

onMounted(() => {
  fetchActivities()
})

// Cleanup on unmount
onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})

// Expose refresh method for parent components
defineExpose({ refresh: () => fetchActivities() })
</script>
