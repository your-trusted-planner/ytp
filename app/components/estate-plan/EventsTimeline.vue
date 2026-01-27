<template>
  <div class="flow-root">
    <ul role="list" class="-mb-8">
      <li v-for="(event, index) in sortedEvents" :key="event.id">
        <div class="relative pb-8">
          <!-- Connecting line -->
          <span
            v-if="index !== sortedEvents.length - 1"
            class="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
            aria-hidden="true"
          />

          <div class="relative flex space-x-3">
            <!-- Icon -->
            <div>
              <span
                class="h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white"
                :class="getEventBgClass(event.eventType)"
              >
                <component
                  :is="getEventIcon(event.eventType)"
                  class="h-4 w-4 text-white"
                />
              </span>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-gray-900">
                  {{ getEventLabel(event.eventType) }}
                </p>
                <time class="text-sm text-gray-500">
                  {{ formatDate(event.eventDate) }}
                </time>
              </div>

              <p v-if="event.description" class="mt-1 text-sm text-gray-600">
                {{ event.description }}
              </p>

              <p v-if="event.personName" class="mt-1 text-sm text-gray-500">
                <User class="w-3 h-3 inline mr-1" />
                {{ event.personName }}
              </p>

              <p v-if="event.notes" class="mt-2 text-sm text-gray-400 italic">
                {{ event.notes }}
              </p>
            </div>
          </div>
        </div>
      </li>
    </ul>

    <!-- Empty state -->
    <div v-if="events.length === 0" class="text-center py-8 text-gray-500">
      <Calendar class="w-12 h-12 mx-auto mb-3 text-gray-300" />
      <p>No events recorded</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  FilePlus, PenTool, Edit, RefreshCw, AlertCircle, CheckCircle,
  Heart, Play, UserCheck, DollarSign, ClipboardList, Send, Mail,
  FileText, XSquare, Archive, MessageSquare, File, Calendar, User
} from 'lucide-vue-next'

// Define type to work with API response
interface EventData {
  id: string
  eventType: string
  eventDate: string
  description: string | null
  notes: string | null
  personName?: string | null
  distributionAmount?: number | null
  distributionDescription?: string | null
  createdAt: string
}

interface Props {
  events: EventData[]
}

const props = defineProps<Props>()

const eventConfig: Record<string, { label: string; icon: any; bgClass: string }> = {
  PLAN_CREATED: { label: 'Plan Created', icon: FilePlus, bgClass: 'bg-blue-500' },
  PLAN_SIGNED: { label: 'Documents Signed', icon: PenTool, bgClass: 'bg-green-500' },
  PLAN_AMENDED: { label: 'Plan Amended', icon: Edit, bgClass: 'bg-purple-500' },
  PLAN_RESTATED: { label: 'Plan Restated', icon: RefreshCw, bgClass: 'bg-purple-500' },
  GRANTOR_INCAPACITATED: { label: 'Grantor Incapacitated', icon: AlertCircle, bgClass: 'bg-orange-500' },
  GRANTOR_CAPACITY_RESTORED: { label: 'Capacity Restored', icon: CheckCircle, bgClass: 'bg-green-500' },
  GRANTOR_DEATH: { label: 'Grantor Passed Away', icon: Heart, bgClass: 'bg-gray-500' },
  CO_GRANTOR_DEATH: { label: 'Co-Grantor Passed Away', icon: Heart, bgClass: 'bg-gray-500' },
  ADMINISTRATION_STARTED: { label: 'Administration Started', icon: Play, bgClass: 'bg-blue-500' },
  SUCCESSOR_TRUSTEE_APPOINTED: { label: 'Successor Trustee Appointed', icon: UserCheck, bgClass: 'bg-blue-500' },
  TRUST_FUNDED: { label: 'Trust Funded', icon: DollarSign, bgClass: 'bg-green-500' },
  ASSETS_VALUED: { label: 'Assets Valued', icon: ClipboardList, bgClass: 'bg-blue-500' },
  DISTRIBUTION_MADE: { label: 'Distribution Made', icon: Send, bgClass: 'bg-green-500' },
  PARTIAL_DISTRIBUTION: { label: 'Partial Distribution', icon: Send, bgClass: 'bg-blue-500' },
  TAX_RETURN_FILED: { label: 'Tax Return Filed', icon: FileText, bgClass: 'bg-blue-500' },
  NOTICE_SENT: { label: 'Notice Sent', icon: Mail, bgClass: 'bg-blue-500' },
  FINAL_DISTRIBUTION: { label: 'Final Distribution', icon: CheckCircle, bgClass: 'bg-green-500' },
  TRUST_TERMINATED: { label: 'Trust Terminated', icon: XSquare, bgClass: 'bg-gray-500' },
  PLAN_CLOSED: { label: 'Plan Closed', icon: Archive, bgClass: 'bg-gray-500' },
  NOTE_ADDED: { label: 'Note Added', icon: MessageSquare, bgClass: 'bg-blue-400' },
  DOCUMENT_ADDED: { label: 'Document Added', icon: File, bgClass: 'bg-blue-400' },
  OTHER: { label: 'Event', icon: Calendar, bgClass: 'bg-gray-400' }
}

const sortedEvents = computed(() => {
  return [...props.events].sort((a, b) =>
    new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  )
})

function getEventLabel(eventType: string): string {
  return eventConfig[eventType]?.label || eventType
}

function getEventIcon(eventType: string): any {
  return eventConfig[eventType]?.icon || Calendar
}

function getEventBgClass(eventType: string): string {
  return eventConfig[eventType]?.bgClass || 'bg-gray-400'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>
