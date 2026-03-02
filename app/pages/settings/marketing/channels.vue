<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <NuxtLink to="/settings" class="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          &larr; Back to Settings
        </NuxtLink>
        <h1 class="text-3xl font-bold text-gray-900">Marketing Channels</h1>
        <p class="text-gray-600 mt-1">Manage communication channels for marketing consent</p>
      </div>
      <UiButton @click="openCreateModal">Create Channel</UiButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-600" />
    </div>

    <!-- Channels list -->
    <UiCard v-else-if="channels.length > 0">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="channel in channels" :key="channel.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="font-medium text-gray-900">{{ channel.name }}</div>
                <div v-if="channel.description" class="text-sm text-gray-500">{{ channel.description }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="channel.channelType === 'EMAIL' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'">
                  {{ channel.channelType }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                {{ channel.slug }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <UiToggle
                  :model-value="channel.isActive === 1"
                  @update:model-value="toggleActive(channel)"
                />
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <UiButton variant="ghost" size="sm" @click="editChannel(channel)">
                  Edit
                </UiButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <!-- Empty state -->
    <UiCard v-else>
      <div class="text-center py-12">
        <Mail class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900">No marketing channels</h3>
        <p class="mt-1 text-sm text-gray-500">Create your first channel to start managing marketing consent.</p>
        <div class="mt-6">
          <UiButton @click="openCreateModal">Create Channel</UiButton>
        </div>
      </div>
    </UiCard>

    <!-- Create/Edit Modal -->
    <UiModal v-model="showEditModal" :title="editing ? 'Edit Channel' : 'Create Channel'">
      <form @submit.prevent="handleSave" class="space-y-4">
        <UiInput v-model="form.name" label="Name" placeholder="e.g., Monthly Newsletter" required />
        <UiInput v-model="form.description" label="Description" placeholder="Brief description of this channel" />
        <UiSelect v-model="form.channelType" label="Channel Type" required>
          <option value="EMAIL">Email</option>
          <option value="SMS">SMS</option>
        </UiSelect>
        <UiInput v-model="form.slug" label="Slug" placeholder="e.g., monthly-newsletter" required
          hint="Lowercase, alphanumeric, hyphens only" />
        <UiInput v-model.number="form.sortOrder" label="Sort Order" type="number" placeholder="0" />
      </form>
      <template #footer>
        <UiButton variant="outline" @click="showEditModal = false">Cancel</UiButton>
        <UiButton @click="handleSave" :is-loading="saving">
          {{ editing ? 'Save Changes' : 'Create Channel' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { Mail } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

interface Channel {
  id: string
  name: string
  description: string | null
  channelType: string
  slug: string
  isActive: number
  sortOrder: number
}

const toast = useToast()
const channels = ref<Channel[]>([])
const loading = ref(true)
const showEditModal = ref(false)
const saving = ref(false)
const editing = ref<Channel | null>(null)

const form = ref({
  name: '',
  description: '',
  channelType: 'EMAIL',
  slug: '',
  sortOrder: 0
})

async function fetchChannels() {
  loading.value = true
  try {
    const data = await $fetch<{ channels: Channel[] }>('/api/admin/marketing/channels')
    channels.value = data.channels
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to load channels')
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editing.value = null
  form.value = { name: '', description: '', channelType: 'EMAIL', slug: '', sortOrder: 0 }
  showEditModal.value = true
}

function editChannel(channel: Channel) {
  editing.value = channel
  form.value = {
    name: channel.name,
    description: channel.description || '',
    channelType: channel.channelType,
    slug: channel.slug,
    sortOrder: channel.sortOrder
  }
  showEditModal.value = true
}

async function handleSave() {
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/admin/marketing/channels/${editing.value.id}`, {
        method: 'PUT',
        body: form.value
      })
      toast.success('Channel updated')
    } else {
      await $fetch('/api/admin/marketing/channels', {
        method: 'POST',
        body: form.value
      })
      toast.success('Channel created')
    }
    showEditModal.value = false
    await fetchChannels()
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to save channel')
  } finally {
    saving.value = false
  }
}

async function toggleActive(channel: Channel) {
  const newActive = channel.isActive === 1 ? 0 : 1
  try {
    if (newActive === 0) {
      await $fetch(`/api/admin/marketing/channels/${channel.id}`, { method: 'DELETE' })
    } else {
      await $fetch(`/api/admin/marketing/channels/${channel.id}`, {
        method: 'PUT',
        body: { isActive: 1 }
      })
    }
    channel.isActive = newActive
    toast.success(newActive ? 'Channel activated' : 'Channel deactivated')
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to update channel')
  }
}

onMounted(() => {
  fetchChannels()
})
</script>
