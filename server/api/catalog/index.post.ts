import { z } from 'zod'
import { isDatabaseAvailable } from '../../db'
import { generateId } from '../../utils/auth'
import { requireRole } from '../../utils/rbac'
import { mockDb } from '../../utils/mock-db'

const createCatalogItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(['SINGLE', 'RECURRING', 'HOURLY']),
  price: z.number().min(0).optional().default(0), // Price in dollars, optional for HOURLY type
  duration: z.string().optional(), // MONTHLY, ANNUALLY, QUARTERLY
  defaultAttorneyRate: z.number().min(0).optional(), // Default attorney hourly rate in dollars (optional - falls back to user rate)
  defaultStaffRate: z.number().min(0).optional(), // Default staff hourly rate in dollars (optional - falls back to user rate)
  engagementLetterId: z.string().optional(),
  workflowSteps: z.array(z.string()).optional()
}).refine(
  (data) => {
    // HOURLY type: rates are optional (will fall back to user default rates)
    if (data.type === 'HOURLY') {
      return true
    }
    // Non-HOURLY types require price
    return data.price !== undefined && data.price > 0
  },
  {
    message: 'Non-hourly services require a price'
  }
)

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

  const { price = 0, workflowSteps, defaultAttorneyRate, defaultStaffRate, ...rest } = result.data

  const newItem = {
    id: generateId(),
    ...rest,
    price: Math.round(price * 100), // Convert dollars to cents
    defaultAttorneyRate: defaultAttorneyRate ? Math.round(defaultAttorneyRate * 100) : null,
    defaultStaffRate: defaultStaffRate ? Math.round(defaultStaffRate * 100) : null,
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
