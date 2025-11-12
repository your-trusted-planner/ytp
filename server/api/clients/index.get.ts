import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])
  
  const db = useDrizzle()
  
  // Get all users who are clients
  const clients = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      phone: schema.users.phone,
      status: schema.users.status,
      createdAt: schema.users.createdAt,
      profile: schema.clientProfiles
    })
    .from(schema.users)
    .leftJoin(schema.clientProfiles, eq(schema.users.id, schema.clientProfiles.userId))
    .where(eq(schema.users.role, 'CLIENT'))
    .all()
  
  return clients
})

