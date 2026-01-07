// Create a new journey step
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const body = await readBody(event)
  const db = hubDatabase()
  
  const step = {
    id: nanoid(),
    journey_id: body.journeyId,
    step_type: body.stepType || 'MILESTONE', // MILESTONE or BRIDGE
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
    created_at: Date.now(),
    updated_at: Date.now()
  }

  await db.prepare(`
    INSERT INTO journey_steps (
      id, journey_id, step_type, name, description, step_order,
      responsible_party, expected_duration_days, automation_config,
      help_content, allow_multiple_iterations, is_final_step,
      requires_verification, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    step.id,
    step.journey_id,
    step.step_type,
    step.name,
    step.description,
    step.step_order,
    step.responsible_party,
    step.expected_duration_days,
    step.automation_config,
    step.help_content,
    step.allow_multiple_iterations,
    step.is_final_step,
    step.requires_verification,
    step.created_at,
    step.updated_at
  ).run()

  return { step }
})



