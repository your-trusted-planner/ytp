<template>
  <div
    class="flex -space-x-2"
    :title="tooltipText"
  >
    <div
      v-for="(person, idx) in visiblePeople"
      :key="person.userId || idx"
      class="relative inline-flex items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600"
      :class="sizeClasses"
    >
      <img
        v-if="person.avatar"
        :src="person.avatar"
        :alt="personName(person)"
        class="rounded-full object-cover"
        :class="sizeClasses"
      >
      <span v-else>{{ initials(person) }}</span>
    </div>
    <div
      v-if="overflow > 0"
      class="relative inline-flex items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-medium text-gray-500"
      :class="sizeClasses"
    >
      +{{ overflow }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Person {
  userId?: string
  firstName?: string
  lastName?: string
  avatar?: string | null
  email?: string
}

const props = withDefaults(defineProps<{
  people: Person[]
  max?: number
  size?: 'sm' | 'md' | 'lg'
}>(), {
  max: 3,
  size: 'sm'
})

const sizeClasses = computed(() => ({
  'w-6 h-6': props.size === 'sm',
  'w-8 h-8': props.size === 'md',
  'w-10 h-10': props.size === 'lg'
}))

const visiblePeople = computed(() => props.people.slice(0, props.max))
const overflow = computed(() => Math.max(0, props.people.length - props.max))

function personName(person: Person): string {
  return [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email || ''
}

function initials(person: Person): string {
  const first = person.firstName?.charAt(0) || ''
  const last = person.lastName?.charAt(0) || ''
  if (first || last) return (first + last).toUpperCase()
  return person.email?.charAt(0)?.toUpperCase() || '?'
}

const tooltipText = computed(() =>
  props.people.map(p => personName(p)).join(', ')
)
</script>
