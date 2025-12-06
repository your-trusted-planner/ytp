// Help content for lawyers/administrators
const lawyerContent = {
  'getting-started': `# Getting Started

Welcome to Your Trusted Planner! This guide will help you get started with managing your estate planning practice.

## Logging In

1. Navigate to your firm's portal URL
2. Enter your email and password
3. You'll be directed to your dashboard

## The Lawyer Dashboard

When you log in, your dashboard shows:

- **Stats Overview**: Total clients, pending documents, active journeys, upcoming appointments
- **Recent Activity**: Latest actions across all clients
- **Quick Actions**: Add clients, create journeys, generate documents

## Navigation

The sidebar provides access to all major features:

| Menu Item | Purpose |
|-----------|---------|
| **Dashboard** | Overview and stats |
| **Clients** | View and manage all clients |
| **Matters** | Define your service offerings |
| **Journeys** | Create and manage workflow templates |
| **Documents** | View all generated documents |
| **Templates** | Manage document templates |
| **Schedule** | Calendar and appointments |
| **Profile** | Your account settings |

## Quick Tips

- Use the search function to quickly find clients
- Set up journey templates to streamline your workflow
- Check your dashboard daily for pending actions
`,

  'managing-clients': `# Managing Clients

Learn how to add, manage, and track your clients effectively.

## Adding a New Client

1. Go to **Clients** in the sidebar
2. Click **Add Client**
3. Enter:
   - First and last name
   - Email address
   - Phone number (optional)
   - Temporary password (client will use this for first login)
4. Click **Create**

The client will receive login credentials and can access their portal.

## Viewing Client Details

Click on any client to see their full profile:

- **Contact Information**: Name, email, phone, address
- **Family Information**: Spouse details, children information
- **Estate Planning Status**: Existing will/trust status
- **Business Information**: If applicable
- **Active Journeys**: Services they're enrolled in
- **Documents**: Documents assigned to them
- **Notes**: Internal notes and history

## Client Statuses

| Status | Meaning |
|--------|---------|
| **Prospect** | Initial inquiry, not yet engaged |
| **Pending Approval** | Account created, awaiting activation |
| **Active** | Full portal access |
| **Inactive** | Account disabled |

## Starting a Service for a Client

From the client detail page:

1. Click **Start New Journey**
2. Select the journey template (e.g., "Wyoming Asset Protection Trust")
3. Set priority level if needed
4. Click **Start Journey**

The client will now see this journey in their portal and can begin working through the steps.

## Best Practices

- Keep client notes up to date
- Set appropriate priority levels for journeys
- Follow up promptly on pending documents
- Use the activity feed to track engagement
`,

  'journeys-workflows': `# Journeys & Workflows

Journeys are the heart of service delivery. They break complex legal services into manageable steps that both attorneys and clients can track.

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

## Creating a Journey Template

1. Go to **Journeys** in the sidebar
2. Click **Create Journey**
3. Enter:
   - **Name**: e.g., "Wyoming Asset Protection Trust Journey"
   - **Description**: Overview of the workflow
   - **Associated Matter**: Link to the service offering
   - **Estimated Duration**: Total expected days
   - **Template**: Check this to make it reusable
4. Click **Create**

## Adding Steps to a Journey

1. Open your journey
2. Click **Add Step**
3. Configure the step:
   - **Name**: What this step accomplishes
   - **Type**: Milestone or Bridge
   - **Responsible Party**:
     - CLIENT: Client must complete
     - COUNCIL: Your staff completes
     - BOTH: Requires action from both parties
   - **Expected Duration**: Days for this step
   - **Help Content**: Instructions shown to the client
   - **Allow Multiple Iterations**: For Bridge steps
4. Click **Save**

## Reordering Steps

Drag and drop steps to change their order in the journey.

## Example: WYDAPT Journey

The pre-configured WYDAPT journey includes these steps:

| Order | Step | Type | Responsible |
|-------|------|------|-------------|
| 1 | Engagement & Initial Setup | Milestone | Both |
| 2 | Trust Formation - Review & Sign | Bridge | Both |
| 3 | Private Trust Company Setup | Milestone | Council |
| 4 | Special Purpose Trust (if applicable) | Milestone | Council |
| 5 | Investment Committee Formation | Milestone | Client |
| 6 | Asset Contribution Process | Bridge | Both |
| 7 | Distribution Management (Ongoing) | Bridge | Both |

## Monitoring Client Progress

From **Journeys**, you can see:

- All active client journeys
- Current step for each client
- Progress percentage
- Days in current step
- Priority level

Click into any journey to see detailed step-by-step status and take action.
`,

  'documents': `# Documents

Manage document templates, generate client documents, and track signatures.

## Document Templates

Templates are reusable document blueprints with variable placeholders that get filled with client-specific data.

### Managing Templates

1. Go to **Templates** in the sidebar
2. Browse templates by category
3. Click any template to preview its content and variables

Templates support variables like:
- \`{{client.firstName}}\` - Client's first name
- \`{{client.address}}\` - Client's address
- \`{{trust.name}}\` - Trust name
- Custom variables defined per template

## Generating Documents for Clients

1. Go to **Templates**
2. Find the template you need
3. Click **Generate Document**
4. Select the client
5. Enter a title and description
6. Click **Generate**

The document is created in **Draft** status and assigned to the client.

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

## Filling Document Variables

1. Open the document
2. Fill in any required fields that weren't auto-populated
3. Save changes
4. Send to client when ready

## Electronic Signatures

Clients can sign documents directly in the portal:

1. Client opens document
2. Reviews content
3. Draws signature on the signing pad
4. Confirms signature
5. Document status updates to **Signed**

## Client Document Uploads

Clients can upload supporting documents (tax returns, IDs, etc.):

1. Client uploads via their portal
2. Document appears for lawyer review
3. Lawyer reviews and sets status:
   - **Approved**: Document accepted
   - **Rejected**: Document not acceptable
   - **Requires Revision**: Client needs to resubmit
4. Client receives feedback and can upload revisions
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
- Configure integrations (LawPay, PandaDoc)

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
`
}

