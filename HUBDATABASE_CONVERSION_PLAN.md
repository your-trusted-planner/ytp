# hubDatabase() → useDrizzle() Conversion Plan

**Total Files:** 77
**Status:** Ready to begin systematic conversion

## Conversion Pattern

### OLD (hubDatabase with raw SQL):
```typescript
const db = hubDatabase()
const results = await db.prepare(`
  SELECT * FROM users WHERE id = ?
`).bind(userId).first()
```

### NEW (Drizzle ORM):
```typescript
const { useDrizzle, schema } = await import('../../database')
const { eq } = await import('drizzle-orm')
const db = useDrizzle()
const results = await db.select()
  .from(schema.users)
  .where(eq(schema.users.id, userId))
  .get()  // .get() for single, .all() for multiple
```

## File Categories (77 files)

### 1. Journey Management (18 files)
- `/api/journeys/` - 9 files
- `/api/journey-steps/` - 4 files
- `/api/client-journeys/` - 5 files

### 2. Snapshot Management (5 files)
- `/api/snapshots/` - 5 files

### 3. Document Management (11 files)
- `/api/documents/` - 7 files
- `/api/document-uploads/` - 4 files

### 4. Client Management (8 files)
- `/api/clients/` - 8 files (including relationships)

### 5. Matter Management (5 files)
- `/api/matters/` - 5 files (including relationships)

### 6. Template Management (5 files)
- `/api/templates/` - 5 files

### 7. Admin & Seeding (3 files)
- `/api/admin/` - 2 files
- `/api/seed-remote.post.ts` - 1 file

### 8. Attorney Tools (4 files)
- `/api/attorney/` - 4 files

### 9. Bridge Conversations (2 files)
- `/api/bridge-conversations/` - 2 files

### 10. Miscellaneous (16 files)
- `/api/_dev/` - 3 files
- `/api/action-items/` - 1 file
- `/api/ai/` - 1 file
- `/api/faq/` - 2 files
- `/api/payments/` - 1 file
- `/api/public/booking/` - 1 file
- `/api/service-catalog/` - 1 file
- `/api/setup/` - 1 file
- `/api/webhooks/` - 1 file

## Conversion Strategy

### Phase 1: Core User-Facing Features (High Priority)
Convert endpoints that clients and attorneys use daily:
1. Documents (11 files)
2. Client Journeys (5 files) - Already partially done
3. Snapshots (5 files)
4. Matters (5 files)

**Subtotal: 26 files**

### Phase 2: Configuration & Management (Medium Priority)
Convert admin and configuration endpoints:
1. Journey Templates (9 files)
2. Journey Steps (4 files)
3. Templates (5 files)
4. Clients (8 files)

**Subtotal: 26 files**

### Phase 3: Supporting Features (Lower Priority)
Convert supporting and less-used endpoints:
1. Attorney Tools (4 files)
2. Action Items (1 file)
3. Bridge Conversations (2 files)
4. FAQ (2 files)
5. Payments (1 file)
6. Service Catalog (1 file)

**Subtotal: 11 files**

### Phase 4: Development & Setup (Last)
Convert dev tools and setup:
1. Admin/Seeding (3 files)
2. Dev endpoints (3 files)
3. Setup (1 file)
4. Public booking (1 file)
5. Webhooks (1 file)
6. AI (1 file)

**Subtotal: 10 files**

### Phase 5: Verify & Test
- Search for any remaining `hubDatabase()` calls
- Test critical paths
- Ensure all conversions follow the same pattern

## Common SQL → Drizzle Patterns

### SELECT with WHERE
```typescript
// OLD
const result = await db.prepare(`
  SELECT * FROM users WHERE email = ?
`).bind(email).first()

// NEW
const result = await db.select()
  .from(schema.users)
  .where(eq(schema.users.email, email))
  .get()
```

### SELECT with JOIN
```typescript
// OLD
const results = await db.prepare(`
  SELECT u.*, cp.* FROM users u
  LEFT JOIN client_profiles cp ON u.id = cp.user_id
  WHERE u.id = ?
`).bind(userId).all()

// NEW
const results = await db.select()
  .from(schema.users)
  .leftJoin(schema.clientProfiles, eq(schema.users.id, schema.clientProfiles.userId))
  .where(eq(schema.users.id, userId))
  .all()
```

### INSERT
```typescript
// OLD
await db.prepare(`
  INSERT INTO users (id, email, password) VALUES (?, ?, ?)
`).bind(id, email, password).run()

// NEW
await db.insert(schema.users).values({
  id,
  email,
  password
})
```

### UPDATE
```typescript
// OLD
await db.prepare(`
  UPDATE users SET email = ?, updated_at = ? WHERE id = ?
`).bind(email, Date.now(), userId).run()

// NEW
await db.update(schema.users)
  .set({ email, updatedAt: new Date() })
  .where(eq(schema.users.id, userId))
```

### DELETE
```typescript
// OLD
await db.prepare(`
  DELETE FROM users WHERE id = ?
`).bind(userId).run()

// NEW
await db.delete(schema.users)
  .where(eq(schema.users.id, userId))
```

### Complex queries with multiple conditions
```typescript
// OLD
const results = await db.prepare(`
  SELECT * FROM journeys
  WHERE is_active = 1 AND journey_type = ?
  ORDER BY name ASC
`).bind(journeyType).all()

// NEW
import { and } from 'drizzle-orm'
const results = await db.select()
  .from(schema.journeys)
  .where(and(
    eq(schema.journeys.isActive, true),
    eq(schema.journeys.journeyType, journeyType)
  ))
  .orderBy(schema.journeys.name)
  .all()
```

## Notes

- Some complex queries may need to remain as raw SQL if Drizzle doesn't handle them well
- Use `db.run(sql`...`)` for raw SQL when absolutely necessary
- Keep the same import pattern consistent: `const { useDrizzle, schema } = await import('../../database')`
- Import operators from 'drizzle-orm': `eq`, `and`, `or`, `lt`, `gt`, etc.

## Tracking Progress

Update this file as you complete each phase, marking files as converted.
