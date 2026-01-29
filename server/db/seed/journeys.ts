import { eq } from 'drizzle-orm'
import { schema } from '../index'
import { SEED_IDS } from './constants'
import type { SeedDb, SeedDates, SeedUserIds, SeedMatterIds, SeedServiceIds, SeedJourneyIds } from './types'

export async function seedJourneys(
  db: SeedDb,
  dates: SeedDates,
  userIds: SeedUserIds,
  matterIds: SeedMatterIds,
  serviceIds: SeedServiceIds
): Promise<SeedJourneyIds> {
  console.log('Seeding journeys...')

  const { now, oneWeekAgo, oneMonthAgo, twoMonthsAgo, threeMonthsAgo } = dates
  const { client1Id, client2Id, client3Id, lawyerId } = userIds
  const { matter1Id, matter2Id, matter3Id } = matterIds
  const { service1Id } = serviceIds

  // Fixed IDs from constants
  const journeyId = SEED_IDS.journey.wydapt
  const step1Id = SEED_IDS.journey.step1
  const step2Id = SEED_IDS.journey.step2
  const step3Id = SEED_IDS.journey.step3
  const step4Id = SEED_IDS.journey.step4
  const step5Id = SEED_IDS.journey.step5
  const step6Id = SEED_IDS.journey.step6
  const step7Id = SEED_IDS.journey.step7
  const clientJourney1Id = SEED_IDS.clientJourneys.jane
  const clientJourney2Id = SEED_IDS.clientJourneys.sarah
  const clientJourney3Id = SEED_IDS.clientJourneys.michael

  // Journey template
  await db.insert(schema.journeys).values({
    id: journeyId,
    name: 'Wyoming Asset Protection Trust',
    description: 'Complete WYDAPT engagement workflow from initial consultation to trust completion',
    journeyType: 'SERVICE',
    isActive: true,
    estimatedDurationDays: 90,
    createdAt: threeMonthsAgo,
    updatedAt: threeMonthsAgo
  }).onConflictDoNothing()

  // For junction table with composite key, delete then insert
  await db.delete(schema.journeysToCatalog).where(eq(schema.journeysToCatalog.journeyId, journeyId))
  await db.insert(schema.journeysToCatalog).values({
    journeyId,
    catalogId: service1Id,
    createdAt: threeMonthsAgo
  })

  // Journey Steps
  await db.insert(schema.journeySteps).values({
    id: step1Id,
    journeyId,
    stepType: 'MILESTONE',
    name: 'Engagement',
    description: 'Sign engagement agreement and pay initial deposit',
    stepOrder: 1,
    responsibleParty: 'CLIENT',
    expectedDurationDays: 3,
    isFinalStep: false,
    requiresVerification: false
  }).onConflictDoNothing()

  await db.insert(schema.journeySteps).values({
    id: step2Id,
    journeyId,
    stepType: 'MILESTONE',
    name: 'Client Intake',
    description: 'Complete intake questionnaire and provide required documents',
    stepOrder: 2,
    responsibleParty: 'CLIENT',
    expectedDurationDays: 7,
    isFinalStep: false,
    requiresVerification: false
  }).onConflictDoNothing()

  await db.insert(schema.journeySteps).values({
    id: step3Id,
    journeyId,
    stepType: 'BRIDGE',
    name: 'Document Review',
    description: 'Review draft trust documents and provide feedback',
    stepOrder: 3,
    responsibleParty: 'BOTH',
    expectedDurationDays: 14,
    allowMultipleIterations: true,
    isFinalStep: false,
    requiresVerification: false
  }).onConflictDoNothing()

  await db.insert(schema.journeySteps).values({
    id: step4Id,
    journeyId,
    stepType: 'MILESTONE',
    name: 'Entity Formation',
    description: 'LLC formation and trust entity setup with Wyoming Secretary of State',
    stepOrder: 4,
    responsibleParty: 'COUNSEL',
    expectedDurationDays: 14,
    isFinalStep: false,
    requiresVerification: true,
    completionRequirements: JSON.stringify(['LLC filed', 'EIN obtained', 'Operating agreement signed'])
  }).onConflictDoNothing()

  await db.insert(schema.journeySteps).values({
    id: step5Id,
    journeyId,
    stepType: 'MILESTONE',
    name: 'Asset Funding',
    description: 'Transfer assets into the trust structure',
    stepOrder: 5,
    responsibleParty: 'BOTH',
    expectedDurationDays: 30,
    isFinalStep: false,
    requiresVerification: true,
    completionRequirements: JSON.stringify(['Real estate transferred', 'Financial accounts retitled', 'Business interests assigned'])
  }).onConflictDoNothing()

  await db.insert(schema.journeySteps).values({
    id: step6Id,
    journeyId,
    stepType: 'MILESTONE',
    name: 'Final Documents',
    description: 'Execute final trust documents with notarization',
    stepOrder: 6,
    responsibleParty: 'CLIENT',
    expectedDurationDays: 7,
    isFinalStep: false,
    requiresVerification: true
  }).onConflictDoNothing()

  await db.insert(schema.journeySteps).values({
    id: step7Id,
    journeyId,
    stepType: 'MILESTONE',
    name: 'Completion',
    description: 'Trust formation complete - annual maintenance scheduled',
    stepOrder: 7,
    responsibleParty: 'COUNSEL',
    expectedDurationDays: 1,
    isFinalStep: true,
    requiresVerification: true,
    completionRequirements: JSON.stringify(['All documents executed', 'Assets funded', 'Client binder delivered', 'Annual review scheduled'])
  }).onConflictDoNothing()

  console.log('  Created journey template with 7 steps')

  // Client Journeys
  await db.insert(schema.clientJourneys).values({
    id: clientJourney1Id,
    clientId: client1Id,
    matterId: matter1Id,
    catalogId: service1Id,
    journeyId,
    currentStepId: step4Id,
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    startedAt: twoMonthsAgo,
    createdAt: twoMonthsAgo,
    updatedAt: now
  }).onConflictDoNothing()

  await db.insert(schema.clientJourneys).values({
    id: clientJourney2Id,
    clientId: client3Id,
    matterId: matter3Id,
    catalogId: service1Id,
    journeyId,
    currentStepId: step7Id,
    status: 'COMPLETED',
    priority: 'MEDIUM',
    startedAt: threeMonthsAgo,
    completedAt: oneMonthAgo,
    createdAt: threeMonthsAgo,
    updatedAt: oneMonthAgo
  }).onConflictDoNothing()

  await db.insert(schema.clientJourneys).values({
    id: clientJourney3Id,
    clientId: client2Id,
    matterId: matter2Id,
    catalogId: null,
    journeyId,
    currentStepId: step1Id,
    status: 'NOT_STARTED',
    priority: 'MEDIUM',
    createdAt: oneWeekAgo,
    updatedAt: oneWeekAgo
  }).onConflictDoNothing()

  console.log('  Created 3 client journeys')

  // Seed journey step progress
  await seedJourneyProgress(db, dates, userIds, {
    clientJourney1Id,
    clientJourney2Id,
    step1Id, step2Id, step3Id, step4Id, step5Id, step6Id, step7Id
  })

  return {
    journeyId,
    step1Id, step2Id, step3Id, step4Id, step5Id, step6Id, step7Id,
    clientJourney1Id, clientJourney2Id, clientJourney3Id
  }
}

