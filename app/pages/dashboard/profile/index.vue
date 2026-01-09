<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">Profile</h1>
      <p class="text-gray-600 mt-1">Manage your account information</p>
    </div>

    <UiCard title="Personal Information">
      <form @submit.prevent="handleSave" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UiInput
            v-model="profile.firstName"
            label="First Name"
            autocomplete="given-name"
            required
          />
          <UiInput
            v-model="profile.lastName"
            label="Last Name"
            autocomplete="family-name"
            required
          />
        </div>
        <UiInput
          v-model="profile.email"
          label="Email"
          type="email"
          autocomplete="email"
          disabled
        />
        <UiInput
          v-model="profile.phone"
          label="Phone"
          autocomplete="tel"
        />
        <div class="flex justify-end space-x-3">
          <UiButton variant="outline" type="button">
            Cancel
          </UiButton>
          <UiButton type="submit" :is-loading="saving">
            Save Changes
          </UiButton>
        </div>
      </form>
    </UiCard>

    <UiCard v-if="showPasswordSection" title="Change Password">
      <form @submit.prevent="handlePasswordChange" class="space-y-4">
        <UiInput
          v-model="passwordForm.currentPassword"
          label="Current Password"
          type="password"
          autocomplete="current-password"
          required
        />
        <UiInput
          v-model="passwordForm.newPassword"
          label="New Password"
          type="password"
          autocomplete="new-password"
          required
        />
        <UiInput
          v-model="passwordForm.confirmPassword"
          label="Confirm New Password"
          type="password"
          autocomplete="new-password"
          required
        />
        <div class="flex justify-end">
          <UiButton type="submit" :is-loading="changingPassword">
            Update Password
          </UiButton>
        </div>
      </form>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { data: sessionData } = await useFetch('/api/auth/session')

const profile = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: ''
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const saving = ref(false)
const changingPassword = ref(false)
const showPasswordSection = ref(false)

onMounted(() => {
  // Set password section visibility after hydration to avoid SSR mismatch
  showPasswordSection.value = !!sessionData.value?.user?.hasPassword
  if (sessionData.value?.user) {
    const user = sessionData.value.user
    profile.value = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: ''
    }
  }
})

const handleSave = async () => {
  saving.value = true
  try {
    await $fetch('/api/profile', {
      method: 'PUT',
      body: profile.value
    })
    alert('Profile updated successfully')
  } catch (error) {
    alert('Failed to update profile')
  } finally {
    saving.value = false
  }
}

const handlePasswordChange = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    alert('Passwords do not match')
    return
  }
  
  changingPassword.value = true
  try {
    await $fetch('/api/settings/password', {
      method: 'POST',
      body: {
        currentPassword: passwordForm.value.currentPassword,
        newPassword: passwordForm.value.newPassword
      }
    })
    alert('Password updated successfully')
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  } catch (error) {
    alert('Failed to update password')
  } finally {
    changingPassword.value = false
  }
}
</script>

