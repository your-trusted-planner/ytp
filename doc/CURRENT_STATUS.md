# Current Status - YTP Estate Planning Platform

**Last Updated**: 2026-01-08

## 📍 Where We Are Now

### Recently Completed ✅

#### Firebase Authentication with OAuth Providers (2026-01-08)
- **Status**: Complete and working ✅
- **What**: Integrated Firebase Authentication to support OAuth providers (Google, Microsoft, Apple, Facebook) alongside existing email/password authentication
- **Implementation**:
  - Enabled `oauthProviders` table and `firebaseUid` field in database schema
  - Created migration `0056_firebase_oauth.sql` for OAuth providers table
  - Created migration `0057_make_password_nullable.sql` for OAuth-only users
  - Installed `firebase` and `firebase-admin` packages
  - Built client-side Firebase plugin and auth composable
  - Server-side token verification with automatic user creation/linking
  - Admin UI for managing OAuth providers at `/dashboard/settings/oauth-providers`
  - Role-based navigation refactored for better configurability
- **Key Features**:
  - Automatic account linking by email (OAuth login links to existing email/password account)
  - Support for both popup and redirect auth flows (falls back to redirect if popup blocked)
  - OAuth-only users can sign up without password
  - Profile page hides "Change Password" section for OAuth-only users
  - Provider logos stored locally (`/public/icons/google.svg`, etc.)
- **Files Created/Modified**:
  - `/server/db/schema.ts` - Enabled oauthProviders table, firebaseUid field
  - `/nuxt.config.ts` - Added Firebase runtime config
  - `/app/plugins/firebase.client.ts` - Firebase client initialization (NEW)
  - `/app/composables/useFirebaseAuth.ts` - OAuth flow composable (NEW)
  - `/server/api/auth/firebase.post.ts` - Token verification endpoint (NEW)
  - `/server/utils/firebase-admin.ts` - Firebase Admin SDK utility (NEW)
  - `/server/middleware/auth.ts` - Added public routes for Firebase auth
  - `/app/pages/login.vue` - Added OAuth buttons, wrapped in ClientOnly for hydration
  - `/app/layouts/dashboard.vue` - Role-based navigation configuration
  - `/app/pages/dashboard/profile/index.vue` - Conditional password section
  - `/server/api/auth/session.get.ts` - Added hasPassword/hasFirebaseAuth flags
  - `/public/icons/*.svg` - Provider logos (google, microsoft, facebook, apple)
- **Environment Variables Required**:
  - `NUXT_PUBLIC_FIREBASE_API_KEY` - Firebase client API key
  - `NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
  - `NUXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
  - `NUXT_FIREBASE_SERVICE_ACCOUNT` - Firebase Admin service account JSON
- **Note**: Firebase must be configured in Firebase Console with desired OAuth providers enabled

#### Multiple Middle Names Support (2026-01-06)
- **Status**: Complete and working
- **What**: Added support for variable-length middle names arrays to People table
- **Implementation**:
  - Created migration `0052_add_middle_names_to_people.sql`
  - Built Drizzle custom `jsonArray` type for automatic JSON serialization/deserialization
  - Converted all 5 People API endpoints from `hubDatabase()` to Drizzle ORM
  - Progressive disclosure UI: simple single input by default, expandable to multiple inputs
  - Navigation menu item added for People page
- **Files Modified**:
  - `/server/database/schema.ts` - Custom jsonArray type + People table definitions
  - `/server/api/people/*.ts` - All 5 endpoints (POST, PUT, GET, GET by ID, DELETE)
  - `/app/pages/dashboard/people/index.vue` - Progressive disclosure UI
  - `/app/layouts/dashboard.vue` - Added People menu item
- **Pattern Established**: ORM-layer serialization via Drizzle custom types (reusable for other JSON data)