// Help content for clients
const clientContent = {
  'client-getting-started': `# Welcome to Your Trusted Planner

Welcome! Your Trusted Planner is your personal portal for managing your estate planning journey. This guide will help you get started.

## Logging In

1. Use the email and temporary password provided by your attorney
2. Navigate to the portal URL
3. Enter your credentials and log in

## Your Dashboard

When you log in, you'll see your personal dashboard with:

- **My Journeys**: Services you're enrolled in with progress indicators
- **My Documents**: Documents assigned to you
- **Upcoming Appointments**: Scheduled meetings
- **Quick Stats**: Documents pending, progress on current journey

## Navigation

The sidebar menu gives you quick access to:

| Menu Item | What You'll Find |
|-----------|-----------------|
| **Dashboard** | Overview of your account |
| **My Journeys** | Your service progress |
| **My Documents** | Documents to review and sign |
| **Appointments** | Scheduled meetings |
| **Profile** | Update your information |

## Next Steps

1. Review your active journeys
2. Complete any pending documents
3. Upload requested supporting documents
4. Check your appointments

If you have questions, contact your attorney's office.
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
| **Signed** | You've signed it |
| **Completed** | Fully processed |

## Reviewing a Document

1. Click on any document to open it
2. Read through the content carefully
3. If you have questions, contact your attorney

## Signing Documents

When a document requires your signature:

1. Open the document
2. Review the content
3. Click the **Sign** button
4. Draw your signature in the signing area
5. Confirm your signature

Your signature is legally binding, so make sure you've read and understand the document before signing.

## Downloading Documents

- Click the download icon on any completed document
- Documents are saved as PDF files
- Keep copies for your records
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
Go to **Profile** and click **Change Password**. Enter your current password and your new password.

### How do I update my contact information?
Go to **Profile** and update your details. Click **Save** when done.

### Who can see my information?
Only your attorney and their authorized staff can access your information. Your data is secure and confidential.

## Documents

### Are electronic signatures legally valid?
Yes. Electronic signatures are legally binding under federal and state law.

### How do I know if I've signed everything?
Check **My Documents** - documents showing "Signed" or "Completed" status have been successfully signed.

### Can I get paper copies?
You can download PDFs of all your documents. If you need physical copies, contact your attorney's office.

## Journeys

### How long does the process take?
This depends on your specific matter and how quickly required documents are completed. Your attorney can provide an estimate.

### What if I'm stuck on a step?
Contact your attorney's office. They can help you understand what's needed.

### Can I work on multiple journeys?
Yes, if you're enrolled in multiple services, you can view and work on all of them from your dashboard.

## Technical Issues

### The portal isn't loading
Try refreshing the page or clearing your browser cache. If problems persist, contact your attorney's office.

### I can't upload a file
Check that your file is under 10MB and in an accepted format (PDF, JPG, PNG, DOCX).

### I didn't receive a notification
Check your spam folder. If you're still not receiving emails, update your email in your profile or contact your attorney.

## Getting Help

For any questions not answered here, please contact your attorney's office directly. They're here to help you through this process.
`
}

// Combined export
export const helpContent = {
  ...lawyerContent,
  ...clientContent
}
