<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ArrowLeft, Edit, Trash2, User, Building2, Landmark, Loader, Mail, Phone, MapPin, Calendar, Lock, Link2, Users, Plus } from 'lucide-vue-next'
import type { AddressValue } from '~/components/ui/AddressInput.vue'
import type { PersonFormData } from '~/components/people/PersonFormFields.vue'

const toast = useToast()
const route = useRoute()
const router = useRouter()

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

const personId = route.params.id as string

interface PersonDetail {
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
  maritalStatus?: string
  tinLast4?: string
  tinMasked?: string
  notes?: string
  importMetadata?: string
  createdAt: number
  updatedAt: number
  linkedClient: { id: string, status: string } | null
  linkedUser: { id: string, role: string, status: string } | null
  trustProfile: any | null
  entityProfile: any | null
  relationships: Relationship[]
}

interface Relationship {
  id: string
  relationshipType: string
  context: string | null
  contextId: string | null
  ordinal: number
  notes: string | null
  otherPersonId: string
  otherPersonName: string
  direction: 'outgoing' | 'incoming'
}

const person = ref<PersonDetail | null>(null)
const loading = ref(true)
const showEditModal = ref(false)
const savingPerson = ref(false)

// Add relationship modal state
const showAddRelationshipModal = ref(false)

// Remove relationship dialog state
const showDeletePersonDialog = ref(false)
const showRemoveRelationshipDialog = ref(false)
const removingRelationshipId = ref<string | null>(null)
const removingRelationship = ref<Relationship | null>(null)
const removingRelationshipConfirm = ref(false)

// Inline notes editing
const editingNotes = ref(false)
const notesEditValue = ref('')
const savingNotes = ref(false)

// ---------------------------------------------------------------------------
// Shared form state (reuses PersonFormFields component)
// ---------------------------------------------------------------------------
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
  address: '', address2: '', city: '', state: '', zipCode: '', country: ''
})

// Middle name helpers
function enableMultipleMiddleNames() {
  personForm.middleNames = personForm.middleName.trim()
    ? [personForm.middleName.trim()]
    : ['']
  personForm.useMultipleMiddleNames = true
}
function addMiddleName() { personForm.middleNames.push('') }
function updateMiddleName(index: number, value: string) { personForm.middleNames[index] = value }
function removeMiddleName(index: number) {
  personForm.middleNames.splice(index, 1)
  if (personForm.middleNames.length <= 1) {
    personForm.middleName = personForm.middleNames[0] || ''
    personForm.middleNames = []
    personForm.useMultipleMiddleNames = false
  }
}
function handleFieldUpdate(field: string, value: any) { (personForm as any)[field] = value }

// ---------------------------------------------------------------------------
// Build API payload from form state (same logic as people/index.vue)
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
  if (personForm.tin) shared.tin = personForm.tin

  if (personForm.mode === 'person') {
    return {
      ...shared,
      firstName: personForm.firstName,
      lastName: personForm.lastName,
      middleNames: personForm.useMultipleMiddleNames
        ? personForm.middleNames.filter(n => n.trim())
        : personForm.middleName.trim() ? [personForm.middleName.trim()] : [],
      dateOfBirth: personForm.dateOfBirth ? new Date(personForm.dateOfBirth).getTime() : undefined
    }
  }
  if (personForm.mode === 'trust') {
    return {
      ...shared,
      fullName: personForm.fullName,
      trustType: personForm.trustType || undefined,
      isRevocable: personForm.isRevocable,
      isJoint: personForm.isJoint,
      jurisdiction: personForm.jurisdiction || undefined,
      formationDate: personForm.formationDate || undefined
    }
  }
  return {
    ...shared,
    fullName: personForm.fullName,
    entityType: personForm.entityType || undefined,
    jurisdiction: personForm.jurisdiction || undefined,
    formationDate: personForm.formationDate || undefined,
    stateFileNumber: personForm.stateFileNumber || undefined,
    managementType: personForm.managementType || undefined
  }
}

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------
const formattedAddress = computed(() => {
  if (!person.value) return null
  const p = person.value
  const parts: string[] = []
  if (p.address) parts.push(p.address)
  if (p.address2) parts.push(p.address2)
  const cityStateZip = [p.city, p.state].filter(Boolean).join(', ')
  if (cityStateZip || p.zipCode) parts.push([cityStateZip, p.zipCode].filter(Boolean).join(' '))
  if (p.country && p.country !== 'US') parts.push(p.country)
  return parts.length > 0 ? parts : null
})