#### Action Items & Task Management System (2026-01-06)
- **Status**: Complete and working ✅
- **What**: Comprehensive task management system integrated into journey builder with "ring the bell" philosophy
- **Implementation**:
  - Created migration `0053_enhance_action_items_and_journey_steps.sql`
  - Extended action types: 14 types total including AUTOMATION, THIRD_PARTY, OFFLINE_TASK, EXPENSE, FORM, DRAFT_DOCUMENT
  - Added system integration tracking (calendar, payment, document, manual)
  - Implemented "ring the bell" service delivery verification fields
  - Enhanced journey steps with final step verification
  - Converted 6 action-items API endpoints to Drizzle ORM
  - Built complete UI with action type selector and configuration modals
- **Key Features**:
  - Every journey step must have ≥1 action item (enforced with validation)
  - Visual action type selector with 14 types (icons + descriptions)
  - Type-specific configuration forms (Meeting, Upload, Payment, E-Signature, Draft Document, Questionnaire)
  - System integration toggles for calendar/payment/document features
  - Service delivery verification with objective criteria and evidence
  - Real-time validation warnings showing steps without action items
  - Expandable action items sections within each journey step
- **Action Types Available**:
  - QUESTIONNAIRE, DECISION, UPLOAD, REVIEW, ESIGN, NOTARY
  - PAYMENT, MEETING, KYC
  - AUTOMATION, THIRD_PARTY, OFFLINE_TASK
  - EXPENSE, FORM, DRAFT_DOCUMENT
- **Files Created/Modified**:
  - `/server/database/migrations/0053_enhance_action_items_and_journey_steps.sql`
  - `/server/database/schema.ts` - Enhanced actionItems and journeySteps tables
  - `/server/api/action-items/*.ts` - 6 endpoints (POST, PUT, DELETE, GET by step, GET by journey, complete)
  - `/server/api/journeys/[id]/validate.get.ts` - Journey validation endpoint
  - `/app/components/journey/ActionItemModal.vue` - Action item configuration modal (NEW)
  - `/app/pages/dashboard/journeys/[id].vue` - Enhanced with action items display and validation
- **Plan Document**: `/doc/action-items-task-management-plan.md` (comprehensive)
- **Draft Document Action Type**: Stubbed with integration hooks for future document generation system
  - Configuration: document name, template ID, drafting notes
  - Integration toggle for document system
  - Blue info banner indicating future integration

#### Currency Formatting Refactored (2026-01-06)
- **Status**: Complete
- **What**: Consolidated all price formatting into centralized utility
- **Implementation**:
  - Created `formatCurrency()` in `/app/utils/format.ts`
  - Correctly converts cents → dollars (divides by 100)
  - Refactored 7 components to use centralized utility
  - Fixed bugs in ServicesTable and PaymentsTable (were missing /100 division)
- **Files Modified**:
  - `/app/utils/format.ts` - Added formatCurrency function
  - `/app/components/matter/ServicesTable.vue` - Bug fixed
  - `/app/components/matter/PaymentsTable.vue` - Bug fixed
  - `/app/pages/dashboard/service-catalog/index.vue`
  - `/app/pages/dashboard/matters/index.vue`
  - `/app/pages/dashboard/matters/[id].vue`
  - `/app/pages/matters/index.vue`

#### Matters API Route Structure Fixed (2026-01-06)
- **Status**: Complete
- **What**: Fixed route conflicts caused by inconsistent parameter naming
- **Problem**: Both `[id]` and `[matterId]` directories causing 404 errors
- **Solution**: Consolidated to `[id]` with consistent parameter names
- **Files Modified**:
  - Moved `/api/matters/[matterId]/relationships/` → `/api/matters/[id]/relationships/`
  - Renamed relationship endpoints to use `[relationshipId]` instead of nested `[id]`
  - Updated all `getRouterParam` calls for consistency

