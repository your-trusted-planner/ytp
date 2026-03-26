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
        'REVIEW', 'UPLOAD', 'DECISION', 'FORM', 'QUESTIONNAIRE', 'WET_SIGN'
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

  // Validate MEETING action items require appointmentTypeId and completionTrigger
  if (body.actionType === 'MEETING') {
    const config = body.config || {}
    if (!config.appointmentTypeId) {
      throw createError({
        statusCode: 400,
        message: 'MEETING action items require an appointmentTypeId in config'
      })
    }
    if (!config.completionTrigger || !['SCHEDULED', 'COMPLETED'].includes(config.completionTrigger)) {
      throw createError({
        statusCode: 400,
        message: 'MEETING action items require a completionTrigger in config (SCHEDULED or COMPLETED)'
      })
    }

    // Validate the appointment type exists
    const { eq } = await import('drizzle-orm')
    const appointmentType = await db.select()
      .from(schema.appointmentTypes)
      .where(eq(schema.appointmentTypes.id, config.appointmentTypeId))
      .get()

    if (!appointmentType) {
      throw createError({
        statusCode: 400,
        message: 'Appointment type not found'
      })
    }

    // Auto-set systemIntegrationType for MEETING
    if (!body.systemIntegrationType) {
      body.systemIntegrationType = 'calendar'
    }
  }

  // Validate WET_SIGN action items require at least one document
  if (body.actionType === 'WET_SIGN') {
    const config = body.config || {}
    if (!Array.isArray(config.documents) || config.documents.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'WET_SIGN action items require at least one document in config'
      })
    }
    for (const doc of config.documents) {
      if (!doc.label || typeof doc.label !== 'string') {
        throw createError({
          statusCode: 400,
          message: 'Each WET_SIGN document must have a label'
        })
      }
    }
    if (!body.systemIntegrationType) {
      body.systemIntegrationType = 'document'
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
