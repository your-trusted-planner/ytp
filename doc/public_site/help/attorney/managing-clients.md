# Managing Clients & Matters

Learn how to add, manage, and track your clients and their engagements effectively.

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

![Clients List](/screenshots/clients-list.png)

## Viewing Client Details

Click on any client to see their full profile:

- **Contact Information**: Name, email, phone, address
- **Family Information**: Spouse details, children information
- **Estate Planning Status**: Existing will/trust status
- **Business Information**: If applicable
- **Active Journeys**: Services they're enrolled in
- **Documents**: Documents assigned to them
- **Notes**: Internal notes and history
- **Google Drive**: Sync status and folder link (if enabled)

![Client Detail](/screenshots/client-detail.png)

## Client Statuses

| Status | Meaning |
|--------|---------|
| **Prospect** | Initial inquiry, not yet engaged |
| **Pending Approval** | Account created, awaiting activation |
| **Active** | Full portal access |
| **Inactive** | Account disabled |

## Google Drive Status

If Google Drive integration is enabled, each client and matter detail page shows a **Google Drive** status section:

### Status Indicators

| Status | Meaning |
|--------|---------|
| **Synced** (green) | Folder exists and is accessible - click to open in Drive |
| **Not Synced** (gray) | No folder created yet |
| **Error** (red) | Sync failed - shows error message |

### Sync Actions

- **Sync Now / Verify Folder**: Creates a folder or verifies existing folder is accessible
- **Force New Folder**: Creates a new folder in the currently configured drive (use after changing drive settings)

::: tip
When creating a matter for a client without a Drive folder, the system automatically creates the client folder first, then creates the matter folder inside it.
:::

---

## Understanding Matters & Services

### What is a Matter?

A **matter** represents a client engagement - the overall business relationship and scope of work. Think of it like a statement of work (SOW) or consulting engagement.

**Key Points:**
- Each matter has an auto-generated number (e.g., "2024-001")
- Matters start in "Pending" status until the engagement letter is signed
- One matter can include multiple services
- The engagement letter date marks when the client formally engages

**Example:**
```
Matter: "Smith Family Trust 2024"
Number: 2024-001
Status: Pending → Open (when letter signed)
Services: WYDAPT, Annual Maintenance
```

### What are Services?

**Services** are the specific products/offerings engaged within a matter (e.g., WYDAPT formation, Annual Maintenance). Each service has a workflow (journey) that guides the client through completion.

![Service Catalog](/screenshots/service-catalog.png)

---

## Creating a New Matter

1. Go to **Matters** in the sidebar
2. Click **Add New Matter**
3. Fill in:
   - **Matter Title**: Descriptive title (e.g., "Smith Family Trust 2024")
   - **Client**: Select from dropdown
   - **Description**: Brief overview of the engagement
   - **Status**: Usually starts as "Pending"
   - **Engagement Letter Date**: Leave blank until letter is signed
   - **Services**: Check the services to include (optional, can add later)
4. Click **Create Matter**

![Matters List](/screenshots/matters-list.png)

**The system automatically:**
- Generates a unique matter number (YYYY-###)
- Creates service engagements for any selected services
- Sets up journeys for each engaged service
- Creates Google Drive folders (if enabled) - client folder first if needed, then matter folder with subfolders

![Matter Detail](/screenshots/matter-detail.png)

## Managing Matter Services

### Adding Services to an Existing Matter

From the matter detail page:
1. Click **Edit** on the matter
2. Scroll to "Associated Services"
3. Click **Add Service**
4. Select the service from the catalog
5. Click **Add**

### Service Statuses

| Status | Meaning |
|--------|---------|
| **Pending** | Service engaged but not yet started |
| **Active** | Work in progress |
| **Completed** | Service delivered |
| **Cancelled** | Service cancelled |

### Assigning Services

You can assign different attorneys to different services within the same matter. This allows for specialization and workload distribution.

---

## Starting a Client Journey

When you engage a service, the system automatically creates a journey (workflow) for that service:

1. Go to the client's profile or the matter page
2. The journey appears under "Active Journeys"
3. Click on the journey to see progress
4. Guide the client through each step

The client will see this journey in their portal and can work through the steps.

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

## Tracking & Payments

### Payment Tracking

Payments are tracked at the **matter level**, not per-service. This simplifies financial tracking when a matter includes multiple services.

**Payment Types:**
- Consultation Fee
- 50% Deposit
- Final 50% Payment
- Maintenance Fees
- Custom Payments

**To record a payment:** *(Feature coming soon)*
1. Go to the matter page
2. Click "Record Payment"
3. Enter amount, type, and method
4. Save

### Reporting

View all matters and their status from the Matters dashboard:
- Filter by status (Pending, Open, Closed)
- Search by matter number or client name
- See engagement dates and services

---

## Best Practices

### Matter Management

✓ **Use descriptive titles** - e.g., "Smith Family Trust 2024", not just "Smith"
✓ **Update engagement letter date** - Mark when client actually engages
✓ **Start with PENDING status** - Don't mark OPEN until letter is signed
✓ **Engage all services upfront** - Or add as scope expands

### Client Communication

✓ **Keep notes up to date** - Document all client interactions
✓ **Set appropriate priorities** - High priority for urgent matters
✓ **Follow up promptly** - Respond to pending documents quickly
✓ **Use the activity feed** - Track all client engagement

### Journey Management

✓ **Guide clients through steps** - Don't just set it and forget it
✓ **Review bridge steps carefully** - These require back-and-forth
✓ **Mark milestones complete** - Keep the journey moving
✓ **Pause when needed** - Better than leaving stale

---

## Common Questions

**Q: Can one matter have multiple services?**
A: Yes! For example, a client might engage both WYDAPT formation and Annual Maintenance in the same matter.

**Q: Why do matter numbers reset each year?**
A: Matter numbers follow the format YYYY-NNN (e.g., 2024-001). This makes it easy to track matters by year while keeping numbers manageable.

**Q: What's the difference between matter status and service status?**
A: Matter status is the overall engagement (Pending → Open → Closed). Service status tracks individual services within that matter (Pending → Active → Completed).

**Q: When should I update the engagement letter date?**
A: Update it when the client actually signs the engagement letter. This may be days or weeks after creating the matter.

**Q: Can I change which services are engaged?**
A: Yes, you can add services to a matter at any time. Removing services is more complex and should be done with caution.

**Q: Why does my client's Google Drive show "Not Synced" after I already synced it?**
A: If the Google Drive configuration was changed (different Shared Drive), folders in the old drive won't be accessible. Use "Force New Folder" to create a new folder in the currently configured drive.

**Q: What happens to files if I use "Force New Folder"?**
A: Files in the old folder remain there but are no longer linked. The new folder starts empty. This is useful when changing Shared Drives, but use with caution.

---

## Need More Help?

- See [Journeys & Workflows](/help/attorney/journeys-workflows) for journey management
- See [Documents](/help/attorney/documents) for document generation
- Contact support for specific questions
