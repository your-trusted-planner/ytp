// Create an action item
import { nanoid } from 'nanoid'
import { useDrizzle, schema } from '../../db'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const body = await readBody(event)
  const db = useDrizzle()

  // Validate action type for ENGAGEMENT journeys
  if (body.stepId) {
    const { eq } = await import('drizzle-orm')

    // Fetch the journey step
    const step = await db.select()
      .from(schema.journeySteps)
      .where(eq(schema.journeySteps.id, body.stepId))
      .get()

    if (!step) {
      throw createError({
        statusCode: 404,
        message: 'Journey step not found'
      })
    }

    // Get the journey to check its type
    const journey = await db.select()
      .from(schema.journeys)
      .where(eq(schema.journeys.id, step.journeyId))
      .get()

    if (journey) {
      // Validate action type for ENGAGEMENT journeys
      const ALLOWED_ENGAGEMENT_ACTIONS = [
        'DRAFT_DOCUMENT', 'ESIGN', 'PAYMENT', 'MEETING',
        'REVIEW', 'UPLOAD', 'DECISION'
      ]

      if (journey.journeyType === 'ENGAGEMENT' &&
          !ALLOWED_ENGAGEMENT_ACTIONS.includes(body.actionType)) {
        throw createError({
          statusCode: 400,
          message: `Action type ${body.actionType} is not allowed for ENGAGEMENT journeys. Allowed types: ${ALLOWED_ENGAGEMENT_ACTIONS.join(', ')}`
        })
      }
    }
  }

  // Validate ESIGN action items require a documentId
  if (body.actionType === 'ESIGN') {
    const config = body.config || {}
    if (!config.documentId) {
      throw createError({
        statusCode: 400,
        message: 'ESIGN action items require a documentId in config'
      })
    }

    // Validate the document exists
    const { eq } = await import('drizzle-orm')
    const document = await db.select()
      .from(schema.documents)
      .where(eq(schema.documents.id, config.documentId))
      .get()

    if (!document) {
      throw createError({
        statusCode: 400,
        message: 'Document not found'
      })
    }

    // Validate document is ready or could become ready for signature
    if (document.status === 'SIGNED') {
      throw createError({
        statusCode: 400,
        message: 'Document has already been signed'
      })
    }

    // Set systemIntegrationType for ESIGN if not already set
    if (!body.systemIntegrationType) {
      body.systemIntegrationType = 'document'
    }
  }

  const actionItemId = nanoid()

  const actionItem = {
    id: actionItemId,
    stepId: body.stepId || null, // For template-level actions
    clientJourneyId: body.clientJourneyId || null, // For instance-level actions
    actionType: body.actionType, // QUESTIONNAIRE, DECISION, UPLOAD, REVIEW, ESIGN, NOTARY, PAYMENT, MEETING, KYC, AUTOMATION, THIRD_PARTY, OFFLINE_TASK, EXPENSE, FORM
    title: body.title,
    description: body.description || null,
    config: body.config ? JSON.stringify(body.config) : null,
    status: 'PENDING',
    assignedTo: body.assignedTo || 'CLIENT',
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    priority: body.priority || 'MEDIUM',

    // System integration fields
    systemIntegrationType: body.systemIntegrationType || null,
    resourceId: body.resourceId || null,
    automationHandler: body.automationHandler || null,

    // Verification fields
    isServiceDeliveryVerification: body.isServiceDeliveryVerification || false,
    verificationCriteria: body.verificationCriteria ? JSON.stringify(body.verificationCriteria) : null,
    verificationEvidence: null,

    completedAt: null,
    completedBy: null
  }

  await db.insert(schema.actionItems).values(actionItem)

  return {
    actionItem: {
      ...actionItem,
      dueDate: actionItem.dueDate?.getTime() || null
    }
  }
})



