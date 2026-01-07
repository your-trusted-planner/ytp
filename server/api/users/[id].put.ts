import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updateUserSchema = z.object({
  role: z.enum(['ADMIN', 'LAWYER', 'CLIENT', 'LEAD', 'PROSPECT']).optional(),
  status: z.enum(['PROSPECT', 'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE']).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  requireRole(event, ['ADMIN'])

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'User ID required'
    })
  }

  const body = await readBody(event)
  const result = updateUserSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error
    })
  }

  const { useDrizzle, schema } = await import('../../database')
  const db = useDrizzle()

  const updateData: any = {
    ...result.data,
    updatedAt: new Date()
  }

  await db
    .update(schema.users)
    .set(updateData)
    .where(eq(schema.users.id, id))

  return { success: true }
})
