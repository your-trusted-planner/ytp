import { z } from 'zod'
import { isDatabaseAvailable } from '../../database'
import { requireRole, generateId } from '../../utils/auth'
import { mockDb } from '../../utils/mock-db'

const createMatterSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(['SINGLE', 'RECURRING']),
  price: z.number().min(0), // Price in dollars (will convert to cents)
  duration: z.string().optional(), // MONTHLY, ANNUALLY, QUARTERLY
  engagementLetterId: z.string().optional(),
  workflowSteps: z.array(z.string()).optional()
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
  
  const { price, workflowSteps, ...rest } = result.data
  
  const newMatter = {
    id: generateId(),
    ...rest,
    price: Math.round(price * 100), // Convert dollars to cents
    workflowSteps: workflowSteps ? JSON.stringify(workflowSteps) : null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  // Use mock database for local testing
  if (!isDatabaseAvailable()) {
    mockDb.matters.create(newMatter)
    return { success: true, matter: newMatter }
  }
  
  // Real database
  const { useDrizzle, schema } = await import('../../database')
  const db = useDrizzle()
  await db.insert(schema.matters).values(newMatter)
  
  return { success: true, matter: newMatter }
})



