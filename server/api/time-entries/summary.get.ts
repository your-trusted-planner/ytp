// Get time entry summary statistics
import { eq, and, sql, gte, lte, sum, count } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Calculate date ranges
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay()) // Sunday
  startOfWeek.setHours(0, 0, 0, 0)

  // Get totals by status
  const statusStats = await db
    .select({
      status: schema.timeEntries.status,
      totalHours: sql<string>`COALESCE(SUM(CAST(${schema.timeEntries.hours} AS REAL)), 0)`.as('totalHours'),
      count: count().as('count'),
      totalAmount: sql<number>`COALESCE(SUM(${schema.timeEntries.amount}), 0)`.as('totalAmount')
    })
    .from(schema.timeEntries)
    .groupBy(schema.timeEntries.status)
    .all()

  // Convert to map for easy access
  const byStatus: Record<string, { count: number; hours: string; amount: number }> = {}
  for (const row of statusStats) {
    byStatus[row.status] = {
      count: Number(row.count),
      hours: parseFloat(row.totalHours).toFixed(2),
      amount: Number(row.totalAmount)
    }
  }

  // Get total hours this month (all statuses)
  const [monthStats] = await db
    .select({
      totalHours: sql<string>`COALESCE(SUM(CAST(${schema.timeEntries.hours} AS REAL)), 0)`.as('totalHours')
    })
    .from(schema.timeEntries)
    .where(gte(schema.timeEntries.workDate, startOfMonth))
    .all()

  // Get total hours this week
  const [weekStats] = await db
    .select({
      totalHours: sql<string>`COALESCE(SUM(CAST(${schema.timeEntries.hours} AS REAL)), 0)`.as('totalHours')
    })
    .from(schema.timeEntries)
    .where(gte(schema.timeEntries.workDate, startOfWeek))
    .all()

  // Calculate totals
  const allStatuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'BILLED', 'WRITTEN_OFF']
  let totalHours = 0
  let pendingApprovalCount = 0
  let billableAmount = 0

  for (const status of allStatuses) {
    const stats = byStatus[status]
    if (stats) {
      totalHours += parseFloat(stats.hours)
      if (status === 'SUBMITTED') {
        pendingApprovalCount = stats.count
      }
      if (status === 'APPROVED') {
        // Approved but not yet billed - this is the "billable" amount
        billableAmount = stats.amount
      }
    }
  }

  return {
    summary: {
      totalHours: totalHours.toFixed(2),
      totalHoursThisMonth: parseFloat(monthStats?.totalHours || '0').toFixed(2),
      totalHoursThisWeek: parseFloat(weekStats?.totalHours || '0').toFixed(2),
      pendingApprovalCount,
      billableAmount, // cents
      byStatus
    }
  }
})
