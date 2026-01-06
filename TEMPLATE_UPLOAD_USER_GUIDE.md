# Document Template System - User Guide

## 📤 How to Upload a New Template

### Step 1: Prepare Your Document

Create your document in Microsoft Word (.docx format) with variable placeholders using `{{variableName}}` syntax:

**Example:**
```
ENGAGEMENT AGREEMENT

Date: {{currentDate}}

This agreement is between {{clientName}} ("Client") and
{{lead_attorney}} ("Attorney") for legal services.

Matter: {{matterName}}
Fee: {{fee}}

Client Signature: {{clientSignature}}
Date: {{signatureDate}}
```

**Important:**
- Use **double curly braces** `{{variableName}}` for all variables
- Variable names should be simple (no dots): `{{lead_attorney}}` not `{{lead_attorney.full_name}}`
- Use camelCase or snake_case for multi-word names

### Step 2: Access Template Upload

1. Login to your dashboard
2. Navigate to **Templates** page
3. Click the **"Upload Template"** button (top right)

### Step 3: Upload Your Document

1. **Click "Choose File"** and select your .docx document
2. **Optional**: Enter a custom template name
3. **Optional**: Add a description
4. **Select Category** (or keep auto-detected)
5. Click **"Upload Template"**

### Step 4: Review Results

The system will:
- ✅ Store your original DOCX template with formatting preserved
- ✅ Extract all `{{variables}}` automatically
- ✅ Create an HTML preview version
- ✅ Show you the list of variables found

### Step 5: Done!

Your template is now ready to use for generating personalized documents.

---

## 📝 How to Generate Documents from Templates

### Step 1: Generate Document

1. Navigate to **Documents** page
2. Click **"Generate from Template"**
3. Select a template from the dropdown
4. Choose a client
5. Optional: Select a related matter
6. Click **"Generate Document"**

### Step 2: Fill in Variables

After generation, the document detail page shows:
- **HTML preview** of the document
- **Fill Required Information** form with all template variables
- Pre-filled values (client name, address, dates, etc.)

Fill in or update any variables and click **"Update Document"**

### Step 3: Download

- **HTML Preview**: View the document in your browser with all values filled
- **Download DOCX**: Get a fully-formatted Word document ready for printing, signing, or notarization

---

## 🎨 Variable Syntax

### ✅ Supported Format

**Only `{{variableName}}` is supported:**

```
{{clientName}}
{{lead_attorney}}
{{fee}}
{{currentDate}}
```

### ❌ NOT Supported

- ~~`[[variableName]]`~~ Double brackets
- ~~`<<variableName>>`~~ Angle brackets
- ~~Blank lines `_____`~~ Auto-detection
- ~~`{{person.name}}`~~ Nested/dotted names

### Variable Naming Rules

✅ **DO:**
- Use descriptive names: `{{trustee_name}}` or `{{trusteeName}}`
- Keep names simple and flat
- Use camelCase or snake_case
- Be consistent

❌ **DON'T:**
- Use spaces: `{{client name}}` ❌
- Use dots: `{{client.name}}` ❌
- Use special characters: `{{client$name}}` ❌
- Mix naming styles in one document

---

## 📋 Pre-Filled Variables

When generating a document, these variables are automatically filled:

### Client Information
- `{{clientFirstName}}` - Client first name
- `{{clientLastName}}` - Client last name
- `{{clientFullName}}` - Full name
- `{{clientName}}` - Alias for full name
- `{{clientAddress}}` - Street address
- `{{clientCity}}` - City
- `{{clientState}}` - State
- `{{clientZipCode}}` - ZIP code
- `{{clientEmail}}` - Email address
- `{{clientPhone}}` - Phone number

### Spouse Information
- `{{spouseName}}` - Spouse full name
- `{{spouseFirstName}}` - Spouse first name
- `{{spouseLastName}}` - Spouse last name

### Matter/Service Information
- `{{serviceName}}` - Service catalog name
- `{{matterName}}` - Matter title

### Dates (Auto-generated)
- `{{currentDate}}` - Today's date (formatted: "January 5, 2026")
- `{{today}}` - Same as currentDate
- `{{signatureDate}}` - Today's date
- `{{signedOn}}` - Today's date

### Placeholders (For Manual Entry)
- `{{fee}}` - Default: "$[To be determined]"
- `{{retainerFee}}` - Default: "$[To be determined]"
- `{{hourlyRate}}` - Default: "$[To be determined]"
- `{{clientSignature}}` - Default: "[Signature Required]"
- `{{signature}}` - Default: "[Signature Required]"

### Custom Variables

Any variables in your template that aren't pre-filled will appear in the **Fill Required Information** form for manual entry.

---

## 🔄 Document Workflow

### Full Document Lifecycle:

1. **Upload Template** → DOCX with `{{variables}}` stored in blob storage
2. **Generate Document** → Creates initial version with pre-filled values
3. **Fill Variables** → Update any values through the form
4. **Preview** → See HTML version in browser
5. **Download DOCX** → Get formatted Word document
6. **Update Status** → Change from DRAFT → SENT → SIGNED → COMPLETED
7. **Client Signing** → Digital signature with canvas (if enabled)

### Real-Time Updates

