import { schema } from '../index'
import { SEED_IDS } from './constants'
import type { SeedDb, SeedDates, SeedUserIds, SeedJourneyIds } from './types'

export async function seedActionItems(
  db: SeedDb,
  dates: SeedDates,
  userIds: SeedUserIds,
  journeyIds: SeedJourneyIds
): Promise<void> {
  console.log('Seeding action items...')

  const { now, twoWeeksAgo, oneMonthAgo, twoMonthsAgo } = dates
  const { client1Id, lawyerId } = userIds
  const { clientJourney1Id, step1Id, step2Id, step3Id, step4Id, step5Id } = journeyIds

  // Step 1 actions (completed)
  await db.insert(schema.actionItems).values({
    id: SEED_IDS.actions.jane_step1_esign,
    stepId: step1Id,
    clientJourneyId: clientJourney1Id,
    actionType: 'ESIGN',
    title: 'Sign engagement agreement',
    description: 'Review and sign the WYDAPT engagement agreement',
    status: 'COMPLETE',
    assignedTo: 'CLIENT',
    priority: 'HIGH',
    completedAt: twoMonthsAgo,
    completedBy: client1Id,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  await db.insert(schema.actionItems).values({
    id: SEED_IDS.actions.jane_step1_payment,
    stepId: step1Id,
    clientJourneyId: clientJourney1Id,
    actionType: 'PAYMENT',
    title: 'Pay initial deposit',
    description: 'Submit 50% deposit ($9,250) to begin engagement',
    status: 'COMPLETE',
    assignedTo: 'CLIENT',
    priority: 'HIGH',
    config: JSON.stringify({ amount: 925000, paymentType: 'DEPOSIT_50' }),
    completedAt: twoMonthsAgo,
    completedBy: client1Id,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  // Step 2 actions (completed)
  await db.insert(schema.actionItems).values({
    id: SEED_IDS.actions.jane_step2_questionnaire,
    stepId: step2Id,
    clientJourneyId: clientJourney1Id,
    actionType: 'QUESTIONNAIRE',
    title: 'Complete intake questionnaire',
    description: 'Fill out the comprehensive intake questionnaire',
    status: 'COMPLETE',
    assignedTo: 'CLIENT',
    priority: 'HIGH',
    completedAt: new Date(twoMonthsAgo.getTime() + 3 * 24 * 60 * 60 * 1000),
    completedBy: client1Id,
    createdAt: twoMonthsAgo,
    updatedAt: new Date(twoMonthsAgo.getTime() + 3 * 24 * 60 * 60 * 1000)
  }).onConflictDoNothing()

  await db.insert(schema.actionItems).values({
    id: SEED_IDS.actions.jane_step2_upload,
    stepId: step2Id,
    clientJourneyId: clientJourney1Id,
    actionType: 'UPLOAD',
    title: 'Upload financial statements',
    description: 'Upload recent bank statements and investment account summaries',
    status: 'COMPLETE',
    assignedTo: 'CLIENT',
    priority: 'MEDIUM',
    completedAt: new Date(twoMonthsAgo.getTime() + 4 * 24 * 60 * 60 * 1000),
    completedBy: client1Id,
    createdAt: twoMonthsAgo,
    updatedAt: new Date(twoMonthsAgo.getTime() + 4 * 24 * 60 * 60 * 1000)
  }).onConflictDoNothing()

  // Step 3 actions (completed)
  await db.insert(schema.actionItems).values({
    id: SEED_IDS.actions.jane_step3_review,
    stepId: step3Id,
    clientJourneyId: clientJourney1Id,
    actionType: 'REVIEW',
    title: 'Review draft trust documents',
    description: 'Review and approve draft trust declaration and supporting documents',
    status: 'COMPLETE',
    assignedTo: 'CLIENT',
    priority: 'HIGH',
    completedAt: oneMonthAgo,
    completedBy: client1Id,
    createdAt: new Date(twoMonthsAgo.getTime() + 7 * 24 * 60 * 60 * 1000),
    updatedAt: oneMonthAgo
  }).onConflictDoNothing()

  // Step 4 actions (in progress)
  await db.insert(schema.actionItems).values({
    id: SEED_IDS.actions.jane_step4_llc,
    stepId: step4Id,
    clientJourneyId: clientJourney1Id,
    actionType: 'OFFLINE_TASK',
    title: 'Form Wyoming LLC',
    description: 'File LLC formation documents with Wyoming Secretary of State',
    status: 'COMPLETE',
    assignedTo: 'ATTORNEY',
    priority: 'HIGH',
    completedAt: twoWeeksAgo,
    completedBy: lawyerId,
    createdAt: oneMonthAgo,
    updatedAt: twoWeeksAgo
  }).onConflictDoNothing()

  await db.insert(schema.actionItems).values({
    id: SEED_IDS.actions.jane_step4_ein,
    stepId: step4Id,
    clientJourneyId: clientJourney1Id,
    actionType: 'OFFLINE_TASK',
    title: 'Obtain EIN for LLC',
    description: 'Apply for Employer Identification Number with IRS',
    status: 'IN_PROGRESS',
    assignedTo: 'STAFF',
    priority: 'HIGH',
    dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    createdAt: twoWeeksAgo,
    updatedAt: now
  }).onConflictDoNothing()

  await db.insert(schema.actionItems).values({
    id: SEED_IDS.actions.jane_step4_operating,
    stepId: step4Id,
    clientJourneyId: clientJourney1Id,
    actionType: 'DRAFT_DOCUMENT',
    title: 'Draft operating agreement',
    description: 'Prepare LLC operating agreement for client review',
    status: 'PENDING',
    assignedTo: 'ATTORNEY',
    priority: 'MEDIUM',
    dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    createdAt: oneMonthAgo,
    updatedAt: oneMonthAgo
  }).onConflictDoNothing()

  // Step 5 actions (pending)
  await db.insert(schema.actionItems).values({
    id: SEED_IDS.actions.jane_step5_deed,
    stepId: step5Id,
    clientJourneyId: clientJourney1Id,
    actionType: 'OFFLINE_TASK',
    title: 'Transfer real estate deed',
    description: 'Execute quitclaim deed to transfer property to trust',
    status: 'PENDING',
    assignedTo: 'CLIENT',
    priority: 'HIGH',
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  await db.insert(schema.actionItems).values({
    id: SEED_IDS.actions.jane_step5_accounts,
    stepId: step5Id,
    clientJourneyId: clientJourney1Id,
    actionType: 'OFFLINE_TASK',
    title: 'Retitle investment accounts',
    description: 'Work with financial institutions to retitle accounts to trust',
    status: 'PENDING',
    assignedTo: 'CLIENT',
    priority: 'HIGH',
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  }).onConflictDoNothing()

  console.log('  Created 10 action items')
}
