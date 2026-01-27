<template>
  <div class="space-y-6">
    <!-- Back navigation -->
    <div class="flex items-center gap-4">
      <NuxtLink
        to="/estate-plans"
        class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft class="w-4 h-4 mr-1" />
        Back to Estate Plans
      </NuxtLink>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin w-8 h-8 border-4 border-burgundy-500 border-t-transparent rounded-full" />
    </div>

    <!-- Not found -->
    <div v-else-if="!plan" class="text-center py-12">
      <FileText class="w-16 h-16 mx-auto text-gray-300 mb-4" />
      <h2 class="text-xl font-semibold text-gray-900">Plan not found</h2>
      <p class="text-gray-600 mt-2">The estate plan you're looking for doesn't exist.</p>
      <NuxtLink to="/estate-plans" class="text-burgundy-600 hover:underline mt-4 inline-block">
        Return to Estate Plans
      </NuxtLink>
    </div>

    <!-- Plan Content -->
    <template v-else>
      <!-- Header with actions -->
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-4">
          <div
            :class="[
              'w-14 h-14 rounded-lg flex items-center justify-center',
              plan.planType === 'TRUST_BASED' ? 'bg-blue-100' : 'bg-purple-100'
            ]"
          >
            <component
              :is="plan.planType === 'TRUST_BASED' ? Landmark : FileText"
              :class="[
                'w-7 h-7',
                plan.planType === 'TRUST_BASED' ? 'text-blue-600' : 'text-purple-600'
              ]"
            />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ plan.planName }}</h1>
            <div class="flex items-center gap-2 mt-1">
              <EstatePlanStatusBadge :status="plan.status" show-icon />
              <span class="text-gray-500">Version {{ plan.currentVersion }}</span>
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <UiButton variant="outline" @click="showAddEventModal = true">
            <Plus class="w-4 h-4 mr-2" />
            Add Event
          </UiButton>
          <UiButton variant="outline">
            <Edit class="w-4 h-4 mr-2" />
            Edit Plan
          </UiButton>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex gap-6">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="[
              'py-3 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === tab.key
                ? 'border-burgundy-500 text-burgundy-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            <component :is="tab.icon" class="w-4 h-4 inline mr-2" />
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="mt-6">
        <!-- Overview Tab -->
        <EstatePlanCurrentStateDashboard v-if="activeTab === 'overview'" :plan="plan" />

        <!-- Roles Tab -->
        <UiCard v-if="activeTab === 'roles'">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Roles & Designations</h2>
            <UiButton variant="outline" size="sm" @click="showAddRoleModal = true">
              <Plus class="w-4 h-4 mr-2" />
              Add Role
            </UiButton>
          </div>
          <EstatePlanRolesTable
            :roles="plan.roles"
            :primary-person="plan.primaryPerson"
            :secondary-person="plan.secondaryPerson"
            :show-actions="true"
            @edit="handleEditRole"
          />
        </UiCard>

        <!-- Versions Tab -->
        <UiCard v-if="activeTab === 'versions'">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Version History</h2>
            <UiButton variant="outline" size="sm">
              <Plus class="w-4 h-4 mr-2" />
              Record Amendment
            </UiButton>
          </div>
          <EstatePlanVersionTimeline :versions="plan.versions" />
        </UiCard>

        <!-- Events Tab -->
        <UiCard v-if="activeTab === 'events'">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Events & Administration Timeline</h2>
            <UiButton variant="outline" size="sm" @click="showAddEventModal = true">
              <Plus class="w-4 h-4 mr-2" />
              Add Event
            </UiButton>
          </div>
          <EstatePlanEventsTimeline :events="plan.events" />
        </UiCard>

        <!-- Documents Tab -->
        <UiCard v-if="activeTab === 'documents'">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Documents</h2>
            <UiButton variant="outline" size="sm">
              <Upload class="w-4 h-4 mr-2" />
              Upload Document
            </UiButton>
          </div>
          <div class="text-center py-8 text-gray-500">
            <FileText class="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No documents uploaded yet</p>
            <p class="text-sm mt-2">Upload trust documents, amendments, and related files</p>
          </div>
        </UiCard>
      </div>
    </template>

    <!-- Add Event Modal -->
    <UiModal v-model="showAddEventModal" title="Add Event">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
          <select
            v-model="newEvent.eventType"
            class="w-full rounded-lg border-gray-300 focus:ring-burgundy-500 focus:border-burgundy-500"
          >
            <option value="">Select event type...</option>
            <optgroup label="Administration Events">
              <option value="ADMINISTRATION_STARTED">Administration Started</option>
              <option value="SUCCESSOR_TRUSTEE_APPOINTED">Successor Trustee Appointed</option>
              <option value="TRUST_FUNDED">Trust Funded</option>
              <option value="ASSETS_VALUED">Assets Valued</option>
              <option value="DISTRIBUTION_MADE">Distribution Made</option>
              <option value="TAX_RETURN_FILED">Tax Return Filed</option>
              <option value="NOTICE_SENT">Notice Sent</option>
            </optgroup>
            <optgroup label="Trigger Events">
              <option value="GRANTOR_INCAPACITATED">Grantor Incapacitated</option>
              <option value="GRANTOR_CAPACITY_RESTORED">Grantor Capacity Restored</option>
              <option value="GRANTOR_DEATH">Grantor Death</option>
              <option value="CO_GRANTOR_DEATH">Co-Grantor Death</option>
            </optgroup>
            <optgroup label="Other">
              <option value="NOTE_ADDED">Note Added</option>
              <option value="DOCUMENT_ADDED">Document Added</option>
              <option value="OTHER">Other</option>
            </optgroup>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
          <input
            v-model="newEvent.eventDate"
            type="date"
            class="w-full rounded-lg border-gray-300 focus:ring-burgundy-500 focus:border-burgundy-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            v-model="newEvent.description"
            rows="2"
            class="w-full rounded-lg border-gray-300 focus:ring-burgundy-500 focus:border-burgundy-500"
            placeholder="Brief description of the event..."
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea
            v-model="newEvent.notes"
            rows="3"
            class="w-full rounded-lg border-gray-300 focus:ring-burgundy-500 focus:border-burgundy-500"
            placeholder="Additional notes..."
          />
        </div>
      </div>

      <template #footer>
        <UiButton variant="outline" @click="showAddEventModal = false">
          Cancel
        </UiButton>
        <UiButton @click="handleAddEvent" :disabled="!newEvent.eventType || !newEvent.eventDate">
          Add Event
        </UiButton>
      </template>
    </UiModal>

    <!-- Add Role Modal (placeholder) -->
    <UiModal v-model="showAddRoleModal" title="Add Role">
      <p class="text-gray-600">
        Role management will be available in a future update.
      </p>
      <template #footer>
        <UiButton variant="outline" @click="showAddRoleModal = false">
          Close
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  ArrowLeft, FileText, Landmark, Plus, Edit, Upload,
  LayoutDashboard, Users, History, Calendar, File
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

// API response types
interface PersonData {
  id: string
  fullName: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  dateOfBirth?: string | null
}

interface TrustData {
  id: string
  trustName: string
  trustType: string | null
  isJoint: boolean
  isRevocable: boolean
  jurisdiction: string | null
  formationDate: string | null
  fundingDate: string | null
}

interface WillData {
  id: string
  personId: string | null
  willType: string | null
  executionDate: string | null
  jurisdiction: string | null
  codicilCount: number
  probateStatus: string | null
  probateFiledAt: string | null
  probateCaseNumber: string | null
}

interface AncillaryDocumentData {
  id: string
  personId: string
  documentType: string
  executionDate: string | null
  jurisdiction: string | null
  status: string | null
}

interface RoleData {
  id: string
  personId: string
  person: PersonData | null
  forPersonId: string | null
  forPerson: PersonData | null
  willId: string | null
  ancillaryDocumentId: string | null
  roleCategory: string
  roleType: string
  isPrimary: boolean
  ordinal: number
  sharePercentage: number | null
  shareType: string | null
  conditions: string | null
  subtrustName: string | null
  status: string
  effectiveDate: string | null
  terminationDate: string | null
}

interface VersionData {
  id: string
  version: number
  changeType: string
  changeDescription: string | null
  changeSummary: string | null
  effectiveDate: string | null
  sourceType: string | null
  createdAt: string
}

interface EventData {
  id: string
  eventType: string
  eventDate: string
  description: string | null
  notes: string | null
  distributionAmount: number | null
  distributionDescription: string | null
  createdAt: string
}

interface EstatePlanDetail {
  id: string
  planType: 'TRUST_BASED' | 'WILL_BASED'
  planName: string
  currentVersion: number
  status: string
  effectiveDate: string | null
  lastAmendedAt: string | null
  administrationStartedAt: string | null
  closedAt: string | null
  wealthCounselClientId: string | null
  createdAt: string
  updatedAt: string
  primaryPerson: PersonData | null
  secondaryPerson: PersonData | null
  trust: TrustData | null
  wills: WillData[]
  ancillaryDocuments: AncillaryDocumentData[]
  roles: RoleData[]
  versions: VersionData[]
  events: EventData[]
  linkedMatters: any[]
}

const route = useRoute()
const planId = computed(() => route.params.id as string)

// Fetch plan from API
const { data: plan, pending: loading, error, refresh } = useFetch<EstatePlanDetail>(
  () => `/api/estate-plans/${planId.value}`
)

const activeTab = ref('overview')
const showAddEventModal = ref(false)
const showAddRoleModal = ref(false)

const tabs = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'roles', label: 'Roles', icon: Users },
  { key: 'versions', label: 'Versions', icon: History },
  { key: 'events', label: 'Events', icon: Calendar },
  { key: 'documents', label: 'Documents', icon: File }
]

const newEvent = ref({
  eventType: '',
  eventDate: new Date().toISOString().split('T')[0],
  description: '',
  notes: ''
})

function handleEditRole(role: RoleData) {
  // TODO: Implement role editing
  console.log('Edit role:', role)
}

async function handleAddEvent() {
  if (!plan.value) return

  try {
    await $fetch(`/api/estate-plans/${plan.value.id}/events`, {
      method: 'POST',
      body: newEvent.value
    })

    showAddEventModal.value = false
    newEvent.value = {
      eventType: '',
      eventDate: new Date().toISOString().split('T')[0],
      description: '',
      notes: ''
    }

    // Refresh plan data
    await refresh()
  } catch (err) {
    console.error('Failed to add event:', err)
  }
}
</script>
