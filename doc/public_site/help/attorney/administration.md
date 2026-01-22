# Administration

Administrative features for system setup and configuration.

## WYDAPT Document Seeding

For administrators setting up the Wyoming Asset Protection Trust service:

1. Go to **Admin** → **Seed WYDAPT**
2. **Step 1: Upload Documents**
   - Select document group (General Documents, Trust Documents, etc.)
   - Upload DOCX files for that group
   - Repeat for all 7 document groups
3. **Step 2: Process & Import**
   - Click **Process & Import**
   - System creates:
     - WYDAPT Matter ($18,500)
     - Journey template with 7 steps
     - Document templates with extracted variables
4. If errors occur, use **Clean Up Partial Data** to reset and try again

## System Configuration

Administrators can:

- Manage user accounts and roles
- Create and modify matters
- Set up journey templates
- Upload document templates
- Configure integrations (LawPay, PandaDoc, Google Drive)

## Notifications

The notification bell in the top navigation bar shows alerts about important events:

### Viewing Notifications

1. Click the **bell icon** in the header (next to your name)
2. A dropdown shows your recent notifications with:
   - Notification type icon (success, warning, error, info)
   - Title and message
   - Time received
   - Unread indicator (blue dot)
3. Click a notification to navigate to the related item
4. Click **Mark all read** to clear unread indicators
5. Click **View all** to see your full notification history

### Notification Types

| Type | Description |
|------|-------------|
| **Drive Sync Error** | Google Drive folder creation failed |
| **Document Signed** | A client completed an e-signature |
| **File Uploaded** | A client uploaded a document |
| **Action Required** | A journey step needs attention |
| **System Announcement** | Important system updates |

### Notification History

View all past notifications at **Notifications** (click "View all" from the dropdown):

- Filter by read/unread status
- Dismiss notifications you no longer need
- Navigate to related clients, matters, or documents

## Integrations

### Google Drive

Automatically sync client files to Google Drive Shared Drives. When enabled:

- Client folders are created automatically when matters are created
- Matter folders with subfolders are created for each new matter
- Generated documents, client uploads, and signed documents sync to Drive

**Setup**: Go to **Settings** → **Google Drive** to configure.

#### Sync Status Indicators

On client and matter detail pages, you'll see a Google Drive status section:

| Status | Meaning |
|--------|---------|
| **Synced** (green) | Folder exists and is accessible - click to open in Drive |
| **Not Synced** (gray) | No folder created yet |
| **Error** (red) | Sync failed - shows error message |

#### Manual Sync Actions

- **Sync Now / Verify Folder**: Creates a folder or verifies existing folder is accessible
- **Force New Folder**: Creates a new folder in the currently configured drive (use after changing drive settings)

See the full [Google Drive Integration Guide](/integrations/google-drive) for setup instructions.

## Matters (Services)

Matters define the services your firm offers. Each matter can be connected to journey workflows and document templates.

### Creating a Matter

1. Go to **Matters** in the sidebar
2. Click **Add Matter**
3. Enter:
   - **Name**: e.g., "Wyoming Asset Protection Trust Formation"
   - **Category**: Trust, LLC Formation, Maintenance, etc.
   - **Description**: What this service includes
   - **Type**: Single (one-time) or Recurring (ongoing)
   - **Price**: Service fee
   - **Billing Frequency** (for recurring): Monthly, Quarterly, Annually
4. Click **Save**

### Example Matters

| Matter | Type | Price |
|--------|------|-------|
| Wyoming Asset Protection Trust (WYDAPT) | Single | $18,500 |
| Annual Trust Maintenance | Recurring (Annual) | $500 |
| LLC Formation - Wyoming | Single | $2,500 |
