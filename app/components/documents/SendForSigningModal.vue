<template>
  <UiModal
    :model-value="modelValue"
    :title="`Send for Signing`"
    size="md"
    @update:model-value="onClose"
  >
    <!-- Success state -->
    <div
      v-if="result"
      class="space-y-5"
    >
      <div class="flex flex-col items-center text-center py-2">
        <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
          <CheckCircle class="w-6 h-6 text-green-600" />
        </div>
        <p class="text-sm font-medium text-gray-900">
          Signing link created
        </p>
        <p class="text-xs text-gray-500 mt-1">
          Expires {{ formatExpiry(result.expiresAt) }}
        </p>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
          Signing Link
        </label>
        <div class="flex items-center gap-2">
          <input
            :value="result.signingUrl"
            readonly
            class="flex-1 block rounded-lg border-gray-300 bg-gray-50 shadow-sm text-sm font-mono text-gray-700 focus:outline-none"
            @focus="($event.target as HTMLInputElement).select()"
          >
          <UiButton
            size="sm"
            variant="outline"
            @click="copyLink"
          >
            <component
              :is="copied ? Check : Copy"
              class="w-4 h-4"
            />
          </UiButton>
        </div>
        <p
          v-if="copied"
          class="text-xs text-green-600 mt-1"
        >
          Copied to clipboard
        </p>
      </div>

      <div class="flex justify-end pt-2 border-t border-gray-100">
        <UiButton @click="onClose(false)">
          Done
        </UiButton>
      </div>
    </div>

    <!-- Form state -->
    <div
      v-else
      class="space-y-5"
    >
      <div class="text-sm text-gray-700 font-medium truncate">
        {{ document.title }}
      </div>

      <!-- Not ready warning -->
      <div
        v-if="!document.readyForSignature"
        class="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
      >
        <AlertTriangle class="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
        <p class="text-sm text-yellow-800">
          This document hasn't been marked ready for signature. The signing link will still be created, but you may want to review the document first.
        </p>
      </div>

      <!-- Verification tier -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Verification tier
        </label>
        <div class="flex gap-3">
          <button
            v-for="option in tierOptions"
            :key="option.value"
            type="button"
            class="flex-1 flex flex-col items-start p-3 rounded-lg border-2 text-left transition-colors"
            :class="tier === option.value
              ? 'border-burgundy-600 bg-burgundy-50'
              : 'border-gray-200 hover:border-gray-300'"
            @click="tier = option.value"
          >
            <span class="text-sm font-medium text-gray-900">{{ option.label }}</span>
            <span class="text-xs text-gray-500 mt-0.5">{{ option.desc }}</span>
          </button>
        </div>
      </div>

      <!-- Expiry -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Link expires
        </label>
        <div class="flex gap-2">
          <button
            v-for="option in expiryOptions"
            :key="option.value"
            type="button"
            class="flex-1 py-2 text-sm rounded-lg border-2 transition-colors"
            :class="expiresIn === option.value
              ? 'border-burgundy-600 bg-burgundy-50 text-burgundy-700 font-medium'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'"
            @click="expiresIn = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- Email toggle -->
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          v-model="sendEmail"
          type="checkbox"
          class="rounded border-gray-300 text-burgundy-600 focus:ring-burgundy-500"
        >
        <span class="text-sm text-gray-700">Send email notification to signer</span>
      </label>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <UiButton
          variant="outline"
          @click="onClose(false)"
        >
          Cancel
        </UiButton>
        <UiButton
          :is-loading="submitting"
          @click="submit"
        >
          <Send class="w-4 h-4 mr-1.5" />
          Create Signing Link
        </UiButton>
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { AlertTriangle, CheckCircle, Copy, Check, Send } from 'lucide-vue-next'

interface DocumentProp {
  id: string
  title: string
  readyForSignature: boolean
  signerCount?: number
}

const props = defineProps<{
  modelValue: boolean
  document: DocumentProp
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'sent': []
}>()

const toast = useToast()

const tier = ref<'STANDARD' | 'ENHANCED'>('STANDARD')
const expiresIn = ref('48h')
const sendEmail = ref(false)
const submitting = ref(false)
const copied = ref(false)
const result = ref<{ signingUrl: string; expiresAt: string } | null>(null)

const tierOptions = [
  { value: 'STANDARD' as const, label: 'Standard', desc: 'Click-to-sign, no ID verification' },
  { value: 'ENHANCED' as const, label: 'Enhanced', desc: 'Identity verification required' }
]

const expiryOptions = [
  { value: '48h', label: '48 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' }
]

watch(() => props.modelValue, (open) => {
  if (open) {
    tier.value = 'STANDARD'
    expiresIn.value = '48h'
    sendEmail.value = false
    submitting.value = false
    copied.value = false
    result.value = null
  }
})

function onClose(val: boolean) {
  if (!val && result.value) emit('sent')
  emit('update:modelValue', val)
}

async function submit() {
  submitting.value = true
  try {
    const res = await $fetch<any>(
      `/api/documents/${props.document.id}/signature-session`,
      {
        method: 'POST',
        body: {
          tier: tier.value,
          expiresIn: expiresIn.value,
          sendEmail: sendEmail.value,
          signerRole: 1
        }
      }
    )
    result.value = {
      signingUrl: res.data.signingUrl,
      expiresAt: res.data.expiresAt
    }
  }
  catch (err: any) {
    toast.error(err.data?.message || 'Failed to create signing link')
  }
  finally {
    submitting.value = false
  }
}

async function copyLink() {
  if (!result.value) return
  await navigator.clipboard.writeText(result.value.signingUrl)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}
</script>
