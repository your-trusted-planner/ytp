import { z } from 'zod'
import { useDrizzle, schema } from '../../database'
import { requireRole, generateId } from '../../utils/auth'

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
  const db = useDrizzle()
  
  const newMatter = {
    id: generateId(),
    ...rest,
    price: Math.round(price * 100), // Convert dollars to cents
    workflowSteps: workflowSteps ? JSON.stringify(workflowSteps) : null
  }
  
  await db.insert(schema.matters).values(newMatter)
  
  return { success: true, matter: newMatter }
})

