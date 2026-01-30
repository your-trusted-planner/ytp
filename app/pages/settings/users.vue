<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">User Management</h1>
        <p class="text-gray-600 mt-1">Manage user roles and permissions</p>
      </div>
      <UiButton @click="openCreateModal">
        Create User
      </UiButton>
    </div>

    <!-- Users List -->
    <UiCard>
      <!-- Filter Summary -->
      <div v-if="hasActiveFilters" class="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div class="text-sm text-gray-600">
          Showing {{ filteredUsers.length }} of {{ users.length }} users
        </div>
        <button
          @click="clearAllFilters"
          class="text-sm text-burgundy-600 hover:text-burgundy-800"
        >
          Clear all filters
        </button>
      </div>

      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-500">Loading users...</p>
      </div>
      <div v-else-if="users.length === 0" class="text-center py-12">
        <p class="text-gray-500">No users found</p>
      </div>
      <div v-else-if="filteredUsers.length === 0" class="text-center py-12">
        <p class="text-gray-500">No users match the current filters</p>
        <button
          @click="clearAllFilters"
          class="mt-2 text-sm text-burgundy-600 hover:text-burgundy-800"
        >
          Clear filters
        </button>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <!-- Role Filter -->
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div class="relative">
                  <button
                    @click="toggleFilter('role')"
                    class="flex items-center gap-1 hover:text-gray-700"
                    :class="{ 'text-burgundy-600': roleFilter.size > 0 }"
                  >
                    Role
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span v-if="roleFilter.size > 0" class="ml-1 px-1.5 py-0.5 text-xs bg-burgundy-100 text-burgundy-700 rounded-full">
                      {{ roleFilter.size }}
                    </span>
                  </button>
                  <div
                    v-if="activeFilter === 'role'"
                    class="absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200"
                  >
                    <div class="p-2 border-b border-gray-100">
                      <button @click="clearFilter('role')" class="text-xs text-gray-500 hover:text-gray-700">
                        Clear filter
                      </button>
                    </div>
                    <div class="max-h-48 overflow-y-auto p-2 space-y-1">
                      <label
                        v-for="role in uniqueRoles"
                        :key="role"
                        class="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          :checked="roleFilter.has(role)"
                          @change="toggleFilterValue('role', role)"
                          class="rounded border-gray-300 text-burgundy-600 focus:ring-burgundy-500"
                        />
                        <UiBadge :variant="getRoleBadgeVariant(role)" size="sm">{{ role }}</UiBadge>
                      </label>
                    </div>
                  </div>
                </div>
              </th>
              <!-- Admin Level Filter -->
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div class="relative">
                  <button
                    @click="toggleFilter('adminLevel')"
                    class="flex items-center gap-1 hover:text-gray-700"
                    :class="{ 'text-burgundy-600': adminLevelFilter.size > 0 }"
                  >
                    Admin Level
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span v-if="adminLevelFilter.size > 0" class="ml-1 px-1.5 py-0.5 text-xs bg-burgundy-100 text-burgundy-700 rounded-full">
                      {{ adminLevelFilter.size }}
                    </span>
                  </button>
                  <div
                    v-if="activeFilter === 'adminLevel'"
                    class="absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200"
                  >
                    <div class="p-2 border-b border-gray-100">
                      <button @click="clearFilter('adminLevel')" class="text-xs text-gray-500 hover:text-gray-700">
                        Clear filter
                      </button>
                    </div>
                    <div class="max-h-48 overflow-y-auto p-2 space-y-1">
                      <label
                        v-for="level in uniqueAdminLevels"
                        :key="level"
                        class="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          :checked="adminLevelFilter.has(level)"
                          @change="toggleFilterValue('adminLevel', level)"
                          class="rounded border-gray-300 text-burgundy-600 focus:ring-burgundy-500"
                        />
                        <span v-if="level === 0" class="text-gray-400 text-sm">None</span>
                        <UiBadge v-else :variant="getAdminLevelVariant(level)" size="sm">Level {{ level }}</UiBadge>
                      </label>
                    </div>
                  </div>
                </div>
              </th>
              <!-- Status Filter -->
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div class="relative">
                  <button
                    @click="toggleFilter('status')"
                    class="flex items-center gap-1 hover:text-gray-700"
                    :class="{ 'text-burgundy-600': statusFilter.size > 0 }"
                  >
                    Status
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span v-if="statusFilter.size > 0" class="ml-1 px-1.5 py-0.5 text-xs bg-burgundy-100 text-burgundy-700 rounded-full">
                      {{ statusFilter.size }}
                    </span>
                  </button>
                  <div
                    v-if="activeFilter === 'status'"
                    class="absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200"
                  >
                    <div class="p-2 border-b border-gray-100">
                      <button @click="clearFilter('status')" class="text-xs text-gray-500 hover:text-gray-700">
                        Clear filter
                      </button>
                    </div>
                    <div class="max-h-48 overflow-y-auto p-2 space-y-1">
                      <label
                        v-for="status in uniqueStatuses"
                        :key="status"
                        class="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          :checked="statusFilter.has(status)"
                          @change="toggleFilterValue('status', status)"
                          class="rounded border-gray-300 text-burgundy-600 focus:ring-burgundy-500"
                        />
                        <UiBadge :variant="getStatusBadgeVariant(status)" size="sm">{{ status }}</UiBadge>
                      </label>
                    </div>
                  </div>
                </div>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hourly Rate</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'No name' }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ user.email }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <UiBadge :variant="getRoleBadgeVariant(user.role)">
                  {{ user.role }}
                </UiBadge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <UiBadge v-if="user.adminLevel > 0" :variant="getAdminLevelVariant(user.adminLevel)">
                  Level {{ user.adminLevel }}
                </UiBadge>
                <span v-else class="text-gray-400 text-sm">—</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <UiBadge :variant="getStatusBadgeVariant(user.status)">
                  {{ user.status }}
                </UiBadge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span v-if="['LAWYER', 'STAFF'].includes(user.role) && user.defaultHourlyRate" class="text-sm font-medium text-gray-900">
                  {{ formatCurrency(user.defaultHourlyRate) }}/hr
                </span>
                <span v-else-if="['LAWYER', 'STAFF'].includes(user.role)" class="text-gray-400 text-sm">Not set</span>
                <span v-else class="text-gray-400 text-sm">—</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                <button
                  @click="editUser(user)"
                  class="text-burgundy-600 hover:text-burgundy-900"
                >
                  Edit
                </button>
                <button
                  v-if="user.email && user.status !== 'INACTIVE'"
                  @click="sendPasswordReset(user)"
                  class="text-blue-600 hover:text-blue-900"
                  :disabled="sendingResetFor === user.id"
                >
                  {{ sendingResetFor === user.id ? 'Sending...' : 'Reset Password' }}
                </button>
                <button
                  @click="confirmDelete(user)"
                  class="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <!-- Create/Edit User Modal -->
    <UiModal v-model="showEditModal" :title="editingUser ? 'Edit User' : 'Create User'" size="md">
      <form @submit.prevent="handleSaveUser" class="space-y-4">
        <UiInput
          v-if="!editingUser"
          v-model="editForm.email"
          label="Email"
          type="email"
          required
        />

        <UiInput
          v-if="!editingUser"
          v-model="editForm.password"
          label="Password"
          type="password"
          required
        />

        <UiInput
          v-model="editForm.firstName"
          label="First Name"
        />

        <UiInput
          v-model="editForm.lastName"
          label="Last Name"
        />

        <UiInput
          v-model="editForm.phone"
          label="Phone"
          type="tel"
        />

        <UiSelect
          v-model="editForm.role"
          label="Role"
          required
        >
          <option value="PROSPECT">Prospect</option>
          <option value="LEAD">Lead</option>
          <option value="CLIENT">Client</option>
          <option value="ADVISOR">Advisor (External)</option>
          <option value="STAFF">Staff</option>
          <option value="LAWYER">Lawyer</option>
        </UiSelect>

        <UiSelect
          v-model="editForm.status"
          label="Status"
          required
        >
          <option value="PROSPECT">Prospect</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </UiSelect>

        <!-- Admin Level - only visible to admin level 2+ -->
        <div v-if="canEditAdminLevel">
          <UiSelect
            v-model="editForm.adminLevel"
            label="Admin Level"
          >
            <option :value="0">None</option>
            <option v-for="level in availableAdminLevels" :key="level" :value="level">
              Level {{ level }}{{ level === 1 ? ' (Basic)' : level === 2 ? ' (Full)' : level >= 3 ? ' (Super)' : '' }}
            </option>
          </UiSelect>
          <p class="text-xs text-gray-500 mt-1">
            Admin level grants additional privileges independent of role.
          </p>
        </div>

        <!-- Default Hourly Rate - only for LAWYER/STAFF roles -->
        <div v-if="isFirmRole">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Default Hourly Rate
          </label>
          <div class="relative">
            <span class="absolute left-3 top-2 text-gray-500">$</span>
            <input
              v-model.number="editForm.defaultHourlyRateDollars"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              class="w-full pl-7 pr-16 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500"
            />
            <span class="absolute right-3 top-2 text-gray-500 text-sm">/hour</span>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            Fallback rate when no client/matter/service rate is set.
          </p>
        </div>

        <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p class="text-sm text-yellow-800">
            <strong>Note:</strong> Changing a user's role will affect their access permissions throughout the system.
          </p>
        </div>
      </form>

      <template #footer>
        <UiButton variant="outline" @click="showEditModal = false">
          Cancel
        </UiButton>
        <UiButton @click="handleSaveUser" :is-loading="saving">
          {{ editingUser ? 'Save Changes' : 'Create User' }}
        </UiButton>
      </template>
    </UiModal>

    <!-- Delete Confirmation Modal -->
    <UiModal v-model="showDeleteModal" title="Delete User" size="sm">
      <div class="space-y-4">
        <p class="text-gray-700">
          Are you sure you want to delete <strong>{{ deletingUser?.firstName }} {{ deletingUser?.lastName }}</strong>?
        </p>
        <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-800">
            <strong>Warning:</strong> This action cannot be undone. All data associated with this user will be permanently deleted.
          </p>
        </div>
      </div>

      <template #footer>
        <UiButton variant="outline" @click="showDeleteModal = false">
          Cancel
        </UiButton>
        <UiButton variant="danger" @click="handleDeleteUser" :is-loading="deleting">
          Delete User
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

