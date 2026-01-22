# Google Drive Integration

Automatically sync client files to Google Drive Shared Drives. This integration creates organized folder structures for each client and matter, keeping all documents synchronized between YTP and Google Drive.

## Overview

When enabled, the Google Drive integration:

- **Creates client folders** automatically when new clients are added
- **Creates matter folders** with subfolders for each new matter
- **Syncs generated documents** to the appropriate Drive folder
- **Syncs client uploads** to the Client Uploads folder
- **Syncs signed documents** after e-signature completion

### Folder Structure

```
YTP Client Files/                              (Root folder)
├── Smith, John & Jane/                       (Client folder)
│   ├── Smith Family Trust 2024 - 2024-001/   (Matter folder)
│   │   ├── Generated Documents/
│   │   ├── Client Uploads/
│   │   ├── Signed Documents/
│   │   └── Correspondence/
│   └── Smith Family Maintenance - 2024-002/
│       └── ...
├── Johnson, Robert/
│   └── ...
```

## Prerequisites

Before setting up the integration, you'll need:

1. **Google Workspace** account with admin access
2. **Google Cloud Platform** project
3. **Shared Drive** created in Google Drive

::: warning Important
This integration uses **Shared Drives** (formerly Team Drives), not personal Google Drive storage. Shared Drives provide:
- Team ownership (not tied to a single user)
- Better access control
- No single-user storage limits
:::

## Setup Guide

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name your project (e.g., "YTP Integration")
4. Click **Create**

### Step 2: Enable the Google Drive API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Drive API"
3. Click on **Google Drive API**
4. Click **Enable**

### Step 3: Create a Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in the details:
   - **Service account name**: "YTP Drive Sync"
   - **Service account ID**: auto-generated
   - **Description**: "Service account for YTP Google Drive integration"
4. Click **Create and Continue**
5. Skip the optional steps (roles, user access)
6. Click **Done**

### Step 4: Generate Service Account Key

1. Click on your newly created service account
2. Go to the **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON** format
5. Click **Create**
6. **Save the downloaded JSON file securely** - you'll need it for configuration

::: danger Security Warning
The JSON key file contains sensitive credentials. Never commit it to version control or share it publicly.
:::

### Step 5: Create a Shared Drive

