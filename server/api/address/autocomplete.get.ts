import { z } from 'zod'
import { autocompleteAddress, isRadarConfigured } from '../../utils/radar'

const querySchema = z.object({
  q: z.string().min(3, 'Query must be at least 3 characters'),
  limit: z.coerce.number().min(1).max(10).optional().default(5)
})

export default defineEventHandler(async (event) => {
  // Require authentication
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }

  // Check if Radar is configured
  if (!isRadarConfigured()) {
    throw createError({
      statusCode: 503,
      message: 'Address autocomplete service not configured'
    })
  }

  // Validate query params
  const query = getQuery(event)
  const result = querySchema.safeParse(query)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid query parameters',
      data: result.error.flatten()
    })
  }

  const { q, limit } = result.data

  // Call Radar API
  const addresses = await autocompleteAddress(q, { limit })

  // Transform to simpler format for frontend
  return {
    suggestions: addresses.map((addr) => ({
      formattedAddress: addr.formattedAddress,
      addressLabel: addr.addressLabel,
      street: addr.number && addr.street ? `${addr.number} ${addr.street}` : addr.addressLabel,
      city: addr.city,
      state: addr.stateCode,
      zipCode: addr.postalCode,
      county: addr.county,
      latitude: addr.latitude,
      longitude: addr.longitude
    }))
  }
})
