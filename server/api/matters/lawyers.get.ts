// Get all lawyers for use in lead attorney dropdown
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const { useDrizzle, schema } = await import('../../database')
  const { eq, or } = await import('drizzle-orm')
  const db = useDrizzle()

  const lawyers = await db
    .select({
      id: schema.users.id,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      email: schema.users.email,
    })
    .from(schema.users)
    .where(
      or(
        eq(schema.users.role, 'LAWYER'),
        eq(schema.users.role, 'ADMIN')
      )
    )
    .all()

  return { lawyers }
})
