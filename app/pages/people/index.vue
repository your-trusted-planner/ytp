<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { Plus, Search, Edit, Trash2, X, Building2, User, Minus, ChevronLeft, ChevronRight } from 'lucide-vue-next'

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

interface Person {
  id: string
  firstName?: string
  lastName?: string
  middleNames?: string[]
  fullName: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  dateOfBirth?: number
  ssnLast4?: string
  entityName?: string
  entityType?: string
  entityEin?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

interface PaginationMeta {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

const people = ref<Person[]>([])
const loading = ref(true)
const searchQuery = ref('')
const showAddModal = ref(false)
const showEditModal = ref(false)
const editingPerson = ref<Person | null>(null)
const savingPerson = ref(false)

// Pagination state
const pagination = ref<PaginationMeta | null>(null)
const currentPage = ref(1)
const currentLimit = ref(25)
const pageSizeOptions = [10, 25, 50, 100]

const personForm = reactive({
  mode: 'person' as 'person' | 'entity',
  // Person fields
  firstName: '',
  lastName: '',
  middleName: '', // Single middle name (simple mode)
  middleNames: [] as string[], // Multiple middle names (advanced mode)
  useMultipleMiddleNames: false, // Toggle between simple/advanced
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  dateOfBirth: '',
  ssnLast4: '',
  // Entity fields
  entityName: '',
  entityType: '',
  entityEin: '',
  // Common
  notes: ''
})

// Middle names management
function enableMultipleMiddleNames() {
  // Convert single middle name to array format
  if (personForm.middleName.trim()) {
    personForm.middleNames = [personForm.middleName.trim()]
  } else {
    personForm.middleNames = ['']
  }
  personForm.useMultipleMiddleNames = true
}

function addMiddleName() {
  personForm.middleNames.push('')
}

function removeMiddleName(index: number) {
  personForm.middleNames.splice(index, 1)
  // If we're down to one or zero, switch back to simple mode
  if (personForm.middleNames.length <= 1) {
    personForm.middleName = personForm.middleNames[0] || ''
    personForm.middleNames = []
    personForm.useMultipleMiddleNames = false
  }
}

// Debounce search
let searchTimeout: ReturnType<typeof setTimeout> | null = null

// Fetch all people with pagination
async function fetchPeople() {
  loading.value = true
  try {
    const data = await $fetch<{ people: Person[], pagination?: PaginationMeta }>('/api/people', {
      params: {
        search: searchQuery.value,
        page: currentPage.value,
        limit: currentLimit.value
      }
    })
    people.value = data.people || []
    pagination.value = data.pagination || null
  } catch (error) {
    console.error('Error fetching people:', error)
  } finally {
    loading.value = false
  }
}

// Handle search with debounce
function handleSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1 // Reset to first page on search
    fetchPeople()
  }, 300)
}

// Pagination handlers
function goToPage(page: number) {
  if (pagination.value) {
    if (page < 1) page = 1
    if (page > pagination.value.totalPages) page = pagination.value.totalPages
  }
  currentPage.value = page
  fetchPeople()
}

function setPageSize(limit: number) {
  currentLimit.value = limit
  currentPage.value = 1
  fetchPeople()
}

// Computed for pagination display
const paginationStartItem = computed(() => {
  if (!pagination.value) return 0
  return (pagination.value.page - 1) * pagination.value.limit + 1
})

const paginationEndItem = computed(() => {
  if (!pagination.value) return 0
  const end = pagination.value.page * pagination.value.limit
  return Math.min(end, pagination.value.totalCount)
})

// Reset form
function resetForm() {
  personForm.mode = 'person'
  personForm.firstName = ''
  personForm.lastName = ''
  personForm.middleName = ''
  personForm.middleNames = []
  personForm.useMultipleMiddleNames = false
  personForm.email = ''
  personForm.phone = ''
  personForm.address = ''
  personForm.city = ''
  personForm.state = ''
  personForm.zipCode = ''
  personForm.dateOfBirth = ''
  personForm.ssnLast4 = ''
  personForm.entityName = ''
  personForm.entityType = ''
  personForm.entityEin = ''
  personForm.notes = ''
}

// Open add modal
function openAddModal() {
  resetForm()
  showAddModal.value = true
}

