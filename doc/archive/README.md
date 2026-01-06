# Documentation Archive

This directory contains historical documentation that is no longer actively used but preserved for reference.

## Archive Date: 2026-01-06

## Directory Structure

### `/domain-model/`
Historical domain model analysis and migration documentation. These files document the evolution of the domain model but are superseded by:
- **Active replacement**: `/doc/domain-model-final.md`
- **Active replacement**: `/doc/entity-relationship-diagram.md`

**Files**:
- `domain-model-analysis.md` - Initial domain model analysis
- `domain-model-erd.md` - Early ERD documentation
- `domain-model-migration-summary.md` - Migration notes from domain model restructure
- `domain-model-restructuring.md` - Planning doc for domain model changes
- `domain-model-ui-impact.md` - UI impact analysis (superseded by UI restructuring plan)

### `/wydapt-analysis/`
Historical gap analysis and configurability assessments for the WYDAPT service implementation.
- **Active replacement**: Current implementation, see `/doc/CURRENT_STATUS.md`

**Files**:
- `wydapt-corrected-assessment.md` - Assessment of WYDAPT implementation status
- `wydapt-implementation-gap-analysis.md` (32KB) - Detailed gap analysis
- `wydapt-configurability-analysis.md` (28KB) - Configurability options analysis

### `/historical/`
Miscellaneous historical documentation and cleanup summaries.

**Files**:
- `documentation-update-summary.md` - Superseded by `CURRENT_STATUS.md`
- `DOCUMENTATION_CLEANUP_ANALYSIS.md` - Superseded by this cleanup
- `phase-1-implementation-summary.md` - Historical phase 1 summary
- `client-detail-page-issues.md` - Issues documented in UI restructuring plan
- `remove-is-template-field.md` - Schema cleanup notes (completed)

## Why Archive?

These documents represent valuable historical context but were creating clutter in the main `/doc` directory. They document:
- The evolution of thinking about the domain model
- Gap analyses that informed implementation decisions
- Migration planning that has since been completed

**When to reference archived docs**:
- Understanding why certain architectural decisions were made
- Reviewing the history of domain model evolution
- Looking up details about past migrations

**When NOT to reference archived docs**:
- Current project status → See `/doc/CURRENT_STATUS.md`
- Current domain model → See `/doc/domain-model-final.md`
- Current database schema → See `/doc/entity-relationship-diagram.md`
- Current architecture → See `/doc/c4-architecture-diagrams.md`

## Preservation Policy

Archived documents are preserved indefinitely for historical reference but should not be updated. If information in an archived document becomes relevant again, it should be incorporated into an active document.
