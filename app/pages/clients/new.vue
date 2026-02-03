<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">New Client Intake</h1>
        <p class="text-gray-600 mt-1">Add a new client with comprehensive information</p>
      </div>
      <NuxtLink to="/clients" class="text-burgundy-600 hover:text-burgundy-800 flex items-center gap-1">
        <ArrowLeft class="w-4 h-4" />
        Back to Clients
      </NuxtLink>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Section 1: Basic Information (Required, always expanded) -->
      <UiCard>
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">Basic Information</h2>
          <p class="text-sm text-gray-500">Required contact information for the client</p>
        </div>
        <div class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UiInput
              v-model="form.firstName"
              label="First Name"
              required
              :error="errors.firstName"
            />
            <UiInput
              v-model="form.lastName"
              label="Last Name"
              required
              :error="errors.lastName"
            />
          </div>
          <UiInput
            v-model="form.email"
            label="Email"
            type="email"
            required
            :error="errors.email"
          />
          <UiInput
            v-model="form.phone"
            label="Phone"
            type="tel"
          />
          <div class="relative">
            <UiInput
              v-model="form.password"
              label="Temporary Password"
              :type="showPassword ? 'text' : 'password'"
              required
              hint="Client will use this to log in initially"
              :error="errors.password"
            />
            <button
              type="button"
              class="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" class="w-4 h-4" />
              <Eye v-else class="w-4 h-4" />
            </button>
          </div>
        </div>
      </UiCard>

      <!-- Section 2: Address (Collapsible) -->
      <UiCard>
        <button
          type="button"
          class="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50"
          @click="sections.address = !sections.address"
        >
          <div class="text-left">
            <h2 class="text-lg font-semibold text-gray-900">Address</h2>
            <p class="text-sm text-gray-500">Client's residential address</p>
          </div>
          <ChevronDown
            class="w-5 h-5 text-gray-400 transition-transform"
            :class="{ 'rotate-180': sections.address }"
          />
        </button>
        <div v-if="sections.address" class="p-6 border-t border-gray-200">
          <UiAddressInput
            v-model="addressValue"
            label="Address"
            @place-selected="handlePlaceSelected"
          />
        </div>
      </UiCard>

      <!-- Section 3: Personal Details (Collapsible) -->
      <UiCard>
        <button
          type="button"
          class="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50"
          @click="sections.personal = !sections.personal"
        >
          <div class="text-left">
            <h2 class="text-lg font-semibold text-gray-900">Personal Details</h2>
            <p class="text-sm text-gray-500">Date of birth and identification</p>
          </div>
          <ChevronDown
            class="w-5 h-5 text-gray-400 transition-transform"
            :class="{ 'rotate-180': sections.personal }"
          />
        </button>
        <div v-if="sections.personal" class="p-6 border-t border-gray-200 space-y-4">
          <UiInput
            v-model="form.dateOfBirth"
            label="Date of Birth"
            type="date"
          />
          <div class="max-w-xs">
            <UiInput
              v-model="form.ssnLast4"
              label="SSN (Last 4 digits)"
              maxlength="4"
              placeholder="XXXX"
              hint="For identity verification"
            />
          </div>
        </div>
      </UiCard>

      <!-- Section 4: Family Information (Collapsible) -->
      <UiCard>
        <button
          type="button"
          class="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50"
          @click="sections.family = !sections.family"
        >
          <div class="text-left">
            <h2 class="text-lg font-semibold text-gray-900">Family Information</h2>
            <p class="text-sm text-gray-500">Children and dependents</p>
          </div>
          <ChevronDown
            class="w-5 h-5 text-gray-400 transition-transform"
            :class="{ 'rotate-180': sections.family }"
          />
        </button>
        <div v-if="sections.family" class="p-6 border-t border-gray-200 space-y-4">
          <UiToggle
            v-model="form.hasMinorChildren"
            label="Has Minor Children"
            description="Client has children under 18 years old"
          />
          <div v-if="form.hasMinorChildren">
            <UiTextarea
              v-model="form.childrenInfo"
              label="Children Information"
              placeholder="Enter names and ages of minor children..."
              :rows="3"
            />
          </div>
        </div>
      </UiCard>

      <!-- Section 5: Existing Planning (Collapsible) -->
      <UiCard>
        <button
          type="button"
          class="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50"
          @click="sections.planning = !sections.planning"
        >
          <div class="text-left">
            <h2 class="text-lg font-semibold text-gray-900">Existing Planning</h2>
            <p class="text-sm text-gray-500">Current estate planning documents</p>
          </div>
          <ChevronDown
            class="w-5 h-5 text-gray-400 transition-transform"
            :class="{ 'rotate-180': sections.planning }"
          />
        </button>
        <div v-if="sections.planning" class="p-6 border-t border-gray-200 space-y-4">
          <UiToggle
            v-model="form.hasWill"
            label="Has Existing Will"
            description="Client currently has a will in place"
          />
          <UiToggle
            v-model="form.hasTrust"
            label="Has Existing Trust"
            description="Client currently has a trust in place"
          />
        </div>
      </UiCard>

      <!-- Section 6: Business Information (Collapsible) -->
      <UiCard>
        <button
          type="button"
          class="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50"
          @click="sections.business = !sections.business"
        >
          <div class="text-left">
            <h2 class="text-lg font-semibold text-gray-900">Business Information</h2>
            <p class="text-sm text-gray-500">Business ownership details</p>
          </div>
          <ChevronDown
            class="w-5 h-5 text-gray-400 transition-transform"
            :class="{ 'rotate-180': sections.business }"
          />
        </button>
        <div v-if="sections.business" class="p-6 border-t border-gray-200 space-y-4">
          <UiInput
            v-model="form.businessName"
            label="Business Name"
          />
          <UiSelect
            v-model="form.businessType"
            label="Business Type"
            placeholder="Select business type"
          >
            <option value="sole_proprietorship">Sole Proprietorship</option>
            <option value="partnership">Partnership</option>
            <option value="llc">LLC</option>
            <option value="s_corp">S Corporation</option>
            <option value="c_corp">C Corporation</option>
            <option value="nonprofit">Nonprofit</option>
            <option value="other">Other</option>
          </UiSelect>
        </div>
      </UiCard>

      <!-- Section 7: Referral Source (Collapsible) -->
      <UiCard>
        <button
          type="button"
          class="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50"
          @click="sections.referral = !sections.referral"
        >
          <div class="text-left">
            <h2 class="text-lg font-semibold text-gray-900">Referral Source</h2>
            <p class="text-sm text-gray-500">How did this client find you?</p>
          </div>
          <ChevronDown
            class="w-5 h-5 text-gray-400 transition-transform"
            :class="{ 'rotate-180': sections.referral }"
          />
        </button>
        <div v-if="sections.referral" class="p-6 border-t border-gray-200 space-y-4">
          <UiSelect
            v-model="form.referralType"
            label="Referral Type"
            placeholder="Select referral type"
          >
            <option value="CLIENT">Existing Client</option>
            <option value="PROFESSIONAL">Professional Partner</option>
            <option value="EVENT">Event</option>
            <option value="MARKETING">Marketing Campaign</option>
          </UiSelect>

          <!-- Professional Partner selection -->
          <div v-if="form.referralType === 'PROFESSIONAL'">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Referral Partner
            </label>
            <UiAutocomplete
              v-model="form.referredByPartnerId"
              :options="referralPartners"
              label-key="name"
              value-key="id"
              :sublabel-key="(p: any) => p.company || p.type"
              placeholder="Search referral partners..."
              :loading="loadingPartners"
            />
          </div>

          <!-- Client referral selection -->
          <div v-if="form.referralType === 'CLIENT'">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Referred By (Client)
            </label>
            <UiAutocomplete
              v-model="form.referredByPersonId"
              :options="existingClients"
              :label-key="(c: any) => `${c.firstName} ${c.lastName}`"
              value-key="id"
              :sublabel-key="(c: any) => c.email"
              placeholder="Search existing clients..."
              :loading="loadingClients"
              @search="searchClients"
            />
          </div>

          <UiTextarea
            v-model="form.referralNotes"
            label="Referral Notes"
            placeholder="Additional notes about how they found you..."
            :rows="2"
          />
        </div>
      </UiCard>

      <!-- Save Options -->
      <div class="flex justify-between items-center pt-4 border-t border-gray-200">
        <div class="flex gap-2">
          <UiButton
            type="button"
            variant="outline"
            @click="navigateTo('/clients')"
          >
            Cancel
          </UiButton>
        </div>
        <div class="flex gap-2">
          <UiButton
            type="button"
            variant="outline"
            :is-loading="saving && saveAsLead"
            :disabled="saving"
            @click="handleSaveAsLead"
          >
            Save as Lead
          </UiButton>
          <UiButton
            type="submit"
            :is-loading="saving && !saveAsLead"
            :disabled="saving"
          >
            Create Client
          </UiButton>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, ChevronDown, Eye, EyeOff } from 'lucide-vue-next'
