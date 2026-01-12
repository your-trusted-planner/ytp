# Claude Development Guidelines

This document contains important context and guidelines for AI assistants (Claude) working on this codebase.

## Project Status & Progress

**📋 For current development status, see**: [`doc/CURRENT_STATUS.md`](doc/CURRENT_STATUS.md)

This file tracks:
- What's been completed
- What's in progress
- What's planned
- Known issues and blockers
- Recent architectural decisions

**Always check CURRENT_STATUS.md** before starting work to understand the current state of the project.

## Database & ORM

### Technology Stack
- **Database**: SQLite (Cloudflare D1 in production, local SQLite in development)
- **ORM**: Drizzle ORM
- **Migration Tool**: Drizzle Kit

### Schema Management

**Schema Definition**: All database schema is defined in `server/db/schema.ts` using Drizzle ORM.

**Drizzle Kit Configuration**: `drizzle.config.ts` at the root defines:
- Schema location: `./server/db/schema.ts`
- Migration output: `./server/db/migrations`
- Dialect: `sqlite` (CloudFlare D1)

**IMPORTANT - Migration Generation**:
- **NEVER manually write migration SQL files**
- **ALWAYS use Drizzle Kit to generate migrations**
- After modifying `schema.ts`, the developer will run: `npx drizzle-kit generate`
- Drizzle Kit automatically generates properly formatted migration files with random names (e.g., `0058_brave_wolverine.sql`)

**Migration Process** (Codebase-First Mode):
1. Claude modifies `server/db/schema.ts` with schema changes
2. Claude tells the developer: "Please run `npx drizzle-kit generate` to create the migration"
3. Developer runs the migration generation
4. Developer applies migrations via Drizzle Kit: `npx drizzle-kit migrate`

**Alternative - Direct Push** (for rapid development):
- `npx drizzle-kit push` - Pushes schema changes directly to database without generating migration files
- Use with caution in development only

**Why This Matters**:
- SQLite has limited ALTER TABLE support (can't modify CHECK constraints, column types, etc.)
- Drizzle Kit knows how to handle SQLite's limitations properly
- Drizzle Kit generates the correct create/copy/drop/rename pattern when needed
- Manual migrations can cause inconsistencies with Drizzle's schema tracking

### Fixing Migration Drift

Sometimes Drizzle Kit's snapshot gets out of sync with reality (e.g., after manually importing migrations or schema drift). This causes generated migrations to include operations that were already performed.

**Symptoms**:
- Migration fails with "no such column" or "table already exists" errors
- Generated migration includes `DROP COLUMN` for columns that don't exist
- Generated migration number is lower than existing migrations

**How to Fix**:
1. **Inspect the generated migration** - Look for statements that reference non-existent objects
2. **Edit the SQL file** - Remove the problematic statements (e.g., `DROP COLUMN` for already-dropped columns)
3. **Rename the file** - Change to the next sequence number (e.g., `0021_white_mordo.sql` → `0056_descriptive_name.sql`)
4. **Update meta files**:
   - `server/db/migrations/meta/_journal.json` - Change the `tag` in the last entry
   - Rename `server/db/migrations/meta/XXXX_snapshot.json` to match the new number
5. **Test locally** - Run `pnpm dev` to verify migrations apply correctly

### Database Access Patterns

**Drizzle ORM** (Preferred for most operations):
```typescript
const { useDrizzle, schema } = await import('../database')
const db = useDrizzle()

// Query
const users = await db.select().from(schema.users).all()

// Insert
await db.insert(schema.users).values({ ... })

// Update
await db.update(schema.users).set({ ... }).where(eq(schema.users.id, id))
```

**Raw SQL** (Only when necessary):
Some legacy endpoints use `hubDatabase()` with raw SQL. This is acceptable for:
- Complex queries not easily expressed in Drizzle
- Performance-critical queries
- Gradual migration from old patterns

```typescript
const db = hubDatabase()
const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
```

## Authentication & Sessions

### Session Management
- **Library**: `nuxt-auth-utils`
- **Storage**: Encrypted HTTP-only cookies
- **Session Functions**:
  - `getUserSession(event)` - Get current session
  - `setUserSession(event, data)` - Create/update session
  - `clearUserSession(event)` - Delete session
  - `requireUserSession(event)` - Require valid session (throws 401 if missing)

### Password Hashing
- **Library**: `bcryptjs` (not the password functions from nuxt-auth-utils)
- **Utilities**: `server/utils/auth.ts` exports `hashPassword()` and `verifyPassword()`

### Authentication Flow
1. **Server Middleware** (`server/middleware/auth.ts`):
   - Validates session exists
   - Checks user exists in database
   - Checks user is not INACTIVE
   - Attaches user to `event.context.user`

2. **Client Middleware** (`app/middleware/auth.ts`):
   - Checks `/api/auth/session` endpoint
   - Redirects to login if invalid

3. **OAuth Providers** (Firebase/Identity Platform):
   - Configured via `oauth_providers` table (admin-managed)
   - Firebase handles OAuth flows
   - Server validates Firebase tokens
   - Creates/links users in local database

## Deployment & Environments

### Branch Strategy
- **`main`** - Production deployments
- **`stage`** - Preview/staging deployments
- **Feature branches** - Test locally; merge to `stage` when ready for preview deployment

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)
Deployments are triggered on push to `main` or `stage` branches only.

