# Google Calendar - Domain-Wide Delegation Setup

This guide shows how to set up **Domain-Wide Delegation** so your app can access any attorney's Google Calendar without individual OAuth authorization.

## Prerequisites

- ✅ Google Workspace account (not free Gmail)
- ✅ Google Workspace admin access
- ✅ All attorneys use `@yourdomain.com` emails

## What is Domain-Wide Delegation?

Domain-wide delegation allows your service account to **impersonate** any user in your Google Workspace domain and access their calendar on their behalf.

```
Service Account → (impersonate) → attorney@yourdomain.com → Their Calendar
```

**Benefits:**
- No OAuth flow per attorney
- Centralized management
- Works automatically for new attorneys

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: `ytp-calendar`
3. Note your **Project ID**

## Step 2: Enable Google Calendar API

1. Go to **APIs & Services > Library**
2. Search for "Google Calendar API"
3. Click **Enable**

## Step 3: Create Service Account

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > Service Account**
3. Fill in:
   - **Name:** `ytp-calendar-service`
   - **Description:** `Service account for attorney calendar access`
4. Click **Create and Continue**
5. Skip roles (not needed) - click **Continue**
6. Click **Done**

## Step 4: Create Service Account Key

1. Click on your service account in the list
2. Go to **Keys** tab
3. Click **Add Key > Create new key**
4. Select **JSON**
5. Click **Create** - the key file downloads
6. **SAVE THIS FILE SECURELY** - you'll need it later

## Step 5: Enable Domain-Wide Delegation

**This is the critical step!**

1. Still on the service account details page
2. Click **Show Domain-Wide Delegation**
3. Check **Enable Google Workspace Domain-wide Delegation**
4. Enter a product name: `YTP Calendar Access`
5. Click **Save**
6. **Copy the Client ID** (numeric, like `1234567890...`) - you'll need this next

## Step 6: Authorize in Google Workspace Admin (REQUIRED)

**You MUST do this as a Google Workspace admin:**

1. Go to [Google Admin Console](https://admin.google.com/)
2. Navigate to **Security > Access and data control > API Controls**
3. Click **Manage Domain Wide Delegation**
4. Click **Add new**
5. Fill in:
   - **Client ID:** Paste the numeric Client ID from Step 5
   - **OAuth Scopes:** `https://www.googleapis.com/auth/calendar.events`
   - **Description:** `YTP calendar access for scheduling`
6. Click **Authorize**

**✅ Domain-wide delegation is now active!**

## Step 7: Extract Credentials from JSON Key

Open the downloaded JSON key file. You need two values:

```json
{
  "client_email": "ytp-calendar-service@your-project.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n"
}
```

## Step 8: Configure Environment Variables

### Local Development (.dev.vars)

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=ytp-calendar-service@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
```

**Important:** Keep the `\n` characters in the private key!

### Production (Cloudflare Workers)

```bash
wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
# Paste: ytp-calendar-service@your-project.iam.gserviceaccount.com

wrangler secret put GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
# Paste the entire private key including -----BEGIN/END----- and \n
```

## Step 9: Verify Attorney Emails in Database

Your attorneys must have their Google Workspace email in the `users` table:

```sql
-- Check attorney emails
SELECT id, email, first_name, last_name
FROM users
WHERE role = 'LAWYER';

-- Should return emails like:
-- john@yourdomain.com
-- jane@yourdomain.com
```

These emails will be used to access each attorney's calendar.

## Step 10: Test the Integration

Create a test endpoint:

```typescript
// server/api/calendar/test-attorney.get.ts
export default defineEventHandler(async (event) => {
  const attorneyEmail = 'john@yourdomain.com' // Replace with real attorney

  try {
    // Test listing events
    const events = await listCalendarEvents(
      attorneyEmail,
      new Date().toISOString(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    )

    // Test free/busy
    const busy = await getFreeBusy(
      attorneyEmail,
      new Date().toISOString(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    )

    return {
      success: true,
      attorneyEmail,
      eventCount: events.length,
      events: events.slice(0, 5),
      busy
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
})
```

Visit: `http://localhost:3000/api/calendar/test-attorney`

## Usage Examples

### Check Attorney Availability

```typescript
// Get assigned attorney for a client
const db = hubDatabase()
const profile = await db.prepare(`
  SELECT assigned_lawyer_id FROM client_profiles WHERE user_id = ?
`).bind(clientId).first()

const attorney = await db.prepare(`
  SELECT email FROM users WHERE id = ?
`).bind(profile.assigned_lawyer_id).first()

// Check their availability
const busy = await getFreeBusy(
  attorney.email,
  '2025-12-10T09:00:00Z',
  '2025-12-10T17:00:00Z'
)
```

### Create Appointment

```typescript
// Create event on attorney's calendar
const event = await createCalendarEvent(
  attorney.email,
  {
    summary: 'Client Consultation - John Doe',
    description: 'Trust planning discussion',
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
  }
)
```

## Troubleshooting

### "Unauthorized client or scope in request"
- **Cause:** Domain-wide delegation not authorized in Admin Console
- **Fix:** Complete Step 6 in Admin Console
- **Verify:** Check that the Client ID and scope are correct

### "Forbidden" / "Insufficient Permission"
- **Cause:** Wrong scope or attorney email not in domain
- **Fix:** Ensure scope is `calendar.events` and attorney email ends with `@yourdomain.com`

### "Invalid JWT Signature"
- **Cause:** Private key formatting issue
- **Fix:** Ensure `\n` characters are preserved in the private key

### "Calendar not found" / "Not Found"
- **Cause:** Attorney email doesn't exist or doesn't have a calendar
- **Fix:** Verify the attorney email is a valid Google Workspace account

### "Daily Limit Exceeded"
- **Cause:** API quota exceeded
- **Fix:** Check quotas in Google Cloud Console > Calendar API

## Security Best Practices

1. **Never commit service account keys to git**
2. **Use environment variables/secrets for all credentials**
3. **Rotate keys annually**
4. **Monitor service account usage in Google Cloud Console**
5. **Only grant minimum necessary scopes**
6. **Audit domain-wide delegation periodically**

## Rate Limits

- **Calendar API:** 1,000,000 queries/day per project
- **Per user rate:** 5,000 queries/second

These limits are shared across all impersonated users.

## Key Differences from Simple Service Account

| Feature | Simple Service Account | Domain-Wide Delegation |
|---------|----------------------|----------------------|
| Setup | Easier | More complex |
| Access | Single shared calendar | All attorney calendars |
| Admin Required | No | Yes |
| OAuth per user | No | No |
| Google Workspace | Optional | Required |
| Scalability | Limited | Excellent |

## Summary

✅ **Service account created**
✅ **Domain-wide delegation enabled**
✅ **Authorized in Admin Console**
✅ **Can impersonate any attorney in your domain**
✅ **No OAuth flow needed**

Your app can now access any attorney's calendar using just their email address!
