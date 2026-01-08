# NuxtHub 0.10.x API Migration Reference

This document describes the complete API changes from NuxtHub 0.9.x to 0.10.x.

## Configuration Changes

### Old (0.9.x):
```typescript
export default defineNuxtConfig({
  hub: {
    database: true,
    blob: true,
    kv: true
  }
})
```

### New (0.10.x):
```typescript
export default defineNuxtConfig({
  hub: {
    db: 'sqlite',  // or 'postgresql', 'mysql'
    blob: true,
    kv: true,
    cache: true  // optional
  }
})
```

## Directory Structure Changes

- `server/database/` → `server/db/`
- `server/database/schema.ts` → `server/db/schema.ts`
- `server/database/migrations/` → `server/db/migrations/`

## API Changes

### Database API

**Old (0.9.x):**
```typescript
export default eventHandler(async () => {
  const db = hubDatabase()
  const users = await db.prepare('SELECT * FROM users').all()
  return users.results
})
```

**New (0.10.x):**
```typescript
import { db } from 'hub:db'

export default eventHandler(async () => {
  // Use Drizzle ORM - db is pre-configured
  return await db.select().from(schema.users)
})
```

### Blob API

**Old (0.9.x):**
```typescript
export default eventHandler(async (event) => {
  const blob = hubBlob()
  await blob.put('path/to/file', buffer)
  const file = await blob.get('path/to/file')
  return blob.serve(event, pathname)
})
```

**New (0.10.x):**
```typescript
import { blob } from 'hub:blob'

export default eventHandler(async (event) => {
  // blob is already imported, use directly
  await blob.put('path/to/file', buffer)
  const file = await blob.get('path/to/file')
  return blob.serve(event, pathname)
})
```

### KV API

**Old (0.9.x):**
```typescript
export default eventHandler(async () => {
  const kv = hubKV()
  await kv.set('my-key', 'value')
  return await kv.get('my-key')
})
```

**New (0.10.x):**
```typescript
import { kv } from 'hub:kv'

export default eventHandler(async () => {
  // kv is already imported, use directly
  await kv.set('my-key', 'value')
  return await kv.get('my-key')
})
```

## Migration Checklist

- [ ] Update `nuxt.config.ts`: `database: true` → `db: 'sqlite'`
- [ ] Move `server/database/` → `server/db/`
- [ ] Update `drizzle.config.ts` to point to `server/db/`
- [ ] Replace `hubDatabase()` with `import { db } from 'hub:db'`
- [ ] Replace `hubBlob()` with `import { blob } from 'hub:blob'`
- [ ] Replace `hubKV()` with `import { kv } from 'hub:kv'`
- [ ] Update all raw SQL to Drizzle ORM queries
- [ ] Test all database, blob, and KV operations

## Key Changes

1. **Virtual Module Imports**: All NuxtHub services are now imported from virtual modules (`hub:db`, `hub:blob`, `hub:kv`)
2. **No Function Calls**: Don't call `hubDatabase()` - just import `db` directly
3. **Drizzle ORM Required**: Database must use Drizzle ORM, no more raw SQL via `prepare()`
4. **Type Safety**: All imports are fully typed through virtual modules

## Common Patterns

### Pattern: Check if service is available

**Old:**
```typescript
try {
  const db = hubDatabase()
  // use db
} catch (e) {
  // not available
}
```

**New:**
```typescript
import { db } from 'hub:db'

// db is always available in server context
// If not configured, NuxtHub will throw clear error
```

### Pattern: Store and retrieve blob

**Old:**
```typescript
const blob = hubBlob()
const blobKey = `uploads/${fileId}`
await blob.put(blobKey, buffer)
const file = await blob.get(blobKey)
```

**New:**
```typescript
import { blob } from 'hub:blob'

const blobKey = `uploads/${fileId}`
await blob.put(blobKey, buffer)
const file = await blob.get(blobKey)
```

### Pattern: KV with TTL

**Old:**
```typescript
const kv = hubKV()
await kv.put('session:123', 'data', { expirationTtl: 3600 })
```

**New:**
```typescript
import { kv } from 'hub:kv'

await kv.set('session:123', 'data', { ttl: 3600 })
```

## Philosophy Changes

- **Multi-cloud first**: Support for Cloudflare, Vercel, AWS
- **Self-hosting recommended**: Less reliance on NuxtHub Admin
- **Drizzle ORM**: Standard ORM across all SQL databases
- **Type safety**: Full TypeScript support through virtual modules
