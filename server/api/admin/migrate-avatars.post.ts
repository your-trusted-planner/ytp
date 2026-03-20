/**
 * POST /api/admin/migrate-avatars
 * One-time migration: convert external avatar URLs to base64 data URIs.
 * Safe to run multiple times — skips users who already have data URIs.
 */
import { useDrizzle, schema } from '../../db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Admin middleware auto-protects /api/admin/*
  const db = useDrizzle()

  const users = await db
    .select({ id: schema.users.id, avatar: schema.users.avatar })
    .from(schema.users)
    .all()

  let converted = 0
  let skipped = 0
  let failed = 0

  for (const user of users) {
    if (!user.avatar || !user.avatar.startsWith('http')) {
      skipped++
      continue
    }

    try {
      const response = await fetch(user.avatar)
      if (!response.ok) {
        failed++
        continue
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const buffer = await response.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
      const dataUri = `data:${contentType};base64,${base64}`

      await db
        .update(schema.users)
        .set({ avatar: dataUri })
        .where(eq(schema.users.id, user.id))

      converted++
    }
    catch {
      failed++
    }
  }

  return { success: true, converted, skipped, failed, total: users.length }
})
