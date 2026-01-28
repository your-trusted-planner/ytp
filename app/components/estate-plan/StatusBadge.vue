<template>
  <UiBadge :variant="badgeVariant" :class="props.class">
    <component v-if="showIcon" :is="statusIcon" class="w-3 h-3 mr-1" />
    {{ statusLabel }}
  </UiBadge>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  FileText, CheckCircle, Edit, AlertTriangle,
  Activity, Send, Archive
} from 'lucide-vue-next'

interface Props {
  status: 'DRAFT' | 'ACTIVE' | 'AMENDED' | 'INCAPACITATED' | 'ADMINISTERED' | 'DISTRIBUTED' | 'CLOSED'
  showIcon?: boolean
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  showIcon: false
})

const statusConfig = {
  DRAFT: {
    label: 'Draft',
    variant: 'default' as const,
    icon: FileText
  },
  ACTIVE: {
    label: 'Active',
    variant: 'success' as const,
    icon: CheckCircle
  },
  AMENDED: {
    label: 'Amended',
    variant: 'info' as const,
    icon: Edit
  },
  INCAPACITATED: {
    label: 'Incapacitated',
    variant: 'warning' as const,
    icon: AlertTriangle
  },
  ADMINISTERED: {
    label: 'In Administration',
    variant: 'warning' as const,
    icon: Activity
  },
  DISTRIBUTED: {
    label: 'Distributed',
    variant: 'info' as const,
    icon: Send
  },
  CLOSED: {
    label: 'Closed',
    variant: 'default' as const,
    icon: Archive
  }
}

const badgeVariant = computed(() => statusConfig[props.status]?.variant || 'default')
const statusLabel = computed(() => statusConfig[props.status]?.label || props.status)
const statusIcon = computed(() => statusConfig[props.status]?.icon || FileText)
</script>
