# Project Instructions for Claude Desktop

## Project Overview

**Your Trusted Planner (YTP)** is an estate planning portal for attorneys and their clients. The system guides clients through legal service journeys (like Wyoming Asset Protection Trust formation) with document management, e-signatures, payments, and progress tracking.

## Current State

### Technology Stack
- **Frontend**: Nuxt 4, Vue 3, Tailwind CSS
- **Backend**: Nitro (Cloudflare Workers)
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Storage**: Cloudflare R2 (documents)
- **Integrations**: PandaDoc (e-signatures), LawPay (payments), Google Calendar

### Key Documentation
Reference these files for context:
- `doc/entity-relationship-diagram.md` - Database schema and relationships
- `doc/c4-architecture-diagrams.md` - System architecture (Context, Container, Component levels)
- `doc/public_site/help/attorney/` - Attorney user workflows
- `doc/public_site/help/client/` - Client user workflows
- `doc/public_site/releases/current.md` - Current feature set

### Core Concepts

**Users & Roles**
- ADMIN - System administrators
- LAWYER - Attorneys managing clients
- CLIENT - End users going through legal journeys
- LEAD/PROSPECT - Potential clients

**Matters & Services**
- Service Catalog: Product definitions (e.g., "WYDAPT - $18,500")
- Matters: Client cases that group related services
- Services: Specific engaged services linked to a matter

**Journey System**
- Journeys: Workflow templates with ordered steps
- Steps: Either MILESTONE (one-time) or BRIDGE (iterative review)
- Action Items: Tasks within steps (questionnaire, upload, e-sign, payment, etc.)
- Progress tracking with client/attorney approvals

**Documents**
- Templates with variable placeholders
- Generated documents linked to clients/services/matters
- Status flow: DRAFT → SENT → VIEWED → SIGNED → COMPLETED
- Optional notarization via PandaDoc

## Session Goals

Use this space to explore and define:

### Process Mapping
- Current attorney workflows (intake, document prep, signing, filing)
- Client journey touchpoints
- Communication patterns between attorney and client
- Handoff points and bottlenecks

### Revenue Flow
- Service pricing and packaging
- Payment timing (upfront, milestones, recurring)
- Trust accounting requirements (IOLTA compliance)
- Revenue recognition points

### Requirements Discovery
- Pain points in current process
- Automation opportunities
- Compliance requirements
- Reporting needs

## How to Use This Session

1. **Describe current processes** - Walk through how things work today, even if manual
2. **Identify pain points** - What's slow, error-prone, or frustrating?
3. **Explore edge cases** - What happens when things go wrong?
4. **Define success metrics** - How do you measure improvement?
5. **Prioritize features** - What's essential vs. nice-to-have?

## Output Formats

Ask Claude to produce:
- Process flow diagrams (Mermaid syntax for later rendering)
- User stories in standard format
- Data model suggestions
- API endpoint specifications
- UI wireframe descriptions
- Decision matrices for trade-offs

## Notes

- The codebase is a Nuxt 4 monolith deployed to Cloudflare Workers
- Database migrations use Drizzle Kit
- The doc site at `doc/public_site/` uses VitePress
- Future goal: Extract to monorepo structure