#### Edit Matter Functionality Added (2026-01-06)
- **Status**: Complete
- **What**: Added edit functionality to matter detail page
- **Why**: Users needed ability to change matter status (PENDING → OPEN) from detail view
- **Implementation**:
  - Added "Edit Matter" button to matter detail page header
  - Created modal with fields: title, description, status, contract date
  - Status dropdown: PENDING, OPEN, CLOSED
  - Auto-populates form with current matter data
  - Saves changes and refreshes matter view
- **Files Modified**:
  - `/app/pages/dashboard/matters/[id].vue` - Added edit modal and handler

### Currently In Progress 🔄

#### NuxtHub 0.10.x Upgrade & API Response Normalization (2026-01-07)
- **Status**: Core migration complete ✅ - Remaining endpoints on-demand
- **What**: Upgraded from NuxtHub 0.9.x to 0.10.x with full API changes, plus systematic conversion of API responses to snake_case
- **Migration Documentation**: `/doc/NUXTHUB_010_API_MIGRATION.md` (comprehensive reference)

**Completed**:
- ✅ Configuration updated: `database: true` → `db: 'sqlite'`
- ✅ Directory moved: `server/database/` → `server/db/` (with git history)
- ✅ All database access converted from `hubDatabase()` to `import { db } from 'hub:db'`
- ✅ **All blob API calls updated**: `hubBlob()` → `import { blob } from 'hub:blob'` (5 files)
  - documents/[id]/download.get.ts - Document downloads now working
  - documents/generate-from-template.post.ts - Document generation
  - documents/[id]/variables.post.ts - Variable updates with DOCX regeneration
  - documents/upload.post.ts - Document uploads
  - document-uploads/[id]/download.get.ts - Upload downloads
- ✅ Database initialization working with NuxtHub 0.10.x virtual modules
- ✅ Schema synchronized with migrations (removed deprecated `isTemplate` field)
- ✅ Fixed journey step enum mismatch (`ATTORNEY` → `COUNSEL`)
- ✅ **Fixed document download bug**: Documents now generate proper blob keys when regenerated
- ✅ **26 API endpoints converted to snake_case** with proper timestamp handling:
  - Matters: index, detail, lawyers dropdown, relationships
  - Clients: index, detail, matters, relationships
  - Journeys: index, detail, engagement templates, progress
  - Action Items: by step, by client journey
  - Templates: index, detail
  - Service Catalog: index
  - People: index, detail
  - Users: index
  - Documents: detail
  - Dashboard: stats, activity
  - Appointments: index
  - Client Journeys: by client, by matter, progress

**Remaining Work** (On-Demand Approach):
- ~70 remaining GET endpoints to convert as features are tested/used
- Update KV and Cache API calls when encountered (utilities, queue handlers)
- Pattern established and documented - apply as needed

**Key Bug Fixes**:
1. **Document downloads working** - Fixed blob API calls and blob key generation
2. **DOCX regeneration working** - Generates blob keys for documents that don't have them
3. **Template uploads working** - Blob storage integration functional
4. **All core features tested** - Matters, clients, journeys, templates, documents all displaying correctly

**Files Modified** (Complete List):
- `/server/db/index.ts` - Database initialization with virtual modules
- `/server/db/schema.ts` - Removed deprecated fields, fixed enums
- `/server/api/documents/[id]/download.get.ts` - Blob API + download fix
- `/server/api/documents/generate-from-template.post.ts` - Blob API
- `/server/api/documents/[id]/variables.post.ts` - Blob API + blob key generation fix
- `/server/api/documents/upload.post.ts` - Blob API
- `/server/api/document-uploads/[id]/download.get.ts` - Blob API
- `/server/api/templates/upload.post.ts` - Blob API migration
- `/server/api/{matters,clients,journeys,action-items,etc}/**/*.get.ts` - 26 endpoints with snake_case conversion
- `/doc/NUXTHUB_010_API_MIGRATION.md` - Migration reference guide

