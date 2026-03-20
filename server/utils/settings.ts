import { eq } from 'drizzle-orm'

/**
 * Get a setting value by key. Returns null if not found.
 */
export async function getSetting(key: string): Promise<string | null> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  const row = await db
    .select({ value: schema.settings.value })
    .from(schema.settings)
    .where(eq(schema.settings.key, key))
    .get()

  return row?.value ?? null
}

/**
 * Set a setting value by key. Creates or updates.
 */
export async function setSetting(key: string, value: string, description?: string): Promise<void> {
  const { useDrizzle, schema } = await import('../db')
  const { generateId } = await import('./auth')
  const db = useDrizzle()

  const existing = await db
    .select({ id: schema.settings.id })
    .from(schema.settings)
    .where(eq(schema.settings.key, key))
    .get()

  const now = new Date()

  if (existing) {
    await db.update(schema.settings)
      .set({ value, updatedAt: now })
      .where(eq(schema.settings.id, existing.id))
  }
  else {
    await db.insert(schema.settings).values({
      id: generateId(),
      key,
      value,
      description: description || null,
      createdAt: now,
      updatedAt: now
    })
  }
}
