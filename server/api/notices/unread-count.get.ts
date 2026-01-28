import { getUnreadNoticeCount } from '../../utils/notice-service'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const count = await getUnreadNoticeCount(user.id, user.role)

  return { count }
})
