/**
 * Apollo.io API Client
 *
 * A reusable client for interacting with the Apollo REST API.
 * Handles authentication, rate limiting, and error handling.
 *
 * API Documentation: https://docs.apollo.io
 * Base URL: https://api.apollo.io/api/v1
 */

import { kv } from '@nuxthub/kv'

const APOLLO_BASE_URL = 'https://api.apollo.io/api/v1'

/**
 * Apollo contact record
 */
export interface ApolloContact {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone_numbers?: Array<{ raw_number: string; type: string }>
  organization_name?: string | null
  title?: string | null
  email_unsubscribed?: boolean
  custom_fields?: Record<string, any>
  [key: string]: any
}

/**
 * Apollo custom field definition
 */
export interface ApolloCustomField {
  id: string
  name: string
  field_type: string
  [key: string]: any
}

/**
 * Rate limit error - thrown when API returns 429
 */
export class ApolloRateLimitError extends Error {
  retryAfter?: number

  constructor(message: string, retryAfter?: number) {
    super(message)
    this.name = 'ApolloRateLimitError'
    this.retryAfter = retryAfter
  }
}

/**
 * API error - thrown for non-2xx responses
 */
export class ApolloApiError extends Error {
  statusCode: number
  responseBody?: string

  constructor(message: string, statusCode: number, responseBody?: string) {
    super(message)
    this.name = 'ApolloApiError'
    this.statusCode = statusCode
    this.responseBody = responseBody
  }
}

/**
 * Apollo API Client
 */
export class ApolloClient {
  private apiKey: string
  private debug: boolean

  constructor(apiKey: string, options: { debug?: boolean } = {}) {
    this.apiKey = apiKey
    this.debug = options.debug ?? false
  }

  private log(message: string, data?: any): void {
    if (this.debug) {
      console.log(`[ApolloClient] ${message}`, data ?? '')
    }
  }

  /**
   * Make an authenticated request to the Apollo API
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: Record<string, any>,
    queryParams?: Record<string, string>
  ): Promise<T> {
    const url = new URL(`${APOLLO_BASE_URL}${endpoint}`)
    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        url.searchParams.set(key, value)
      }
    }

    this.log(`${method} ${url.toString()}`, body)

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      }
    }

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url.toString(), options)

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      throw new ApolloRateLimitError(
        'Rate limit exceeded',
        retryAfter ? parseInt(retryAfter, 10) : undefined
      )
    }

    // Handle other errors
    if (!response.ok) {
      const responseBody = await response.text()
      throw new ApolloApiError(
        `Apollo API error: ${response.status} ${response.statusText}`,
        response.status,
        responseBody
      )
    }

    const data = await response.json() as T
    this.log('Response received', { status: response.status })

    return data
  }

  /**
   * Test the API connection by fetching a minimal resource
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Use contacts search with empty query to verify key works
      await this.request<any>('POST', '/contacts/search', {
        per_page: 1,
        page: 1
      })
      return { success: true }
    } catch (error) {
      if (error instanceof ApolloApiError) {
        return { success: false, error: error.message }
      }
      if (error instanceof ApolloRateLimitError) {
        return { success: false, error: 'Rate limited - try again later' }
      }
      return { success: false, error: String(error) }
    }
  }

  /**
   * Search for a contact by email
   */
  async searchContactByEmail(email: string): Promise<ApolloContact | null> {
    const result = await this.request<{ contacts: ApolloContact[] }>('POST', '/contacts/search', {
      q_keywords: email,
      per_page: 5,
      page: 1
    })

    // Find exact email match
    const match = result.contacts?.find(
      c => c.email?.toLowerCase() === email.toLowerCase()
    )

    return match ?? null
  }

  /**
   * Create a new contact
   */
  async createContact(data: {
    first_name?: string
    last_name?: string
    email?: string
    phone_number?: string
    custom_fields?: Record<string, any>
  }): Promise<ApolloContact> {
    const result = await this.request<{ contact: ApolloContact }>('POST', '/contacts', data)
    return result.contact
  }

  /**
   * Update an existing contact
   */
  async updateContact(
    apolloId: string,
    data: {
      first_name?: string
      last_name?: string
      email?: string
      phone_number?: string
      custom_fields?: Record<string, any>
    }
  ): Promise<ApolloContact> {
    const result = await this.request<{ contact: ApolloContact }>('PUT', `/contacts/${apolloId}`, data)
    return result.contact
  }

  /**
   * Get a single contact by ID
   */
  async getContact(apolloId: string): Promise<ApolloContact> {
    const result = await this.request<{ contact: ApolloContact }>('GET', `/contacts/${apolloId}`)
    return result.contact
  }

  /**
   * List custom fields
   */
  async listCustomFields(): Promise<ApolloCustomField[]> {
    const result = await this.request<{ custom_fields: ApolloCustomField[] }>('GET', '/custom_fields')
    return result.custom_fields ?? []
  }

  /**
   * Create a custom field
   */
  async createCustomField(name: string, fieldType: string = 'text'): Promise<ApolloCustomField> {
    const result = await this.request<{ custom_field: ApolloCustomField }>('POST', '/custom_fields', {
      name,
      field_type: fieldType
    })
    return result.custom_field
  }
}

/**
 * Create an Apollo client from an integration's stored credentials.
 * Retrieves and decrypts the API key from KV storage.
 */
export async function createApolloClientFromIntegration(
  context: import('h3').H3Event | { cloudflareEnv: any },
  integrationId: string,
  credentialsKey: string,
  options: { debug?: boolean } = {}
): Promise<ApolloClient> {
  const { decrypt } = await import('./encryption')

  // Retrieve encrypted credentials from KV
  const credentialsData = await kv.get(credentialsKey)

  if (!credentialsData) {
    throw new Error(`Credentials not found for integration ${integrationId}`)
  }

  const credentials: { accessToken: string } = typeof credentialsData === 'string'
    ? JSON.parse(credentialsData)
    : credentialsData as { accessToken: string }

  if (!credentials.accessToken) {
    throw new Error('Invalid credentials: missing accessToken')
  }

  // Decrypt the access token
  const decryptedToken = await decrypt(context, credentials.accessToken)

  return new ApolloClient(decryptedToken, options)
}
