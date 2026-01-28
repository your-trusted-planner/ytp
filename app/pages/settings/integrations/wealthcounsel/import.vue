<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Back link -->
    <NuxtLink
      to="/settings/integrations/wealthcounsel"
      class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
    >
      <ArrowLeft class="w-4 h-4 mr-1" />
      Back to WealthCounsel
    </NuxtLink>

    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Import Estate Plan</h1>
      <p class="text-gray-600 mt-1">Upload a WealthCounsel XML export to import an estate plan</p>
    </div>

    <!-- Progress Steps -->
    <div class="flex items-center justify-center">
      <div class="flex items-center gap-4">
        <div
          v-for="(step, index) in steps"
          :key="step.key"
          class="flex items-center"
        >
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              currentStep >= index
                ? 'bg-burgundy-600 text-white'
                : 'bg-gray-200 text-gray-500'
            ]"
          >
            <CheckCircle v-if="currentStep > index" class="w-5 h-5" />
            <span v-else>{{ index + 1 }}</span>
          </div>
          <span
            :class="[
              'ml-2 text-sm font-medium',
              currentStep >= index ? 'text-gray-900' : 'text-gray-500'
            ]"
          >
            {{ step.label }}
          </span>
          <ChevronRight v-if="index < steps.length - 1" class="w-5 h-5 mx-4 text-gray-300" />
        </div>
      </div>
    </div>

    <!-- Loading state when resuming -->
    <UiCard v-if="resuming" class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-burgundy-600 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p class="text-gray-600">Loading pending import...</p>
    </UiCard>

    <!-- Step 1: Upload -->
    <UiCard v-else-if="currentStep === 0">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Upload XML File</h2>

      <div
        :class="[
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging ? 'border-burgundy-500 bg-burgundy-50' : 'border-gray-300 hover:border-gray-400'
        ]"
        @dragover.prevent="isDragging = true"
        @dragleave="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <Upload class="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-600 mb-2">
          Drag and drop your WealthCounsel XML file here, or
        </p>
        <label class="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
          <input
            type="file"
            accept=".xml"
            class="sr-only"
            @change="handleFileSelect"
          />
          Browse Files
        </label>
        <p class="text-xs text-gray-400 mt-4">Accepts .xml files from WealthCounsel export</p>
      </div>

      <!-- Selected file -->
      <div v-if="selectedFile" class="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div class="flex items-center gap-3">
          <FileText class="w-5 h-5 text-gray-500" />
          <div>
            <p class="font-medium text-gray-900">{{ selectedFile.name }}</p>
            <p class="text-sm text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
          </div>
        </div>
        <button @click="selectedFile = null" class="text-gray-400 hover:text-gray-600">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="mt-6 flex justify-end">
        <UiButton
          @click="parseFile"
          :disabled="!selectedFile"
          :is-loading="parsing"
        >
          Parse File
          <ChevronRight class="w-4 h-4 ml-2" />
        </UiButton>
      </div>
    </UiCard>

    <!-- Step 2: Review & Match -->
    <UiCard v-if="currentStep === 1 && parsedData">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Review Parsed Data</h2>

      <!-- Info banner - no data saved yet -->
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div class="flex gap-3">
          <Info class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p class="text-sm font-medium text-amber-800">Preview Only - Nothing Saved Yet</p>
            <p class="text-sm text-amber-700 mt-1">
              The file has been parsed and is ready for review. No estate plan or records have been created.
              Click "Import Now" in the final step to save this data to the system.
            </p>
          </div>
        </div>
      </div>

      <!-- Client Match Section -->
      <div class="space-y-6">
        <!-- Parsed Client Info -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 class="text-sm font-semibold text-blue-800 uppercase tracking-wide mb-3">
            Client Information (from XML)
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-blue-600">Name</p>
              <p class="font-medium text-blue-900">{{ parsedData.client.fullName }}</p>
            </div>
            <div v-if="parsedData.client.email">
              <p class="text-sm text-blue-600">Email</p>
              <p class="font-medium text-blue-900">{{ parsedData.client.email }}</p>
            </div>
            <div v-if="parsedData.client.dateOfBirth">
              <p class="text-sm text-blue-600">Date of Birth</p>
              <p class="font-medium text-blue-900">{{ parsedData.client.dateOfBirth }}</p>
            </div>
            <div v-if="parsedData.client.address">
              <p class="text-sm text-blue-600">Address</p>
              <p class="font-medium text-blue-900">{{ parsedData.client.address }}</p>
            </div>
          </div>

          <!-- Spouse if present -->
          <div v-if="parsedData.spouse" class="mt-4 pt-4 border-t border-blue-200">
            <h4 class="text-sm font-semibold text-blue-800 mb-2">Spouse</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-blue-600">Name</p>
                <p class="font-medium text-blue-900">{{ parsedData.spouse.fullName }}</p>
              </div>
              <div v-if="parsedData.spouse.email">
                <p class="text-sm text-blue-600">Email</p>
                <p class="font-medium text-blue-900">{{ parsedData.spouse.email }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Person Matching Review -->
        <PersonMatchingReview
          v-if="extractedPeople.length > 0"
          :extracted-people="extractedPeople"
          v-model="personDecisions"
        />

        <!-- Trust/Will Info -->
        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 class="text-sm font-semibold text-green-800 uppercase tracking-wide mb-3">
            {{ parsedData.planType === 'TRUST_BASED' ? 'Trust' : 'Will' }} Information
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div v-if="parsedData.trust">
              <p class="text-sm text-green-600">Trust Name</p>
              <p class="font-medium text-green-900">{{ parsedData.trust.name }}</p>
            </div>
            <div>
              <p class="text-sm text-green-600">Type</p>
              <p class="font-medium text-green-900">
                {{ parsedData.planType === 'TRUST_BASED' ? 'Trust-Based Plan' : 'Will-Based Plan' }}
              </p>
            </div>
            <div v-if="parsedData.trust?.isJoint !== undefined">
              <p class="text-sm text-green-600">Structure</p>
              <p class="font-medium text-green-900">{{ parsedData.trust.isJoint ? 'Joint Trust' : 'Individual Trust' }}</p>
            </div>
            <div v-if="parsedData.trust?.signDate">
              <p class="text-sm text-green-600">Sign Date</p>
              <p class="font-medium text-green-900">{{ parsedData.trust.signDate }}</p>
            </div>
          </div>
        </div>

        <!-- Roles Summary -->
        <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 class="text-sm font-semibold text-purple-800 uppercase tracking-wide mb-3">
            Roles to Import
          </h3>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <p class="text-2xl font-bold text-purple-900">
                {{ parsedData.fiduciarySummary?.uniquePeople || 0 }}
              </p>
              <p class="text-sm text-purple-600">Fiduciaries</p>
              <p class="text-xs text-purple-500 mt-1" v-if="parsedData.fiduciarySummary?.totalRoleAssignments">
                in {{ parsedData.fiduciarySummary.totalRoleAssignments }} roles
              </p>
            </div>
            <div>
              <p class="text-2xl font-bold text-purple-900">{{ parsedData.beneficiaries?.length || 0 }}</p>
              <p class="text-sm text-purple-600">Beneficiaries</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-purple-900">{{ parsedData.children?.length || 0 }}</p>
              <p class="text-sm text-purple-600">Children</p>
            </div>
          </div>
          <!-- Role types breakdown -->
          <div v-if="parsedData.fiduciarySummary?.roleTypes?.length" class="mt-3 pt-3 border-t border-purple-200">
            <p class="text-xs text-purple-600">
              <span class="font-medium">Role types:</span>
              {{ parsedData.fiduciarySummary.roleTypes.join(', ') }}
            </p>
          </div>
        </div>

        <!-- Amendment Check -->
        <div v-if="existingPlans.length > 0" class="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 class="text-sm font-semibold text-orange-800 uppercase tracking-wide mb-3">
            Existing Plans Found
          </h3>
          <p class="text-sm text-orange-700 mb-3">
            This client already has estate plans in the system. Is this an amendment?
          </p>
          <div class="space-y-2">
            <label
              v-for="existingPlan in existingPlans"
              :key="existingPlan.planId"
              class="flex items-center gap-3 p-3 bg-white border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-50"
            >
              <input
                type="radio"
                v-model="importMode"
                :value="existingPlan.planId"
                class="text-burgundy-600 focus:ring-burgundy-500"
              />
              <div>
                <p class="font-medium text-gray-900">Amend: {{ existingPlan.planName }}</p>
                <p class="text-sm text-gray-500">Add as new version to existing plan</p>
              </div>
            </label>
            <label class="flex items-center gap-3 p-3 bg-white border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-50">
              <input
                type="radio"
                v-model="importMode"
                value="new"
                class="text-burgundy-600 focus:ring-burgundy-500"
              />
              <div>
                <p class="font-medium text-gray-900">Create New Plan</p>
                <p class="text-sm text-gray-500">This is a separate estate plan</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div class="mt-6 flex justify-between">
        <UiButton variant="outline" @click="currentStep = 0">
          <ArrowLeft class="w-4 h-4 mr-2" />
          Back
        </UiButton>
        <UiButton @click="currentStep = 2">
          Continue
          <ChevronRight class="w-4 h-4 ml-2" />
        </UiButton>
      </div>
    </UiCard>

    <!-- Step 3: Confirm & Import -->
    <UiCard v-if="currentStep === 2 && parsedData">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Confirm & Import</h2>

      <!-- Warning that this will create records -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div class="flex gap-3">
          <Info class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p class="text-sm font-medium text-blue-800">Ready to Import</p>
            <p class="text-sm text-blue-700 mt-1">
              Clicking "Import Now" will create the estate plan and all associated records in the system.
              Review the summary below to confirm everything is correct.
            </p>
          </div>
        </div>
      </div>

      <div class="bg-gray-50 rounded-lg p-4 space-y-3">
        <div class="flex justify-between">
          <span class="text-gray-600">Client</span>
          <span class="font-medium text-gray-900">{{ parsedData.client.fullName }}</span>
        </div>
        <div v-if="parsedData.spouse" class="flex justify-between">
          <span class="text-gray-600">Spouse</span>
          <span class="font-medium text-gray-900">{{ parsedData.spouse.fullName }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Plan Type</span>
          <span class="font-medium text-gray-900">
            {{ parsedData.planType === 'TRUST_BASED' ? 'Trust-Based' : 'Will-Based' }}
          </span>
        </div>
        <div v-if="parsedData.trust?.name" class="flex justify-between">
          <span class="text-gray-600">Plan Name</span>
          <span class="font-medium text-gray-900">{{ parsedData.trust.name }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">People to Import</span>
          <span class="font-medium text-gray-900">
            {{ extractedPeople.length }} ({{ peopleToCreate }} new, {{ peopleToLink }} linked)
          </span>
        </div>
        <div v-if="clientsToCreate > 0" class="flex justify-between">
          <span class="text-gray-600">Create as Clients</span>
          <span class="font-medium text-burgundy-600">{{ clientsToCreate }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Import Mode</span>
          <span class="font-medium text-gray-900">
            {{ importMode === 'new' ? 'New Plan' : 'Amendment' }}
          </span>
        </div>
      </div>

      <!-- What will be created -->
      <div class="mt-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">What will be created:</h3>
        <ul class="space-y-2 text-sm text-gray-600">
          <!-- Person records summary based on decisions -->
          <li v-if="peopleToCreate > 0" class="flex items-center gap-2">
            <CheckCircle class="w-4 h-4 text-green-500" />
            {{ peopleToCreate }} new person record{{ peopleToCreate > 1 ? 's' : '' }}
          </li>
          <li v-if="peopleToLink > 0" class="flex items-center gap-2">
            <CheckCircle class="w-4 h-4 text-blue-500" />
            {{ peopleToLink }} link{{ peopleToLink > 1 ? 's' : '' }} to existing person records
          </li>
          <li v-if="clientsToCreate > 0" class="flex items-center gap-2">
            <CheckCircle class="w-4 h-4 text-burgundy-500" />
            {{ clientsToCreate }} client record{{ clientsToCreate > 1 ? 's' : '' }} (with portal access)
          </li>
          <!-- Fallback if no decisions made yet -->
          <li v-if="peopleToCreate === 0 && peopleToLink === 0 && extractedPeople.length > 0" class="flex items-center gap-2">
            <CheckCircle class="w-4 h-4 text-green-500" />
            {{ extractedPeople.length }} person record{{ extractedPeople.length > 1 ? 's' : '' }} (decisions pending)
          </li>
          <li class="flex items-center gap-2">
            <CheckCircle class="w-4 h-4 text-green-500" />
            <span v-if="importMode === 'new'">1 new estate plan</span>
            <span v-else>1 new version of existing plan</span>
          </li>
          <li class="flex items-center gap-2">
            <CheckCircle class="w-4 h-4 text-green-500" />
            {{ parsedData.fiduciarySummary?.totalRoleAssignments || 0 }} fiduciary role assignments ({{ parsedData.fiduciarySummary?.uniquePeople || 0 }} people)
          </li>
          <li v-if="parsedData.beneficiaries?.length" class="flex items-center gap-2">
            <CheckCircle class="w-4 h-4 text-green-500" />
            {{ parsedData.beneficiaries.length }} beneficiary designation(s)
          </li>
        </ul>
      </div>

      <div class="mt-6 flex justify-between">
        <UiButton variant="outline" @click="currentStep = 1">
          <ArrowLeft class="w-4 h-4 mr-2" />
          Back
        </UiButton>
        <UiButton @click="executeImport" :is-loading="importing">
          <Download class="w-4 h-4 mr-2" />
          Import Now
        </UiButton>
      </div>
    </UiCard>

    <!-- Step 4: Success -->
    <UiCard v-if="currentStep === 3">
      <div class="text-center py-8">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle class="w-8 h-8 text-green-600" />
        </div>
        <h2 class="text-xl font-semibold text-gray-900">Import Complete!</h2>
        <p class="text-gray-600 mt-2">
          The estate plan has been successfully imported.
        </p>

        <!-- Import Results Summary -->
        <div v-if="importResult" class="mt-6 bg-gray-50 rounded-lg p-4 max-w-sm mx-auto">
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">People Created</span>
              <span class="font-medium text-gray-900">{{ importResult.peopleCreated }}</span>
            </div>
            <div v-if="importResult.peopleLinked > 0" class="flex justify-between">
              <span class="text-gray-600">People Linked</span>
              <span class="font-medium text-gray-900">{{ importResult.peopleLinked }}</span>
            </div>
            <div v-if="importResult.clientsCreated > 0" class="flex justify-between">
              <span class="text-gray-600">Clients Created</span>
              <span class="font-medium text-burgundy-600">{{ importResult.clientsCreated }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Roles Created</span>
              <span class="font-medium text-gray-900">{{ importResult.rolesCreated }}</span>
            </div>
            <div v-if="importResult.errors?.length" class="pt-2 border-t border-gray-200">
              <p class="text-yellow-600 text-xs">
                {{ importResult.errors.length }} warning(s) - some items may not have imported
              </p>
            </div>
          </div>
        </div>

        <div class="mt-8 flex justify-center gap-4">
          <NuxtLink to="/settings/integrations/wealthcounsel">
            <UiButton variant="outline">
              Import Another
            </UiButton>
          </NuxtLink>
          <NuxtLink v-if="importedPlanId" :to="`/estate-plans/${importedPlanId}`">
            <UiButton>
              View Estate Plan
            </UiButton>
          </NuxtLink>
        </div>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  ArrowLeft, Upload, FileText, X, ChevronRight,
  CheckCircle, AlertCircle, Download, Info
} from 'lucide-vue-next'
import PersonMatchingReview from '~/components/person/MatchingReview.vue'

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

const route = useRoute()

interface ParsedData {
  client: {
    fullName: string
    firstName?: string
    lastName?: string
    email?: string
    dateOfBirth?: string
    address?: string
  }
  spouse?: {
    fullName: string
    firstName?: string
    lastName?: string
    email?: string
  }
  children?: Array<{ name: string; dateOfBirth?: string }>
  planType: 'TRUST_BASED' | 'WILL_BASED'
  trust?: {
    name: string
    type?: string
    isJoint?: boolean
    signDate?: string
  }
  fiduciaries?: Array<{ name: string; role: string }>
  beneficiaries?: Array<{ name: string; share?: string }>
  fiduciarySummary?: {
    uniquePeople: number
    totalRoleAssignments: number
    roleTypes: string[]
  }
}

interface PersonMatch {
  personId: string
  personName: string
  email?: string | null
  dateOfBirth?: string | null
  matchType: string
  confidence: number
  matchingFields: string[]
}

interface ExtractedPerson {
  extractedName: string
  extractedEmail?: string
  extractedDateOfBirth?: string
  role: 'client' | 'spouse' | 'child' | 'beneficiary' | 'fiduciary'
  rolesInPlan: string[]
  matches: PersonMatch[]
}

interface PersonDecision {
  extractedName: string
  action: 'use_existing' | 'create_new'
  existingPersonId?: string
  createAsClient?: boolean
}

interface MatchSuggestion {
  personId: string
  personName: string
  matchType: string
  confidence: number
}

interface ExistingPlan {
  planId: string
  planName: string
}

const steps = [
  { key: 'upload', label: 'Upload & Parse' },
  { key: 'review', label: 'Review & Match' },
  { key: 'confirm', label: 'Import' }
]

const currentStep = ref(0)
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)
const parsing = ref(false)
const importing = ref(false)
const parsedData = ref<ParsedData | null>(null)
const matchSuggestions = ref<MatchSuggestion[]>([])
const existingPlans = ref<ExistingPlan[]>([])
const selectedMatch = ref<string>('new')
const importMode = ref<string>('new')
const importedPlanId = ref<string | null>(null)
const parseId = ref<string | null>(null)
const importResult = ref<any>(null)
const resuming = ref(false)
const extractedPeople = ref<ExtractedPerson[]>([])
const personDecisions = ref<PersonDecision[]>([])

// Computed counts for import summary
const peopleToCreate = computed(() =>
  personDecisions.value.filter(d => d.action === 'create_new').length
)
const peopleToLink = computed(() =>
  personDecisions.value.filter(d => d.action === 'use_existing').length
)
const clientsToCreate = computed(() =>
  personDecisions.value.filter(d => d.createAsClient === true).length
)

// Check for resume parameter on mount
onMounted(async () => {
  const resumeId = route.query.resume as string
  if (resumeId) {
    await resumePendingSession(resumeId)
  }
})

async function resumePendingSession(resumeParseId: string) {
  resuming.value = true

  try {
    const response = await $fetch<{
      parseId: string
      parsed: ParsedData
      extractedPeople: ExtractedPerson[]
      suggestions: {
        clientMatch?: MatchSuggestion
        spouseMatch?: MatchSuggestion
        existingPlans: ExistingPlan[]
        matterSuggestions: any[]
      }
    }>(`/api/admin/integrations/wealthcounsel/pending/${resumeParseId}`)

    // Restore the session state
    parseId.value = response.parseId
    parsedData.value = response.parsed

    // Set up extracted people with their matches
    extractedPeople.value = response.extractedPeople || []

    // Reset person decisions when resuming
    personDecisions.value = []

    // Set up match suggestions (for backward compatibility)
    if (response.suggestions.clientMatch) {
      matchSuggestions.value = [response.suggestions.clientMatch]
    } else {
      matchSuggestions.value = []
    }

    // Set up existing plans
    existingPlans.value = response.suggestions.existingPlans || []

    // Skip to review step
    currentStep.value = 1
  } catch (error: any) {
    console.error('Failed to resume session:', error)
    alert(`Failed to resume session: ${error.data?.message || error.message || 'Session may have expired'}`)
  } finally {
    resuming.value = false
  }
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (file.name.endsWith('.xml')) {
      selectedFile.value = file
    }
  }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0]
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function parseFile() {
  if (!selectedFile.value) return

  parsing.value = true

  try {
    // Create FormData with the XML file
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    // Call the parse API
    const response = await $fetch<{
      parseId: string
      parsed: ParsedData
      extractedPeople: ExtractedPerson[]
      suggestions: {
        clientMatch?: MatchSuggestion
        spouseMatch?: MatchSuggestion
        existingPlans: ExistingPlan[]
        matterSuggestions: any[]
      }
    }>('/api/admin/integrations/wealthcounsel/parse', {
      method: 'POST',
      body: formData
    })

    // Store the parseId for the import step
    parseId.value = response.parseId

    // Map the response to our local state
    parsedData.value = response.parsed

    // Set up extracted people with their matches
    extractedPeople.value = response.extractedPeople || []

    // Reset person decisions when new data comes in
    personDecisions.value = []

    // Set up match suggestions (for backward compatibility)
    if (response.suggestions.clientMatch) {
      matchSuggestions.value = [response.suggestions.clientMatch]
    } else {
      matchSuggestions.value = []
    }

    // Set up existing plans
    existingPlans.value = response.suggestions.existingPlans || []

    currentStep.value = 1
  } catch (error: any) {
    console.error('Parse error:', error)
    alert(`Failed to parse file: ${error.data?.message || error.message || 'Unknown error'}`)
  } finally {
    parsing.value = false
  }
}

async function executeImport() {
  if (!parseId.value) {
    alert('Parse session expired. Please upload the file again.')
    currentStep.value = 0
    return
  }

  importing.value = true

  try {
    // Build the import decisions
    const decisions = {
      clientPersonId: selectedMatch.value !== 'new' ? selectedMatch.value : undefined,
      spousePersonId: undefined, // Could add spouse matching in the future
      isAmendment: importMode.value !== 'new',
      existingPlanId: importMode.value !== 'new' ? importMode.value : undefined,
      linkToMatterId: undefined,
      createPeopleRecords: true,
      personDecisions: personDecisions.value
    }

    // Call the import API
    const response = await $fetch<{
      success: boolean
      planId?: string
      versionId?: string
      peopleCreated: number
      peopleLinked: number
      rolesCreated: number
      errors?: string[]
    }>('/api/admin/integrations/wealthcounsel/import', {
      method: 'POST',
      body: {
        parseId: parseId.value,
        decisions
      }
    })

    if (response.success) {
      importResult.value = response
      importedPlanId.value = response.planId || null
      currentStep.value = 3
    } else {
      throw new Error(response.errors?.join(', ') || 'Import failed')
    }
  } catch (error: any) {
    console.error('Import error:', error)
    alert(`Failed to import: ${error.data?.message || error.message || 'Unknown error'}`)
  } finally {
    importing.value = false
  }
}
</script>
