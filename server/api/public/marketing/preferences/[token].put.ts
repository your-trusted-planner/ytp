import { z } from 'zod'
import { verifyPreferenceToken, setConsent } from '../../../../utils/marketing-consent'

const updateSchema = z.object({
  channelId: z.string().min(1),
  status: z.enum(['OPTED_IN', 'OPTED_OUT'])
})

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, message: 'Missing token' })

  const personId = await verifyPreferenceToken(token)
  if (!personId) {
    throw createError({ statusCode: 401, message: 'Invalid or expired token' })
  }

  const body = await readBody(event)
  const result = updateSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error.flatten()
    })
  }

  const { channelId, status } = result.data
  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'cf-connecting-ip') || null

  await setConsent(personId, channelId, status, 'SELF_SERVICE', { ip: ip ?? undefined })

  return { success: true }
})
