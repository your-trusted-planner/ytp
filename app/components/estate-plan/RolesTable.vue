<template>
  <div class="space-y-6">
    <!-- View Mode Toggle for Joint Plans -->
    <div v-if="hasPersonSpecificRoles" class="flex items-center gap-4 pb-4 border-b border-gray-200">
      <span class="text-sm text-gray-500">View:</span>
      <button
        @click="viewMode = 'category'"
        :class="[
          'px-3 py-1 text-sm rounded-lg transition-colors',
          viewMode === 'category'
            ? 'bg-burgundy-100 text-burgundy-700'
            : 'text-gray-600 hover:bg-gray-100'
        ]"
      >
        By Category
      </button>
      <button
        @click="viewMode = 'person'"
        :class="[
          'px-3 py-1 text-sm rounded-lg transition-colors',
          viewMode === 'person'
            ? 'bg-burgundy-100 text-burgundy-700'
            : 'text-gray-600 hover:bg-gray-100'
        ]"
      >
        By Person
      </button>
    </div>

    <!-- Category View -->
    <template v-if="viewMode === 'category'">
      <div v-for="category in categorizedRoles" :key="category.key">
        <div class="flex items-center gap-2 mb-3">
          <component :is="category.icon" class="w-5 h-5 text-gray-500" />
          <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {{ category.label }}
          </h3>
          <span class="text-sm text-gray-400">({{ category.roles.length }})</span>
        </div>

        <div class="grid gap-2">
          <EstatePlanRoleCard
            v-for="role in category.roles"
            :key="role.id"
            :role="role"
            :show-actions="showActions"
            :show-for-person="hasPersonSpecificRoles"
            @edit="$emit('edit', $event)"
          />
        </div>
      </div>
    </template>

    <!-- Person View (for joint plans) -->
    <template v-else>
      <!-- Plan-Level Roles -->
      <div v-if="planLevelRoles.length > 0" class="mb-6">
        <div class="flex items-center gap-2 mb-3">
          <Landmark class="w-5 h-5 text-blue-500" />
          <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Trust Roles (Plan-Level)
          </h3>
          <span class="text-sm text-gray-400">({{ planLevelRoles.length }})</span>
        </div>
        <div class="grid gap-2">
          <EstatePlanRoleCard
            v-for="role in planLevelRoles"
            :key="role.id"
            :role="role"
            :show-actions="showActions"
            @edit="$emit('edit', $event)"
          />
        </div>
      </div>

      <!-- Roles by Person -->
      <div v-for="personGroup in rolesByPerson" :key="personGroup.personId" class="mb-6">
        <div class="flex items-center gap-2 mb-3">
          <div :class="[
            'w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold',
            personGroup.colorClass
          ]">
            {{ personGroup.initials }}
          </div>
          <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {{ personGroup.personName }}'s Document Roles
          </h3>
          <span class="text-sm text-gray-400">({{ personGroup.roles.length }})</span>
        </div>
        <div class="grid gap-2">
          <EstatePlanRoleCard
            v-for="role in personGroup.roles"
            :key="role.id"
            :role="role"
            :show-actions="showActions"
            :show-document-context="true"
            @edit="$emit('edit', $event)"
          />
        </div>
      </div>
    </template>

    <!-- Empty state -->
    <div v-if="roles.length === 0" class="text-center py-8 text-gray-500">
      <Users class="w-12 h-12 mx-auto mb-3 text-gray-300" />
      <p>No roles assigned yet</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { User, Briefcase, Gift, Shield, Users, Landmark } from 'lucide-vue-next'

// Define types to work with API response
interface PersonData {
  id: string
  fullName: string
  firstName?: string
  lastName?: string
  email?: string | null
}

interface RoleData {
  id: string
  personId: string
  person: PersonData | null
  forPersonId?: string | null
  forPerson?: PersonData | null
  willId?: string | null
  ancillaryDocumentId?: string | null
  roleCategory: string
  roleType: string
  isPrimary: boolean
  ordinal: number
  sharePercentage?: number | null
  shareType?: string | null
  conditions?: string | null
  status: string
}

interface Props {
  roles: RoleData[]
  showActions?: boolean
  primaryPerson?: PersonData | null
  secondaryPerson?: PersonData | null
}

const props = withDefaults(defineProps<Props>(), {
  showActions: false
})

defineEmits<{
  edit: [role: RoleData]
}>()

const viewMode = ref<'category' | 'person'>('category')

const categoryConfig = [
  { key: 'GRANTOR', label: 'Grantors / Settlors', icon: User },
  { key: 'FIDUCIARY', label: 'Fiduciaries', icon: Briefcase },
  { key: 'BENEFICIARY', label: 'Beneficiaries', icon: Gift },
  { key: 'GUARDIAN', label: 'Guardians', icon: Shield },
  { key: 'OTHER', label: 'Other', icon: Users }
]

// Check if there are person-specific roles (joint plan)
const hasPersonSpecificRoles = computed(() =>
  props.roles.some(r => r.forPersonId)
)

// Plan-level roles (no forPersonId)
const planLevelRoles = computed(() =>
  props.roles
    .filter(r => !r.forPersonId)
    .sort((a, b) => {
      // Sort by category, then primary first, then ordinal
      if (a.roleCategory !== b.roleCategory) {
        const categoryOrder = ['GRANTOR', 'FIDUCIARY', 'BENEFICIARY', 'GUARDIAN', 'OTHER']
        return categoryOrder.indexOf(a.roleCategory) - categoryOrder.indexOf(b.roleCategory)
      }
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
      return a.ordinal - b.ordinal
    })
)

// Group person-specific roles by person
const rolesByPerson = computed(() => {
  const personRoles = props.roles.filter(r => r.forPersonId)
  const grouped = new Map<string, MockPlanRole[]>()

  for (const role of personRoles) {
    const key = role.forPersonId!
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(role)
  }

  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500']
  let colorIndex = 0

  return Array.from(grouped.entries()).map(([personId, roles]) => {
    // Find the person name from the forPerson field or look up
    const sampleRole = roles[0]
    const personName = sampleRole.forPerson?.fullName || 'Unknown'
    const initials = personName.split(' ').map(n => n[0]).join('').slice(0, 2)

    return {
      personId,
      personName,
      initials,
      colorClass: colors[colorIndex++ % colors.length],
      roles: roles.sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
        return a.ordinal - b.ordinal
      })
    }
  })
})

const categorizedRoles = computed(() => {
  return categoryConfig
    .map(config => ({
      ...config,
      roles: props.roles
        .filter(r => r.roleCategory === config.key)
        .sort((a, b) => {
          // Primary first, then by ordinal
          if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
          return a.ordinal - b.ordinal
        })
    }))
    .filter(category => category.roles.length > 0)
})
</script>
