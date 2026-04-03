/**
 * POST /api/admin/seed-message-templates
 *
 * Seeds the default message templates into the database.
 * Uses onConflictDoNothing so it's safe to run multiple times.
 *
 * Requires: adminLevel >= 2
 */

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || (user.adminLevel ?? 0) < 2) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const { useDrizzle } = await import('../../db')
  const { seedMessageTemplates } = await import('../../db/seed/message-templates')

  const db = useDrizzle()
  await seedMessageTemplates(db as any)

  return {
    success: true,
    message: 'Message templates seeded successfully'
  }
})
