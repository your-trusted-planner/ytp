/**
 * Lawmatics API Client
 *
 * A reusable client for interacting with the Lawmatics REST API.
 * Handles authentication, pagination, rate limiting, and error handling.
 *
 * API Documentation: https://docs.lawmatics.com
 * Base URL: https://api.lawmatics.com/v1
 */

import { kv } from '@nuxthub/kv'

const LAWMATICS_BASE_URL = 'https://api.lawmatics.com/v1'

// Default page sizes
const DEFAULT_PAGE_SIZE = 100
const ACTIVITIES_PAGE_SIZE = 25 // Activities endpoint uses smaller pages

/**
 * Lawmatics API response structure
 */
export interface LawmaticsResponse<T> {
  data: T[]
  meta?: {
    pagination?: {
      current_page: number
      total_pages: number
      total_count: number
      per_page: number
    }
  }
}

/**
 * Lawmatics entity with standard structure
 */
export interface LawmaticsEntity {
  id: string
  type: string
  attributes: Record<string, any>
  relationships?: Record<string, {
    data: { id: string; type: string } | { id: string; type: string }[] | null
  }>
}

/**
 * Lawmatics User (staff/attorney)
 */
export interface LawmaticsUser extends LawmaticsEntity {
  type: 'user'
  attributes: {
    first_name: string
    last_name: string
    email: string
    role?: string
    active?: boolean
    created_at: string
    updated_at: string
  }
}

/**
 * Lawmatics Contact
 */
export interface LawmaticsContact extends LawmaticsEntity {
  type: 'contact'
  attributes: {
    first_name: string
    last_name?: string
    email?: string
    email_address?: string
    phone?: string
    phone_number?: string
    address?: string
    birthdate?: string
    middle_name?: string
    citizenship?: string
    gender?: string
    marital_status?: string
    contact_type?: string
    custom_fields?: Array<{ name: string; formatted_value: any; value?: any }>
    created_at: string
    updated_at: string
    [key: string]: any
  }
}

/**
 * Lawmatics Prospect (Matter)
 */
export interface LawmaticsProspect extends LawmaticsEntity {
  type: 'prospect'
  attributes: {
    first_name?: string
    last_name?: string
    case_title?: string
    case_number?: string
    case_blurb?: string
    status?: string
    stage?: string
    estimated_value_cents?: number
    actual_value_cents?: number
    custom_fields?: Array<{ name: string; formatted_value: any; value?: any }>
    created_at: string
    updated_at: string
    [key: string]: any
  }
}

/**
 * Lawmatics Note
 */
export interface LawmaticsNote extends LawmaticsEntity {
  type: 'note'
  attributes: {
    content: string
    created_at: string
    updated_at: string
    [key: string]: any
  }
}

/**
 * Lawmatics Timeline Activity
 */
export interface LawmaticsActivity extends LawmaticsEntity {
  type: string // Various activity types
  attributes: {
    description?: string
    activity_type?: string
    created_at: string
    updated_at?: string
    [key: string]: any
  }
}

/**
 * Pagination options for fetch methods
 */
export interface PaginationOptions {
  page?: number
  perPage?: number
  updatedSince?: string // ISO timestamp for incremental sync
}

/**
 * Rate limit error - thrown when API returns 429
 */
export class RateLimitError extends Error {
  retryAfter?: number

