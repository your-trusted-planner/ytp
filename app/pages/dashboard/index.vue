<template>
  <div>
    <DashboardLawyerDashboard v-if="isLawyer" />
    <DashboardClientDashboard v-else />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { data: sessionData } = await useFetch('/api/auth/session')
const isLawyer = computed(() => {
  const role = sessionData.value?.user?.role
  return role === 'LAWYER' || role === 'ADMIN'
})
</script>

