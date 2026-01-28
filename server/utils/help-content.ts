// Help content for lawyers/administrators
const lawyerContent = {
  'getting-started': `# Getting Started

Welcome to Your Trusted Planner! This guide will help you get started with managing your estate planning practice.

## Logging In

1. Navigate to your firm's portal URL
2. Enter your email and password (or use OAuth if your firm has configured Google, Microsoft, Apple, or Facebook login)
3. You'll be directed to your dashboard

## The Lawyer Dashboard

When you log in, your dashboard shows:

- **Stats Overview**: Total clients, pending documents, active journeys, upcoming appointments
- **Recent Activity**: Latest actions across all clients with clickable links to related entities
- **Quick Actions**: Add clients, create matters, generate documents

## Navigation

The sidebar provides access to all major features, organized into collapsible sections:

### Client Records
| Menu Item | Purpose |
|-----------|---------|
| **Clients** | View and manage all clients |
| **People** | Manage all people (clients, spouses, beneficiaries, etc.) |
| **Matters** | Track client engagements and services |
| **Estate Plans** | View imported estate planning documents |

### Documents
| Menu Item | Purpose |
|-----------|---------|
| **All Documents** | View all generated documents |
| **E-Signatures** | Manage signature requests and track signing status |

### Other Features
| Menu Item | Purpose |
|-----------|---------|
| **Schedule** | Calendar and appointments |
| **Activity Log** | Detailed audit trail of all system activity |

### Configuration
| Menu Item | Purpose |
|-----------|---------|
| **Service Catalog** | Define your service offerings with pricing |
| **Service Categories** | Organize services into categories (admin only) |
| **Journey Templates** | Create and manage workflow templates |
| **Document Templates** | Manage document templates with variables |

### Account
Access **Settings** from the user menu (top-right) to configure:
- Google Drive integration
- OAuth providers
- User management
- And more

## Notifications

The bell icon in the header shows system notifications:
- Drive sync errors
- Document signing completions
- Client file uploads
- Journey action items requiring attention

Click the bell to see recent notifications, or "View all" for the full history.

## Quick Tips

- Use the search function on list pages to quickly find records
- Set up journey templates to streamline your workflow
- Check your dashboard daily for pending actions
- Review the Activity Log to track client engagement
- Configure Google Drive to automatically sync documents
`,

  'managing-clients': `# Managing Clients & Matters

Learn how to add, manage, and track your clients and their engagements effectively.

## Adding a New Client

1. Go to **Clients** in the sidebar (under Client Records)
2. Click **Add Client**
3. Enter:
   - First and last name
   - Email address
   - Phone number (optional)
   - Temporary password (client will use this for first login)
4. Click **Create**

The client will receive login credentials and can access their portal.

## Viewing Client Details

Click on any client to see their full profile with multiple tabs:

### Overview Tab
- **Contact Information**: Name, email, phone, address
- **Family Information**: Spouse details, children
- **Estate Planning Status**: Existing will/trust status
- **Business Information**: If applicable
- **Google Drive Status**: Sync status and folder link (if enabled)

### Matters Tab
- List of all matters/engagements for this client
- Create new matters directly from here

### Documents Tab
- All documents assigned to this client
- Generate new documents from templates

### Notes Tab
- Internal notes and history
- Add timestamped notes for record-keeping

### Journeys Tab
- Active service journeys and their progress
- View step-by-step completion status

## Client Statuses

| Status | Meaning |
|--------|---------|
| **Lead** | Initial inquiry, minimal information |
| **Prospect** | Interested potential client |
| **Active** | Engaged client with full portal access |
| **Inactive** | Account disabled |

## Google Drive Sync

If Google Drive integration is enabled, each client shows a sync status:

| Status | Meaning |
|--------|---------|
| **Synced** (green) | Folder exists and is accessible - click to open |
| **Not Synced** (gray) | No folder created yet |
| **Error** (red) | Sync failed - shows error message |

**Actions:**
- **Sync Now**: Creates a folder or verifies existing folder
- **Force New Folder**: Creates a new folder (use after changing Drive settings)

---

## Understanding Matters & Services

### What is a Matter?

A **matter** represents a client engagement - the overall business relationship and scope of work. Think of it like a statement of work or consulting engagement.

**Key Points:**
- Each matter has an auto-generated number (e.g., "2024-001")
- Matters start in "Pending" status until the engagement letter is signed
- One matter can include multiple services from your Service Catalog
- The engagement letter date marks when the client formally engages

### What are Services?

**Services** are the specific products/offerings engaged within a matter (e.g., WYDAPT formation, Annual Maintenance). Each service has a workflow (journey) that guides the client through completion.

---

## Creating a New Matter

1. Go to **Matters** in the sidebar (under Client Records)
2. Click **Add New Matter**
3. Fill in:
   - **Matter Title**: Descriptive title (e.g., "Smith Family Trust 2024")
   - **Client**: Select from dropdown
   - **Description**: Brief overview of the engagement
   - **Status**: Usually starts as "Pending"
   - **Engagement Letter Date**: Leave blank until letter is signed
   - **Services**: Check the services to include (optional, can add later)
4. Click **Create Matter**

**The system automatically:**
- Generates a unique matter number (YYYY-###)
- Creates service engagements for selected services
- Creates Google Drive folders (if enabled) - client folder first if needed, then matter folder with subfolders
- Sets up journeys for engaged services when the engagement journey completes

## Matter Lifecycle

### 1. Creation (Pending)
- Create the matter with basic details
- Select services to engage
- Matter status: **Pending**

### 2. Engagement (Open)
- Client signs engagement letter
- Update the "Engagement Letter Date"
- Change matter status to **Open**
- Journeys become active

### 3. Service Delivery (Active)
- Clients work through journey steps
- Documents are generated and signed
- Track progress in real-time
- Services complete individually

### 4. Completion (Closed)
- All services completed
- Final deliverables provided
- Change matter status to **Closed**

---

## Working with Notes

Add notes to clients, matters, documents, or journeys to keep a complete record:

1. Navigate to the entity's detail page
2. Find the **Notes** tab or section
3. Click **Add Note**
4. Enter your note content
5. Click **Save**

Notes are timestamped and attributed to the user who created them.

---

## Best Practices

### Matter Management
✓ Use descriptive titles - e.g., "Smith Family Trust 2024", not just "Smith"
✓ Update engagement letter date when client actually engages
✓ Start with PENDING status - don't mark OPEN until letter is signed
✓ Engage all services upfront, or add as scope expands

### Client Communication
✓ Keep notes up to date with all client interactions
✓ Follow up promptly on pending documents
✓ Use the Activity Log to track engagement patterns
✓ Check notifications regularly for action items

### Google Drive
✓ Configure Drive before creating matters for automatic folder creation
✓ Use "Force New Folder" if you change Drive configuration
✓ Files in old folders remain but are no longer linked
`,

  'journeys-workflows': `# Journeys & Workflows

Journeys are the heart of service delivery. They break complex legal services into manageable steps that both attorneys and clients can track.

## Understanding Journeys

### Journey Types

- **Engagement Journey**: The initial client intake and engagement process. When completed, automatically starts service journeys for all engaged services.
- **Service Journey**: Workflow for delivering a specific service (linked to Service Catalog items).

### Many-to-Many Relationship

A single journey can be linked to multiple services from the Service Catalog. For example, an "Estate Planning Consultation" journey might lead to multiple service options - the client chooses their service at the end of the engagement journey.

---

## Understanding Journey Steps

Each journey contains ordered steps. Steps come in two types:

### Milestone Steps

- Discrete, one-time completion points
- Shows a checkmark when completed
- Example: "Initial Consultation Complete" or "Documents Signed"

### Bridge Steps

- Iterative revision/feedback loops
- Allows multiple rounds of back-and-forth
- Example: "Trust Document Review" where client and attorney may go through several revisions
- Tracks iteration count and approval status from both parties

---

## Action Items

Every journey step should have one or more **action items** - specific tasks that need to be completed. The system supports 14 action types:

### Client-Facing Actions
| Type | Description |
|------|-------------|
| **Questionnaire** | Client fills out a form |
| **Upload** | Client uploads documents (ID, tax returns, etc.) |
| **Review** | Client reviews content |
| **E-Sign** | Client signs a document electronically |
| **Payment** | Client makes a payment |
| **Meeting** | Scheduled consultation or call |

### Attorney/Staff Actions
| Type | Description |
|------|-------------|
| **Draft Document** | Generate a document from template |
| **KYC** | Know Your Customer verification |
| **Notary** | Notarization required |
| **Decision** | Decision point in the workflow |

### System Actions
| Type | Description |
|------|-------------|
| **Automation** | Automated system task |
| **Third Party** | External service integration |
| **Offline Task** | Manual task outside the system |
| **Expense** | Expense or fee tracking |
| **Form** | Internal form completion |

### Validation

Every journey step should have at least one action item. The system shows validation warnings for steps without action items.

---

## Creating a Journey Template

1. Go to **Journey Templates** in the sidebar (under Configuration)
2. Click **Create Journey**
3. Enter:
   - **Name**: e.g., "Wyoming Asset Protection Trust Journey"
   - **Description**: Overview of the workflow
   - **Type**: Engagement or Service
   - **Associated Services**: Link to service catalog items (many-to-many)
   - **Estimated Duration**: Total expected days
   - **Template**: Check this to make it reusable
4. Click **Create**

## Adding Steps to a Journey

1. Open your journey template
2. Click **Add Step**
3. Configure the step:
   - **Name**: What this step accomplishes
   - **Type**: Milestone or Bridge
   - **Responsible Party**:
     - CLIENT: Client must complete
     - ATTORNEY: Your staff completes
     - BOTH: Requires action from both parties
   - **Expected Duration**: Days for this step
   - **Help Content**: Instructions shown to the client
   - **Allow Multiple Iterations**: For Bridge steps (enables revision loops)
4. Click **Save**
5. **Add Action Items** to the step to define specific tasks

## Reordering Steps

Drag and drop steps to change their order in the journey.

---

## Example: WYDAPT Journey

The pre-configured WYDAPT journey includes these steps:

| Order | Step | Type | Responsible |
|-------|------|------|-------------|
| 1 | Engagement & Initial Setup | Milestone | Both |
| 2 | Trust Formation - Review & Sign | Bridge | Both |
| 3 | Private Trust Company Setup | Milestone | Attorney |
| 4 | Special Purpose Trust (if applicable) | Milestone | Attorney |
| 5 | Investment Committee Formation | Milestone | Client |
| 6 | Asset Contribution Process | Bridge | Both |
| 7 | Distribution Management (Ongoing) | Bridge | Both |

---

## Journey Automation

### Auto-Start Service Journeys

When an **Engagement Journey** is completed:
1. The system identifies all services engaged in the matter
2. For each engaged service, creates a client journey using the service's journey template
3. Client journeys are automatically linked to the matter
4. Client sees new journeys in their portal

This eliminates the need to manually start journeys for each service.

---

## Monitoring Client Progress

From the **Journey Templates** page or the **Matters** page, you can see:

- All active client journeys
- Current step for each client
- Progress percentage
- Days in current step
- Action items requiring attention

Click into any journey to see detailed step-by-step status and take action.

---

## Best Practices

### Journey Design
✓ Keep step names clear and action-oriented
✓ Add detailed help content for client-facing steps
✓ Use Bridge steps for any review/revision cycles
✓ Add action items to every step

### Workflow Management
✓ Review bridge steps carefully - these require back-and-forth
✓ Mark milestones complete to keep the journey moving
✓ Check the Activity Log for journey progress updates
✓ Use notes to document decisions made during the journey
`,

  'documents': `# Documents & E-Signatures

Manage document templates, generate client documents, send for electronic signature, and track the entire signing workflow.

---

## Document Templates

Templates are reusable document blueprints with variable placeholders that get filled with client-specific data.

### Managing Templates

1. Go to **Document Templates** in the sidebar (under Configuration)
2. Browse templates by category
3. Click any template to preview its content and variables

### Variable Syntax

Use double curly braces with **flat variable names** (no dots):

**Correct syntax:**
- \`{{clientFirstName}}\` - Client's first name
- \`{{clientLastName}}\` - Client's last name
- \`{{clientFullName}}\` or \`{{clientName}}\` - Full name
- \`{{clientAddress}}\`, \`{{clientCity}}\`, \`{{clientState}}\`, \`{{clientZipCode}}\`
- \`{{clientEmail}}\`, \`{{clientPhone}}\`
- \`{{spouseName}}\`, \`{{spouseFirstName}}\`, \`{{spouseLastName}}\`
- \`{{currentDate}}\` or \`{{today}}\` - Today's date (formatted)
- \`{{serviceName}}\` - Service catalog name
- \`{{matterName}}\` - Matter title
- \`{{lead_attorney}}\` - Lead attorney name
- \`{{fee}}\`, \`{{retainerFee}}\`, \`{{hourlyRate}}\` - Pricing (defaults to "[To be determined]")

**Incorrect syntax (don't use dots):**
- ~~\`{{client.firstName}}\`~~ - Will not work
- ~~\`{{trust.name}}\`~~ - Will not work

### Uploading Templates

1. Go to **Document Templates**
2. Click **Upload Template**
3. Select your Word document (.docx)
4. Enter name and description
5. Select category
6. Click **Upload**

The system extracts all \`{{variables}}\` automatically and shows them in the template detail view.

---

## Generating Documents

### From Templates Page

1. Go to **Document Templates**
2. Find your template
3. Click **Generate Document**
4. Select the client from dropdown
5. Optional: Link to a matter
6. Enter document title (or use default)
7. Click **Generate Document**

### From Client Profile

1. Open client's profile
2. Go to **Documents** tab
3. Click **Generate from Template**
4. Select template and generate

### From Matter Detail

1. Open a matter
2. Go to **Documents** section
3. Click **Generate Document**
4. Select template - document auto-links to matter

---

## Document Workflow

Documents progress through these statuses:

\`\`\`
DRAFT → SENT → VIEWED → SIGNED → COMPLETED
\`\`\`

| Status | Meaning |
|--------|---------|
| **Draft** | Created, not yet sent to client |
| **Sent** | Client notified, awaiting their action |
| **Viewed** | Client has opened the document |
| **Signed** | Client has signed electronically |
| **Completed** | Process complete, filed |

---

## Electronic Signatures

The e-signature system allows clients to sign documents directly in the portal with a legally binding electronic signature.

### Initiating a Signature Request

1. Open the document detail page
2. Click **Request Signature**
3. Configure the signing session:
   - **Send email notification**: Check to send an email to the client
   - **Email message**: Optional custom message
   - **Expiration**: When the signing link expires (default 7 days)
4. Click **Send for Signature**

### Signature Workflow

1. **Client receives notification** (email and/or in-app)
2. **Client opens signing link** (works from email or portal)
3. **Client reviews document** in the signing ceremony
4. **Client draws signature** on signature pad
5. **Client confirms** the signature
6. **Document is finalized** with embedded signature and audit trail
7. **PDF is generated** with signature applied
8. **Both parties can download** the signed PDF

### Signatures Dashboard

Access the dedicated **E-Signatures** page (under Documents in the sidebar) to:

- View all signature sessions across all documents
- See status summary cards (Pending, Viewed, Signed, Expired)
- Filter by status
- Take actions on pending sessions

### Managing Signature Sessions

From the Signatures dashboard or document detail:

- **Resend/Remind**: Send a reminder email and optionally extend expiration
- **Revoke**: Cancel a pending signature session
- **View Status**: See when the document was viewed, signed, or expired

### Downloading Signed Documents

Once signed:
1. Open the document detail page
2. Click **Download Signed PDF**
3. The PDF includes the signature image and audit trail

Clients can also download their signed documents from their portal.

---

## Client Document Uploads

Clients can upload supporting documents (tax returns, IDs, etc.):

1. Client uploads via their portal or journey step
2. Document appears for lawyer review
3. Lawyer reviews and sets status:
   - **Approved**: Document accepted
   - **Rejected**: Document not acceptable
   - **Requires Revision**: Client needs to resubmit
4. Client receives notification of the result
5. If Google Drive is enabled, uploads sync to the client's Drive folder

---

## Google Drive Sync

When Google Drive is configured, documents sync automatically:

- **Generated documents**: Sync to matter folder
- **Client uploads**: Sync to client's uploads folder
- **Signed documents**: Sync to matter folder

See the [Administration](/help?topic=administration) section for Drive setup.

---

## Best Practices

### Template Design
✓ Use clear, descriptive variable names
✓ Test templates with sample data before using
✓ Keep variable names flat (no dots)
✓ Include all formatting in the Word template

### Document Management
✓ Review variables before sending to client
✓ Update status as document progresses
✓ Keep document titles descriptive
✓ Link documents to matters when applicable

### E-Signatures
✓ Set appropriate expiration dates
✓ Include a helpful message when sending
✓ Send reminders for pending signatures
✓ Revoke expired or cancelled sessions
`,

  'appointments': `# Appointments

Schedule and manage client appointments effectively.

## Scheduling Appointments

1. Go to **Schedule** in the sidebar
2. Click on a date/time
3. Enter:
   - Title
   - Description
   - Client (select from list)
   - Location (or video call link)
   - Start and end time
4. Click **Save**

## Appointment Statuses

| Status | Meaning |
|--------|---------|
| **Pending** | Scheduled, awaiting confirmation |
| **Confirmed** | Client confirmed attendance |
| **Completed** | Meeting finished |
| **Cancelled** | Appointment cancelled |

Clients see their appointments in their portal dashboard.

## Calendar Views

- **Day View**: Detailed hourly schedule
- **Week View**: Weekly overview
- **Month View**: Monthly calendar

## Tips for Scheduling

- Include video call links for remote consultations
- Add detailed descriptions so clients know what to prepare
- Leave buffer time between appointments
- Set reminders for important meetings
`,

  'administration': `# Administration

Administrative features for system setup, configuration, and integrations.

---

## Settings Menu

Access **Settings** from the user dropdown menu (top-right corner). Available settings depend on your admin level.

---

## User Management

Manage user accounts, roles, and permissions.

### User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **Admin** | Full system access | All features, settings, and user management |
| **Lawyer** | Attorney/counsel | Full client and matter access |
| **Staff** | Internal employees (paralegals, secretaries) | Broad access to clients/matters |
| **Advisor** | External third-parties (CPAs, financial advisors) | Limited access to assigned clients/matters only |
| **Client** | Engaged clients | Portal access to their matters and documents |
| **Prospect/Lead** | Pre-engagement | Limited portal access |

### Admin Levels

For Admin, Lawyer, and Staff roles:
- **Level 0**: Standard access
- **Level 1**: Enhanced features (service categories management)
- **Level 2**: Full admin (integrations, system settings, user management)

### Managing Users

1. Go to **Settings** → **Users**
2. View all users with role and status
3. Click a user to edit their details
4. Set role, admin level, and status

---

## Google Drive Integration

Automatically sync client files to Google Shared Drives.

### What Gets Synced

- **Client folders**: Created when matters are created
- **Matter folders**: With configurable subfolders (Drafts, Signed, Uploads, etc.)
- **Generated documents**: Sync to matter's document folder
- **Client uploads**: Sync to client's uploads folder
- **Signed documents**: Sync to matter folder

### Setup

1. Go to **Settings** → **Google Drive**
2. Enter your **service account email** and **private key**
3. Enter the **Shared Drive ID** (use "Test Connection" to see available drives)
4. Configure:
   - Root folder name
   - Impersonation email (optional)
   - Matter subfolder names
   - Sync options (generated docs, uploads, signed docs)
5. Click **Save Configuration**
6. Click **Create Root Folder** to create the top-level folder in Drive

### Service Account Setup

1. Create a service account in Google Cloud Console
2. Enable the Google Drive API
3. Download the JSON key file
4. Extract the client_email and private_key
5. Share your Shared Drive with the service account email (Editor access)

### Sync Status Indicators

On client and matter detail pages:

| Status | Meaning |
|--------|---------|
| **Synced** (green) | Folder exists and is accessible |
| **Not Synced** (gray) | No folder created yet |
| **Error** (red) | Sync failed - shows error message |

### Troubleshooting

**"Folder not accessible" after changing Shared Drives:**
- Use "Force New Folder" to create a new folder in the current drive
- Old folder remains in the previous drive but is no longer linked

**"Permission denied" errors:**
- Ensure service account has Editor access to the Shared Drive
- Check that the Shared Drive ID is correct

---

## OAuth Providers

Configure social login options (Google, Microsoft, Apple, Facebook).

### Setup Requirements

1. Set up Firebase Authentication in Firebase Console
2. Enable desired OAuth providers in Firebase
3. Configure the provider settings in YTP

### Configuration

1. Go to **Settings** → **OAuth Providers**
2. Click **Add Provider**
3. Select the provider (Google, Microsoft, Apple, Facebook)
4. Enter the required credentials from Firebase
5. Enable/disable as needed

### How OAuth Works

1. User clicks OAuth button on login page
2. User authenticates with the provider (Google, etc.)
3. Firebase verifies the authentication
4. YTP creates or links the user account by email
5. User is logged in

**Account Linking**: If a user has an existing email/password account, OAuth login automatically links to that account.

---

## Notifications System

The notification system alerts users to important events.

### Notification Types

| Type | Description |
|------|-------------|
| **Drive Sync Error** | Google Drive folder creation failed |
| **Document Signed** | A client completed an e-signature |
| **File Uploaded** | A client uploaded a document |
| **Action Required** | A journey step needs attention |
| **System Announcement** | Important system updates |
| **Payment Received** | Payment confirmation |

### Viewing Notifications

- Click the **bell icon** in the header
- See unread count on the badge
- Click "View all" for full history
- Click a notification to navigate to the related item

### Managing Notifications

- **Mark as read**: Click on a notification
- **Mark all read**: Click "Mark all read" in the dropdown
- **Dismiss**: Remove notifications you no longer need

---

## Activity Log

The Activity Log provides a comprehensive audit trail of all system actions.

### Accessing the Activity Log

1. Click **Activity Log** in the sidebar
2. View all activities with timestamps and user attribution
3. Filter by activity type, user, or date range
4. Export to CSV for reporting

### What's Logged

- User logins/logouts
- Client creation and updates
- Matter creation and updates
- Document generation, viewing, and signing
- Note creation and updates
- Journey progress
- System configuration changes

### Entity Links

Activities show clickable badges linking to:
- Users who performed the action
- Clients, matters, documents, etc. involved
- Related entities

---

## People Management

The **People** page (under Client Records) manages all individuals in the system.

### Who is a Person?

Every human in the system is a person:
- Clients
- Spouses and family members
- Beneficiaries
- Trustees and fiduciaries
- Staff and attorneys

### Person vs User vs Client

| Entity | Description |
|--------|-------------|
| **Person** | Identity record - all humans have one |
| **User** | Login account - only those who need access |
| **Client** | Client-specific data - only actual clients |

A lawyer has a person + user record.
A client might have person + user + client records.
A spouse might only have a person record (no login needed).

### Managing People

1. Go to **People** in the sidebar
2. View all people with their type (individual/entity)
3. Click to edit details
4. Link to clients, relationships, etc.

---

## Estate Plans (WealthCounsel Import)

Import estate planning documents from WealthCounsel XML files.

### Import Process

1. Go to **Settings** → **Integrations** → **WealthCounsel**
2. Upload the XML file from WealthCounsel
3. Review extracted data:
   - Plan information
   - People (clients, spouses, beneficiaries)
   - Roles and relationships
4. **Person Matching**: Review potential duplicates
   - System shows confidence scores for matches
   - Choose to create new or link to existing people
5. Click **Import** to create the estate plan

### Viewing Estate Plans

1. Go to **Estate Plans** in the sidebar
2. Browse imported plans
3. Click to view details:
   - Plan documents (wills, trusts, powers of attorney)
   - People involved and their roles
   - Version history

### Deleting Estate Plans (Admin Only)

Administrators (level 2+) can delete estate plans:

1. Open the estate plan
2. Click **Delete**
3. Choose whether to also delete associated people
4. Type the plan name to confirm
5. Click **Delete**

---

## Service Catalog

Define your firm's service offerings with pricing and journey links.

### Creating a Service

1. Go to **Service Catalog** in the sidebar
2. Click **Add Service**
3. Enter:
   - **Name**: e.g., "Wyoming Asset Protection Trust Formation"
   - **Category**: Trust, LLC Formation, Maintenance, etc.
   - **Description**: What this service includes
   - **Type**: Single (one-time) or Recurring (ongoing)
   - **Price**: Service fee (in cents)
   - **Billing Frequency** (for recurring): Monthly, Quarterly, Annually
4. Click **Save**

### Linking Services to Journeys

Services are linked to journey templates (many-to-many). When a service is engaged in a matter, the corresponding journey guides the client through delivery.

### Example Services

| Service | Type | Price |
|---------|------|-------|
| Wyoming Asset Protection Trust (WYDAPT) | Single | $18,500 |
| Annual Trust Maintenance | Recurring (Annual) | $500 |
| LLC Formation - Wyoming | Single | $2,500 |

---

## WYDAPT Document Seeding

For administrators setting up the Wyoming Asset Protection Trust service:

1. Go to **Settings** → **Integrations** → **Seed WYDAPT**
2. **Step 1: Upload Documents**
   - Select document group (General Documents, Trust Documents, etc.)
   - Upload DOCX files for that group
   - Repeat for all 7 document groups
3. **Step 2: Process & Import**
   - Click **Process & Import**
   - System creates:
     - WYDAPT Service ($18,500)
     - Journey template with 7 steps
     - Document templates with extracted variables
4. If errors occur, use **Clean Up Partial Data** to reset and try again

---

## Best Practices

### Security
✓ Use strong passwords and enable OAuth where possible
✓ Set appropriate admin levels - not everyone needs Level 2
✓ Review the Activity Log regularly for unusual activity
✓ Revoke access for departed employees promptly

### Data Management
✓ Keep People records deduplicated
✓ Link relationships correctly (spouse, beneficiary, trustee)
✓ Archive inactive matters rather than deleting
✓ Back up important documents to Google Drive

### Integrations
✓ Test Google Drive connection before creating matters
✓ Monitor notification bell for sync errors
✓ Keep OAuth provider credentials secure
`
}