1. Open [Google Drive](https://drive.google.com/)
2. In the left sidebar, click **Shared drives**
3. Click **+ New** → **New shared drive**
4. Name it (e.g., "YTP Client Files")
5. Click **Create**

### Step 6: Get the Shared Drive ID

1. Open your Shared Drive
2. Look at the URL: `https://drive.google.com/drive/folders/XXXXXXXXXX`
3. Copy the ID (the `XXXXXXXXXX` part)

### Step 7: Add Service Account to Shared Drive

1. Open your Shared Drive
2. Click the dropdown arrow next to the drive name
3. Select **Manage members**
4. Add the service account email (from Step 3, ends in `@your-project.iam.gserviceaccount.com`)
5. Set role to **Content Manager**
6. Click **Send**

### Step 8: Configure Domain-Wide Delegation (Optional)

If you want the service account to impersonate users in your domain:

1. Go to [Google Workspace Admin Console](https://admin.google.com/)
2. Navigate to **Security** → **API Controls** → **Domain-wide Delegation**
3. Click **Add new**
4. Enter:
   - **Client ID**: Found in your service account details
   - **OAuth Scopes**: `https://www.googleapis.com/auth/drive`
5. Click **Authorize**

::: tip When to Use Domain-Wide Delegation
Domain-wide delegation is useful when you want files to appear as created by a specific user rather than the service account. This is optional for basic functionality.
:::

## Configuration in YTP

### Step 1: Navigate to Settings

1. Log in as an administrator
2. Go to **Settings** → **Google Drive**

### Step 2: Enter Credentials

1. **Service Account Email**: Copy from your service account JSON file (the `client_email` field)
2. **Service Account Private Key**: Copy the entire `private_key` field from the JSON file, including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

### Step 3: Configure Shared Drive

1. **Shared Drive ID**: Paste the ID from Step 6 above
2. **Root Folder Name**: Name for the root folder (default: "YTP Client Files")
3. **Impersonate Email** (optional): If using domain-wide delegation, enter a user email

### Step 4: Configure Sync Settings

Choose which items to sync:

| Setting | Description |
|---------|-------------|
| **Generated Documents** | Documents created from templates |
| **Client Uploads** | Files uploaded by clients during journeys |
| **Signed Documents** | Documents after e-signature completion |

### Step 5: Configure Matter Subfolders

Customize the subfolders created for each matter. Default subfolders:

- Generated Documents
- Client Uploads
- Signed Documents
- Correspondence

You can add, remove, or rename these as needed.

### Step 6: Test Connection

1. Click **Test Connection**
2. You should see a success message with your Shared Drive name
3. If you see an error, verify:
   - Service account credentials are correct
   - Service account has access to the Shared Drive
   - Google Drive API is enabled

### Step 7: Create Root Folder

1. Click **Create Root Folder**
2. This creates the root folder inside your Shared Drive
3. All client folders will be created inside this root folder

### Step 8: Enable Integration

1. Toggle **Enable Google Drive Integration** to ON
2. Click **Save Configuration**

## Syncing Clients and Matters

### Automatic Syncing

When Google Drive is enabled:
- **New clients**: Folders are created when the first matter is created (on-demand)
- **New matters**: Folders are automatically created inside the client's folder

### Manual Syncing from the UI

Each client and matter detail page shows a **Google Drive** status section with:

| Status | Icon | Description |
|--------|------|-------------|
| **Synced** | Green | Folder exists and is accessible |
| **Not Synced** | Gray | No folder created yet |
| **Error** | Red | Sync failed - shows error message |

**Sync Actions:**

1. **Sync Now / Verify Folder**: Creates a new folder or verifies an existing folder is still accessible
2. **Force New Folder**: Clears the existing folder reference and creates a new folder in the currently configured drive

::: tip When to Use Force New Folder
Use "Force New Folder" when you've changed your Shared Drive configuration and need to recreate folders in the new drive. The old folders in the previous drive are not deleted.
:::

### Syncing via API

For each existing client without a Drive folder:

```http
POST /api/google-drive/sync/client/{clientId}
POST /api/google-drive/sync/client/{clientId}?force=true
```

For each existing matter without a Drive folder:

```http
POST /api/google-drive/sync/matter/{matterId}
POST /api/google-drive/sync/matter/{matterId}?force=true
```

::: warning
The client must have a Drive folder before you can sync their matters. If you sync a matter for a client without a folder, the client folder will be created automatically.
:::

### Sync Existing Documents

For each existing document:

```
POST /api/google-drive/sync/document/{documentId}
```

## Troubleshooting

### "Failed to access Shared Drive"

**Causes:**
- Service account doesn't have access to the Shared Drive
- Shared Drive ID is incorrect
- Google Drive API is not enabled

**Solutions:**
1. Verify the service account email is added to the Shared Drive
2. Check the Shared Drive ID in the URL
3. Ensure Google Drive API is enabled in Cloud Console

### "Failed to get access token"

**Causes:**
- Invalid service account credentials
- Private key is malformed

**Solutions:**
1. Re-download the JSON key file
2. Copy the entire private key including headers
3. Ensure no extra whitespace or line breaks

### Documents Not Syncing

**Causes:**
- Matter doesn't have a Drive folder
- Client doesn't have a Drive folder
- Sync for that document type is disabled

**Solutions:**
1. Sync the client folder first
2. Sync the matter folder
3. Check sync settings for the document type
4. Re-trigger document sync

### "Root folder already exists"

This is not an error - it means the root folder was previously created. The integration will use the existing folder.

## API Reference

### Get Configuration

```http
GET /api/admin/google-drive/config
```

Returns current configuration (credentials masked).

### Save Configuration

```http
POST /api/admin/google-drive/configure
Content-Type: application/json

{
  "isEnabled": true,
  "serviceAccountEmail": "...",
  "serviceAccountPrivateKey": "...",
  "sharedDriveId": "...",
  "rootFolderName": "YTP Client Files",
  "impersonateEmail": null,
  "matterSubfolders": ["Generated Documents", "Client Uploads", "Signed Documents", "Correspondence"],
  "syncGeneratedDocuments": true,
  "syncClientUploads": true,
  "syncSignedDocuments": true
}
```

### Test Connection

```http
POST /api/admin/google-drive/test
```

Tests connection to Shared Drive.

### Create Root Folder

```http
POST /api/admin/google-drive/create-root-folder
```

Creates the root folder in the Shared Drive.

### Manual Sync Endpoints

```http
POST /api/google-drive/sync/client/{id}
POST /api/google-drive/sync/client/{id}?force=true
POST /api/google-drive/sync/matter/{id}
POST /api/google-drive/sync/matter/{id}?force=true
```

Manually trigger sync for existing records. Use `?force=true` to clear existing folder reference and create a new folder in the currently configured drive.

**Response:**
```json
{
  "success": true,
  "message": "Google Drive folder created successfully",
  "folderId": "1ABC...",
  "folderUrl": "https://drive.google.com/...",
  "subfolders": ["Generated Documents", "Client Uploads", ...]
}
```

## Security Considerations

### Service Account Security

- Store credentials securely (encrypted in database)
- Use a dedicated service account for YTP
- Regularly rotate keys
- Monitor access logs in Google Cloud Console

### Shared Drive Permissions

- Only grant Content Manager access to the service account
- Review Shared Drive members periodically
- Use domain restrictions if needed

### Data Privacy

- Files synced to Google Drive are subject to Google's privacy policy
- Consider data residency requirements
- Ensure clients are informed about cloud storage

## Frequently Asked Questions

### Can I use a personal Google Drive instead of Shared Drive?

No, the integration is designed for Shared Drives only. Shared Drives provide:
- Better team access management
- No single-user ownership issues
- Higher storage limits

### Will existing files be moved to Drive?

No, the integration only syncs new files. Existing documents remain in R2 storage and can be manually synced if needed.

### What happens if Google Drive is down?

Documents are always stored in YTP's primary storage (R2). Google Drive sync is a secondary copy. If sync fails, it will be retried automatically.

### Can clients see the Google Drive folders?

Not directly through YTP. The folders are for your firm's internal use. You can share specific folders with clients through Google Drive's standard sharing features.

### How do I disable the integration?

1. Go to **Settings** → **Google Drive**
2. Toggle **Enable Google Drive Integration** to OFF
3. Click **Save**

Existing synced files will remain in Google Drive.
