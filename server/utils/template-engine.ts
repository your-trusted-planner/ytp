/**
 * Template Engine for Message Templates
 *
 * Provides {{variable}} substitution and a standard email HTML shell
 * that matches the existing email branding. Admin-editable templates
 * only control the body copy, subject, and CTA — the layout stays fixed.
 */

export interface RenderOptions {
  escapeHtml?: boolean
}

export interface RenderResult {
  rendered: string
  unresolvedVariables: string[]
}

export interface EmailShellOptions {
  title: string
  headerText: string
  bodyHtml: string
  headerColor?: string          // Default: #0A2540 (dark blue)
  actionUrl?: string
  actionLabel?: string
  firmName?: string             // Default: 'Your Trusted Planner'
  unsubscribeUrl?: string
}

/**
 * Replace {{variableName}} tokens in a template string.
 *
 * - Handles {{ spacedName }} with whitespace inside braces
 * - Escapes HTML entities in variable values when escapeHtml is true
 * - Reports unresolved variables (present in template but missing from variables map)
 * - Does NOT recursively resolve variables in values
 */
export function renderTemplateString(
  template: string,
  variables: Record<string, string>,
  options?: RenderOptions
): RenderResult {
  const unresolvedVariables: string[] = []
  const escapeHtml = options?.escapeHtml ?? false

  // Match {{variableName}} or {{ variableName }} (with optional whitespace)
  const rendered = template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_match, key: string) => {
    const trimmedKey = key.trim()
    if (trimmedKey in variables) {
      const value = variables[trimmedKey]
      return escapeHtml ? escapeHtmlEntities(value) : value
    }
    // Variable not found
    unresolvedVariables.push(trimmedKey)
    return ''
  })

  return { rendered, unresolvedVariables }
}

/**
 * Wrap body content in the standard email HTML shell.
 *
 * Matches the existing email branding:
 * - Dark header bar (#0A2540) with white text
 * - White body area with 600px max width
 * - Optional red CTA button (#C41E3A)
 * - Light footer with firm name
 * - Responsive table-based layout for email client compatibility
 */
export function wrapInEmailShell(options: EmailShellOptions): string {
  const {
    title,
    headerText,
    bodyHtml,
    headerColor = '#0A2540',
    actionUrl,
    actionLabel,
    firmName = 'Your Trusted Planner',
    unsubscribeUrl
  } = options

  const ctaSection = actionUrl && actionLabel
    ? `
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${actionUrl}" style="display: inline-block; background-color: #C41E3A; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                  ${actionLabel}
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0; color: #3b82f6; font-size: 13px; word-break: break-all;">
                ${actionUrl}
              </p>
    `
    : ''

  const unsubscribeSection = unsubscribeUrl
    ? `
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 11px; text-align: center;">
                <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> from these notifications.
              </p>
    `
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${headerColor}; padding: 30px 40px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">${headerText}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              ${bodyHtml}
              ${ctaSection}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-align: center;">
                This is an automated message from ${firmName}.
              </p>
              ${unsubscribeSection}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Escape HTML entities to prevent XSS in variable values
 * inserted into HTML email templates.
 */
function escapeHtmlEntities(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
