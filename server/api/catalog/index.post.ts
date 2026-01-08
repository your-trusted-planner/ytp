import { z } from 'zod'
import { isDatabaseAvailable } from '../../db'
import { requireRole, generateId } from '../../utils/auth'
import { mockDb } from '../../utils/mock-db'

const createCatalogItemSchema = z.object({
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
  const result = createCatalogItemSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error
    })
  }
  
  const { price, workflowSteps, ...rest } = result.data
  
  const newItem = {
    id: generateId(),
    ...rest,
    price: Math.round(price * 100), // Convert dollars to cents
    workflowSteps: workflowSteps ? JSON.stringify(workflowSteps) : null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  // Use mock database for local testing
  if (!isDatabaseAvailable()) {
    mockDb.matters.create(newItem) // Using mock matters as substitute for now
    return { success: true, item: newItem }
  }
  
  // Real database
  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()
  await db.insert(schema.serviceCatalog).values(newItem)
  
  return { success: true, item: newItem }
})


