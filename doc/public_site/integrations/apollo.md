# Apollo Integration

Sync contacts and marketing preference URLs with Apollo.io. This integration pushes contact data and self-service preference page URLs to Apollo, and pulls opt-out status back into YTP.

## Overview

When configured, the Apollo integration:

- **Pushes contacts** to Apollo with name, email, and a `preference_url` custom field
- **Links contacts** by matching email addresses between YTP and Apollo
- **Syncs opt-outs** from Apollo back into YTP's marketing consent system
- **Generates permanent preference URLs** that let recipients manage their own marketing preferences

### How It Works

```
YTP                          Apollo
───────────────────         ───────────────────
People with email    ──→    Contacts
  + preference URL          + preference_url
                              custom field

Global unsubscribe   ←──    email_unsubscribed
  (one-way pull)
```

Preference URLs are permanent, non-expiring links. Each person gets the same URL every time, so the URL can be synced once to Apollo and works forever.

## Setup

### Prerequisites

- An Apollo.io account with API access
- An API key from Apollo (Settings → Integrations → API Access)
- Admin access (Level 2) in YTP

### Configuration

1. Go to **Settings** → **Integrations** → **Apollo**
2. Enter your **Apollo API key**
3. Click **Save Credentials**
4. Click **Test Connection** to verify the key works
5. You should see a green "Connected" status

## Syncing Contacts to Apollo

The contact sync pushes people from YTP into Apollo and sets the `preference_url` custom field on each contact.

### What Happens During Sync

For each person in YTP with an email address:

1. **If the person already has an Apollo contact ID stored**: Updates the existing Apollo contact
2. **If no Apollo contact ID**: Searches Apollo by email
   - **Found**: Updates the existing Apollo contact and stores the Apollo ID in YTP
   - **Not found**: Creates a new contact in Apollo and stores the Apollo ID in YTP
3. Sets the `preference_url` custom field to the person's permanent preference page URL

### Running a Contact Sync

1. Go to **Settings** → **Integrations** → **Apollo**
2. Optionally check **Only sync clients** to limit the sync to people who have a client record
3. Click **Sync Contacts to Apollo**
4. Review the results:
   - **Created**: New contacts added to Apollo
   - **Updated**: Existing contacts updated with preference URL
   - **Skipped**: People without email addresses
   - **Errors**: Individual failures (do not stop the batch)

### Custom Field

The sync automatically creates a `preference_url` custom field in Apollo if it doesn't already exist. This field contains the full URL to each contact's self-service preferences page.

You can use this field in Apollo email templates to include a personalized unsubscribe/preferences link:

```
Manage your preferences: {{preference_url}}
```

## Checking Opt-Outs

The opt-out sync pulls unsubscribe status from Apollo back into YTP.

### What Happens During Opt-Out Check

For each person in YTP with a linked Apollo contact:

1. Fetches the contact from Apollo
2. Checks the `email_unsubscribed` field
3. If the contact is unsubscribed in Apollo **and** not already globally unsubscribed in YTP:
   - Applies a global unsubscribe in YTP
   - Records the change in the consent audit trail with source "APOLLO"

### Important: One-Way Sync

Opt-out sync is **one-way only**:
- Apollo unsubscribe → YTP global unsubscribe
- YTP unsubscribe does **not** push back to Apollo

This prevents sync loops and respects each system's independent unsubscribe handling.

### Running an Opt-Out Check

1. Go to **Settings** → **Integrations** → **Apollo**
2. Click **Check Opt-Outs**
3. Review the results:
   - **Checked**: Number of linked contacts checked
   - **New unsubscribes**: Contacts newly marked as globally unsubscribed in YTP
   - **Errors**: Individual failures

## Marketing Preferences Page

Each person's preference URL leads to a self-service page where they can:

- **View** which marketing channels they're subscribed to
- **Opt in or out** of individual channels (e.g., email newsletters, SMS)
- **Global unsubscribe** from all marketing communications

No login is required — the URL itself authenticates the request via a signed token.

### Token Types

| Type | Lifetime | Use Case |
|------|----------|----------|
| **Standard** | 30 days | On-demand links generated in admin UI |
| **Permanent** | Never expires | Synced to Apollo for use in email templates |

Permanent tokens are **deterministic**: the same person always generates the same token, so the URL never changes.

## Sync Status

The Apollo settings page shows:
- **Last Contact Sync**: When contacts were last pushed to Apollo
- **Last Opt-Out Check**: When opt-outs were last pulled from Apollo
- **Connection Status**: Whether the API key is valid and working

## Troubleshooting

### "Apollo integration not configured"
- Go to Settings → Integrations → Apollo and enter your API key

### Connection test fails with "Invalid API key"
- Verify the API key in Apollo under Settings → Integrations → API Access
- Make sure the key hasn't been revoked or expired

### Contact sync shows many errors
- Check that people have valid email addresses
- Apollo may rate-limit requests — try again later if you see 429 errors

### Opt-out check shows 0 checked
- Make sure contacts have been synced at least once (the opt-out check only looks at people with a stored Apollo contact ID)

### Preference URL doesn't work
- Verify the `NUXT_SESSION_PASSWORD` environment variable is set (tokens are signed with this secret)
- If the secret changes, all existing permanent tokens become invalid — run a contact sync to push new URLs

## API Reference

### Admin Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/integrations/apollo/sync-contacts` | POST | Push contacts and preference URLs to Apollo |
| `/api/admin/integrations/apollo/sync-optouts` | POST | Pull opt-outs from Apollo |
| `/api/admin/integrations/apollo/sync-status` | GET | Get last sync timestamps |
| `/api/admin/marketing/consent/{personId}/preference-url` | GET | Get permanent preference URL for one person |
| `/api/admin/marketing/preference-urls` | POST | Generate preference URLs in bulk |
