<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <!-- Header -->
    <div class="bg-[#0A2540] text-white py-6 shadow-lg">
      <div class="max-w-4xl mx-auto px-4">
        <h1 class="text-3xl font-bold">
          Schedule a Consultation
        </h1>
        <p class="text-slate-300 mt-1">
          Choose the type of consultation that best fits your needs
        </p>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Loading -->
      <div
        v-if="loading"
        class="text-center py-12"
      >
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#C41E3A]" />
        <p class="text-slate-500 mt-3">
          Loading available consultations...
        </p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="types.length === 0"
        class="bg-white rounded-lg shadow-lg p-8 text-center"
      >
        <p class="text-slate-600">
          No consultation types are currently available.
        </p>
      </div>

      <!-- Type Cards -->
      <div
        v-else
        class="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <NuxtLink
          v-for="type in types"
          :key="type.id"
          :to="`/book/${type.slug}`"
          class="block bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow overflow-hidden"
        >
          <div
            class="h-2"
            :style="{ backgroundColor: type.color }"
          />
          <div class="p-6">
            <h3 class="text-xl font-bold text-[#0A2540] mb-2">{{ type.name }}</h3>
            <p
              v-if="type.description"
              class="text-slate-600 text-sm mb-4"
            >{{ type.description }}</p>

            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-4 text-slate-500">
                <span>{{ type.defaultDurationMinutes }} min</span>
                <span v-if="type.eligibleAttorneys.length > 0">
                  {{ type.eligibleAttorneys.length }} attorney{{ type.eligibleAttorneys.length > 1 ? 's' : '' }}
                </span>
              </div>
              <div
                v-if="type.consultationFeeEnabled && type.consultationFee > 0"
                class="font-semibold text-[#0A2540]"
              >
                ${{ (type.consultationFee / 100).toFixed(0) }}
              </div>
              <div
                v-else
                class="text-green-600 font-medium"
              >
                Free
              </div>
            </div>

            <div class="mt-4 text-center">
              <span class="inline-block px-6 py-2 bg-[#C41E3A] text-white rounded-lg font-semibold text-sm">
                Book Now
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: false
})

interface PublicAppointmentType {
  id: string
  name: string
  slug: string
  description: string | null
  defaultDurationMinutes: number
  color: string
  consultationFee: number
  consultationFeeEnabled: boolean
  defaultLocation: string | null
  eligibleAttorneys: Array<{ id: string, name: string, slug: string }>
}

const types = ref<PublicAppointmentType[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    types.value = await $fetch<PublicAppointmentType[]>('/api/public/appointment-types')
  }
  catch {
    // Failed to load — empty state will show
  }
  finally {
    loading.value = false
  }
})
</script>