import type { AddressValue } from '~/components/ui/AddressInput.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const toast = useToast()
const router = useRouter()

// Form state
const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  dateOfBirth: '',
  ssnLast4: '',
  hasMinorChildren: false,
  childrenInfo: '',
  hasWill: false,
  hasTrust: false,
  businessName: '',
  businessType: '',
  referralType: '' as '' | 'CLIENT' | 'PROFESSIONAL' | 'EVENT' | 'MARKETING',
  referredByPersonId: '' as string | null,
  referredByPartnerId: '' as string | null,
  referralNotes: ''
})

// Address as a separate reactive object for the component
const addressValue = ref<AddressValue>({
  address: '',
  city: '',
  state: '',
  zipCode: ''
})

// Section visibility state
const sections = ref({
  address: false,
  personal: false,
  family: false,
  planning: false,
  business: false,
  referral: false
})

// UI state
const showPassword = ref(false)
const saving = ref(false)
const saveAsLead = ref(false)
const errors = ref<Record<string, string>>({})

// Referral data
const referralPartners = ref<any[]>([])
const loadingPartners = ref(false)
const existingClients = ref<any[]>([])
const loadingClients = ref(false)

// Fetch referral partners on mount
onMounted(async () => {
  await fetchReferralPartners()
})

async function fetchReferralPartners() {
  loadingPartners.value = true
  try {
    const data = await $fetch<any[]>('/api/referral-partners')
    referralPartners.value = data
  } catch (error) {
    console.error('Failed to fetch referral partners:', error)
  } finally {
    loadingPartners.value = false
  }
}

