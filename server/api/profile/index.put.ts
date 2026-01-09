import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDrizzle, schema } from '../../db'

const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)

  const body = await readBody(event)
  
  const result = updateProfileSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input'
    })
  }
  
  const db = useDrizzle()
  
  await db
    .update(schema.users)
    .set({
      ...result.data,
      updatedAt: new Date()
    })
    .where(eq(schema.users.id, user.id))
  
  return { success: true }
})

