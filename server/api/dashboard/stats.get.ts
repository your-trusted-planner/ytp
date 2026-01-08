import { eq, and, gte } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])
  
  const db = useDrizzle()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  // Get total clients
  const allUsers = await db.select().from(schema.users).all()
  const totalClients = allUsers.filter(u => u.role === 'CLIENT').length
  const activeClients = allUsers.filter(u => u.role === 'CLIENT' && u.status === 'ACTIVE').length
  const pendingApprovals = allUsers.filter(u => u.status === 'PENDING_APPROVAL').length
  
  // Get upcoming appointments
  const upcomingAppointments = await db
    .select()
    .from(schema.appointments)
    .where(
      and(
        gte(schema.appointments.startTime, now),
        eq(schema.appointments.status, 'CONFIRMED')
      )
    )
    .all()
  
  // Get documents this month
  const documentsThisMonth = await db
    .select()
    .from(schema.documents)
    .where(gte(schema.documents.createdAt, startOfMonth))
    .all()
  
  return {
    totalClients,
    activeClients,
    pendingApprovals,
    upcomingAppointments: upcomingAppointments.length,
    documentsThisMonth: documentsThisMonth.length
  }
})

