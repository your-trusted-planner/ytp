<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
      <p class="text-gray-600 mt-1">System administration and configuration</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- User Management -->
      <NuxtLink to="/settings/users" class="block">
        <UiCard class="hover:shadow-md transition-shadow cursor-pointer h-full">
          <div class="flex items-start space-x-4">
            <div class="p-3 bg-burgundy-50 rounded-lg">
              <UserCircle class="w-6 h-6 text-burgundy-600" />
            </div>
            <div>
              <h3 class="font-medium text-gray-900">User Management</h3>
              <p class="text-sm text-gray-500 mt-1">
                Create, edit, and manage user accounts and permissions
              </p>
            </div>
          </div>
        </UiCard>
      </NuxtLink>

      <!-- OAuth Providers -->
      <NuxtLink to="/settings/oauth-providers" class="block">
        <UiCard class="hover:shadow-md transition-shadow cursor-pointer h-full">
          <div class="flex items-start space-x-4">
            <div class="p-3 bg-blue-50 rounded-lg">
              <KeyRound class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 class="font-medium text-gray-900">OAuth Providers</h3>
              <p class="text-sm text-gray-500 mt-1">
                Configure authentication providers and SSO settings
              </p>
            </div>
          </div>
        </UiCard>
      </NuxtLink>

      <!-- Calendar Administration -->
      <NuxtLink to="/settings/calendars" class="block">
        <UiCard class="hover:shadow-md transition-shadow cursor-pointer h-full">
          <div class="flex items-start space-x-4">
            <div class="p-3 bg-green-50 rounded-lg">
              <Calendar class="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 class="font-medium text-gray-900">Calendar Administration</h3>
              <p class="text-sm text-gray-500 mt-1">
                Manage organization-wide calendar settings and scheduling rules
              </p>
            </div>
          </div>
        </UiCard>
      </NuxtLink>

      <!-- Service Categories -->
      <NuxtLink to="/service-catalog/service-categories" class="block">
        <UiCard class="hover:shadow-md transition-shadow cursor-pointer h-full">
          <div class="flex items-start space-x-4">
            <div class="p-3 bg-purple-50 rounded-lg">
              <FolderOpen class="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 class="font-medium text-gray-900">Service Categories</h3>
              <p class="text-sm text-gray-500 mt-1">
                Manage categories for organizing your service catalog
              </p>
            </div>
          </div>
        </UiCard>
      </NuxtLink>

      <!-- Google Drive Integration -->
      <NuxtLink to="/settings/google-drive" class="block">
        <UiCard class="hover:shadow-md transition-shadow cursor-pointer h-full">
          <div class="flex items-start space-x-4">
            <div class="p-3 bg-blue-50 rounded-lg">
              <IconsGoogleDrive :size="24" />
            </div>
            <div>
              <h3 class="font-medium text-gray-900">Google Drive</h3>
              <p class="text-sm text-gray-500 mt-1">
                Configure automatic file sync to Google Drive Shared Drives
              </p>
            </div>
          </div>
        </UiCard>
      </NuxtLink>

      <!-- Integrations -->
      <NuxtLink to="/settings/integrations" class="block">
        <UiCard class="hover:shadow-md transition-shadow cursor-pointer h-full">
          <div class="flex items-start space-x-4">
            <div class="p-3 bg-orange-50 rounded-lg">
              <Plug class="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 class="font-medium text-gray-900">Integrations</h3>
              <p class="text-sm text-gray-500 mt-1">
                Manage external service integrations and data imports
              </p>
            </div>
          </div>
        </UiCard>
      </NuxtLink>
    </div>

    <!-- Admin Info -->
    <UiCard>
      <div class="flex items-start space-x-3">
        <Info class="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div class="text-sm text-gray-600">
          <p>
            This area is restricted to users with admin level 2 or higher.
            Personal settings like notifications, preferences, and individual calendars
            can be managed from the <NuxtLink to="/profile" class="text-burgundy-600 hover:text-burgundy-700 underline">Profile page</NuxtLink>.
          </p>
        </div>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { UserCircle, KeyRound, Calendar, FolderOpen, Plug, Info } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})
</script>
