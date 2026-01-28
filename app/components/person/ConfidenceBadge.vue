<template>
  <span :class="badgeClasses">
    <span v-if="showIcon" class="mr-1">
      <CheckCircle v-if="level === 'high'" class="w-3 h-3" />
      <AlertCircle v-else-if="level === 'medium'" class="w-3 h-3" />
      <HelpCircle v-else class="w-3 h-3" />
    </span>
    {{ confidence }}%
    <span v-if="showLabel" class="ml-1 capitalize">{{ level }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle, AlertCircle, HelpCircle } from 'lucide-vue-next'

interface Props {
  confidence: number
  showIcon?: boolean
  showLabel?: boolean
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  showIcon: false,
  showLabel: false,
  size: 'sm'
})

const level = computed(() => {
  if (props.confidence >= 85) return 'high'
  if (props.confidence >= 60) return 'medium'
  return 'low'
})

const badgeClasses = computed(() => {
  const base = 'inline-flex items-center font-medium rounded-full'

  const sizeClasses = props.size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-0.5 text-sm'

  const colorClasses = {
    high: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-gray-100 text-gray-600'
  }

  return `${base} ${sizeClasses} ${colorClasses[level.value]}`
})
</script>
