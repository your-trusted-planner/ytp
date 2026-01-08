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
- **`main`** - Production deployments to `app.trustandlegacy.com` / `app.businessandlegacy.com`
- **`stage`** - Preview deployments for staging/testing
- **`feature/**`** - Preview deployments for feature branches (verbose naming)
- **`feat/**`** - Preview deployments for feature branches (short naming)

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)
Deployments are triggered on push to any of the above branches.

**Production (main branch):**
1. Build the application
2. Apply database migrations to `ytp-db`
3. Deploy to production Workers

**Preview (all other branches):**
1. Build the application
2. Apply database migrations to `ytp-preview`
3. Deploy to preview Workers (`--env preview`)

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
- **Wrangler**: `wrangler.jsonc` - Defines Workers, D1, KV, R2, Queues for both environments
- **GitHub Actions**: `.github/workflows/deploy.yml` - CI/CD pipeline

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

## When Uncertain

If unsure about:
- Migration approach → Modify schema.ts, let developer generate migration
- Database access pattern → Use Drizzle ORM unless there's a specific reason not to
- Authentication flow → Check existing patterns in `server/middleware/auth.ts`
- Vue component structure → Look at similar existing components

Ask the developer rather than making assumptions that could break existing functionality.
