# Your Trusted Planner - Usage Guide

## For Attorneys & Law Firm Administrators

This guide explains how attorneys and their staff use Your Trusted Planner to deliver estate planning services to clients.

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Managing Clients](#managing-clients)
4. [Matters (Services)](#matters-services)
5. [Journeys & Workflows](#journeys--workflows)
6. [Documents](#documents)
7. [Appointments](#appointments)
8. [The Client Experience](#the-client-experience)
9. [Administration](#administration)

---

## Overview

Your Trusted Planner is a client portal designed for estate planning law firms. It provides:

- **Client Management**: Track clients, their information, and their progress
- **Journey Workflows**: Guide clients through structured service delivery
- **Document Generation**: Create legal documents from templates and collect signatures
- **Client Portal**: Give clients visibility into their service progress

### User Roles

| Role | Description |
|------|-------------|
| **Admin** | Full system access including configuration and data management |
| **Lawyer** | Attorneys and staff managing clients and delivering services |
| **Client** | Individuals receiving legal services |

---

## Getting Started

### Logging In

1. Navigate to your firm's portal URL
2. Enter your email and password
3. You'll be directed to your dashboard

### The Lawyer Dashboard

When you log in as a lawyer, your dashboard shows:

- **Stats Overview**: Total clients, pending documents, active journeys, upcoming appointments
- **Recent Activity**: Latest actions across all clients
- **Quick Actions**: Add clients, create journeys, generate documents

### Navigation

The sidebar provides access to:

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

---

## Managing Clients

### Adding a New Client

1. Go to **Clients** in the sidebar
2. Click **Add Client**
3. Enter:
   - First and last name
   - Email address
   - Phone number (optional)
   - Temporary password (client will use this for first login)
4. Click **Create**

The client will receive login credentials and can access their portal.

### Viewing Client Details

Click on any client to see their full profile:

- **Contact Information**: Name, email, phone, address
- **Family Information**: Spouse details, children information
- **Estate Planning Status**: Existing will/trust status
- **Business Information**: If applicable
- **Active Journeys**: Services they're enrolled in
- **Documents**: Documents assigned to them
- **Notes**: Internal notes and history

### Client Statuses

| Status | Meaning |
|--------|---------|
| **Prospect** | Initial inquiry, not yet engaged |
| **Pending Approval** | Account created, awaiting activation |
| **Active** | Full portal access |
| **Inactive** | Account disabled |

### Starting a Service for a Client

From the client detail page:

1. Click **Start New Journey**
2. Select the journey template (e.g., "Wyoming Asset Protection Trust")
3. Set priority level if needed
4. Click **Start Journey**

The client will now see this journey in their portal and can begin working through the steps.

---

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

---

## Journeys & Workflows

Journeys are the heart of service delivery. They break complex legal services into manageable steps that both attorneys and clients can track.

### Understanding Journey Steps

Each journey contains ordered steps. Steps come in two types:

#### Milestone Steps

- Discrete, one-time completion points
- Shows a checkmark when completed
- Example: "Initial Consultation Complete" or "Documents Signed"

#### Bridge Steps

- Iterative revision/feedback loops
- Allows multiple rounds of back-and-forth
- Example: "Trust Document Review" where client and attorney may go through several revisions
- Tracks iteration count and approval status from both parties

### Creating a Journey Template

1. Go to **Journeys** in the sidebar
2. Click **Create Journey**
3. Enter:
   - **Name**: e.g., "Wyoming Asset Protection Trust Journey"
   - **Description**: Overview of the workflow
   - **Associated Matter**: Link to the service offering
   - **Estimated Duration**: Total expected days
   - **Template**: Check this to make it reusable
4. Click **Create**

### Adding Steps to a Journey

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

### Reordering Steps

Drag and drop steps to change their order in the journey.

### Example: WYDAPT Journey

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

### Monitoring Client Progress

From **Journeys**, you can see:

- All active client journeys
- Current step for each client
- Progress percentage
- Days in current step
- Priority level

Click into any journey to see detailed step-by-step status and take action.

---

## Documents

### Document Templates

Templates are reusable document blueprints with variable placeholders that get filled with client-specific data.

#### Managing Templates

1. Go to **Templates** in the sidebar
2. Browse templates by category
3. Click any template to preview its content and variables

Templates support variables like:
- `{{client.firstName}}` - Client's first name
- `{{client.address}}` - Client's address
- `{{trust.name}}` - Trust name
- Custom variables defined per template

### Generating Documents for Clients

1. Go to **Templates**
2. Find the template you need
3. Click **Generate Document**
4. Select the client
5. Enter a title and description
6. Click **Generate**

The document is created in **Draft** status and assigned to the client.

### Document Workflow

Documents progress through these statuses:

```
DRAFT → SENT → VIEWED → SIGNED → COMPLETED
```

| Status | Meaning |
|--------|---------|
| **Draft** | Created, not yet sent to client |
| **Sent** | Client notified, awaiting their action |
| **Viewed** | Client has opened the document |
| **Signed** | Client has signed electronically |
| **Completed** | Process complete, filed |

### Filling Document Variables

1. Open the document
2. Fill in any required fields that weren't auto-populated
3. Save changes
4. Send to client when ready

### Electronic Signatures

Clients can sign documents directly in the portal:

1. Client opens document
2. Reviews content
3. Draws signature on the signing pad
4. Confirms signature
5. Document status updates to **Signed**

### Notarization

Documents requiring notarization are flagged automatically. You can:

1. Request notarization through the document interface
2. Track notarization status: Pending → Scheduled → Completed
3. Integration with PandaDoc Notary for remote notarization

### Client Document Uploads

Clients can upload supporting documents (tax returns, IDs, etc.):

1. Client uploads via their portal
2. Document appears for lawyer review
3. Lawyer reviews and sets status:
   - **Approved**: Document accepted
   - **Rejected**: Document not acceptable
   - **Requires Revision**: Client needs to resubmit
4. Client receives feedback and can upload revisions

---

## Appointments

### Scheduling Appointments

1. Go to **Schedule** in the sidebar
2. Click on a date/time
3. Enter:
   - Title
   - Description
   - Client (select from list)
   - Location (or video call link)
   - Start and end time
4. Click **Save**

### Appointment Statuses

| Status | Meaning |
|--------|---------|
| **Pending** | Scheduled, awaiting confirmation |
| **Confirmed** | Client confirmed attendance |
| **Completed** | Meeting finished |
| **Cancelled** | Appointment cancelled |

Clients see their appointments in their portal dashboard.

---

## The Client Experience

Understanding what your clients see helps you guide them effectively.

### Client Dashboard

When clients log in, they see:

- **My Journeys**: Services they're enrolled in with progress indicators
- **My Documents**: Documents assigned to them
- **Upcoming Appointments**: Scheduled meetings
- **Quick Stats**: Documents pending, progress on current journey

### Viewing Journey Progress

Clients click into **My Journeys** to see:

- Overall progress percentage
- Visual step-by-step progress indicator
- Current step highlighted
- Help content explaining what they need to do
- Completed steps with checkmarks
- For Bridge steps: Revision status and iteration count

### Working on Steps

For steps where the client has responsibility:

1. Client reads the help content
2. Completes any required actions (upload documents, fill forms, sign)
3. System tracks completion
4. Journey advances to next step (or awaits council approval on Bridge steps)

### Document Actions

Clients can:

1. **View documents** assigned to them
2. **Fill in required information** (forms with input fields)
3. **Sign documents** using digital signature
4. **Upload supporting documents** (tax returns, IDs, etc.)
5. **Download completed documents** for their records

---

## Administration

### WYDAPT Document Seeding

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

### System Configuration

Administrators can:

- Manage user accounts and roles
- Create and modify matters
- Set up journey templates
- Upload document templates
- Configure integrations (LawPay, PandaDoc)

---

## Tips for Success

### For New Client Onboarding

1. Create client account with temporary password
2. Send welcome email with login instructions
3. Start appropriate journey for their service
4. First step should be client intake/questionnaire
5. Monitor progress and follow up as needed

### For Document Management

1. Use descriptive names for generated documents
2. Include client name in document titles
3. Review documents before sending to clients
4. Set reasonable deadlines for client review
5. Use Bridge steps for documents requiring back-and-forth

### For Journey Design

1. Break complex services into clear steps
2. Use Milestone steps for discrete completions
3. Use Bridge steps when revision cycles are expected
4. Provide clear help content for each step
5. Set realistic duration estimates
6. Assign responsibility clearly (Client, Council, or Both)

---

## Glossary

| Term | Definition |
|------|------------|
| **Journey** | A structured workflow guiding service delivery |
| **Matter** | A service offering (e.g., trust formation) |
| **Milestone** | A step that's completed once |
| **Bridge** | A step allowing iterative revisions |
| **Council** | Your firm's staff/attorneys |
| **Snapshot** | A PDF compilation of journey progress |
| **WYDAPT** | Wyoming Asset Protection Trust |

---

## Getting Help

For technical support or questions:

- Contact your system administrator
- Review training materials
- Check the FAQ section in the portal

---

*This documentation was generated from analysis of the Your Trusted Planner application codebase.*