**Production (main branch):**
1. Build the application
2. Fix wrangler config paths and inject environments
3. Apply database migrations to `ytp-db`
4. Deploy to production Workers

**Preview (stage branch):**
1. Build the application
2. Fix wrangler config paths and inject preview environment
3. Apply database migrations to `ytp-preview`
4. Deploy to preview Workers (`--env preview`)

### NuxtHub 0.10.x + Wrangler Deployment

**Important Context**: NuxtHub Admin and CLI are being sunset (Dec 31, 2025). As of v0.10.x, deployment uses wrangler directly instead of the NuxtHub action.

**Key Challenge**: Nitro/NuxtHub generates `.output/server/wrangler.json` during build, but this generated config does NOT include the `env` section from your root `wrangler.jsonc`. This means wrangler's `--env preview` flag won't find the preview environment.

**Workarounds in deploy.yml**:
1. **Inject env section**: A Node script copies the `env` section from `wrangler.jsonc` into the generated `.output/server/wrangler.json`
2. **Fix migrations paths**: The generated config has `migrations_dir: "server/db/migrations"` but wrangler runs from `.output/server`, so the path is rewritten to `db/migrations`
3. **Remove conflicting config**: Delete `.wrangler/deploy/config.json` which conflicts with the generated wrangler.json
4. **Set workingDirectory**: All wrangler-action steps use `workingDirectory: .output/server`

### Cloudflare Resources

| Resource | Production | Preview |
|----------|------------|---------|
| Worker | `ytp` | `ytp-preview` |
| D1 Database | `ytp-db` | `ytp-preview` |
| R2 Bucket | `ytp-blob` | `ytp-blob-preview` |
| KV (main) | `3c921ff1...` | `711a6f9c...` |
| KV (cache) | `06ceff03...` | `9c78f773...` |
| Queues | `document-*` | `document-*-preview` |

### URLs
- **Production**: `app.trustandlegacy.com`, `app.businessandlegacy.com`
- **Preview**: `app-preview.trustandlegacy.com`, `app-preview.businessandlegacy.com`

### Configuration Files
- **`wrangler.jsonc`** - Defines Workers, D1, KV, R2, Queues for both environments (includes `env.preview` section)
- **`.github/workflows/deploy.yml`** - CI/CD pipeline with NuxtHub 0.10.x workarounds
- **`.output/server/wrangler.json`** - Generated at build time by Nitro (do not edit manually)

### Adding New Preview Environment Secrets
When adding secrets for the preview environment:
```bash
wrangler secret put SECRET_NAME --env preview
```

## Code Patterns

### API Endpoints
- Use Zod for input validation
- Use `requireRole(event, ['ADMIN', 'LAWYER'])` for authorization
- Return structured responses: `{ success: true, data: ... }` or `{ error: '...' }`

### Error Handling
- Use `createError()` from h3 with appropriate status codes
- Include helpful error messages
- Add `data` field for additional context when useful

### TypeScript
- Use strict mode
- Prefer interfaces over types for object shapes
- Use `any` sparingly - only when truly dynamic

## Testing

