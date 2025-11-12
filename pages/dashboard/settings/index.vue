<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
      <p class="text-gray-600 mt-1">Manage application settings</p>
    </div>

    <UiCard title="Account Settings">
      <div class="space-y-4">
        <div class="flex items-center justify-between py-3 border-b border-gray-200">
          <div>
            <h3 class="font-medium text-gray-900">Email Notifications</h3>
            <p class="text-sm text-gray-500">Receive email updates about your account</p>
          </div>
          <input type="checkbox" class="rounded border-gray-300 text-accent-600 focus:ring-accent-500" />
        </div>
        <div class="flex items-center justify-between py-3 border-b border-gray-200">
          <div>
            <h3 class="font-medium text-gray-900">SMS Notifications</h3>
            <p class="text-sm text-gray-500">Receive text message reminders</p>
          </div>
          <input type="checkbox" class="rounded border-gray-300 text-accent-600 focus:ring-accent-500" />
        </div>
        <div class="flex items-center justify-between py-3">
          <div>
            <h3 class="font-medium text-gray-900">Two-Factor Authentication</h3>
            <p class="text-sm text-gray-500">Add an extra layer of security</p>
          </div>
          <UiButton variant="outline" size="sm">
            Enable
          </UiButton>
        </div>
      </div>
    </UiCard>

    <UiCard title="Preferences">
      <div class="space-y-4">
        <UiSelect label="Time Zone">
          <option value="America/New_York">Eastern Time</option>
          <option value="America/Chicago">Central Time</option>
          <option value="America/Denver">Mountain Time</option>
          <option value="America/Los_Angeles">Pacific Time</option>
        </UiSelect>
        <UiSelect label="Language">
          <option value="en">English</option>
          <option value="es">Spanish</option>
        </UiSelect>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})
</script>

