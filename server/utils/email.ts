/**
 * Email utility using Resend
 * https://resend.com/docs/api-reference/emails/send-email
 */

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  tags?: Array<{ name: string; value: string }>
}

interface ResendResponse {
  id: string
}

interface ResendError {
  statusCode: number
  message: string
  name: string
}

/**
 * Send an email using Resend API
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const config = useRuntimeConfig()
  const apiKey = config.resendApiKey

  if (!apiKey) {
    console.error('[Email] RESEND_API_KEY not configured')
    return { success: false, error: 'Email service not configured' }
  }

  const fromAddress = options.from || config.emailFrom || 'Your Trusted Planner <noreply@yourtrustedplanner.com>'

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
        tags: options.tags
      })
    })

    if (!response.ok) {
      const errorData = await response.json() as ResendError
      console.error('[Email] Resend API error:', errorData)
      return { success: false, error: errorData.message || 'Failed to send email' }
    }

    const data = await response.json() as ResendResponse
    console.log('[Email] Sent successfully:', data.id)
    return { success: true, id: data.id }
  } catch (error) {
    console.error('[Email] Failed to send:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Email templates
 */
export const emailTemplates = {
  /**
   * Signature request email sent to client
   */
  signatureRequest: (params: {
    recipientName: string
    documentTitle: string
    senderName: string
    signingUrl: string
    expiresAt: Date
    message?: string
  }) => {
    const { recipientName, documentTitle, senderName, signingUrl, expiresAt, message } = params
    const expiresFormatted = expiresAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Ready for Signature</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0A2540; padding: 30px 40px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Document Ready for Signature</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hello ${recipientName},
              </p>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                ${senderName} has sent you a document that requires your electronic signature:
              </p>

              <!-- Document Card -->
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 600;">
                  ${documentTitle}
                </p>
              </div>

              ${message ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Message from ${senderName}:</strong><br>
                  ${message}
                </p>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${signingUrl}" style="display: inline-block; background-color: #C41E3A; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                  Review &amp; Sign Document
                </a>
              </div>

              <p style="margin: 20px 0; color: #6b7280; font-size: 14px; text-align: center;">
                This link expires on ${expiresFormatted}
              </p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0; color: #3b82f6; font-size: 13px; word-break: break-all;">
                ${signingUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-align: center;">
                This is an automated message from Your Trusted Planner.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                Your electronic signature will be legally binding under ESIGN and UETA laws.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    const text = `
Hello ${recipientName},

${senderName} has sent you a document that requires your electronic signature:

Document: ${documentTitle}

${message ? `Message from ${senderName}: ${message}\n` : ''}
To review and sign this document, visit:
${signingUrl}

This link expires on ${expiresFormatted}.

---
This is an automated message from Your Trusted Planner.
Your electronic signature will be legally binding under ESIGN and UETA laws.
    `.trim()

    return { html, text }
  },

  /**
   * Signature completed confirmation email
   */
  signatureComplete: (params: {
    recipientName: string
    documentTitle: string
    signedAt: Date
    certificateId: string
  }) => {
    const { recipientName, documentTitle, signedAt, certificateId } = params
    const signedFormatted = signedAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Signed Successfully</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #059669; padding: 30px 40px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Document Signed Successfully</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hello ${recipientName},
              </p>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Your signature has been successfully recorded on the following document:
              </p>

              <!-- Document Card -->
              <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 12px; color: #111827; font-size: 18px; font-weight: 600;">
                  ${documentTitle}
                </p>
                <p style="margin: 0; color: #059669; font-size: 14px;">
                  Signed on ${signedFormatted}
                </p>
              </div>

              <!-- Certificate Info -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
                  Certificate ID
                </p>
                <p style="margin: 0; color: #374151; font-size: 13px; font-family: monospace; word-break: break-all;">
                  ${certificateId}
                </p>
              </div>

              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px;">
                A copy of the signed document is available in your account. Please keep this email for your records.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                This is an automated confirmation from Your Trusted Planner.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    const text = `
Hello ${recipientName},

Your signature has been successfully recorded on the following document:

Document: ${documentTitle}
Signed on: ${signedFormatted}
Certificate ID: ${certificateId}

A copy of the signed document is available in your account. Please keep this email for your records.

---
This is an automated confirmation from Your Trusted Planner.
    `.trim()

    return { html, text }
  }
}
