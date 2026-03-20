import { z } from 'zod'
import { useDrizzle, schema } from '../../../db'
import { generateId } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity-logger'

const createSchema = z.object({
  name: z.string().min(1).max(200),
  building: z.string().max(200).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  capacity: z.number().int().min(1).max(999).nullable().optional(),
  calendarEmail: z.string().email().max(320).nullable().optional(),
  calendarProvider: z.enum(['google', 'microsoft']).default('google'),
  description: z.string().max(2000).nullable().optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0)
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = createSchema.parse(body)
  const user = event.context.user

  const db = useDrizzle()
  const id = generateId()
  const now = new Date()

  await db.insert(schema.rooms).values({
    id,
    name: data.name,
    building: data.building || null,
    address: data.address || null,
    capacity: data.capacity || null,
    calendarEmail: data.calendarEmail || null,
    calendarProvider: data.calendarProvider,
    description: data.description || null,
    isActive: data.isActive,
    displayOrder: data.displayOrder,
    createdAt: now,
    updatedAt: now
  })

  await logActivity({
    type: 'ROOM_CREATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'room', id, name: data.name },
    event
  })

  return { success: true, id }
})
