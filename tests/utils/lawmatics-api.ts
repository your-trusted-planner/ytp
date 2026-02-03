/**
 * Mock Handlers for Lawmatics API
 *
 * Provides two approaches:
 * 1. MSW handlers for full integration testing (requires `pnpm add -D msw`)
 * 2. MockLawmaticsClient for unit testing without MSW
 *
 * MSW Usage:
 * ```
 * import { setupServer } from 'msw/node'
 * import { lawmaticsHandlers } from '../mocks/lawmatics-api'
 * const server = setupServer(...lawmaticsHandlers)
 * beforeAll(() => server.listen())
 * afterEach(() => server.resetHandlers())
 * afterAll(() => server.close())
 * ```
 */

// Conditionally import MSW if available
let http: any, HttpResponse: any
try {
  const msw = require('msw')
  http = msw.http
  HttpResponse = msw.HttpResponse
} catch {
  // MSW not installed - handlers will be empty
  http = null
  HttpResponse = null
}
import {
  usersFixture,
  contactsFixture,
  getContactsPage,
  prospectsFixture,
  notesFixture,
  activitiesFixture,
  error401Fixture,
  error429Fixture,
  error500Fixture
} from '../fixtures/lawmatics'

const LAWMATICS_BASE_URL = 'https://api.lawmatics.com/v1'

/**
 * State for controlling mock behavior in tests
 */
export interface MockState {
  shouldFail: boolean
  failureType: 'unauthorized' | 'rate_limit' | 'server_error' | null
  requestCount: number
  failAfterRequests: number | null
}

let mockState: MockState = {
  shouldFail: false,
  failureType: null,
  requestCount: 0,
  failAfterRequests: null
}

/**
 * Reset mock state between tests
 */
export function resetMockState(): void {
  mockState = {
    shouldFail: false,
    failureType: null,
    requestCount: 0,
    failAfterRequests: null
  }
}

/**
 * Configure mock to fail with specific error
 */
export function setMockFailure(type: MockState['failureType']): void {
  mockState.shouldFail = true
  mockState.failureType = type
}

/**
 * Configure mock to fail after N successful requests
 */
export function setMockFailAfter(count: number, type: MockState['failureType']): void {
  mockState.failAfterRequests = count
  mockState.failureType = type
}

/**
 * Get current request count (for testing rate limiting, retries, etc.)
 */
export function getRequestCount(): number {
  return mockState.requestCount
}

/**
 * Check authorization header and return error if invalid
 */
