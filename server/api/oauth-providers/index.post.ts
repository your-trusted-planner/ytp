import { z } from 'zod'
import { generateId } from '../../utils/auth'

const createProviderSchema = z.object({
  providerId: z.string().min(1, 'Provider ID is required'),
  name: z.string().min(1, 'Name is required'),
  logoUrl: z.string().optional(),
  buttonColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color').default('#4285F4'),
  isEnabled: z.boolean().default(false),
  displayOrder: z.number().int().default(0)
})

export default defineEventHandler(async (event) => {
  requireRole(event, ['ADMIN'])

  const body = await readBody(event)
  const result = createProviderSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error
    })
  }

  const { useDrizzle, schema } = await import('../../database')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Check if provider_id already exists
  const existing = await db
    .select()
    .from(schema.oauthProviders)
    .where(eq(schema.oauthProviders.providerId, result.data.providerId))
    .get()

  if (existing) {
    throw createError({
      statusCode: 400,
      message: 'Provider ID already exists'
    })
  }

  const providerId = generateId()

  await db.insert(schema.oauthProviders).values({
    id: providerId,
    providerId: result.data.providerId,
    name: result.data.name,
    logoUrl: result.data.logoUrl || null,
    buttonColor: result.data.buttonColor,
    isEnabled: result.data.isEnabled,
    displayOrder: result.data.displayOrder,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  return {
    success: true,
    providerId
  }
})
