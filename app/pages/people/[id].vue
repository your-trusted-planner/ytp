<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ArrowLeft, Edit, Trash2, User, Building2, Plus, Minus, Loader, Mail, Phone, MapPin, Calendar, Lock, Link2, Users } from 'lucide-vue-next'
import type { AddressValue } from '~/components/ui/AddressInput.vue'

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
  personType: string
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
  ssnLast4?: string
  notes?: string
  importMetadata?: string
  createdAt: number
  updatedAt: number
  linkedClient: { id: string; status: string } | null
  linkedUser: { id: string; role: string; status: string } | null
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

// Inline notes editing
const editingNotes = ref(false)
const notesEditValue = ref('')
const savingNotes = ref(false)

const personForm = reactive({
  mode: 'person' as 'person' | 'entity',
  firstName: '',
  lastName: '',
  middleName: '',
  middleNames: [] as string[],
  useMultipleMiddleNames: false,
  email: '',
  phone: '',
  address: '',
  address2: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  dateOfBirth: '',
  ssnLast4: '',
  entityName: '',
  entityType: '',
  entityEin: '',
  notes: ''
})

const addressValue = ref<AddressValue>({
  address: '',
  address2: '',
  city: '',
  state: '',
  zipCode: '',
  country: ''
})

// Sync addressValue with personForm
watch(addressValue, (newVal) => {
  personForm.address = newVal.address
  personForm.address2 = newVal.address2 || ''
  personForm.city = newVal.city
  personForm.state = newVal.state
  personForm.zipCode = newVal.zipCode
  personForm.country = newVal.country || ''
}, { deep: true })

// Middle names management
function enableMultipleMiddleNames() {
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
  if (personForm.middleNames.length <= 1) {
    personForm.middleName = personForm.middleNames[0] || ''
    personForm.middleNames = []
    personForm.useMultipleMiddleNames = false
  }
}

// Computed
const formattedAddress = computed(() => {
  if (!person.value) return null
  const p = person.value
  const parts: string[] = []
  if (p.address) parts.push(p.address)
  if (p.address2) parts.push(p.address2)
  const cityStateZip = [p.city, p.state].filter(Boolean).join(', ')
  if (cityStateZip || p.zipCode) {
    parts.push([cityStateZip, p.zipCode].filter(Boolean).join(' '))
  }
  if (p.country && p.country !== 'US') parts.push(p.country)
  return parts.length > 0 ? parts : null
})

// Fetch person data
async function fetchPerson() {
  loading.value = true
  try {
    const data = await $fetch<PersonDetail>(`/api/people/${personId}`)
    person.value = data
  } catch (error: any) {
    console.error('Error fetching person:', error)
    if (error?.statusCode === 404) {
      toast.error('Person not found')
      router.push('/people')
    }
  } finally {
    loading.value = false
  }
}

// Format date
function formatDate(timestamp?: number) {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Format relationship type
function formatRelationshipType(type: string): string {
  const typeMap: Record<string, string> = {
    SPOUSE: 'Spouse',
    EX_SPOUSE: 'Ex-Spouse',
    PARTNER: 'Partner',
    CHILD: 'Child',
    STEPCHILD: 'Stepchild',
    GRANDCHILD: 'Grandchild',
    PARENT: 'Parent',
    SIBLING: 'Sibling',
    FINANCIAL_ADVISOR: 'Financial Advisor',
    ACCOUNTANT: 'Accountant',
    INSURANCE_AGENT: 'Insurance Agent',
    ATTORNEY: 'Attorney',
    BUSINESS_PARTNER: 'Business Partner',
    BUSINESS_ASSOCIATE: 'Business Associate',
    TRUSTEE: 'Trustee',
    CO_TRUSTEE: 'Co-Trustee',
    SUCCESSOR_TRUSTEE: 'Successor Trustee',
    BENEFICIARY: 'Beneficiary',
    EXECUTOR: 'Executor',
    AGENT: 'Agent',
    GUARDIAN: 'Guardian',
    POWER_OF_ATTORNEY: 'Power of Attorney',
    HEALTHCARE_PROXY: 'Healthcare Proxy'
  }
  return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Format context
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
      body: {
        firstName: person.value?.firstName,
        lastName: person.value?.lastName,
        notes: notesEditValue.value || undefined
      }
    })
    if (person.value) {
      person.value.notes = notesEditValue.value
    }
    editingNotes.value = false
    toast.success('Notes updated')
  } catch (error) {
    console.error('Error saving notes:', error)
    toast.error('Failed to save notes')
  } finally {
    savingNotes.value = false
  }
}

