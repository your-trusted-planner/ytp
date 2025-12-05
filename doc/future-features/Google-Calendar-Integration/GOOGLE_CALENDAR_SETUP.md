# Google Calendar Service Account Setup

This guide will help you set up a Google Service Account for server-side access to Google Calendar.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your **Project ID**

## Step 2: Enable Google Calendar API

1. In your Google Cloud project, go to **APIs & Services > Library**
2. Search for "Google Calendar API"
3. Click **Enable**

## Step 3: Create a Service Account

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > Service Account**
3. Fill in the service account details:
   - **Name:** `ytp-calendar-service`
   - **Description:** `Service account for YTP calendar access`
4. Click **Create and Continue**
5. Grant roles (optional for this step) - click **Continue**
6. Click **Done**

## Step 4: Create and Download Service Account Key

1. In the **Service Accounts** list, click on your newly created service account
2. Go to the **Keys** tab
3. Click **Add Key > Create new key**
4. Select **JSON** format
5. Click **Create**
6. The JSON key file will be downloaded - **KEEP THIS SECURE!**

The JSON file will look like this:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "ytp-calendar-service@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

## Step 5: Share Your Calendar with the Service Account

**This is critical!** The service account needs access to your calendar.

1. Open [Google Calendar](https://calendar.google.com/)
2. Find the calendar you want to use (or create a new one)
3. Click the **three dots** next to the calendar name
4. Click **Settings and sharing**
5. Scroll to **Share with specific people**
6. Click **Add people**
7. Enter the **service account email** from your JSON file (e.g., `ytp-calendar-service@your-project.iam.gserviceaccount.com`)
8. Set permission to **Make changes to events**
9. Click **Send**

## Step 6: Get Your Calendar ID

1. In the same **Settings and sharing** page
2. Scroll down to **Integrate calendar**
3. Copy the **Calendar ID** (looks like `abc123@group.calendar.google.com` or your email for primary calendar)

## Step 7: Configure Environment Variables

From your downloaded JSON file, extract these values:

### For Local Development (.dev.vars)

```bash
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
GOOGLE_SERVICE_ACCOUNT_EMAIL=ytp-calendar-service@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
```

**Important:** The private key must include the newline characters (`\n`)

### For Cloudflare Workers (Production)

```bash
# Set secrets
wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
# When prompted, paste: ytp-calendar-service@your-project.iam.gserviceaccount.com

wrangler secret put GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
# When prompted, paste the entire private key with \n characters
```

Update `wrangler.jsonc` vars section:
```jsonc
{
  "vars": {
    "GOOGLE_CALENDAR_ID": "your-calendar-id@group.calendar.google.com"
  }
}
```

## Step 8: Test the Integration

Create a test API endpoint:

```typescript
// server/api/calendar/test.get.ts
export default defineEventHandler(async () => {
  try {
    const events = await listCalendarEvents()
    return {
      success: true,
      eventCount: events.length,
      events
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
})
```

Then visit: `http://localhost:3000/api/calendar/test`

## Available Functions

Your app can now use these functions (from `server/utils/google-calendar.ts`):

- **`listCalendarEvents(timeMin?, timeMax?, maxResults?)`** - Get events
- **`createCalendarEvent(event)`** - Create new event
- **`updateCalendarEvent(eventId, event)`** - Update event
- **`deleteCalendarEvent(eventId)`** - Delete event
- **`getFreeBusy(timeMin, timeMax)`** - Check availability

## Example: Create an Appointment

```typescript
import { createCalendarEvent } from '../utils/google-calendar'

const event = await createCalendarEvent({
  summary: 'Client Consultation - John Doe',
  description: 'Initial trust planning consultation',
  start: {
    dateTime: '2025-12-10T10:00:00-08:00',
    timeZone: 'America/Los_Angeles'
  },
  end: {
    dateTime: '2025-12-10T11:00:00-08:00',
    timeZone: 'America/Los_Angeles'
  },
  attendees: [
    {
      email: 'client@example.com',
      displayName: 'John Doe'
    }
  ]
})
```

## Troubleshooting

### "Calendar usage limits exceeded"
- You've hit the API quota. Check your quota limits in Google Cloud Console.

### "Forbidden" or "Insufficient Permission"
- Make sure you shared the calendar with the service account email
- Verify the service account has "Make changes to events" permission

### "Invalid JWT Signature"
- Check that the private key is correctly formatted with `\n` characters
- Make sure you're using the entire private key including headers

### "Calendar not found"
- Verify the Calendar ID is correct
- Ensure the calendar is shared with the service account

## Security Best Practices

1. **Never commit the service account key to git**
2. **Use environment variables/secrets for all credentials**
3. **Rotate service account keys periodically**
4. **Only grant minimum necessary permissions**
5. **Monitor service account usage in Google Cloud Console**

## Rate Limits

- **Calendar API:** 1,000,000 queries/day
- **Per user:** 5,000 queries/second

For most law firm use cases, these limits are more than sufficient.
