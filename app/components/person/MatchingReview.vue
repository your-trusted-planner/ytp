<template>
  <div class="space-y-6">
    <!-- Summary Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">Review People</h3>
        <p class="text-sm text-gray-600 mt-1">
          {{ extractedPeople.length }} {{ extractedPeople.length === 1 ? 'person' : 'people' }} found in import.
          <span v-if="matchCount > 0" class="text-amber-600 font-medium">
            {{ matchCount }} with potential duplicates.
          </span>
        </p>
      </div>

      <!-- Quick actions -->
      <div class="flex items-center gap-2">
        <button
          v-if="matchCount > 0"
          @click="acceptAllHighConfidence"
          class="text-sm text-burgundy-600 hover:text-burgundy-700 font-medium"
        >
          Accept all high-confidence matches
        </button>
        <button
          @click="createAllNew"
          class="text-sm text-gray-600 hover:text-gray-700"
        >
          Create all new
        </button>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="border-b border-gray-200">
      <nav class="flex gap-4" aria-label="Person type filter">
        <button
          v-for="tab in filterTabs"
          :key="tab.key"
          @click="activeFilter = tab.key"
          :class="[
            'pb-2 px-1 text-sm font-medium border-b-2 transition-colors',
            activeFilter === tab.key
              ? 'border-burgundy-600 text-burgundy-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          {{ tab.label }}
          <span
            :class="[
              'ml-1 px-1.5 py-0.5 rounded-full text-xs',
              activeFilter === tab.key ? 'bg-burgundy-100 text-burgundy-600' : 'bg-gray-100 text-gray-600'
            ]"
          >
            {{ tab.count }}
          </span>
        </button>
      </nav>
    </div>

    <!-- People list -->
    <div class="space-y-4">
      <TransitionGroup name="list">
        <PersonMatchCard
          v-for="person in filteredPeople"
          :key="person.extractedName"
          :person="person"
          :model-value="decisions[person.extractedName] || 'create_new'"
          @update:model-value="updateDecision(person.extractedName, $event)"
        />
      </TransitionGroup>

      <p v-if="filteredPeople.length === 0" class="text-center py-8 text-gray-500">
        No people in this category
      </p>
    </div>

    <!-- Decision summary -->
    <div class="bg-gray-50 rounded-lg p-4">
      <h4 class="text-sm font-semibold text-gray-700 mb-3">Import Summary</h4>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-gray-600">Link to existing:</span>
          <span class="font-medium text-gray-900 ml-2">{{ linkCount }}</span>
        </div>
        <div>
          <span class="text-gray-600">Create new:</span>
          <span class="font-medium text-gray-900 ml-2">{{ createCount }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PersonMatchCard from './MatchCard.vue'

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

interface PersonDecision {
  extractedName: string
  action: 'use_existing' | 'create_new'
  existingPersonId?: string
}

interface Props {
  extractedPeople: ExtractedPerson[]
  modelValue?: PersonDecision[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => []
})

const emit = defineEmits<{
  'update:modelValue': [value: PersonDecision[]]
}>()

// Internal state for decisions (name -> 'create_new' or personId)
const decisions = ref<Record<string, string>>({})

// Initialize decisions from modelValue
watch(() => props.modelValue, (newVal) => {
  const newDecisions: Record<string, string> = {}
  for (const decision of newVal) {
    if (decision.action === 'create_new') {
      newDecisions[decision.extractedName] = 'create_new'
    } else if (decision.existingPersonId) {
      newDecisions[decision.extractedName] = decision.existingPersonId
    }
  }
  decisions.value = newDecisions
}, { immediate: true })

// Initialize missing decisions to 'create_new'
watch(() => props.extractedPeople, (people) => {
  for (const person of people) {
    if (!(person.extractedName in decisions.value)) {
      // Auto-select high confidence match or default to create_new
      const highConfidenceMatch = person.matches.find(m => m.confidence >= 90)
      decisions.value[person.extractedName] = highConfidenceMatch?.personId || 'create_new'
    }
  }
  emitDecisions()
}, { immediate: true })

// Filter state
const activeFilter = ref<string>('all')

const filterTabs = computed(() => {
  const counts = {
    all: props.extractedPeople.length,
    client: 0,
    spouse: 0,
    child: 0,
    beneficiary: 0,
    fiduciary: 0,
    withMatches: 0
  }

  for (const person of props.extractedPeople) {
    counts[person.role]++
    if (person.matches.length > 0) counts.withMatches++
  }

  return [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'withMatches', label: 'With Matches', count: counts.withMatches },
    { key: 'client', label: 'Clients', count: counts.client },
    { key: 'spouse', label: 'Spouses', count: counts.spouse },
    { key: 'fiduciary', label: 'Fiduciaries', count: counts.fiduciary },
    { key: 'beneficiary', label: 'Beneficiaries', count: counts.beneficiary },
    { key: 'child', label: 'Children', count: counts.child }
  ].filter(tab => tab.count > 0 || tab.key === 'all')
})

const filteredPeople = computed(() => {
  if (activeFilter.value === 'all') return props.extractedPeople
  if (activeFilter.value === 'withMatches') {
    return props.extractedPeople.filter(p => p.matches.length > 0)
  }
  return props.extractedPeople.filter(p => p.role === activeFilter.value)
})

// Stats
const matchCount = computed(() =>
  props.extractedPeople.filter(p => p.matches.length > 0).length
)

const linkCount = computed(() =>
  Object.values(decisions.value).filter(v => v !== 'create_new').length
)

const createCount = computed(() =>
  Object.values(decisions.value).filter(v => v === 'create_new').length
)

// Actions
function updateDecision(name: string, value: string) {
  decisions.value[name] = value
  emitDecisions()
}

function emitDecisions() {
  const result: PersonDecision[] = []

  for (const [name, value] of Object.entries(decisions.value)) {
    if (value === 'create_new') {
      result.push({ extractedName: name, action: 'create_new' })
    } else {
      result.push({ extractedName: name, action: 'use_existing', existingPersonId: value })
    }
  }

  emit('update:modelValue', result)
}

function acceptAllHighConfidence() {
  for (const person of props.extractedPeople) {
    const highMatch = person.matches.find(m => m.confidence >= 85)
    if (highMatch) {
      decisions.value[person.extractedName] = highMatch.personId
    }
  }
  emitDecisions()
}

function createAllNew() {
  for (const person of props.extractedPeople) {
    decisions.value[person.extractedName] = 'create_new'
  }
  emitDecisions()
}
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
