/**
 * Client ID Resolution Utility
 *
 * The codebase has two ID systems for clients:
 * - Legacy tables (matters, documents, journeys, relationships) reference users.id
 * - New billing tables (invoices, trust ledgers) reference clients.id
 * - URLs like /clients/:id use clients.id
 *
 * This utility resolves between them via the shared personId in the people table.
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../db'

export interface ResolvedClientIds {
  clientTableId: string | null  // clients.id (null if no clients record)
  userIds: string[]             // users.id[] (for legacy FK queries)
  personId: string              // people.id
}

/**
 * Resolve a client identifier (either clients.id or users.id) to all related IDs.
 * Tries clients.id first, then falls back to users.id.
 */
export async function resolveClientIds(id: string): Promise<ResolvedClientIds | null> {
  const db = useDrizzle()

  // Try as clients.id first
  const client = await db.select({ id: schema.clients.id, personId: schema.clients.personId })
    .from(schema.clients)
    .where(eq(schema.clients.id, id))
    .get()

  if (client) {
    const users = await db.select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.personId, client.personId))
      .all()
    return {
      clientTableId: client.id,
      userIds: users.map(u => u.id),
      personId: client.personId
    }
  }

  // Try as users.id
  const user = await db.select({ id: schema.users.id, personId: schema.users.personId })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .get()

  if (user && user.personId) {
    const clientRecord = await db.select({ id: schema.clients.id })
      .from(schema.clients)
      .where(eq(schema.clients.personId, user.personId))
      .get()
    return {
      clientTableId: clientRecord?.id || null,
      userIds: [user.id],
      personId: user.personId
    }
  }

  return null
}

/**
 * Get all IDs that should be used when querying a legacy table
 * (matters, documents, journeys, relationships) by clientId.
 * Returns the original ID plus any resolved user IDs.
 */
export async function getLegacyClientIds(clientId: string): Promise<string[]> {
  const resolved = await resolveClientIds(clientId)
  if (!resolved) return [clientId]

  // Include the original ID and all user IDs for maximum compatibility
  const ids = new Set([clientId, ...resolved.userIds])
  return Array.from(ids)
}
