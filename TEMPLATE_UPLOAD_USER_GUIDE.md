# Template Upload - Quick User Guide

## 📤 How to Upload a New Template

### Step 1: Prepare Your Document

Create your document in Microsoft Word (.docx format) with personalization fields:

**Example:**
```
WYOMING ASSET PROTECTION TRUST AGREEMENT

This Trust Agreement is made on {{currentDate}} between {{clientName}}
("Trustor") and {{trusteeName}} ("Trustee").

Trust Name: [[TrustName]]
Initial Contribution: $<<ContributionAmount>>

Beneficiaries:
1. _____________________
2. _____________________

Signature: _____________________  Date: _____________________
```

### Step 2: Access Template Upload

1. Login to your dashboard
2. Navigate to **Templates** page
3. Click the **"Upload Template"** button (top right)

### Step 3: Upload Your Document

1. **Click "Choose File"** and select your .docx document
2. **Optional**: Enter a custom template name
3. **Optional**: Add a description
4. **Select Category** (or keep auto-detected)
5. Click **"Upload & Extract Variables"**

### Step 4: Review Results

The system will show you:
- ✅ Template name
- ✅ Category
- ✅ Number of variables found
- ✅ List of personalization fields
- ⚠️ If notarization is required

### Step 5: Done!

Your template is now ready to use. You can:
- Generate documents for clients
- Assign to journey steps
- View/edit anytime

---

## 🎨 How to Add Personalization Fields

### Method 1: Double Curly Braces (Recommended)
```
{{clientName}}
{{trustName}}
{{clientAddress}}
```

### Method 2: Double Brackets
```
[[Client Full Name]]
[[Trust Name]]
[[Trustee Address]]
```

### Method 3: Angle Brackets
```
<<ClientName>>
<<TrustAmount>>
<<SignatureDate>>
```

### Method 4: Blank Lines (Auto-detected)
```
Client Name: _____________________
Date: _____________________
```

---

## 📋 Common Variables You Can Use

### Client Information
- `{{clientName}}` - Full client name
- `{{clientFirstName}}` - First name only
- `{{clientLastName}}` - Last name only
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

### Dates
- `{{currentDate}}` - Today's date
- `{{signatureDate}}` - Signature date

### Signatures
- `{{clientSignature}}` - Client signature placeholder
- `{{witnessSignature}}` - Witness signature

### Custom Fields
You can use any variable name you want! The system will:
1. Extract all variables from your document
2. Show them to you for review
3. Prompt you to fill them when generating documents

---

## ✨ Tips for Best Results

### ✅ DO:
- Use descriptive variable names: `{{trusteName}}` not `{{name}}`
- Be consistent with formatting
- Test your template after upload
- Add clear descriptions to templates
- Use appropriate categories

### ❌ DON'T:
- Mix different variable formats in one document
- Use spaces in variable names: `{{client name}}` ❌
- Forget to save your Word document before uploading
- Upload PDFs (only DOCX supported)

---

## 🎯 Example Templates

### Simple Engagement Letter
```
ENGAGEMENT AGREEMENT

Date: {{currentDate}}

This agreement is between {{clientName}} ("Client") 
and Meuli Law ("Attorney") for legal services related to {{serviceName}}.

Fee: {{fee}}

Client Signature: {{clientSignature}}
Date: {{signatureDate}}
```

### Trust Agreement (Complex)
```
{{trustName}}
WYOMING DOMESTIC ASSET PROTECTION TRUST

Effective Date: {{trustEffectiveDate}}

TRUSTOR: {{trustorName}}
Address: {{trustorAddress}}

TRUSTEE: {{trusteeName}}
Address: {{trusteeAddress}}

BENEFICIARIES:
1. {{beneficiary1Name}}
2. {{beneficiary2Name}}

Initial Trust Property: {{initialContribution}}

ARTICLE I - TRUST CREATION
The Trustor hereby creates this irrevocable trust...

[Document continues with {{variables}} throughout]

SIGNATURES

Trustor: {{trustorSignature}}
Date: {{trustorSignatureDate}}

Trustee: {{trusteeSignature}}
Date: {{trusteeSignatureDate}}

Witness: {{witnessSignature}}
Date: {{witnessDate}}
```

---

## 🔍 Troubleshooting

### "Only DOCX files are supported"
**Solution:** Save your document as .docx (not .doc, .pdf, or .txt)

### "No variables found"
**Possible causes:**
- You didn't use any of the supported variable formats
- Variables are in headers/footers (not yet supported)
- Document is completely blank

**Solution:** Add variables using `{{variableName}}` format

### "Failed to process document"
**Possible causes:**
- Document is corrupted
- Document is password protected
- Document has complex embedded objects

**Solution:** 
1. Open document in Word
2. Save As → new file
3. Remove any password protection
4. Try uploading again

### Template uploaded but looks wrong
**Possible causes:**
- Complex formatting not fully preserved
- Tables or images may not render perfectly

**Solution:** The system extracts text content and converts to HTML. Some advanced Word formatting may be simplified.

---

## 🆘 Need Help?

- **View extracted variables**: Click on any template in the list to preview
- **Edit template**: Templates can be updated from the dashboard
- **Delete template**: Mark as inactive if no longer needed
- **Technical issues**: Contact support or check system logs

---

## 🎉 You're Ready!

Upload your first template and start generating personalized documents for your clients in seconds!

**Remember:** 
- The more descriptive your variable names, the easier it is to fill them later
- Review the extracted variables after upload
- Test with a sample client before using in production

Happy templating! 🚀


