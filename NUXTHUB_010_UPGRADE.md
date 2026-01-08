# NuxtHub 0.10.x Upgrade Plan

**Status:** Ready to begin
**Date:** January 7, 2026

## Overview

Upgrading from NuxtHub <0.10 to 0.10.x involves migrating from the old `hubDatabase()` API to the standardized Drizzle ORM approach with new directory structure.

## Key Changes

### 1. Configuration
- **Old:** `hub: { database: true }`
- **New:** `hub: { db: 'sqlite' }`

### 2. Directory Structure
- **Old:** `server/database/`
- **New:** `server/db/`
- Migrations now go in: `server/db/migrations/`

### 3. API Changes
- **Old:** Raw SQL with `hubDatabase().prepare(...).all()`
- **New:** Drizzle ORM queries with `useDrizzle()`

### 4. Migration Generation
- **Old:** Manual SQL files or `drizzle-kit generate`
- **New:** `npx nuxt db generate` (NuxtHub command)

## Upgrade Steps

### Step 1: Update nuxt.config.ts

```diff
  hub: {
-   database: true,
+   db: 'sqlite',
    blob: true,
    kv: true
  }
```

### Step 2: Move Directory Structure

```bash
# Move the database directory
mv server/database server/db

# The new structure will be:
# server/db/
#   schema.ts
#   migrations/
#   index.ts (if needed)
```

### Step 3: Update drizzle.config.ts

```diff
export default {
  schema: './server/db/schema.ts',
-  out: './server/database/migrations',
+  out: './server/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './.data/hub/database/db.sqlite'
  }
}
```

### Step 4: Update Import Paths

Find and replace in all files:
- `server/database` → `server/db`
- `from '../../database'` → `from '../../db'`
- `from '../database'` → `from '../db'`

### Step 5: Replace hubDatabase() Calls

You currently have mixed usage. The endpoints using `hubDatabase()` need to be updated to use Drizzle ORM queries.

**Files using hubDatabase():**
- Most journey-related endpoints
- Snapshot endpoints
- Some client journey endpoints
- Admin seed endpoints

**Example conversion:**
```typescript
// OLD
const db = hubDatabase()
const results = await db.prepare(`
  SELECT * FROM users WHERE id = ?
`).bind(userId).first()

// NEW
const { useDrizzle, schema } = await import('../../db')
const db = useDrizzle()
const results = await db.select()
  .from(schema.users)
  .where(eq(schema.users.id, userId))
  .get()
```

### Step 6: Test Migration Generation

After the above changes:
```bash
# Generate new migration with all our schema changes
npx nuxt db generate

# This should create a new migration in server/db/migrations/
# Compare it with the stashed migration in .migration-stash/
```

### Step 7: Apply Migration

```bash
# Development
npx nuxt db migrate

# Production (via Cloudflare)
# Migrations apply automatically on deployment
```

## Migration Strategy

Since you have many files using `hubDatabase()`, I recommend:

1. **Phase 1:** Structure changes (Steps 1-4)
2. **Phase 2:** Keep both APIs working temporarily by:
   - Moving files but keeping imports working
   - Test that existing functionality works
3. **Phase 3:** Gradually migrate endpoints from `hubDatabase()` to Drizzle
4. **Phase 4:** Apply the schema migration once all code is updated

## Notes

- The stashed migration (0006_left_cannonball.sql) contains all your schema cleanup
- After upgrade, regenerate it with the new system to ensure compatibility
- NuxtHub 0.10.x uses the same Drizzle Kit under the hood, just with better integration

## Rollback Plan

If needed:
1. `git checkout nuxt.config.ts`
2. `mv server/db server/database`
3. Restore drizzle.config.ts
4. Revert import paths

Git commit before starting for easy rollback.
