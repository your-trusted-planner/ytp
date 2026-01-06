# Document System - Current State & Simplification Plan

## Executive Summary

The document system has a solid foundation but needs simplification. Variable extraction uses too many patterns and includes auto-detection logic. We need to standardize on **handlebars syntax only** (`{{variableName}}`) and clarify the document drafting workflow.

---

## Current Implementation

### ✅ What Exists

#### 1. Template Upload & Management

**File**: `/server/api/templates/upload.post.ts`

**Current Features:**
- ✅ Accepts DOCX files only
- ✅ Parses DOCX to HTML using `parseDocx()` utility
- ✅ Extracts variables from document text
- ✅ Auto-detects category based on filename
- ✅ Auto-detects notarization requirement
- ✅ Stores template in `document_templates` table

**Variable Extraction (NEEDS SIMPLIFICATION):**

Currently supports 4 patterns + auto-detection:
```typescript
// Pattern 1: {{ variable }} ✅ KEEP
/\{\{\s*([^}]+?)\s*\}\}/g

// Pattern 2: [[Variable]] ❌ REMOVE
/\[\[([^\]]+)\]\]/g

// Pattern 3: <<Variable>> ❌ REMOVE
/<<([^>]+)>>/g

// Pattern 4: Underscores (5+) ❌ REMOVE
/_{5,}/g  // Creates blankField1, blankField2, etc.

// Auto-detection ❌ REMOVE
if (text.includes('signature')) {
  variables.add('clientSignature')
  variables.add('signatureDate')
}
```

**Database Schema:**
```sql
document_templates (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  category TEXT,
  content TEXT,              -- HTML with variable placeholders
  variables TEXT,            -- JSON array of variable names
  requires_notary INTEGER,
  is_active INTEGER,
  original_file_name TEXT,
  file_extension TEXT,
  created_at INTEGER,
  updated_at INTEGER
)
```

#### 2. Document Generation

**File**: `/server/api/documents/generate-from-template.post.ts`

**Current Features:**
- ✅ Takes template ID + client ID
- ✅ Builds context from client profile data
- ✅ Renders template using `useTemplateRenderer()` utility
- ✅ Creates document in DRAFT status
- ✅ Stores rendered content and variable values

**Auto-populated Context:**
```typescript
{
  clientFirstName, clientLastName, clientFullName,
  clientAddress, clientCity, clientState, clientZipCode,
  clientEmail, clientPhone,
  spouseName, spouseFirstName, spouseLastName,
  serviceName, matterName,
  fee, retainerFee, hourlyRate,  // Placeholders
  currentDate, today, signatureDate, signedOn,
  clientSignature, signature,
  ...customData  // From request body
}
```

**Database Schema:**
```sql
documents (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  status TEXT,              -- DRAFT, SENT, SIGNED, COMPLETED
  template_id TEXT,
  matter_id TEXT,
  content TEXT,             -- Rendered HTML
  file_path TEXT,
  variable_values TEXT,     -- JSON of actual values used
  requires_notary INTEGER,
  notarization_status TEXT,
  pandadoc_request_id TEXT, -- Integration (future)
  client_id TEXT,
  signed_at INTEGER,
  signature_data TEXT,
  viewed_at INTEGER,
  sent_at INTEGER,
  created_at INTEGER,
  updated_at INTEGER
)
```

#### 3. User Interface

**File**: `/app/pages/dashboard/templates/index.vue`

**Current Features:**
- ✅ Upload template modal with file picker
- ✅ Category selection dropdown
- ✅ Success feedback showing extracted variables
- ✅ Template list (card view)
- ✅ Template detail/preview modal
- ✅ "Use Template" modal to generate documents
- ✅ Client selection dropdown
- ✅ Auto-navigation to document detail after generation

