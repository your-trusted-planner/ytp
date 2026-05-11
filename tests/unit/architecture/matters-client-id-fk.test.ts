/**
 * Architectural invariant — matters.client_id targets clients.id.
 *
 * A matter is the firm's representation of a client on a specific
 * engagement. Under the Belly Button Principle, the client identifier
 * is clients.id, not users.id. The legacy FK to users.id forced every
 * client with an open matter to have a portal user account.
 *
 * This test fails until the migration relocates the FK from users.id to
 * clients.id and applies the ClientId brand.
 */
import { describe, it, expect } from 'vitest'
import { getTableConfig } from 'drizzle-orm/sqlite-core'
import { matters } from '../../../server/db/schema/matters'
import { clients } from '../../../server/db/schema/clients'

describe('Belly Button Principle — matters client identity', () => {
  it('matters.client_id FK references clients.id (not users.id)', () => {
    const config = getTableConfig(matters)
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
    type ClientIdType = typeof matters.$inferInsert.clientId
    type ExpectedBrand = string & { readonly __brand: 'ClientId' }

    const assertion: ClientIdType extends ExpectedBrand ? true : false = true
    expect(assertion).toBe(true)
  })
})
