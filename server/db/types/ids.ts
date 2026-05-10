/**
 * Branded ID types — enforce the Belly Button Principle at compile time.
 *
 * Each entity gets its own opaque string subtype so the TypeScript compiler
 * refuses to mix them. This makes the canonical bug class
 *
 *     if (user.role === 'CLIENT' && document.clientId === user.id) { ... }
 *
 * a compile error instead of a silent runtime failure: `user.id` is a `UserId`,
 * `document.clientId` is a `ClientId`, and `===` between branded strings
 * with different brands is rejected.
 *
 * ## Adding a new branded ID
 *
 * 1. Add a `type FooId = string & { ... }` line below.
 * 2. In `server/db/schema/foo.ts`, annotate the primary key column:
 *    `id: text('id').primaryKey().$type<FooId>()`
 * 3. Drizzle's type inference will propagate the brand to every FK that
 *    references this column and every query result that selects it.
 *
 * ## Boundary casts
 *
 * Raw strings enter the system from URL params, request bodies, JSON, seed
 * data, and tests. Use the `asXxxId(...)` helpers below to assert the brand
 * at those boundaries. The helpers are TypeScript-only — they do NOT validate
 * format at runtime. Runtime safety comes from FK constraints catching any
 * wrong-table ID at DB-write time.
 */

export type UserId = string & { readonly __brand: 'UserId' }
export type ClientId = string & { readonly __brand: 'ClientId' }
export type PersonId = string & { readonly __brand: 'PersonId' }

export const asUserId = (s: string): UserId => s as UserId
export const asClientId = (s: string): ClientId => s as ClientId
export const asPersonId = (s: string): PersonId => s as PersonId