// Open edit modal
function openEditModal(person: Person) {
  editingPerson.value = person

  // Populate form
  if (person.entityName) {
    personForm.mode = 'entity'
    personForm.entityName = person.entityName
    personForm.entityType = person.entityType || ''
    personForm.entityEin = person.entityEin || ''
  } else {
    personForm.mode = 'person'
    personForm.firstName = person.firstName || ''
    personForm.lastName = person.lastName || ''

    // Handle middle names - use simple or advanced mode based on count
    const middleNames = person.middleNames || []
    if (middleNames.length > 1) {
      personForm.useMultipleMiddleNames = true
      personForm.middleNames = [...middleNames]
      personForm.middleName = ''
    } else {
      personForm.useMultipleMiddleNames = false
      personForm.middleName = middleNames[0] || ''
      personForm.middleNames = []
    }

    personForm.dateOfBirth = person.dateOfBirth ? new Date(person.dateOfBirth).toISOString().split('T')[0] : ''
    personForm.ssnLast4 = person.ssnLast4 || ''
  }

  personForm.email = person.email || ''
  personForm.phone = person.phone || ''
  personForm.address = person.address || ''
  personForm.city = person.city || ''
  personForm.state = person.state || ''
  personForm.zipCode = person.zipCode || ''
  personForm.notes = person.notes || ''

  showEditModal.value = true
}

// Add person
async function addPerson() {
  savingPerson.value = true
  try {
    const payload: any = {
      email: personForm.email || undefined,
      phone: personForm.phone || undefined,
      address: personForm.address || undefined,
      city: personForm.city || undefined,
      state: personForm.state || undefined,
      zipCode: personForm.zipCode || undefined,
      notes: personForm.notes || undefined
    }

    if (personForm.mode === 'person') {
      payload.firstName = personForm.firstName
      payload.lastName = personForm.lastName
      // Handle middle names - combine single and multiple modes
      if (personForm.useMultipleMiddleNames) {
        payload.middleNames = personForm.middleNames.filter(name => name.trim() !== '')
      } else {
        payload.middleNames = personForm.middleName.trim() ? [personForm.middleName.trim()] : []
      }
      if (personForm.dateOfBirth) {
        payload.dateOfBirth = new Date(personForm.dateOfBirth).getTime()
      }
      payload.ssnLast4 = personForm.ssnLast4 || undefined
    } else {
      payload.entityName = personForm.entityName
      payload.entityType = personForm.entityType || undefined
      payload.entityEin = personForm.entityEin || undefined
    }

    await $fetch('/api/people', {
      method: 'POST',
      body: payload
    })

    showAddModal.value = false
    resetForm()
    await fetchPeople()
  } catch (error) {
    console.error('Error adding person:', error)
    alert('Failed to add person')
  } finally {
    savingPerson.value = false
  }
}

// Update person
async function updatePerson() {
  if (!editingPerson.value) return

  savingPerson.value = true
  try {
    const payload: any = {
      email: personForm.email || undefined,
      phone: personForm.phone || undefined,
      address: personForm.address || undefined,
      city: personForm.city || undefined,
      state: personForm.state || undefined,
      zipCode: personForm.zipCode || undefined,
      notes: personForm.notes || undefined
    }

    if (personForm.mode === 'person') {
      payload.firstName = personForm.firstName
      payload.lastName = personForm.lastName
      // Handle middle names - combine single and multiple modes
      if (personForm.useMultipleMiddleNames) {
        payload.middleNames = personForm.middleNames.filter(name => name.trim() !== '')
      } else {
        payload.middleNames = personForm.middleName.trim() ? [personForm.middleName.trim()] : []
      }
      if (personForm.dateOfBirth) {
        payload.dateOfBirth = new Date(personForm.dateOfBirth).getTime()
      }
      payload.ssnLast4 = personForm.ssnLast4 || undefined
    } else {
      payload.entityName = personForm.entityName
      payload.entityType = personForm.entityType || undefined
      payload.entityEin = personForm.entityEin || undefined
    }

    await $fetch(`/api/people/${editingPerson.value.id}`, {
      method: 'PUT',
      body: payload
    })

    showEditModal.value = false
    editingPerson.value = null
    resetForm()
    await fetchPeople()
  } catch (error) {
    console.error('Error updating person:', error)
    alert('Failed to update person')
  } finally {
    savingPerson.value = false
  }
}

