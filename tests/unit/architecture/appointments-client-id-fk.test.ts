/**
 * Architectural invariant — appointments.client_id targets clients.id.
 *
 * Under the Belly Button Principle, a client at an appointment is identified
 * by their clients.id (business identity), not users.id (auth identity).
 * The legacy FK to users.id forced public booking flows to fabricate a
 * placeholder user account just to satisfy the constraint.
 *
 * This test fails until the migration relocates the FK from users.id to
 * clients.id and applies the ClientId brand. Once green, it locks the
 * invariant for future agents.
 */
import { describe, it, expect } from 'vitest'
import { getTableConfig } from 'drizzle-orm/sqlite-core'
import { appointments } from '../../../server/db/schema/appointments'
import { clients } from '../../../server/db/schema/clients'

describe('Belly Button Principle — appointments client identity', () => {
  it('appointments.client_id FK references clients.id (not users.id)', () => {
    const config = getTableConfig(appointments)
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
    type ClientIdType = typeof appointments.$inferInsert.clientId
    type ExpectedBrand = string & { readonly __brand: 'ClientId' }

    // Compile-time guarantee: removing the brand on appointments.clientId
    // makes this fail to compile, breaking the build.
    const assertion: ClientIdType extends ExpectedBrand | null | undefined ? true : false = true
    expect(assertion).toBe(true)
  })
})