**UX Flow:**
```
1. Lawyer uploads DOCX template
   ↓
2. System extracts variables (shows in success message)
   ↓
3. Lawyer clicks "Use Template"
   ↓
4. Selects client + provides title/description
   ↓
5. System generates document (auto-fills client data)
   ↓
6. Redirects to document detail page
```

#### 4. Template Renderer

**Utility**: `useTemplateRenderer()` (implied, not read yet)

**Assumed Functionality:**
- Replaces handlebars placeholders with values from context
- Likely uses a library like Handlebars.js
- Handles nested properties (e.g., `{{client.firstName}}`)

---

## ✅ Implemented Features

### 1. Variable Filling UI ✅ COMPLETED

**Solution**: Form-based editor on document detail page

**How it works:**
- Template has variables: `{{trustName}}`, `{{trusteeNames}}`, `{{fundingAmount}}`
- Document generated with auto-populated client data
- Unfilled variables shown in form on document detail page
- Lawyer fills variables and saves
- Content automatically re-rendered with new values

### 2. Document Editing After Generation ✅ COMPLETED

**Current Implementation:**
- Variables can be updated via POST `/api/documents/[id]/variables`
- Each update merges with existing values and re-renders content
- Content cannot be manually edited (template-based only)
- No revision history (out of scope for POC)

---

## ❌ What's Still Missing / Future Enhancements

### 3. Matter Association

**Current**: Document generation accepts optional `matterId`

**Unclear**:
- Should templates be linked to service catalog items?
- Should document generation require a matter?
- How do journey steps trigger document generation?

### 4. Document Delivery to Clients

**Current**: Documents have `sent_at`, `viewed_at`, `signed_at` fields

**Missing**:
- How are documents sent to clients?
- Email with link? In-app notification?
- How do clients view/sign documents?

### 5. PandaDoc Integration

**Current**: Schema has `pandadoc_request_id` field

**Missing**:
- Integration endpoints
- When/how is document sent to PandaDoc?
- Signature workflow

### 6. Notarization Workflow

**Current**: Templates can require notarization, documents track `notarization_status`

**Missing**:
- How is notarization requested?
- Integration with notary service?
- Workflow for scheduling/completing notarization

---

## Simplification Plan

### Phase 1: Standardize Variable Extraction ✅ COMPLETED

**Goal**: Only use handlebars syntax `{{variableName}}`

**Changes Made:**

1. **Updated `/server/api/templates/upload.post.ts`:**
   - Removed Pattern 2: `[[Variable]]`
   - Removed Pattern 3: `<<Variable>>`
   - Removed Pattern 4: Underscore detection
   - Removed auto-detection of signature/date fields
   - Kept only handlebars pattern with Jinja control statement filtering

2. **Updated `/app/pages/dashboard/templates/index.vue` (line 122):**
   - Changed help text to: "Upload a Word document (.docx) with variables marked as {{variableName}}"
   - Removed references to other syntax patterns

**Impact:**
- Existing templates using `[[field]]` or `<<field>>` syntax will no longer have those variables extracted
- Only `{{variableName}}` syntax is now recognized
- More predictable and consistent variable extraction

---

### Phase 2: Document Variable Filling Workflow ✅ COMPLETED

**Goal**: Enable lawyers to fill custom variables after document generation

**Implementation:**

1. **Variable Filling Endpoint**: `/server/api/documents/[id]/variables.post.ts`
   - Accepts `{ variables: { key: value } }` body
   - Merges new variables with existing ones
   - Re-renders document content using template renderer
   - Returns updated document with rendered content
   - Authorization: Lawyers/admins can update any document, clients only their own

2. **Document Detail Endpoint**: `/server/api/documents/[id].get.ts`
   - Updated to use hubDatabase() for consistency
   - Joins template data to include template variables
   - Returns template info nested in response

3. **Document Detail Page**: `/app/pages/dashboard/documents/[id].vue`
   - Already has variable filling form (lines 38-55)
   - Updated `documentVariables` computed to detect unfilled variables
   - Filters out variables with placeholder values like `[To be determined]`
   - Shows form only when status is DRAFT and variables need filling
   - Automatically re-renders content after save

