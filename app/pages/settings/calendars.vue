<template>
  <div class="space-y-6">
    <!-- Back link -->
    <NuxtLink
      to="/settings"
      class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
    >
      <ArrowLeft class="w-4 h-4 mr-1" />
      Back to Settings
    </NuxtLink>

    <div>
      <h1 class="text-3xl font-bold text-gray-900">Calendar Administration</h1>
      <p class="text-gray-600 mt-1">Manage calendars across all staff members</p>
    </div>

    <UiCard>
      <div class="text-center py-12">
        <Calendar class="mx-auto h-16 w-16 text-gray-400" />
        <h3 class="mt-4 text-lg font-medium text-gray-900">Calendar Administration Coming Soon</h3>
        <p class="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          This page will allow administrators to view and manage calendars for all staff members,
          configure default calendar settings, and set up organization-wide booking preferences.
        </p>
        <div class="mt-6">
          <p class="text-xs text-gray-400">
            Individual users can manage their own calendars from their
            <NuxtLink to="/profile" class="text-burgundy-600 hover:text-burgundy-700 underline">
              Profile page
            </NuxtLink>.
          </p>
        </div>
      </div>
    </UiCard>

    <!-- Placeholder for future features -->
    <UiCard title="Planned Features">
      <ul class="space-y-3 text-sm text-gray-600">
        <li class="flex items-start">
          <span class="w-5 h-5 mr-3 text-gray-400">1.</span>
          <span>View all staff calendars in one place</span>
        </li>
        <li class="flex items-start">
          <span class="w-5 h-5 mr-3 text-gray-400">2.</span>
          <span>Set default timezone and availability settings for new staff</span>
        </li>
        <li class="flex items-start">
          <span class="w-5 h-5 mr-3 text-gray-400">3.</span>
          <span>Configure organization-wide booking rules and blackout dates</span>
        </li>
        <li class="flex items-start">
          <span class="w-5 h-5 mr-3 text-gray-400">4.</span>
          <span>Assign calendars to specific matter types or client categories</span>
        </li>
      </ul>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Calendar } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})
</script>
