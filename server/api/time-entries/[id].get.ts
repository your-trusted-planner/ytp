// Get a single time entry by ID
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Time entry ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  const [entry] = await db
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
      userEmail: schema.users.email,
      // Matter info
      matterTitle: schema.matters.title,
      matterNumber: schema.matters.matterNumber
    })
    .from(schema.timeEntries)
    .leftJoin(schema.users, eq(schema.timeEntries.userId, schema.users.id))
    .leftJoin(schema.matters, eq(schema.timeEntries.matterId, schema.matters.id))
    .where(eq(schema.timeEntries.id, id))
    .limit(1)

  if (!entry) {
    throw createError({
      statusCode: 404,
      message: 'Time entry not found'
    })
  }

  // Get approver info if approved
  let approverName = null
  if (entry.approvedBy) {
    const [approver] = await db
      .select({
        firstName: schema.users.firstName,
        lastName: schema.users.lastName
      })
      .from(schema.users)
      .where(eq(schema.users.id, entry.approvedBy))
      .limit(1)

    if (approver) {
      approverName = [approver.firstName, approver.lastName].filter(Boolean).join(' ') || 'Unknown'
    }
  }

  return {
    timeEntry: {
      id: entry.id,
      userId: entry.userId,
      userName: [entry.userFirstName, entry.userLastName].filter(Boolean).join(' ') || 'Unknown',
      userEmail: entry.userEmail,
      matterId: entry.matterId,
      matterTitle: entry.matterTitle || 'Unknown Matter',
      matterNumber: entry.matterNumber,
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
      approverName,
      approvedAt: entry.approvedAt,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    }
  }
})
