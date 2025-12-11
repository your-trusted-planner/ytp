import { z } from 'zod'
import { isDatabaseAvailable } from '../../database'
import { requireRole, generateId } from '../../utils/auth'

const createMatterSchema = z.object({
  title: z.string().min(1),
  clientId: z.string().min(1),
  matterNumber: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['OPEN', 'CLOSED', 'PENDING']).default('OPEN'),
  contractDate: z.string().optional(), // ISO date string
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])
  
  const body = await readBody(event)
  const result = createMatterSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error
    })
  }
  
  const newMatter = {
    id: generateId(),
    ...result.data,
    contractDate: result.data.contractDate ? new Date(result.data.contractDate) : undefined,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  if (!isDatabaseAvailable()) {
    return { success: true, matter: newMatter } // Mock response
  }
  
  const { useDrizzle, schema } = await import('../../database')
  const db = useDrizzle()
  await db.insert(schema.matters).values(newMatter)
  
  return { success: true, matter: newMatter }
})
