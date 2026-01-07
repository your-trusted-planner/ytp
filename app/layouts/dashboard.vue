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
      <aside 
        class="bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] transition-all duration-300 relative"
        :class="isSidebarCollapsed ? 'w-20' : 'w-64'"
      >
        <!-- Collapse Toggle -->
        <button 
          @click="isSidebarCollapsed = !isSidebarCollapsed"
          class="absolute -right-3 top-6 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-gray-700 shadow-sm z-10"
        >
          <component :is="isSidebarCollapsed ? ChevronRight : ChevronLeft" class="w-4 h-4" />
        </button>

        <nav class="p-4 space-y-1">
          <!-- Regular Navigation Items -->
          <template v-for="item in navigationItems" :key="item.path || item.label">
            <!-- Collapsible Section -->
            <div v-if="item.children" class="space-y-1">
              <button
                @click="item.isOpen = !item.isOpen"
                class="flex items-center w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
                :class="isSidebarCollapsed ? 'justify-center px-2' : ''"
                :title="isSidebarCollapsed ? item.label : ''"
              >
                <component :is="item.icon" class="w-5 h-5" :class="isSidebarCollapsed ? '' : 'mr-3'" />
                <span v-if="!isSidebarCollapsed" class="flex-1 text-left">{{ item.label }}</span>
                <component
                  v-if="!isSidebarCollapsed"
                  :is="item.isOpen ? ChevronDown : ChevronRight"
                  class="w-4 h-4 transition-transform"
                />
              </button>

              <!-- Nested Items -->
              <div v-if="item.isOpen && !isSidebarCollapsed" class="ml-4 space-y-1">
                <NuxtLink
                  v-for="child in item.children"
                  :key="child.path"
                  :to="child.path"
                  class="flex items-center px-4 py-2 text-sm rounded-lg transition-colors"
                  :class="isActive(child.path) ? 'bg-burgundy-50 text-burgundy-600' : 'text-gray-600 hover:bg-gray-50'"
                >
                  <component :is="child.icon" class="w-4 h-4 mr-3" />
                  <span>{{ child.label }}</span>
                </NuxtLink>
              </div>
            </div>

            <!-- Regular Link -->
            <NuxtLink
              v-else
              :to="item.path"
              class="flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              :class="[
                isActive(item.path) ? 'bg-burgundy-50 text-burgundy-600' : 'text-gray-700 hover:bg-gray-50',
                isSidebarCollapsed ? 'justify-center px-2' : ''
              ]"
              :title="isSidebarCollapsed ? item.label : ''"
            >
              <component :is="item.icon" class="w-5 h-5" :class="isSidebarCollapsed ? '' : 'mr-3'" />
              <span v-if="!isSidebarCollapsed">{{ item.label }}</span>
            </NuxtLink>
          </template>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 p-8 transition-all duration-300">
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
  HelpCircle,
  Briefcase,
  ShoppingBag,
  File,
  Copy,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wrench,
  Contact
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const { data: sessionData } = await useFetch('/api/auth/session')
const user = computed(() => sessionData.value?.user)
const isLoggingOut = ref(false)
const isSidebarCollapsed = ref(false)

const lawyerNavigation = ref([
  // Frequent Use - Client Activity
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/dashboard/clients', label: 'Clients', icon: Users },
  { path: '/dashboard/people', label: 'People', icon: Contact },
  { path: '/dashboard/matters', label: 'Matters', icon: Briefcase },
  { path: '/dashboard/documents', label: 'Documents', icon: File },
  { path: '/dashboard/schedule', label: 'Schedule', icon: Calendar },

  // Configuration (Collapsible)
  {
    label: 'Configuration',
    icon: Wrench,
    isOpen: false,
    children: [
      { path: '/dashboard/service-catalog', label: 'Service Catalog', icon: ShoppingBag },
      { path: '/dashboard/journeys', label: 'Journey Templates', icon: Map },
      { path: '/dashboard/templates', label: 'Document Templates', icon: Copy }
    ]
  },

  // Personal & Help
  { path: '/dashboard/profile', label: 'Profile', icon: UserCircle },
  {
    label: 'Settings',
    icon: Settings,
    isOpen: false,
    children: [
      { path: '/dashboard/settings', label: 'General', icon: Settings },
      { path: '/dashboard/settings/users', label: 'Users', icon: UserCircle },
      { path: '/dashboard/settings/calendars', label: 'Calendars', icon: Calendar }
    ]
  },
  { path: '/dashboard/help', label: 'Help', icon: HelpCircle }
])

const clientNavigation = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/dashboard/my-journeys', label: 'My Journeys', icon: Map },
  { path: '/dashboard/my-matters', label: 'My Matters', icon: Briefcase },
  { path: '/dashboard/documents', label: 'My Documents', icon: File },
  { path: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
  { path: '/dashboard/profile', label: 'Profile', icon: UserCircle },
  { path: '/dashboard/help', label: 'Help', icon: HelpCircle }
]

const navigationItems = computed(() => {
  const items = user.value?.role === 'LAWYER' || user.value?.role === 'ADMIN'
    ? lawyerNavigation.value
    : clientNavigation

  // Auto-expand Configuration if on a config page
  if (user.value?.role === 'LAWYER' || user.value?.role === 'ADMIN') {
    const configItem = items.find(item => item.label === 'Configuration')
    if (configItem && configItem.children) {
      const isOnConfigPage = configItem.children.some(child => route.path.startsWith(child.path))
      if (isOnConfigPage) {
        configItem.isOpen = true
      }
    }
  }

  return items
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

