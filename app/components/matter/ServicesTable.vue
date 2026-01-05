<template>
  <div class="space-y-4">
    <div v-if="services.length === 0" class="text-center py-8 text-gray-500">
      No services engaged yet
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Service
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Price
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Engaged
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Assigned Attorney
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="service in services" :key="service.catalog_id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <div class="text-sm font-medium text-gray-900">{{ service.name }}</div>
              <div v-if="service.category" class="text-xs text-gray-500">{{ service.category }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">{{ formatPrice(service.price) }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <UiBadge :variant="getStatusVariant(service.status)">
                {{ service.status }}
              </UiBadge>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-500">
                {{ formatDate(service.engaged_at) }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">
                {{ service.assigned_attorney_name || '-' }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Service {
  catalog_id: string
  name: string
  category?: string
  price: number
  status: string
  engaged_at: number
  assigned_attorney_name?: string
}

interface Props {
  services: Service[]
}

defineProps<Props>()

function formatPrice(price: number): string {
  if (!price) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(price)
}

function formatDate(timestamp: number): string {
  if (!timestamp) return '-'
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getStatusVariant(status: string): 'success' | 'primary' | 'default' | 'danger' {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'PENDING':
      return 'primary'
    case 'COMPLETED':
      return 'default'
    case 'CANCELLED':
      return 'danger'
    default:
      return 'default'
  }
}
</script>