// Get current user's session for admin level checks
const { data: sessionData } = await useFetch('/api/auth/session')
const currentUser = computed(() => sessionData.value?.user)

const users = ref<any[]>([])
const loading = ref(true)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const saving = ref(false)
const deleting = ref(false)
const editingUser = ref<any>(null)
const deletingUser = ref<any>(null)
const sendingResetFor = ref<string | null>(null)

// Filter state
const activeFilter = ref<string | null>(null)
const roleFilter = ref<Set<string>>(new Set())
const adminLevelFilter = ref<Set<number>>(new Set())
const statusFilter = ref<Set<string>>(new Set())

// Unique values for filter options
const uniqueRoles = computed(() => {
  const roles = new Set(users.value.map(u => u.role))
  return Array.from(roles).sort()
})

const uniqueAdminLevels = computed(() => {
  const levels = new Set(users.value.map(u => u.adminLevel ?? 0))
  return Array.from(levels).sort((a, b) => a - b)
})

const uniqueStatuses = computed(() => {
  const statuses = new Set(users.value.map(u => u.status))
  return Array.from(statuses).sort()
})

// Filtered users
const filteredUsers = computed(() => {
  return users.value.filter(user => {
    if (roleFilter.value.size > 0 && !roleFilter.value.has(user.role)) {
      return false
    }
    if (adminLevelFilter.value.size > 0 && !adminLevelFilter.value.has(user.adminLevel ?? 0)) {
      return false
    }
    if (statusFilter.value.size > 0 && !statusFilter.value.has(user.status)) {
      return false
    }
    return true
  })
})

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return roleFilter.value.size > 0 || adminLevelFilter.value.size > 0 || statusFilter.value.size > 0
})

