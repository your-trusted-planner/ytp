import { z } from 'zod'
import { useDrizzle, schema } from '../../database'
import { generateId } from '../../utils/auth'

const createAppointmentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().optional(),
  clientId: z.string()
})

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const body = await readBody(event)
  
  const result = createAppointmentSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input'
    })
  }
  
  const { title, description, startTime, endTime, location, clientId } = result.data
  const db = useDrizzle()
  
  await db.insert(schema.appointments).values({
    id: generateId(),
    title,
    description,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    location,
    clientId,
    status: 'PENDING'
  })
  
  return { success: true }
})

