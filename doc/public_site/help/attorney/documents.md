# Documents

Manage document templates, generate client documents, and track signatures.

## Document Templates

Templates are reusable document blueprints with variable placeholders that get filled with client-specific data.

### Managing Templates

1. Go to **Templates** in the sidebar
2. Browse templates by category
3. Click any template to preview its content and variables

Templates support variables like:
- `\{\{client.firstName\}\}` - Client's first name
- `\{\{client.address\}\}` - Client's address
- `\{\{trust.name\}\}` - Trust name
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
