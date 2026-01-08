// Create a new journey step
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const body = await readBody(event)
  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  const stepId = nanoid()
  const now = new Date()

  await db.insert(schema.journeySteps).values({
    id: stepId,
    journeyId: body.journeyId,
    stepType: body.stepType || 'MILESTONE', // MILESTONE or BRIDGE
    name: body.name,
    description: body.description || null,
    stepOrder: body.stepOrder || 0,
    responsibleParty: body.responsibleParty || 'CLIENT',
    expectedDurationDays: body.expectedDurationDays || null,
    automationConfig: body.automationConfig ? JSON.stringify(body.automationConfig) : null,
    helpContent: body.helpContent || null,
    allowMultipleIterations: body.allowMultipleIterations ? true : false,
    isFinalStep: body.isFinalStep ? true : false,
    requiresVerification: body.requiresVerification ? true : false,
    createdAt: now,
    updatedAt: now
  })

  // Return step object for API compatibility
  return {
    step: {
      id: stepId,
      journey_id: body.journeyId,
      step_type: body.stepType || 'MILESTONE',
      name: body.name,
      description: body.description || null,
      step_order: body.stepOrder || 0,
      responsible_party: body.responsibleParty || 'CLIENT',
      expected_duration_days: body.expectedDurationDays || null,
      automation_config: body.automationConfig ? JSON.stringify(body.automationConfig) : null,
      help_content: body.helpContent || null,
      allow_multiple_iterations: body.allowMultipleIterations ? 1 : 0,
      is_final_step: body.isFinalStep ? 1 : 0,
      requires_verification: body.requiresVerification ? 1 : 0,
      created_at: now.getTime(),
      updated_at: now.getTime()
    }
  }
})