// Debounced client search
let clientSearchTimer: ReturnType<typeof setTimeout> | null = null
async function searchClients(query: string) {
  if (clientSearchTimer) {
    clearTimeout(clientSearchTimer)
  }

  if (query.length < 2) {
    existingClients.value = []
    return
  }

  clientSearchTimer = setTimeout(async () => {
    loadingClients.value = true
    try {
      const response = await $fetch<{ clients: any[] }>('/api/clients', {
        params: { search: query, limit: 10 }
      })
      existingClients.value = response.clients
    } catch (error) {
      console.error('Failed to search clients:', error)
    } finally {
      loadingClients.value = false
    }
  }, 300)
}

function handlePlaceSelected(suggestion: any) {
  // Address is automatically updated via v-model
  console.log('Place selected:', suggestion)
}

function validate(): boolean {
  errors.value = {}

  if (!form.value.firstName.trim()) {
    errors.value.firstName = 'First name is required'
  }
  if (!form.value.lastName.trim()) {
    errors.value.lastName = 'Last name is required'
  }
  if (!form.value.email.trim()) {
    errors.value.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Invalid email format'
  }
  if (!form.value.password) {
    errors.value.password = 'Password is required'
  } else if (form.value.password.length < 6) {
    errors.value.password = 'Password must be at least 6 characters'
  }

  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  saveAsLead.value = false
  await submitForm('PROSPECT')
}

async function handleSaveAsLead() {
  saveAsLead.value = true
  await submitForm('LEAD')
}

async function submitForm(status: 'LEAD' | 'PROSPECT') {
  if (!validate()) {
    toast.error('Please fix the errors in the form')
    return
  }

  saving.value = true
  try {
    const payload = {
      ...form.value,
      address: addressValue.value.address,
      city: addressValue.value.city,
      state: addressValue.value.state,
      zipCode: addressValue.value.zipCode,
      status,
      referredByPersonId: form.value.referredByPersonId || undefined,
      referredByPartnerId: form.value.referredByPartnerId || undefined,
      referralType: form.value.referralType || undefined
    }

    const response = await $fetch<{ success: boolean; clientId: string }>('/api/clients', {
      method: 'POST',
      body: payload
    })

    if (response.success) {
      toast.success(`Client created successfully as ${status.toLowerCase()}`)
      router.push(`/clients/${response.clientId}`)
    }
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to create client')
  } finally {
    saving.value = false
  }
}
</script>
