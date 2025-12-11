<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Top Navigation -->
    <nav class="bg-navy-900 border-b border-navy-800">
      <div class="mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 justify-between items-center">
          <!-- Logo -->
          <div class="flex items-center">
            <img src="/ytp-logo.webp" alt="Your Trusted Planner" class="h-10 w-auto invert" />
          </div>

          <!-- User Menu -->
          <div class="flex items-center space-x-4">
            <span class="text-white text-sm">
              {{ user?.firstName }} {{ user?.lastName }}
            </span>
            <UiButton variant="secondary" size="sm" @click="handleLogout" :is-loading="isLoggingOut">
              Sign Out
            </UiButton>
          </div>
        </div>
      </div>
    </nav>

    <div class="flex">
      <!-- Sidebar -->
      <aside class="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
        <nav class="p-4 space-y-1">
          <NuxtLink
            v-for="item in navigationItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            :class="isActive(item.path) 
              ? 'bg-burgundy-50 text-burgundy-600' 
              : 'text-gray-700 hover:bg-gray-50'"
          >
            <component :is="item.icon" class="w-5 h-5 mr-3" />
            {{ item.label }}
          </NuxtLink>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 p-8">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  UserCircle,
  Settings,
  Map,
  HelpCircle
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const { data: sessionData } = await useFetch('/api/auth/session')
const user = computed(() => sessionData.value?.user)
const isLoggingOut = ref(false)

const lawyerNavigation = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/dashboard/clients', label: 'Clients', icon: Users },
  { path: '/dashboard/cases', label: 'Matters', icon: FileText },
  { path: '/dashboard/matters', label: 'Services', icon: FileText },
  { path: '/dashboard/journeys', label: 'Journeys', icon: Map },
  { path: '/dashboard/documents', label: 'Documents', icon: FileText },
  { path: '/dashboard/templates', label: 'Templates', icon: FileText },
  { path: '/dashboard/schedule', label: 'Schedule', icon: Calendar },
  { path: '/dashboard/profile', label: 'Profile', icon: UserCircle },
  { path: '/dashboard/settings', label: 'Settings', icon: Settings },
  { path: '/dashboard/help', label: 'Help', icon: HelpCircle }
]

const clientNavigation = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/dashboard/my-journeys', label: 'My Journeys', icon: Map },
  { path: '/dashboard/my-matters', label: 'My Matters', icon: FileText },
  { path: '/dashboard/documents', label: 'My Documents', icon: FileText },
  { path: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
  { path: '/dashboard/profile', label: 'Profile', icon: UserCircle },
  { path: '/dashboard/help', label: 'Help', icon: HelpCircle }
]

const navigationItems = computed(() => {
  return user.value?.role === 'LAWYER' || user.value?.role === 'ADMIN' 
    ? lawyerNavigation 
    : clientNavigation
})

const isActive = (path: string) => {
  if (path === '/dashboard') {
    return route.path === '/dashboard'
  }
  return route.path.startsWith(path)
}

const handleLogout = async () => {
  isLoggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await router.push('/login')
  } catch (err) {
    console.error('Logout failed:', err)
  } finally {
    isLoggingOut.value = false
  }
}
</script>

