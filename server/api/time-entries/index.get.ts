// List time entries with filters
import { eq, and, desc, gte, lte, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const query = getQuery(event)
  const userId = query.userId as string | undefined
  const matterId = query.matterId as string | undefined
  const status = query.status as string | undefined
  const startDate = query.startDate as string | undefined
  const endDate = query.endDate as string | undefined
  const isBillable = query.isBillable as string | undefined

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Build filter conditions
  const conditions = []

  if (userId) {
    conditions.push(eq(schema.timeEntries.userId, userId))
  }

  if (matterId) {
    conditions.push(eq(schema.timeEntries.matterId, matterId))
  }

  if (status) {
    const statuses = status.split(',') as Array<'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'BILLED' | 'WRITTEN_OFF'>
    if (statuses.length === 1 && statuses[0]) {
      conditions.push(eq(schema.timeEntries.status, statuses[0]))
    } else if (statuses.length > 1) {
      conditions.push(inArray(schema.timeEntries.status, statuses))
    }
  }

  if (startDate) {
    conditions.push(gte(schema.timeEntries.workDate, new Date(startDate)))
  }

  if (endDate) {
    conditions.push(lte(schema.timeEntries.workDate, new Date(endDate)))
  }

  if (isBillable !== undefined) {
    conditions.push(eq(schema.timeEntries.isBillable, isBillable === 'true'))
  }

  // Query time entries with user and matter info
  const entries = await db
    .select({
      id: schema.timeEntries.id,
      userId: schema.timeEntries.userId,
      matterId: schema.timeEntries.matterId,
      hours: schema.timeEntries.hours,
      description: schema.timeEntries.description,
      workDate: schema.timeEntries.workDate,
      isBillable: schema.timeEntries.isBillable,
      hourlyRate: schema.timeEntries.hourlyRate,
      amount: schema.timeEntries.amount,
      status: schema.timeEntries.status,
      invoiceId: schema.timeEntries.invoiceId,
      invoiceLineItemId: schema.timeEntries.invoiceLineItemId,
      approvedBy: schema.timeEntries.approvedBy,
      approvedAt: schema.timeEntries.approvedAt,
      createdAt: schema.timeEntries.createdAt,
      updatedAt: schema.timeEntries.updatedAt,
      // User info
      userFirstName: schema.users.firstName,
      userLastName: schema.users.lastName,
      // Matter info
      matterTitle: schema.matters.title
    })
    .from(schema.timeEntries)
    .leftJoin(schema.users, eq(schema.timeEntries.userId, schema.users.id))
    .leftJoin(schema.matters, eq(schema.timeEntries.matterId, schema.matters.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.timeEntries.workDate), desc(schema.timeEntries.createdAt))
    .all()

  // Transform to include computed fields
  const timeEntries = entries.map(entry => ({
    id: entry.id,
    userId: entry.userId,
    userName: [entry.userFirstName, entry.userLastName].filter(Boolean).join(' ') || 'Unknown',
    matterId: entry.matterId,
    matterTitle: entry.matterTitle || 'Unknown Matter',
    hours: entry.hours,
    description: entry.description,
    workDate: entry.workDate,
    isBillable: entry.isBillable,
    hourlyRate: entry.hourlyRate,
    amount: entry.amount,
    status: entry.status,
    invoiceId: entry.invoiceId,
    invoiceLineItemId: entry.invoiceLineItemId,
    approvedBy: entry.approvedBy,
    approvedAt: entry.approvedAt,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  }))

  return { timeEntries }
})