#### UI Restructuring Plan: Matter-Centric Architecture
- **Status**: Planned (Phases 1-2 targeted)
- **Plan File**: `/Users/owenhathaway/.claude/plans/lexical-plotting-wadler.md`
- **Goal**: Align UI with domain model where Matters are primary unit of engagement
- **Next Steps**:
  - **Phase 1**: Rename pages to fix terminology confusion
    - Move `/dashboard/matters/` → `/dashboard/service-catalog/`
    - Move `/dashboard/cases/` → `/dashboard/matters/`
    - Update navigation links
  - **Phase 2**: Create comprehensive Matter detail view
    - New file: `/app/pages/dashboard/matters/[id].vue`
    - Tabs: Overview, Engaged Services, Client Journeys, Payments, Documents
    - New API endpoints for journeys/payments by matter
- **Future Phases** (3-6): Payment management, journey workflow fixes, enhanced lists, client experience

---

## 🏗️ Architecture Overview

### Domain Model (Current State)

**Core Entities**:
- **People**: Individuals and entities with contact info, identity fields, and middle names support
- **Clients**: References a Person, tracks engagement status
- **Matters**: Primary unit of engagement (with client), has title, status, description
- **Service Catalog**: Template services (WYDAPT, Maintenance, etc.) with pricing
- **matters_to_services**: Junction table linking engaged services to matters
- **Client Journeys**: Multi-step workflows tied to matters and services
- **Journey Templates**: Reusable workflow definitions
- **Payments**: Tracked at matter level (planned UI implementation)
- **Documents**: Attached to matters (planned UI implementation)

**Key Relationships**:
```
Client (1) ──→ Person (1)
Matter (N) ──→ Client (1)
Matter (N) ←─→ Service Catalog (N) via matters_to_services
Client Journey (N) ──→ Matter (1)
Client Journey (N) ──→ Service Catalog (1)
Payment (N) ──→ Matter (1)
Document (N) ──→ Matter (1)
```

### Technology Stack

**Backend**:
- Nuxt 4 + NuxtHub (Cloudflare-based)
- Drizzle ORM with custom types
- SQLite (D1) database
- API routes in `/server/api/`

**Frontend**:
- Vue 3 Composition API
- TailwindCSS + custom UI components
- Progressive disclosure patterns for complex forms

**Document Generation**:
- docxtemplater for template rendering (output side)
- Future: Schema extraction architecture (input side - see below)

---

## 🔮 Future Work

### 0. SEMGREP Security Scanning (GitHub Action)
- **Status**: Planned
- **Priority**: High (security best practice)
- **Goal**: Implement SEMGREP as a GitHub Action for static application security testing (SAST)
- **What**: Automated code scanning on PRs and pushes to detect security vulnerabilities
- **Benefits**:
  - Catch security issues early in development
  - Automated scanning on every PR
  - Covers OWASP Top 10 vulnerabilities
  - TypeScript/JavaScript rule support
  - Free for open source, affordable for private repos
- **Implementation**:
  - Add `.github/workflows/semgrep.yml` workflow file
  - Configure rules for TypeScript/Vue/Node.js
  - Set up PR comments for findings
  - Consider custom rules for project-specific patterns
- **Resources**:
  - https://semgrep.dev/docs/getting-started/
  - https://github.com/returntocorp/semgrep-action

### 1. Development Seed Data Improvements
- **Status**: Needed
- **Priority**: Medium-High (blocks efficient local development)
- **Goal**: Comprehensive seed data that covers all features for local testing
- **Current State**: Basic seed data exists but insufficient for full feature testing
- **Needs**:
  - Complete user accounts with various roles (ADMIN, LAWYER, CLIENT, ADVISOR)
  - Sample matters with engaged services
  - Journey templates with steps and action items
  - Client journeys in various states (NOT_STARTED, IN_PROGRESS, COMPLETED)
  - Sample documents attached to matters
  - OAuth providers for Firebase auth testing
  - People records with relationships