// Filter functions
function toggleFilter(filterName: string) {
  if (activeFilter.value === filterName) {
    activeFilter.value = null
  } else {
    activeFilter.value = filterName
  }
}

function toggleFilterValue(filterName: string, value: string | number) {
  const filterMap: Record<string, Ref<Set<any>>> = {
    role: roleFilter,
    adminLevel: adminLevelFilter,
    status: statusFilter
  }
  const filter = filterMap[filterName]
  if (filter) {
    const newSet = new Set(filter.value)
    if (newSet.has(value)) {
      newSet.delete(value)
    } else {
      newSet.add(value)
    }
    filter.value = newSet
  }
}

function clearFilter(filterName: string) {
  const filterMap: Record<string, Ref<Set<any>>> = {
    role: roleFilter,
    adminLevel: adminLevelFilter,
    status: statusFilter
  }
  const filter = filterMap[filterName]
  if (filter) {
    filter.value = new Set()
  }
  activeFilter.value = null
}

function clearAllFilters() {
  roleFilter.value = new Set()
  adminLevelFilter.value = new Set()
  statusFilter.value = new Set()
  activeFilter.value = null
}

// Close filter dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('th')) {
    activeFilter.value = null
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  fetchUsers()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const editForm = ref({
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  role: 'CLIENT',
  status: 'ACTIVE',
  adminLevel: 0,
  defaultHourlyRateDollars: null as number | null
})

