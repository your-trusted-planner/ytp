# WYDAPT Document Seeding - Production Guide

## Overview

The WYDAPT seeding system has been refactored to work in Cloudflare Workers production environment. It uses R2 for document storage and our custom Cloudflare-compatible DOCX parser.

## Two-Step Process

### Step 1: Upload Documents to R2

**Endpoint**: `POST /api/admin/upload-seed-documents`

**UI**: `/dashboard/admin/seed-wydapt` (Step 1 section)

**Process**:
1. Select a document group from dropdown (e.g., "General Documents")
2. Choose multiple DOCX files
3. Click "Upload Documents"
4. Documents are uploaded to R2 at: `seed-documents/{group}/{filename}.docx`

**Repeat** for each of the 7 document groups:
- General Documents
- Trust Documents
- Wyoming Private Family Trust Documents
- Non Charitable Specific Purpose Trust Documents
- Investment Decisions
- Contributions to Trust
- Distributions From Trust

### Step 2: Process Documents & Create Templates

**Endpoint**: `POST /api/admin/seed-wydapt`

**UI**: `/dashboard/admin/seed-wydapt` (Step 2 section)

**Process**:
1. After all documents are uploaded, click "Process & Import"
2. System reads all documents from R2
3. Each document is parsed using `parseDocx()` (fflate + fast-xml-parser)
4. Variables are extracted from document text
5. Document templates are created in database

**Creates**:
- 1 WYDAPT Matter ($18,500)
- 1 Journey Template with 7 steps
- Multiple Document Templates (one per uploaded DOCX)

## Architecture Changes

### What Changed from Local Version

**Before (Local Only)**:
```typescript
// ❌ Node.js filesystem APIs
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'

// ❌ Mammoth (requires Node.js)
import mammoth from 'mammoth'
const result = await mammoth.convertToHtml({ buffer })
```

**After (Production Ready)**:
```typescript
// ✅ Cloudflare R2
const blob = hubBlob()
const file = await blob.get(blobPath)
const buffer = await file.arrayBuffer()

// ✅ Custom Workers-compatible parser
const { text, html, paragraphs } = parseDocx(buffer)
```

## Files Created

1. **`server/api/admin/upload-seed-documents.post.ts`**
   - Handles bulk DOCX upload to R2
   - Validates file type and size
   - Organizes by document group

2. **`server/api/admin/seed-wydapt.post.ts`**
   - Reads documents from R2
   - Parses using Cloudflare-compatible parser
   - Creates matter, journey, and templates

3. **`app/pages/dashboard/admin/seed-wydapt.vue`**
   - Two-step UI for upload and seeding
   - Real-time progress feedback
   - Error handling and display

## R2 Structure

Documents are stored in R2 with this structure:

```
seed-documents/
├── General-Documents/
│   ├── document1.docx
│   └── document2.docx
├── Trust-Documents/
│   ├── trust1.docx
│   └── trust2.docx
├── Wyoming-Private-Family-Trust-Documents/
├── Non-Charitable-Specific-Purpose-Trust-Documents/
├── Investment-Decisions/
├── Contributions-to-Trust/
└── Distributions-From-Trust/
```

## Security

- ✅ Both endpoints require authentication
- ✅ Only ADMIN or LAWYER roles can access
- ✅ File type validation (must be .docx)
- ✅ File size validation (max 10MB per file)
- ✅ Path sanitization to prevent directory traversal

## Usage in Development

```bash
# 1. Start dev server
pnpm dev

# 2. Navigate to admin page
open http://localhost:3000/dashboard/admin/seed-wydapt

# 3. Upload documents for each group

# 4. Click "Process & Import" when all uploaded
```

## Usage in Production

```bash
# 1. Deploy to Cloudflare
npx nuxthub deploy

# 2. Navigate to admin page
open https://your-domain.com/dashboard/admin/seed-wydapt

# 3. Follow same upload and process steps
```

## Error Handling

The system handles several error scenarios:

- **Invalid file type**: Returns error for non-.docx files
- **File too large**: Rejects files > 10MB
- **DOCX parsing errors**: Logs error and continues with other files
- **R2 access errors**: Returns detailed error message
- **Database errors**: Rolls back and reports failure

## Monitoring

Check logs for processing status:

```typescript
// In Cloudflare dashboard
Logs → Worker Logs

// Look for:
"🚀 Starting WYDAPT Document Seeding from R2..."
"✅ Matter created: {id}"
"📄 Parsing: {filename}"
"✅ Template created: {id}"
```

## Troubleshooting

### No documents found
**Problem**: Step 2 finds no documents to process

**Solution**: Make sure documents are uploaded in Step 1. Check R2 bucket for `seed-documents/` folder.

### Parsing errors
**Problem**: "Failed to parse DOCX" errors

**Solution**:
- Verify files are valid DOCX (not .doc or corrupted)
- Check file structure with `unzip -l document.docx`
- Ensure `word/document.xml` exists

### Matter already exists
**Problem**: "WYDAPT matter already exists" error

**Solution**: Delete existing WYDAPT matter first or use different matter name.

## Comparison with Phase 1 DOCX Processing

| Feature | Phase 1 (Documents) | WYDAPT Seeding |
|---------|---------------------|----------------|
| **Purpose** | Client document processing | Template creation |
| **Upload** | Individual files | Bulk by group |
| **Processing** | Async queue | Synchronous |
| **Storage** | `documents/{userId}/{id}.docx` | `seed-documents/{group}/{filename}` |
| **Parser** | `parseDocx()` | `parseDocx()` (same!) |
| **Output** | `uploaded_documents` table | `document_templates` table |

Both systems use the same Cloudflare-compatible DOCX parser!

## Next Steps

After seeding completes:
1. Verify templates in database
2. Test template rendering with variables
3. Create client engagements using WYDAPT matter
4. Assign journey to clients

## Cost Impact

**R2 Storage**:
- ~28 documents × ~300KB each = ~8.4MB
- Well within Cloudflare free tier (10GB)

**Processing**:
- One-time operation during setup
- ~2-3 seconds per document = ~60-90 seconds total
- Minimal CPU/memory usage

Total additional cost: **$0** (within free tier)
