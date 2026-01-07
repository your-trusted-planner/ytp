import { z } from 'zod'
import { sql, eq } from 'drizzle-orm'
import { isDatabaseAvailable } from '../../database'
import { requireRole, generateId } from '../../utils/auth'

const createMatterSchema = z.object({
  title: z.string().min(1),
  clientId: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['OPEN', 'CLOSED', 'PENDING']).default('PENDING'),
  contractDate: z.string().optional(), // ISO date string
  leadAttorneyId: z.string().optional(), // NEW
  engagementJourneyTemplateId: z.string().optional(), // NEW - journey template ID
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
  
  if (!isDatabaseAvailable()) {
    const mockMatter = {
      id: generateId(),
      ...result.data,
      matterNumber: `${new Date().getFullYear()}-001`,
      contractDate: result.data.contractDate ? new Date(result.data.contractDate) : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    return { success: true, matter: mockMatter } // Mock response
  }

  const { useDrizzle, schema } = await import('../../database')
  const db = useDrizzle()

  // Auto-generate matter number: YYYY-NNN format
  const currentYear = new Date().getFullYear()
  const yearStart = new Date(currentYear, 0, 1)
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59)

  // Count matters created this year
  const yearMatters = await db
    .select()
    .from(schema.matters)
    .where(sql`created_at >= ${yearStart.getTime() / 1000} AND created_at <= ${yearEnd.getTime() / 1000}`)
    .all()

  const nextNumber = (yearMatters.length + 1).toString().padStart(3, '0')
  const matterNumber = `${currentYear}-${nextNumber}`

  const newMatter = {
    id: generateId(),
    title: result.data.title,
    clientId: result.data.clientId,
    description: result.data.description,
    status: result.data.status,
    matterNumber,
    contractDate: result.data.contractDate ? new Date(result.data.contractDate) : undefined,
    leadAttorneyId: result.data.leadAttorneyId || null,
    engagementJourneyId: null, // Will be set if engagement journey template is selected
    createdAt: new Date(),
    updatedAt: new Date()
  }

  await db.insert(schema.matters).values(newMatter)

  // If engagement journey template is selected, create a clientJourney instance
  if (result.data.engagementJourneyTemplateId) {
    const clientJourneyId = generateId()

    await db.insert(schema.clientJourneys).values({
      id: clientJourneyId,
      clientId: result.data.clientId,
      matterId: newMatter.id,
      catalogId: null, // Engagement journeys are not tied to a specific service
      journeyId: result.data.engagementJourneyTemplateId,
      currentStepId: null,
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
      startedAt: null,
      completedAt: null,
      pausedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // Update matter with clientJourney reference
    await db.update(schema.matters)
      .set({ engagementJourneyId: clientJourneyId })
      .where(eq(schema.matters.id, newMatter.id))

    // Update the returned matter object to include the engagement journey ID
    newMatter.engagementJourneyId = clientJourneyId
  }

  return { success: true, matter: newMatter }
})