// Help content for clients
const clientContent = {
  'client-getting-started': `# Welcome to Your Trusted Planner

Welcome! Your Trusted Planner is your personal portal for managing your estate planning journey. This guide will help you get started.

## Logging In

### Email and Password
1. Use the email and temporary password provided by your attorney
2. Navigate to the portal URL
3. Enter your credentials and log in

### Social Login (if enabled)
Your firm may have enabled social login options:
- Click **Continue with Google**, **Microsoft**, **Apple**, or **Facebook**
- Authenticate with your chosen provider
- Your account is automatically linked

If you use the same email address as your existing account, the accounts are linked automatically.

## Your Dashboard

When you log in, you'll see your personal dashboard with:

- **My Journeys**: Services you're enrolled in with progress indicators
- **My Matters**: Your active legal matters and engagements
- **My Documents**: Documents assigned to you, including those awaiting signature
- **Upcoming Appointments**: Scheduled meetings with your attorney
- **Quick Stats**: Documents pending, progress on current journey

## Navigation

The sidebar menu gives you quick access to:

| Menu Item | What You'll Find |
|-----------|-----------------|
| **Dashboard** | Overview of your account |
| **My Journeys** | Your service progress step-by-step |
| **My Matters** | Your legal matters and engagements |
| **My Documents** | Documents to review and sign |
| **Appointments** | Scheduled meetings |
| **Help** | This help center |

Access your **Profile** settings from the user menu in the top-right corner.

## Notifications

Watch for the notification bell in the header - it alerts you to:
- Documents ready for signature
- Journey steps requiring action
- Appointment reminders
- Important updates from your attorney

## Next Steps

1. Review your active journeys to understand what's next
2. Check for documents awaiting your signature
3. Upload any requested supporting documents
4. Review your upcoming appointments

If you have questions at any point, contact your attorney's office.
`,

  'client-journeys': `# Your Journeys

Journeys guide you through the legal services you're receiving. Each journey is broken into clear steps so you always know what's happening and what comes next.

## Viewing Your Progress

1. Click **My Journeys** in the sidebar
2. Select the journey you want to view
3. You'll see:
   - Overall progress percentage
   - Visual step-by-step progress indicator
   - Current step highlighted
   - Completed steps with checkmarks

## Understanding Steps

Each journey has multiple steps. Some steps require action from you:

### What You Might Need to Do

- **Review documents**: Read through legal documents
- **Sign documents**: Provide your electronic signature
- **Upload files**: Submit requested documents (IDs, tax returns, etc.)
- **Complete forms**: Fill in requested information

### Step Types

- **Milestone**: A one-time task (like signing a document)
- **Bridge**: A back-and-forth process where you might review multiple drafts

## Working on Your Current Step

1. Open your journey
2. Find your current step (it will be highlighted)
3. Read the instructions provided
4. Complete the required action
5. The system will automatically track your progress

## Tips for Success

- Complete steps promptly to keep your matter moving forward
- Read all instructions carefully
- Ask your attorney if you have questions about any step
- Upload clear, complete documents when requested
`,

  'client-documents': `# Your Documents

View, sign, and manage all documents related to your legal services.

## Finding Your Documents

1. Click **My Documents** in the sidebar
2. You'll see all documents assigned to you
3. Documents are sorted by status

## Document Statuses

| Status | What It Means |
|--------|---------------|
| **Sent** | Ready for you to review |
| **Viewed** | You've opened it (we track this automatically) |
| **Signed** | You've signed it electronically |
| **Completed** | Fully processed and filed |

## Reviewing a Document

1. Click on any document to open it
2. Read through the content carefully
3. If you have questions, contact your attorney before signing

---

## Signing Documents Electronically

When your attorney sends a document for signature, you'll receive an email notification (and see it in your portal).

### The Signing Process

1. **Open the signing link** - Click the link in your email or from the portal
2. **Review the document** - Read through the entire document carefully
3. **Click "Sign Document"** - When ready to sign
4. **Draw your signature** - Use your mouse or touchscreen to sign in the signature pad
5. **Confirm your signature** - Click "Confirm & Apply Signature"
6. **Download your copy** - After signing, download the signed PDF for your records

### Important Notes

- **Legally binding**: Your electronic signature is legally valid under federal and state law (ESIGN Act and UETA)
- **Take your time**: Review the document completely before signing
- **Ask questions first**: If anything is unclear, contact your attorney before signing
- **Signature links expire**: Sign within the timeframe indicated (usually 7 days)

### After Signing

- The signed document is stored in your portal
- Your attorney receives notification that you've signed
- You can download the signed PDF anytime from "My Documents"
- The signed PDF includes your signature and an audit trail

---

## Downloading Documents

### Downloading Signed Documents

1. Go to **My Documents**
2. Find the document (status: "Signed" or "Completed")
3. Click the **Download** button
4. The PDF includes your signature embedded in the document

### Keeping Records

- Download copies of all signed documents for your records
- Store them in a safe location
- These are your official copies of the legal documents

---

## Tips

✓ Check your email for signing notifications
✓ Review documents thoroughly before signing
✓ Download and save copies of signed documents
✓ Contact your attorney with questions before signing
`,

  'client-uploads': `# Uploading Files

Your attorney may request supporting documents from you. This guide explains how to upload them.

## What You Might Need to Upload

- Government-issued ID (driver's license, passport)
- Tax returns
- Financial statements
- Property deeds
- Business documents
- Other supporting materials

## How to Upload

1. Navigate to your journey or document that requests an upload
2. Click the **Upload** button or drag files into the upload area
3. Select your file
4. Add a description if requested
5. Click **Submit**

## Upload Requirements

- **File Types**: PDF, JPG, PNG, DOCX
- **File Size**: Maximum 10MB per file
- **Quality**: Make sure documents are clear and readable

## After You Upload

1. Your attorney's office receives a notification
2. They review your document
3. You'll be notified of the result:
   - **Approved**: Document accepted
   - **Requires Revision**: Please upload a better version
   - **Rejected**: Document not acceptable (see notes for reason)

## Tips for Good Uploads

- Ensure all pages are included
- Make sure text is readable
- Check that images aren't blurry
- Name your files clearly
`,

  'client-faq': `# Frequently Asked Questions

Common questions about using Your Trusted Planner.

## Account & Access

### How do I reset my password?
Go to **Profile** (from the user menu in top-right) and click **Change Password**. Enter your current password and your new password.

### I forgot my password - how do I reset it?
On the login page, click "Forgot Password" and follow the instructions sent to your email.

### How do I update my contact information?
Go to **Profile** and update your details. Click **Save** when done.

### Can I log in with Google or Microsoft?
If your attorney has enabled social login, you'll see options like "Continue with Google" on the login page. You can use these to log in with your existing accounts.

### Who can see my information?
Only your attorney and their authorized staff can access your information. Your data is secure and confidential. External advisors (like CPAs) can only see information they've been specifically granted access to.

## Documents & Signatures

### Are electronic signatures legally valid?
Yes. Electronic signatures are legally binding under federal and state law (ESIGN Act and UETA). They are accepted by courts and government agencies.

### How do I sign a document?
1. Open the document (from email link or portal)
2. Review the content carefully
3. Click "Sign Document"
4. Draw your signature with mouse or touchscreen
5. Click "Confirm & Apply Signature"

### How do I know if I've signed everything?
Check **My Documents** - documents showing "Signed" or "Completed" status have been successfully signed.

### Can I get paper copies?
You can download PDFs of all your signed documents. The PDF includes your signature embedded in the document. If you need physical copies, contact your attorney's office.

### My signing link expired - what do I do?
Contact your attorney's office. They can send you a new signing link with an extended deadline.

### Can I change my signature?
Each time you sign a document, you draw a new signature. You can make your signature look however you want, but it should be consistent with how you normally sign.

## Journeys & Progress

### How long does the process take?
This depends on your specific matter and how quickly required documents are completed. Your attorney can provide an estimate.

### What if I'm stuck on a step?
Contact your attorney's office. They can help you understand what's needed.

### Can I work on multiple journeys?
Yes, if you're enrolled in multiple services, you can view and work on all of them from your dashboard.

### What's the difference between a Matter and a Journey?
A **Matter** is your overall engagement with the firm (like "Smith Family Trust 2024"). A **Journey** is the step-by-step process for completing a specific service within that matter.

## Uploads

### What file types can I upload?
You can upload PDF, JPG, PNG, and DOCX files up to 10MB each.

### How do I know if my upload was accepted?
After uploading, your attorney's office reviews the document. You'll receive a notification about the result: Approved, Requires Revision, or Rejected.

### My upload keeps failing - what should I do?
- Make sure the file is under 10MB
- Try a different file format (PDF usually works best)
- Check your internet connection
- Contact your attorney's office if problems persist

## Technical Issues

### The portal isn't loading
Try refreshing the page or clearing your browser cache. If problems persist, contact your attorney's office.

### I'm not receiving email notifications
Check your spam/junk folder. If emails still aren't arriving, update your email address in your Profile or contact your attorney's office.

### I can't draw my signature properly
Try using a mouse instead of a touchpad, or use a touchscreen device. You can also try a different browser.

## Getting Help

For any questions not answered here, please contact your attorney's office directly. They're here to help you through this process.
`
}

// Combined export
export const helpContent = {
  ...lawyerContent,
  ...clientContent
}
