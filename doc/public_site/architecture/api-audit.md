# API Endpoint Audit Report

**Date:** December 4, 2024
**Total Endpoints Defined:** 82
**Total Frontend API Calls:** 24 unique paths

---

## Executive Summary

This audit identifies which API endpoints are actively used by the frontend vs. potentially orphaned code. Several endpoints exist from Phase 1 development that may no longer be needed.

---

## ✅ ACTIVE ENDPOINTS (Used by Frontend)

These endpoints are called from the frontend and should be kept:

### Authentication & Session
- `POST /api/auth/login` - Login endpoint
- `POST /api/auth/logout` - Logout endpoint
- `GET /api/auth/session` - Check session (likely used by middleware)

### Dashboard
- `GET /api/dashboard/stats` - Lawyer dashboard statistics
- `GET /api/dashboard/activity` - Activity feed

### Client Portal
- `GET /api/client/stats` - Client dashboard stats
- `GET /api/client/documents` - Client's documents list
- `GET /api/client/appointments` - Client's appointments

### Matters & Journeys
- `GET /api/matters` - List all matters
- `POST /api/matters` - Create new matter
- `GET /api/journeys` - List all journeys
- `POST /api/journeys` - Create new journey
- `POST /api/journey-steps` - Create journey step
- `POST /api/journey-steps/reorder` - Reorder steps
- `POST /api/client-journeys` - Start client on journey

### Documents
- `GET /api/templates` - List document templates
- `POST /api/documents/generate-from-template` - Generate document from template
- `POST /api/documents` - Create document (from JourneyDocuments component)

### Document Uploads (Client Files)
- `POST /api/document-uploads` - Client uploads their documents
- `GET /api/document-uploads/client-journey/:id` - Get uploads for journey (likely used)

### Clients
- `GET /api/clients` - List all clients
- `POST /api/clients` - Create new client

### Appointments
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Create appointment (likely used)

### Admin Tools
- `POST /api/admin/upload-seed-documents` - WYDAPT bulk upload to R2
- `POST /api/admin/seed-wydapt` - Process WYDAPT templates
- `POST /api/admin/cleanup-wydapt` - Clean up partial seeding

### Profile & Settings
- `PUT /api/profile` - Update user profile
- `POST /api/settings/password` - Change password

---

## ⚠️ ORPHANED ENDPOINTS (Not Used by Frontend)

These endpoints exist but aren't called from the UI. They may be:
- Legacy code from Phase 1
- Server-side only (webhooks, background jobs)
- Planned future features
- Dead code that can be removed

### Potentially Dead Code

#### Documents - Legacy Phase 1
- ❌ `POST /api/documents/upload` - **Legacy DOCX parsing with queue** (replaced by `/api/document-uploads`)
  - **Status**: Orphaned
  - **Queue Binding**: `DOCUMENT_QUEUE` (needs update or removal)
  - **Recommendation**: Delete or repurpose for admin template uploads

#### Document Processing (Unused)
- ❌ `GET /api/documents/:id/notarization-status` - No notarization UI
- ❌ `POST /api/documents/:id/request-notarization` - No notarization UI
- ❌ `POST /api/documents/:id/sign` - Signing happens via PandaDoc
- ❌ `POST /api/documents/:id/variables` - Not used
- ❌ `POST /api/documents/:id/view` - Not used
- ❌ `GET /api/documents/:id/status` - Not used

### Probably Used (Dynamic Calls or Middleware)

#### Authentication
- ✓ `POST /api/auth/register` - Registration (may not have UI yet)
- ✓ `GET /api/auth/session` - Likely used by auth middleware

#### Client Details (Dynamic Routes)
- ✓ `GET /api/clients/:id` - Client detail page (dynamic)
- ✓ `GET /api/clients/:id/documents` - Client documents tab
- ✓ `GET /api/clients/:id/notes` - Client notes
- ✓ `POST /api/clients/:id/notes` - Add note

#### Journey Management (Dynamic Routes)
- ✓ `GET /api/journeys/:id` - Journey detail page
- ✓ `GET /api/journeys/:id/clients` - Clients on journey
- ✓ `PUT /api/journeys/:id` - Update journey
- ✓ `DELETE /api/journeys/:id` - Delete journey
- ✓ `POST /api/journeys/generate-step-documents` - Generate docs for step

#### Journey Steps (Dynamic Routes)
- ✓ `PUT /api/journey-steps/:id` - Update step
- ✓ `DELETE /api/journey-steps/:id` - Delete step

#### Client Journey Progress (Dynamic Routes)
- ✓ `GET /api/client-journeys/:id/progress` - Journey progress
- ✓ `POST /api/client-journeys/:id/advance` - Advance to next step
- ✓ `POST /api/client-journeys/:id/move-to-step` - Jump to specific step
- ✓ `POST /api/client-journeys/:id/send-reminder` - Send reminder
- ✓ `GET /api/client-journeys/client/:clientId` - Client's journeys

