<template>
  <div class="identity-verification">
    <div class="bg-white rounded-lg shadow-lg p-6">
      <!-- Header -->
      <div class="text-center mb-6">
        <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck class="w-8 h-8 text-amber-600" />
        </div>
        <h2 class="text-xl font-semibold text-slate-900">Identity Verification Required</h2>
        <p class="text-slate-600 mt-2">
          This document requires additional identity verification before signing.
        </p>
      </div>

      <!-- Signer Info -->
      <div class="bg-slate-50 rounded-lg p-4 mb-6">
        <div class="flex items-center">
          <div class="w-10 h-10 bg-[#0A2540] rounded-full flex items-center justify-center text-white font-semibold mr-3">
            {{ signerInitials }}
          </div>
          <div>
            <p class="font-medium text-slate-900">{{ signer.name }}</p>
            <p class="text-sm text-slate-600">{{ signer.email }}</p>
          </div>
        </div>
      </div>

      <!-- Attestation Mode -->
      <div v-if="mode === 'attestation'" class="space-y-6">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 class="font-medium text-blue-900 mb-2">Self-Attestation</h3>
          <p class="text-sm text-blue-800">
            Please read and agree to the following attestation statement to verify your identity.
          </p>
        </div>

        <div class="border border-slate-200 rounded-lg p-4 bg-slate-50">
          <p class="text-slate-700 leading-relaxed">
            {{ attestationText }}
          </p>
        </div>

        <div class="space-y-4">
          <label class="flex items-start cursor-pointer">
            <input
              v-model="attestationAgreed"
              type="checkbox"
              class="mt-1 h-5 w-5 text-[#C41E3A] focus:ring-[#C41E3A] border-slate-300 rounded"
            />
            <span class="ml-3 text-slate-700">
              I have read and agree to the above attestation statement. I understand that making a false statement constitutes perjury.
            </span>
          </label>
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-sm text-red-800">{{ error }}</p>
        </div>

        <button
          @click="submitAttestation"
          :disabled="!attestationAgreed || isSubmitting"
          class="w-full px-6 py-3 bg-[#C41E3A] text-white rounded-lg font-semibold hover:bg-[#a31830] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Loader2 v-if="isSubmitting" class="w-5 h-5 mr-2 animate-spin" />
          {{ isSubmitting ? 'Verifying...' : 'Confirm Identity' }}
        </button>
      </div>

      <!-- KBA Mode -->
      <div v-else-if="mode === 'kba'" class="space-y-6">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 class="font-medium text-blue-900 mb-2">Knowledge-Based Verification</h3>
          <p class="text-sm text-blue-800">
            Please confirm your identity by providing the following information as it appears in our records.
          </p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Date of Birth
            </label>
            <input
              v-model="kbaDateOfBirth"
              type="date"
              class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-[#C41E3A]"
              placeholder="YYYY-MM-DD"
            />
          </div>

          <div v-if="requireSsn">
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Last 4 Digits of SSN
            </label>
            <input
              v-model="kbaLastFourSsn"
              type="text"
              maxlength="4"
              pattern="\d{4}"
              class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-[#C41E3A]"
              placeholder="####"
            />
          </div>
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-sm text-red-800">{{ error }}</p>
        </div>

        <button
          @click="submitKba"
          :disabled="!kbaDateOfBirth || isSubmitting"
          class="w-full px-6 py-3 bg-[#C41E3A] text-white rounded-lg font-semibold hover:bg-[#a31830] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Loader2 v-if="isSubmitting" class="w-5 h-5 mr-2 animate-spin" />
          {{ isSubmitting ? 'Verifying...' : 'Verify Identity' }}
        </button>
      </div>

      <!-- Manual Mode -->
      <div v-else-if="mode === 'manual'" class="space-y-6">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 class="font-medium text-blue-900 mb-2">Photo ID Verification</h3>
          <p class="text-sm text-blue-800">
            Please upload a clear photo of your government-issued ID. An attorney will review and approve your identity.
          </p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              ID Type
            </label>
            <select
              v-model="manualIdType"
              class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-[#C41E3A]"
            >
              <option value="">Select ID type...</option>
              <option value="DRIVERS_LICENSE">Driver's License</option>
              <option value="PASSPORT">Passport</option>
              <option value="STATE_ID">State ID Card</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Upload ID Photo
            </label>
            <div
              class="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#C41E3A] transition-colors"
              @click="triggerFileUpload"
              @dragover.prevent
              @drop.prevent="handleFileDrop"
            >
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleFileSelect"
              />

              <div v-if="!manualIdImage">
                <Upload class="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p class="text-slate-600">Click or drag to upload ID photo</p>
                <p class="text-sm text-slate-500 mt-1">JPG, PNG, or HEIC</p>
              </div>

              <div v-else class="space-y-2">
                <CheckCircle class="w-10 h-10 text-green-500 mx-auto" />
                <p class="text-green-700 font-medium">ID photo uploaded</p>
                <button
                  type="button"
                  @click.stop="clearIdImage"
                  class="text-sm text-slate-600 hover:text-red-600"
                >
                  Remove and upload different photo
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-sm text-red-800">{{ error }}</p>
        </div>

        <button
          @click="submitManual"
          :disabled="!manualIdType || !manualIdImage || isSubmitting"
          class="w-full px-6 py-3 bg-[#C41E3A] text-white rounded-lg font-semibold hover:bg-[#a31830] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Loader2 v-if="isSubmitting" class="w-5 h-5 mr-2 animate-spin" />
          {{ isSubmitting ? 'Submitting...' : 'Submit for Review' }}
        </button>

        <p class="text-sm text-slate-500 text-center">
          Your ID will be reviewed by an attorney. You'll receive an email when approved.
        </p>
      </div>

      <!-- Pending Review Message -->
      <div v-if="pendingReview" class="space-y-6">
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <Clock class="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h3 class="font-semibold text-amber-900 mb-2">Verification Pending</h3>
          <p class="text-amber-800">
            Your ID has been submitted for review. You'll receive an email once it's approved and you can proceed with signing.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShieldCheck, Loader2, Upload, CheckCircle, Clock } from 'lucide-vue-next'

interface Props {
  token: string
  signer: {
    name: string
    email: string
  }
  mode: 'attestation' | 'kba' | 'manual'
  requireSsn?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'attestation',
  requireSsn: false
})

const emit = defineEmits<{
  'verified': [data: { method: string; verifiedAt: string }]
  'pending-review': []
}>()

// Computed
const signerInitials = computed(() => {
  const parts = props.signer.name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return props.signer.name.substring(0, 2).toUpperCase()
})

const attestationText = computed(() => {
  return `I, ${props.signer.name}, hereby attest under penalty of perjury under the laws of the United States of America that I am the person named in this document, that I am signing this document of my own free will, and that the information I have provided is true and correct to the best of my knowledge.`
})

// State
const isSubmitting = ref(false)
const error = ref<string | null>(null)
const pendingReview = ref(false)

// Attestation mode
const attestationAgreed = ref(false)

// KBA mode
const kbaDateOfBirth = ref('')
const kbaLastFourSsn = ref('')

// Manual mode
const manualIdType = ref('')
const manualIdImage = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Methods
async function submitAttestation() {
  if (!attestationAgreed.value) {
    error.value = 'Please agree to the attestation statement'
    return
  }

  isSubmitting.value = true
  error.value = null

  try {
    const response = await $fetch(`/api/signature/${props.token}/verify-identity`, {
      method: 'POST',
      body: {
        mode: 'attestation',
        attestationText: attestationText.value,
        agreedToTerms: true
      }
    })

    if (response.success && response.data.verified) {
      emit('verified', {
        method: 'attestation',
        verifiedAt: response.data.verifiedAt
      })
    }
  } catch (err: any) {
    error.value = err.data?.message || 'Verification failed. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

async function submitKba() {
  if (!kbaDateOfBirth.value) {
    error.value = 'Please enter your date of birth'
    return
  }

  isSubmitting.value = true
  error.value = null

  try {
    const response = await $fetch(`/api/signature/${props.token}/verify-identity`, {
      method: 'POST',
      body: {
        mode: 'kba',
        dateOfBirth: kbaDateOfBirth.value,
        lastFourSsn: kbaLastFourSsn.value || undefined
      }
    })

    if (response.success && response.data.verified) {
      emit('verified', {
        method: 'kba',
        verifiedAt: response.data.verifiedAt
      })
    }
  } catch (err: any) {
    error.value = err.data?.message || 'Verification failed. Please check your information and try again.'
  } finally {
    isSubmitting.value = false
  }
}

async function submitManual() {
  if (!manualIdType.value || !manualIdImage.value) {
    error.value = 'Please select ID type and upload a photo'
    return
  }

  isSubmitting.value = true
  error.value = null

  try {
    const response = await $fetch(`/api/signature/${props.token}/verify-identity`, {
      method: 'POST',
      body: {
        mode: 'manual',
        idType: manualIdType.value,
        idImageData: manualIdImage.value
      }
    })

    if (response.success) {
      if (response.data.requiresApproval) {
        pendingReview.value = true
        emit('pending-review')
      } else if (response.data.verified) {
        emit('verified', {
          method: 'manual',
          verifiedAt: response.data.verifiedAt
        })
      }
    }
  } catch (err: any) {
    error.value = err.data?.message || 'Submission failed. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

function triggerFileUpload() {
  fileInputRef.value?.click()
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    processFile(file)
  }
}

function handleFileDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    processFile(file)
  }
}

function processFile(file: File) {
  const reader = new FileReader()
  reader.onload = () => {
    manualIdImage.value = reader.result as string
  }
  reader.readAsDataURL(file)
}

function clearIdImage() {
  manualIdImage.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}
</script>
