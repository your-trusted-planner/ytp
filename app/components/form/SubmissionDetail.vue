<template>
  <div>
    <!-- Loading -->
    <div
      v-if="loading"
      class="text-center py-6"
    >
      <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-accent-500" />
    </div>

    <div
      v-else-if="detail"
      class="space-y-6"
    >
      <!-- Submission Meta -->
      <div class="flex flex-wrap gap-4 text-sm text-gray-600">
        <div v-if="detail.submission.personId">
          <NuxtLink
            :to="`/people/${detail.submission.personId}`"
            class="text-accent-600 hover:text-accent-800 font-medium"
          >
            View Person Record
          </NuxtLink>
        </div>
        <div v-if="detail.submission.utmSource">
          <span class="text-gray-400">Source:</span>
          {{ detail.submission.utmSource }}
          <span v-if="detail.submission.utmMedium">/ {{ detail.submission.utmMedium }}</span>
          <span v-if="detail.submission.utmCampaign">/ {{ detail.submission.utmCampaign }}</span>
        </div>
      </div>

      <!-- Responses by Section -->
      <div
        v-for="section in detail.sections"
        :key="section.id"
        class="space-y-3"
      >
        <h4
          v-if="section.title"
          class="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-1"
        >
          {{ section.title }}
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="field in section.fields"
            :key="field.id"
            class="bg-white border border-gray-100 rounded px-3 py-2"
          >
            <div class="text-xs text-gray-500 mb-0.5">
              {{ field.label }}
            </div>
            <div class="text-sm text-gray-900">
              <!-- {{ formatValue(field.value, field.fieldType) }} -->
              {{ field.value }}
            </div>
          </div>
        </div>
      </div>

      <!-- Notes Section -->
      <div class="border-t border-gray-200 pt-4">
        <h4 class="text-sm font-semibold text-gray-800 mb-3">
          Notes
        </h4>

        <!-- Existing Notes -->
        <div
          v-if="notes.length > 0"
          class="space-y-2 mb-3"
        >
          <div
            v-for="note in notes"
            :key="note.id"
            class="bg-white border border-gray-100 rounded px-3 py-2"
          >
            <div class="text-sm text-gray-900">
              {{ note.content }}
            </div>
            <div class="text-xs text-gray-400 mt-1">
              {{ note.creatorName }} &middot; {{ formatDate(note.createdAt) }}
            </div>
          </div>
        </div>
        <div
          v-else
          class="text-xs text-gray-400 mb-3"
        >
          No notes yet.
        </div>

        <!-- Add Note -->
        <div class="flex gap-2">
          <input
            v-model="newNote"
            type="text"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            placeholder="Add a note..."
            @keydown.enter="addNote"
          >
          <UiButton
            size="sm"
            :disabled="!newNote.trim() || savingNote"
            @click="addNote"
          >
            Add
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  submissionId: string
}>()

const loading = ref(true)
const detail = ref<any>(null)
const notes = ref<any[]>([])
const newNote = ref('')
const savingNote = ref(false)

onMounted(async () => {
  await Promise.all([fetchDetail(), fetchNotes()])
  loading.value = false
})

async function fetchDetail() {
  try {
    detail.value = await $fetch(`/api/admin/form-submissions/${props.submissionId}`)
  } catch (err) {
    console.error('Failed to load submission detail:', err)
  }
}

async function fetchNotes() {
  try {
    const result = await $fetch<{ notes: any[] }>('/api/notes', {
      params: { entityType: 'formSubmission', entityId: props.submissionId }
    })
    notes.value = result.notes
  } catch { /* ignore */ }
}

async function addNote() {
  if (!newNote.value.trim()) return
  savingNote.value = true
  try {
    await $fetch('/api/notes', {
      method: 'POST',
      body: {
        content: newNote.value.trim(),
        entityType: 'formSubmission',
        entityId: props.submissionId
      }
    })
    newNote.value = ''
    await fetchNotes()
  } catch (err: any) {
    const toast = useToast()
    toast.error('Failed to add note')
  } finally {
    savingNote.value = false
  }
}

function formatValue(value: any, fieldType: string): string {
  // Check for empty — be explicit to avoid catching 0 or false
  // if (value === null || value === undefined) return '—'
  if (typeof value === 'string' && value.trim() === '') return '—'
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (fieldType === 'yes_no') return value === 'yes' ? 'Yes' : value === 'no' ? 'No' : String(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function formatDate(ts: any): string {
  if (!ts) return ''
  const d = ts instanceof Date ? ts : new Date(typeof ts === 'number' ? ts : ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
</script>