const personTypeIcon = computed(() =>
  person.value?.personType === 'trust' ? Landmark
    : person.value?.personType === 'entity' ? Building2
      : User
)

const personTypeBadge = computed(() => {
  if (person.value?.personType === 'trust') return { label: 'Trust', variant: 'info' as const }
  if (person.value?.personType === 'entity') return { label: 'Entity', variant: 'info' as const }
  return { label: 'Individual', variant: 'success' as const }
})

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
async function fetchPerson() {
  loading.value = true
  try {
    person.value = await $fetch<PersonDetail>(`/api/people/${personId}`)
  }
  catch (error: any) {
    console.error('Error fetching person:', error)
    if (error?.statusCode === 404) {
      toast.error('Person not found')
      router.push('/people')
    }
  }
  finally {
    loading.value = false
  }
}

function formatDate(timestamp?: number) {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// For calendar dates (DOB) — always render in UTC so the stored date is never shifted by the local timezone
function formatDateOnly(timestamp?: number) {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function formatRelationshipType(type: string): string {
  const typeMap: Record<string, string> = {
    SPOUSE: 'Spouse', EX_SPOUSE: 'Ex-Spouse', PARTNER: 'Partner',
    CHILD: 'Child', STEPCHILD: 'Stepchild', GRANDCHILD: 'Grandchild',
    PARENT: 'Parent', SIBLING: 'Sibling',
    FINANCIAL_ADVISOR: 'Financial Advisor', ACCOUNTANT: 'Accountant',
    INSURANCE_AGENT: 'Insurance Agent', ATTORNEY: 'Attorney',
    BUSINESS_PARTNER: 'Business Partner', BUSINESS_ASSOCIATE: 'Business Associate',
    TRUSTEE: 'Trustee', CO_TRUSTEE: 'Co-Trustee', SUCCESSOR_TRUSTEE: 'Successor Trustee',
    BENEFICIARY: 'Beneficiary', EXECUTOR: 'Executor', AGENT: 'Agent',
    GUARDIAN: 'Guardian', POWER_OF_ATTORNEY: 'Power of Attorney', HEALTHCARE_PROXY: 'Healthcare Proxy'
  }
  return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatContext(context: string | null): string {
  if (!context) return 'General'
  return context.charAt(0).toUpperCase() + context.slice(1)
}

// Notes editing
function startEditNotes() {
  notesEditValue.value = person.value?.notes || ''
  editingNotes.value = true
}
function cancelEditNotes() {
  editingNotes.value = false
  notesEditValue.value = ''
}
async function saveNotes() {
  savingNotes.value = true
  try {
    await $fetch(`/api/people/${personId}`, {
      method: 'PUT',
      body: { notes: notesEditValue.value || undefined }
    })
    if (person.value) person.value.notes = notesEditValue.value
    editingNotes.value = false
    toast.success('Notes updated')
  }
  catch { toast.error('Failed to save notes') }
  finally { savingNotes.value = false }
}

// Open edit modal — populate form from current person data
function openEditModal() {
  if (!person.value) return
  const p = person.value
  Object.assign(personForm, emptyForm())

  // Set mode from personType
  personForm.mode = p.personType === 'trust' ? 'trust'
    : p.personType === 'entity' ? 'entity'
      : 'person'

  if (personForm.mode === 'person') {
    personForm.firstName = p.firstName || ''
    personForm.lastName = p.lastName || ''
    const middleNames = p.middleNames || []
    if (middleNames.length > 1) {
      personForm.useMultipleMiddleNames = true
      personForm.middleNames = [...middleNames]
    }
    else {
      personForm.middleName = middleNames[0] || ''
    }
    personForm.dateOfBirth = p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : ''
  }
  else {
    personForm.fullName = p.fullName || ''
  }

  // Trust-specific fields from profile
  if (personForm.mode === 'trust' && p.trustProfile) {
    personForm.trustType = p.trustProfile.trustType || ''
    personForm.isRevocable = p.trustProfile.isRevocable ?? true
    personForm.isJoint = p.trustProfile.isJoint ?? false
    personForm.jurisdiction = p.trustProfile.jurisdiction || ''
    personForm.formationDate = p.trustProfile.formationDate
      ? new Date(p.trustProfile.formationDate).toISOString().split('T')[0]
      : ''
  }

  // Entity-specific fields from profile
  if (personForm.mode === 'entity' && p.entityProfile) {
    personForm.entityType = p.entityProfile.entityType || ''
    personForm.jurisdiction = p.entityProfile.jurisdiction || ''
    personForm.formationDate = p.entityProfile.formationDate
      ? new Date(p.entityProfile.formationDate).toISOString().split('T')[0]
      : ''
    personForm.stateFileNumber = p.entityProfile.stateFileNumber || ''
    personForm.managementType = p.entityProfile.managementType || ''
  }

  // Shared fields
  personForm.email = p.email || ''
  personForm.phone = p.phone || ''
  personForm.notes = p.notes || ''

  addressValue.value = {
    address: p.address || '', address2: p.address2 || '',
    city: p.city || '', state: p.state || '',
    zipCode: p.zipCode || '', country: p.country || ''
  }

  showEditModal.value = true
}

async function savePerson() {
  savingPerson.value = true
  try {
    await $fetch(`/api/people/${personId}`, { method: 'PUT', body: buildPayload() })
    showEditModal.value = false
    await fetchPerson()
    toast.success('Person updated')
  }
  catch (error: any) {
    toast.error(error?.data?.message || 'Failed to update person')
  }
  finally { savingPerson.value = false }
}

async function deletePerson() {
  if (!person.value) return
  try {
    await $fetch(`/api/people/${personId}`, { method: 'DELETE' })
    showDeletePersonDialog.value = false
    toast.success('Person deleted')
    router.push('/people')
  }
  catch (error: any) {
    toast.error(error.data?.message || 'Failed to delete person')
  }
}

// Called by AddRelationshipModal component
async function addRelationship(data: {
  personId: string
  relationshipType: string
  ordinal: number
  notes: string
}) {
  await $fetch(`/api/people/${personId}/relationships`, {
    method: 'POST',
    body: {
      toPersonId: data.personId,
      relationshipType: data.relationshipType,
      ordinal: data.ordinal || 0,
      notes: data.notes || undefined
    }
  })
}

function removeRelationship(rel: Relationship) {
  removingRelationshipId.value = rel.id
  removingRelationship.value = rel
  showRemoveRelationshipDialog.value = true
}

async function confirmRemoveRelationship() {
  if (!removingRelationshipId.value) return
  removingRelationshipConfirm.value = true
  try {
    await $fetch(`/api/people/${personId}/relationships/${removingRelationshipId.value}`, { method: 'DELETE' })
    showRemoveRelationshipDialog.value = false
    toast.success('Relationship removed')
    await fetchPerson()
  }
  catch (error: any) {
    toast.error(error?.data?.message || 'Failed to remove relationship')
  }
  finally {
    removingRelationshipConfirm.value = false
    removingRelationshipId.value = null
    removingRelationship.value = null
  }
}

onMounted(() => fetchPerson())
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm -mx-8 px-8 pb-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <NuxtLink
            to="/people"
            class="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft class="w-5 h-5" />
          </NuxtLink>
          <div v-if="person">
            <h1 class="text-2xl font-bold text-gray-900">
              {{ person.fullName }}
            </h1>
            <p
              v-if="person.email"
              class="text-gray-600 mt-1"
            >
              {{ person.email }}
            </p>
          </div>
        </div>
        <div
          v-if="person"
          class="flex items-center space-x-3"
        >
          <UiBadge :variant="personTypeBadge.variant">
            {{ personTypeBadge.label }}
          </UiBadge>
          <UiButton
            variant="outline"
            size="sm"
            @click="openEditModal"
          >
            <Edit class="w-4 h-4 mr-1" />
            Edit
          </UiButton>
          <UiButton
            variant="danger"
            size="sm"
            @click="showDeletePersonDialog = true"
          >
            <Trash2 class="w-4 h-4 mr-1" />
            Delete
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="flex justify-center py-12"
    >
      <Loader class="w-8 h-8 animate-spin text-burgundy-600" />
    </div>

    <!-- Person Details -->
    <div
      v-else-if="person"
      class="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      <!-- Left Column -->
      <div class="lg:col-span-1 space-y-6">
        <!-- Contact Info Card -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            {{ person.personType === 'individual' ? 'Contact Information' : 'Details' }}
          </h3>
          <div class="space-y-3 text-sm">
            <div
              v-if="person.email"
              class="flex items-start"
            >
              <Mail class="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <span class="text-gray-600">Email</span>
                <div class="font-medium">
                  {{ person.email }}
                </div>
              </div>
            </div>
            <div
              v-if="person.phone"
              class="flex items-start"
            >
              <Phone class="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <span class="text-gray-600">Phone</span>
                <div class="font-medium">
                  {{ person.phone }}
                </div>
              </div>
            </div>
            <div
              v-if="formattedAddress"
              class="flex items-start"
            >
              <MapPin class="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <span class="text-gray-600">Address</span>
                <div class="font-medium">
                  <div
                    v-for="(line, i) in formattedAddress"
                    :key="i"
                  >
                    {{ line }}
                  </div>
                </div>
              </div>
            </div>
            <div
              v-if="person.dateOfBirth"
              class="flex items-start"
            >
              <Calendar class="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <span class="text-gray-600">Date of Birth</span>
                <div class="font-medium">
                  {{ formatDateOnly(person.dateOfBirth) }}
                </div>
              </div>
            </div>
            <!-- TIN (uses sensitive field component) -->
            <div
              v-if="person.tinLast4"
              class="flex items-start"
            >
              <Lock class="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <span class="text-gray-600">{{ person.personType === 'individual' ? 'SSN' : 'EIN' }}</span>
                <div class="font-medium">
                  <UiSensitiveField
                    :person-id="person.id"
                    field="tin"
                    :last4="person.tinLast4"
                    :masked="person.tinMasked"
                    :label="person.personType === 'individual' ? 'SSN' : 'EIN'"
                  />
                </div>
              </div>
            </div>

            <!-- Trust-specific info -->
            <template v-if="person.trustProfile">
              <div
                v-if="person.trustProfile.trustType"
                class="flex items-start"
              >
                <Landmark class="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <span class="text-gray-600">Trust Type</span>
                  <div class="font-medium">
                    {{ person.trustProfile.trustType.replace(/_/g, ' ') }}
                    <span v-if="person.trustProfile.isRevocable !== null" class="text-xs text-gray-500 ml-1">
                      ({{ person.trustProfile.isRevocable ? 'Revocable' : 'Irrevocable' }}{{ person.trustProfile.isJoint ? ', Joint' : '' }})
                    </span>
                  </div>
                </div>
              </div>
              <div
                v-if="person.trustProfile.jurisdiction"
                class="flex items-start"
              >
                <MapPin class="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <span class="text-gray-600">Jurisdiction</span>
                  <div class="font-medium">
                    {{ person.trustProfile.jurisdiction }}
                  </div>
                </div>
              </div>
            </template>

            <!-- Entity-specific info -->
            <template v-if="person.entityProfile">
              <div
                v-if="person.entityProfile.entityType"
                class="flex items-start"
              >
                <Building2 class="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <span class="text-gray-600">Entity Type</span>
                  <div class="font-medium">
                    {{ person.entityProfile.entityType.replace(/_/g, ' ') }}
                  </div>
                </div>
              </div>
              <div
                v-if="person.entityProfile.jurisdiction"
                class="flex items-start"
              >
                <MapPin class="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <span class="text-gray-600">Jurisdiction</span>
                  <div class="font-medium">
                    {{ person.entityProfile.jurisdiction }}
                  </div>
                </div>
              </div>
              <div
                v-if="person.entityProfile.stateFileNumber"
                class="flex items-start"
              >
                <Lock class="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <span class="text-gray-600">State Filing #</span>
                  <div class="font-medium">
                    {{ person.entityProfile.stateFileNumber }}
                  </div>
                </div>
              </div>
            </template>

            <div
              v-if="!person.email && !person.phone && !formattedAddress && !person.dateOfBirth && !person.tinLast4"
              class="text-gray-500"
            >
              No contact information on file
            </div>
          </div>
        </div>

        <!-- Linked Records Card -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Link2 class="w-5 h-5 mr-2" />
            Linked Records
          </h3>
          <div class="space-y-3 text-sm">
            <div>
              <span class="text-gray-600">Client Record</span>
              <div
                v-if="person.linkedClient"
                class="mt-1"
              >
                <NuxtLink
                  :to="`/clients/${person.linkedClient.id}`"
                  class="text-burgundy-600 hover:text-burgundy-800 font-medium hover:underline"
                >
                  View Client Profile
                </NuxtLink>
                <UiBadge
                  :variant="person.linkedClient.status === 'ACTIVE' ? 'success' : 'default'"
                  class="ml-2"
                >
                  {{ person.linkedClient.status }}
                </UiBadge>
              </div>
              <div
                v-else
                class="mt-1 text-gray-400"
              >
                None
              </div>
            </div>
            <div>
              <span class="text-gray-600">User Account</span>
              <div
                v-if="person.linkedUser"
                class="mt-1"
              >
                <UiBadge :variant="person.linkedUser.role === 'ADMIN' ? 'danger' : person.linkedUser.role === 'LAWYER' ? 'info' : 'default'">
                  {{ person.linkedUser.role }}
                </UiBadge>
                <span
                  v-if="person.linkedUser.status === 'INACTIVE'"
                  class="ml-2 text-xs text-gray-500"
                >(Inactive)</span>
              </div>
              <div
                v-else
                class="mt-1 text-gray-400"
              >
                None
              </div>
            </div>
          </div>
        </div>

        <!-- Meta Card -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h3 class="text-sm font-medium text-gray-500 mb-3">
            Record Info
          </h3>
          <div class="space-y-2 text-sm text-gray-600">
            <div class="flex justify-between">
              <span>Created</span>
              <span>{{ formatDate(person.createdAt) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Updated</span>
              <span>{{ formatDate(person.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Notes Card -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">
              Notes
            </h3>
            <button
              v-if="!editingNotes"
              class="text-sm text-burgundy-600 hover:text-burgundy-800"
              @click="startEditNotes"
            >
              {{ person.notes ? 'Edit' : 'Add Notes' }}
            </button>
          </div>
          <div v-if="editingNotes">
            <textarea
              v-model="notesEditValue"
              rows="6"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500 resize-none"
              placeholder="Add notes about this person..."
            />
            <div class="flex justify-end gap-2 mt-2">
              <UiButton
                variant="outline"
                size="sm"
                @click="cancelEditNotes"
              >
                Cancel
              </UiButton>
              <UiButton
                size="sm"
                :disabled="savingNotes"
                @click="saveNotes"
              >
                {{ savingNotes ? 'Saving...' : 'Save' }}
              </UiButton>
            </div>
          </div>
          <div v-else>
            <p
              v-if="person.notes"
              class="text-sm text-gray-700 whitespace-pre-wrap"
            >
              {{ person.notes }}
            </p>
            <p
              v-else
              class="text-sm text-gray-400"
            >
              No notes yet
            </p>
          </div>
        </div>

        <!-- Relationships Card -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 flex items-center">
              <Users class="w-5 h-5 mr-2" />
              Relationships
            </h3>
            <UiButton
              size="sm"
              variant="outline"
              @click="showAddRelationshipModal = true"
            >
              <Plus class="w-4 h-4 mr-1" />
              Add
            </UiButton>
          </div>
          <div
            v-if="person.relationships.length === 0"
            class="text-center py-8 text-gray-500 text-sm"
          >
            No relationships found
          </div>
          <table
            v-else
            class="w-full"
          >
            <thead class="border-b border-gray-200">
              <tr>
                <th class="pb-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Person
                </th>
                <th class="pb-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Relationship
                </th>
                <th class="pb-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Context
                </th>
                <th class="pb-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Notes
                </th>
                <th class="pb-2" />
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="rel in person.relationships"
                :key="rel.id"
                class="hover:bg-gray-50"
              >
                <td class="py-3 pr-4">
                  <NuxtLink
                    :to="`/people/${rel.otherPersonId}`"
                    class="text-burgundy-600 hover:text-burgundy-800 font-medium hover:underline"
                  >
                    {{ rel.otherPersonName }}
                  </NuxtLink>
                </td>
                <td class="py-3 pr-4">
                  <span class="text-sm text-gray-900">{{ formatRelationshipType(rel.relationshipType) }}</span>
                  <span
                    v-if="rel.ordinal > 0"
                    class="text-xs text-gray-500 ml-1"
                  >(#{{ rel.ordinal }})</span>
                </td>
                <td class="py-3 pr-4">
                  <span class="text-sm text-gray-600">{{ formatContext(rel.context) }}</span>
                </td>
                <td class="py-3 pr-4">
                  <span
                    v-if="rel.notes"
                    class="text-sm text-gray-600"
                  >{{ rel.notes }}</span>
                  <span
                    v-else
                    class="text-sm text-gray-400"
                  >-</span>
                </td>
                <td class="py-3 text-right">
                  <button
                    class="text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove relationship"
                    @click="removeRelationship(rel)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add Relationship Modal -->
    <RelationshipsAddRelationshipModal
      v-model="showAddRelationshipModal"
      :subject-name="person?.fullName || ''"
      :exclude-person-id="personId"
      :show-fiduciary="true"
      :on-save="addRelationship"
      @saved="fetchPerson"
    />

    <!-- Remove Relationship Confirm Dialog -->
    <UiConfirmDialog
      v-model="showRemoveRelationshipDialog"
      title="Remove Relationship"
      :message="removingRelationship ? `Remove ${formatRelationshipType(removingRelationship.relationshipType)} relationship with ${removingRelationship.otherPersonName}?` : 'Remove this relationship?'"
      confirm-text="Remove"
      variant="danger"
      :loading="removingRelationshipConfirm"
      @confirm="confirmRemoveRelationship"
      @cancel="showRemoveRelationshipDialog = false"
    />

    <!-- Edit Person Modal (uses shared component) -->
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
    :message="person ? `Are you sure you want to delete ${person.fullName}? This will also remove all relationships.` : 'Are you sure?'"
    confirm-text="Delete"
    variant="danger"
    @confirm="deletePerson"
    @cancel="showDeletePersonDialog = false"
  />
</template>
