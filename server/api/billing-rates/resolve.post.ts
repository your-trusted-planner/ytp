// Preview rate resolution for a given context
import { z } from 'zod'
import { resolveHourlyRate, formatRateSource } from '../../utils/billing-rates'

const resolveRateSchema = z.object({
  matterId: z.string().min(1),
  userId: z.string().min(1),
  catalogId: z.string().optional()
})

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const body = await readBody(event)
  const parsed = resolveRateSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation failed',
      data: parsed.error.issues
    })
  }

  const { matterId, userId, catalogId } = parsed.data

  const { rate, source } = await resolveHourlyRate({
    matterId,
    userId,
    catalogId
  })

  return {
    rate,
    source,
    sourceLabel: formatRateSource(source),
    rateFormatted: rate > 0 ? `$${(rate / 100).toFixed(2)}/hr` : 'No rate set'
  }
})
