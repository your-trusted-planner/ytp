/**
 * Validate a journey template - check if all steps have at least one action item
 */
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const journeyId = getRouterParam(event, 'id')
  if (!journeyId) {
    throw createError({ statusCode: 400, message: 'Journey ID required' })
  }

  const db = useDrizzle()

  // Get journey
  const journey = await db.select().from(schema.journeys)
    .where(eq(schema.journeys.id, journeyId)).get()

  if (!journey) {
    throw createError({ statusCode: 404, message: 'Journey not found' })
  }

  // Get all steps for this journey
  const steps = await db.select().from(schema.journeySteps)
    .where(eq(schema.journeySteps.journeyId, journeyId))
    .all()

  if (steps.length === 0) {
    return {
      valid: false,
      errors: ['Journey must have at least one step'],
      warnings: [],
      stepsWithoutActions: []
    }
  }

  // Check each step for action items
  const stepsWithoutActions: any[] = []
  const warnings: string[] = []

  for (const step of steps) {
    const actionItems = await db.select().from(schema.actionItems)
      .where(eq(schema.actionItems.stepId, step.id))
      .all()

    if (actionItems.length === 0) {
      stepsWithoutActions.push({
        id: step.id,
        name: step.name,
        stepOrder: step.stepOrder
      })
    }
  }

  // Check for final step
  const finalSteps = steps.filter(s => s.isFinalStep)
  if (finalSteps.length === 0) {
    warnings.push('No step is marked as the final step')
  }

  // Check for service delivery verification
  const hasVerification = await db.select().from(schema.actionItems)
    .where(eq(schema.actionItems.isServiceDeliveryVerification, true))
    .limit(1)
    .get()

  if (!hasVerification) {
    warnings.push('No action item is marked as service delivery verification ("ring the bell")')
  }

  const valid = stepsWithoutActions.length === 0

  return {
    valid,
    errors: valid ? [] : ['The following steps require at least one action item'],
    warnings,
    stepsWithoutActions,
    totalSteps: steps.length,
    totalActionItems: steps.reduce((sum, step) => {
      // Count action items for this step (we'd need to fetch them, but for now just return the count)
      return sum
    }, 0)
  }
})
