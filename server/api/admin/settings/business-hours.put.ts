import { z } from 'zod'
import { setSetting } from '../../../utils/settings'
import { logActivity } from '../../../utils/activity-logger'

const schema = z.object({
  start: z.number().int().min(0).max(23),
  end: z.number().int().min(1).max(24),
  days: z.array(z.number().int().min(0).max(6)).min(1)
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = schema.parse(body)
  const user = event.context.user

  if (data.end <= data.start) {
    throw createError({ statusCode: 400, message: 'End hour must be after start hour' })
  }

  await setSetting(
    'default_business_hours',
    JSON.stringify(data),
    'Default business hours for appointment booking availability'
  )

  await logActivity({
    type: 'SETTINGS_CHANGED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'setting', id: 'default_business_hours', name: 'Default Business Hours' },
    event,
    details: data
  })

  return { success: true, ...data }
})