// Open edit modal
function openEditModal() {
  if (!person.value) return
  const p = person.value

  personForm.mode = p.personType === 'entity' ? 'entity' : 'person'

  if (personForm.mode === 'person') {
    personForm.firstName = p.firstName || ''
    personForm.lastName = p.lastName || ''

    const middleNames = p.middleNames || []
    if (middleNames.length > 1) {
      personForm.useMultipleMiddleNames = true
      personForm.middleNames = [...middleNames]
      personForm.middleName = ''
    } else {
      personForm.useMultipleMiddleNames = false
      personForm.middleName = middleNames[0] || ''
      personForm.middleNames = []
    }

    personForm.dateOfBirth = p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : ''
    personForm.ssnLast4 = p.ssnLast4 || ''
  }

  personForm.email = p.email || ''
  personForm.phone = p.phone || ''
  personForm.address = p.address || ''
  personForm.address2 = p.address2 || ''
  personForm.city = p.city || ''
  personForm.state = p.state || ''
  personForm.zipCode = p.zipCode || ''
  personForm.country = p.country || ''
  personForm.notes = p.notes || ''

  addressValue.value = {
    address: p.address || '',
    address2: p.address2 || '',
    city: p.city || '',
    state: p.state || '',
    zipCode: p.zipCode || '',
    country: p.country || ''
  }

  showEditModal.value = true
}

