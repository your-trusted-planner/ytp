<template>
  <div class="border rounded-lg overflow-hidden" :class="cardBorderClass">
    <!-- Header: Extracted Person Info -->
    <div class="px-4 py-3" :class="cardHeaderClass">
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-2">
            <component :is="roleIcon" class="w-4 h-4" :class="roleIconClass" />
            <h4 class="font-medium text-gray-900">{{ person.extractedName }}</h4>
          </div>
          <div class="mt-1 flex flex-wrap gap-1">
            <span
              v-for="role in person.rolesInPlan"
              :key="role"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/50"
              :class="roleBadgeClass"
            >
              {{ role }}
            </span>
          </div>
        </div>
        <div v-if="person.extractedEmail || person.extractedDateOfBirth" class="text-right text-sm">
          <p v-if="person.extractedEmail" class="text-gray-600">{{ person.extractedEmail }}</p>
          <p v-if="person.extractedDateOfBirth" class="text-gray-500">DOB: {{ person.extractedDateOfBirth }}</p>
        </div>
      </div>
    </div>

    <!-- Decision Section -->
    <div class="px-4 py-3 bg-white">
      <!-- Has matches -->
      <div v-if="person.matches.length > 0" class="space-y-2">
        <p class="text-sm text-gray-600 mb-2">
          {{ person.matches.length }} potential match{{ person.matches.length > 1 ? 'es' : '' }} found:
        </p>

        <!-- Match options -->
        <label
          v-for="match in displayedMatches"
          :key="match.personId"
          class="flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors"
          :class="selectedValue === match.personId
            ? 'border-burgundy-500 bg-burgundy-50'
            : 'border-gray-200 hover:bg-gray-50'"
        >
          <input
            type="radio"
            :name="`match-${person.extractedName}`"
            :value="match.personId"
            :checked="selectedValue === match.personId"
            @change="selectMatch(match.personId)"
            class="mt-1 text-burgundy-600 focus:ring-burgundy-500"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-gray-900">{{ match.personName }}</span>
              <ConfidenceBadge :confidence="match.confidence" show-icon />
            </div>
            <div class="mt-1 text-sm text-gray-500">
              <span class="capitalize">{{ formatMatchType(match.matchType) }}</span>
              <span v-if="match.email" class="ml-2">{{ match.email }}</span>
            </div>
          </div>
        </label>

        <!-- Show more matches -->
        <button
          v-if="person.matches.length > 3 && !showAllMatches"
          @click="showAllMatches = true"
          class="text-sm text-burgundy-600 hover:text-burgundy-700 font-medium"
        >
          Show {{ person.matches.length - 3 }} more match{{ person.matches.length - 3 > 1 ? 'es' : '' }}...
        </button>

        <!-- Create new option -->
        <label
          class="flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors"
          :class="selectedValue === 'create_new'
            ? 'border-burgundy-500 bg-burgundy-50'
            : 'border-gray-200 hover:bg-gray-50'"
        >
          <input
            type="radio"
            :name="`match-${person.extractedName}`"
            value="create_new"
            :checked="selectedValue === 'create_new'"
            @change="selectMatch('create_new')"
            class="mt-1 text-burgundy-600 focus:ring-burgundy-500"
          />
          <div>
            <span class="font-medium text-gray-900">Create New Person</span>
            <p class="text-sm text-gray-500">Don't link to any existing record</p>
          </div>
        </label>
      </div>

      <!-- No matches found -->
      <div v-else class="text-center py-2">
        <p class="text-sm text-gray-500">No existing matches found</p>
        <p class="text-xs text-gray-400 mt-1">A new person record will be created</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { User, Users, Heart, Shield, UserCheck } from 'lucide-vue-next'
import ConfidenceBadge from './ConfidenceBadge.vue'

interface PersonMatch {
  personId: string
  personName: string
  email?: string | null
  dateOfBirth?: string | null
  matchType: string
  confidence: number
  matchingFields: string[]
}

interface ExtractedPerson {
  extractedName: string
  extractedEmail?: string
  extractedDateOfBirth?: string
  role: 'client' | 'spouse' | 'child' | 'beneficiary' | 'fiduciary'
  rolesInPlan: string[]
  matches: PersonMatch[]
}

interface Props {
  person: ExtractedPerson
  modelValue?: string // 'create_new' or personId
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 'create_new'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showAllMatches = ref(false)

const selectedValue = computed(() => props.modelValue)

const displayedMatches = computed(() => {
  if (showAllMatches.value) return props.person.matches
  return props.person.matches.slice(0, 3)
})

// Role-based styling
const roleIcon = computed(() => {
  const icons = {
    client: User,
    spouse: Heart,
    child: Users,
    beneficiary: UserCheck,
    fiduciary: Shield
  }
  return icons[props.person.role] || User
})

const roleIconClass = computed(() => {
  const classes = {
    client: 'text-blue-600',
    spouse: 'text-pink-600',
    child: 'text-purple-600',
    beneficiary: 'text-green-600',
    fiduciary: 'text-amber-600'
  }
  return classes[props.person.role] || 'text-gray-600'
})

const cardBorderClass = computed(() => {
  const classes = {
    client: 'border-blue-200',
    spouse: 'border-pink-200',
    child: 'border-purple-200',
    beneficiary: 'border-green-200',
    fiduciary: 'border-amber-200'
  }
  return classes[props.person.role] || 'border-gray-200'
})

const cardHeaderClass = computed(() => {
  const classes = {
    client: 'bg-blue-50',
    spouse: 'bg-pink-50',
    child: 'bg-purple-50',
    beneficiary: 'bg-green-50',
    fiduciary: 'bg-amber-50'
  }
  return classes[props.person.role] || 'bg-gray-50'
})

const roleBadgeClass = computed(() => {
  const classes = {
    client: 'text-blue-700',
    spouse: 'text-pink-700',
    child: 'text-purple-700',
    beneficiary: 'text-green-700',
    fiduciary: 'text-amber-700'
  }
  return classes[props.person.role] || 'text-gray-700'
})

function selectMatch(value: string) {
  emit('update:modelValue', value)
}

function formatMatchType(matchType: string): string {
  const types: Record<string, string> = {
    SSN: 'SSN Match',
    NAME_EMAIL: 'Name & Email',
    NAME_DOB: 'Name & DOB',
    NAME_ONLY: 'Name Only'
  }
  return types[matchType] || matchType
}
</script>
