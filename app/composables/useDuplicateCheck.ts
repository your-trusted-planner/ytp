export interface DuplicateMatch {
  personId: string
  personName: string
  confidence: 'high' | 'medium'
  adjustedScore: number
  topFields: Array<{ field: string; score: number; method: string; details?: string }>
}

export interface DuplicateCheckFields {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}

export function useDuplicateCheck() {
  const duplicateMatches = ref<DuplicateMatch[]>([])
  const dupCheckInFlight = ref(false)
  const duplicateAcknowledged = ref(false)

  let dupCheckTimer: ReturnType<typeof setTimeout> | null = null

  const hasHighConfidence = computed(() =>
    duplicateMatches.value.some(m => m.confidence === 'high')
  )

  const canSubmitDespiteDuplicates = computed(() =>
    !hasHighConfidence.value || duplicateAcknowledged.value
  )

  function checkForDuplicates(fields: DuplicateCheckFields) {
    // Reset acknowledgment when fields change
    duplicateAcknowledged.value = false

    const { firstName, lastName, email, phone } = fields
    if (!firstName && !lastName && !email && !phone) {
      duplicateMatches.value = []
      return
    }

    if (dupCheckTimer) clearTimeout(dupCheckTimer)

    dupCheckTimer = setTimeout(async () => {
      dupCheckInFlight.value = true
      try {
        const response = await $fetch<{ matches: DuplicateMatch[] }>('/api/people/check-duplicates', {
          method: 'POST',
          body: {
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            email: email || undefined,
            phone: phone || undefined
          }
        })
        duplicateMatches.value = response.matches || []
      } catch {
        duplicateMatches.value = []
      } finally {
        dupCheckInFlight.value = false
      }
    }, 500)
  }

  function resetDuplicates() {
    if (dupCheckTimer) clearTimeout(dupCheckTimer)
    duplicateMatches.value = []
    duplicateAcknowledged.value = false
    dupCheckInFlight.value = false
  }

  return {
    duplicateMatches,
    dupCheckInFlight,
    duplicateAcknowledged,
    hasHighConfidence,
    canSubmitDespiteDuplicates,
    checkForDuplicates,
    resetDuplicates
  }
}
