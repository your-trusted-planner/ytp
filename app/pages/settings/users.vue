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
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-500">Loading users...</p>
      </div>
      <div v-else-if="users.length === 0" class="text-center py-12">
        <p class="text-gray-500">No users found</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Level</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
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
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                <button
                  @click="editUser(user)"
                  class="text-burgundy-600 hover:text-burgundy-900"
                >
                  Edit
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

const editForm = ref({
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  role: 'CLIENT',
  status: 'ACTIVE',
  adminLevel: 0
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
      adminLevel: user.admin_level ?? 0
    }))
  } catch (error) {
    console.error('Failed to fetch users:', error)
  } finally {
    loading.value = false
  }
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
    adminLevel: 0
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
    adminLevel: user.adminLevel ?? 0
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

onMounted(() => {
  fetchUsers()
})
</script>
