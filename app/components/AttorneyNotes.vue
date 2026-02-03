<template>
  <div class="bg-white rounded-lg shadow-sm border border-slate-200">
    <div class="border-b border-slate-200 px-6 py-4">
      <h3 class="text-lg font-semibold text-slate-900">Attorney Notes</h3>
      <p class="text-sm text-slate-600 mt-1">
        {{ noteType === 'pre-call' ? 'Prepare for consultation' : 'Document call details' }}
      </p>
    </div>

    <div class="p-6">
      <!-- Pre-Call Notes -->
      <div v-if="noteType === 'pre-call' || noteType === 'both'" class="mb-6">
        <label class="block text-sm font-medium text-slate-700 mb-2">
          <svg class="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          </svg>
          Pre-Call Notes
        </label>
        <textarea
          v-model="localPreCallNotes"
          :rows="4"
          class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
          placeholder="Review questionnaire responses and note key points to discuss..."
          @blur="saveNotes"
        ></textarea>
        <p class="text-xs text-slate-500 mt-1">
          Notes to prepare before the consultation call
        </p>
      </div>

      <!-- Call Notes -->
      <div v-if="noteType === 'call' || noteType === 'both'" class="mb-6">
        <label class="block text-sm font-medium text-slate-700 mb-2">
          <svg class="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          Call Notes
        </label>
        <textarea
          v-model="localCallNotes"
          :rows="6"
          class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
          placeholder="Document discussion points, client goals, concerns, decisions made..."
          @blur="saveNotes"
        ></textarea>
        <p class="text-xs text-slate-500 mt-1">
          Notes during or after the consultation call
        </p>
      </div>

      <!-- Quick Actions (Templates) -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-slate-700 mb-2">Quick Add:</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="template in noteTemplates"
            :key="template.label"
            @click="addTemplate(template.text)"
            class="px-3 py-1 text-xs border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            + {{ template.label }}
          </button>
        </div>
      </div>

      <!-- Save Status -->
      <div v-if="savingStatus" class="flex items-center text-sm">
        <svg
          v-if="savingStatus === 'saving'"
          class="animate-spin h-4 w-4 text-[#C41E3A] mr-2"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <svg
          v-else-if="savingStatus === 'saved'"
          class="h-4 w-4 text-green-600 mr-2"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
        </svg>
        <span :class="savingStatus === 'saved' ? 'text-green-600' : 'text-slate-600'">
          {{ savingStatus === 'saving' ? 'Saving...' : 'Saved' }}
        </span>
      </div>

      <!-- Last Updated -->
      <div v-if="lastUpdated" class="text-xs text-slate-500 mt-2">
        Last updated: {{ formatDate(lastUpdated) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const toast = useToast()

interface Props {
  appointmentId?: string
  responseId?: string
  noteType?: 'pre-call' | 'call' | 'both'
  preCallNotes?: string
  callNotes?: string
  lastUpdated?: number
}

const props = withDefaults(defineProps<Props>(), {
  noteType: 'both',
  preCallNotes: '',
  callNotes: '',
})

const emit = defineEmits(['update'])

const localPreCallNotes = ref(props.preCallNotes)
const localCallNotes = ref(props.callNotes)
const savingStatus = ref<'saving' | 'saved' | null>(null)

// Quick add templates
const noteTemplates = [
  { label: 'Client Goals', text: '\n\n[Client Goals]\n- ' },
  { label: 'Concerns', text: '\n\n[Concerns/Questions]\n- ' },
  { label: 'Next Steps', text: '\n\n[Next Steps]\n- ' },
  { label: 'Follow-up', text: '\n\n[Follow-up Required]\n- ' },
  { label: 'Package Selection', text: '\n\n[Packages Selected]\n- ' },
]

const addTemplate = (template: string) => {
  if (props.noteType === 'pre-call') {
    localPreCallNotes.value += template
  } else {
    localCallNotes.value += template
  }
}

const saveNotes = async () => {
  savingStatus.value = 'saving'

  try {
    if (props.appointmentId) {
      // Save to appointment
      await $fetch('/api/attorney/call-notes', {
        method: 'POST',
        body: {
          appointmentId: props.appointmentId,
          preCallNotes: localPreCallNotes.value,
          callNotes: localCallNotes.value,
        },
      })
    } else if (props.responseId) {
      // Save to questionnaire response
      await $fetch('/api/attorney/questionnaire-notes', {
        method: 'POST',
        body: {
          responseId: props.responseId,
          notes: localCallNotes.value || localPreCallNotes.value,
        },
      })
    }

    savingStatus.value = 'saved'
    emit('update', {
      preCallNotes: localPreCallNotes.value,
      callNotes: localCallNotes.value,
    })

    // Clear saved status after 2 seconds
    setTimeout(() => {
      savingStatus.value = null
    }, 2000)
  } catch (error) {
    console.error('Failed to save notes:', error)
    savingStatus.value = null
    toast.error('Failed to save notes. Please try again.')
  }
}

const formatDate = (timestamp: number) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Watch for prop changes
watch(() => props.preCallNotes, (newVal) => {
  localPreCallNotes.value = newVal
})

watch(() => props.callNotes, (newVal) => {
  localCallNotes.value = newVal
})
</script>

