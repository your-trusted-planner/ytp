import { getNoticesForUser } from '../../utils/notice-service'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const limit = Math.min(parseInt(query.limit as string) || 50, 100)
  const offset = parseInt(query.offset as string) || 0
  const unreadOnly = query.unreadOnly === 'true'

  const notices = await getNoticesForUser(user.id, user.role, {
    limit,
    offset,
    unreadOnly
  })

  return { notices }
})
