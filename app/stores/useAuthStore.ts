import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const FIRM_ROLES = ['ADMIN', 'LAWYER', 'STAFF']

export interface AuthUser {
  id: string
  email: string
  role: string
  adminLevel: number
  firstName: string
  lastName: string
  [key: string]: any
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const isLoaded = ref(false)
  const isLoading = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!user.value)
  const role = computed(() => user.value?.role ?? null)
  const adminLevel = computed(() => user.value?.adminLevel ?? 0)

  /** Internal firm employees: ADMIN, LAWYER, STAFF */
  const isFirmUser = computed(() => !!user.value && FIRM_ROLES.includes(user.value.role))

  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isLawyer = computed(() => user.value?.role === 'LAWYER')
  const isStaff = computed(() => user.value?.role === 'STAFF')
  const isClient = computed(() => user.value?.role === 'CLIENT')
  const isAdvisor = computed(() => user.value?.role === 'ADVISOR')

  // Actions
  async function fetchSession() {
    if (isLoaded.value || isLoading.value) return
    isLoading.value = true
    try {
      const data = await $fetch<{ user: AuthUser }>('/api/auth/session')
      user.value = data?.user ?? null
      isLoaded.value = true
    }
    catch {
      user.value = null
      isLoaded.value = true
    }
    finally {
      isLoading.value = false
    }
  }

  function setUser(newUser: AuthUser | null) {
    user.value = newUser
    isLoaded.value = true
  }

  function reset() {
    user.value = null
    isLoaded.value = false
    isLoading.value = false
  }

  return {
    user,
    isLoaded,
    isLoading,
    isAuthenticated,
    role,
    adminLevel,
    isFirmUser,
    isAdmin,
    isLawyer,
    isStaff,
    isClient,
    isAdvisor,
    fetchSession,
    setUser,
    reset
  }
})
