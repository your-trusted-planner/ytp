import { z } from 'zod'
import { getMultiCalendarFreeBusy } from '../../../utils/google-calendar'

const testSchema = z.object({
  calendarEmail: z.string().email(),
  impersonateEmail: z.string().email()
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = testSchema.parse(body)

  // Try a freeBusy query for the next hour to verify access
  const now = new Date()
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)

  try {
    const busyPeriods = await getMultiCalendarFreeBusy(
      data.impersonateEmail,
      [data.calendarEmail],
      now.toISOString(),
      oneHourLater.toISOString()
    )

    return {
      success: true,
      message: `Calendar accessible. ${busyPeriods.length} busy period(s) in the next hour.`
    }
  }
  catch (err: any) {
    throw createError({
      statusCode: 400,
      message: `Cannot access calendar: ${err.message}`
    })
  }
})
