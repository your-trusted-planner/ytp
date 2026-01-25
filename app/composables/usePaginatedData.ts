import { ref, reactive, computed, watch } from 'vue'

export interface PaginationMeta {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface UsePaginatedDataOptions {
  /** Default items per page */
  defaultLimit?: number
  /** Key in response containing the data array */
  dataKey?: string
  /** Initial sort column */
  defaultSortBy?: string
  /** Initial sort direction */
  defaultSortDirection?: 'asc' | 'desc'
  /** Whether to fetch immediately on mount */
  immediate?: boolean
}

export interface UsePaginatedDataReturn<T> {
  /** Reactive array of items */
  data: Ref<T[]>
  /** Loading state */
  loading: Ref<boolean>
  /** Error state */
  error: Ref<Error | null>
  /** Current pagination state */
  pagination: Ref<PaginationMeta | null>
  /** Current sort column */
  sortBy: Ref<string | undefined>
  /** Current sort direction */
  sortDirection: Ref<'asc' | 'desc'>
  /** Fetch current page */
  fetch: () => Promise<void>
  /** Navigate to a specific page */
  goToPage: (page: number) => Promise<void>
  /** Change page size */
  setPageSize: (limit: number) => Promise<void>
  /** Change sort */
  setSort: (key: string, direction: 'asc' | 'desc') => Promise<void>
  /** Refresh data (re-fetch current page) */
  refresh: () => Promise<void>
}

/**
 * Composable for managing paginated data fetching
 */
export function usePaginatedData<T = any>(
  endpoint: string,
  options: UsePaginatedDataOptions = {}
): UsePaginatedDataReturn<T> {
  const {
    defaultLimit = 25,
    dataKey,
    defaultSortBy,
    defaultSortDirection = 'asc',
    immediate = true
  } = options

  // State
  const data = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const pagination = ref<PaginationMeta | null>(null)

  // Query params
  const currentPage = ref(1)
  const currentLimit = ref(defaultLimit)
  const sortBy = ref<string | undefined>(defaultSortBy)
  const sortDirection = ref<'asc' | 'desc'>(defaultSortDirection)

  /**
   * Fetch data from the endpoint
   */
  async function fetch() {
    loading.value = true
    error.value = null

    try {
      // Build query params
      const params: Record<string, string | number> = {
        page: currentPage.value,
        limit: currentLimit.value
      }

      if (sortBy.value) {
        params.sortBy = sortBy.value
        params.sortDirection = sortDirection.value
      }

      // Fetch data
      const response = await $fetch<any>(endpoint, { params })

      // Extract data array (handle both wrapped and unwrapped responses)
      if (dataKey && response[dataKey]) {
        data.value = response[dataKey]
      } else if (Array.isArray(response)) {
        data.value = response
      } else {
        // Try to find the data array in the response
        const keys = Object.keys(response)
        const arrayKey = keys.find(k => Array.isArray(response[k]) && k !== 'pagination')
        if (arrayKey) {
          data.value = response[arrayKey]
        } else {
          data.value = []
        }
      }

      // Extract pagination metadata
      if (response.pagination) {
        pagination.value = response.pagination
      } else {
        // No pagination from server - set to null to indicate unpaginated
        pagination.value = null
      }
    } catch (e) {
      error.value = e as Error
      console.error(`Failed to fetch ${endpoint}:`, e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Navigate to a specific page
   */
  async function goToPage(page: number) {
    if (pagination.value) {
      // Validate page number
      if (page < 1) page = 1
      if (page > pagination.value.totalPages) page = pagination.value.totalPages
    }

    if (page !== currentPage.value) {
      currentPage.value = page
      await fetch()
    }
  }

  /**
   * Change the page size
   */
  async function setPageSize(limit: number) {
    if (limit !== currentLimit.value) {
      currentLimit.value = limit
      // Reset to first page when changing page size
      currentPage.value = 1
      await fetch()
    }
  }

  /**
   * Change the sort column and direction
   */
  async function setSort(key: string, direction: 'asc' | 'desc') {
    sortBy.value = key
    sortDirection.value = direction
    // Reset to first page when sorting changes
    currentPage.value = 1
    await fetch()
  }

  /**
   * Refresh data (re-fetch current page)
   */
  async function refresh() {
    await fetch()
  }

  // Fetch immediately if requested
  if (immediate) {
    onMounted(() => {
      fetch()
    })
  }

  return {
    data,
    loading,
    error,
    pagination,
    sortBy,
    sortDirection,
    fetch,
    goToPage,
    setPageSize,
    setSort,
    refresh
  }
}
