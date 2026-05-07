# Audit & cleanup plan: snake_case API responses and legacy client queries

## Context

This codebase has two related legacy patterns that need to be eliminated:

1. **Snake_case API responses** in some endpoints (e.g., GET /api/clients,
   GET /api/clients/[id], various profile endpoints). Some endpoints return
   BOTH snake_case and camelCase keys for backward compatibility. The
   modern convention is camelCase only.

2. **Client queries via `users` table with `role = 'CLIENT'`**. The modern
   pattern queries `clients` joined to `people` via `personId`, using the
   `clientsWithStatus` view for reads (status is derived from matter activity).

CLAUDE.md currently documents both legacy patterns as "still works during
transition." The goal is to remove the transition state so CLAUDE.md can
describe one canonical pattern.

## What I want from this session

DO NOT make any code changes yet. Produce an audit and a phased cleanup
plan that I can review.

## SENSE

1. Find every API endpoint that returns snake_case keys. For each,
   record:
   - File path
   - HTTP method and route
   - Which keys are snake_case
   - Whether it ALSO returns camelCase keys (dual-shape)
   - Last modified date (git log)

2. Find every place in the codebase that queries clients via
   `users.role = 'CLIENT'` (instead of via the `clients` table). Search
   server code, Vue components, composables, and stores.

3. Find every frontend consumer (component, composable, store, page) that
   reads snake_case keys from API responses. Distinguish:
   - Consumers that read snake_case only
   - Consumers that read camelCase only
   - Consumers that read both (defensive coding)

4. Check the test suite for any tests that assert on snake_case response
   shapes.

## INQUIRE

State your assumptions explicitly before planning. In particular:
- Which endpoints are public/external-facing vs. internal?
- Are any of these endpoints consumed by something OUTSIDE this repo
  (mobile app, integrations, webhooks)? If you can't tell, say so.
- Is the `users.role = 'CLIENT'` pattern still used because some clients
  don't have `clients` records yet, or is it purely legacy?

## PLAN

Produce a phased cleanup plan with these sections:

### Phase 1: Inventory
A table of every endpoint with legacy shape and every consumer that
depends on it. This becomes the work backlog.

### Phase 2: Endpoint normalization
For each endpoint, propose one of:
- **Add camelCase, keep snake_case** (transitional, only if external
  consumers exist)
- **Replace snake_case with camelCase** (breaking change, internal-only)
- **Already dual-shape, remove snake_case** (cleanup of completed migrations)

For each, list the consumers that need to be updated in lockstep.

### Phase 3: Client query normalization
List every site that queries clients via the users table and the
modern equivalent for each.

### Phase 4: Test updates
Tests that assert on legacy shapes need to be updated alongside the
endpoint changes.

### Phase 5: CLAUDE.md cleanup
Once Phases 1–4 are complete, the legacy notes can be removed from
CLAUDE.md. Identify which sections become removable.

## SCAN

Before declaring this audit complete, verify:
- You searched both `server/api/` and `app/` directories
- You checked Pinia stores in `app/stores/`
- You checked composables in `app/composables/`
- You did NOT miss any endpoints by relying on file naming conventions
  (some endpoints may be in unexpected locations)

## Output format

A markdown document I can save as `doc/LEGACY_CLEANUP_PLAN.md`. Include
the inventory tables, the phased plan, and a recommended order of
execution (which phases unblock which).

DO NOT write any cleanup code in this session. The plan is the
deliverable.