# Document Templates & Generation

Create reusable document templates and generate personalized, formatted documents for clients with automatic data population.

## Overview

The document template system allows you to:

- ✅ Upload Word templates with variable placeholders
- ✅ Auto-extract client data (name, address, etc.)
- ✅ Generate browser preview + downloadable DOCX
- ✅ Update variables and regenerate instantly
- ✅ Track document status through lifecycle

## Creating a Template

### Step 1: Prepare Your Word Document

1. Open Microsoft Word
2. Create your document with standard formatting
3. Add variables using double curly braces syntax

::: v-pre
**Example:**
```
ENGAGEMENT AGREEMENT

Date: {{currentDate}}

This agreement is between {{clientName}} ("Client") and
{{lead_attorney}} ("Attorney") for legal services.

Fee: {{fee}}
Retainer: {{retainerFee}}

Client Signature: {{clientSignature}}
Date: {{signatureDate}}
```

**Variable Naming Rules:**
- Use double curly braces: `{{variableName}}`
- Keep names simple (no dots): `{{lead_attorney}}` ✅
- Avoid: `{{lead.attorney}}` ❌
- Use camelCase or snake_case
- No spaces or special characters
:::

### Step 2: Upload Template

1. Navigate to **Templates** in the sidebar
2. Click **"Upload Template"** (top right)
3. Select your `.docx` file
4. Optional: Enter custom name and description
5. Select category (or keep auto-detected)
6. Click **"Upload Template"**

![Templates List](/screenshots/templates-list.png)

The system will:
- Store your original DOCX with formatting preserved
- Extract all `{{variables}}` automatically
- Create an HTML preview
- Show you the list of variables found

### Step 3: Review Template

After upload, you'll see:
- Template name and category
- Number of variables found
- List of all variables
- Preview of the template

## Pre-Filled Variables

When generating documents, these variables are auto-filled:

::: v-pre
### Client Information
- `{{clientName}}` or `{{clientFullName}}` - Full name
- `{{clientFirstName}}` - First name
- `{{clientLastName}}` - Last name
- `{{clientAddress}}` - Street address
- `{{clientCity}}`, `{{clientState}}`, `{{clientZipCode}}`
- `{{clientEmail}}`, `{{clientPhone}}`

### Spouse Information (if applicable)
- `{{spouseName}}` - Spouse full name
- `{{spouseFirstName}}`, `{{spouseLastName}}`

### Matter/Service Information
- `{{serviceName}}` - Service catalog name
- `{{matterName}}` - Matter title

### Auto-Generated Dates
- `{{currentDate}}` - Today's date (formatted: "January 5, 2026")
- `{{today}}` - Same as currentDate
- `{{signatureDate}}` - Today's date

### Placeholders (for manual entry)
- `{{fee}}` - Default: "$[To be determined]"
- `{{retainerFee}}` - Default: "$[To be determined]"
- `{{hourlyRate}}` - Default: "$[To be determined]"
- `{{clientSignature}}` - Default: "[Signature Required]"
:::

## Generating Documents

### Method 1: From Templates Page

1. Go to **Templates** in sidebar
2. Find your template
3. Click **"Generate Document"**
4. Select client from dropdown
5. Optional: Link to a matter
6. Enter document title (or use default)
7. Click **"Generate Document"**

### Method 2: From Client Profile

1. Open client's profile
2. Go to **Documents** tab
3. Click **"Generate from Template"**
4. Select template
5. Template generates automatically

### Method 3: From Matter Detail

1. Open a matter
2. Go to **Documents** section
3. Click **"Generate Document"**
4. Select template
5. Document auto-links to matter

## Working with Generated Documents

### Document Detail Page

After generation, you'll see:

**Top Section:**
- Document title and description
- Status dropdown (change DRAFT → SENT → SIGNED → COMPLETED)
- Download DOCX button (when available)

**Document Information Card (Collapsible):**
- Created date
- Current status
- Sent/viewed/signed dates

**Fill Required Information Card:**
- Shows all template variables
- Pre-filled values displayed
- Edit any values as needed
- Click "Update Document" to save changes

**HTML Preview:**
- Browser view of the document
- Shows all filled values
- Updates when you save variables

### Updating Variables

1. Open the document detail page
2. Expand "Fill Required Information" card
3. Edit any variable values
4. Click **"Update Document"**
5. Both HTML preview and DOCX regenerate automatically

**What Gets Updated:**
- HTML preview (instant)
- DOCX file (regenerated with new values)
- Download always gives latest version

### Changing Document Status

Use the status dropdown in the top-right corner:

**DRAFT** → Document being prepared
**SENT** → Client notified, awaiting action
**VIEWED** → Client has opened it
**SIGNED** → Client signed electronically
**COMPLETED** → Process complete

## Downloading Documents

### DOCX Download

