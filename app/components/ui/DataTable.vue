<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">{{ loadingText }}</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!data || data.length === 0" class="text-center py-12">
      <slot name="empty">
        <p class="text-gray-500">{{ emptyText }}</p>
      </slot>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[
                'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                col.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : '',
                col.headerClass
              ]"
              :style="col.width ? { width: col.width } : undefined"
              @click="col.sortable ? handleSort(col.key) : undefined"
            >
              <div class="flex items-center gap-2">
                <span>{{ col.label }}</span>
                <template v-if="col.sortable">
                  <ChevronUp v-if="sortKey === col.key && sortDirection === 'asc'" class="w-4 h-4" />
                  <ChevronDown v-else-if="sortKey === col.key && sortDirection === 'desc'" class="w-4 h-4" />
                  <ChevronsUpDown v-else class="w-4 h-4 opacity-30" />
                </template>
              </div>
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr
            v-for="(row, index) in sortedData"
            :key="getRowKey(row, index)"
            :class="[
              'transition-colors',
              rowClickable ? 'hover:bg-gray-50 cursor-pointer' : 'hover:bg-gray-50'
            ]"
            @click="handleRowClick(row)"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              :class="['px-6 py-4 whitespace-nowrap', col.cellClass]"
              @click="col.stopPropagation ? $event.stopPropagation() : undefined"
            >
              <!-- Named slot for custom cell rendering -->
              <slot :name="`cell-${col.key}`" :row="row" :value="getNestedValue(row, col.key)" :index="index">
                <!-- Default rendering -->
                <div :class="col.textClass || 'text-sm text-gray-900'">
                  {{ formatCellValue(row, col) }}
                </div>
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer slot for summaries, pagination, etc. -->
    <slot name="footer" :data="sortedData"></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-vue-next'

export interface Column {
  /** Field key - supports nested paths like 'user.name' */
  key: string
  /** Column header label */
  label: string
  /** Enable sorting for this column */
  sortable?: boolean
  /** Custom sort function: (a, b, direction) => number */
  sortFn?: (a: any, b: any, direction: 'asc' | 'desc') => number
  /** Format function for display */
  format?: (value: any, row: any) => string
  /** Column width (e.g., '200px', '20%') */
  width?: string
  /** Additional classes for header cell */
  headerClass?: string
  /** Additional classes for body cell */
  cellClass?: string
  /** Additional classes for cell text (default: 'text-sm text-gray-900') */
  textClass?: string
  /** Stop click propagation on this column (useful for action buttons) */
  stopPropagation?: boolean
}

interface Props {
  /** Array of data objects to display */
  data: any[]
  /** Column definitions */
  columns: Column[]
  /** Show loading state */
  loading?: boolean
  /** Text to show while loading */
  loadingText?: string
  /** Text to show when no data */
  emptyText?: string
  /** Key field for row identification (default: 'id') */
  rowKey?: string
  /** Initial sort column key */
  defaultSortKey?: string
  /** Initial sort direction */
  defaultSortDirection?: 'asc' | 'desc'
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  loadingText: 'Loading...',
  emptyText: 'No data available',
  rowKey: 'id',
  defaultSortDirection: 'asc'
})

const emit = defineEmits<{
  (e: 'row-click', row: any): void
  (e: 'sort', key: string, direction: 'asc' | 'desc'): void
}>()

// Check if row click handler is bound
const rowClickable = computed(() => {
  return true // Will emit regardless, parent can ignore if not listening
})

// Sorting state
const sortKey = ref<string | undefined>(props.defaultSortKey)
const sortDirection = ref<'asc' | 'desc'>(props.defaultSortDirection)

// Get row key for v-for
const getRowKey = (row: any, index: number): string | number => {
  return row[props.rowKey] ?? index
}

// Get nested value from object (supports 'user.name' paths)
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((acc, part) => acc?.[part], obj)
}

// Format cell value for display
const formatCellValue = (row: any, col: Column): string => {
  const value = getNestedValue(row, col.key)
  if (col.format) {
    return col.format(value, row)
  }
  if (value === null || value === undefined) {
    return '-'
  }
  return String(value)
}

// Handle sort click
const handleSort = (key: string) => {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDirection.value = 'asc'
  }
  emit('sort', key, sortDirection.value)
}

// Sorted data
const sortedData = computed(() => {
  if (!sortKey.value || !props.data) {
    return props.data
  }

  const col = props.columns.find(c => c.key === sortKey.value)
  if (!col?.sortable) {
    return props.data
  }

  return [...props.data].sort((a, b) => {
    // Use custom sort function if provided
    if (col.sortFn) {
      return col.sortFn(a, b, sortDirection.value)
    }

    // Default sorting
    const aVal = getNestedValue(a, sortKey.value!)
    const bVal = getNestedValue(b, sortKey.value!)

    // Handle null/undefined
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return sortDirection.value === 'asc' ? 1 : -1
    if (bVal == null) return sortDirection.value === 'asc' ? -1 : 1

    // Compare values
    let comparison = 0
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' })
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal
    } else {
      comparison = String(aVal).localeCompare(String(bVal))
    }

    return sortDirection.value === 'asc' ? comparison : -comparison
  })
})

// Handle row click
const handleRowClick = (row: any) => {
  emit('row-click', row)
}

// Expose methods for parent component
defineExpose({
  sortedData,
  sortKey,
  sortDirection
})
</script>