async function seedJourneyProgress(
  db: SeedDb,
  dates: SeedDates,
  userIds: SeedUserIds,
  ids: {
    clientJourney1Id: string
    clientJourney2Id: string
    step1Id: string
    step2Id: string
    step3Id: string
    step4Id: string
    step5Id: string
    step6Id: string
    step7Id: string
  }
): Promise<void> {
  const { now, oneMonthAgo, twoMonthsAgo, threeMonthsAgo } = dates
  const { clientJourney1Id, clientJourney2Id, step1Id, step2Id, step3Id, step4Id, step5Id, step6Id, step7Id } = ids

  // Progress for Jane Doe (client journey 1)
  await db.insert(schema.journeyStepProgress).values({
    id: SEED_IDS.journeyProgress.jane_step1,
    clientJourneyId: clientJourney1Id,
    stepId: step1Id,
    status: 'COMPLETE',
    clientApproved: true,
    attorneyApproved: true,
    clientApprovedAt: twoMonthsAgo,
    attorneyApprovedAt: twoMonthsAgo,
    startedAt: twoMonthsAgo,
    completedAt: twoMonthsAgo,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  const step2CompletedAt = new Date(twoMonthsAgo.getTime() + 5 * 24 * 60 * 60 * 1000)
  await db.insert(schema.journeyStepProgress).values({
    id: SEED_IDS.journeyProgress.jane_step2,
    clientJourneyId: clientJourney1Id,
    stepId: step2Id,
    status: 'COMPLETE',
    clientApproved: true,
    attorneyApproved: true,
    clientApprovedAt: step2CompletedAt,
    attorneyApprovedAt: step2CompletedAt,
    startedAt: twoMonthsAgo,
    completedAt: step2CompletedAt,
    createdAt: twoMonthsAgo,
    updatedAt: step2CompletedAt
  }).onConflictDoNothing()

  const step3StartedAt = new Date(twoMonthsAgo.getTime() + 7 * 24 * 60 * 60 * 1000)
  await db.insert(schema.journeyStepProgress).values({
    id: SEED_IDS.journeyProgress.jane_step3,
    clientJourneyId: clientJourney1Id,
    stepId: step3Id,
    status: 'COMPLETE',
    clientApproved: true,
    attorneyApproved: true,
    iterationCount: 2,
    notes: 'Client requested changes to beneficiary designations',
    clientApprovedAt: oneMonthAgo,
    attorneyApprovedAt: oneMonthAgo,
    startedAt: step3StartedAt,
    completedAt: oneMonthAgo,
    createdAt: step3StartedAt,
    updatedAt: oneMonthAgo
  }).onConflictDoNothing()

  await db.insert(schema.journeyStepProgress).values({
    id: SEED_IDS.journeyProgress.jane_step4,
    clientJourneyId: clientJourney1Id,
    stepId: step4Id,
    status: 'IN_PROGRESS',
    clientApproved: false,
    attorneyApproved: false,
    notes: 'LLC filed, waiting for EIN',
    startedAt: oneMonthAgo,
    createdAt: oneMonthAgo,
    updatedAt: now
  }).onConflictDoNothing()

  // Pending steps for Jane Doe
  const janeStepProgressIds = [
    { stepId: step5Id, progressId: SEED_IDS.journeyProgress.jane_step5 },
    { stepId: step6Id, progressId: SEED_IDS.journeyProgress.jane_step6 },
    { stepId: step7Id, progressId: SEED_IDS.journeyProgress.jane_step7 }
  ]

  for (const { stepId, progressId } of janeStepProgressIds) {
    await db.insert(schema.journeyStepProgress).values({
      id: progressId,
      clientJourneyId: clientJourney1Id,
      stepId,
      status: 'PENDING',
      clientApproved: false,
      attorneyApproved: false,
      createdAt: twoMonthsAgo,
      updatedAt: twoMonthsAgo
    }).onConflictDoNothing()
  }

  console.log('  Created journey progress for Jane Doe')

  // Progress for Sarah Williams (all complete)
  const sarahStepProgressIds = [
    { stepId: step1Id, progressId: SEED_IDS.journeyProgress.sarah_step1 },
    { stepId: step2Id, progressId: SEED_IDS.journeyProgress.sarah_step2 },
    { stepId: step3Id, progressId: SEED_IDS.journeyProgress.sarah_step3 },
    { stepId: step4Id, progressId: SEED_IDS.journeyProgress.sarah_step4 },
    { stepId: step5Id, progressId: SEED_IDS.journeyProgress.sarah_step5 },
    { stepId: step6Id, progressId: SEED_IDS.journeyProgress.sarah_step6 },
    { stepId: step7Id, progressId: SEED_IDS.journeyProgress.sarah_step7 }
  ]

  for (const { stepId, progressId } of sarahStepProgressIds) {
    await db.insert(schema.journeyStepProgress).values({
      id: progressId,
      clientJourneyId: clientJourney2Id,
      stepId,
      status: 'COMPLETE',
      clientApproved: true,
      attorneyApproved: true,
      clientApprovedAt: twoMonthsAgo,
      attorneyApprovedAt: twoMonthsAgo,
      startedAt: threeMonthsAgo,
      completedAt: twoMonthsAgo,
      createdAt: threeMonthsAgo,
      updatedAt: twoMonthsAgo
    }).onConflictDoNothing()
  }

  console.log('  Created journey progress for Sarah Williams')
}