// Firm roles that can have admin levels (internal employees only, not external advisors)
const FIRM_ROLES = ['LAWYER', 'STAFF']

// Check if selected role is a firm role (can have admin levels)
const isFirmRole = computed(() => FIRM_ROLES.includes(editForm.value.role))

// Can only edit admin levels if current user has admin level 2+ AND selected role is a firm role
const canEditAdminLevel = computed(() => {
  return (currentUser.value?.adminLevel ?? 0) >= 2 && isFirmRole.value
})

// Can only assign admin levels up to your own level
const availableAdminLevels = computed(() => {
  const maxLevel = currentUser.value?.adminLevel ?? 0
  return Array.from({ length: maxLevel }, (_, i) => i + 1)
})

// Auto-reset adminLevel when switching to non-firm role
watch(() => editForm.value.role, (newRole) => {
  if (!FIRM_ROLES.includes(newRole)) {
    editForm.value.adminLevel = 0
  }
})

async function fetchUsers() {
  loading.value = true
  try {
    const response = await $fetch<{ users: any[] }>('/api/users')
    // Map snake_case from API to camelCase for frontend
    users.value = (response.users || []).map(user => ({
      ...user,
      firstName: user.first_name,
      lastName: user.last_name,
      adminLevel: user.admin_level ?? 0,
      defaultHourlyRate: user.default_hourly_rate ?? null
    }))
  } catch (error) {
    console.error('Failed to fetch users:', error)
  } finally {
    loading.value = false
  }
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

function openCreateModal() {
  editingUser.value = null
  editForm.value = {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'CLIENT',
    status: 'ACTIVE',
    adminLevel: 0,
    defaultHourlyRateDollars: null
  }
  showEditModal.value = true
}

function editUser(user: any) {
  editingUser.value = user
  editForm.value = {
    email: user.email || '',
    password: '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phone: user.phone || '',
    role: user.role,
    status: user.status,
    adminLevel: user.adminLevel ?? 0,
    defaultHourlyRateDollars: user.defaultHourlyRate ? user.defaultHourlyRate / 100 : null
  }
  showEditModal.value = true
}

async function handleSaveUser() {
  saving.value = true
  try {
    if (editingUser.value) {
      // Update existing user
      const updateBody: any = {
        firstName: editForm.value.firstName,
        lastName: editForm.value.lastName,
        phone: editForm.value.phone,
        role: editForm.value.role,
        status: editForm.value.status
      }

      // Only include adminLevel if user has permission to edit it
      if (canEditAdminLevel.value) {
        updateBody.adminLevel = Number(editForm.value.adminLevel)
      }

      // Include defaultHourlyRate for LAWYER/STAFF roles (convert dollars to cents)
      if (isFirmRole.value) {
        updateBody.defaultHourlyRate = editForm.value.defaultHourlyRateDollars !== null && editForm.value.defaultHourlyRateDollars >= 0
          ? Math.round(editForm.value.defaultHourlyRateDollars * 100)
          : null
      }

      await $fetch(`/api/users/${editingUser.value.id}`, {
        method: 'PUT',
        body: updateBody
      })
    } else {
      // Create new user
      const createBody: any = {
        email: editForm.value.email,
        password: editForm.value.password,
        firstName: editForm.value.firstName,
        lastName: editForm.value.lastName,
        phone: editForm.value.phone,
        role: editForm.value.role,
        status: editForm.value.status
      }

      // Only include adminLevel if user has permission to edit it
      if (canEditAdminLevel.value && Number(editForm.value.adminLevel) > 0) {
        createBody.adminLevel = Number(editForm.value.adminLevel)
      }

      // Include defaultHourlyRate for LAWYER/STAFF roles (convert dollars to cents)
      if (isFirmRole.value && editForm.value.defaultHourlyRateDollars !== null && editForm.value.defaultHourlyRateDollars >= 0) {
        createBody.defaultHourlyRate = Math.round(editForm.value.defaultHourlyRateDollars * 100)
      }

      await $fetch('/api/users', {
        method: 'POST',
        body: createBody
      })
    }

    showEditModal.value = false
    await fetchUsers()
  } catch (error: any) {
    console.error('Failed to save user:', error)
    alert(error.data?.message || 'Failed to save user')
  } finally {
    saving.value = false
  }
}

async function sendPasswordReset(user: any) {
  if (!user.email) return

  sendingResetFor.value = user.id
  try {
    const response = await $fetch<{ success: boolean; message: string }>(`/api/users/${user.id}/send-password-reset`, {
      method: 'POST'
    })

    if (response.success) {
      alert(response.message)
    }
  } catch (error: any) {
    console.error('Failed to send password reset:', error)
    alert(error.data?.message || 'Failed to send password reset email')
  } finally {
    sendingResetFor.value = null
  }
}

function confirmDelete(user: any) {
  deletingUser.value = user
  showDeleteModal.value = true
}

async function handleDeleteUser() {
  if (!deletingUser.value) return

  deleting.value = true
  try {
    await $fetch(`/api/users/${deletingUser.value.id}`, {
      method: 'DELETE'
    })

    showDeleteModal.value = false
    await fetchUsers()
  } catch (error: any) {
    console.error('Failed to delete user:', error)
    alert(error.data?.message || 'Failed to delete user')
  } finally {
    deleting.value = false
  }
}

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case 'ADMIN':
      return 'danger'
    case 'LAWYER':
      return 'primary'
    case 'STAFF':
      return 'secondary'
    case 'CLIENT':
      return 'success'
    case 'ADVISOR':
      return 'info'
    case 'LEAD':
      return 'warning'
    default:
      return 'default'
  }
}

function getAdminLevelVariant(level: number) {
  if (level >= 3) return 'danger'  // Super admin
  if (level === 2) return 'warning' // Full admin
  if (level === 1) return 'info'    // Basic admin
  return 'default'
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'PENDING_APPROVAL':
      return 'warning'
    case 'INACTIVE':
      return 'default'
    default:
      return 'default'
  }
}

</script>
