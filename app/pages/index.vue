<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

// Redirect to dashboard on mount
onMounted(() => {
  navigateTo('/dashboard')
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <p class="text-gray-600">Redirecting...</p>
    </div>
  </div>
</template>

