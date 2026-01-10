import { H3Event, getHeader } from 'h3'
import { generateId } from './auth'

export interface RequestContext {
  ipAddress: string | null
  userAgent: string | null
  country: string | null
  city: string | null
  region: string | null
  timezone: string | null
  requestId: string
}

/**
 * Captures request context from Cloudflare headers for audit trail and analytics.
 * In local development, most geo headers will be null.
 * In production (Cloudflare Workers), these are populated automatically.
 */
export function captureRequestContext(event: H3Event): RequestContext {
  // IP address - try Cloudflare header first, then X-Forwarded-For
  const ipAddress = getHeader(event, 'CF-Connecting-IP')
    || getHeader(event, 'X-Forwarded-For')?.split(',')[0]?.trim()
    || getHeader(event, 'X-Real-IP')
    || null

  const userAgent = getHeader(event, 'User-Agent') || null

  // Cloudflare geo headers (only available in CF Workers)
  const country = getHeader(event, 'CF-IPCountry') || null
  const city = getHeader(event, 'CF-IPCity') || null
  const region = getHeader(event, 'CF-Region') || null
  const timezone = getHeader(event, 'CF-Timezone') || null

  // Generate unique request ID for correlation
  const requestId = generateId()

  return {
    ipAddress,
    userAgent,
    country,
    city,
    region,
    timezone,
    requestId
  }
}

/**
 * Extracts a simplified request context for logging purposes.
 * Returns only non-null values as a flat object suitable for metadata storage.
 */
export function getRequestMetadata(event: H3Event): Record<string, string> {
  const ctx = captureRequestContext(event)
  const metadata: Record<string, string> = {}

  if (ctx.ipAddress) metadata.ipAddress = ctx.ipAddress
  if (ctx.userAgent) metadata.userAgent = ctx.userAgent
  if (ctx.country) metadata.country = ctx.country
  if (ctx.city) metadata.city = ctx.city
  if (ctx.region) metadata.region = ctx.region
  if (ctx.timezone) metadata.timezone = ctx.timezone
  metadata.requestId = ctx.requestId

  return metadata
}
