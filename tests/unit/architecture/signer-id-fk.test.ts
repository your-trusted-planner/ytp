/**
 * Architectural invariant — signature_sessions.signer_id targets people.id.
 *
 * Under the Belly Button Principle, a signer is a *person*, not a user.
 * Multi-signer flows (spouses, fiduciaries, witnesses) must support signers
 * who have no portal user account, so signer_id must FK to people.id and
 * carry the PersonId brand.
 *
 * This test fails until the migration relocates the FK from users.id to
 * people.id. Once green, it locks the invariant so a future agent cannot
 * silently revert.
 */
import { describe, it, expect } from 'vitest'
import { getTableConfig } from 'drizzle-orm/sqlite-core'
import { signatureSessions } from '../../../server/db/schema/signatures'
import { people } from '../../../server/db/schema/people'

describe('Belly Button Principle — signer identity', () => {
  it('signature_sessions.signer_id FK references people.id (not users.id)', () => {
    const config = getTableConfig(signatureSessions)
    const signerFk = config.foreignKeys.find((fk) => {
      const ref = fk.reference()
      return ref.columns.some(col => col.name === 'signer_id')
    })

    expect(signerFk, 'signer_id should have a FK declaration').toBeDefined()

    const ref = signerFk!.reference()
    // foreignTable is the table the FK points at.
    expect(ref.foreignTable, 'signer_id must FK to the people table').toBe(people)
    expect(ref.foreignColumns.map(c => c.name)).toEqual(['id'])
  })

  it('signer_id carries the PersonId brand at the type level', () => {
    // Compile-time guarantee. If a future agent removes the .$type<PersonId>()
    // annotation, this becomes a type error and the build fails.
    type SignerIdType = typeof signatureSessions.$inferInsert.signerId
    type ExpectedBrand = string & { readonly __brand: 'PersonId' }

    // Use a type-level assertion via a conditional type. Vitest's runtime
    // check is the function returning true; the real test is the compiler
    // refusing to compile if the types diverge.
    const assertion: SignerIdType extends ExpectedBrand ? true : false = true
    expect(assertion).toBe(true)
  })
})
