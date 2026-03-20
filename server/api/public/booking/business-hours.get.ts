import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { getDefaultBusinessHours } from '../../../utils/availability'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const appointmentTypeId = query.appointmentTypeId as string | undefined

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
        return JSON.parse(apptType.businessHours)
      } catch { /* fall through */ }
    }
  }

  return await getDefaultBusinessHours()
})
