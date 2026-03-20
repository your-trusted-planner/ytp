<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <!-- Left: Navigation -->
    <div class="flex items-center gap-2">
      <UiButton
        size="sm"
        variant="outline"
        @click="$emit('today')"
      >
        Today
      </UiButton>
      <button
        class="p-1.5 rounded hover:bg-gray-100"
        @click="$emit('back')"
      >
        <ChevronLeft class="w-5 h-5 text-gray-600" />
      </button>
      <button
        class="p-1.5 rounded hover:bg-gray-100"
        @click="$emit('forward')"
      >
        <ChevronRight class="w-5 h-5 text-gray-600" />
      </button>
      <h2 class="text-lg font-semibold text-gray-900 ml-2">
        {{ dateLabel }}
      </h2>
    </div>

    <!-- Right: Controls -->
    <div class="flex items-center gap-3">
      <!-- Team/Individual toggle -->
      <div class="inline-flex rounded-lg border border-gray-200 bg-white">
        <button
          class="px-3 py-1.5 text-sm rounded-l-lg transition-colors"
          :class="viewType === 'team' ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:text-gray-900'"
          @click="$emit('update:viewType', 'team')"
        >
          <Users class="w-4 h-4 inline mr-1" />
          Team
        </button>
        <button
          class="px-3 py-1.5 text-sm rounded-r-lg transition-colors"
          :class="viewType === 'individual' ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:text-gray-900'"
          @click="$emit('update:viewType', 'individual')"
        >
          <User class="w-4 h-4 inline mr-1" />
          Mine
        </button>
      </div>

      <!-- View mode toggle -->
      <div class="inline-flex rounded-lg border border-gray-200 bg-white">
        <button
          v-for="mode in viewModes"
          :key="mode.value"
          class="px-3 py-1.5 text-sm transition-colors"
          :class="[
            viewMode === mode.value ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:text-gray-900',
            mode.value === 'week' ? 'rounded-l-lg' : '',
            mode.value === 'agenda' ? 'rounded-r-lg' : ''
          ]"
          @click="$emit('update:viewMode', mode.value)"
        >
          {{ mode.label }}
        </button>
      </div>

      <!-- New Appointment -->
      <UiButton @click="$emit('newAppointment')">
        <Plus class="w-4 h-4 mr-1" />
        New
      </UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight, Users, User, Plus } from 'lucide-vue-next'
import type { ViewMode, ViewType } from '~/stores/useCalendarStore'

defineProps<{
  dateLabel: string
  viewMode: ViewMode
  viewType: ViewType
}>()

defineEmits<{
  'today': []
  'back': []
  'forward': []
  'newAppointment': []
  'update:viewMode': [mode: ViewMode]
  'update:viewType': [type: ViewType]
}>()

const viewModes = [
  { value: 'week' as const, label: 'Week' },
  { value: 'month' as const, label: 'Month' },
  { value: 'agenda' as const, label: 'Agenda' }
]
</script>
