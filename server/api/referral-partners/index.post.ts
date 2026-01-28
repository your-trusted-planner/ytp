import { z } from 'zod'
import { useDrizzle, schema } from '../../db'
import { generateId } from '../../utils/auth'
import { logActivity } from '../../utils/activity-logger'

const createPartnerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  company: z.string().optional(),
  type: z.enum(['CPA', 'ATTORNEY', 'FINANCIAL_ADVISOR', 'ORGANIZATION', 'OTHER']),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['LAWYER', 'STAFF', 'ADMIN'])

  const body = await readBody(event)
  const validated = createPartnerSchema.parse(body)

  const db = useDrizzle()
  const now = new Date()
  const id = generateId()

  await db.insert(schema.referralPartners).values({
    id,
    name: validated.name,
    company: validated.company || null,
    type: validated.type,
    email: validated.email || null,
    phone: validated.phone || null,
    notes: validated.notes || null,
    isActive: true,
    createdAt: now,
    updatedAt: now
  })

  // Log activity
  await logActivity({
    type: 'REFERRAL_PARTNER_CREATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'referral_partner', id: id, name: validated.name },
    event,
    details: {
      partnerType: validated.type,
      company: validated.company
    }
  })

  return {
    success: true,
    id,
    message: 'Referral partner created successfully'
  }
})
