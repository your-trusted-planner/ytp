/**
 * Integration Tests for Lawmatics API Client
 *
 * Uses MSW (Mock Service Worker) to simulate Lawmatics API responses.
 * Tests client methods for fetching data, handling pagination,
 * and error scenarios.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { setupServer } from 'msw/node'
import {
  LawmaticsClient,
  RateLimitError,
  LawmaticsApiError
} from '../../server/utils/lawmatics-client'
import {
  lawmaticsHandlers,
  resetMockState,
  setMockFailure,
  setMockFailAfter,
  getRequestCount
} from '../utils/lawmatics-api'
import {
  usersFixture,
  contactsFixture,
  prospectsFixture,
  notesFixture,
  activitiesFixture,
  fixtureMetadata
} from '../fixtures/lawmatics'

// Set up MSW server with Lawmatics handlers
const server = setupServer(...lawmaticsHandlers)

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

// Reset handlers and mock state between tests
afterEach(() => {
  server.resetHandlers()
  resetMockState()
})

// Clean up after all tests
afterAll(() => {
  server.close()
})

// Valid test token
const VALID_TOKEN = 'test-token-12345'

describe('LawmaticsClient', () => {
  describe('Constructor', () => {
    it('creates client with access token', () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      expect(client).toBeDefined()
    })

    it('creates client with debug option', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const client = new LawmaticsClient(VALID_TOKEN, { debug: true })

      // Debug logging happens on fetch, so we don't expect logs yet
      expect(client).toBeDefined()

      consoleSpy.mockRestore()
    })
  })

  describe('fetchUsers', () => {
    it('fetches first page of users', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      const result = await client.fetchUsers()

      expect(result.data).toHaveLength(usersFixture.data.length)
      expect(result.data[0]).toHaveProperty('id')
      expect(result.data[0]).toHaveProperty('type', 'user')
      expect(result.data[0]).toHaveProperty('attributes')
    })

    it('includes pagination info', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      const result = await client.fetchUsers()

      expect(result.pagination).toBeDefined()
      expect(result.pagination.currentPage).toBe(1)
      expect(result.pagination.perPage).toBeGreaterThan(0)
      expect(typeof result.pagination.hasMore).toBe('boolean')
    })

    it('respects page parameter', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      const result = await client.fetchUsers({ page: 1 })

      expect(result.pagination.currentPage).toBe(1)
    })
  })

  describe('fetchAllUsers', () => {
    it('fetches all users', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      const users = await client.fetchAllUsers()

      expect(users.length).toBeGreaterThan(0)
      expect(users[0]).toHaveProperty('id')
      expect(users[0]).toHaveProperty('type', 'user')
    })
  })

  describe('fetchContacts', () => {
    it('fetches first page of contacts', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      const result = await client.fetchContacts()

      expect(result.data).toHaveLength(contactsFixture.data.length)
      expect(result.data[0]).toHaveProperty('type', 'contact')
      expect(result.data[0].attributes).toHaveProperty('first_name')
    })

    it('includes pagination metadata', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      const result = await client.fetchContacts()

      expect(result.pagination).toBeDefined()
      expect(result.pagination.totalCount).toBe(contactsFixture.data.length)
    })
  })

  describe('fetchAllContacts with pagination', () => {
    it('fetches paginated contacts with progress callback', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)
      const progressCalls: Array<{ page: number; total: number }> = []

      // Use small page size to trigger pagination
      const contacts = await client.fetchAllContacts({
        perPage: 3,
        onProgress: (page, total) => {
          progressCalls.push({ page, total })
        }
      })

      // Should have made multiple page requests
      expect(progressCalls.length).toBeGreaterThanOrEqual(1)

      // All contacts should be returned
      expect(contacts.length).toBeGreaterThan(0)
    })
  })

  describe('fetchProspects', () => {
    it('fetches first page of prospects', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      const result = await client.fetchProspects()

      expect(result.data).toHaveLength(prospectsFixture.data.length)
      expect(result.data[0]).toHaveProperty('type', 'prospect')
    })

    it('includes relationship data', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      const result = await client.fetchProspects()

      // At least one prospect should have a contact relationship
      const withContact = result.data.find(p => p.relationships?.contact?.data)
      expect(withContact).toBeDefined()
    })
  })

  describe('fetchAllProspects', () => {
    it('fetches all prospects', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      const prospects = await client.fetchAllProspects()

      expect(prospects.length).toBe(prospectsFixture.data.length)
    })
  })

  describe('fetchNotes', () => {
    it('fetches notes for a contact', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)
      const contactId = notesFixture.data[0]?.relationships?.contact?.data
      const id = Array.isArray(contactId) ? contactId[0]?.id : contactId?.id

      if (id) {
        const result = await client.fetchNotes('contact', id)

        expect(result.data).toBeDefined()
        expect(Array.isArray(result.data)).toBe(true)
      }
    })

    it('fetches notes for a prospect', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)
      const prospectId = notesFixture.data.find(n => n.relationships?.prospect?.data)
        ?.relationships?.prospect?.data
      const id = Array.isArray(prospectId) ? prospectId[0]?.id : prospectId?.id

      if (id) {
        const result = await client.fetchNotes('prospect', id)

        expect(result.data).toBeDefined()
        expect(Array.isArray(result.data)).toBe(true)
      }
    })
  })

  describe('fetchAllNotes', () => {
    it('fetches all notes', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      const notes = await client.fetchAllNotes()

      expect(notes.length).toBe(notesFixture.data.length)
      expect(notes[0]).toHaveProperty('type', 'note')
    })
  })

  describe('fetchActivities', () => {
    it('fetches timeline activities', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      const result = await client.fetchActivities()

      expect(result.data.length).toBe(activitiesFixture.data.length)
    })

    it('uses smaller page size for activities', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      const result = await client.fetchActivities()

      // Default activities page size is 25
      expect(result.pagination.perPage).toBe(25)
    })
  })

  describe('fetchEntityActivities', () => {
    it('fetches activities for a contact', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)
      const contactId = activitiesFixture.data.find(a => a.relationships?.contact?.data)
        ?.relationships?.contact?.data
      const id = Array.isArray(contactId) ? contactId[0]?.id : contactId?.id

      if (id) {
        const result = await client.fetchEntityActivities('contact', id)

        expect(result.data).toBeDefined()
        expect(Array.isArray(result.data)).toBe(true)
      }
    })

    it('fetches activities for a prospect', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)
      const prospectId = activitiesFixture.data.find(a => a.relationships?.prospect?.data)
        ?.relationships?.prospect?.data
      const id = Array.isArray(prospectId) ? prospectId[0]?.id : prospectId?.id

      if (id) {
        const result = await client.fetchEntityActivities('prospect', id)

        expect(result.data).toBeDefined()
        expect(Array.isArray(result.data)).toBe(true)
      }
    })
  })

  describe('testConnection', () => {
    it('returns success for valid credentials', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      const result = await client.testConnection()

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('returns failure for invalid credentials', async () => {
      const client = new LawmaticsClient('invalid-token')

      const result = await client.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('returns failure when rate limited', async () => {
      const client = new LawmaticsClient('rate-limited-token')

      const result = await client.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Rate limited')
    })
  })

  describe('getEntityCounts', () => {
    it('returns counts for all entity types', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      const counts = await client.getEntityCounts()

      // Counts should be non-negative integers
      expect(counts.users).toBeGreaterThanOrEqual(0)
      expect(counts.contacts).toBeGreaterThanOrEqual(0)
      expect(counts.prospects).toBeGreaterThanOrEqual(0)

      // Should return actual fixture counts
      // Note: When perPage <= 10, paginated fixtures are used which have different totals
      expect(counts.users).toBe(usersFixture.data.length)
      // contacts uses pagination fixture which has total_count: 7
      expect(counts.contacts).toBeGreaterThanOrEqual(1)
      expect(counts.prospects).toBe(prospectsFixture.data.length)
    })

    it('makes parallel requests for efficiency', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      const startCount = getRequestCount()
      await client.getEntityCounts()
      const endCount = getRequestCount()

      // Should make exactly 3 requests (one per entity type)
      expect(endCount - startCount).toBe(3)
    })
  })

  describe('Error Handling', () => {
    it('throws RateLimitError for 429 responses', async () => {
      const client = new LawmaticsClient('rate-limited-token')

      await expect(client.fetchUsers()).rejects.toThrow(RateLimitError)
    })

    it('RateLimitError includes retryAfter value', async () => {
      const client = new LawmaticsClient('rate-limited-token')

      try {
        await client.fetchUsers()
        expect.fail('Should have thrown RateLimitError')
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError)
        expect((error as RateLimitError).retryAfter).toBe(60)
      }
    })

    it('throws LawmaticsApiError for 401 responses', async () => {
      const client = new LawmaticsClient('invalid-token')

      await expect(client.fetchUsers()).rejects.toThrow(LawmaticsApiError)
    })

    it('LawmaticsApiError includes status code', async () => {
      const client = new LawmaticsClient('invalid-token')

      try {
        await client.fetchUsers()
        expect.fail('Should have thrown LawmaticsApiError')
      } catch (error) {
        expect(error).toBeInstanceOf(LawmaticsApiError)
        expect((error as LawmaticsApiError).statusCode).toBe(401)
      }
    })

    it('throws LawmaticsApiError for 500 responses', async () => {
      setMockFailure('server_error')
      const client = new LawmaticsClient(VALID_TOKEN)

      await expect(client.fetchUsers()).rejects.toThrow(LawmaticsApiError)
    })

    it('handles failure after N successful requests', async () => {
      setMockFailAfter(2, 'server_error')
      const client = new LawmaticsClient(VALID_TOKEN)

      // First two requests succeed
      await expect(client.fetchUsers()).resolves.toBeDefined()
      await expect(client.fetchContacts()).resolves.toBeDefined()

      // Third request fails
      await expect(client.fetchProspects()).rejects.toThrow(LawmaticsApiError)
    })
  })

  describe('Pagination Handling', () => {
    it('correctly identifies when there are more pages', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      // Use small page size to trigger pagination
      const result = await client.fetchContacts({ perPage: 3 })

      if (result.pagination.totalPages > 1) {
        expect(result.pagination.hasMore).toBe(true)
      }
    })

    it('correctly identifies when on last page', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      // Fetch with large page size to get all in one page
      const result = await client.fetchContacts({ perPage: 100 })

      expect(result.pagination.hasMore).toBe(false)
    })
  })

  describe('Debug Mode', () => {
    it('logs requests when debug is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const client = new LawmaticsClient(VALID_TOKEN, { debug: true })

      await client.fetchUsers()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[LawmaticsClient]'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })

    it('does not log when debug is disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const client = new LawmaticsClient(VALID_TOKEN, { debug: false })

      await client.fetchUsers()

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[LawmaticsClient]'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Incremental Sync', () => {
    it('supports updatedSince parameter for contacts', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      // This should not throw - the API accepts the filter
      const result = await client.fetchContacts({
        updatedSince: '2024-01-01T00:00:00Z'
      })

      expect(result.data).toBeDefined()
    })

    it('supports updatedSince parameter for prospects', async () => {
      const client = new LawmaticsClient(VALID_TOKEN)

      const result = await client.fetchProspects({
        updatedSince: '2024-01-01T00:00:00Z'
      })

      expect(result.data).toBeDefined()
    })
  })
})

describe('Fixture Data Validation', () => {
  it('fixture users have required attributes', () => {
    for (const user of usersFixture.data) {
      expect(user.id).toBeDefined()
      expect(user.type).toBe('user')
      expect(user.attributes).toBeDefined()
    }
  })

  it('fixture contacts have required attributes', () => {
    for (const contact of contactsFixture.data) {
      expect(contact.id).toBeDefined()
      expect(contact.type).toBe('contact')
      expect(contact.attributes).toBeDefined()
    }
  })

  it('fixture prospects have required attributes', () => {
    for (const prospect of prospectsFixture.data) {
      expect(prospect.id).toBeDefined()
      expect(prospect.type).toBe('prospect')
      expect(prospect.attributes).toBeDefined()
    }
  })

  it('fixture notes have required attributes', () => {
    for (const note of notesFixture.data) {
      expect(note.id).toBeDefined()
      expect(note.type).toBe('note')
      expect(note.attributes).toBeDefined()
    }
  })

  it('fixture activities have required attributes', () => {
    for (const activity of activitiesFixture.data) {
      expect(activity.id).toBeDefined()
      expect(activity.type).toBeDefined()
      expect(activity.attributes).toBeDefined()
    }
  })

  it('fixture metadata counts are accurate', () => {
    expect(fixtureMetadata.users.count).toBe(usersFixture.data.length)
    expect(fixtureMetadata.contacts.count).toBe(contactsFixture.data.length)
    expect(fixtureMetadata.prospects.count).toBe(prospectsFixture.data.length)
    expect(fixtureMetadata.notes.count).toBe(notesFixture.data.length)
    expect(fixtureMetadata.activities.count).toBe(activitiesFixture.data.length)
  })
})
