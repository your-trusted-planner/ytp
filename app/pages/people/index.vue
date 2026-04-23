<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">
          People
        </h1>
        <p class="text-sm text-gray-600 mt-1">
          Manage individuals, trusts, and entities
        </p>
      </div>
      <UiButton @click="openAddModal">
        <Plus class="w-4 h-4 mr-2" />
        Add Person
      </UiButton>
    </div>

    <!-- Search + Filters -->
    <div class="space-y-3">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name, email, phone..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
          @input="handleSearchInput"
        >
      </div>

      <!-- Person type pill filters -->
      <div class="flex items-center gap-3">
        <button
          v-for="filter in typeFilters"
          :key="filter.value ?? 'all'"
          class="px-3 py-1 text-sm rounded-full transition-colors"
          :class="activeTypeFilter === filter.value
            ? 'bg-burgundy-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          @click="setTypeFilter(filter.value)"
        >
          {{ filter.label }}
        </button>
        <span
          v-if="!loading && pagination"
          class="text-sm text-gray-500"
        >
          {{ pagination.totalCount }} {{ activeTypeFilter ? filterLabel : 'people' }}
        </span>
      </div>
    </div>

    <!-- People Table -->
    <UiCard>
      <UiLoadingState
        v-if="loading"
        message="Loading people..."
      />

      <div
        v-else-if="people.length === 0"
        class="p-8 text-center"
      >
        <Users class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900">
          {{ activeTypeFilter ? 'No matches' : 'No people found' }}
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ activeTypeFilter
            ? `No ${activeTypeFilter === 'trust' ? 'trusts' : activeTypeFilter === 'entity' ? 'entities' : 'individuals'} match your search.`
            : 'Get started by adding your first person.'
          }}
        </p>
        <UiButton
          v-if="!activeTypeFilter"
          variant="outline"
          size="sm"
          class="mt-4"
          @click="openAddModal"
        >
          <Plus class="w-4 h-4 mr-2" />
          Add Person
        </UiButton>
      </div>

      <template v-else>
        <table class="w-full">
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
            <tr
              v-for="person in people"
              :key="person.id"
              class="hover:bg-gray-50 cursor-pointer"
              @click="$router.push(`/people/${person.id}`)"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <component
                    :is="personTypeIcon(person)"
                    class="w-5 h-5 text-gray-400 mr-2"
                  />
                  <div class="font-medium text-gray-900">
                    {{ person.fullName }}
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <UiBadge :variant="personTypeBadgeVariant(person)">
                  {{ personTypeBadgeLabel(person) }}
                </UiBadge>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900">
                  {{ person.email || '-' }}
                </div>
                <div class="text-sm text-gray-500">
                  {{ person.phone || '-' }}
                </div>
              </td>
              <td class="px-6 py-4">
                <div
                  v-if="person.city || person.state"
                  class="text-sm text-gray-900"
                >
                  {{ person.city }}{{ person.city && person.state ? ', ' : '' }}{{ person.state }}{{ person.country && person.country !== 'US' ? ` ${person.country}` : '' }}
                </div>
                <div
                  v-else
                  class="text-sm text-gray-500"
                >
                  -
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(person.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  class="text-burgundy-600 hover:text-burgundy-900 mr-3"
                  @click.stop="openEditModal(person)"
                >
                  <Edit class="w-4 h-4" />
                </button>
                <button
                  class="text-red-600 hover:text-red-900"
                  @click.stop="promptDeletePerson(person)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination Controls -->
        <div
          v-if="pagination"
          class="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between"
        >
          <div class="text-sm text-gray-700">
            Showing {{ paginationStartItem }}-{{ paginationEndItem }} of {{ pagination.totalCount }}
          </div>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <label
                for="page-size"
                class="text-sm text-gray-700"
              >Per page:</label>
              <select
                id="page-size"
                :value="currentLimit"
                class="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
                @change="setPageSize(Number(($event.target as HTMLSelectElement).value))"
              >
                <option
                  v-for="size in pageSizeOptions"
                  :key="size"
                  :value="size"
                >
                  {{ size }}
                </option>
              </select>
            </div>
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
      </template>
    </UiCard>

    <!-- Add Modal -->
    <UiModal
      v-model="showAddModal"
      title="Add Person"
      size="lg"
    >
      <form
        class="space-y-4"
        @submit.prevent="savePerson"
      >
        <PeoplePersonFormFields
          :form="personForm"
          :address-value="addressValue"
          @update:field="handleFieldUpdate"
          @update:mode="personForm.mode = $event"
          @update:address="addressValue = $event"
          @enable-multiple-middle-names="enableMultipleMiddleNames"
          @add-middle-name="addMiddleName"
          @update-middle-name="updateMiddleName"
          @remove-middle-name="removeMiddleName"
        />
        <div class="flex justify-end gap-2 pt-4">
          <UiButton
            type="button"
            variant="outline"
            @click="showAddModal = false"
          >
            Cancel
          </UiButton>
          <UiButton
            type="submit"
            :disabled="savingPerson"
          >
            {{ savingPerson ? 'Adding...' : 'Add Person' }}
          </UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Edit Modal -->
    <UiModal
      v-model="showEditModal"
      title="Edit Person"
      size="lg"
    >
      <form
        class="space-y-4"
        @submit.prevent="savePerson"
      >
        <PeoplePersonFormFields
          :form="personForm"
          :address-value="addressValue"
          is-edit
          @update:field="handleFieldUpdate"
          @update:mode="personForm.mode = $event"
          @update:address="addressValue = $event"
          @enable-multiple-middle-names="enableMultipleMiddleNames"
          @add-middle-name="addMiddleName"
          @update-middle-name="updateMiddleName"
          @remove-middle-name="removeMiddleName"
        />
        <div class="flex justify-end gap-2 pt-4">
          <UiButton
            type="button"
            variant="outline"
            @click="showEditModal = false"
          >
            Cancel
          </UiButton>
          <UiButton
            type="submit"
            :disabled="savingPerson"
          >
            {{ savingPerson ? 'Saving...' : 'Save Changes' }}
          </UiButton>
        </div>
      </form>
    </UiModal>
  </div>

  <UiConfirmDialog
    v-model="showDeletePersonDialog"
    title="Delete Person"
    :message="deletePersonMessage"
    confirm-text="Delete"
    variant="danger"
    @confirm="confirmDeletePerson"
    @cancel="showDeletePersonDialog = false"
  />
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, User, Building2, Landmark, Users } from 'lucide-vue-next'
import type { AddressValue } from '~/components/ui/AddressInput.vue'
import type { PersonFormData } from '~/components/people/PersonFormFields.vue'

