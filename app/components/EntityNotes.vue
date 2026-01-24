<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-gray-900">Notes</h3>
      <span v-if="notes.length > 0" class="text-sm text-gray-500">
        {{ notes.length }} note{{ notes.length === 1 ? '' : 's' }}
      </span>
    </div>

    <!-- Add Note Form -->
    <div class="space-y-2">
      <textarea
        v-model="newNote"
        placeholder="Add a note..."
        rows="3"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500 resize-none"
        :disabled="saving"
      />
      <div class="flex justify-end">
        <UiButton
          size="sm"
          :disabled="!newNote.trim()"
          :is-loading="saving"
          @click="addNote"
        >
          Add Note
        </UiButton>
      </div>
    </div>

    <!-- Notes List -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 text-sm">Loading notes...</p>
    </div>

    <div v-else-if="notes.length === 0" class="text-center py-8 border border-dashed border-gray-200 rounded-lg">
      <MessageSquare class="w-8 h-8 text-gray-300 mx-auto mb-2" />
      <p class="text-gray-500 text-sm">No notes yet</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="note in notes"
        :key="note.id"
        class="bg-gray-50 rounded-lg p-4 group"
      >
        <!-- Edit Mode -->
        <template v-if="editingNoteId === note.id">
          <textarea
            v-model="editContent"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500 resize-none"
            :disabled="editSaving"
          />
          <div class="flex justify-end gap-2 mt-2">
            <button
              @click="cancelEdit"
              :disabled="editSaving"
              class="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              <X class="w-4 h-4" />
              Cancel
            </button>
            <button
              @click="saveEdit(note.id)"
              :disabled="!editContent.trim() || editSaving"
              class="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-burgundy-600 text-white rounded-lg hover:bg-burgundy-700 disabled:opacity-50"
            >
              <Check class="w-4 h-4" />
              {{ editSaving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </template>

        <!-- View Mode -->
        <template v-else>
          <div class="flex justify-between items-start gap-4">
            <p class="text-sm text-gray-700 whitespace-pre-wrap flex-1">{{ note.content }}</p>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                v-if="canEdit(note)"
                @click="startEdit(note)"
                class="p-1 text-gray-400 hover:text-burgundy-600"
                title="Edit note"
              >
                <Pencil class="w-4 h-4" />
              </button>
              <button
                v-if="canDelete(note)"
                @click="deleteNote(note.id)"
                class="p-1 text-gray-400 hover:text-red-500"
                title="Delete note"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
          <div class="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <span>{{ note.creatorName }}</span>
            <span>&middot;</span>
            <span>{{ formatDate(note.createdAt) }}</span>
            <template v-if="wasEdited(note)">
              <span>&middot;</span>
              <span class="italic">edited</span>
            </template>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { MessageSquare, Trash2, Pencil, X, Check } from 'lucide-vue-next'

interface Note {
  id: string
  content: string
  createdBy: string
  creatorName: string
  createdAt: Date | number
  updatedAt: Date | number
}

const props = defineProps<{
  entityType: 'client' | 'matter' | 'document' | 'appointment' | 'journey'
  entityId: string
}>()

const emit = defineEmits<{
  (e: 'note-added', note: Note): void
  (e: 'note-updated', note: Note): void
  (e: 'note-deleted', noteId: string): void
}>()

const notes = ref<Note[]>([])
const newNote = ref('')
const loading = ref(true)
const saving = ref(false)
const editingNoteId = ref<string | null>(null)
const editContent = ref('')
const editSaving = ref(false)

// Get current user ID from session for delete permission check
const { data: sessionData } = await useFetch('/api/auth/session')
const currentUserId = computed(() => sessionData.value?.user?.id)
const isAdmin = computed(() => (sessionData.value?.user?.adminLevel ?? 0) >= 2)

async function fetchNotes() {
  loading.value = true
  try {
    const response = await $fetch<{ notes: Note[] }>('/api/notes', {
      query: {
        entityType: props.entityType,
        entityId: props.entityId
      }
    })
    notes.value = response.notes || []
  } catch (error) {
    console.error('Failed to fetch notes:', error)
  } finally {
    loading.value = false
  }
}

async function addNote() {
  if (!newNote.value.trim()) return

  saving.value = true
  try {
    const response = await $fetch<{ note: Note }>('/api/notes', {
      method: 'POST',
      body: {
        entityType: props.entityType,
        entityId: props.entityId,
        content: newNote.value.trim()
      }
    })

    // Add to beginning of list
    notes.value.unshift(response.note)
    newNote.value = ''
    emit('note-added', response.note)
  } catch (error) {
    console.error('Failed to add note:', error)
  } finally {
    saving.value = false
  }
}

async function deleteNote(noteId: string) {
  if (!confirm('Are you sure you want to delete this note?')) return

  try {
    await $fetch(`/api/notes/${noteId}`, {
      method: 'DELETE'
    })
    notes.value = notes.value.filter(n => n.id !== noteId)
    emit('note-deleted', noteId)
  } catch (error) {
    console.error('Failed to delete note:', error)
  }
}

function startEdit(note: Note) {
  editingNoteId.value = note.id
  editContent.value = note.content
}

function cancelEdit() {
  editingNoteId.value = null
  editContent.value = ''
}

async function saveEdit(noteId: string) {
  if (!editContent.value.trim()) return

  editSaving.value = true
  try {
    const response = await $fetch<{ note: Note }>(`/api/notes/${noteId}`, {
      method: 'PUT',
      body: {
        content: editContent.value.trim()
      }
    })

    // Update the note in the list
    const index = notes.value.findIndex(n => n.id === noteId)
    if (index !== -1) {
      notes.value[index] = response.note
    }

    editingNoteId.value = null
    editContent.value = ''
    emit('note-updated', response.note)
  } catch (error) {
    console.error('Failed to update note:', error)
  } finally {
    editSaving.value = false
  }
}

function canEdit(note: Note): boolean {
  return isAdmin.value || note.createdBy === currentUserId.value
}

function canDelete(note: Note): boolean {
  return isAdmin.value || note.createdBy === currentUserId.value
}

function wasEdited(note: Note): boolean {
  const created = typeof note.createdAt === 'number' ? note.createdAt : new Date(note.createdAt).getTime() / 1000
  const updated = typeof note.updatedAt === 'number' ? note.updatedAt : new Date(note.updatedAt).getTime() / 1000
  // Consider edited if updated at least 1 second after created
  return updated - created > 1
}

function formatDate(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

onMounted(() => {
  fetchNotes()
})

// Expose refresh method for parent components
defineExpose({
  refresh: fetchNotes
})
</script>
