import { eq, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { revokeZoomConnection } from '../../../utils/zoom-tokens'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing connection ID' })
  }

  const db = useDrizzle()

  // Verify the connection belongs to this user
  const connection = await db
    .select()
    .from(schema.videoMeetingConnections)
    .where(
      and(
        eq(schema.videoMeetingConnections.id, id),
        eq(schema.videoMeetingConnections.userId, user.id)
      )
    )
    .get()

  if (!connection) {
    throw createError({ statusCode: 404, message: 'Connection not found' })
  }

  if (connection.provider === 'zoom') {
    await revokeZoomConnection(id)
  }

  return { success: true }
})
