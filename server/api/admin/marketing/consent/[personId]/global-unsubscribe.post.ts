import { setGlobalUnsubscribe } from '../../../../../utils/marketing-consent'
import { logActivity } from '../../../../../utils/activity-logger'
import { resolveEntityName } from '../../../../../utils/entity-resolver'

export default defineEventHandler(async (event) => {
  const personId = getRouterParam(event, 'personId')
  if (!personId) throw createError({ statusCode: 400, message: 'Missing personId' })

  const user = event.context.user

  await setGlobalUnsubscribe(personId, 'STAFF', user.id)

  const personName = await resolveEntityName('person', personId)
  await logActivity({
    type: 'SETTINGS_CHANGED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'person', id: personId, name: personName || 'Unknown' },
    description: `Set global marketing unsubscribe for ${personName || 'person'}`,
    event
  })

  return { success: true }
})
