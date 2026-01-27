<template>
  <div class="relative">
    <!-- User Menu Button -->
    <button
      @click="toggleDropdown"
      class="flex items-center space-x-3 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
      :class="{ 'bg-white/10 text-white': isOpen }"
    >
      <!-- Avatar -->
      <div class="w-8 h-8 rounded-full bg-burgundy-600 flex items-center justify-center text-white text-sm font-medium overflow-hidden">
        <img
          v-if="user?.avatar"
          :src="user.avatar"
          :alt="`${user.firstName} ${user.lastName}`"
          class="w-full h-full object-cover"
          referrerpolicy="no-referrer"
        />
        <span v-else>{{ initials }}</span>
      </div>
      <span class="text-sm hidden sm:block">{{ user?.firstName }} {{ user?.lastName }}</span>
      <ChevronDown class="w-4 h-4 transition-transform" :class="{ 'rotate-180': isOpen }" />
    </button>

    <!-- Backdrop -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-40"
        @click="closeDropdown"
      />
    </Teleport>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden"
      >
        <!-- User Info Header -->
        <div class="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center space-x-3">
          <!-- Large Avatar -->
          <div class="w-10 h-10 rounded-full bg-burgundy-600 flex items-center justify-center text-white font-medium overflow-hidden flex-shrink-0">
            <img
              v-if="user?.avatar"
              :src="user.avatar"
              :alt="`${user.firstName} ${user.lastName}`"
              class="w-full h-full object-cover"
              referrerpolicy="no-referrer"
            />
            <span v-else>{{ initials }}</span>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-gray-900">{{ user?.firstName }} {{ user?.lastName }}</p>
            <p class="text-xs text-gray-500 truncate">{{ user?.email }}</p>
          </div>
        </div>

        <!-- Menu Items -->
        <div class="py-1">
          <NuxtLink
            to="/profile"
            class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            @click="closeDropdown"
          >
            <UserCircle class="w-4 h-4 mr-3 text-gray-400" />
            Profile
          </NuxtLink>

          <NuxtLink
            v-if="isAdmin"
            to="/settings"
            class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            @click="closeDropdown"
          >
            <Settings class="w-4 h-4 mr-3 text-gray-400" />
            Settings
          </NuxtLink>
        </div>

        <!-- Sign Out -->
        <div class="border-t border-gray-100 py-1">
          <button
            @click="handleLogout"
            :disabled="isLoggingOut"
            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <LogOut class="w-4 h-4 mr-3 text-gray-400" />
            <span v-if="isLoggingOut">Signing out...</span>
            <span v-else>Sign Out</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronDown, UserCircle, Settings, LogOut } from 'lucide-vue-next'

interface User {
  firstName?: string
  lastName?: string
  email?: string
  adminLevel?: number
  avatar?: string | null
}

const props = defineProps<{
  user: User | null
}>()

const emit = defineEmits<{
  logout: []
}>()

const isOpen = ref(false)
const isLoggingOut = ref(false)
const router = useRouter()
const appConfigStore = useAppConfigStore()

const initials = computed(() => {
  const first = props.user?.firstName?.[0] || ''
  const last = props.user?.lastName?.[0] || ''
  return (first + last).toUpperCase() || '?'
})

const isAdmin = computed(() => (props.user?.adminLevel ?? 0) >= 2)

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function closeDropdown() {
  isOpen.value = false
}

async function handleLogout() {
  isLoggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    appConfigStore.reset()
    await router.push('/login')
  } catch (err) {
    console.error('Logout failed:', err)
  } finally {
    isLoggingOut.value = false
  }
}
</script>
