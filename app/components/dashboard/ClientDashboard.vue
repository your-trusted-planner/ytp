<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">Welcome Back</h1>
      <p class="text-gray-600 mt-1">Here's an overview of your account</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <UiCard :padding="false">
        <div class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Total Documents</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{{ stats.totalDocuments }}</p>
            </div>
            <div class="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText class="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </UiCard>

      <UiCard :padding="false">
        <div class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Pending</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{{ stats.pendingDocuments }}</p>
            </div>
            <div class="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
              <FileText class="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </UiCard>

      <UiCard :padding="false">
        <div class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Signed</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{{ stats.signedDocuments }}</p>
            </div>
            <div class="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle class="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </UiCard>

      <UiCard :padding="false">
        <div class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Upcoming Meetings</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{{ stats.upcomingAppointments }}</p>
            </div>
            <div class="w-12 h-12 rounded-lg bg-burgundy-100 flex items-center justify-center">
              <Calendar class="w-6 h-6 text-burgundy-600" />
            </div>
          </div>
        </div>
      </UiCard>
    </div>

    <!-- Quick Actions -->
    <UiCard title="Quick Actions">
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

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Documents -->
      <UiCard title="Recent Documents" description="Your latest documents">
        <div v-if="documents.length === 0" class="text-gray-500 text-center py-8">
          No documents yet
        </div>
        <div v-else class="space-y-3">
          <NuxtLink
            v-for="doc in documents"
            :key="doc.id"
            :to="`/documents/${doc.id}`"
            class="block p-3 border border-gray-200 rounded-lg hover:border-burgundy-500 hover:bg-burgundy-50 transition-colors"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <h4 class="font-medium text-gray-900">{{ doc.title }}</h4>
                <p class="text-xs text-gray-500 mt-1">{{ formatDate(doc.createdAt) }}</p>
              </div>
              <UiBadge :variant="doc.status === 'SIGNED' ? 'success' : 'warning'">
                {{ doc.status }}
              </UiBadge>
            </div>
          </NuxtLink>
        </div>
      </UiCard>

      <!-- Upcoming Appointments -->
      <UiCard title="Upcoming Appointments" description="Your scheduled meetings">
        <div v-if="appointments.length === 0" class="text-gray-500 text-center py-8">
          No upcoming appointments
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="appt in appointments"
            :key="appt.id"
            class="p-3 border border-gray-200 rounded-lg"
          >
            <div class="flex items-start justify-between">
              <div>
                <h4 class="font-medium text-gray-900">{{ appt.title }}</h4>
                <p class="text-sm text-gray-600 mt-1">{{ formatDateTime(appt.startTime) }}</p>
              </div>
              <UiBadge variant="info">{{ appt.status }}</UiBadge>
            </div>
          </div>
        </div>
      </UiCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FileText, Calendar, UserCircle, CheckCircle } from 'lucide-vue-next'
import { formatDate, formatDateTime } from '~/utils/format'

interface ClientStats {
  totalDocuments: number
  pendingDocuments: number
  signedDocuments: number
  upcomingAppointments: number
}

const stats = ref<ClientStats>({
  totalDocuments: 0,
  pendingDocuments: 0,
  signedDocuments: 0,
  upcomingAppointments: 0
})

const documents = ref<any[]>([])
const appointments = ref<any[]>([])

const quickActions = [
  {
    href: '/documents',
    icon: FileText,
    title: 'My Documents',
    description: 'View and sign documents'
  },
  {
    href: '/appointments',
    icon: Calendar,
    title: 'Schedule Meeting',
    description: 'Book time with your lawyer'
  },
  {
    href: '/profile',
    icon: UserCircle,
    title: 'Update Profile',
    description: 'Manage your information'
  }
]

onMounted(async () => {
  try {
    const [statsData, docsData, apptsData] = await Promise.all([
      $fetch('/api/client/stats'),
      $fetch('/api/client/documents?limit=5'),
      $fetch('/api/client/appointments?upcoming=true')
    ])
    stats.value = statsData as ClientStats
    documents.value = docsData as any[]
    appointments.value = apptsData as any[]
  } catch (err) {
    console.error('Failed to fetch dashboard data:', err)
  }
})
</script>

