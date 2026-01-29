import { eq } from 'drizzle-orm'
import { getClientTrustBalance, getClientTrustBalances } from '../../../../utils/trust-ledger'

/**
 * GET /api/trust/clients/:clientId/balance
 *
 * Get a client's current trust balance(s).
 * Query params: matterId (optional - returns specific matter balance)
 *
 * Requires: LAWYER, ADMIN, or STAFF role
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !['ADMIN', 'LAWYER', 'STAFF'].includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Unauthorized' })
  }

  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) {
    throw createError({ statusCode: 400, message: 'Client ID is required' })
  }

  const query = getQuery(event)
  const matterId = query.matterId as string | undefined

  const { useDrizzle, schema } = await import('../../../../db')
  const db = useDrizzle()

  // Verify client exists and get name
  const [client] = await db
    .select({
      id: schema.clients.id,
      firstName: schema.people.firstName,
      lastName: schema.people.lastName,
      fullName: schema.people.fullName
    })
    .from(schema.clients)
    .innerJoin(schema.people, eq(schema.clients.personId, schema.people.id))
    .where(eq(schema.clients.id, clientId))

  if (!client) {
    throw createError({ statusCode: 404, message: 'Client not found' })
  }

  const clientName = client.fullName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Unknown'

  // If specific matter requested, return that balance
  if (matterId) {
    const balance = await getClientTrustBalance(clientId, matterId)

    // Get matter title
    const [matter] = await db
      .select({ title: schema.matters.title })
      .from(schema.matters)
      .where(eq(schema.matters.id, matterId))

    return {
      clientId,
      clientName,
      matterId,
      matterTitle: matter?.title || 'Unknown Matter',
      balance,
      // Snake case
      client_id: clientId,
      client_name: clientName,
      matter_id: matterId,
      matter_title: matter?.title || 'Unknown Matter'
    }
  }

  // Return all balances for the client
  const balances = await getClientTrustBalances(clientId)

  // Get matter titles for balances with matters
  const matterIds = balances.filter(b => b.matterId).map(b => b.matterId!)
  const matterTitles: Record<string, string> = {}

  if (matterIds.length > 0) {
    const matters = await db
      .select({
        id: schema.matters.id,
        title: schema.matters.title
      })
      .from(schema.matters)

    for (const m of matters) {
      if (matterIds.includes(m.id)) {
        matterTitles[m.id] = m.title
      }
    }
  }

  // Calculate total balance
  const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0)

  return {
    clientId,
    clientName,
    totalBalance,
    balances: balances.map(b => ({
      ...b,
      matterTitle: b.matterId ? matterTitles[b.matterId] || 'Unknown Matter' : null,
      // Snake case
      client_id: b.clientId,
      matter_id: b.matterId,
      matter_title: b.matterId ? matterTitles[b.matterId] || 'Unknown Matter' : null
    })),
    // Snake case
    client_id: clientId,
    client_name: clientName,
    total_balance: totalBalance
  }
})