// Delete person
async function deletePerson(person: Person) {
  if (!confirm(`Are you sure you want to delete ${person.fullName}? This will also remove all relationships with this person.`)) {
    return
  }

  try {
    await $fetch(`/api/people/${person.id}`, {
      method: 'DELETE'
    })

    await fetchPeople()
  } catch (error: any) {
    console.error('Error deleting person:', error)
    alert(error.data?.message || 'Failed to delete person')
  }
}

// Format date
function formatDate(timestamp?: number) {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleDateString()
}

// On mount
onMounted(() => {
  fetchPeople()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">People</h1>
        <p class="text-sm text-gray-600 mt-1">Manage individuals and entities</p>
      </div>
      <UiButton @click="openAddModal">
        <Plus class="w-4 h-4 mr-2" />
        Add Person
      </UiButton>
    </div>

    <!-- Search -->
    <div class="bg-white rounded-lg border border-gray-200 p-4">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name, email, phone..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
          @input="handleSearchInput"
        />
      </div>
    </div>

    <!-- People Table -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-gray-500">
        Loading people...
      </div>

      <div v-else-if="people.length === 0" class="p-8 text-center text-gray-500">
        <p>No people found</p>
        <UiButton variant="outline" size="sm" @click="openAddModal" class="mt-4">
          <Plus class="w-4 h-4 mr-2" />
          Add Your First Person
        </UiButton>
      </div>

      <table v-else class="w-full">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="person in people" :key="person.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <Building2 v-if="person.entityName" class="w-5 h-5 text-gray-400 mr-2" />
                <User v-else class="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <div class="font-medium text-gray-900">{{ person.fullName }}</div>
                  <div v-if="person.entityType" class="text-xs text-gray-500">{{ person.entityType }}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span v-if="person.entityName" class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                Entity
              </span>
              <span v-else class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                Individual
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm text-gray-900">{{ person.email || '-' }}</div>
              <div class="text-sm text-gray-500">{{ person.phone || '-' }}</div>
            </td>
            <td class="px-6 py-4">
              <div v-if="person.city || person.state" class="text-sm text-gray-900">
                {{ person.city }}{{ person.city && person.state ? ', ' : '' }}{{ person.state }}
              </div>
              <div v-else class="text-sm text-gray-500">-</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(person.createdAt) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button
                @click="openEditModal(person)"
                class="text-burgundy-600 hover:text-burgundy-900 mr-3"
              >
                <Edit class="w-4 h-4" />
              </button>
              <button
                @click="deletePerson(person)"
                class="text-red-600 hover:text-red-900"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination Controls -->
      <div v-if="pagination" class="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <!-- Page info -->
        <div class="text-sm text-gray-700">
          Showing {{ paginationStartItem }}-{{ paginationEndItem }} of {{ pagination.totalCount }}
        </div>

        <div class="flex items-center gap-4">
          <!-- Page size selector -->
          <div class="flex items-center gap-2">
            <label for="page-size" class="text-sm text-gray-700">Per page:</label>
            <select
              id="page-size"
              :value="currentLimit"
              class="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
              @change="setPageSize(Number(($event.target as HTMLSelectElement).value))"
            >
              <option v-for="size in pageSizeOptions" :key="size" :value="size">
                {{ size }}
              </option>
            </select>
          </div>

          <!-- Page navigation -->
          <div class="flex items-center gap-2">
            <button
              :disabled="!pagination.hasPrevPage"
              class="p-1 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="goToPage(pagination.page - 1)"
            >
              <ChevronLeft class="w-5 h-5" />
            </button>

            <span class="text-sm text-gray-700">
              Page {{ pagination.page }} of {{ pagination.totalPages }}
            </span>

            <button
              :disabled="!pagination.hasNextPage"
              class="p-1 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="goToPage(pagination.page + 1)"
            >
              <ChevronRight class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Person Modal -->
    <UiModal v-model="showAddModal" title="Add Person" size="lg">
      <form @submit.prevent="addPerson" class="space-y-4">
        <!-- Type Selection -->
        <div class="border-b pb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <div class="flex gap-4">
            <label class="flex items-center cursor-pointer">
              <input
                type="radio"
                v-model="personForm.mode"
                value="person"
                class="mr-2"
              />
              <User class="w-4 h-4 mr-1" />
              Individual Person
            </label>
            <label class="flex items-center cursor-pointer">
              <input
                type="radio"
                v-model="personForm.mode"
                value="entity"
                class="mr-2"
              />
              <Building2 class="w-4 h-4 mr-1" />
              Business Entity
            </label>
          </div>
        </div>

        <!-- Person Fields -->
        <div v-if="personForm.mode === 'person'" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UiInput v-model="personForm.firstName" label="First Name" required />
            <UiInput v-model="personForm.lastName" label="Last Name" required />
          </div>

          <!-- Middle Names -->
          <div class="space-y-2">
            <!-- Simple mode: single input -->
            <div v-if="!personForm.useMultipleMiddleNames">
              <label class="block text-sm font-medium text-gray-700 mb-1">Middle Name (optional)</label>
              <input
                v-model="personForm.middleName"
                type="text"
                placeholder="Middle name"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
              />
              <button
                type="button"
                @click="enableMultipleMiddleNames"
                class="mt-1 text-sm text-burgundy-600 hover:text-burgundy-800"
              >
                + Add another middle name
              </button>
            </div>

            <!-- Advanced mode: multiple inputs -->
            <div v-else class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="block text-sm font-medium text-gray-700">Middle Names</label>
                <button
                  type="button"
                  @click="addMiddleName"
                  class="text-sm text-burgundy-600 hover:text-burgundy-800 flex items-center"
                >
                  <Plus class="w-4 h-4 mr-1" />
                  Add Another
                </button>
              </div>
              <div v-for="(middleName, index) in personForm.middleNames" :key="index" class="flex items-center gap-2">
                <input
                  v-model="personForm.middleNames[index]"
                  type="text"
                  :placeholder="`Middle Name ${index + 1}`"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
                />
                <button
                  type="button"
                  @click="removeMiddleName(index)"
                  class="p-2 text-red-600 hover:text-red-800"
                  title="Remove middle name"
                >
                  <Minus class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UiInput v-model="personForm.dateOfBirth" label="Date of Birth" type="date" />
            <UiInput v-model="personForm.ssnLast4" label="SSN Last 4" maxlength="4" />
          </div>
        </div>

        <!-- Entity Fields -->
        <div v-if="personForm.mode === 'entity'" class="space-y-4">
          <UiInput v-model="personForm.entityName" label="Entity Name" required />
          <div class="grid grid-cols-2 gap-4">
            <UiSelect v-model="personForm.entityType" label="Entity Type">
              <option value="">-- Select Type --</option>
              <option value="LLC">LLC</option>
              <option value="Corporation">Corporation</option>
              <option value="Partnership">Partnership</option>
              <option value="Trust">Trust</option>
              <option value="Non-Profit">Non-Profit</option>
              <option value="Other">Other</option>
            </UiSelect>
            <UiInput v-model="personForm.entityEin" label="EIN" />
          </div>
        </div>

        <!-- Contact Information -->
        <div class="border-t pt-4 space-y-4">
          <h4 class="font-semibold text-gray-900">Contact Information</h4>
          <div class="grid grid-cols-2 gap-4">
            <UiInput v-model="personForm.email" label="Email" type="email" />
            <UiInput v-model="personForm.phone" label="Phone" type="tel" />
          </div>
          <UiInput v-model="personForm.address" label="Address" />
          <div class="grid grid-cols-3 gap-4">
            <UiInput v-model="personForm.city" label="City" />
            <UiInput v-model="personForm.state" label="State" maxlength="2" />
            <UiInput v-model="personForm.zipCode" label="ZIP Code" />
          </div>
        </div>

        <!-- Notes -->
        <UiTextarea v-model="personForm.notes" label="Notes (optional)" :rows="3" />

        <!-- Actions -->
        <div class="flex justify-end gap-2 pt-4">
          <UiButton type="button" variant="outline" @click="showAddModal = false">
            Cancel
          </UiButton>
          <UiButton type="submit" :disabled="savingPerson">
            {{ savingPerson ? 'Adding...' : 'Add Person' }}
          </UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Edit Person Modal -->
    <UiModal v-model="showEditModal" title="Edit Person" size="lg">
      <form @submit.prevent="updatePerson" class="space-y-4">
        <!-- Type Display (read-only) -->
        <div class="border-b pb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <div class="flex items-center text-sm text-gray-600">
            <Building2 v-if="personForm.mode === 'entity'" class="w-4 h-4 mr-2" />
            <User v-else class="w-4 h-4 mr-2" />
            {{ personForm.mode === 'entity' ? 'Business Entity' : 'Individual Person' }}
          </div>
        </div>

        <!-- Person Fields -->
        <div v-if="personForm.mode === 'person'" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UiInput v-model="personForm.firstName" label="First Name" required />
            <UiInput v-model="personForm.lastName" label="Last Name" required />
          </div>

          <!-- Middle Names -->
          <div class="space-y-2">
            <!-- Simple mode: single input -->
            <div v-if="!personForm.useMultipleMiddleNames">
              <label class="block text-sm font-medium text-gray-700 mb-1">Middle Name (optional)</label>
              <input
                v-model="personForm.middleName"
                type="text"
                placeholder="Middle name"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
              />
              <button
                type="button"
                @click="enableMultipleMiddleNames"
                class="mt-1 text-sm text-burgundy-600 hover:text-burgundy-800"
              >
                + Add another middle name
              </button>
            </div>

            <!-- Advanced mode: multiple inputs -->
            <div v-else class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="block text-sm font-medium text-gray-700">Middle Names</label>
                <button
                  type="button"
                  @click="addMiddleName"
                  class="text-sm text-burgundy-600 hover:text-burgundy-800 flex items-center"
                >
                  <Plus class="w-4 h-4 mr-1" />
                  Add Another
                </button>
              </div>
              <div v-for="(middleName, index) in personForm.middleNames" :key="index" class="flex items-center gap-2">
                <input
                  v-model="personForm.middleNames[index]"
                  type="text"
                  :placeholder="`Middle Name ${index + 1}`"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
                />
                <button
                  type="button"
                  @click="removeMiddleName(index)"
                  class="p-2 text-red-600 hover:text-red-800"
                  title="Remove middle name"
                >
                  <Minus class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UiInput v-model="personForm.dateOfBirth" label="Date of Birth" type="date" />
            <UiInput v-model="personForm.ssnLast4" label="SSN Last 4" maxlength="4" />
          </div>
        </div>

        <!-- Entity Fields -->
        <div v-if="personForm.mode === 'entity'" class="space-y-4">
          <UiInput v-model="personForm.entityName" label="Entity Name" required />
          <div class="grid grid-cols-2 gap-4">
            <UiSelect v-model="personForm.entityType" label="Entity Type">
              <option value="">-- Select Type --</option>
              <option value="LLC">LLC</option>
              <option value="Corporation">Corporation</option>
              <option value="Partnership">Partnership</option>
              <option value="Trust">Trust</option>
              <option value="Non-Profit">Non-Profit</option>
              <option value="Other">Other</option>
            </UiSelect>
            <UiInput v-model="personForm.entityEin" label="EIN" />
          </div>
        </div>

        <!-- Contact Information -->
        <div class="border-t pt-4 space-y-4">
          <h4 class="font-semibold text-gray-900">Contact Information</h4>
          <div class="grid grid-cols-2 gap-4">
            <UiInput v-model="personForm.email" label="Email" type="email" />
            <UiInput v-model="personForm.phone" label="Phone" type="tel" />
          </div>
          <UiInput v-model="personForm.address" label="Address" />
          <div class="grid grid-cols-3 gap-4">
            <UiInput v-model="personForm.city" label="City" />
            <UiInput v-model="personForm.state" label="State" maxlength="2" />
            <UiInput v-model="personForm.zipCode" label="ZIP Code" />
          </div>
        </div>

        <!-- Notes -->
        <UiTextarea v-model="personForm.notes" label="Notes (optional)" :rows="3" />

        <!-- Actions -->
        <div class="flex justify-end gap-2 pt-4">
          <UiButton type="button" variant="outline" @click="showEditModal = false">
            Cancel
          </UiButton>
          <UiButton type="submit" :disabled="savingPerson">
            {{ savingPerson ? 'Saving...' : 'Save Changes' }}
          </UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>