1. Open document detail page
2. Click **"Download DOCX"** button
3. File downloads as `document-title.docx`

The downloaded file:
- ✅ Preserves ALL Word formatting
- ✅ Contains filled-in values
- ✅ Ready for printing
- ✅ Ready for signing
- ✅ Ready for notarization

**Use Cases:**
- Print for physical signing
- Email to client
- Upload to document management system
- Prepare for notary

### HTML Preview

The in-browser preview is useful for:
- Quick review of content
- Checking variable values
- Sharing screen during client calls

**Note:** For official documents, always use the DOCX version which preserves formatting.

## Electronic Signatures (Coming Soon)

Future enhancement will allow clients to:
1. Open document in portal
2. Review content
3. Draw signature on canvas
4. Submit signature
5. Document status updates to SIGNED

## Document Workflow

### Typical Workflow

```
1. Upload Template (one-time setup)
   ↓
2. Generate Document for Client
   ↓
3. Fill/Update Variables as needed
   ↓
4. Review HTML Preview
   ↓
5. Change Status to SENT
   ↓
6. Download DOCX
   ↓
7. Send to Client (email, portal, etc.)
   ↓
8. Client Signs
   ↓
9. Update Status to SIGNED
   ↓
10. Change to COMPLETED
```

## Best Practices

### Template Design

✅ **DO:**
- Use clear, descriptive variable names
- Test templates with sample data before using
- Keep variable names simple (no dots)
- Include all formatting in the Word template
- Use consistent naming across templates

❌ **DON'T:**
- Mix different variable syntaxes
- Use complex nested structures
- Rely on macros or embedded objects
- Forget to test after upload

### Document Management

✅ **DO:**
- Review variables before sending to client
- Update status as document progresses
- Keep document titles descriptive
- Link documents to matters when applicable
- Download DOCX for final version

❌ **DON'T:**
- Send documents with "[To be determined]" values
- Forget to update status
- Edit HTML directly (changes won't save)
- Skip the preview step

## Common Variables by Document Type

::: v-pre
### Engagement Letters
```
{{clientName}}
{{matterName}}
{{serviceName}}
{{fee}}
{{retainerFee}}
{{lead_attorney}}
{{currentDate}}
{{clientSignature}}
```

### Trust Documents
```
{{clientName}}
{{trust_name}}
{{trust_effective_date}}
{{trustee_name}}
{{trustee_address}}
{{initial_contribution}}
{{primary_beneficiary}}
{{contingent_beneficiary}}
```

### Operating Agreements
```
{{entity_name}}
{{formation_date}}
{{registered_agent}}
{{principal_office}}
{{member1_name}}
{{member1_ownership}}
{{member2_name}}
{{member2_ownership}}
```
:::

## Troubleshooting

::: v-pre
### "No variables found" after upload
**Cause:** Didn't use `{{variableName}}` syntax
**Fix:** Add variables to your Word doc using double curly braces

### "Variables not showing in DOCX"
**Cause:** Used nested variable names like `{{person.name}}`
**Fix:** Use flat names like `{{person_name}}`
:::

### "Formatting lost in download"
**This shouldn't happen!** If you see formatting issues:
1. Check that the template DOCX has the formatting
2. Try re-uploading the template
3. Contact support if issue persists

### "Failed to process document"
**Possible causes:**
- Document is password-protected
- Document contains macros
- File is corrupted

**Fix:**
1. Open in Word and Save As → New file
2. Remove password protection
3. Remove macros
4. Try again

## Managing Templates

### Viewing Templates

1. Go to **Templates** in sidebar
2. Browse by category
3. Click any template to view:
   - Template content preview
   - List of variables
   - Usage statistics (future)

### Updating Templates

To update a template:
1. Make changes in Word
2. Upload new version (replaces old)
3. Existing documents using the template are unchanged
4. New documents use the updated template

### Deleting Templates

**Note:** Deleting a template doesn't delete documents created from it.

To delete:
1. Go to Templates page
2. Find the template
3. Click delete icon
4. Confirm deletion

## Tips for Success

### Organize Your Templates

- Use clear naming: "Engagement Letter - WYDAPT" not "Template 1"
- Add descriptions explaining when to use each template
- Use categories consistently
- Archive unused templates rather than deleting

### Test Before Production

1. Upload template
2. Generate test document with sample client
3. Fill all variables
4. Download DOCX and review
5. Check formatting, spelling, content
6. Only then use for real clients

### Keep Variables Consistent

::: v-pre
If you use `{{lead_attorney}}` in one template, use it in all templates. Consistency makes:
- Easier to remember variable names
- Faster document generation
- Fewer errors
:::

## Next Steps

- [Architecture Overview](/architecture/template-system) - Technical details
- [Client Documents](/help/client/documents) - Client's view
- [Managing Clients](/help/attorney/managing-clients) - Client management