- **Implementation Options**:
  - Expand existing seed script (`/server/api/test/seed.post.ts`)
  - Create separate dev seed script with comprehensive data
  - Export/import from preview environment as seed baseline
- **Benefit**: Faster development cycles, consistent testing baseline

### 1. Schema Extraction Architecture
- **Status**: Documented, not implemented
- **Doc**: `/doc/future-schema-extraction-architecture.md`
- **Goal**: Extract template schemas from Word documents to auto-generate journey steps
- **Key Insight**: docxtemplater covers ~20% (document generation/output), schema extraction covers ~80% (document analysis/input)
- **Phases**:
  1. Template parsing and field extraction
  2. Domain model mapping (Trust, Person, Relationships)
  3. Human review and refinement UI
  4. Code generation for journey components
  5. Journey template creation
- **Philosophy**: Prefer domain models over custom fields, avoid "swiss army knife" custom field proliferation

### 2. Trust Domain Model
- **Status**: Conceptual discussion, not implemented
- **Goal**: First-class Trust entity with proper relationships
- **Why**: Estate planning specific, can hard-code domain knowledge
- **Fields**: Trust name, type, settlor(s), trustee(s), beneficiaries, formation date, jurisdiction
- **Benefits**: Type-safe journey steps, better data integrity, reduced custom fields

### 3. Payment Management UI (Phase 3)
- **Status**: Database table exists, no UI yet
- **Need**: Record payments, view payment history, calculate balances
- **Location**: Matter detail view (Payments tab)

### 4. Journey-Matter Workflow Fix (Phase 4)
- **Status**: Database supports it, UI doesn't enforce it
- **Validation**: Verify matter-service engagement exists before creating journey

### 5. Enhanced Matter List View (Phase 5)
- **Status**: Basic list exists (currently at `/dashboard/cases/`)
- **Need**: Filters, search, sorting, quick actions, engagement indicators

### 6. Client Experience Improvements (Phase 6)
- **Status**: Basic client portal exists
- **Need**: Card-based layouts, progress indicators, document uploads, payment status

---

## 📂 Key Documentation Files

### Current & Active
- **THIS FILE** (`CURRENT_STATUS.md`) - Up-to-date project status
- `USAGE.md` - How to run the project
- `API_AUDIT_REPORT.md` - Comprehensive API endpoint documentation
- `action-items-task-management-plan.md` - Action items & task management system (comprehensive)
- `future-schema-extraction-architecture.md` - Future feature planning
- `entity-relationship-diagram.md` - Current database schema
- `domain-model-final.md` - Domain model documentation
- `wydapt-seeding-production.md` - Production seeding instructions
- `/Users/owenhathaway/.claude/plans/lexical-plotting-wadler.md` - UI restructuring plan (Phases 1-2)

### Reference/Historical (Can be archived or consolidated)
- `domain-model-*.md` files (multiple) - Consolidate into `domain-model-final.md`
- `wydapt-*-analysis.md` files - Historical gap analysis, can archive
- `documentation-update-summary.md` - Superseded by this file
- `DOCUMENTATION_CLEANUP_ANALYSIS.md` - Superseded by this cleanup
- `client-detail-page-issues.md` - Will be addressed in Phase 4
- `phase-1-implementation-summary.md` - Historical, can archive

---

## 🚀 Quick Start (For Tomorrow)

### If continuing API normalization work:
1. Run the application and test features
2. If you encounter fields showing as undefined/null in UI:
   - Find the corresponding API endpoint (check browser network tab)
   - Open the endpoint file (e.g., `/server/api/.../something.get.ts`)
   - Look for `.all()` or `.get()` calls on Drizzle queries
   - Add snake_case conversion mapping (see pattern in Technical Decisions Log)
   - Convert Date objects to timestamps: `item.createdAt instanceof Date ? item.createdAt.getTime() : item.createdAt`
   - Convert booleans to integers: `item.isActive ? 1 : 0`
