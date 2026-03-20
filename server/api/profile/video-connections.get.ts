import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])
  const db = useDrizzle()

  const connections = await db
    .select({
      id: schema.videoMeetingConnections.id,
      provider: schema.videoMeetingConnections.provider,
      providerEmail: schema.videoMeetingConnections.providerEmail,
      providerAccountId: schema.videoMeetingConnections.providerAccountId,
      status: schema.videoMeetingConnections.status,
      lastError: schema.videoMeetingConnections.lastError,
      createdAt: schema.videoMeetingConnections.createdAt
    })
    .from(schema.videoMeetingConnections)
    .where(eq(schema.videoMeetingConnections.userId, user.id))
    .orderBy(schema.videoMeetingConnections.createdAt)
    .all()

  return connections
})