const toast = useToast()

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

interface Person {
  id: string
  personType: 'individual' | 'trust' | 'entity'
  firstName?: string
  lastName?: string
  middleNames?: string[]
  fullName: string
  email?: string
  phone?: string
  address?: string
  address2?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  dateOfBirth?: number
  tinLast4?: string
  tinMasked?: string
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
const activeTypeFilter = ref<string | null>(null)
const showAddModal = ref(false)
const showEditModal = ref(false)
const editingPerson = ref<Person | null>(null)
const savingPerson = ref(false)
const showDeletePersonDialog = ref(false)
const deletingPerson = ref<Person | null>(null)
const deletePersonMessage = ref('')

// Pagination state
const pagination = ref<PaginationMeta | null>(null)
const currentPage = ref(1)
const currentLimit = ref(25)
const pageSizeOptions = [10, 25, 50, 100]

// Type filter options
const typeFilters = [
  { label: 'All', value: null },
  { label: 'Individuals', value: 'individual' },
  { label: 'Trusts', value: 'trust' },
  { label: 'Entities', value: 'entity' }
]

// Shared form state used by both add and edit modals
const emptyForm = (): PersonFormData => ({
  mode: 'person',
  firstName: '',
  lastName: '',
  middleName: '',
  middleNames: [],
  useMultipleMiddleNames: false,
  dateOfBirth: '',
  fullName: '',
  tin: '',
  trustType: '',
  isRevocable: true,
  isJoint: false,
  entityType: '',
  stateFileNumber: '',
  managementType: '',
  jurisdiction: '',
  formationDate: '',
  email: '',
  phone: '',
  notes: ''
})

const personForm = reactive<PersonFormData>(emptyForm())

const addressValue = ref<AddressValue>({
  address: '',
  address2: '',
  city: '',
  state: '',
  zipCode: '',
  country: ''
})

// Sync address component → form fields
watch(addressValue, () => {
  // addressValue is managed by UiAddressInput — no sync needed here
}, { deep: true })

// ---------------------------------------------------------------------------
// Middle name helpers
// ---------------------------------------------------------------------------
function enableMultipleMiddleNames() {
  if (personForm.middleName.trim()) {
    personForm.middleNames = [personForm.middleName.trim()]
  }
  else {
    personForm.middleNames = ['']
  }
  personForm.useMultipleMiddleNames = true
}

function addMiddleName() {
  personForm.middleNames.push('')
}

function updateMiddleName(index: number, value: string) {
  personForm.middleNames[index] = value
}

function removeMiddleName(index: number) {
  personForm.middleNames.splice(index, 1)
  if (personForm.middleNames.length <= 1) {
    personForm.middleName = personForm.middleNames[0] || ''
    personForm.middleNames = []
    personForm.useMultipleMiddleNames = false
  }
}

// ---------------------------------------------------------------------------
// Form field update handler (from PersonFormFields component)
// ---------------------------------------------------------------------------
function handleFieldUpdate(field: string, value: any) {
  ;(personForm as any)[field] = value
}

// ---------------------------------------------------------------------------
// Build the API payload from form state
// ---------------------------------------------------------------------------
function buildPayload(): Record<string, any> {
  const shared: Record<string, any> = {
    email: personForm.email || undefined,
    phone: personForm.phone || undefined,
    address: addressValue.value.address || undefined,
    address2: addressValue.value.address2 || undefined,
    city: addressValue.value.city || undefined,
    state: addressValue.value.state || undefined,
    zipCode: addressValue.value.zipCode || undefined,
    country: addressValue.value.country || undefined,
    notes: personForm.notes || undefined
  }

  if (personForm.tin) {
    shared.tin = personForm.tin
  }

  if (personForm.mode === 'person') {
    return {
      ...shared,
      personType: 'individual',
      firstName: personForm.firstName,
      lastName: personForm.lastName,
      middleNames: personForm.useMultipleMiddleNames
        ? personForm.middleNames.filter(n => n.trim())
        : personForm.middleName.trim() ? [personForm.middleName.trim()] : [],
      dateOfBirth: personForm.dateOfBirth
        ? new Date(personForm.dateOfBirth).getTime()
        : undefined
    }
  }

  if (personForm.mode === 'trust') {
    return {
      ...shared,
      personType: 'trust',
      fullName: personForm.fullName,
      trustType: personForm.trustType || undefined,
      isRevocable: personForm.isRevocable,
      isJoint: personForm.isJoint,
      jurisdiction: personForm.jurisdiction || undefined,
      formationDate: personForm.formationDate || undefined
    }
  }

  // entity
  return {
    ...shared,
    personType: 'entity',
    fullName: personForm.fullName,
    entityType: personForm.entityType || undefined,
    jurisdiction: personForm.jurisdiction || undefined,
    formationDate: personForm.formationDate || undefined,
    stateFileNumber: personForm.stateFileNumber || undefined,
    managementType: personForm.managementType || undefined
  }
}

// ---------------------------------------------------------------------------
// Reset / populate form
// ---------------------------------------------------------------------------
function resetForm() {
  Object.assign(personForm, emptyForm())
  addressValue.value = { address: '', address2: '', city: '', state: '', zipCode: '', country: '' }
}

function populateFormFromPerson(person: Person) {
  resetForm()

  if (person.personType === 'trust') {
    personForm.mode = 'trust'
    personForm.fullName = person.fullName || ''
  }
  else if (person.personType === 'entity') {
    personForm.mode = 'entity'
    personForm.fullName = person.fullName || ''
  }
  else {
    personForm.mode = 'person'
    personForm.firstName = person.firstName || ''
    personForm.lastName = person.lastName || ''
    const middleNames = person.middleNames || []
    if (middleNames.length > 1) {
      personForm.useMultipleMiddleNames = true
      personForm.middleNames = [...middleNames]
    }
    else {
      personForm.middleName = middleNames[0] || ''
    }
    personForm.dateOfBirth = person.dateOfBirth
      ? new Date(person.dateOfBirth).toISOString().split('T')[0]
      : ''
  }

  personForm.email = person.email || ''
  personForm.phone = person.phone || ''
  personForm.notes = person.notes || ''

  addressValue.value = {
    address: person.address || '',
    address2: person.address2 || '',
    city: person.city || '',
    state: person.state || '',
    zipCode: person.zipCode || '',
    country: person.country || ''
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
let searchTimeout: ReturnType<typeof setTimeout> | null = null

async function fetchPeople() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      search: searchQuery.value,
      page: currentPage.value,
      limit: currentLimit.value
    }
    if (activeTypeFilter.value) {
      params.personType = activeTypeFilter.value
    }

    const data = await $fetch<{ people: Person[], pagination?: PaginationMeta }>('/api/people', { params })
    people.value = data.people || []
    pagination.value = data.pagination || null
  }
  catch (error) {
    console.error('Error fetching people:', error)
  }
  finally {
    loading.value = false
  }
}

function handleSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchPeople()
  }, 300)
}

function setTypeFilter(value: string | null) {
  activeTypeFilter.value = value
  currentPage.value = 1
  fetchPeople()
}

function goToPage(page: number) {
  if (pagination.value) {
    page = Math.max(1, Math.min(page, pagination.value.totalPages))
  }
  currentPage.value = page
  fetchPeople()
}

function setPageSize(limit: number) {
  currentLimit.value = limit
  currentPage.value = 1
  fetchPeople()
}

const paginationStartItem = computed(() =>
  pagination.value ? (pagination.value.page - 1) * pagination.value.limit + 1 : 0
)
const paginationEndItem = computed(() =>
  pagination.value ? Math.min(pagination.value.page * pagination.value.limit, pagination.value.totalCount) : 0
)

function openAddModal() {
  resetForm()
  showAddModal.value = true
}

function openEditModal(person: Person) {
  editingPerson.value = person
  populateFormFromPerson(person)
  showEditModal.value = true
}

async function savePerson() {
  savingPerson.value = true
  try {
    const payload = buildPayload()
    const isEdit = !!editingPerson.value

    if (isEdit) {
      await $fetch(`/api/people/${editingPerson.value!.id}`, { method: 'PUT', body: payload })
    }
    else {
      await $fetch('/api/people', { method: 'POST', body: payload })
    }

    showAddModal.value = false
    showEditModal.value = false
    editingPerson.value = null
    resetForm()
    await fetchPeople()
  }
  catch (error: any) {
    console.error('Error saving person:', error)
    toast.error(error?.data?.message || 'Failed to save person')
  }
  finally {
    savingPerson.value = false
  }
}

