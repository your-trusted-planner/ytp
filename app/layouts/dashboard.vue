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
            <!-- Notification Bell -->
            <NoticesNotificationBell />

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
                @click="toggleSection(item.label)"
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
      <main class="flex-1 min-w-0 p-8 transition-all duration-300">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, markRaw } from 'vue'
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
  Contact,
  KeyRound,
  Activity,
  PenTool,
  FolderOpen,
  Bell
} from 'lucide-vue-next'
import GoogleDriveIcon from '~/components/icons/GoogleDrive.vue'

// Mark imported component as raw to prevent Vue from making it reactive
const GoogleDriveIconRaw = markRaw(GoogleDriveIcon)

const router = useRouter()
const route = useRoute()
const { data: sessionData } = await useFetch('/api/auth/session')
const user = computed(() => sessionData.value?.user)
const isLoggingOut = ref(false)
const isSidebarCollapsed = ref(false)

// Role groups for easier configuration
// FIRM_ROLES: Internal firm employees with broad access (admins, attorneys, paralegals, secretaries, etc.)
const FIRM_ROLES = ['ADMIN', 'LAWYER', 'STAFF']
// ADVISOR: External third-parties (CPAs, investment advisors, insurance brokers) with limited access to specific clients/matters
const ADVISOR_ROLES = ['ADVISOR']
const CLIENT_ROLES = ['CLIENT']
const PROSPECT_ROLES = ['PROSPECT', 'LEAD']
const ALL_ROLES = [...FIRM_ROLES, ...ADVISOR_ROLES, ...CLIENT_ROLES, ...PROSPECT_ROLES]

// Single navigation configuration with role-based visibility
const navigationConfig = ref([
  // Dashboard - visible to all
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL_ROLES },

  // Staff-only sections
  { path: '/clients', label: 'Clients', icon: Users, roles: FIRM_ROLES },
  { path: '/people', label: 'People', icon: Contact, roles: FIRM_ROLES },
  { path: '/matters', label: 'Matters', icon: Briefcase, roles: FIRM_ROLES },
  { path: '/documents', label: 'Documents', icon: File, roles: FIRM_ROLES },
  { path: '/signatures', label: 'E-Signatures', icon: PenTool, roles: FIRM_ROLES },
  { path: '/schedule', label: 'Schedule', icon: Calendar, roles: FIRM_ROLES },
  { path: '/activity', label: 'Activity Log', icon: Activity, roles: FIRM_ROLES },

  // Configuration section - staff only
  {
    label: 'Configuration',
    icon: Wrench,
    isOpen: false,
    roles: FIRM_ROLES,
    children: [
      { path: '/service-catalog', label: 'Service Catalog', icon: ShoppingBag, roles: FIRM_ROLES },
      { path: '/service-catalog/service-categories', label: 'Service Categories', icon: FolderOpen, roles: FIRM_ROLES, minAdminLevel: 1 },
      { path: '/journeys', label: 'Journey Templates', icon: Map, roles: FIRM_ROLES },
      { path: '/templates', label: 'Document Templates', icon: Copy, roles: FIRM_ROLES }
    ]
  },

  // Client-facing sections (engaged clients only)
  { path: '/my-journeys', label: 'My Journeys', icon: Map, roles: CLIENT_ROLES },
  { path: '/my-matters', label: 'My Matters', icon: Briefcase, roles: CLIENT_ROLES },

  // Appointments - clients and prospects can book/view
  { path: '/appointments', label: 'Appointments', icon: Calendar, roles: [...CLIENT_ROLES, ...PROSPECT_ROLES] },
  { path: '/documents', label: 'My Documents', icon: File, roles: [...CLIENT_ROLES, ...PROSPECT_ROLES] },

  // Profile - visible to all
  { path: '/profile', label: 'Profile', icon: UserCircle, roles: ALL_ROLES },

  // Settings section - requires admin level 2+
  {
    label: 'Settings',
    icon: Settings,
    isOpen: false,
    roles: ALL_ROLES, // Role check bypassed, uses adminLevel instead
    minAdminLevel: 2,
    children: [
      { path: '/settings/users', label: 'Users', icon: UserCircle, roles: ALL_ROLES, minAdminLevel: 2 },
      { path: '/settings/oauth-providers', label: 'OAuth Providers', icon: KeyRound, roles: ALL_ROLES, minAdminLevel: 2 },
      { path: '/settings/calendars', label: 'Calendar Admin', icon: Calendar, roles: ALL_ROLES, minAdminLevel: 2 },
      { path: '/settings/google-drive', label: 'Google Drive', icon: GoogleDriveIconRaw, roles: ALL_ROLES, minAdminLevel: 2 }
    ]
  },

  // Help - visible to all
  { path: '/help', label: 'Help', icon: HelpCircle, roles: ALL_ROLES }
])

// Filter navigation items based on user's role and admin level
const navigationItems = computed(() => {
  const role = user.value?.role
  const adminLevel = user.value?.adminLevel ?? 0
  if (!role) return []

  const filterByAccess = (items: any[]): any[] => {
    return items
      .filter(item => {
        // Check role requirement
        const hasRole = item.roles?.includes(role)
        // Check admin level requirement (if specified)
        const hasAdminLevel = item.minAdminLevel ? adminLevel >= item.minAdminLevel : true
        return hasRole && hasAdminLevel
      })
      .map(item => {
        if (item.children) {
          return {
            ...item,
            children: filterByAccess(item.children)
          }
        }
        return item
      })
      .filter(item => !item.children || item.children.length > 0) // Remove empty sections
  }

  const items = filterByAccess(navigationConfig.value)

  // Auto-expand sections if on a child page
  items.forEach(item => {
    if (item.children) {
      const isOnChildPage = item.children.some((child: any) => route.path.startsWith(child.path))
      if (isOnChildPage) {
        item.isOpen = true
      }
    }
  })

  return items
})

const isActive = (path: string) => {
  if (path === '/dashboard') {
    return route.path === '/dashboard'
  }
  return route.path.startsWith(path)
}

// Toggle section open/closed state on the original config
const toggleSection = (label: string) => {
  // If sidebar is collapsed, expand it first when clicking a section with children
  if (isSidebarCollapsed.value) {
    isSidebarCollapsed.value = false
    // Open the section after expanding sidebar
    const item = navigationConfig.value.find(i => i.label === label)
    if (item && 'isOpen' in item) {
      item.isOpen = true
    }
    return
  }

  const item = navigationConfig.value.find(i => i.label === label)
  if (item && 'isOpen' in item) {
    item.isOpen = !item.isOpen
  }
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

// Watch for invalid session and redirect to login
watch(user, (newUser) => {
  if (!newUser) {
    console.warn('Session invalidated, redirecting to login')
    router.push('/login?reason=invalid')
  }
}, { immediate: true })
</script>
