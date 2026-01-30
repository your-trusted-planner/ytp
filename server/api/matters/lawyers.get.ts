// Get all lawyers for use in lead attorney dropdown
import { requireRole } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])

  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Only return users with role explicitly set to 'LAWYER'
  // This excludes ADMIN users and users with null/undefined roles
  const lawyers = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.role, 'LAWYER'))
    .all()

  // Return both snake_case and camelCase for compatibility
  return {
    lawyers: lawyers.map(lawyer => ({
      id: lawyer.id,
      email: lawyer.email,
      role: lawyer.role,
      first_name: lawyer.firstName,
      last_name: lawyer.lastName,
      firstName: lawyer.firstName,
      lastName: lawyer.lastName,
      phone: lawyer.phone,
      avatar: lawyer.avatar,
      status: lawyer.status,
      created_at: lawyer.createdAt instanceof Date ? lawyer.createdAt.getTime() : lawyer.createdAt,
      updated_at: lawyer.updatedAt instanceof Date ? lawyer.updatedAt.getTime() : lawyer.updatedAt
    }))
  }
})
