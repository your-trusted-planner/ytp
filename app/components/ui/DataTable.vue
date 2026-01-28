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

    <!-- Pagination Footer (when pagination prop is provided) -->
    <div v-if="pagination" class="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
      <!-- Page info -->
      <div class="text-sm text-gray-700">
        Showing {{ paginationStartItem }}-{{ paginationEndItem }} of {{ pagination.totalCount }}
      </div>

      <div class="flex items-center gap-4">
        <!-- Page size selector -->
        <div class="flex items-center gap-2">
          <label for="page-size" class="text-sm text-gray-700">Per page:</label>
          <select
            id="page-size"
            :value="pagination.limit"
            class="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
            @change="handlePageSizeChange"
          >
            <option v-for="size in effectivePageSizeOptions" :key="size" :value="size">
              {{ size }}
            </option>
          </select>
        </div>

        <!-- Page navigation -->
        <div class="flex items-center gap-2">
          <button
            :disabled="!pagination.hasPrevPage"
            class="p-1 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handlePrevPage"
          >
            <ChevronLeft class="w-5 h-5" />
          </button>

          <span class="text-sm text-gray-700">
            Page {{ pagination.page }} of {{ pagination.totalPages }}
          </span>

          <button
            :disabled="!pagination.hasNextPage"
            class="p-1 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleNextPage"
          >
            <ChevronRight class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Footer slot for summaries, custom pagination, etc. -->
    <slot name="footer" :data="sortedData"></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-vue-next'

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

export interface PaginationMeta {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
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
  /** Pagination metadata (if provided, shows pagination controls) */
  pagination?: PaginationMeta
  /** Available page size options */
  pageSizeOptions?: number[]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  loadingText: 'Loading...',
  emptyText: 'No data available',
  rowKey: 'id',
  defaultSortDirection: 'asc',
  pageSizeOptions: () => [10, 25, 50, 100]
})

const emit = defineEmits<{
  (e: 'row-click', row: any): void
  (e: 'sort', key: string, direction: 'asc' | 'desc'): void
  (e: 'page-change', page: number): void
  (e: 'page-size-change', limit: number): void
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

// Pagination computed properties
const effectivePageSizeOptions = computed(() => {
  // Make sure current limit is in the options
  const options = [...props.pageSizeOptions]
  if (props.pagination && !options.includes(props.pagination.limit)) {
    options.push(props.pagination.limit)
    options.sort((a, b) => a - b)
  }
  return options
})

const paginationStartItem = computed(() => {
  if (!props.pagination) return 0
  return (props.pagination.page - 1) * props.pagination.limit + 1
})

const paginationEndItem = computed(() => {
  if (!props.pagination) return 0
  const end = props.pagination.page * props.pagination.limit
  return Math.min(end, props.pagination.totalCount)
})

// Pagination handlers
const handlePageSizeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const newLimit = parseInt(target.value, 10)
  emit('page-size-change', newLimit)
}

const handlePrevPage = () => {
  if (props.pagination && props.pagination.hasPrevPage) {
    emit('page-change', props.pagination.page - 1)
  }
}

const handleNextPage = () => {
  if (props.pagination && props.pagination.hasNextPage) {
    emit('page-change', props.pagination.page + 1)
  }
}

// Expose methods for parent component
defineExpose({
  sortedData,
  sortKey,
  sortDirection
})
</script>