function promptDeletePerson(person: Person) {
  deletingPerson.value = person
  deletePersonMessage.value = `Are you sure you want to delete ${person.fullName}? This will also remove all relationships with this person.`
  showDeletePersonDialog.value = true
}

async function confirmDeletePerson() {
  if (!deletingPerson.value) return
  const person = deletingPerson.value
  try {
    await $fetch(`/api/people/${person.id}`, { method: 'DELETE' })
    showDeletePersonDialog.value = false
    deletingPerson.value = null
    await fetchPeople()
  }
  catch (error: any) {
    console.error('Error deleting person:', error)
    toast.error(error.data?.message || 'Failed to delete person')
  }
}

function formatDate(timestamp?: number) {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleDateString()
}

const filterLabel = computed(() => {
  if (activeTypeFilter.value === 'trust') return pagination.value?.totalCount === 1 ? 'trust' : 'trusts'
  if (activeTypeFilter.value === 'entity') return pagination.value?.totalCount === 1 ? 'entity' : 'entities'
  if (activeTypeFilter.value === 'individual') return pagination.value?.totalCount === 1 ? 'individual' : 'individuals'
  return 'people'
})

function personTypeIcon(person: Person) {
  return person.personType === 'trust' ? Landmark
    : person.personType === 'entity' ? Building2
      : User
}

function personTypeBadgeVariant(person: Person): 'info' | 'success' | 'warning' | 'default' {
  if (person.personType === 'trust') return 'info'
  if (person.personType === 'entity') return 'info'
  return 'success'
}

function personTypeBadgeLabel(person: Person): string {
  if (person.personType === 'trust') return 'Trust'
  if (person.personType === 'entity') return 'Entity'
  return 'Individual'
}

onMounted(() => {
  fetchPeople()
  const route = useRoute()
  if (route.query.add === 'true') {
    showAddModal.value = true
  }
})
</script>
