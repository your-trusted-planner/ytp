import { eq, and, gte } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'

export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)
  const db = useDrizzle()
  const now = new Date()
  
  // Get all documents for this client
  const documents = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.clientId, user.id))
    .all()
  
  const pendingDocuments = documents.filter(d => 
    d.status === 'SENT' || d.status === 'VIEWED'
  ).length
  
  const signedDocuments = documents.filter(d => 
    d.status === 'SIGNED' || d.status === 'COMPLETED'
  ).length
  
  // Get upcoming appointments
  const upcomingAppointments = await db
    .select()
    .from(schema.appointments)
    .where(
      and(
        eq(schema.appointments.clientId, user.id),
        gte(schema.appointments.startTime, now)
      )
    )
    .all()
  
  return {
    totalDocuments: documents.length,
    pendingDocuments,
    signedDocuments,
    upcomingAppointments: upcomingAppointments.length
  }
})