// Save person
async function savePerson() {
  savingPerson.value = true
  try {
    const payload: any = {
      email: personForm.email || undefined,
      phone: personForm.phone || undefined,
      address: personForm.address || undefined,
      address2: personForm.address2 || undefined,
      city: personForm.city || undefined,
      state: personForm.state || undefined,
      zipCode: personForm.zipCode || undefined,
      country: personForm.country || undefined,
      notes: personForm.notes || undefined
    }

    if (personForm.mode === 'person') {
      payload.firstName = personForm.firstName
      payload.lastName = personForm.lastName
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

    await $fetch(`/api/people/${personId}`, {
      method: 'PUT',
      body: payload
    })

    showEditModal.value = false
    await fetchPerson()
    toast.success('Person updated')
  } catch (error) {
    console.error('Error updating person:', error)
    toast.error('Failed to update person')
  } finally {
    savingPerson.value = false
  }
}

// Delete person
async function deletePerson() {
  if (!person.value) return
  if (!confirm(`Are you sure you want to delete ${person.value.fullName}? This will also remove all relationships with this person.`)) {
    return
  }

  try {
    await $fetch(`/api/people/${personId}`, {
      method: 'DELETE'
    })
    toast.success('Person deleted')
    router.push('/people')
  } catch (error: any) {
    console.error('Error deleting person:', error)
    toast.error(error.data?.message || 'Failed to delete person')
  }
}

onMounted(() => {
  fetchPerson()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <NuxtLink to="/people" class="text-gray-600 hover:text-gray-900">
          <ArrowLeft class="w-5 h-5" />
        </NuxtLink>
        <div v-if="person">
          <h1 class="text-2xl font-bold text-gray-900">{{ person.fullName }}</h1>
          <p v-if="person.email" class="text-gray-600 mt-1">{{ person.email }}</p>
        </div>
      </div>
      <div v-if="person" class="flex items-center space-x-3">
        <UiBadge :variant="person.personType === 'entity' ? 'info' : 'success'">
          {{ person.personType === 'entity' ? 'Entity' : 'Individual' }}
        </UiBadge>
        <UiButton variant="outline" size="sm" @click="openEditModal">
          <Edit class="w-4 h-4 mr-1" />
          Edit
        </UiButton>
        <UiButton variant="danger" size="sm" @click="deletePerson">
          <Trash2 class="w-4 h-4 mr-1" />
          Delete
        </UiButton>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Loader class="w-8 h-8 animate-spin text-burgundy-600" />
    </div>

    <!-- Person Details -->
    <div v-else-if="person" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Info Cards -->
      <div class="lg:col-span-1 space-y-6">
        <!-- Contact Info Card -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div class="space-y-3 text-sm">
            <div v-if="person.email" class="flex items-start">
              <Mail class="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <span class="text-gray-600">Email</span>
                <div class="font-medium">{{ person.email }}</div>
              </div>
            </div>
            <div v-if="person.phone" class="flex items-start">
              <Phone class="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <span class="text-gray-600">Phone</span>
                <div class="font-medium">{{ person.phone }}</div>
              </div>
            </div>
            <div v-if="formattedAddress" class="flex items-start">
              <MapPin class="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <span class="text-gray-600">Address</span>
                <div class="font-medium">
                  <div v-for="(line, i) in formattedAddress" :key="i">{{ line }}</div>
                </div>
              </div>
            </div>
            <div v-if="person.dateOfBirth" class="flex items-start">
              <Calendar class="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <span class="text-gray-600">Date of Birth</span>
                <div class="font-medium">{{ formatDate(person.dateOfBirth) }}</div>
              </div>
            </div>
            <div v-if="person.ssnLast4" class="flex items-start">
              <Lock class="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <span class="text-gray-600">SSN Last 4</span>
                <div class="font-medium">***-**-{{ person.ssnLast4 }}</div>
              </div>
            </div>
            <div v-if="!person.email && !person.phone && !formattedAddress && !person.dateOfBirth && !person.ssnLast4" class="text-gray-500">
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
              <div v-if="person.linkedClient" class="mt-1">
                <NuxtLink
                  :to="`/clients/${person.linkedClient.id}`"
                  class="text-burgundy-600 hover:text-burgundy-800 font-medium hover:underline"
                >
                  View Client Profile
                </NuxtLink>
                <UiBadge :variant="person.linkedClient.status === 'ACTIVE' ? 'success' : 'default'" class="ml-2">
                  {{ person.linkedClient.status }}
                </UiBadge>
              </div>
              <div v-else class="mt-1 text-gray-400">None</div>
            </div>
            <div>
              <span class="text-gray-600">User Account</span>
              <div v-if="person.linkedUser" class="mt-1">
                <UiBadge :variant="person.linkedUser.role === 'ADMIN' ? 'danger' : person.linkedUser.role === 'LAWYER' ? 'info' : 'default'">
                  {{ person.linkedUser.role }}
                </UiBadge>
                <span v-if="person.linkedUser.status === 'INACTIVE'" class="ml-2 text-xs text-gray-500">(Inactive)</span>
              </div>
              <div v-else class="mt-1 text-gray-400">None</div>
            </div>
          </div>
        </div>

        <!-- Meta Card -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h3 class="text-sm font-medium text-gray-500 mb-3">Record Info</h3>
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

      <!-- Right Column: Notes + Relationships -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Notes Card -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Notes</h3>
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
              <UiButton variant="outline" size="sm" @click="cancelEditNotes">
                Cancel
              </UiButton>
              <UiButton size="sm" :disabled="savingNotes" @click="saveNotes">
                {{ savingNotes ? 'Saving...' : 'Save' }}
              </UiButton>
            </div>
          </div>
          <div v-else>
            <p v-if="person.notes" class="text-sm text-gray-700 whitespace-pre-wrap">{{ person.notes }}</p>
            <p v-else class="text-sm text-gray-400">No notes yet</p>
          </div>
        </div>

        <!-- Relationships Card -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 flex items-center">
              <Users class="w-5 h-5 mr-2" />
              Relationships
            </h3>
          </div>

          <div v-if="person.relationships.length === 0" class="text-center py-8 text-gray-500 text-sm">
            No relationships found
          </div>

          <table v-else class="w-full">
            <thead class="border-b border-gray-200">
              <tr>
                <th class="pb-2 text-left text-xs font-medium text-gray-500 uppercase">Person</th>
                <th class="pb-2 text-left text-xs font-medium text-gray-500 uppercase">Relationship</th>
                <th class="pb-2 text-left text-xs font-medium text-gray-500 uppercase">Context</th>
                <th class="pb-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="rel in person.relationships" :key="rel.id" class="hover:bg-gray-50">
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
                  <span v-if="rel.ordinal > 0" class="text-xs text-gray-500 ml-1">(#{{ rel.ordinal }})</span>
                </td>
                <td class="py-3 pr-4">
                  <span class="text-sm text-gray-600">{{ formatContext(rel.context) }}</span>
                </td>
                <td class="py-3">
                  <span v-if="rel.notes" class="text-sm text-gray-600">{{ rel.notes }}</span>
                  <span v-else class="text-sm text-gray-400">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Edit Person Modal -->
    <UiModal v-model="showEditModal" title="Edit Person" size="lg">
      <form @submit.prevent="savePerson" class="space-y-4">
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
          <UiAddressInput
            v-model="addressValue"
            label="Address"
          />
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