3. Reference examples:
   - `/server/api/matters/index.get.ts` - Simple list conversion
   - `/server/api/journeys/index.get.ts` - Enriched data with aggregates
   - `/server/api/documents/[id].get.ts` - Complex nested objects
4. **Priority order**: Fix endpoints as UI features are tested/used (on-demand approach)

### If resuming UI restructuring work:
1. Review the plan file: `/Users/owenhathaway/.claude/plans/lexical-plotting-wadler.md`
2. Start with Phase 1: Rename pages (1 day estimate)
3. Continue to Phase 2: Matter detail view (3-4 days estimate)

### If continuing People/middle names work:
- Feature is complete! No further work needed unless testing reveals issues.

### If starting schema extraction:
1. Review `/doc/future-schema-extraction-architecture.md`
2. Clarify scope: Which phase to start with?
3. Consider building Trust domain model first (provides target for extraction)

---

## 🎯 Custom Fields Philosophy

**Principle**: Thoughtful, tightly integrated custom fields - not swiss army knife proliferation

**Guidelines**:
- UI should scan for existing domain model fields before creating custom fields
- Prefer hard-coded domain models (Trust, Person+Relationships) over generic custom fields
- Estate planning specific → can hard-code domain knowledge
- Schema extraction should suggest domain model mappings, not just create custom fields
- Human review step maps extracted fields → domain models

**Why**: Prevents custom field sprawl, maintains data integrity, enables type-safe journeys

---

## 📊 Technical Decisions Log

### 2026-01-07: API Response Normalization Strategy
- **Decision**: Systematically convert all Drizzle ORM responses to snake_case at API layer
- **Context**: NuxtHub 0.10.x migration + Drizzle ORM adoption revealed field name mismatch
- **Problem**: Drizzle returns camelCase, existing UI expects snake_case from old raw SQL days
- **Solution**: Map all API responses to include both camelCase and snake_case (backwards compatible)
- **Pattern**:
  ```typescript
  return items.map(item => ({
    id: item.id,
    fieldName: item.fieldName, // camelCase for new code
    field_name: item.fieldName, // snake_case for existing UI
    createdAt: item.createdAt instanceof Date ? item.createdAt.getTime() : item.createdAt,
    created_at: item.createdAt instanceof Date ? item.createdAt.getTime() : item.createdAt
  }))
  ```
- **Scope**: All GET endpoints using `.all()` or `.get()` (~96 files identified)
- **Progress**: 26 high-priority endpoints completed, ~70 remaining
- **Rationale**: Gradual migration path, no UI changes required, prevents display bugs

### 2026-01-06: ORM-Layer Serialization
- **Decision**: Move JSON serialization from API layer to ORM layer
- **Implementation**: Drizzle custom types (e.g., `jsonArray`)
- **Benefit**: Cleaner API code, automatic handling, reusable pattern
- **Pattern**: Use for any JSON data in TEXT columns

### 2026-01-06: Progressive Disclosure for Middle Names
- **Decision**: Simple single input by default, expandable to multiple
- **Rationale**: "The vast majority of people have only one middle name, if any" (user quote)
- **Implementation**: Toggle flag + automatic reversion when reducing to 0-1 names
- **Pattern**: Reuse for other rare-but-needed complexity

### Prior: Matter-Centric Domain Model
- **Decision**: Matters are primary unit of engagement (not services)
- **Implementation**: Junction table `matters_to_services`, journeys reference matters
- **Migration**: Complete at database level, UI catch-up in progress

---

## 🐛 Known Issues

1. **Terminology Confusion**: `/dashboard/matters/` currently manages service catalog (not matters)
   - Fix: Phase 1 of UI restructuring plan
