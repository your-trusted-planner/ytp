import { desc, eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const query = getQuery(event)
  const includeInactive = query.includeInactive === 'true'

  const db = useDrizzle()

  let partnersQuery = db
    .select()
    .from(schema.referralPartners)
    .orderBy(desc(schema.referralPartners.createdAt))

  if (!includeInactive) {
    partnersQuery = partnersQuery.where(eq(schema.referralPartners.isActive, true)) as typeof partnersQuery
  }

  const partners = await partnersQuery.all()

  return partners.map(partner => ({
    id: partner.id,
    name: partner.name,
    company: partner.company,
    type: partner.type,
    email: partner.email,
    phone: partner.phone,
    notes: partner.notes,
    isActive: partner.isActive,
    createdAt: partner.createdAt instanceof Date ? partner.createdAt.toISOString() : partner.createdAt,
    updatedAt: partner.updatedAt instanceof Date ? partner.updatedAt.toISOString() : partner.updatedAt
  }))
})