#### Action Items (Dynamic Routes)
- ✓ `POST /api/action-items/:id/complete` - Mark action complete
- ✓ `POST /api/action-items` - Create action item
- ✓ `GET /api/action-items/client-journey/:clientJourneyId` - Journey actions

#### Document Uploads (Dynamic Routes)
- ✓ `GET /api/document-uploads/:id/download` - Download uploaded file
- ✓ `POST /api/document-uploads/:id/review` - Lawyer reviews upload

#### Snapshots (Dynamic Routes)
- ✓ `POST /api/snapshots` - Create snapshot
- ✓ `GET /api/snapshots/client-journey/:clientJourneyId` - Get snapshots
- ✓ `POST /api/snapshots/:id/approve` - Approve snapshot
- ✓ `POST /api/snapshots/:id/request-revision` - Request revision
- ✓ `POST /api/snapshots/:id/send` - Send snapshot

#### Bridge Conversations (Dynamic Routes)
- ✓ `GET /api/bridge-conversations/:stepProgressId` - Get conversation
- ✓ `POST /api/bridge-conversations` - Create conversation

#### Matters (Dynamic Routes)
- ✓ `PUT /api/matters/:id` - Update matter

#### Documents (Dynamic Routes)
- ✓ `GET /api/documents/:id` - Get document details

### Webhooks & External Integrations
- ✓ `POST /api/webhooks/pandadoc` - PandaDoc webhook (external)
- ✓ `GET /api/auth/lawpay/authorize` - LawPay OAuth
- ✓ `GET /api/auth/lawpay/callback` - LawPay callback

### Notarization (Planned Feature)
- 🔮 `POST /api/notarization/create` - Future feature
- 🔮 `GET /api/notarization/status/:id` - Future feature

### Development & Testing
- 🔧 `POST /api/_dev/seed` - Seeding endpoint
- 🔧 `GET /api/_dev/db-status` - DB status check
- 🔧 `GET /api/_dev/check-user` - User check
- 🔧 `POST /api/_dev/test-hash` - Test hashing
- 🔧 `GET /api/test/db-check` - DB check
- 🔧 `POST /api/test/seed` - Test seeding
- 🔧 `POST /api/seed-remote` - Remote seeding

### AI Features (Planned)
- 🔮 `POST /api/ai/ask` - AI chat (not implemented in UI yet)

### FAQ System
- 🔮 `GET /api/faq` - FAQ list
- 🔮 `POST /api/faq` - Create FAQ

### Setup
- 🔧 `POST /api/setup/init` - Initial setup

### Utility
- ✓ `ALL /api/ping` - Health check

---

## 📊 Statistics

| Category | Count |
|----------|-------|
| **Total Endpoints** | 82 |
| **Actively Used** | ~50-55 (including dynamic routes) |
| **Definitely Orphaned** | 8 |
| **Development/Test Only** | 7 |
| **Future Features** | 5 |
| **Webhooks/External** | 3 |

---

## 🎯 Recommendations

### High Priority - Delete Dead Code
1. **Delete** `POST /api/documents/upload` - Replaced by `/api/document-uploads`
2. **Delete** unused document endpoints:
   - `/api/documents/:id/notarization-status`
   - `/api/documents/:id/request-notarization`
   - `/api/documents/:id/sign`
   - `/api/documents/:id/variables`
   - `/api/documents/:id/view`
   - `/api/documents/:id/status`

### Medium Priority - Clarify Purpose
3. **Document** or remove notarization endpoints if not planned soon
4. **Document** AI endpoints - are these planned?
5. **Review** FAQ system - is this needed?

### Low Priority - Keep for Now
6. Keep all dynamic route endpoints (/:id patterns)
7. Keep webhook endpoints (external systems)
8. Keep dev/test endpoints (useful for development)

---

## 🔧 Queue Configuration Update Needed

The orphaned `/api/documents/upload` endpoint references the old queue binding:
- **Old**: `DOCUMENT_QUEUE`
- **New**: `TEMPLATE_PROCESSING_QUEUE` or `DOCUMENT_GENERATION_QUEUE`

**Decision needed**: Delete this endpoint or repurpose it for admin template uploads.

---

## 📝 Notes

1. Many endpoints use dynamic routes (`:id`) which are harder to detect in static analysis
2. Some endpoints may be used by middleware or background jobs
3. Webhook endpoints should be kept even if not directly called from frontend
4. Development endpoints can be kept behind auth checks

---

## Next Steps

1. ✅ Review and confirm which orphaned endpoints to delete
2. ⏳ Clean up dead code
3. ⏳ Update API documentation
4. ⏳ Add comments to endpoints explaining their purpose
5. ⏳ Consider adding OpenAPI/Swagger documentation
