# E-Sign Up-Level Summary

Built 2026-04-24. Four improvements to ytp's e-signature system.

## Phase 0: DOCX-to-PDF Pipeline

- `server/utils/pdf-converter.ts` — Converts DOCX to PDF via shared Render service
- `server/api/documents/[id]/preview-pdf.get.ts` — Serves unsigned PDFs for preview
- Schema: `unsignedPdfBlobKey` column on documents table
- `generate-from-template.post.ts` now auto-converts DOCX to PDF at creation time

## Phase 1: Better PDF Output Quality

- `signed-pdf-generator.ts` — New `appendSignaturePages()` appends signatures to the DOCX-based PDF (preserving formatting) instead of generating from stripped HTML
- `sign.post.ts` branches on unsigned PDF existence

## Phase 2: Field Placement Editor + Multi-Signer (up to 6)

- Schema: `fieldPlacements`, `signerCount` on documents; `signerRole`, `fieldValues` on sessions
- `server/api/documents/[id]/placements.put.ts` — Save field placements
- `server/api/documents/[id]/signer-count.put.ts` — Update signer count
- `server/api/esign/document-pdf/[token].get.ts` — Token-gated unsigned PDF serving
- `app/composables/usePdfViewer.ts` — PDF rendering + scroll tracking (ported from ohlaw)
- `app/pages/documents/[id]/prepare.vue` — Full drag-drop field placement editor with multi-signer color coding
- `SigningCeremony.vue` — PDF viewer with interactive field overlays in review step
- `stampFieldsAndSign()` — Stamps field values at PDF coordinates + appends signature pages
- `signature-session.post.ts` updated for multi-signer (role-based sessions, override signer)

## Phase 3: Signing Ceremony UX Polish

- Scroll-to-bottom gate before "Proceed to Sign"
- Type-your-name signature (4th method with canvas preview + adoption checkbox)
- Responsive signature canvas sizing for mobile
- Skeleton loading state (replaces spinner)
- Error states with firm contact info
- Step indicator animations (transition-all duration-300, scale)
- Pending review auto-polling (15s interval via useIntervalFn)

## Phase 4: Field Mapping with System Fields

- `server/config/variable-sources.ts` — Registry of 10 mapping sources (person, spouse, matter, attorney, estate plan, trust, plan roles, service, system + legacy client)
- `server/utils/variable-resolver.ts` — Centralized resolver using `people` table (not deprecated `clientProfiles`)
- `server/api/admin/variable-sources.get.ts` — Source registry endpoint for UI
- `generate-from-template.post.ts` refactored to use `resolveVariableMappings()`
- `templates/index.vue` mapping UI now dynamically populated from the registry

## New Files

```
app/composables/usePdfViewer.ts
app/pages/documents/[id]/prepare.vue
server/api/admin/variable-sources.get.ts
server/api/documents/[id]/placements.put.ts
server/api/documents/[id]/preview-pdf.get.ts
server/api/documents/[id]/signer-count.put.ts
server/api/esign/document-pdf/[token].get.ts
server/config/variable-sources.ts
server/db/migrations/0045_add_unsigned_pdf.sql
server/db/migrations/0046_add_field_placements_multisigner.sql
server/utils/pdf-converter.ts
server/utils/variable-resolver.ts
```

## Environment Variables Needed

```
DOCX_CONVERTER_URL=<ohlaw's shared Render service URL>
DOCX_CONVERTER_KEY=<converter API key>
```

## Migrations to Run

Two new Drizzle migrations:
- `0045_add_unsigned_pdf` — Adds `unsigned_pdf_blob_key` to documents
- `0046_add_field_placements_multisigner` — Adds `field_placements`, `signer_count` to documents; `signer_role`, `field_values` to signature_sessions
