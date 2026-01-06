# YTP Estate Planning Platform - Documentation

**Last Updated**: 2026-01-06

## 🎯 Start Here

**New to the project?** → Read [`USAGE.md`](./USAGE.md) for setup and running instructions

**Want to know current status?** → Read [`CURRENT_STATUS.md`](./CURRENT_STATUS.md) for what's done, in progress, and next

**Looking for API docs?** → See [`API_AUDIT_REPORT.md`](./API_AUDIT_REPORT.md) for all endpoints

## 📚 Documentation Structure

### Current Status & Operations
- **[CURRENT_STATUS.md](./CURRENT_STATUS.md)** - Project status, recent work, next steps (START HERE for resuming work)
- **[USAGE.md](./USAGE.md)** - How to run the project, environment setup, common commands
- **[wydapt-seeding-production.md](./wydapt-seeding-production.md)** - Production seeding instructions for WYDAPT service

### Architecture Documentation
- **[c4-architecture-diagrams.md](./c4-architecture-diagrams.md)** - System architecture using C4 model
- **[entity-relationship-diagram.md](./entity-relationship-diagram.md)** - Database schema and relationships (most current)
- **[domain-model-final.md](./domain-model-final.md)** - Domain model concepts and entities

### API & System Components
- **[API_AUDIT_REPORT.md](./API_AUDIT_REPORT.md)** - Comprehensive API endpoint documentation
- **[template-system-architecture.md](./template-system-architecture.md)** - Template system design
- **[docx-processing-architecture.md](./docx-processing-architecture.md)** - Document generation architecture (using docxtemplater)
- **[document-system-analysis.md](./document-system-analysis.md)** - Document management system overview

### Workflow & Features
- **[wydapt-journey-diagram.md](./wydapt-journey-diagram.md)** - WYDAPT client journey visualization and flow

### Future Planning
- **[future-schema-extraction-architecture.md](./future-schema-extraction-architecture.md)** - Planned feature: extract schemas from Word docs to auto-generate journeys

### Historical Documentation
- **[archive/](./archive/)** - Historical documentation (domain model evolution, gap analyses, completed migrations)
  - See [`archive/README.md`](./archive/README.md) for details on archived content

## 🗺️ Quick Navigation by Use Case

### "I need to..."

**...understand the current database schema**
→ [`entity-relationship-diagram.md`](./entity-relationship-diagram.md)

**...find an API endpoint**
→ [`API_AUDIT_REPORT.md`](./API_AUDIT_REPORT.md)

**...understand how document generation works**
→ [`docx-processing-architecture.md`](./docx-processing-architecture.md)

**...understand how journeys work**
→ [`wydapt-journey-diagram.md`](./wydapt-journey-diagram.md)

**...run the project locally**
→ [`USAGE.md`](./USAGE.md)

**...know what to work on next**
→ [`CURRENT_STATUS.md`](./CURRENT_STATUS.md) (Section: "Quick Start for Tomorrow")

**...understand the overall system architecture**
→ [`c4-architecture-diagrams.md`](./c4-architecture-diagrams.md)

**...learn about future features**
→ [`future-schema-extraction-architecture.md`](./future-schema-extraction-architecture.md)

**...seed WYDAPT in production**
→ [`wydapt-seeding-production.md`](./wydapt-seeding-production.md)

**...understand why something was built a certain way**
→ Check [`archive/`](./archive/) for historical context

## 📝 Documentation Standards

### When to Update Documentation

**Always update** when:
- Completing a major feature (update `CURRENT_STATUS.md`)
- Adding/changing API endpoints (update `API_AUDIT_REPORT.md`)
- Modifying database schema (update `entity-relationship-diagram.md`)
- Changing architecture (update relevant architecture doc)

**Consider updating** when:
- Learning something that would help future contributors
- Discovering a pattern worth documenting
- Resolving a confusing issue

### Creating New Documentation

Before creating a new doc file, check if the information fits into an existing document. If creating a new file:
1. Add it to this README in the appropriate section
2. Include creation date and purpose at the top
3. Link to related documents
4. Consider if it should be in `/archive/` when superseded

### Archiving Old Documentation

When a document becomes historical:
1. Move to `/doc/archive/` in appropriate subdirectory
2. Update `/doc/archive/README.md` to list it
3. Remove from this README (main doc list)
4. Update `CURRENT_STATUS.md` to note the replacement

## 🏗️ Project Context

This is a Nuxt 3 + NuxtHub estate planning platform built for Wyoming Asset Protection Trusts and estate planning workflows. Key features:
- Client portal with guided journeys (step-by-step workflows)
- Document generation from templates
- Matter-centric engagement model
- Service catalog (WYDAPT, maintenance, etc.)
- Payment tracking (UI in progress)
- Person/client/matter relationship management

**Tech Stack**: Nuxt 3, Vue 3, Drizzle ORM, SQLite (D1), Cloudflare infrastructure

---

**Last Cleanup**: 2026-01-06 - Archived 12 historical files, consolidated into `CURRENT_STATUS.md`
