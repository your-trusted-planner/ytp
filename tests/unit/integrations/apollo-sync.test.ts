/**
 * Unit Tests for Apollo Contact Sync Logic
 *
 * Tests sync logic with simulated data (no real API calls, no DB).
 * Mirrors the logic in server/utils/apollo-sync.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ===================================
// Simulated types and data structures
// ===================================

interface Person {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  apolloContactId: string | null
  globalUnsubscribe: number
}

interface ApolloContact {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  email_unsubscribed?: boolean
  custom_fields?: Record<string, any>
}

interface SyncResult {
  created: number
  updated: number
  skipped: number
  errors: Array<{ personId: string; error: string }>
}

interface OptOutSyncResult {
  checked: number
  newUnsubscribes: number
  errors: Array<{ personId: string; error: string }>
}

// ===================================
// Simulated Apollo client
// ===================================

class MockApolloClient {
  contacts: Map<string, ApolloContact> = new Map()
  customFields: Array<{ id: string; name: string; field_type: string }> = []
  errorOnIds: Set<string> = new Set() // Person IDs that should trigger errors

  async searchContactByEmail(email: string): Promise<ApolloContact | null> {
    for (const contact of this.contacts.values()) {
      if (contact.email?.toLowerCase() === email.toLowerCase()) {
        return contact
      }
    }
    return null
  }

  async createContact(data: any): Promise<ApolloContact> {
    const id = `apo-${Math.random().toString(36).slice(2, 8)}`
    const contact: ApolloContact = {
      id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      custom_fields: data.custom_fields
    }
    this.contacts.set(id, contact)
    return contact
  }

  async updateContact(apolloId: string, data: any): Promise<ApolloContact> {
    const contact = this.contacts.get(apolloId)
    if (!contact) throw new Error(`Contact ${apolloId} not found`)
    Object.assign(contact, { custom_fields: data.custom_fields })
    this.contacts.set(apolloId, contact)
    return contact
  }

  async getContact(apolloId: string): Promise<ApolloContact> {
    const contact = this.contacts.get(apolloId)
    if (!contact) throw new Error(`Contact ${apolloId} not found`)
    return contact
  }

  async listCustomFields() {
    return this.customFields
  }

  async createCustomField(name: string, fieldType: string) {
    const field = { id: `cf-${Math.random().toString(36).slice(2, 8)}`, name, field_type: fieldType }
    this.customFields.push(field)
    return field
  }
}

// ===================================
// Simulated sync logic (mirrors apollo-sync.ts)
// ===================================

async function simulateEnsurePreferenceUrlField(client: MockApolloClient): Promise<string> {
  const fields = await client.listCustomFields()
  const existing = fields.find(f => f.name === 'preference_url')
  if (existing) return existing.id
  const created = await client.createCustomField('preference_url', 'text')
  return created.id
}

async function simulateSyncContacts(
  client: MockApolloClient,
  people: Person[],
  host: string,
  dbUpdates: Map<string, string> // personId -> apolloContactId
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] }
  const fieldId = await simulateEnsurePreferenceUrlField(client)

  for (const person of people) {
    if (!person.email) {
      result.skipped++
      continue
    }

    try {
      if (client.errorOnIds.has(person.id)) {
        throw new Error(`Simulated error for ${person.id}`)
      }

      const preferenceUrl = `https://${host}/preferences/token-for-${person.id}`
      const contactData = {
        first_name: person.firstName,
        last_name: person.lastName,
        email: person.email,
        custom_fields: { [fieldId]: preferenceUrl }
      }

      if (person.apolloContactId) {
        await client.updateContact(person.apolloContactId, contactData)
        result.updated++
      } else {
        const existing = await client.searchContactByEmail(person.email)
        if (existing) {
          await client.updateContact(existing.id, contactData)
          dbUpdates.set(person.id, existing.id)
          result.updated++
        } else {
          const created = await client.createContact(contactData)
          dbUpdates.set(person.id, created.id)
          result.created++
        }
      }
    } catch (error) {
      result.errors.push({
        personId: person.id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return result
}

async function simulateSyncOptOuts(
  client: MockApolloClient,
  people: Person[],
  unsubscribes: string[] // personIds that were unsubscribed
): Promise<OptOutSyncResult> {
  const result: OptOutSyncResult = { checked: 0, newUnsubscribes: 0, errors: [] }

  for (const person of people) {
    if (!person.apolloContactId) continue

    try {
      if (client.errorOnIds.has(person.id)) {
        throw new Error(`Simulated error for ${person.id}`)
      }

      const apolloContact = await client.getContact(person.apolloContactId)
      result.checked++

      if (apolloContact.email_unsubscribed && person.globalUnsubscribe !== 1) {
        unsubscribes.push(person.id)
        result.newUnsubscribes++
      }
    } catch (error) {
      result.errors.push({
        personId: person.id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return result
}

// ===================================
// TESTS
// ===================================

describe('Apollo Sync', () => {
  let client: MockApolloClient

  beforeEach(() => {
    client = new MockApolloClient()
  })

  describe('ensurePreferenceUrlField', () => {
    it('creates field if not exists', async () => {
      const fieldId = await simulateEnsurePreferenceUrlField(client)
      expect(fieldId).toBeTruthy()
      expect(client.customFields).toHaveLength(1)
      expect(client.customFields[0].name).toBe('preference_url')
    })

    it('returns existing field if already exists', async () => {
      client.customFields = [{ id: 'cf-existing', name: 'preference_url', field_type: 'text' }]

      const fieldId = await simulateEnsurePreferenceUrlField(client)
      expect(fieldId).toBe('cf-existing')
      expect(client.customFields).toHaveLength(1)
    })
  })

  describe('syncContactsToApollo', () => {
    it('creates new contacts in Apollo when no apolloContactId', async () => {
      const people: Person[] = [
        { id: 'p1', email: 'alice@test.com', firstName: 'Alice', lastName: 'Smith', phone: null, apolloContactId: null, globalUnsubscribe: 0 }
      ]
      const dbUpdates = new Map<string, string>()

      const result = await simulateSyncContacts(client, people, 'app.test.com', dbUpdates)

      expect(result.created).toBe(1)
      expect(result.updated).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(dbUpdates.has('p1')).toBe(true)
    })

    it('updates existing contacts when apolloContactId is set', async () => {
      client.contacts.set('apo-1', {
        id: 'apo-1', email: 'bob@test.com', first_name: 'Bob', last_name: 'Jones'
      })

      const people: Person[] = [
        { id: 'p2', email: 'bob@test.com', firstName: 'Bob', lastName: 'Jones', phone: null, apolloContactId: 'apo-1', globalUnsubscribe: 0 }
      ]
      const dbUpdates = new Map<string, string>()

      const result = await simulateSyncContacts(client, people, 'app.test.com', dbUpdates)

      expect(result.updated).toBe(1)
      expect(result.created).toBe(0)
    })

    it('finds existing Apollo contact by email and links it', async () => {
      client.contacts.set('apo-found', {
        id: 'apo-found', email: 'carol@test.com', first_name: 'Carol', last_name: 'White'
      })

      const people: Person[] = [
        { id: 'p3', email: 'carol@test.com', firstName: 'Carol', lastName: 'White', phone: null, apolloContactId: null, globalUnsubscribe: 0 }
      ]
      const dbUpdates = new Map<string, string>()

      const result = await simulateSyncContacts(client, people, 'app.test.com', dbUpdates)

      expect(result.updated).toBe(1)
      expect(result.created).toBe(0)
      expect(dbUpdates.get('p3')).toBe('apo-found')
    })

    it('includes preference URL in custom fields', async () => {
      const people: Person[] = [
        { id: 'p4', email: 'dave@test.com', firstName: 'Dave', lastName: null, phone: null, apolloContactId: null, globalUnsubscribe: 0 }
      ]
      const dbUpdates = new Map<string, string>()

      await simulateSyncContacts(client, people, 'app.example.com', dbUpdates)

      const apolloId = dbUpdates.get('p4')!
      const apolloContact = client.contacts.get(apolloId)!
      const fieldId = client.customFields[0].id

      expect(apolloContact.custom_fields?.[fieldId]).toContain('app.example.com/preferences/')
    })

    it('skips people without email', async () => {
      const people: Person[] = [
        { id: 'p5', email: null, firstName: 'No', lastName: 'Email', phone: null, apolloContactId: null, globalUnsubscribe: 0 }
      ]
      const dbUpdates = new Map<string, string>()

      const result = await simulateSyncContacts(client, people, 'app.test.com', dbUpdates)

      expect(result.skipped).toBe(1)
      expect(result.created).toBe(0)
    })

    it('individual contact failures do not stop the batch', async () => {
      client.errorOnIds.add('p-fail')

      const people: Person[] = [
        { id: 'p-fail', email: 'fail@test.com', firstName: 'Fail', lastName: null, phone: null, apolloContactId: null, globalUnsubscribe: 0 },
        { id: 'p-ok', email: 'ok@test.com', firstName: 'OK', lastName: null, phone: null, apolloContactId: null, globalUnsubscribe: 0 }
      ]
      const dbUpdates = new Map<string, string>()

      const result = await simulateSyncContacts(client, people, 'app.test.com', dbUpdates)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].personId).toBe('p-fail')
      expect(result.created).toBe(1)
      expect(dbUpdates.has('p-ok')).toBe(true)
    })
  })

  describe('syncOptOutsFromApollo', () => {
    it('detects new unsubscribes from Apollo', async () => {
      client.contacts.set('apo-unsub', {
        id: 'apo-unsub', email: 'unsub@test.com', first_name: 'Unsub', last_name: null,
        email_unsubscribed: true
      })

      const people: Person[] = [
        { id: 'p-unsub', email: 'unsub@test.com', firstName: 'Unsub', lastName: null, phone: null, apolloContactId: 'apo-unsub', globalUnsubscribe: 0 }
      ]
      const unsubscribes: string[] = []

      const result = await simulateSyncOptOuts(client, people, unsubscribes)

      expect(result.checked).toBe(1)
      expect(result.newUnsubscribes).toBe(1)
      expect(unsubscribes).toContain('p-unsub')
    })

    it('skips already-unsubscribed people in YTP', async () => {
      client.contacts.set('apo-already', {
        id: 'apo-already', email: 'already@test.com', first_name: 'Already', last_name: null,
        email_unsubscribed: true
      })

      const people: Person[] = [
        { id: 'p-already', email: 'already@test.com', firstName: 'Already', lastName: null, phone: null, apolloContactId: 'apo-already', globalUnsubscribe: 1 }
      ]
      const unsubscribes: string[] = []

      const result = await simulateSyncOptOuts(client, people, unsubscribes)

      expect(result.checked).toBe(1)
      expect(result.newUnsubscribes).toBe(0)
      expect(unsubscribes).toHaveLength(0)
    })

    it('skips people still subscribed in Apollo', async () => {
      client.contacts.set('apo-sub', {
        id: 'apo-sub', email: 'sub@test.com', first_name: 'Sub', last_name: null,
        email_unsubscribed: false
      })

      const people: Person[] = [
        { id: 'p-sub', email: 'sub@test.com', firstName: 'Sub', lastName: null, phone: null, apolloContactId: 'apo-sub', globalUnsubscribe: 0 }
      ]
      const unsubscribes: string[] = []

      const result = await simulateSyncOptOuts(client, people, unsubscribes)

      expect(result.checked).toBe(1)
      expect(result.newUnsubscribes).toBe(0)
    })

    it('skips people without apolloContactId', async () => {
      const people: Person[] = [
        { id: 'p-no-apollo', email: 'nolink@test.com', firstName: 'No', lastName: 'Link', phone: null, apolloContactId: null, globalUnsubscribe: 0 }
      ]
      const unsubscribes: string[] = []

      const result = await simulateSyncOptOuts(client, people, unsubscribes)

      expect(result.checked).toBe(0)
    })

    it('individual failures do not stop the batch', async () => {
      client.contacts.set('apo-ok-2', {
        id: 'apo-ok-2', email: 'ok2@test.com', first_name: 'OK', last_name: null,
        email_unsubscribed: true
      })
      client.errorOnIds.add('p-err')

      const people: Person[] = [
        { id: 'p-err', email: 'err@test.com', firstName: 'Err', lastName: null, phone: null, apolloContactId: 'apo-err', globalUnsubscribe: 0 },
        { id: 'p-ok-2', email: 'ok2@test.com', firstName: 'OK', lastName: null, phone: null, apolloContactId: 'apo-ok-2', globalUnsubscribe: 0 }
      ]
      const unsubscribes: string[] = []

      const result = await simulateSyncOptOuts(client, people, unsubscribes)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].personId).toBe('p-err')
      expect(result.checked).toBe(1)
      expect(result.newUnsubscribes).toBe(1)
    })
  })
})
