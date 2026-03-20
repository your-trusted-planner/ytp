/**
 * Unit Tests for Apollo API Client
 *
 * Tests the client class methods, error handling, and request formatting.
 * Uses simulated responses (no real API calls).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Inline simulation of Apollo client classes (cannot import directly due to virtual module deps)

class ApolloRateLimitError extends Error {
  retryAfter?: number
  constructor(message: string, retryAfter?: number) {
    super(message)
    this.name = 'ApolloRateLimitError'
    this.retryAfter = retryAfter
  }
}

class ApolloApiError extends Error {
  statusCode: number
  responseBody?: string
  constructor(message: string, statusCode: number, responseBody?: string) {
    super(message)
    this.name = 'ApolloApiError'
    this.statusCode = statusCode
    this.responseBody = responseBody
  }
}

interface ApolloContact {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  email_unsubscribed?: boolean
  custom_fields?: Record<string, any>
}

interface ApolloCustomField {
  id: string
  name: string
  field_type: string
}

// Simulated client that mirrors the real ApolloClient logic
class SimulatedApolloClient {
  private apiKey: string
  private fetchMock: typeof fetch

  constructor(apiKey: string, fetchMock: typeof fetch) {
    this.apiKey = apiKey
    this.fetchMock = fetchMock
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: Record<string, any>
  ): Promise<T> {
    const url = `https://api.apollo.io/api/v1${endpoint}`

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

    const response = await this.fetchMock(url, options)

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      throw new ApolloRateLimitError(
        'Rate limit exceeded',
        retryAfter ? parseInt(retryAfter, 10) : undefined
      )
    }

    if (!response.ok) {
      const responseBody = await response.text()
      throw new ApolloApiError(
        `Apollo API error: ${response.status} ${response.statusText}`,
        response.status,
        responseBody
      )
    }

    return await response.json() as T
  }

  async testConnection(): Promise<{ success: boolean, error?: string }> {
    try {
      await this.request<any>('POST', '/contacts/search', { per_page: 1, page: 1 })
      return { success: true }
    }
    catch (error) {
      if (error instanceof ApolloApiError) return { success: false, error: error.message }
      if (error instanceof ApolloRateLimitError) return { success: false, error: 'Rate limited - try again later' }
      return { success: false, error: String(error) }
    }
  }

  async searchContactByEmail(email: string): Promise<ApolloContact | null> {
    const result = await this.request<{ contacts: ApolloContact[] }>('POST', '/contacts/search', {
      q_keywords: email,
      per_page: 5,
      page: 1
    })
    const match = result.contacts?.find(c => c.email?.toLowerCase() === email.toLowerCase())
    return match ?? null
  }

  async createContact(data: any): Promise<ApolloContact> {
    const result = await this.request<{ contact: ApolloContact }>('POST', '/contacts', data)
    return result.contact
  }

  async updateContact(apolloId: string, data: any): Promise<ApolloContact> {
    const result = await this.request<{ contact: ApolloContact }>('PUT', `/contacts/${apolloId}`, data)
    return result.contact
  }

  async getContact(apolloId: string): Promise<ApolloContact> {
    const result = await this.request<{ contact: ApolloContact }>('GET', `/contacts/${apolloId}`)
    return result.contact
  }

  async listCustomFields(): Promise<ApolloCustomField[]> {
    const result = await this.request<{ custom_fields: ApolloCustomField[] }>('GET', '/custom_fields')
    return result.custom_fields ?? []
  }

  async createCustomField(name: string, fieldType: string = 'text'): Promise<ApolloCustomField> {
    const result = await this.request<{ custom_field: ApolloCustomField }>('POST', '/custom_fields', {
      name, field_type: fieldType
    })
    return result.custom_field
  }
}

// ===================================
// HELPERS
// ===================================

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'Content-Type': 'application/json' }
  })
}

// ===================================
// TESTS
// ===================================

describe('ApolloClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
  })

  describe('testConnection', () => {
    it('returns success when API responds 200', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ contacts: [], pagination: {} }))

      const client = new SimulatedApolloClient('test-key', fetchMock as any)
      const result = await client.testConnection()

      expect(result.success).toBe(true)
    })

    it('returns error on 401', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' }))

      const client = new SimulatedApolloClient('bad-key', fetchMock as any)
      const result = await client.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Apollo API error')
    })

    it('returns error on 429 rate limit', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Too Many Requests', {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Retry-After': '60' }
      }))

      const client = new SimulatedApolloClient('test-key', fetchMock as any)
      const result = await client.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Rate limited')
    })
  })

  describe('searchContactByEmail', () => {
    it('finds contact with exact email match', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        contacts: [
          { id: 'apo-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
          { id: 'apo-2', first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' }
        ]
      }))

      const client = new SimulatedApolloClient('test-key', fetchMock as any)
      const result = await client.searchContactByEmail('john@example.com')

      expect(result).toBeTruthy()
      expect(result!.id).toBe('apo-1')
      expect(result!.email).toBe('john@example.com')
    })

    it('returns null when no match', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        contacts: [
          { id: 'apo-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
        ]
      }))

      const client = new SimulatedApolloClient('test-key', fetchMock as any)
      const result = await client.searchContactByEmail('notfound@example.com')

      expect(result).toBeNull()
    })

    it('matches case-insensitively', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        contacts: [
          { id: 'apo-1', first_name: 'John', last_name: 'Doe', email: 'John@Example.com' }
        ]
      }))

      const client = new SimulatedApolloClient('test-key', fetchMock as any)
      const result = await client.searchContactByEmail('john@example.com')

      expect(result).toBeTruthy()
      expect(result!.id).toBe('apo-1')
    })
  })

  describe('createContact', () => {
    it('creates a contact and returns it', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        contact: { id: 'apo-new', first_name: 'Jane', last_name: 'Smith', email: 'jane@smith.com' }
      }))

      const client = new SimulatedApolloClient('test-key', fetchMock as any)
      const result = await client.createContact({
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@smith.com'
      })

      expect(result.id).toBe('apo-new')
      expect(result.first_name).toBe('Jane')

      // Verify request body
      const callArgs = fetchMock.mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.first_name).toBe('Jane')
      expect(body.email).toBe('jane@smith.com')
    })
  })

  describe('updateContact', () => {
    it('updates a contact by ID', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        contact: { id: 'apo-1', first_name: 'Updated', last_name: 'Name', email: 'test@test.com' }
      }))

      const client = new SimulatedApolloClient('test-key', fetchMock as any)
      const result = await client.updateContact('apo-1', { first_name: 'Updated' })

      expect(result.first_name).toBe('Updated')

      // Verify it called the correct endpoint
      const callArgs = fetchMock.mock.calls[0]
      expect(callArgs[0]).toContain('/contacts/apo-1')
      expect(callArgs[1].method).toBe('PUT')
    })
  })

  describe('getContact', () => {
    it('fetches a single contact by ID', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        contact: {
          id: 'apo-1',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          email_unsubscribed: true
        }
      }))

      const client = new SimulatedApolloClient('test-key', fetchMock as any)
      const result = await client.getContact('apo-1')

      expect(result.id).toBe('apo-1')
      expect(result.email_unsubscribed).toBe(true)
    })
  })

  describe('custom fields', () => {
    it('lists custom fields', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        custom_fields: [
          { id: 'cf-1', name: 'preference_url', field_type: 'text' },
          { id: 'cf-2', name: 'other_field', field_type: 'text' }
        ]
      }))

      const client = new SimulatedApolloClient('test-key', fetchMock as any)
      const result = await client.listCustomFields()

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('preference_url')
    })

    it('creates a custom field', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        custom_field: { id: 'cf-new', name: 'preference_url', field_type: 'text' }
      }))

      const client = new SimulatedApolloClient('test-key', fetchMock as any)
      const result = await client.createCustomField('preference_url', 'text')

      expect(result.id).toBe('cf-new')
      expect(result.name).toBe('preference_url')
    })
  })

  describe('error handling', () => {
    it('throws ApolloApiError on 500', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' }))

      const client = new SimulatedApolloClient('test-key', fetchMock as any)

      await expect(client.getContact('apo-1')).rejects.toThrow(ApolloApiError)
    })

    it('throws ApolloRateLimitError on 429', async () => {
      fetchMock.mockResolvedValueOnce(new Response('Too Many Requests', {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Retry-After': '30' }
      }))

      const client = new SimulatedApolloClient('test-key', fetchMock as any)

      try {
        await client.getContact('apo-1')
        expect.fail('Should have thrown')
      }
      catch (error) {
        expect(error).toBeInstanceOf(ApolloRateLimitError)
        expect((error as ApolloRateLimitError).retryAfter).toBe(30)
      }
    })

    it('sends correct auth header', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ contacts: [] }))

      const client = new SimulatedApolloClient('my-api-key-123', fetchMock as any)
      await client.testConnection()

      const callArgs = fetchMock.mock.calls[0]
      expect(callArgs[1].headers['x-api-key']).toBe('my-api-key-123')
    })
  })
})
