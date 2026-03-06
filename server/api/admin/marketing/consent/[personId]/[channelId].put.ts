import { z } from 'zod'
import { setConsent } from '../../../../../utils/marketing-consent'
import { logActivity } from '../../../../../utils/activity-logger'
import { resolveEntityName } from '../../../../../utils/entity-resolver'

const updateConsentSchema = z.object({
  status: z.enum(['OPTED_IN', 'OPTED_OUT']),
  note: z.string().max(500).optional()
})

export default defineEventHandler(async (event) => {
  const personId = getRouterParam(event, 'personId')
  const channelId = getRouterParam(event, 'channelId')
  if (!personId || !channelId) {
    throw createError({ statusCode: 400, message: 'Missing personId or channelId' })
  }

  const body = await readBody(event)
  const result = updateConsentSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error.flatten()
    })
  }

  const user = event.context.user
  const { status, note } = result.data

  await setConsent(personId, channelId, status, 'STAFF', {
    note,
    userId: user.id
  })

  const personName = await resolveEntityName('person', personId)
  await logActivity({
    type: 'SETTINGS_CHANGED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'person', id: personId, name: personName || 'Unknown' },
    description: `Set marketing consent to ${status} for ${personName || 'person'}`,
    event,
    details: { channelId, status, note }
  })

  return { success: true }
})
