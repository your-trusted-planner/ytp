import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])
  
  const db = useDrizzle()
  
  // Get all users who are clients
  const clientsData = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      phone: schema.users.phone,
      status: schema.users.status,
      createdAt: schema.users.createdAt,
      updatedAt: schema.users.updatedAt,
      profile: schema.clientProfiles
    })
    .from(schema.users)
    .leftJoin(schema.clientProfiles, eq(schema.users.id, schema.clientProfiles.userId))
    .where(eq(schema.users.role, 'CLIENT'))
    .all()

  // Transform to match frontend expectations
  const clients = clientsData.map(client => ({
    id: client.id,
    email: client.email,
    first_name: client.firstName,
    last_name: client.lastName,
    firstName: client.firstName,
    lastName: client.lastName,
    phone: client.phone,
    status: client.status,
    createdAt: client.createdAt instanceof Date ? client.createdAt.getTime() : client.createdAt,
    updatedAt: client.updatedAt instanceof Date ? client.updatedAt.getTime() : client.updatedAt,
    profile: client.profile ? {
      id: client.profile.id,
      user_id: client.profile.userId,
      date_of_birth: client.profile.dateOfBirth instanceof Date ? client.profile.dateOfBirth.getTime() : client.profile.dateOfBirth,
      address: client.profile.address,
      city: client.profile.city,
      state: client.profile.state,
      zip_code: client.profile.zipCode,
      has_minor_children: client.profile.hasMinorChildren ? 1 : 0,
      children_info: client.profile.childrenInfo,
      business_name: client.profile.businessName,
      business_type: client.profile.businessType,
      has_will: client.profile.hasWill ? 1 : 0,
      has_trust: client.profile.hasTrust ? 1 : 0,
      last_updated: client.profile.lastUpdated instanceof Date ? client.profile.lastUpdated.getTime() : client.profile.lastUpdated,
      assigned_lawyer_id: client.profile.assignedLawyerId,
      created_at: client.profile.createdAt instanceof Date ? client.profile.createdAt.getTime() : client.profile.createdAt,
      updated_at: client.profile.updatedAt instanceof Date ? client.profile.updatedAt.getTime() : client.profile.updatedAt
    } : null
  }))

  return { clients }
})
