import { dismissNotice } from '../../../utils/notice-service'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const recipientId = getRouterParam(event, 'id')
  if (!recipientId) {
    throw createError({ statusCode: 400, message: 'Notice recipient ID is required' })
  }

  await dismissNotice(recipientId)

  return { success: true }
})
