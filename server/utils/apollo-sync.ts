/**
 * Apollo Contact Sync
 *
 * Handles bidirectional sync between YTP and Apollo:
 * - Push: Syncs contacts and preference URLs to Apollo
 * - Pull: Polls Apollo for opt-outs and applies them in YTP
 */

import { eq, isNotNull, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../db'
import type { ApolloClient } from './apollo-client'
import { ApolloApiError, ApolloRateLimitError } from './apollo-client'
import { generatePermanentPreferenceToken, setGlobalUnsubscribe } from './marketing-consent'

export interface SyncResult {
  created: number
  updated: number
  skipped: number
  errors: Array<{ personId: string, error: string }>
}

export interface OptOutSyncResult {
  checked: number
  newUnsubscribes: number
  errors: Array<{ personId: string, error: string }>
}

/**
 * Ensure the `preference_url` custom field exists in Apollo.
 * Returns the field ID.
 */
export async function ensurePreferenceUrlField(client: ApolloClient): Promise<string> {
  const fields = await client.listCustomFields()
  const existing = fields.find(f => f.name === 'preference_url')

  if (existing) {
    return existing.id
  }

  const created = await client.createCustomField('preference_url', 'text')
  return created.id
}

/**
 * Build preference URL for a person.
 */
async function buildPreferenceUrl(personId: string, host: string): Promise<string> {
  const token = await generatePermanentPreferenceToken(personId)
  const protocol = host.includes('localhost') ? 'http' : 'https'
  return `${protocol}://${host}/preferences/${token}`
}

/**
 * Push contacts and preference URLs to Apollo.
 *
 * For each person with an email:
 * - If they have an apolloContactId, update the Apollo contact
 * - If not, search by email in Apollo
 *   - Found: update, store apolloContactId
 *   - Not found: create, store apolloContactId
 */
export async function syncContactsToApollo(
  client: ApolloClient,
  host: string,
  options: { clientsOnly?: boolean } = {}
): Promise<SyncResult> {
  const db = useDrizzle()
  const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [] }

  // Ensure preference_url custom field exists
  const fieldId = await ensurePreferenceUrlField(client)

  // Get people to sync
  let people: { id: string, email: string | null, firstName: string | null, lastName: string | null, phone: string | null, apolloContactId: string | null }[]

  if (options.clientsOnly) {
    people = await db.select({
      id: schema.people.id,
      email: schema.people.email,
      firstName: schema.people.firstName,
      lastName: schema.people.lastName,
      phone: schema.people.phone,
      apolloContactId: schema.people.apolloContactId
    })
      .from(schema.people)
      .innerJoin(schema.clients, eq(schema.clients.personId, schema.people.id))
      .where(isNotNull(schema.people.email))
  }
  else {
    people = await db.select({
      id: schema.people.id,
      email: schema.people.email,
      firstName: schema.people.firstName,
      lastName: schema.people.lastName,
      phone: schema.people.phone,
      apolloContactId: schema.people.apolloContactId
    })
      .from(schema.people)
      .where(isNotNull(schema.people.email))
  }

  for (const person of people) {
    if (!person.email) {
      result.skipped++
      continue
    }

    try {
      const preferenceUrl = await buildPreferenceUrl(person.id, host)
      const contactData = {
        first_name: person.firstName || undefined,
        last_name: person.lastName || undefined,
        email: person.email,
        custom_fields: { [fieldId]: preferenceUrl }
      }

      if (person.apolloContactId) {
        // Update existing
        await client.updateContact(person.apolloContactId, contactData)
        result.updated++
      }
      else {
        // Search by email
        const existing = await client.searchContactByEmail(person.email)

        if (existing) {
          // Found in Apollo - update and store ID
          await client.updateContact(existing.id, contactData)
          await db.update(schema.people)
            .set({ apolloContactId: existing.id, updatedAt: new Date() })
            .where(eq(schema.people.id, person.id))
          result.updated++
        }
        else {
          // Not in Apollo - create
          const created = await client.createContact(contactData)
          await db.update(schema.people)
            .set({ apolloContactId: created.id, updatedAt: new Date() })
            .where(eq(schema.people.id, person.id))
          result.created++
        }
      }
    }
    catch (error) {
      result.errors.push({
        personId: person.id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return result
}

/**
 * Pull opt-outs from Apollo.
 *
 * For each person with an apolloContactId:
 * - Fetch the Apollo contact
 * - If email_unsubscribed is true and YTP doesn't have globalUnsubscribe set,
 *   apply the global unsubscribe in YTP
 *
 * One-way: Apollo unsubscribe -> YTP. YTP unsubscribe does NOT push to Apollo.
 */
export async function syncOptOutsFromApollo(
  client: ApolloClient
): Promise<OptOutSyncResult> {
  const db = useDrizzle()
  const result: OptOutSyncResult = { checked: 0, newUnsubscribes: 0, errors: [] }

  // Get people with apolloContactId
  const people = await db.select({
    id: schema.people.id,
    apolloContactId: schema.people.apolloContactId,
    globalUnsubscribe: schema.people.globalUnsubscribe
  })
    .from(schema.people)
    .where(isNotNull(schema.people.apolloContactId))

  for (const person of people) {
    if (!person.apolloContactId) continue

    try {
      const apolloContact = await client.getContact(person.apolloContactId)
      result.checked++

      if (apolloContact.email_unsubscribed && person.globalUnsubscribe !== 1) {
        await setGlobalUnsubscribe(person.id, 'APOLLO')
        result.newUnsubscribes++
      }
    }
    catch (error) {
      result.errors.push({
        personId: person.id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return result
}