2. **Missing Matter Context in Journeys UI**: Journey creation doesn't enforce matter selection
   - Fix: Phase 4 of UI restructuring plan
3. **No Payment Management UI**: Database table exists but no UI to record/view payments
   - Fix: Phase 3 of UI restructuring plan

---

## 🗂️ Archive Candidates

The following files can be moved to `/doc/archive/` as they represent historical analysis or are superseded:

- `domain-model-analysis.md` - Superseded by `domain-model-final.md`
- `domain-model-erd.md` - Superseded by `entity-relationship-diagram.md`
- `domain-model-migration-summary.md` - Historical migration doc
- `domain-model-restructuring.md` - Superseded by final model
- `domain-model-ui-impact.md` - Superseded by UI restructuring plan
- `wydapt-corrected-assessment.md` - Historical assessment
- `wydapt-implementation-gap-analysis.md` - Historical gap analysis
- `wydapt-configurability-analysis.md` - Historical analysis
- `documentation-update-summary.md` - Superseded by this file
- `DOCUMENTATION_CLEANUP_ANALYSIS.md` - Superseded by this cleanup
- `phase-1-implementation-summary.md` - Historical implementation summary
- `client-detail-page-issues.md` - Issues documented in UI restructuring plan

**Keep Active**:
- `entity-relationship-diagram.md` - Current schema reference
- `domain-model-final.md` - Current domain model doc
- `future-schema-extraction-architecture.md` - Future planning
- `API_AUDIT_REPORT.md` - API reference
- `USAGE.md` - How-to guide
- `wydapt-seeding-production.md` - Production operations
- `wydapt-journey-diagram.md` - Workflow visualization
- `c4-architecture-diagrams.md` - Architecture diagrams
- `docx-processing-architecture.md` - Document generation architecture
- `template-system-architecture.md` - Template system design
- `document-system-analysis.md` - Document system overview
- `remove-is-template-field.md` - Schema cleanup notes

---

## 💬 Notes from Last Session

**Session 2026-01-08 (Evening)**:
- **Focus**: Firebase Authentication integration with OAuth providers
- **Achievements**:
  - ✅ Full Firebase Authentication implementation (Google, Microsoft, Apple, Facebook support)
  - ✅ Automatic account linking by email
  - ✅ OAuth-only user support (nullable password field)
  - ✅ Role-based navigation refactored for better configurability
  - ✅ Admin UI for OAuth provider management
  - ✅ Fixed hydration mismatches from password manager extensions (LastPass)
  - ✅ Added provider logos to `/public/icons/`
  - ✅ Profile page conditionally shows password section based on user auth type
- **Technical Challenges Solved**:
  - Firebase Admin SDK JSON parsing (Nuxt auto-parses env vars)
  - Password NOT NULL constraint for OAuth users (migration to make nullable)
  - SSR hydration mismatches (ClientOnly wrapper for forms)
  - Role-based navigation for different user types (ADMIN, LAWYER, CLIENT, PROSPECT, etc.)
- **Current State**:
  - Firebase OAuth working end-to-end with Google provider tested
  - Session management working across page navigations
  - Navigation shows only relevant items for user's role
  - Clean console (no Vue warnings except LastPass extension noise)
- **End of Session**: Documentation updated, SEMGREP added to roadmap

**Session 2026-01-07** (Previous):
- Completed NuxtHub 0.10.x migration
- Fixed document downloads and DOCX generation
- Converted 26 API endpoints to snake_case format

**Session 2026-01-06** (Previous):
- Multiple middle names functionality completed
- Action items & task management system implemented

---

**Next Session Options**:
1. **SEMGREP GitHub Action** - Set up security scanning workflow
2. **Continue API normalization** - Fix remaining endpoints as features are tested (on-demand)
3. **UI restructuring** - Phase 1-2 of matter-centric architecture plan
4. **Seed data improvements** - Better development data for testing
5. **Schema extraction** - Begin document template analysis and journey generation