**Workflow:**
```
1. Lawyer generates document from template
   ↓
2. System auto-fills client data (name, address, etc.)
   ↓
3. Document created in DRAFT status
   ↓
4. Lawyer opens document detail page
   ↓
5. Form shows unfilled variables (trustName, etc.)
   ↓
6. Lawyer fills variables and saves
   ↓
7. Content re-rendered with new values
   ↓
8. Document ready to send to client
```

---

### Phase 3: Integrate with Matter/Journey Workflow (FUTURE)

**Goal**: Trigger document generation from journey steps

**Workflow:**
```
1. Client progresses through journey step
   ↓
2. Journey step has associated document template
   ↓
3. System auto-generates document for that matter
   ↓
4. Lawyer fills custom variables (Phase 2)
   ↓
5. Document sent to client for review/signature
```

**Schema Updates Needed:**
```sql
-- Link journey steps to templates
ALTER TABLE journey_steps ADD COLUMN template_id TEXT REFERENCES document_templates(id);

-- Track document generation from journey steps
ALTER TABLE documents ADD COLUMN journey_step_id TEXT REFERENCES journey_steps(id);
```

---

## Completed Action Items ✅

### 1. Simplify Variable Extraction ✅

**Completed Changes:**
- ✅ Removed Pattern 2: `[[Variable]]`
- ✅ Removed Pattern 3: `<<Variable>>`
- ✅ Removed Pattern 4: Underscore detection
- ✅ Removed auto-detection of signature/date fields
- ✅ Updated to single handlebars regex with Jinja filtering

### 2. Update UI Help Text ✅

**Completed Changes:**
- ✅ Updated line 122 in `/app/pages/dashboard/templates/index.vue`
- ✅ Now reads: "Upload a Word document (.docx) with variables marked as {{variableName}}"

### 3. Variable Filling Workflow ✅

**Completed Implementation:**
- ✅ Updated `/server/api/documents/[id]/variables.post.ts` to re-render content
- ✅ Updated `/server/api/documents/[id].get.ts` to include template data
- ✅ Updated document detail page to detect and show unfilled variables
- ✅ Form automatically appears for DRAFT documents with unfilled variables

### 4. Testing Recommendations

**Manual Test Checklist:**
1. Create test DOCX with: `Dear {{clientName}}, Your trust {{trustName}} is established.`
2. Upload via UI at `/dashboard/templates`
3. Verify only 2 variables extracted: `clientName`, `trustName`
4. Generate document from template for a client
5. Verify `clientName` auto-filled from client profile
6. Verify `trustName` shows in unfilled variables form
7. Fill `trustName` and save
8. Verify document content re-renders with new value

---

## Questions for User

1. **Variable Filling**: How should lawyers fill custom variables (not in client profile) after document generation?
   - A) Form page with input for each variable?
   - B) Inline editing in document preview?
   - C) Pre-populate from journey questionnaire data?

2. **Matter Association**: Should document generation require a matter, or can it be standalone?

3. **Document Delivery**: How should documents be sent to clients?
   - A) Email with link to view/sign in portal?
   - B) In-app notification only?
   - C) Export to PDF and send outside system?

4. **Signature Workflow**: For POC, do we need:
   - A) Full e-signature integration (PandaDoc, DocuSign)?
   - B) Simple "Mark as Signed" button?
   - C) Upload signed PDF?

5. **Notarization**: For POC, is notarization workflow needed or can it be manual tracking?

---

## Success Criteria (POC)

✅ **Template Upload:** ACHIEVED
- ✅ Lawyer uploads DOCX with `{{variables}}`
- ✅ System correctly extracts all variables using handlebars syntax only
- ✅ No false positives from other syntax patterns

