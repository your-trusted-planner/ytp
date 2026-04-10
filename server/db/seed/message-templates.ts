import { schema } from '../index'
import type { SeedDb } from './types'

interface TemplateData {
  id: string
  slug: string
  name: string
  description: string
  category: 'TRANSACTIONAL' | 'OPERATIONAL' | 'MARKETING'
  triggerEvent: string | null
  emailSubject: string
  emailBody: string
  emailText: string
  emailHeaderText: string
  emailHeaderColor: string
  emailActionLabel: string | null
  smsBody: string | null
  variableSchema: string
  channelConfig: string
}

const templates: TemplateData[] = [
  {
    id: 'tmpl_password_reset',
    slug: 'password-reset',
    name: 'Password Reset',
    description: 'Sent when a user requests a password reset or an admin initiates one.',
    category: 'TRANSACTIONAL',
    triggerEvent: 'PASSWORD_RESET',
    emailSubject: 'Reset Your Password - {{firmName}}',
    emailBody: `<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hello {{recipientName}},</p>
<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">We received a request to reset the password for your account associated with <strong>{{recipientEmail}}</strong>.</p>
<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Click the button below to set a new password:</p>`,
    emailText: `Hello {{recipientName}},\n\nWe received a request to reset the password for your account associated with {{recipientEmail}}.\n\nTo reset your password, visit:\n{{resetUrl}}\n\nThis link expires on {{expiresAt}}.\n\nSecurity Notice: If you didn't request this password reset, you can safely ignore this email.`,
    emailHeaderText: 'Reset Your Password',
    emailHeaderColor: '#0A2540',
    emailActionLabel: 'Reset Password',
    smsBody: null,
    variableSchema: JSON.stringify([
      { key: 'recipientName', label: 'Recipient Name', sampleValue: 'Jane Smith' },
      { key: 'recipientEmail', label: 'Recipient Email', sampleValue: 'jane@example.com' },
      { key: 'resetUrl', label: 'Reset URL', sampleValue: 'https://app.example.com/reset-password?token=abc123' },
      { key: 'expiresAt', label: 'Expiration Date', sampleValue: 'Wednesday, April 8, 2026, 3:00 PM' }
    ]),
    channelConfig: JSON.stringify({ email: true, sms: false })
  },
  {
    id: 'tmpl_signature_request',
    slug: 'signature-request',
    name: 'Signature Request',
    description: 'Sent when a document is ready for electronic signature.',
    category: 'TRANSACTIONAL',
    triggerEvent: 'SIGNATURE_REQUEST',
    emailSubject: 'Document Ready for Signature: {{documentTitle}}',
    emailBody: `<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hello {{recipientName}},</p>
<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">{{senderName}} has sent you a document that requires your electronic signature:</p>
<div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
  <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 600;">{{documentTitle}}</p>
</div>`,
    emailText: `Hello {{recipientName}},\n\n{{senderName}} has sent you a document that requires your electronic signature:\n\nDocument: {{documentTitle}}\n\nTo review and sign this document, visit:\n{{signingUrl}}\n\nThis link expires on {{expiresAt}}.`,
    emailHeaderText: 'Document Ready for Signature',
    emailHeaderColor: '#0A2540',
    emailActionLabel: 'Review & Sign Document',
    smsBody: '{{senderName}} sent you a document to sign: "{{documentTitle}}". Sign here: {{signingUrl}}',
    variableSchema: JSON.stringify([
      { key: 'recipientName', label: 'Recipient Name', sampleValue: 'Jane Smith' },
      { key: 'documentTitle', label: 'Document Title', sampleValue: 'Smith Family Revocable Trust' },
      { key: 'senderName', label: 'Sender Name', sampleValue: 'Owen Hathaway' },
      { key: 'signingUrl', label: 'Signing URL', sampleValue: 'https://app.example.com/sign/abc123' },
      { key: 'expiresAt', label: 'Expiration Date', sampleValue: 'Friday, April 10, 2026, 5:00 PM' },
      { key: 'message', label: 'Custom Message', sampleValue: 'Please review and sign at your earliest convenience.' }
    ]),
    channelConfig: JSON.stringify({ email: true, sms: false })
  },
  {
    id: 'tmpl_signature_complete',
    slug: 'signature-complete',
    name: 'Signature Confirmation',
    description: 'Sent after a document has been successfully signed.',
    category: 'TRANSACTIONAL',
    triggerEvent: 'SIGNATURE_COMPLETE',
    emailSubject: 'Document Signed Successfully: {{documentTitle}}',
    emailBody: `<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hello {{recipientName}},</p>
<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Your signature has been successfully recorded on the following document:</p>
<div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
  <p style="margin: 0 0 12px; color: #111827; font-size: 18px; font-weight: 600;">{{documentTitle}}</p>
  <p style="margin: 0; color: #059669; font-size: 14px;">Signed on {{signedAt}}</p>
</div>
<div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
  <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Certificate ID</p>
  <p style="margin: 0; color: #374151; font-size: 13px; font-family: monospace; word-break: break-all;">{{certificateId}}</p>
</div>
<p style="margin: 20px 0 0; color: #6b7280; font-size: 14px;">A copy of the signed document is available in your account. Please keep this email for your records.</p>`,
    emailText: `Hello {{recipientName}},\n\nYour signature has been successfully recorded.\n\nDocument: {{documentTitle}}\nSigned on: {{signedAt}}\nCertificate ID: {{certificateId}}\n\nPlease keep this email for your records.`,
    emailHeaderText: 'Document Signed Successfully',
    emailHeaderColor: '#059669',
    emailActionLabel: null,
    smsBody: null,
    variableSchema: JSON.stringify([
      { key: 'recipientName', label: 'Recipient Name', sampleValue: 'Jane Smith' },
      { key: 'documentTitle', label: 'Document Title', sampleValue: 'Smith Family Revocable Trust' },
      { key: 'signedAt', label: 'Signed Date', sampleValue: 'Wednesday, April 8, 2026, 2:30 PM' },
      { key: 'certificateId', label: 'Certificate ID', sampleValue: 'cert_abc123def456' }
    ]),
    channelConfig: JSON.stringify({ email: true, sms: false })
  },
  {
    id: 'tmpl_invoice_sent',
    slug: 'invoice-sent',
    name: 'Invoice Sent',
    description: 'Sent when an invoice is emailed to a client.',
    category: 'TRANSACTIONAL',
    triggerEvent: 'INVOICE_SENT',
    emailSubject: 'Invoice {{invoiceNumber}} - {{amountDue}}',
    emailBody: `<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Dear {{recipientName}},</p>
{{customMessage}}
<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Please find attached your invoice for <strong>{{matterTitle}}</strong>.</p>
<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <p style="margin: 0;"><strong>Amount Due:</strong> {{amountDue}}</p>
  <p style="margin: 10px 0 0;"><strong>Due Date:</strong> {{dueDate}}</p>
</div>
<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">If you have any questions about this invoice, please don't hesitate to contact us.</p>
<p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">Thank you for your business.</p>`,
    emailText: `Dear {{recipientName}},\n\nPlease find attached your invoice for {{matterTitle}}.\n\nAmount Due: {{amountDue}}\nDue Date: {{dueDate}}\n\nIf you have any questions, please contact us.\n\nThank you for your business.`,
    emailHeaderText: 'Invoice',
    emailHeaderColor: '#0A2540',
    emailActionLabel: null,
    smsBody: null,
    variableSchema: JSON.stringify([
      { key: 'recipientName', label: 'Recipient Name', sampleValue: 'Jane Smith' },
      { key: 'invoiceNumber', label: 'Invoice Number', sampleValue: 'INV-2026-0042' },
      { key: 'amountDue', label: 'Amount Due', sampleValue: '$2,500.00' },
      { key: 'dueDate', label: 'Due Date', sampleValue: 'April 30, 2026' },
      { key: 'matterTitle', label: 'Matter Title', sampleValue: 'Smith Family Estate Plan' },
      { key: 'customMessage', label: 'Custom Message (HTML, optional)', sampleValue: '' }
    ]),
    channelConfig: JSON.stringify({ email: true, sms: false })
  },
  {
    id: 'tmpl_booking_confirmation',
    slug: 'booking-confirmation',
    name: 'Booking Confirmation',
    description: 'Sent when a client books an appointment.',
    category: 'TRANSACTIONAL',
    triggerEvent: 'BOOKING_CONFIRMED',
    emailSubject: 'Appointment Confirmed: {{appointmentType}}',
    emailBody: `<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hello {{recipientName}},</p>
<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Your appointment has been confirmed:</p>
<div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
  <p style="margin: 0 0 8px; color: #111827; font-size: 18px; font-weight: 600;">{{appointmentType}}</p>
  <p style="margin: 0 0 4px; color: #374151; font-size: 14px;">📅 {{appointmentDate}} at {{appointmentTime}}</p>
  <p style="margin: 0; color: #374151; font-size: 14px;">👤 With {{attorneyName}}</p>
</div>
<p style="margin: 0; color: #6b7280; font-size: 14px;">If you need to reschedule or cancel, please contact us as soon as possible.</p>`,
    emailText: `Hello {{recipientName}},\n\nYour appointment has been confirmed:\n\n{{appointmentType}}\nDate: {{appointmentDate}} at {{appointmentTime}}\nWith: {{attorneyName}}\n\nIf you need to reschedule or cancel, please contact us.`,
    emailHeaderText: 'Appointment Confirmed',
    emailHeaderColor: '#059669',
    emailActionLabel: null,
    smsBody: 'Your {{appointmentType}} is confirmed for {{appointmentDate}} at {{appointmentTime}} with {{attorneyName}}.',
    variableSchema: JSON.stringify([
      { key: 'recipientName', label: 'Recipient Name', sampleValue: 'Jane Smith' },
      { key: 'appointmentType', label: 'Appointment Type', sampleValue: 'Life & Legacy Planning Session' },
      { key: 'appointmentDate', label: 'Date', sampleValue: 'Thursday, April 9, 2026' },
      { key: 'appointmentTime', label: 'Time', sampleValue: '2:00 PM' },
      { key: 'attorneyName', label: 'Attorney Name', sampleValue: 'Owen Hathaway' },
      { key: 'location', label: 'Location', sampleValue: 'Video call (Zoom)' }
    ]),
    channelConfig: JSON.stringify({ email: true, sms: true })
  },
  {
    id: 'tmpl_appointment_reminder_24h',
    slug: 'appointment-reminder-24h',
    name: 'Appointment Reminder (24 hours)',
    description: 'Sent 24 hours before an upcoming appointment.',
    category: 'OPERATIONAL',
    triggerEvent: 'APPOINTMENT_REMINDER',
    emailSubject: 'Reminder: {{appointmentType}} Tomorrow',
    emailBody: `<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hello {{recipientName}},</p>
<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">This is a friendly reminder that your appointment is coming up {{timeUntil}}:</p>
<div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
  <p style="margin: 0 0 8px; color: #111827; font-size: 18px; font-weight: 600;">{{appointmentType}}</p>
  <p style="margin: 0 0 4px; color: #374151; font-size: 14px;">📅 {{appointmentDate}} at {{appointmentTime}}</p>
  <p style="margin: 0; color: #374151; font-size: 14px;">👤 With {{attorneyName}}</p>
</div>`,
    emailText: `Hello {{recipientName}},\n\nReminder: Your {{appointmentType}} is {{timeUntil}}.\n\nDate: {{appointmentDate}} at {{appointmentTime}}\nWith: {{attorneyName}}\n\nWe look forward to seeing you!`,
    emailHeaderText: 'Appointment Reminder',
    emailHeaderColor: '#0A2540',
    emailActionLabel: null,
    smsBody: 'Reminder: Your {{appointmentType}} is {{timeUntil}} on {{appointmentDate}} at {{appointmentTime}} with {{attorneyName}}.',
    variableSchema: JSON.stringify([
      { key: 'recipientName', label: 'Recipient Name', sampleValue: 'Jane Smith' },
      { key: 'appointmentType', label: 'Appointment Type', sampleValue: 'Life & Legacy Planning Session' },
      { key: 'appointmentDate', label: 'Date', sampleValue: 'Thursday, April 9, 2026' },
      { key: 'appointmentTime', label: 'Time', sampleValue: '2:00 PM' },
      { key: 'attorneyName', label: 'Attorney Name', sampleValue: 'Owen Hathaway' },
      { key: 'timeUntil', label: 'Time Until', sampleValue: 'tomorrow' }
    ]),
    channelConfig: JSON.stringify({ email: true, sms: true })
  },
  {
    id: 'tmpl_action_item_assigned',
    slug: 'action-item-assigned',
    name: 'Action Item Assigned',
    description: 'Sent when a client has a new action item to complete.',
    category: 'OPERATIONAL',
    triggerEvent: 'ACTION_ITEM_ASSIGNED',
    emailSubject: 'Action Required: {{actionItemTitle}}',
    emailBody: `<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hello {{recipientName}},</p>
<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">You have a new action item that needs your attention:</p>
<div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
  <p style="margin: 0 0 8px; color: #111827; font-size: 18px; font-weight: 600;">{{actionItemTitle}}</p>
  <p style="margin: 0; color: #6b7280; font-size: 14px;">Type: {{actionType}}</p>
</div>
<p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">Please log in to your portal to complete this item.</p>`,
    emailText: `Hello {{recipientName}},\n\nYou have a new action item: {{actionItemTitle}}\nType: {{actionType}}\n\nPlease log in to your portal to complete this item.\n{{portalLink}}`,
    emailHeaderText: 'Action Required',
    emailHeaderColor: '#0A2540',
    emailActionLabel: 'View in Portal',
    smsBody: 'You have a new action item: "{{actionItemTitle}}". Log in to complete it: {{portalLink}}',
    variableSchema: JSON.stringify([
      { key: 'recipientName', label: 'Recipient Name', sampleValue: 'Jane Smith' },
      { key: 'actionItemTitle', label: 'Action Item Title', sampleValue: 'Complete Estate Planning Questionnaire' },
      { key: 'actionType', label: 'Action Type', sampleValue: 'Questionnaire' },
      { key: 'dueDate', label: 'Due Date', sampleValue: 'April 15, 2026' },
      { key: 'portalLink', label: 'Portal Link', sampleValue: 'https://app.example.com/my/journey' }
    ]),
    channelConfig: JSON.stringify({ email: true, sms: true })
  },
  {
    id: 'tmpl_form_assigned',
    slug: 'form-assigned',
    name: 'Form Assigned',
    description: 'Sent when a client has a form to complete.',
    category: 'OPERATIONAL',
    triggerEvent: 'FORM_ASSIGNED',
    emailSubject: 'Please Complete: {{formName}}',
    emailBody: `<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hello {{recipientName}},</p>
<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">We need you to complete the following form:</p>
<div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
  <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 600;">{{formName}}</p>
</div>
<p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">Click the button below to get started.</p>`,
    emailText: `Hello {{recipientName}},\n\nWe need you to complete the following form: {{formName}}\n\nComplete it here: {{formLink}}`,
    emailHeaderText: 'Form to Complete',
    emailHeaderColor: '#0A2540',
    emailActionLabel: 'Complete Form',
    smsBody: 'Please complete the form "{{formName}}": {{formLink}}',
    variableSchema: JSON.stringify([
      { key: 'recipientName', label: 'Recipient Name', sampleValue: 'Jane Smith' },
      { key: 'formName', label: 'Form Name', sampleValue: 'Estate Planning Questionnaire' },
      { key: 'formLink', label: 'Form Link', sampleValue: 'https://app.example.com/forms/abc123' },
      { key: 'dueDate', label: 'Due Date', sampleValue: 'April 15, 2026' }
    ]),
    channelConfig: JSON.stringify({ email: true, sms: true })
  },
  {
    id: 'tmpl_account_invitation',
    slug: 'account-invitation',
    name: 'Account Invitation',
    description: 'Sent when a new client user account is created and they need to set their password.',
    category: 'TRANSACTIONAL',
    triggerEvent: 'ACCOUNT_INVITATION',
    emailSubject: 'Welcome to {{firmName}} - Set Up Your Account',
    emailBody: `<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hello {{recipientName}},</p>
<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">An account has been created for you at <strong>{{firmName}}</strong>. Please click the button below to set your password and access your client portal.</p>
<p style="margin: 0; color: #6b7280; font-size: 14px;">Through the portal you can view documents, complete forms, and track the progress of your matter.</p>`,
    emailText: `Hello {{recipientName}},\n\nAn account has been created for you at {{firmName}}.\n\nSet your password here: {{setPasswordLink}}\n\nThrough the portal you can view documents, complete forms, and track the progress of your matter.`,
    emailHeaderText: 'Welcome',
    emailHeaderColor: '#059669',
    emailActionLabel: 'Set Your Password',
    smsBody: 'Welcome to {{firmName}}! Set up your account: {{setPasswordLink}}',
    variableSchema: JSON.stringify([
      { key: 'recipientName', label: 'Recipient Name', sampleValue: 'Jane Smith' },
      { key: 'setPasswordLink', label: 'Set Password Link', sampleValue: 'https://app.example.com/reset-password?token=abc123' },
      { key: 'portalLink', label: 'Portal Link', sampleValue: 'https://app.example.com' }
    ]),
    channelConfig: JSON.stringify({ email: true, sms: false })
  },
  {
    id: 'tmpl_journey_started',
    slug: 'journey-started',
    name: 'Journey Started',
    description: 'Sent when a client engagement journey begins.',
    category: 'OPERATIONAL',
    triggerEvent: 'JOURNEY_STARTED',
    emailSubject: "Your {{journeyName}} Has Begun",
    emailBody: `<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hello {{recipientName}},</p>
<p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">We're excited to get started on your <strong>{{journeyName}}</strong>. You'll receive updates as we progress through each step.</p>
<p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">You can track your progress anytime through the client portal.</p>`,
    emailText: `Hello {{recipientName}},\n\nYour {{journeyName}} has begun! You'll receive updates as we progress through each step.\n\nTrack your progress: {{portalLink}}`,
    emailHeaderText: "Let's Get Started",
    emailHeaderColor: '#059669',
    emailActionLabel: 'View Your Progress',
    smsBody: 'Your {{journeyName}} has begun! Track progress: {{portalLink}}',
    variableSchema: JSON.stringify([
      { key: 'recipientName', label: 'Recipient Name', sampleValue: 'Jane Smith' },
      { key: 'journeyName', label: 'Journey Name', sampleValue: 'Life & Legacy Planning Engagement' },
      { key: 'portalLink', label: 'Portal Link', sampleValue: 'https://app.example.com/my/journey' }
    ]),
    channelConfig: JSON.stringify({ email: true, sms: true })
  }
]

export async function seedMessageTemplates(db: SeedDb): Promise<void> {
  console.log('Seeding message templates...')

  for (const tmpl of templates) {
    await db.insert(schema.messageTemplates).values({
      id: tmpl.id,
      slug: tmpl.slug,
      name: tmpl.name,
      description: tmpl.description,
      category: tmpl.category,
      triggerEvent: tmpl.triggerEvent,
      emailSubject: tmpl.emailSubject,
      emailBody: tmpl.emailBody,
      emailText: tmpl.emailText,
      emailHeaderText: tmpl.emailHeaderText,
      emailHeaderColor: tmpl.emailHeaderColor,
      emailActionLabel: tmpl.emailActionLabel,
      smsBody: tmpl.smsBody,
      variableSchema: tmpl.variableSchema,
      channelConfig: tmpl.channelConfig,
      isActive: true,
      isSystemTemplate: true
    }).onConflictDoNothing()
  }

  console.log(`  ✓ ${templates.length} message templates seeded`)
}
