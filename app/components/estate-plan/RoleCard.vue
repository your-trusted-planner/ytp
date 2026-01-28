<template>
  <div class="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
    <div
      class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
      :class="avatarClass"
    >
      {{ initials }}
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 flex-wrap">
        <p class="text-sm font-medium text-gray-900 truncate">
          {{ role.person.fullName }}
        </p>
        <UiBadge v-if="role.isPrimary" size="sm" variant="info">
          Primary
        </UiBadge>
        <UiBadge v-if="role.status !== 'ACTIVE'" size="sm" :variant="statusVariant">
          {{ role.status }}
        </UiBadge>
      </div>
      <p class="text-sm text-gray-500">
        {{ roleTypeLabel }}
      </p>
      <!-- Show whose document this role is for (in joint plans) -->
      <div v-if="showForPerson && role.forPerson" class="mt-1 flex items-center gap-1 text-xs text-gray-400">
        <span>for</span>
        <span class="font-medium text-gray-500">{{ role.forPerson.fullName }}</span>
        <span v-if="documentContext" class="text-gray-400">({{ documentContext }})</span>
      </div>
      <!-- Show document context in person view -->
      <div v-else-if="showDocumentContext && documentContext" class="mt-1 text-xs text-gray-400">
        {{ documentContext }}
      </div>
      <div v-if="role.sharePercentage" class="mt-1 text-xs text-gray-400">
        {{ role.sharePercentage }}% {{ role.shareType === 'PER_STIRPES' ? '(per stirpes)' : '' }}
      </div>
      <div v-if="role.conditions" class="mt-1 text-xs text-gray-400 italic">
        {{ role.conditions }}
      </div>
    </div>
    <div v-if="showActions" class="flex-shrink-0">
      <button
        @click="$emit('edit', role)"
        class="p-1 text-gray-400 hover:text-gray-600 rounded"
      >
        <Edit2 class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Edit2 } from 'lucide-vue-next'

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

// Role type labels
const roleTypeLabels: Record<string, string> = {
  GRANTOR: 'Grantor',
  CO_GRANTOR: 'Co-Grantor',
  TESTATOR: 'Testator',
  TRUSTEE: 'Trustee',
  CO_TRUSTEE: 'Co-Trustee',
  SUCCESSOR_TRUSTEE: 'Successor Trustee',
  DISTRIBUTION_TRUSTEE: 'Distribution Trustee',
  PRIMARY_BENEFICIARY: 'Primary Beneficiary',
  CONTINGENT_BENEFICIARY: 'Contingent Beneficiary',
  REMAINDER_BENEFICIARY: 'Remainder Beneficiary',
  INCOME_BENEFICIARY: 'Income Beneficiary',
  PRINCIPAL_BENEFICIARY: 'Principal Beneficiary',
  EXECUTOR: 'Executor',
  CO_EXECUTOR: 'Co-Executor',
  ALTERNATE_EXECUTOR: 'Alternate Executor',
  FINANCIAL_AGENT: 'Financial Agent',
  ALTERNATE_FINANCIAL_AGENT: 'Alternate Financial Agent',
  HEALTHCARE_AGENT: 'Healthcare Agent',
  ALTERNATE_HEALTHCARE_AGENT: 'Alternate Healthcare Agent',
  GUARDIAN_OF_PERSON: 'Guardian of Person',
  GUARDIAN_OF_ESTATE: 'Guardian of Estate',
  ALTERNATE_GUARDIAN_OF_PERSON: 'Alternate Guardian of Person',
  ALTERNATE_GUARDIAN_OF_ESTATE: 'Alternate Guardian of Estate',
  TRUST_PROTECTOR: 'Trust Protector',
  INVESTMENT_ADVISOR: 'Investment Advisor',
  WITNESS: 'Witness',
  NOTARY: 'Notary'
}

interface Props {
  role: RoleData
  showActions?: boolean
  showForPerson?: boolean  // Show "for [person]" context
  showDocumentContext?: boolean  // Show document type context
}

const props = withDefaults(defineProps<Props>(), {
  showActions: false,
  showForPerson: false,
  showDocumentContext: false
})

defineEmits<{
  edit: [role: RoleData]
}>()

const initials = computed(() => {
  const first = props.role.person.firstName?.[0] || ''
  const last = props.role.person.lastName?.[0] || ''
  return (first + last).toUpperCase()
})

const roleTypeLabel = computed(() => {
  return roleTypeLabels[props.role.roleType] || props.role.roleType
})

// Determine what document this role is associated with
const documentContext = computed(() => {
  if (props.role.willId) {
    return 'Will'
  }
  if (props.role.ancillaryDocumentId) {
    // Try to infer document type from role type
    if (['FINANCIAL_AGENT', 'ALTERNATE_FINANCIAL_AGENT'].includes(props.role.roleType)) {
      return 'Financial POA'
    }
    if (['HEALTHCARE_AGENT', 'ALTERNATE_HEALTHCARE_AGENT'].includes(props.role.roleType)) {
      return 'Healthcare POA'
    }
    return 'Ancillary Document'
  }
  // Infer from role type even without explicit document link
  if (['EXECUTOR', 'CO_EXECUTOR', 'ALTERNATE_EXECUTOR'].includes(props.role.roleType)) {
    return 'Will'
  }
  if (['FINANCIAL_AGENT', 'ALTERNATE_FINANCIAL_AGENT'].includes(props.role.roleType)) {
    return 'Financial POA'
  }
  if (['HEALTHCARE_AGENT', 'ALTERNATE_HEALTHCARE_AGENT'].includes(props.role.roleType)) {
    return 'Healthcare POA'
  }
  if (['GUARDIAN_OF_PERSON', 'GUARDIAN_OF_ESTATE', 'ALTERNATE_GUARDIAN_OF_PERSON', 'ALTERNATE_GUARDIAN_OF_ESTATE'].includes(props.role.roleType)) {
    return 'Guardian Nomination'
  }
  return null
})

const avatarClass = computed(() => {
  const categoryColors: Record<string, string> = {
    GRANTOR: 'bg-purple-100 text-purple-700',
    FIDUCIARY: 'bg-blue-100 text-blue-700',
    BENEFICIARY: 'bg-green-100 text-green-700',
    GUARDIAN: 'bg-yellow-100 text-yellow-700',
    OTHER: 'bg-gray-100 text-gray-700'
  }
  return categoryColors[props.role.roleCategory] || categoryColors.OTHER
})

const statusVariant = computed(() => {
  const variants: Record<string, 'default' | 'warning' | 'danger' | 'success'> = {
    ACTIVE: 'success',
    SUCCEEDED: 'default',
    DECLINED: 'warning',
    DECEASED: 'default',
    REMOVED: 'danger',
    TERMINATED: 'default'
  }
  return variants[props.role.status] || 'default'
})
</script>
