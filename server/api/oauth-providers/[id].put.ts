import { z } from 'zod'
import { eq } from 'drizzle-orm'

const updateProviderSchema = z.object({
  providerId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  logoUrl: z.string().optional(),
  buttonColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color').optional(),
  isEnabled: z.boolean().optional(),
  displayOrder: z.number().int().optional()
})

export default defineEventHandler(async (event) => {
  requireRole(event, ['ADMIN'])

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Provider ID required'
    })
  }

  const body = await readBody(event)
  const result = updateProviderSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error
    })
  }

  const { useDrizzle, schema } = await import('../../database')
  const db = useDrizzle()

  // Check if provider exists
  const provider = await db
    .select()
    .from(schema.oauthProviders)
    .where(eq(schema.oauthProviders.id, id))
    .get()

  if (!provider) {
    throw createError({
      statusCode: 404,
      message: 'Provider not found'
    })
  }

  // Update provider
  const updateData: any = {
    ...result.data,
    updatedAt: new Date()
  }

  await db
    .update(schema.oauthProviders)
    .set(updateData)
    .where(eq(schema.oauthProviders.id, id))

  return { success: true }
})
