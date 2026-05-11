/**
 * Architectural invariant — client_marketing_attribution.client_id targets clients.id.
 *
 * Marketing attribution rows describe how a client was acquired. The "client"
 * here is the business identity (clients.id), not the auth identity (users.id).
 *
 * This test fails until the migration relocates the FK. Once green, it locks
 * the invariant.
 */
import { describe, it, expect } from 'vitest'
import { getTableConfig } from 'drizzle-orm/sqlite-core'
import { clientMarketingAttribution } from '../../../server/db/schema/clients'
import { clients } from '../../../server/db/schema/clients'

describe('Belly Button Principle — marketing attribution client identity', () => {
  it('client_marketing_attribution.client_id FK references clients.id (not users.id)', () => {
    const config = getTableConfig(clientMarketingAttribution)
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
    type ClientIdType = typeof clientMarketingAttribution.$inferInsert.clientId
    type ExpectedBrand = string & { readonly __brand: 'ClientId' }

    const assertion: ClientIdType extends ExpectedBrand ? true : false = true
    expect(assertion).toBe(true)
  })
})
