/**
 * GET /api/admin/integrations/lawmatics/debug-contact
 *
 * Diagnostic endpoint: fetches a single contact from Lawmatics
 * and returns the raw response shape, including relationships.
 *
 * Query params:
 *   contactId - specific contact ID to fetch (optional, fetches first page if omitted)
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'
import { createLawmaticsClientFromIntegration } from '../../../../utils/lawmatics-client'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || (user.adminLevel ?? 0) < 2) {
    throw createError({ statusCode: 403, message: 'Admin level 2 required' })
  }

  const query = getQuery(event)
  const contactId = query.contactId as string | undefined

  const db = useDrizzle()
  const integration = await db.select()
    .from(schema.integrations)
    .where(eq(schema.integrations.type, 'LAWMATICS'))
    .get()

  if (!integration?.credentialsKey) {
    throw createError({ statusCode: 404, message: 'Lawmatics integration not found' })
  }

  const client = await createLawmaticsClientFromIntegration(
    event,
    integration.id,
    integration.credentialsKey,
    { debug: true }
  )

  if (contactId) {
    // Fetch a specific contact individually (includes relationships)
    try {
      const contact = await client.fetchSingleContact(contactId)
      return {
        source: 'individual',
        contactId,
        hasRelationships: !!contact.relationships,
        relationshipKeys: contact.relationships ? Object.keys(contact.relationships) : [],
        addressesRelationship: contact.relationships?.addresses || null,
        attributeKeys: Object.keys(contact.attributes),
        addressAttribute: contact.attributes.address || null,
        rawData: contact
      }
    } catch (error) {
      return { error: String(error) }
    }
  }

  // Fetch first page of contacts and inspect the first record
  const pageResult = await client.fetchContacts({ perPage: 2 })

  const firstContact = pageResult.data[0]
  if (!firstContact) {
    return { error: 'No contacts found' }
  }

  return {
    source: 'paginated',
    contactId: firstContact.id,
    hasRelationships: !!firstContact.relationships,
    relationshipKeys: firstContact.relationships ? Object.keys(firstContact.relationships) : [],
    addressesRelationship: firstContact.relationships?.addresses || null,
    attributeKeys: Object.keys(firstContact.attributes),
    addressAttribute: firstContact.attributes.address || null,
    // Show raw shape of first contact (strip large fields)
    rawContact: {
      id: firstContact.id,
      type: firstContact.type,
      attributeKeys: Object.keys(firstContact.attributes),
      relationships: firstContact.relationships || 'NOT PRESENT'
    }
  }
})
