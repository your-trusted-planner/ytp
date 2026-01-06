# Current Status - YTP Estate Planning Platform

**Last Updated**: 2026-01-06

## 📍 Where We Are Now

### Recently Completed ✅

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

### Currently In Progress 🔄

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
- Nuxt 3 + NuxtHub (Cloudflare-based)
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
- **Need**: Start Journey modal should require matter selection, auto-populate engaged services
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

**User feedback** (2026-01-06 evening):
- "I'm feeling real good about where we are and where we're headed"
- "I need to wind down and get some sleep, but I'd like to be able to pick up as close to where we are as possible"
- Requested documentation of current state and markdown cleanup
- Running out of steam but satisfied with progress

**Technical state**:
- All middle names functionality working
- Server starting successfully
- No pending fixes or errors
- Ready to resume either UI restructuring or schema extraction work

---

**Next Session**: Choose one of the three paths above based on priority and energy level. All three are well-documented and ready to start.
