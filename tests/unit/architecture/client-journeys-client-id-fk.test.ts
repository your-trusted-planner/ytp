/**
 * Architectural invariant — client_journeys.client_id targets clients.id.
 *
 * Engagement journeys capture the Rule 1.18 consultation moment which can
 * occur before a client has a portal user account. The journey attaches to
 * the client business identity (clients.id), never the auth identity
 * (users.id).
 *
 * This test fails until the migration relocates the FK from users.id to
 * clients.id and applies the ClientId brand. Once green, it locks the
 * invariant for future agents.
 */
import { describe, it, expect } from 'vitest'
import { getTableConfig } from 'drizzle-orm/sqlite-core'
import { clientJourneys } from '../../../server/db/schema/journeys'
import { clients } from '../../../server/db/schema/clients'

describe('Belly Button Principle — client journey identity', () => {
  it('client_journeys.client_id FK references clients.id (not users.id)', () => {
    const config = getTableConfig(clientJourneys)
    const clientFk = config.foreignKeys.find((fk) => {
      const ref = fk.reference()
      return ref.columns.some(col => col.name === 'client_id')
    })

    expect(clientFk, 'client_id should have a FK declaration').toBeDefined()

    const ref = clientFk!.reference()
    expect(ref.foreignTable, 'client_id must FK to the clients table').toBe(clients)
    expect(ref.foreignColumns.map(c => c.name)).toEqual(['id'])
  })

  it('client_id carries the ClientId brand at the type level', () => {
    type ClientIdType = typeof clientJourneys.$inferInsert.clientId
    type ExpectedBrand = string & { readonly __brand: 'ClientId' }

    // Compile-time guarantee: removing the brand breaks the build.
    const assertion: ClientIdType extends ExpectedBrand ? true : false = true
    expect(assertion).toBe(true)
  })
})