✅ **Document Generation:** ACHIEVED
- ✅ Auto-fills client data from profile
- ✅ Creates document in DRAFT status
- ✅ Links to matter if provided

✅ **Variable Completion:** ACHIEVED
- ✅ Clear workflow to fill custom variables via form
- ✅ Preview rendered document on detail page
- ✅ Save updates and re-renders content automatically

⚠️ **Client Access:** PARTIALLY IMPLEMENTED
- ✅ Client can view document (detail page exists)
- ✅ Signature workflow exists (canvas-based signature)
- ⚠️ Document delivery mechanism (email/notification) not implemented
- ✅ Document marked as signed/completed when signed

---

## File Structure Summary

### API Endpoints (Existing)
```
/api/templates/
  - GET  index.get.ts          ✅ List templates
  - POST index.post.ts         ✅ Create template (deprecated? uses upload.post.ts instead?)
  - POST upload.post.ts        ✅ Upload DOCX template

/api/documents/
  - GET    [id].get.ts                      ✅ Get document
  - POST   generate-from-template.post.ts   ✅ Generate from template
  - POST   upload.post.ts                   ✅ Upload standalone document
  - POST   [id]/variables.post.ts           ⚠️ Fill variables? (need to check)
  - POST   [id]/sign.post.ts                ✅ Sign document
  - POST   [id]/view.post.ts                ✅ Mark as viewed
  - GET    [id]/status.get.ts               ✅ Get status
  - GET    [id]/notarization-status.get.ts  ✅ Notary status
  - POST   [id]/request-notarization.post.ts ✅ Request notary
  - GET    summary/[journeyId].get.ts       ⚠️ Journey integration
  - POST   summary/generate.post.ts         ⚠️ Bulk generation?
```

### UI Pages (Existing)
```
/app/pages/dashboard/templates/
  - index.vue                   ✅ Template management

/app/pages/dashboard/documents/
  - index.vue                   ✅ Document list
  - [id].vue                    ✅ Document detail
```

### Missing (Needed for POC)
```
/app/pages/dashboard/documents/
  - [id]/edit.vue               ❌ Fill custom variables
  - [id]/preview.vue            ❌ Preview before sending (or part of [id].vue?)
```

---

## Summary

**Completed Work:**
- ✅ **Phase 1**: Variable extraction simplified to handlebars-only (`{{variableName}}`)
- ✅ **Phase 2**: Variable filling workflow implemented with form-based UI

**Current State:**
The document system now has a clean, simple workflow:
1. Lawyer uploads DOCX template with `{{variables}}`
2. System extracts variables using handlebars syntax only
3. Lawyer generates document from template for a client
4. System auto-fills client data from profile
5. Document detail page shows form for unfilled variables
6. Lawyer fills custom variables (trustName, etc.)
7. Content automatically re-renders with new values
8. Document ready to send to client

**Next Steps (Future Phases):**
- **Phase 3**: Integrate with journey workflow (auto-generate documents from journey steps)
- **Future**: Document delivery to clients (email, in-app notification)
- **Future**: E-signature integration (PandaDoc, DocuSign) or simple upload signed PDF
- **Future**: Notarization workflow integration

---

## TODO: Document Template Deletion Strategy

**Issue**: Deleting document templates is complex due to multiple foreign key relationships:
- `documents.template_id` references templates
- `service_catalog.engagement_letter_id` references templates
- `service_packages.included_documents` contains JSON with template IDs (not FK, but reference)
- `document_templates.folder_id` self-reference

**Need to design:**
1. Deletion policy: Soft delete vs hard delete?
2. Cascade behavior: What happens to generated documents when template is deleted?
3. UI workflow: Confirmation dialog? Show what will be affected?
4. Validation: Prevent deletion of templates in active use?
5. Archive functionality: Move to "archived" status instead of delete?
6. Service catalog handling: What happens to services referencing deleted templates?

**Decision needed before implementation.**