### Test Framework
- **Unit Tests**: Vitest (`pnpm test` or `pnpm test:run`)
- **E2E Tests**: Playwright (`pnpm test:e2e`)
- **Coverage**: `pnpm test:coverage` (v8 provider)

### When to Write Tests First (TDD)
Consider writing tests before implementation when:
- **Business rules are well-defined**: RBAC permissions, validation rules, state machines
- **Pure functions**: Clear inputs/outputs with no side effects
- **Bug fixes**: Write a failing test that reproduces the bug, then fix it
- **API contracts**: Endpoints with stable request/response shapes

### When to Write Tests After
It's fine to implement first, then test when:
- **Exploratory work**: Requirements are still forming
- **UI components**: Likely to change during design iteration
- **Integration glue**: Code primarily wiring libraries together
- **Prototyping**: Validating an approach before committing

### Test Organization
```
tests/
├── setup.ts           # Global test setup
├── unit/              # Unit tests (Vitest)
│   ├── auth.test.ts
│   ├── rbac.test.ts
│   └── ...
└── e2e/               # End-to-end tests (Playwright)
    └── auth.spec.ts
```

### Writing Effective Tests
- Test business logic, not implementation details
- For code with external dependencies (DB, KV), test the logic patterns and interfaces
- Use descriptive test names that explain the expected behavior
- Group related tests with `describe()` blocks

## File Organization

- `server/api/` - API endpoints
- `server/middleware/` - Server middleware (auth, etc.)
- `server/utils/` - Shared server utilities
- `server/db/` - Database schema, migrations, utilities
- `app/pages/` - Nuxt pages (Vue components)
- `app/components/` - Reusable Vue components
- `app/middleware/` - Client-side route middleware
- `app/layouts/` - Page layouts

## Best Practices

1. **Read before editing**: Always read existing files before modifying them
2. **Consistent patterns**: Follow existing code patterns in the file you're editing
3. **Minimal changes**: Only change what's necessary for the task
4. **Schema changes**: Update `schema.ts` then tell developer to run `npx drizzle-kit generate`
5. **Never commit**: Claude should never create git commits unless explicitly requested
6. **Test locally**: All changes should be testable in local development environment

## Common Pitfalls

### ❌ Don't Do This:
- Write manual migration SQL files
- Use sqlite3 or NuxtHub CLI to apply migrations (NuxtHub CLI is deprecated)
- Create migrations without updating schema.ts
- Skip schema.ts and only write migrations
- Use `@node-rs/argon2` for password hashing (use bcryptjs)

### ✅ Do This:
- Modify schema.ts for database changes
- Tell developer to run `npx drizzle-kit generate`
- Use Drizzle ORM for database operations
- Use bcryptjs via `hashPassword()` and `verifyPassword()`
- Keep migrations and schema.ts in sync

## Cloudflare Workers Gotchas

### `readBody()` Fails in Workers

**Problem**: The h3 `readBody()` function causes 500 errors in Cloudflare Workers, even with `.catch()` error handling. This works fine in local development but fails in production.

**Symptoms**:
- DELETE or POST endpoints return 500 errors in production
- Works perfectly in local dev
- No useful error message in logs

**Solution**: Use query parameters instead of request body for DELETE endpoints:

```typescript
// ❌ DON'T - This fails in CF Workers
const body = await readBody(event).catch(() => ({}))
if (body.confirmDelete) { ... }

// ✅ DO - Use query params instead
const query = getQuery(event)
const confirmDelete = query.confirmDelete === 'true'
```

**Affected Endpoints**:
- `DELETE /api/templates/[id]` - Uses `?forceHardDelete=true`
- `DELETE /api/documents/[id]` - Uses `?confirmDelete=true`

### Dynamic Imports for NuxtHub Modules

For reliability in Workers, use dynamic imports for NuxtHub virtual modules inside handlers rather than top-level imports:

```typescript
// Preferred pattern for hub:blob
export default defineEventHandler(async (event) => {
  const { blob } = await import('hub:blob')
  // ... use blob
})
```

## When Uncertain

If unsure about:
- Migration approach → Modify schema.ts, let developer generate migration
- Database access pattern → Use Drizzle ORM unless there's a specific reason not to
- Authentication flow → Check existing patterns in `server/middleware/auth.ts`
- Vue component structure → Look at similar existing components

Ask the developer rather than making assumptions that could break existing functionality.
