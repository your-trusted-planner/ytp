import { verifyPreferenceToken, setGlobalUnsubscribe } from '../../../../utils/marketing-consent'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, message: 'Missing token' })

  const personId = await verifyPreferenceToken(token)
  if (!personId) {
    throw createError({ statusCode: 401, message: 'Invalid or expired token' })
  }

  await setGlobalUnsubscribe(personId, 'SELF_SERVICE')

  return { success: true }
})