function checkAuth(request: Request): HttpResponse | null {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return HttpResponse.json(error401Fixture, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')

  // Special test tokens
  if (token === 'invalid-token') {
    return HttpResponse.json(error401Fixture, { status: 401 })
  }

  if (token === 'rate-limited-token') {
    return HttpResponse.json(error429Fixture, {
      status: 429,
      headers: { 'Retry-After': '60' }
    })
  }

  return null
}

/**
 * Check mock state for configured failures
 */
function checkMockState(): HttpResponse | null {
  mockState.requestCount++

  // Check if we should fail after N requests
  if (
    mockState.failAfterRequests !== null &&
    mockState.requestCount > mockState.failAfterRequests
  ) {
    mockState.shouldFail = true
  }

  if (mockState.shouldFail) {
    switch (mockState.failureType) {
      case 'unauthorized':
        return HttpResponse.json(error401Fixture, { status: 401 })
      case 'rate_limit':
        return HttpResponse.json(error429Fixture, {
          status: 429,
          headers: { 'Retry-After': '60' }
        })
      case 'server_error':
        return HttpResponse.json(error500Fixture, { status: 500 })
    }
  }

  return null
}

/**
 * MSW handlers for Lawmatics API endpoints
 * Only available if MSW is installed
 */
export const lawmaticsHandlers = !http ? [] : [
  // GET /users
  http.get(`${LAWMATICS_BASE_URL}/users`, ({ request }) => {
    const authError = checkAuth(request)
    if (authError) return authError

    const stateError = checkMockState()
    if (stateError) return stateError

    return HttpResponse.json(usersFixture)
  }),

  // GET /contacts
  http.get(`${LAWMATICS_BASE_URL}/contacts`, ({ request }) => {
    const authError = checkAuth(request)
    if (authError) return authError

    const stateError = checkMockState()
    if (stateError) return stateError

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const perPage = parseInt(url.searchParams.get('per_page') || '100', 10)

    // If testing pagination (small per_page), return paginated fixtures
    if (perPage <= 10) {
      return HttpResponse.json(getContactsPage(page))
    }

    // Otherwise return all contacts
    return HttpResponse.json(contactsFixture)
  }),

  // GET /prospects
  http.get(`${LAWMATICS_BASE_URL}/prospects`, ({ request }) => {
    const authError = checkAuth(request)
    if (authError) return authError

    const stateError = checkMockState()
    if (stateError) return stateError

    return HttpResponse.json(prospectsFixture)
  }),

  // GET /notes
  http.get(`${LAWMATICS_BASE_URL}/notes`, ({ request }) => {
    const authError = checkAuth(request)
    if (authError) return authError

    const stateError = checkMockState()
    if (stateError) return stateError

    return HttpResponse.json(notesFixture)
  }),

  // GET /timeline or /activities
  http.get(`${LAWMATICS_BASE_URL}/timeline`, ({ request }) => {
    const authError = checkAuth(request)
    if (authError) return authError

    const stateError = checkMockState()
    if (stateError) return stateError

    return HttpResponse.json(activitiesFixture)
  }),

  http.get(`${LAWMATICS_BASE_URL}/activities`, ({ request }) => {
    const authError = checkAuth(request)
    if (authError) return authError

    const stateError = checkMockState()
    if (stateError) return stateError

    return HttpResponse.json(activitiesFixture)
  }),

  // GET /contacts/:id/notes
  http.get(`${LAWMATICS_BASE_URL}/contacts/:id/notes`, ({ request, params }) => {
    const authError = checkAuth(request)
    if (authError) return authError

    const stateError = checkMockState()
    if (stateError) return stateError

    const contactId = params.id as string

    // Filter notes for this contact
    const contactNotes = notesFixture.data.filter(
      note => note.relationships?.contact?.data?.id === contactId
    )

    return HttpResponse.json({
      data: contactNotes,
      meta: {
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_count: contactNotes.length,
          per_page: 100
        }
      }
    })
  }),

  // GET /prospects/:id/notes
  http.get(`${LAWMATICS_BASE_URL}/prospects/:id/notes`, ({ request, params }) => {
    const authError = checkAuth(request)
    if (authError) return authError

    const stateError = checkMockState()
    if (stateError) return stateError

    const prospectId = params.id as string

    // Filter notes for this prospect
    const prospectNotes = notesFixture.data.filter(
      note => note.relationships?.prospect?.data?.id === prospectId
    )

    return HttpResponse.json({
      data: prospectNotes,
      meta: {
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_count: prospectNotes.length,
          per_page: 100
        }
      }
    })
  }),

  // GET /prospects/:id/activities
  http.get(`${LAWMATICS_BASE_URL}/prospects/:id/activities`, ({ request, params }) => {
    const authError = checkAuth(request)
    if (authError) return authError

    const stateError = checkMockState()
    if (stateError) return stateError

    const prospectId = params.id as string

    // Filter activities for this prospect
    const prospectActivities = activitiesFixture.data.filter(
      activity => activity.relationships?.prospect?.data?.id === prospectId
    )

    return HttpResponse.json({
      data: prospectActivities,
      meta: {
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_count: prospectActivities.length,
          per_page: 25
        }
      }
    })
  })
]

// ============================================
// MOCK LAWMATICS CLIENT FOR UNIT TESTS
// ============================================

import type {
  LawmaticsUser,
  LawmaticsContact,
  LawmaticsProspect,
  LawmaticsNote,
  LawmaticsActivity,
  PageResult
} from '../../server/utils/lawmatics-client'

