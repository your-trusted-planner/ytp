/**
 * HTML sanitization for form content blocks.
 *
 * - Strips <script> tags completely (no legitimate use case)
 * - Whitelists <iframe> src domains (YouTube, Vimeo, own domains)
 * - Preserves inline styles (needed for branded content)
 */

const ALLOWED_IFRAME_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'vimeo.com',
  'yourtrustedplanner.com',
  'app.trustandlegacy.com',
  'app.businessandlegacy.com',
  'app-preview.trustandlegacy.com',
  'app-preview.businessandlegacy.com'
]

function isAllowedIframeSrc(src: string): boolean {
  try {
    const url = new URL(src)
    return ALLOWED_IFRAME_DOMAINS.some(domain =>
      url.hostname === domain || url.hostname.endsWith('.' + domain)
    )
  } catch {
    return false
  }
}

/**
 * Sanitize HTML content for safe rendering.
 * - Removes all <script> tags and their content
 * - Removes <iframe> tags with non-whitelisted src domains
 * - Removes on* event handler attributes
 * - Preserves all other HTML including inline styles
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''

  // Remove script tags and content
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove on* event handlers from all tags
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')

  // Process iframes: remove those with non-whitelisted src
  clean = clean.replace(/<iframe\b([^>]*)>([\s\S]*?)<\/iframe>/gi, (match, attrs) => {
    const srcMatch = attrs.match(/src\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/i)
    const src = srcMatch?.[1] || srcMatch?.[2] || srcMatch?.[3] || ''
    if (src && isAllowedIframeSrc(src)) {
      return match // Keep whitelisted iframes
    }
    return '' // Strip non-whitelisted iframes
  })

  // Remove javascript: protocol from href/src attributes
  clean = clean.replace(/(href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '$1=""')

  return clean
}
