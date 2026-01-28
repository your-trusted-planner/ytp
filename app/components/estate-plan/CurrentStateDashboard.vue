<template>
  <div class="space-y-6">
    <!-- Plan Header -->
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">{{ plan.planName }}</h2>
        <div class="mt-2 flex items-center gap-3">
          <EstatePlanStatusBadge :status="plan.status" show-icon />
          <span class="text-sm text-gray-500">
            {{ plan.planType === 'TRUST_BASED' ? 'Trust-Based Plan' : 'Will-Based Plan' }}
          </span>
          <span v-if="isJointPlan" class="text-sm text-gray-500">
            <Users class="w-4 h-4 inline mr-1" />
            Joint Plan
          </span>
        </div>
      </div>
    </div>

    <!-- Key Info Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Grantor 1 -->
      <div v-if="plan.grantor1" class="bg-white border border-gray-200 rounded-lg p-4">
        <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <User class="w-4 h-4" />
          <span>{{ plan.planType === 'TRUST_BASED' ? 'Grantor' : 'Testator' }}</span>
        </div>
        <p class="text-lg font-semibold text-gray-900">{{ plan.grantor1.fullName }}</p>
        <p v-if="plan.grantor1.email" class="text-sm text-gray-500">{{ plan.grantor1.email }}</p>
      </div>

      <!-- Grantor 2 (if joint) -->
      <div v-if="plan.grantor2" class="bg-white border border-gray-200 rounded-lg p-4">
        <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Users class="w-4 h-4" />
          <span>Grantor</span>
        </div>
        <p class="text-lg font-semibold text-gray-900">{{ plan.grantor2.fullName }}</p>
        <p v-if="plan.grantor2.email" class="text-sm text-gray-500">{{ plan.grantor2.email }}</p>
      </div>

      <!-- Effective Date -->
      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Calendar class="w-4 h-4" />
          <span>Effective Date</span>
        </div>
        <p class="text-lg font-semibold text-gray-900">
          {{ plan.effectiveDate ? formatDate(plan.effectiveDate) : 'Not yet executed' }}
        </p>
        <p v-if="plan.lastAmendedAt" class="text-sm text-gray-500">
          Last amended {{ formatDate(plan.lastAmendedAt) }}
        </p>
      </div>
    </div>

    <!-- Trust Info (if trust-based) -->
    <div v-if="plan.trust" class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        Trust Information
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <p class="text-sm text-gray-500">Trust Name</p>
          <p class="font-medium text-gray-900">{{ plan.trust.trustName }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Trust Type</p>
          <p class="font-medium text-gray-900">{{ formatTrustType(plan.trust.trustType) }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Revocability</p>
          <p class="font-medium text-gray-900">
            {{ plan.trust.isRevocable ? 'Revocable' : 'Irrevocable' }}
          </p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Jurisdiction</p>
          <p class="font-medium text-gray-900">{{ plan.trust.jurisdiction || 'N/A' }}</p>
        </div>
      </div>
    </div>

    <!-- Documents Summary for Joint Plans -->
    <div v-if="isJointPlan" class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        Individual Documents
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Grantor 1's Documents -->
        <div class="border-l-4 border-blue-400 pl-4">
          <h4 class="font-medium text-gray-900 mb-3">{{ plan.grantor1?.fullName }}</h4>
          <div class="space-y-2 text-sm">
            <div v-if="getPrimaryWill" class="flex items-center gap-2">
              <FileText class="w-4 h-4 text-gray-400" />
              <span>{{ formatWillType(getPrimaryWill.willType) }}</span>
              <UiBadge v-if="getPrimaryWill.executionDate" size="sm" variant="success">Executed</UiBadge>
            </div>
            <div v-for="doc in getPrimaryAncillaryDocs" :key="doc.id" class="flex items-center gap-2">
              <FileText class="w-4 h-4 text-gray-400" />
              <span>{{ formatDocType(doc.documentType) }}</span>
              <UiBadge v-if="doc.status === 'EXECUTED'" size="sm" variant="success">Executed</UiBadge>
            </div>
          </div>
        </div>

        <!-- Grantor 2's Documents -->
        <div class="border-l-4 border-purple-400 pl-4">
          <h4 class="font-medium text-gray-900 mb-3">{{ plan.grantor2?.fullName }}</h4>
          <div class="space-y-2 text-sm">
            <div v-if="getSecondaryWill" class="flex items-center gap-2">
              <FileText class="w-4 h-4 text-gray-400" />
              <span>{{ formatWillType(getSecondaryWill.willType) }}</span>
              <UiBadge v-if="getSecondaryWill.executionDate" size="sm" variant="success">Executed</UiBadge>
            </div>
            <div v-for="doc in getSecondaryAncillaryDocs" :key="doc.id" class="flex items-center gap-2">
              <FileText class="w-4 h-4 text-gray-400" />
              <span>{{ formatDocType(doc.documentType) }}</span>
              <UiBadge v-if="doc.status === 'EXECUTED'" size="sm" variant="success">Executed</UiBadge>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Will Info (for single-person plans) -->
    <div v-else-if="plan.wills.length > 0 && plan.wills[0]" class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        Will Information
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <p class="text-sm text-gray-500">Will Type</p>
          <p class="font-medium text-gray-900">{{ formatWillType(plan.wills[0]?.willType ?? null) }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Execution Date</p>
          <p class="font-medium text-gray-900">
            {{ plan.wills[0]?.executionDate ? formatDate(plan.wills[0].executionDate) : 'Not executed' }}
          </p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Codicils</p>
          <p class="font-medium text-gray-900">{{ plan.wills[0]?.codicilCount ?? 0 }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Jurisdiction</p>
          <p class="font-medium text-gray-900">{{ plan.wills[0]?.jurisdiction || 'N/A' }}</p>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-gray-50 rounded-lg p-4 text-center">
        <p class="text-3xl font-bold text-gray-900">{{ plan.currentVersion }}</p>
        <p class="text-sm text-gray-500">Version</p>
      </div>
      <div class="bg-gray-50 rounded-lg p-4 text-center">
        <p class="text-3xl font-bold text-gray-900">{{ planLevelFiduciaryCount }}</p>
        <p class="text-sm text-gray-500">Trust Fiduciaries</p>
      </div>
      <div class="bg-gray-50 rounded-lg p-4 text-center">
        <p class="text-3xl font-bold text-gray-900">{{ beneficiaryCount }}</p>
        <p class="text-sm text-gray-500">Beneficiaries</p>
      </div>
      <div class="bg-gray-50 rounded-lg p-4 text-center">
        <p class="text-3xl font-bold text-gray-900">{{ plan.events.length }}</p>
        <p class="text-sm text-gray-500">Events</p>
      </div>
    </div>

    <!-- Key Roles Summary -->
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        Key Trust Roles
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Current Trustee(s) -->
        <div v-if="currentTrustees.length > 0">
          <p class="text-sm text-gray-500 mb-2">Current Trustee(s)</p>
          <div v-for="role in currentTrustees" :key="role.id" class="text-sm">
            <span class="font-medium text-gray-900">{{ role.person?.fullName || 'Unknown' }}</span>
          </div>
        </div>

        <!-- Successor Trustees -->
        <div v-if="successorTrustees.length > 0">
          <p class="text-sm text-gray-500 mb-2">Successor Trustee(s)</p>
          <div v-for="role in successorTrustees" :key="role.id" class="text-sm">
            <span class="font-medium text-gray-900">{{ role.person?.fullName || 'Unknown' }}</span>
          </div>
        </div>

        <!-- Primary Beneficiaries -->
        <div v-if="primaryBeneficiaries.length > 0">
          <p class="text-sm text-gray-500 mb-2">Primary Beneficiaries</p>
          <div v-for="role in primaryBeneficiaries" :key="role.id" class="text-sm">
            <span class="font-medium text-gray-900">{{ role.person?.fullName || 'Unknown' }}</span>
            <span v-if="role.sharePercentage" class="text-gray-500 ml-1">({{ role.sharePercentage }}%)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Individual Roles for Joint Plans -->
    <div v-if="isJointPlan" class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        Individual Document Agents
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Grantor 1's Agents -->
        <div class="border-l-4 border-blue-400 pl-4">
          <h4 class="font-medium text-gray-900 mb-3">{{ plan.grantor1?.fullName }}'s Agents</h4>
          <div class="space-y-2 text-sm">
            <div v-if="getPrimaryExecutor">
              <span class="text-gray-500">Executor:</span>
              <span class="font-medium text-gray-900 ml-1">{{ getPrimaryExecutor.person?.fullName || 'Unknown' }}</span>
            </div>
            <div v-if="getPrimaryFinancialAgent">
              <span class="text-gray-500">Financial Agent:</span>
              <span class="font-medium text-gray-900 ml-1">{{ getPrimaryFinancialAgent.person?.fullName || 'Unknown' }}</span>
            </div>
            <div v-if="getPrimaryHealthcareAgent">
              <span class="text-gray-500">Healthcare Agent:</span>
              <span class="font-medium text-gray-900 ml-1">{{ getPrimaryHealthcareAgent.person?.fullName || 'Unknown' }}</span>
            </div>
          </div>
        </div>

        <!-- Grantor 2's Agents -->
        <div class="border-l-4 border-purple-400 pl-4">
          <h4 class="font-medium text-gray-900 mb-3">{{ plan.grantor2?.fullName }}'s Agents</h4>
          <div class="space-y-2 text-sm">
            <div v-if="getSecondaryExecutor">
              <span class="text-gray-500">Executor:</span>
              <span class="font-medium text-gray-900 ml-1">{{ getSecondaryExecutor.person?.fullName || 'Unknown' }}</span>
            </div>
            <div v-if="getSecondaryFinancialAgent">
              <span class="text-gray-500">Financial Agent:</span>
              <span class="font-medium text-gray-900 ml-1">{{ getSecondaryFinancialAgent.person?.fullName || 'Unknown' }}</span>
            </div>
            <div v-if="getSecondaryHealthcareAgent">
              <span class="text-gray-500">Healthcare Agent:</span>
              <span class="font-medium text-gray-900 ml-1">{{ getSecondaryHealthcareAgent.person?.fullName || 'Unknown' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Individual Roles for Single Plans -->
    <div v-else class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        Key Agents
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-if="executor">
          <p class="text-sm text-gray-500 mb-2">Executor</p>
          <p class="font-medium text-gray-900">{{ executor.person?.fullName || 'Unknown' }}</p>
        </div>
        <div v-if="financialAgent">
          <p class="text-sm text-gray-500 mb-2">Financial Agent</p>
          <p class="font-medium text-gray-900">{{ financialAgent.person?.fullName || 'Unknown' }}</p>
        </div>
        <div v-if="healthcareAgent">
          <p class="text-sm text-gray-500 mb-2">Healthcare Agent</p>
          <p class="font-medium text-gray-900">{{ healthcareAgent.person?.fullName || 'Unknown' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { User, Users, Calendar, FileText } from 'lucide-vue-next'

// Define types inline to work with API response
interface PersonData {
  id: string
  fullName: string
  firstName?: string
  lastName?: string
  email?: string | null
}

interface RoleData {
  id: string
  person: PersonData | null
  forPersonId: string | null
  roleCategory: string
  roleType: string
  isPrimary: boolean
  ordinal: number
  sharePercentage: number | null
  status: string
}

interface WillData {
  id: string
  personId: string | null
  willType: string | null
  executionDate: string | null
  codicilCount?: number
  jurisdiction?: string | null
}

interface AncillaryDocumentData {
  id: string
  personId: string
  documentType: string
  status: string | null
}

interface TrustData {
  id: string
  trustName: string
  trustType: string | null
  isRevocable: boolean
  jurisdiction: string | null
}

type EstatePlanStatus = 'ACTIVE' | 'CLOSED' | 'DRAFT' | 'AMENDED' | 'INCAPACITATED' | 'ADMINISTERED' | 'DISTRIBUTED'

interface EstatePlanData {
  planName: string
  planType: 'TRUST_BASED' | 'WILL_BASED'
  status: EstatePlanStatus
  currentVersion: number
  effectiveDate: string | null
  lastAmendedAt: string | null
  grantor1: PersonData | null
  grantor2: PersonData | null
  trust: TrustData | null
  wills: WillData[]
  ancillaryDocuments: AncillaryDocumentData[]
  roles: RoleData[]
  events: unknown[]
}

interface Props {
  plan: EstatePlanData
}

const props = defineProps<Props>()

const isJointPlan = computed(() => !!props.plan.grantor2)

const activeRoles = computed(() =>
  props.plan.roles.filter(r => r.status === 'ACTIVE')
)

// Plan-level roles (no forPersonId)
const planLevelRoles = computed(() =>
  activeRoles.value.filter(r => !r.forPersonId)
)

const planLevelFiduciaryCount = computed(() =>
  planLevelRoles.value.filter(r => r.roleCategory === 'FIDUCIARY').length
)

const beneficiaryCount = computed(() =>
  activeRoles.value.filter(r => r.roleCategory === 'BENEFICIARY').length
)

const currentTrustees = computed(() =>
  planLevelRoles.value.filter(r =>
    ['TRUSTEE', 'CO_TRUSTEE'].includes(r.roleType)
  ).sort((a, b) => a.ordinal - b.ordinal)
)

const successorTrustees = computed(() =>
  planLevelRoles.value.filter(r => r.roleType === 'SUCCESSOR_TRUSTEE')
    .sort((a, b) => a.ordinal - b.ordinal)
)

const primaryBeneficiaries = computed(() =>
  activeRoles.value.filter(r => r.roleType === 'PRIMARY_BENEFICIARY')
    .sort((a, b) => a.ordinal - b.ordinal)
)

// For single-person plans (no forPersonId distinction)
const financialAgent = computed(() =>
  activeRoles.value.find(r => r.roleType === 'FINANCIAL_AGENT' && !r.forPersonId)
)

const healthcareAgent = computed(() =>
  activeRoles.value.find(r => r.roleType === 'HEALTHCARE_AGENT' && !r.forPersonId)
)

const executor = computed(() =>
  activeRoles.value.find(r => ['EXECUTOR', 'CO_EXECUTOR'].includes(r.roleType) && !r.forPersonId)
)

// Grantor 1's documents and agents
const getPrimaryWill = computed(() =>
  props.plan.grantor1
    ? props.plan.wills.find(w => w.personId === props.plan.grantor1!.id)
    : undefined
)

const getPrimaryAncillaryDocs = computed(() =>
  props.plan.grantor1
    ? props.plan.ancillaryDocuments.filter(d => d.personId === props.plan.grantor1!.id)
    : []
)

const getPrimaryExecutor = computed(() =>
  props.plan.grantor1
    ? activeRoles.value.find(r =>
        ['EXECUTOR', 'CO_EXECUTOR'].includes(r.roleType) &&
        r.forPersonId === props.plan.grantor1!.id
      )
    : undefined
)

const getPrimaryFinancialAgent = computed(() =>
  props.plan.grantor1
    ? activeRoles.value.find(r =>
        r.roleType === 'FINANCIAL_AGENT' &&
        r.forPersonId === props.plan.grantor1!.id
      )
    : undefined
)

const getPrimaryHealthcareAgent = computed(() =>
  props.plan.grantor1
    ? activeRoles.value.find(r =>
        r.roleType === 'HEALTHCARE_AGENT' &&
        r.forPersonId === props.plan.grantor1!.id
      )
    : undefined
)

// Secondary person's documents and agents
const getSecondaryWill = computed(() =>
  props.plan.grantor2
    ? props.plan.wills.find(w => w.personId === props.plan.grantor2!.id)
    : undefined
)

const getSecondaryAncillaryDocs = computed(() =>
  props.plan.grantor2
    ? props.plan.ancillaryDocuments.filter(d => d.personId === props.plan.grantor2!.id)
    : []
)

const getSecondaryExecutor = computed(() =>
  props.plan.grantor2
    ? activeRoles.value.find(r =>
        ['EXECUTOR', 'CO_EXECUTOR'].includes(r.roleType) &&
        r.forPersonId === props.plan.grantor2!.id
      )
    : undefined
)

const getSecondaryFinancialAgent = computed(() =>
  props.plan.grantor2
    ? activeRoles.value.find(r =>
        r.roleType === 'FINANCIAL_AGENT' &&
        r.forPersonId === props.plan.grantor2!.id
      )
    : undefined
)

const getSecondaryHealthcareAgent = computed(() =>
  props.plan.grantor2
    ? activeRoles.value.find(r =>
        r.roleType === 'HEALTHCARE_AGENT' &&
        r.forPersonId === props.plan.grantor2!.id
      )
    : undefined
)

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatTrustType(type: string | null): string {
  if (!type) return 'Unknown'
  const labels: Record<string, string> = {
    REVOCABLE_LIVING: 'Revocable Living Trust',
    IRREVOCABLE_LIVING: 'Irrevocable Living Trust',
    TESTAMENTARY: 'Testamentary Trust',
    SPECIAL_NEEDS: 'Special Needs Trust',
    CHARITABLE_REMAINDER: 'Charitable Remainder Trust',
    CHARITABLE_LEAD: 'Charitable Lead Trust',
    ILIT: 'Irrevocable Life Insurance Trust',
    GRAT: 'Grantor Retained Annuity Trust',
    QPRT: 'Qualified Personal Residence Trust',
    DYNASTY: 'Dynasty Trust',
    OTHER: 'Other Trust'
  }
  return labels[type] || type
}

function formatWillType(type: string | null): string {
  if (!type) return 'Unknown'
  const labels: Record<string, string> = {
    SIMPLE: 'Simple Will',
    POUR_OVER: 'Pour-Over Will',
    TESTAMENTARY_TRUST: 'Testamentary Trust Will',
    OTHER: 'Other'
  }
  return labels[type] || type
}

function formatDocType(type: string): string {
  const labels: Record<string, string> = {
    FINANCIAL_POA: 'Financial Power of Attorney',
    HEALTHCARE_POA: 'Healthcare Power of Attorney',
    ADVANCE_DIRECTIVE: 'Advance Directive',
    HIPAA_AUTHORIZATION: 'HIPAA Authorization',
    NOMINATION_OF_GUARDIAN: 'Nomination of Guardian',
    DECLARATION_OF_GUARDIAN: 'Declaration of Guardian',
    OTHER: 'Other Document'
  }
  return labels[type] || type
}
</script>
