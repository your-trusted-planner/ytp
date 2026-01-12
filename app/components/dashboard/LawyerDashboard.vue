<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p class="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <UiCard
        v-for="stat in statCards"
        :key="stat.title"
        :padding="false"
      >
        <div class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">{{ stat.title }}</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">
                {{ stat.value }}
              </p>
            </div>
            <div :class="`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`">
              <component :is="stat.icon" :class="`w-6 h-6 ${stat.color}`" />
            </div>
          </div>
        </div>
      </UiCard>
    </div>

    <!-- Quick Actions -->
    <UiCard title="Quick Actions" description="Common tasks and shortcuts">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NuxtLink
          v-for="action in quickActions"
          :key="action.href"
          :to="action.href"
          class="p-4 border-2 border-gray-200 rounded-lg hover:border-burgundy-500 hover:bg-burgundy-50 transition-colors"
        >
          <component :is="action.icon" class="w-8 h-8 text-burgundy-500 mb-2" />
          <h3 class="font-semibold text-gray-900">{{ action.title }}</h3>
          <p class="text-sm text-gray-600 mt-1">{{ action.description }}</p>
        </NuxtLink>
      </div>
    </UiCard>

    <!-- Recent Activity -->
    <UiCard title="Recent Activity" description="Latest updates from your clients">
      <div v-if="recentActivity.length === 0" class="text-gray-500 text-center py-8">
        No recent activity
      </div>
      <div v-else class="space-y-4">
        <div
          v-for="(activity, index) in recentActivity.slice(0, 5)"
          :key="index"
          class="flex items-start space-x-3 pb-4 border-b last:border-b-0"
        >
          <div class="w-2 h-2 bg-burgundy-500 rounded-full mt-2"></div>
          <div class="flex-1">
            <p class="text-sm text-gray-900">{{ activity.description }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ formatTimeAgo(activity.createdAt) }}</p>
          </div>
        </div>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Users, FileText, Calendar, CheckCircle } from 'lucide-vue-next'
import { formatTimeAgo } from '~/utils/format'

interface DashboardStats {
  totalClients: number
  activeClients: number
  pendingApprovals: number
  upcomingAppointments: number
  documentsThisMonth: number
}

const stats = ref<DashboardStats>({
  totalClients: 0,
  activeClients: 0,
  pendingApprovals: 0,
  upcomingAppointments: 0,
  documentsThisMonth: 0
})

const recentActivity = ref<any[]>([])

const statCards = computed(() => [
  {
    title: 'Total Clients',
    value: stats.value.totalClients,
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    title: 'Active Clients',
    value: stats.value.activeClients,
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    title: 'Pending Approvals',
    value: stats.value.pendingApprovals,
    icon: Users,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
  },
  {
    title: 'Upcoming Meetings',
    value: stats.value.upcomingAppointments,
    icon: Calendar,
    color: 'text-burgundy-600',
    bgColor: 'bg-burgundy-100'
  }
])

const quickActions = [
  {
    href: '/clients',
    icon: Users,
    title: 'View Clients',
    description: 'Manage your client list'
  },
  {
    href: '/templates',
    icon: FileText,
    title: 'Templates',
    description: 'Create and manage document templates'
  },
  {
    href: '/schedule',
    icon: Calendar,
    title: 'Schedule',
    description: 'View your calendar and appointments'
  }
]

onMounted(async () => {
  try {
    const [statsData, activityData] = await Promise.all([
      $fetch('/api/dashboard/stats'),
      $fetch('/api/dashboard/activity')
    ])
    stats.value = statsData as DashboardStats
    recentActivity.value = (activityData as any).activities || []
  } catch (err) {
    console.error('Failed to fetch dashboard data:', err)
  }
})
</script>

