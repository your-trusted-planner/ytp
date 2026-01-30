// Get client billing rates
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const clientId = getRouterParam(event, 'clientId')

  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  // Verify client exists
  const [client] = await db
    .select({
      clientId: schema.clients.id,
      firstName: schema.people.firstName,
      lastName: schema.people.lastName,
      fullName: schema.people.fullName,
      email: schema.people.email
    })
    .from(schema.clients)
    .innerJoin(schema.people, eq(schema.clients.personId, schema.people.id))
    .where(eq(schema.clients.id, clientId))
    .limit(1)

  if (!client) {
    throw createError({
      statusCode: 404,
      message: 'Client not found'
    })
  }

  // Get billing rates
  const [rates] = await db
    .select()
    .from(schema.clientBillingRates)
    .where(eq(schema.clientBillingRates.clientId, clientId))
    .limit(1)

  const clientName = client.fullName || [client.firstName, client.lastName].filter(Boolean).join(' ') || client.email || 'Unknown'

  return {
    clientId,
    clientName,
    attorneyRate: rates?.attorneyRate || null,
    staffRate: rates?.staffRate || null,
    userRates: rates?.userRates ? JSON.parse(rates.userRates) : {},
    notes: rates?.notes || null,
    effectiveDate: rates?.effectiveDate || null
  }
})
