import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { logActivity } from '../../../utils/activity-logger'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  building: z.string().max(200).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  capacity: z.number().int().min(1).max(999).nullable().optional(),
  calendarEmail: z.string().email().max(320).nullable().optional(),
  calendarProvider: z.enum(['google', 'microsoft']).optional(),
  description: z.string().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional()
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const body = await readBody(event)
  const data = updateSchema.parse(body)
  const user = event.context.user

  const db = useDrizzle()

  const existing = await db
    .select({ id: schema.rooms.id, name: schema.rooms.name })
    .from(schema.rooms)
    .where(eq(schema.rooms.id, id))
    .get()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Room not found' })
  }

  const updates: Record<string, any> = { updatedAt: new Date() }
  if (data.name !== undefined) updates.name = data.name
  if (data.building !== undefined) updates.building = data.building
  if (data.address !== undefined) updates.address = data.address
  if (data.capacity !== undefined) updates.capacity = data.capacity
  if (data.calendarEmail !== undefined) updates.calendarEmail = data.calendarEmail
  if (data.calendarProvider !== undefined) updates.calendarProvider = data.calendarProvider
  if (data.description !== undefined) updates.description = data.description
  if (data.isActive !== undefined) updates.isActive = data.isActive
  if (data.displayOrder !== undefined) updates.displayOrder = data.displayOrder

  await db.update(schema.rooms).set(updates).where(eq(schema.rooms.id, id))

  await logActivity({
    type: 'ROOM_UPDATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'room', id, name: data.name || existing.name },
    event,
    details: { changes: Object.keys(data) }
  })

  return { success: true }
})
