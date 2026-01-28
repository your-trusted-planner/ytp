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

## Data Model

### Belly Button Principle Architecture

The data model follows the "Belly Button Principle" - every human in the system has a person record. Identity is separated from authentication.

**Core Structure:**
- **`people`** = identity (all humans - clients, staff, spouses, beneficiaries, etc.)
- **`users`** = authentication (accounts that can log in, linked to a person)
- **`clients`** = client-specific data (linked to a person)

```
people (identity - ALL humans)
├── id, firstName, lastName, fullName, email, phone
├── personType: 'individual' | 'entity'
├── address, dateOfBirth, ssnLast4
└── entityName, entityType, entityEin (for trusts/corps)

users (authentication/authorization ONLY)
├── personId → people.id (links to identity)
├── email, password, firebaseUid
├── role, adminLevel, status
└── avatar, signatureImage

clients (client-specific data)
├── personId → people.id (the person who is the client)
├── status: 'LEAD' | 'PROSPECT' | 'ACTIVE' | 'INACTIVE'
├── estate planning fields (hasMinorChildren, hasWill, etc.)
├── referral tracking, attribution
└── Google Drive sync, assignedLawyerId

relationships (unified)
├── fromPersonId → people.id
├── toPersonId → people.id
├── relationshipType (SPOUSE, CHILD, TRUSTEE, BENEFICIARY, etc.)
└── context: 'client' | 'matter' | null
```

**Key Principle:** Every user has a person. Not every person has a user. Not every person is a client.

| Entity | people | users | clients |
|--------|--------|-------|---------|
| Lawyer | ✓ | ✓ (role=LAWYER) | ✗ |
| Staff | ✓ | ✓ (role=STAFF) | ✗ |
| Admin | ✓ | ✓ (role=ADMIN) | ✗ |
| Client (portal access) | ✓ | ✓ (role=CLIENT) | ✓ |
| Client (no login) | ✓ | ✗ | ✓ |
| Spouse/Child | ✓ | ✗ | ✗ |
| Beneficiary | ✓ | ✗ | ✗ |

### Querying Clients

```typescript
// NEW: Query clients via clients → people tables
const [client] = await db.select()
  .from(schema.clients)
  .innerJoin(schema.people, eq(schema.clients.personId, schema.people.id))
  .where(eq(schema.clients.id, clientId))

// LEGACY (still works during transition): Query by user role
const [client] = await db.select()
  .from(schema.users)
  .where(and(
    eq(schema.users.id, clientId),
    eq(schema.users.role, 'CLIENT')
  ))
```

### User Roles

The `users` table has a `role` column with these values:
- `ADMIN` - Full system access, can manage all users and settings
- `LAWYER` - Primary legal practitioner role
- `STAFF` - Office staff with limited access
- `CLIENT` - Customers/clients with portal access
- `LEAD`, `PROSPECT` - Pre-client stages
- `INACTIVE` - Deactivated users (cannot login)

### Key Entity Tables

| Entity | Table | Name Resolution |
|--------|-------|-----------------|
| Person | `people` | `fullName` or `firstName + ' ' + lastName` |
| Client | `clients` → `people` | Via `personId` to people |
| User | `users` → `people` | Via `personId` to people |
| Matter | `matters` | `title` |
| Document | `documents` | `title` |
| Journey | `clientJourneys` | `journeyName` |
| Template | `templates` | `name` |
| Referral Partner | `referralPartners` | `name` |
| Service | `serviceCatalog` | `name` |
| Appointment | `appointments` | `title` |
| Note | `notes` | Generic "Note" (no title field) |

### People & Relationships

