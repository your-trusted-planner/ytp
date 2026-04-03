/**
 * Journey Initiator — creates client records if needed, starts an engagement journey,
 * instantiates action items from the template, and logs the activity.
 *
 * Used by:
 * - Appointment creation (auto-initiate when appointment type has journeyTemplateId)
 * - Manual "Start Engagement Journey" from client detail page
 * - Matter creation with engagement journey template
 */
import { nanoid } from 'nanoid'
import { eq, and, inArray, asc, ne } from 'drizzle-orm'
import { useDrizzle, schema } from '../db'
import { logActivity } from './activity-logger'
import { hashPassword } from './auth'
import { triggerAccountInvitation, triggerJourneyStarted, triggerActionItemAssigned } from './message-triggers'

interface InitiateOptions {
  personId: string
  journeyTemplateId: string
  appointmentId?: string
  matterId?: string
  initiatedBy: string // user ID of staff member who triggered this
  event?: any // H3 event for activity logging
}

interface InitiateResult {
  clientJourneyId: string
  clientId: string // clients table ID
  userId: string // users table ID
  created: {
    user: boolean
    client: boolean
  }
  actionItemsCreated: number
}

export async function initiateEngagementJourney(options: InitiateOptions): Promise<InitiateResult> {
  const db = useDrizzle()
  const now = new Date()
  const created = { user: false, client: false }

  // 1. Verify the journey template exists and is an active ENGAGEMENT journey
  const journey = await db.select()
    .from(schema.journeys)
    .where(eq(schema.journeys.id, options.journeyTemplateId))
    .get()

  if (!journey) {
    throw new Error(`Journey template ${options.journeyTemplateId} not found`)
  }
  if (journey.journeyType !== 'ENGAGEMENT') {
    throw new Error(`Journey ${options.journeyTemplateId} is not an ENGAGEMENT journey`)
  }
  if (!journey.isActive) {
    throw new Error(`Journey ${options.journeyTemplateId} is not active`)
  }

  // 2. Verify the person exists
  const person = await db.select()
    .from(schema.people)
    .where(eq(schema.people.id, options.personId))
    .get()

  if (!person) {
    throw new Error(`Person ${options.personId} not found`)
  }

  // 3. Ensure user record exists (role: CLIENT)
  let userId: string
  const existingUser = await db.select({ id: schema.users.id })
    .from(schema.users)
    .where(and(
      eq(schema.users.personId, options.personId),
      eq(schema.users.role, 'CLIENT')
    ))
    .get()

  if (existingUser) {
    userId = existingUser.id
  } else {
    // Check if any user exists for this person (non-CLIENT role)
    const anyUser = await db.select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.personId, options.personId))
      .get()

    if (anyUser) {
      // Person has a user account with a different role — use it
      userId = anyUser.id
    } else {
      // Create a new user account with a random password (no portal access until password reset)
      userId = nanoid()
      const randomPassword = nanoid(32)
      const hashedPw = await hashPassword(randomPassword)

      await db.insert(schema.users).values({
        id: userId,
        personId: options.personId,
        email: person.email || `${userId}@placeholder.internal`,
        firstName: person.firstName || '',
        lastName: person.lastName || '',
        phone: person.phone || null,
        password: hashedPw,
        role: 'CLIENT',
        status: 'ACTIVE',
        adminLevel: 0
      })
      created.user = true

      // Send account invitation email with set-password link (fire-and-forget)
      if (person.email) {
        triggerAccountInvitation({
          userId,
          personId: options.personId,
          event: options.event
        })
      }
    }
  }

  // 4. Ensure client record exists
  let clientId: string
  const existingClient = await db.select({ id: schema.clients.id })
    .from(schema.clients)
    .where(eq(schema.clients.personId, options.personId))
    .get()

  if (existingClient) {
    clientId = existingClient.id
  } else {
    clientId = nanoid()
    await db.insert(schema.clients).values({
      id: clientId,
      personId: options.personId,
      status: 'PROSPECTIVE',
      createdAt: now,
      updatedAt: now
    })
    created.client = true
  }

  // 5. Check for duplicate journey — don't start a second one of the same template
  const existingJourney = await db.select({ id: schema.clientJourneys.id })
    .from(schema.clientJourneys)
    .where(and(
      eq(schema.clientJourneys.clientId, userId),
      eq(schema.clientJourneys.journeyId, options.journeyTemplateId),
      inArray(schema.clientJourneys.status, ['NOT_STARTED', 'IN_PROGRESS'])
    ))
    .get()

  if (existingJourney) {
    // Journey already active for this client — return existing, don't create duplicate
    return {
      clientJourneyId: existingJourney.id,
      clientId,
      userId,
      created,
      actionItemsCreated: 0
    }
  }

  // 6. Get journey steps in order
  const steps = await db.select()
    .from(schema.journeySteps)
    .where(eq(schema.journeySteps.journeyId, options.journeyTemplateId))
    .orderBy(asc(schema.journeySteps.stepOrder))
    .all()

  const firstStep = steps[0] || null

  // 7. Create clientJourney
  const clientJourneyId = nanoid()
  await db.insert(schema.clientJourneys).values({
    id: clientJourneyId,
    clientId: userId,
    matterId: options.matterId || null,
    catalogId: null, // Engagement journeys are not tied to a specific service
    journeyId: options.journeyTemplateId,
    currentStepId: firstStep?.id || null,
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    startedAt: now,
    completedAt: null,
    pausedAt: null,
    createdAt: now,
    updatedAt: now
  })

  // 7b. Send journey started notification (fire-and-forget)
  triggerJourneyStarted({
    journeyName: journey.name,
    personId: options.personId,
    clientJourneyId,
    event: options.event
  })

  // 8. Create step progress for the first step
  if (firstStep) {
    await db.insert(schema.journeyStepProgress).values({
      id: nanoid(),
      clientJourneyId,
      stepId: firstStep.id,
      status: 'IN_PROGRESS',
      clientApproved: false,
      attorneyApproved: false,
      iterationCount: 0,
      startedAt: now,
      createdAt: now,
      updatedAt: now
    })
  }

  // 9. Instantiate action items from template
  let actionItemsCreated = 0
  if (steps.length > 0) {
    const stepIds = steps.map(s => s.id)

    // Get all template-level action items for this journey's steps
    const templateItems = await db.select()
      .from(schema.actionItems)
      .where(inArray(schema.actionItems.stepId, stepIds))
      .all()

    for (const item of templateItems) {
      // Skip items that already have a clientJourneyId (instance-level items from other journeys)
      if (item.clientJourneyId) continue

      await db.insert(schema.actionItems).values({
        id: nanoid(),
        stepId: item.stepId, // Keep stepId for grouping by step
        clientJourneyId, // Set instance-level reference
        actionType: item.actionType,
        title: item.title,
        description: item.description,
        config: item.config,
        status: 'PENDING',
        assignedTo: item.assignedTo,
        dueDate: null,
        priority: item.priority,
        systemIntegrationType: item.systemIntegrationType,
        resourceId: null,
        automationHandler: item.automationHandler,
        isServiceDeliveryVerification: item.isServiceDeliveryVerification,
        verificationCriteria: item.verificationCriteria,
        verificationEvidence: null,
        completedAt: null,
        completedBy: null,
        createdAt: now,
        updatedAt: now
      })
      actionItemsCreated++

      // Notify client about assigned action items (fire-and-forget)
      if (item.assignedTo === 'CLIENT' && person.email) {
        triggerActionItemAssigned({
          actionItemTitle: item.title,
          actionType: item.actionType,
          personId: options.personId,
          clientJourneyId,
          event: options.event
        })
      }
    }
  }

  // 10. Log activity
  const personName = [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Unknown'
  await logActivity({
    type: 'JOURNEY_STARTED',
    userId: options.initiatedBy,
    userRole: 'ADMIN', // Will be overridden by actual user role in most cases
    target: { type: 'client', id: clientId, name: personName },
    relatedEntities: [
      { type: 'journey', id: clientJourneyId, name: journey.name }
    ],
    event: options.event,
    details: {
      journeyTemplateName: journey.name,
      journeyType: 'ENGAGEMENT',
      userCreated: created.user,
      clientCreated: created.client,
      actionItemsInstantiated: actionItemsCreated,
      triggeredByAppointment: options.appointmentId || null
    }
  })

  return {
    clientJourneyId,
    clientId,
    userId,
    created,
    actionItemsCreated
  }
}