  constructor(message: string, retryAfter?: number) {
    super(message)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

/**
 * API error - thrown for non-2xx responses
 */
export class LawmaticsApiError extends Error {
  statusCode: number
  responseBody?: string

  constructor(message: string, statusCode: number, responseBody?: string) {
    super(message)
    this.name = 'LawmaticsApiError'
    this.statusCode = statusCode
    this.responseBody = responseBody
  }
}

/**
 * Page result from a single API call
 */
export interface PageResult<T> {
  data: T[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    perPage: number
    hasMore: boolean
  }
}

/**
 * Lawmatics API Client
 */
export class LawmaticsClient {
  private accessToken: string
  private debug: boolean

  constructor(accessToken: string, options: { debug?: boolean } = {}) {
    this.accessToken = accessToken
    this.debug = options.debug ?? false
  }

  /**
   * Log debug messages if debug mode is enabled
   */
  private log(message: string, data?: any): void {
    if (this.debug) {
      console.log(`[LawmaticsClient] ${message}`, data ?? '')
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params: Record<string, string | number | undefined>): string {
    const url = new URL(`${LAWMATICS_BASE_URL}${endpoint}`)

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    }

    return url.toString()
  }

  /**
   * Make an authenticated request to the Lawmatics API
   */
  private async request<T>(
    endpoint: string,
    params: Record<string, string | number | undefined> = {}
  ): Promise<LawmaticsResponse<T>> {
    const url = this.buildUrl(endpoint, params)

    this.log(`Fetching: ${url}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      throw new RateLimitError(
        'Rate limit exceeded',
        retryAfter ? parseInt(retryAfter, 10) : undefined
      )
    }

    // Handle other errors
    if (!response.ok) {
      const body = await response.text()
      throw new LawmaticsApiError(
        `Lawmatics API error: ${response.status} ${response.statusText}`,
        response.status,
        body
      )
    }

    const data = await response.json() as LawmaticsResponse<T>

    this.log(`Received ${data.data?.length ?? 0} records`, {
      pagination: data.meta?.pagination
    })

    return data
  }

  /**
   * Fetch a single page of data from any endpoint
   */
  async fetchPage<T extends LawmaticsEntity>(
    endpoint: string,
    options: PaginationOptions & { fields?: string } = {}
  ): Promise<PageResult<T>> {
    const {
      page = 1,
      perPage = DEFAULT_PAGE_SIZE,
      updatedSince,
      fields = 'all'
    } = options

    const params: Record<string, string | number | undefined> = {
      fields,
      page,
      per_page: perPage
    }

    // Add filter for incremental sync
    if (updatedSince) {
      params.filter_by = 'updated_at'
      params.filter_op = 'gt'
      params.filter_on = updatedSince
    }

    const response = await this.request<T>(endpoint, params)

    const pagination = response.meta?.pagination ?? {
      current_page: page,
      total_pages: 1,
      total_count: response.data.length,
      per_page: perPage
    }

    return {
      data: response.data,
      pagination: {
        currentPage: pagination.current_page,
        totalPages: pagination.total_pages,
        totalCount: pagination.total_count,
        perPage: pagination.per_page,
        hasMore: pagination.current_page < pagination.total_pages && response.data.length > 0
      }
    }
  }

  /**
   * Fetch all pages from an endpoint (use with caution for large datasets)
   */
  async fetchAll<T extends LawmaticsEntity>(
    endpoint: string,
    options: PaginationOptions & { fields?: string; onProgress?: (page: number, total: number) => void } = {}
  ): Promise<T[]> {
    const allData: T[] = []
    let page = options.page ?? 1
    const perPage = options.perPage ?? DEFAULT_PAGE_SIZE

    while (true) {
      const result = await this.fetchPage<T>(endpoint, {
        ...options,
        page,
        perPage
      })

      allData.push(...result.data)

      if (options.onProgress) {
        options.onProgress(page, result.pagination.totalPages)
      }

      if (!result.pagination.hasMore) {
        break
      }

      page++
    }

    return allData
  }

  // ===================================
  // ENTITY-SPECIFIC METHODS
  // ===================================

  /**
   * Fetch Lawmatics users (staff/attorneys)
   */
  async fetchUsers(options: PaginationOptions = {}): Promise<PageResult<LawmaticsUser>> {
    return this.fetchPage<LawmaticsUser>('/users', options)
  }

  /**
   * Fetch all Lawmatics users
   */
  async fetchAllUsers(options: Omit<PaginationOptions, 'page'> = {}): Promise<LawmaticsUser[]> {
    return this.fetchAll<LawmaticsUser>('/users', options)
  }

  /**
   * Fetch contacts (leads/clients)
   */
  async fetchContacts(options: PaginationOptions = {}): Promise<PageResult<LawmaticsContact>> {
    return this.fetchPage<LawmaticsContact>('/contacts', {
      ...options,
      perPage: options.perPage ?? DEFAULT_PAGE_SIZE
    })
  }

  /**
   * Fetch all contacts
   */
  async fetchAllContacts(
    options: Omit<PaginationOptions, 'page'> & { onProgress?: (page: number, total: number) => void } = {}
  ): Promise<LawmaticsContact[]> {
    return this.fetchAll<LawmaticsContact>('/contacts', options)
  }

  /**
   * Fetch prospects (matters)
   */
  async fetchProspects(options: PaginationOptions = {}): Promise<PageResult<LawmaticsProspect>> {
    return this.fetchPage<LawmaticsProspect>('/prospects', {
      ...options,
      perPage: options.perPage ?? DEFAULT_PAGE_SIZE
    })
  }

  /**
   * Fetch all prospects
   */
  async fetchAllProspects(
    options: Omit<PaginationOptions, 'page'> & { onProgress?: (page: number, total: number) => void } = {}
  ): Promise<LawmaticsProspect[]> {
    return this.fetchAll<LawmaticsProspect>('/prospects', options)
  }

  /**
   * Fetch notes for an entity
   * Notes are fetched by filtering on contact_id or matter_id
   */
  async fetchNotes(
    entityType: 'contact' | 'prospect',
    entityId: string,
    options: PaginationOptions = {}
  ): Promise<PageResult<LawmaticsNote>> {
    const filterField = entityType === 'contact' ? 'contact_id' : 'matter_id'

    const params: Record<string, string | number | undefined> = {
      fields: 'all',
      page: options.page ?? 1,
      per_page: options.perPage ?? DEFAULT_PAGE_SIZE,
      filter_by: filterField,
      filter_on: entityId
    }

    // Add updated_since filter if provided
    if (options.updatedSince) {
      // Note: May need to combine filters differently depending on API support
      params['filter_by_2'] = 'updated_at'
      params['filter_op_2'] = 'gt'
      params['filter_on_2'] = options.updatedSince
    }

    const response = await this.request<LawmaticsNote>('/notes', params)

    const pagination = response.meta?.pagination ?? {
      current_page: options.page ?? 1,
      total_pages: 1,
      total_count: response.data.length,
      per_page: options.perPage ?? DEFAULT_PAGE_SIZE
    }

    return {
      data: response.data,
      pagination: {
        currentPage: pagination.current_page,
        totalPages: pagination.total_pages,
        totalCount: pagination.total_count,
        perPage: pagination.per_page,
        hasMore: pagination.current_page < pagination.total_pages && response.data.length > 0
      }
    }
  }

  /**
   * Fetch all notes (across all entities)
   * Use for bulk import; filters by updated_since for incremental
   */
  async fetchAllNotes(
    options: Omit<PaginationOptions, 'page'> & { onProgress?: (page: number, total: number) => void } = {}
  ): Promise<LawmaticsNote[]> {
    return this.fetchAll<LawmaticsNote>('/notes', options)
  }

  /**
   * Fetch timeline activities
   * This endpoint can return very large datasets (100k+ records)
   */
  async fetchActivities(options: PaginationOptions = {}): Promise<PageResult<LawmaticsActivity>> {
    return this.fetchPage<LawmaticsActivity>('/timeline', {
      ...options,
      // Activities use smaller page size due to volume
      perPage: options.perPage ?? ACTIVITIES_PAGE_SIZE
    })
  }

  /**
   * Fetch activities for a specific entity
   */
  async fetchEntityActivities(
    entityType: 'contact' | 'prospect',
    entityId: string,
    options: PaginationOptions = {}
  ): Promise<PageResult<LawmaticsActivity>> {
    const filterField = entityType === 'contact' ? 'contact_id' : 'matter_id'

    const params: Record<string, string | number | undefined> = {
      fields: 'all',
      page: options.page ?? 1,
      per_page: options.perPage ?? ACTIVITIES_PAGE_SIZE,
      filter_by: filterField,
      filter_on: entityId
    }

    if (options.updatedSince) {
      params['filter_by_2'] = 'updated_at'
      params['filter_op_2'] = 'gt'
      params['filter_on_2'] = options.updatedSince
    }

    const response = await this.request<LawmaticsActivity>('/timeline', params)

    const pagination = response.meta?.pagination ?? {
      current_page: options.page ?? 1,
      total_pages: 1,
      total_count: response.data.length,
      per_page: options.perPage ?? ACTIVITIES_PAGE_SIZE
    }

    return {
      data: response.data,
      pagination: {
        currentPage: pagination.current_page,
        totalPages: pagination.total_pages,
        totalCount: pagination.total_count,
        perPage: pagination.per_page,
        hasMore: pagination.current_page < pagination.total_pages && response.data.length > 0
      }
    }
  }

  // ===================================
  // UTILITY METHODS
  // ===================================

  /**
   * Test the API connection
   * Fetches a single user to verify credentials work
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.fetchPage<LawmaticsUser>('/users', { perPage: 1 })
      return { success: true }
    } catch (error) {
      if (error instanceof LawmaticsApiError) {
        return { success: false, error: error.message }
      }
      if (error instanceof RateLimitError) {
        return { success: false, error: 'Rate limited - try again later' }
      }
      return { success: false, error: String(error) }
    }
  }

  /**
   * Get counts for each entity type (for progress estimation)
   */
  async getEntityCounts(): Promise<{
    users: number
    contacts: number
    prospects: number
  }> {
    // Fetch first page of each to get total counts
    const [users, contacts, prospects] = await Promise.all([
      this.fetchPage<LawmaticsUser>('/users', { perPage: 1 }),
      this.fetchPage<LawmaticsContact>('/contacts', { perPage: 1 }),
      this.fetchPage<LawmaticsProspect>('/prospects', { perPage: 1 })
    ])

    return {
      users: users.pagination.totalCount,
      contacts: contacts.pagination.totalCount,
      prospects: prospects.pagination.totalCount
    }
  }
}

/**
 * Create a Lawmatics client from an integration's stored credentials
 * Retrieves and decrypts the API key from KV storage
 *
 * @param context - H3 event or Cloudflare env for accessing encryption context
 * @param integrationId - Integration ID for error messages
 * @param credentialsKey - KV key where credentials are stored
 * @param options - Client options
 */
export async function createLawmaticsClientFromIntegration(
  context: import('h3').H3Event | { cloudflareEnv: any },
  integrationId: string,
  credentialsKey: string,
  options: { debug?: boolean } = {}
): Promise<LawmaticsClient> {
  const { decrypt } = await import('./encryption')

  // Retrieve encrypted credentials from KV
  const credentialsData = await kv.get(credentialsKey)

  if (!credentialsData) {
    throw new Error(`Credentials not found for integration ${integrationId}`)
  }

  // KV may return parsed object or JSON string depending on how it was stored
  const credentials: { accessToken: string } = typeof credentialsData === 'string'
    ? JSON.parse(credentialsData)
    : credentialsData as { accessToken: string }

  if (!credentials.accessToken) {
    throw new Error('Invalid credentials: missing accessToken')
  }

  // Decrypt the access token
  const decryptedToken = await decrypt(context, credentials.accessToken)

  return new LawmaticsClient(decryptedToken, options)
}