The `people` table stores ALL humans in the system:
- Each person can optionally have a `users` record (for login)
- Each person can optionally have a `clients` record (if they're a client)
- The `relationships` table links people to people with context

**Relationship contexts:**
- `null` - General relationship (e.g., spouse, child)
- `'client'` - Client-level relationship
- `'matter'` - Matter-specific relationship (e.g., beneficiary for a specific trust)

---

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

### API Route Protection

The server middleware (`server/middleware/auth.ts`) automatically protects API routes based on path conventions:

| Path Pattern | Protection | Use Case |
|--------------|------------|----------|
| `/api/admin/*` | Requires `adminLevel >= 2` | Admin-only features (integrations, migrations, system settings) |
| `/api/public/*` | No auth required | Public endpoints (landing pages, public forms) |
| `/api/signature/*` | Token-based auth | E-signature flows (handled by endpoint) |
| `/api/auth/*` | Mixed | Login/logout/session endpoints |
| `/api/*` (other) | Requires valid session | Standard authenticated endpoints |

**Creating New Endpoints:**

```typescript
// Admin endpoint - just put it in /api/admin/
// Middleware automatically requires adminLevel >= 2
// server/api/admin/settings/index.get.ts
export default defineEventHandler(async (event) => {
  // No need to check auth - middleware handles it
  // User available at event.context.user
  const user = event.context.user
  // ...
})

// Standard authenticated endpoint
// server/api/clients/index.get.ts
export default defineEventHandler(async (event) => {
  // User is guaranteed to be authenticated
  const user = event.context.user
  // ...
})

// Public endpoint - put it in /api/public/
// server/api/public/health.get.ts
export default defineEventHandler(async (event) => {
  // No auth required
  return { status: 'ok' }
})
```

**Available Context:**
After middleware runs, these are available on `event.context`:
- `user` - Full user object (`{ id, email, role, adminLevel, firstName, lastName }`)
- `userId` - User ID string
- `userRole` - User role string
- `adminLevel` - Admin level number (0-3)

**Do NOT** call `requireAdminLevel()` in `/api/admin/*` endpoints - the middleware handles it.

## Activity Logging System

The activity logging system tracks user actions with structured entity references for linkable, historical audit trails.

### Core Concepts

**EntityRef** - Standardized reference to any entity:
```typescript
interface EntityRef {
  type: EntityType  // 'client' | 'matter' | 'document' | etc.
  id: string        // Entity ID for linking
  name: string      // Name snapshot at log time
}
```

**EntityType** - Supported entity types:
```typescript
type EntityType =
  | 'user' | 'client' | 'matter' | 'document'
  | 'journey' | 'template' | 'referral_partner'
  | 'service' | 'appointment' | 'note' | 'setting'
```

### Using logActivity

**Important** - When creating data CRUD functionality of any sort, consider whether that activity should be logged with the activity logger. Close calls go to logging rather than not logging.

Located in `server/utils/activity-logger.ts`:

```typescript
import { logActivity } from '../../utils/activity-logger'
import { resolveEntityName } from '../../utils/entity-resolver'
import type { EntityType } from '../../utils/activity-logger'

// Resolve the entity name first
const entityName = await resolveEntityName('client', clientId)

// Log with structured references
await logActivity({
  type: 'CLIENT_UPDATED',
  userId: user.id,
  userRole: user.role,
  target: { type: 'client', id: clientId, name: entityName || 'Unknown' },
  relatedEntities: [
    { type: 'matter', id: matterId, name: matterTitle }
  ],
  event,
  details: {
    changes: ['email', 'phone']  // Activity-specific data
  }
})
```

### Entity Name Resolution

**Always use the centralized resolver** in `server/utils/entity-resolver.ts`:

```typescript
import { resolveEntityName, resolveEntityNames } from '../../utils/entity-resolver'

// Single entity
const name = await resolveEntityName('client', clientId)

// Batch resolution (more efficient)
const names = await resolveEntityNames([
  { type: 'client', id: clientId },
  { type: 'matter', id: matterId }
])
const clientName = names.get('client:' + clientId)
const matterName = names.get('matter:' + matterId)
```

**Why use the resolver**: It centralizes the knowledge of how to look up names for each entity type, avoiding bugs like using `schema.clients` (which doesn't exist).

### Activity Types

Common activity types (defined in `activity-logger.ts`):
- `USER_LOGIN`, `USER_LOGOUT`, `USER_CREATED`, `USER_UPDATED`
- `CLIENT_CREATED`, `CLIENT_UPDATED`, `CLIENT_VIEWED`
- `MATTER_CREATED`, `MATTER_UPDATED`
- `DOCUMENT_CREATED`, `DOCUMENT_VIEWED`, `DOCUMENT_SIGNED`, `DOCUMENT_DOWNLOADED`, `DOCUMENT_DELETED`
- `NOTE_CREATED`, `NOTE_UPDATED`, `NOTE_DELETED`
- `JOURNEY_STARTED`, `JOURNEY_STEP_COMPLETED`, `JOURNEY_COMPLETED`
- `TEMPLATE_CREATED`, `TEMPLATE_UPDATED`, `TEMPLATE_DELETED`
- `REFERRAL_PARTNER_CREATED`, `REFERRAL_PARTNER_UPDATED`

## Server Utilities

Key utilities in `server/utils/`:

| Utility | Purpose |
|---------|---------|
| `activity-logger.ts` | Log user activities with structured entity refs |
| `activity-description.ts` | Generate human-readable activity descriptions |
| `entity-resolver.ts` | Resolve entity IDs to names (centralized lookups) |
| `auth.ts` | `hashPassword()`, `verifyPassword()` |
| `rbac.ts` | Role-based access control helpers |
| `email.ts` | Email sending via Resend |
| `pdf.ts` | PDF generation |
| `google-drive.ts` | Google Drive integration |
| `document-renderer.ts` | Document template rendering |
| `validation.ts` | Common validation schemas |

### RBAC Utilities

```typescript
// Require specific roles
const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

// Check permissions
if (hasPermission(user, 'MANAGE_CLIENTS')) { ... }
```

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

### Attribute Case Conventions

**⚠️ IMPORTANT**: The codebase has mixed conventions due to migration from raw SQL to Drizzle ORM. Follow these rules:

| Layer | Convention | Example |
|-------|------------|---------|
| Database columns | snake_case | `first_name`, `created_at` |
| Drizzle schema | camelCase | `firstName`, `createdAt` |
| API request bodies | camelCase | `{ firstName: "John" }` |
| API responses | **camelCase** (preferred) | `{ firstName: "John" }` |

**Drizzle handles the mapping** between camelCase TypeScript and snake_case DB columns:
```typescript
// In schema.ts - camelCase property maps to snake_case column
firstName: text('first_name'),
createdAt: integer('created_at', { mode: 'timestamp' }),
```

**Request bodies** - Use camelCase in Zod schemas:
```typescript
// ✅ CORRECT
const schema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  createdAt: z.date().optional()
})

// ❌ WRONG - don't use snake_case in request validation
const schema = z.object({
  first_name: z.string(),  // Don't do this
})
```

**API responses** - Prefer camelCase (modern convention):
```typescript
// ✅ PREFERRED - camelCase responses
return {
  client: {
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    createdAt: client.createdAt
  }
}

// ⚠️ LEGACY - some endpoints return snake_case for backward compatibility
// Don't add new snake_case responses
return {
  client: {
    first_name: client.firstName,  // Legacy pattern
    firstName: client.firstName     // Some endpoints return both!
  }
}
```

**Known legacy endpoints with snake_case responses:**
- `GET /api/clients` - Returns both `first_name` and `firstName`
- `GET /api/clients/[id]` - Returns snake_case (`first_name`, `created_at`)
- Various profile endpoints return snake_case for compatibility

**When updating existing endpoints**: Maintain backward compatibility. Do NOT opportunistically refactor snake_case to camelCase — this breaks frontend components expecting the old shape.

**When creating new endpoints**: Use camelCase consistently for both input and output.

**Legacy cleanup**: Requires a coordinated refactor of backend API + frontend components together. Do not attempt piecemeal. Track as a separate task if needed.

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

### Server (`server/`)
```
server/
├── api/                    # API endpoints (auto-routed)
│   ├── auth/               # Login, logout, session
│   ├── clients/            # Client management (uses users table!)
│   ├── documents/          # Document CRUD
│   ├── matters/            # Legal matters
│   ├── notes/              # Notes for any entity
│   ├── templates/          # Document templates
│   ├── dashboard/          # Dashboard data (activity, stats)
│   └── referral-partners/  # Referral partner management
├── middleware/             # Server middleware (auth.ts)
├── utils/                  # Shared utilities
│   ├── activity-logger.ts  # Activity logging with EntityRef
│   ├── activity-description.ts  # Description generation
│   ├── entity-resolver.ts  # Centralized name resolution
│   ├── auth.ts             # Password hashing
│   ├── rbac.ts             # Role-based access control
│   └── ...                 # 20+ more utilities
└── db/
    ├── schema.ts           # Drizzle schema (source of truth)
    ├── migrations/         # Generated migrations
    └── index.ts            # DB connection helpers
```

### App (`app/`)
```
app/
├── pages/                  # Nuxt pages (file-based routing)
│   ├── activity.vue        # Activity log page
│   ├── clients/            # Client pages
│   ├── matters/            # Matter pages
│   └── ...
├── components/             # Reusable Vue components
│   ├── dashboard/          # Dashboard widgets
│   ├── ui/                 # Base UI components
│   └── ...
├── middleware/             # Client-side route guards
├── layouts/                # Page layouts
├── stores/                 # Pinia stores
└── composables/            # Vue composables
```

## Best Practices

1. **Prefer Test Driven Development Pattern**: Not all work requires a test first, but most CRUD patterns do.
2. **Read before editing**: Always read existing files before modifying them
3. **Consistent patterns**: Follow existing code patterns in the file you're editing
4. **Minimal changes**: Only change what's necessary for the task
5. **Schema changes**: Update `schema.ts` then tell developer to run `npx drizzle-kit generate`
6. **Never commit**: Claude should never create git commits unless explicitly requested
7. **Test locally**: All changes should be testable in local development environment

## Common Pitfalls

### ❌ Don't Do This:

**Data Model Mistakes (Belly Button Principle):**
- Create users without linked person records - every user needs a person
- Query clients from `users` table directly - use `clients` → `people` join
- Use deprecated `clientRelationships` or `matterRelationships` - use unified `relationships` table
- Duplicate entity name resolution logic - use `entity-resolver.ts` instead
- Assume entity tables have a `name` field (some use `title`, some use `firstName + lastName`)

**Case Convention Mistakes:**
- Use snake_case in new Zod schemas (`first_name`) - use camelCase (`firstName`)
- Return snake_case in new API responses - use camelCase
- Forget that Drizzle maps `firstName` → `first_name` automatically
- Mix conventions inconsistently within the same endpoint

**Database & Migrations:**
- Write manual migration SQL files
- Use sqlite3 or NuxtHub CLI to apply migrations (NuxtHub CLI is deprecated)
- Create migrations without updating schema.ts
- Skip schema.ts and only write migrations

**Authentication:**
- Use `@node-rs/argon2` for password hashing (use bcryptjs)

### ✅ Do This:

**Data Model (Belly Button Principle):**
- Create a `people` record first, then link `users` and/or `clients` to it
- Query clients via `schema.clients` joined with `schema.people` by `personId`
- Use `schema.relationships` for all person-to-person relationships
- Use `resolveEntityName()` from `entity-resolver.ts` for name lookups
- Check the "Key Entity Tables" section above for name resolution patterns

**Database & Migrations:**
- Modify schema.ts for database changes
- Tell developer to run `npx drizzle-kit generate`
- Use Drizzle ORM for database operations
- Keep migrations and schema.ts in sync

**Activity Logging:**
- Use structured `target` and `relatedEntities` in `logActivity()`
- Always resolve entity names before logging
- Use bcryptjs via `hashPassword()` and `verifyPassword()`

## NuxtHub Services

### KV Storage

Use the `@nuxthub/kv` package for key-value storage:

```typescript
import { kv } from '@nuxthub/kv'

// Set a value
await kv.set('key', 'value')
await kv.set('key', { data: 'json' }, { ttl: 3600 }) // with TTL in seconds

// Get a value
const value = await kv.get('key')

// Check existence
const exists = await kv.has('key')

// Delete
await kv.del('key')

// List keys
const keys = await kv.keys()
const prefixedKeys = await kv.keys('prefix:')
```

**Do NOT use** the old `hubKV()` pattern - it's deprecated.

### Blob Storage

Use dynamic imports for blob storage in handlers:

```typescript
export default defineEventHandler(async (event) => {
  const { blob } = await import('hub:blob')
  // ... use blob
})
```

## Cloudflare Workers Gotchas

### `readBody()` Fails for DELETE Requests in Workers

**Problem**: The h3 `readBody()` function causes 500 errors for DELETE requests in Cloudflare Workers, even with `.catch()` error handling. This works fine in local development but fails in production. POST and PUT requests with `readBody()` work fine.

**Symptoms**:
- DELETE endpoints with request bodies return 500 errors in production
- Works perfectly in local dev
- No useful error message in logs

**Root cause (speculated)**: Likely related to how Workers handles DELETE request bodies (which are technically allowed by HTTP spec but semantics are undefined). The body stream may be consumed or closed before `readBody()` can process it.

**Solution**: Use query parameters for DELETE options instead of request body:

```typescript
// ❌ DON'T - readBody fails for DELETE in CF Workers
const body = await readBody(event).catch(() => ({}))
if (body.confirmDelete) { ... }

// ✅ DO - Use query params for DELETE options
const query = getQuery(event)
const confirmDelete = query.confirmDelete === 'true'

// ✅ POST/PUT with readBody works fine
const body = await readBody(event)  // OK for POST/PUT
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
- **Migration approach** → Modify schema.ts, let developer generate migration
- **Database access pattern** → Use Drizzle ORM unless there's a specific reason not to
- **Authentication flow** → Check existing patterns in `server/middleware/auth.ts`
- **Vue component structure** → Look at similar existing components
- **Entity name resolution** → Use `resolveEntityName()` from `server/utils/entity-resolver.ts`
- **Where clients are stored** → The `users` table with `role = 'CLIENT'`
- **Activity logging** → Check existing endpoints for `logActivity()` patterns

Ask the developer rather than making assumptions that could break existing functionality.

## Quick Reference

### Entity Queries Cheat Sheet

```typescript
// Get a client by ID (NEW: Belly Button Principle)
const [client] = await db.select({
  clientId: schema.clients.id,
  personId: schema.clients.personId,
  status: schema.clients.status,
  firstName: schema.people.firstName,
  lastName: schema.people.lastName,
  email: schema.people.email
})
  .from(schema.clients)
  .innerJoin(schema.people, eq(schema.clients.personId, schema.people.id))
  .where(eq(schema.clients.id, clientId))

// Get all active clients
const clients = await db.select()
  .from(schema.clients)
  .innerJoin(schema.people, eq(schema.clients.personId, schema.people.id))
  .where(eq(schema.clients.status, 'ACTIVE'))

// Get a person by ID
const [person] = await db.select()
  .from(schema.people)
  .where(eq(schema.people.id, personId))

// Create a new person + user (for staff/lawyers/admins)
const personId = `person_${userId}`
await db.insert(schema.people).values({
  id: personId,
  personType: 'individual',
  firstName, lastName, email
})
await db.insert(schema.users).values({
  id: userId,
  personId, // Link to person
  email, role: 'STAFF'
})

// Create a new client (with or without user account)
const personId = crypto.randomUUID()
const clientId = crypto.randomUUID()
await db.insert(schema.people).values({ id: personId, firstName, lastName, email })
await db.insert(schema.clients).values({ id: clientId, personId, status: 'PROSPECT' })
// Optionally create user account if client needs portal access:
// await db.insert(schema.users).values({ id: userId, personId, email, role: 'CLIENT' })

// Resolve entity name (use this pattern!)
import { resolveEntityName } from '../../utils/entity-resolver'
const name = await resolveEntityName('client', clientId)  // Returns "John Smith" or null
const personName = await resolveEntityName('person', personId)  // Direct person lookup
```

### Activity Logging Cheat Sheet

```typescript
import { logActivity } from '../../utils/activity-logger'
import { resolveEntityName } from '../../utils/entity-resolver'
import type { EntityType } from '../../utils/activity-logger'

// Standard pattern for logging an action
const entityName = await resolveEntityName(entityType as EntityType, entityId)

await logActivity({
  type: 'NOTE_CREATED',  // Activity type
  userId: user.id,
  userRole: user.role,
  target: entityName
    ? { type: entityType as EntityType, id: entityId, name: entityName }
    : undefined,
  relatedEntities: [
    { type: 'note', id: noteId, name: 'Note' }
  ],
  event,  // H3 event for IP/geo tracking
  details: {
    // Activity-specific data
    contentPreview: content.substring(0, 100)
  }
})
```
