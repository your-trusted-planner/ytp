<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">
        Settings
      </h1>
      <p class="text-gray-600 mt-1">
        System administration and configuration
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- User Management -->
      <NuxtLink
        to="/settings/users"
        class="block"
      >
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
      <NuxtLink
        to="/settings/oauth-providers"
        class="block"
      >
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

      <!-- Google Workspace -->
      <NuxtLink
        to="/settings/google-workspace"
        class="block"
      >
        <UiCard class="hover:shadow-md transition-shadow cursor-pointer h-full">
          <div class="flex items-start space-x-4">
            <div class="p-3 bg-blue-50 rounded-lg">
              <Building2 class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 class="font-medium text-gray-900">Google Workspace</h3>
              <p class="text-sm text-gray-500 mt-1">
                Service account, Drive sync, and Calendar integration
              </p>
            </div>
          </div>
        </UiCard>
      </NuxtLink>

      <!-- Service Categories -->
      <NuxtLink
        to="/service-catalog/service-categories"
        class="block"
      >
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

      <!-- Marketing Channels -->
      <NuxtLink
        to="/settings/marketing/channels"
        class="block"
      >
        <UiCard class="hover:shadow-md transition-shadow cursor-pointer h-full">
          <div class="flex items-start space-x-4">
            <div class="p-3 bg-pink-50 rounded-lg">
              <Mail class="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <h3 class="font-medium text-gray-900">Marketing Channels</h3>
              <p class="text-sm text-gray-500 mt-1">
                Manage marketing consent channels and communication preferences
              </p>
            </div>
          </div>
        </UiCard>
      </NuxtLink>

      <!-- Video Providers -->
      <NuxtLink
        to="/settings/video-providers"
        class="block"
      >
        <UiCard class="hover:shadow-md transition-shadow cursor-pointer h-full">
          <div class="flex items-start space-x-4">
            <div class="p-3 bg-blue-50 rounded-lg">
              <Video class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 class="font-medium text-gray-900">Video Providers</h3>
              <p class="text-sm text-gray-500 mt-1">
                Configure Zoom and video meeting integrations for appointments
              </p>
            </div>
          </div>
        </UiCard>
      </NuxtLink>

      <!-- Forms -->
      <NuxtLink
        to="/settings/forms"
        class="block"
      >
        <UiCard class="hover:shadow-md transition-shadow cursor-pointer h-full">
          <div class="flex items-start space-x-4">
            <div class="p-3 bg-violet-50 rounded-lg">
              <FileText class="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <h3 class="font-medium text-gray-900">Forms</h3>
              <p class="text-sm text-gray-500 mt-1">
                Build intake forms, questionnaires, and booking forms
              </p>
            </div>
          </div>
        </UiCard>
      </NuxtLink>

      <!-- Integrations -->
      <NuxtLink
        to="/settings/integrations"
        class="block"
      >
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
            can be managed from the <NuxtLink
              to="/profile"
              class="text-burgundy-600 hover:text-burgundy-700 underline"
            >Profile page</NuxtLink>.
          </p>
        </div>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { UserCircle, KeyRound, Building2, FolderOpen, Plug, Info, Mail, Video, FileText } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})
</script>