When you update variables:
- **HTML preview** regenerates instantly
- **DOCX file** regenerates with new values
- **Download button** always provides the latest version
- No need to re-generate from scratch

---

## ✨ Tips for Best Results

### Template Design

✅ **DO:**
- Use clear, descriptive variable names
- Test your template with sample data
- Keep variable names simple (no dots)
- Use consistent naming throughout
- Include all formatting in the DOCX template

❌ **DON'T:**
- Mix different variable syntaxes
- Use complex nested structures
- Put variables in headers/footers (limited support)
- Rely on complex Word features (macros, embedded objects)

### Document Generation

✅ **DO:**
- Review the HTML preview before downloading
- Update variables as needed using the form
- Change document status to track progress
- Download DOCX for final version

❌ **DON'T:**
- Edit the HTML directly (changes won't save)
- Forget to fill required variables
- Skip the preview step

---

## 🎯 Example Templates

### Simple Engagement Letter

```
ENGAGEMENT AGREEMENT

Date: {{currentDate}}

This agreement is between {{clientName}} ("Client")
and {{lead_attorney}} ("Attorney") for legal services related to {{matterName}}.

Scope of Services: {{serviceName}}
Fee: {{fee}}
Retainer: {{retainerFee}}

Client Signature: {{clientSignature}}
Date: {{signatureDate}}

Attorney Signature: {{attorney_signature}}
Date: {{signatureDate}}
```

### Trust Agreement

```
{{trust_name}}
WYOMING DOMESTIC ASSET PROTECTION TRUST

Effective Date: {{trust_effective_date}}

TRUSTOR: {{clientName}}
Address: {{clientAddress}}, {{clientCity}}, {{clientState}} {{clientZipCode}}

TRUSTEE: {{trustee_name}}
Address: {{trustee_address}}

BENEFICIARIES:
Primary: {{primary_beneficiary}}
Contingent: {{contingent_beneficiary}}

Initial Contribution: {{initial_contribution}}

ARTICLE I - TRUST CREATION
The Trustor hereby creates this irrevocable trust on {{currentDate}}...

[Document continues with additional articles]

SIGNATURES

Trustor: {{clientSignature}}
Date: {{signatureDate}}

Trustee: {{trustee_signature}}
Date: {{signatureDate}}
```

---

## 🔧 Technical Details

### How It Works

**Template Upload:**
1. Upload DOCX file → Stored in R2 blob storage
2. Parse DOCX → Extract `{{variables}}` using docxtemplater
3. Generate HTML preview → Convert to HTML for browser display
4. Store metadata → Template name, category, variables list

**Document Generation:**
1. Load original DOCX template from storage
2. Build context with pre-filled variables (client data, dates, etc.)
3. Render HTML → Use Handlebars.js for browser preview
4. Render DOCX → Use docxtemplater for downloadable Word file
5. Save both versions → HTML in database, DOCX in blob storage

**Variable Updates:**
1. User fills form → Submit variable values
2. Re-render HTML → Update browser preview
3. Re-render DOCX → Regenerate Word file with new values
4. Both versions stay in sync

### Technologies Used

- **Handlebars.js** - HTML template rendering
- **docxtemplater** - DOCX generation with preserved formatting
- **NuxtHub Blob** - R2 storage for DOCX files
- **Cloudflare D1** - Metadata and HTML content storage

---

## 🔍 Troubleshooting

### "Only DOCX files are supported"
**Solution:** Save your document as .docx (not .doc, .pdf, or .txt)

### "No variables found"
**Possible causes:**
- You didn't use `{{variableName}}` syntax
- Variables are in unsupported locations (headers, footers, text boxes)

**Solution:**
- Add variables using `{{variableName}}` format in the main document body
- Avoid placing variables in headers/footers

### "Variables not showing in downloaded DOCX"
**Possible causes:**
- Used nested variable names with dots: `{{person.name}}`
- Variable name mismatch between template and data

**Solution:**
- Use simple, flat variable names: `{{person_name}}`
- Check spelling and capitalization match exactly

### "Failed to process document"
**Possible causes:**
- Document is corrupted or password-protected
- Document contains unsupported features (macros, ActiveX controls)

**Solution:**
1. Open in Word and "Save As" → New file
2. Remove password protection
3. Remove macros and embedded objects
4. Try uploading again

### "Formatting lost in HTML preview"
**This is expected:** The HTML preview is a simplified version. Complex Word formatting (custom fonts, advanced layouts) may not render perfectly.

**Solution:** Always download the DOCX for the final formatted version. The DOCX preserves all original formatting.

---

## 🆘 Need Help?

- **View variables**: Click on any template to see extracted variables
- **Edit template**: Re-upload to replace existing template
- **Delete template**: Remove from templates list (documents using it remain)
- **Document status**: Use dropdown to change status (DRAFT → SENT → SIGNED → COMPLETED)

---

## 🎉 You're Ready!

The document template system provides:
- ✅ Easy template creation with Word
- ✅ Automatic variable extraction
- ✅ Browser preview with HTML
- ✅ Professional DOCX output with formatting preserved
- ✅ Real-time variable updates
- ✅ Document status tracking

**Remember:**
- Use `{{variableName}}` syntax only
- Keep variable names simple (no dots)
- Test with sample data first
- Download DOCX for final version

Happy templating! 🚀
