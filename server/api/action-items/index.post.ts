// Create an action item
import { nanoid } from 'nanoid'
import { useDrizzle, schema } from '../../database'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const body = await readBody(event)
  const db = useDrizzle()

  // Validate action type for ENGAGEMENT journeys
  if (body.stepId) {
    const hubDb = hubDatabase()

    // Fetch the journey type via stepId
    const step = await hubDb.prepare(`
      SELECT js.*, j.journey_type
      FROM journey_steps js
      INNER JOIN journeys j ON js.journey_id = j.id
      WHERE js.id = ?
    `).bind(body.stepId).first()

    if (!step) {
      throw createError({
        statusCode: 404,
        message: 'Journey step not found'
      })
    }

    // Validate action type for ENGAGEMENT journeys
    const ALLOWED_ENGAGEMENT_ACTIONS = [
      'DRAFT_DOCUMENT', 'ESIGN', 'PAYMENT', 'MEETING',
      'REVIEW', 'UPLOAD', 'DECISION'
    ]

    if (step.journey_type === 'ENGAGEMENT' &&
        !ALLOWED_ENGAGEMENT_ACTIONS.includes(body.actionType)) {
      throw createError({
        statusCode: 400,
        message: `Action type ${body.actionType} is not allowed for ENGAGEMENT journeys. Allowed types: ${ALLOWED_ENGAGEMENT_ACTIONS.join(', ')}`
      })
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