/**
 * Mock Lawmatics Client for unit testing
 *
 * Usage:
 * ```
 * const mockClient = new MockLawmaticsClient()
 * mockClient.setContacts(contactsFixture.data)
 *
 * // In test
 * const result = await mockClient.fetchContacts({ page: 1 })
 * expect(result.data).toHaveLength(6)
 * ```
 */
export class MockLawmaticsClient {
  private users: LawmaticsUser[] = usersFixture.data
  private contacts: LawmaticsContact[] = contactsFixture.data
  private prospects: LawmaticsProspect[] = prospectsFixture.data
  private notes: LawmaticsNote[] = notesFixture.data
  private activities: LawmaticsActivity[] = activitiesFixture.data

  private shouldFail = false
  private failureError: Error | null = null

  /**
   * Configure the mock to throw an error on next call
   */
  setFailure(error: Error): void {
    this.shouldFail = true
    this.failureError = error
  }

  /**
   * Clear any configured failure
   */
  clearFailure(): void {
    this.shouldFail = false
    this.failureError = null
  }

  /**
   * Set custom users data
   */
  setUsers(users: LawmaticsUser[]): void {
    this.users = users
  }

  /**
   * Set custom contacts data
   */
  setContacts(contacts: LawmaticsContact[]): void {
    this.contacts = contacts
  }

  /**
   * Set custom prospects data
   */
  setProspects(prospects: LawmaticsProspect[]): void {
    this.prospects = prospects
  }

  /**
   * Set custom notes data
   */
  setNotes(notes: LawmaticsNote[]): void {
    this.notes = notes
  }

  /**
   * Set custom activities data
   */
  setActivities(activities: LawmaticsActivity[]): void {
    this.activities = activities
  }

  /**
   * Reset to default fixture data
   */
  reset(): void {
    this.users = usersFixture.data
    this.contacts = contactsFixture.data
    this.prospects = prospectsFixture.data
    this.notes = notesFixture.data
    this.activities = activitiesFixture.data
    this.clearFailure()
  }

  private checkFailure(): void {
    if (this.shouldFail && this.failureError) {
      this.shouldFail = false
      throw this.failureError
    }
  }

  private paginate<T>(
    data: T[],
    page: number,
    perPage: number
  ): PageResult<T> {
    const start = (page - 1) * perPage
    const end = start + perPage
    const pageData = data.slice(start, end)

    return {
      data: pageData,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(data.length / perPage),
        totalCount: data.length,
        perPage,
        hasMore: end < data.length
      }
    }
  }

  async fetchUsers(options: { page?: number; perPage?: number } = {}): Promise<PageResult<LawmaticsUser>> {
    this.checkFailure()
    return this.paginate(this.users, options.page || 1, options.perPage || 100)
  }

  async fetchContacts(options: { page?: number; perPage?: number } = {}): Promise<PageResult<LawmaticsContact>> {
    this.checkFailure()
    return this.paginate(this.contacts, options.page || 1, options.perPage || 100)
  }

  async fetchProspects(options: { page?: number; perPage?: number } = {}): Promise<PageResult<LawmaticsProspect>> {
    this.checkFailure()
    return this.paginate(this.prospects, options.page || 1, options.perPage || 100)
  }

  async fetchNotes(options: { page?: number; perPage?: number } = {}): Promise<PageResult<LawmaticsNote>> {
    this.checkFailure()
    return this.paginate(this.notes, options.page || 1, options.perPage || 100)
  }

  async fetchActivities(options: { page?: number; perPage?: number } = {}): Promise<PageResult<LawmaticsActivity>> {
    this.checkFailure()
    return this.paginate(this.activities, options.page || 1, options.perPage || 25)
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    this.checkFailure()
    return { success: true }
  }

  async getEntityCounts(): Promise<{ users: number; contacts: number; prospects: number }> {
    this.checkFailure()
    return {
      users: this.users.length,
      contacts: this.contacts.length,
      prospects: this.prospects.length
    }
  }
}
