import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { getDefaultBusinessHours, getActiveDays } from '../../../utils/availability'
import type { BusinessHoursConfig } from '../../../utils/availability'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const appointmentTypeId = query.appointmentTypeId as string | undefined

  let config: BusinessHoursConfig | undefined

  // Per-type override takes priority
  if (appointmentTypeId) {
    const db = useDrizzle()
    const apptType = await db
      .select({ businessHours: schema.appointmentTypes.businessHours })
      .from(schema.appointmentTypes)
      .where(eq(schema.appointmentTypes.id, appointmentTypeId))
      .get()

    if (apptType?.businessHours) {
      try {
        config = JSON.parse(apptType.businessHours)
      } catch { /* fall through */ }
    }
  }

  if (!config) {
    config = await getDefaultBusinessHours()
  }

  // Always include a `days` array so SlotPicker can disable non-business days
  return { ...config, days: getActiveDays(config) }
})
