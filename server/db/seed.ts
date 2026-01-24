import { schema } from './index'
import { hashPassword, generateId } from '../utils/auth'
import { processTemplateUpload } from '../utils/template-upload'
import { useTemplateRenderer } from '../utils/template-renderer'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { readFile } from 'fs/promises'
import { join } from 'path'

// Document template files in the repo
const TEMPLATE_FILES = {
  engagement: 'doc/word_document_templates/1.g Engagement Agreement_WAPA - 1 grantor.docx',
  trust: 'doc/word_document_templates/1. Grantor Trust - One Grantor - ytp v1.docx'
}

export async function seedDatabase(db: DrizzleD1Database<typeof schema>, blob?: any) {

  console.log('Seeding database...')

  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  // Hash password once for all users
  const hashedPassword = await hashPassword('password123')

  // ============================================
  // PHASE 1: USERS
  // ============================================

  // Admin user
  const adminId = generateId()
  await db.insert(schema.users).values({
    id: adminId,
    email: 'admin@trustandlegacy.test',
    password: hashedPassword,
    role: 'ADMIN',
    adminLevel: 3,
    firstName: 'Sarah',
    lastName: 'Admin',
    status: 'ACTIVE'
  })
  console.log('Created admin account: admin@trustandlegacy.test / password123')

  // Primary lawyer (John Meuli)
  const lawyerId = generateId()
  await db.insert(schema.users).values({
    id: lawyerId,
    email: 'john.meuli@yourtrustedplanner.com',
    password: hashedPassword,
    role: 'LAWYER',
    adminLevel: 0,
    firstName: 'John',
    lastName: 'Meuli',
    status: 'ACTIVE'
  })
  console.log('Created lawyer account: john.meuli@yourtrustedplanner.com / password123')

  // Second lawyer (Mary Parker)
  const lawyer2Id = generateId()
  await db.insert(schema.users).values({
    id: lawyer2Id,
    email: 'mary.parker@trustandlegacy.test',
    password: hashedPassword,
    role: 'LAWYER',
    adminLevel: 1,
    firstName: 'Mary',
    lastName: 'Parker',
    status: 'ACTIVE'
  })
  console.log('Created lawyer account: mary.parker@trustandlegacy.test / password123')

  // Staff member (paralegal)
  const staffId = generateId()
  await db.insert(schema.users).values({
    id: staffId,
    email: 'lisa.chen@trustandlegacy.test',
    password: hashedPassword,
    role: 'STAFF',
    adminLevel: 0,
    firstName: 'Lisa',
    lastName: 'Chen',
    status: 'ACTIVE'
  })
  console.log('Created staff account: lisa.chen@trustandlegacy.test / password123')

  // External advisor (CPA)
  const advisorId = generateId()
  await db.insert(schema.users).values({
    id: advisorId,
    email: 'bob.advisor@external.test',
    password: hashedPassword,
    role: 'ADVISOR',
    adminLevel: 0,
    firstName: 'Bob',
    lastName: 'Advisor',
    status: 'ACTIVE'
  })
  console.log('Created advisor account: bob.advisor@external.test / password123')

  // Client 1: Jane Doe (active matter, in-progress journey)
  const client1Id = generateId()
  await db.insert(schema.users).values({
    id: client1Id,
    email: 'jane.doe@test.com',
    password: hashedPassword,
    role: 'CLIENT',
    adminLevel: 0,
    firstName: 'Jane',
    lastName: 'Doe',
    status: 'ACTIVE'
  })
  console.log('Created client account: jane.doe@test.com / password123')

  // Client 2: Michael Johnson (prospect, not started)
  const client2Id = generateId()
  await db.insert(schema.users).values({
    id: client2Id,
    email: 'michael.johnson@test.com',
    password: hashedPassword,
    role: 'CLIENT',
    adminLevel: 0,
    firstName: 'Michael',
    lastName: 'Johnson',
    status: 'ACTIVE'
  })
  console.log('Created client account: michael.johnson@test.com / password123')

  // Client 3: Sarah Williams (completed matter)
  const client3Id = generateId()
  await db.insert(schema.users).values({
    id: client3Id,
    email: 'sarah.williams@test.com',
    password: hashedPassword,
    role: 'CLIENT',
    adminLevel: 0,
    firstName: 'Sarah',
    lastName: 'Williams',
    status: 'ACTIVE'
  })
  console.log('Created client account: sarah.williams@test.com / password123')

  // ============================================
  // CLIENT PROFILES
  // ============================================

  // Jane Doe profile
  const profile1Id = generateId()
  await db.insert(schema.clientProfiles).values({
    id: profile1Id,
    userId: client1Id,
    assignedLawyerId: lawyerId,
    dateOfBirth: new Date('1975-06-15'),
    phone: '(555) 123-4567',
    address: '123 Oak Street',
    city: 'Denver',
    state: 'CO',
    zip: '80202'
  })

  // Michael Johnson profile (prospect)
  const profile2Id = generateId()
  await db.insert(schema.clientProfiles).values({
    id: profile2Id,
    userId: client2Id,
    assignedLawyerId: lawyerId,
    phone: '(555) 234-5678',
    city: 'Boulder',
    state: 'CO'
  })

  // Sarah Williams profile (completed)
  const profile3Id = generateId()
  await db.insert(schema.clientProfiles).values({
    id: profile3Id,
    userId: client3Id,
    assignedLawyerId: lawyer2Id,
    dateOfBirth: new Date('1968-03-22'),
    phone: '(555) 345-6789',
    address: '456 Pine Avenue',
    city: 'Cheyenne',
    state: 'WY',
    zip: '82001'
  })

  console.log('Created client profiles')

  // ============================================
  // TEMPLATE FOLDERS & DOCUMENT TEMPLATES
  // ============================================

  const folderId = generateId()
  await db.insert(schema.templateFolders).values({
    id: folderId,
    name: 'Estate Planning',
    description: 'Estate planning documents'
  })

  // Template 1: Simple Will (basic HTML - no DOCX yet)
  const template1Id = generateId()
  await db.insert(schema.documentTemplates).values({
    id: template1Id,
    name: 'Simple Will',
    description: 'Basic will template',
    category: 'Will',
    folderId,
    content: '<h1>Last Will and Testament</h1><p>I, {{fullName}}, being of sound mind...</p>',
    variables: JSON.stringify([
      { name: 'fullName', description: 'Full legal name' },
      { name: 'address', description: 'Current address' }
    ]),
    requiresNotary: false
  })

  // Template 2: Engagement Agreement (from DOCX if blob available)
  let template2Id: string
  let template3Id: string
  let engagementHtml: string = ''
  let trustHtml: string = ''
  let engagementDocxBuffer: ArrayBuffer | null = null
  let trustDocxBuffer: ArrayBuffer | null = null

  if (blob) {
    // Try to load real DOCX templates
    try {
      // Find the project root (go up from server/db to project root)
      const projectRoot = process.cwd()

      // Load Engagement Agreement
      const engagementPath = join(projectRoot, TEMPLATE_FILES.engagement)
      const engagementFileBuffer = await readFile(engagementPath)
      engagementDocxBuffer = engagementFileBuffer.buffer.slice(
        engagementFileBuffer.byteOffset,
        engagementFileBuffer.byteOffset + engagementFileBuffer.byteLength
      )
      console.log('Loading engagement template from:', engagementPath)

      const engagementResult = await processTemplateUpload(
        {
          buffer: engagementDocxBuffer,
          filename: '1.g Engagement Agreement_WAPA - 1 grantor.docx',
          name: 'Engagement Agreement - WAPA (1 Grantor)',
          description: 'Wyoming Asset Protection Trust engagement letter for single grantor',
          category: 'Engagement Letter',
          folderId,
          skipVariableValidation: true
        },
        db,
        schema,
        blob
      )
      template2Id = engagementResult.id
      engagementHtml = engagementResult.html
      console.log(`Created engagement template with ${engagementResult.variableCount} variables from DOCX`)

      // Load Trust Document
      const trustPath = join(projectRoot, TEMPLATE_FILES.trust)
      const trustFileBuffer = await readFile(trustPath)
      trustDocxBuffer = trustFileBuffer.buffer.slice(
        trustFileBuffer.byteOffset,
        trustFileBuffer.byteOffset + trustFileBuffer.byteLength
      )
      console.log('Loading trust template from:', trustPath)

      const trustResult = await processTemplateUpload(
        {
          buffer: trustDocxBuffer,
          filename: '1. Grantor Trust - One Grantor - ytp v1.docx',
          name: 'Grantor Trust - One Grantor',
          description: 'Wyoming Asset Protection Trust Declaration for single grantor',
          category: 'Trust',
          folderId,
          skipVariableValidation: true
        },
        db,
        schema,
        blob
      )
      template3Id = trustResult.id
      trustHtml = trustResult.html
      console.log(`Created trust template with ${trustResult.variableCount} variables from DOCX`)

    } catch (error) {
      console.warn('Could not load DOCX templates, falling back to simple HTML:', error)
      // Fall back to simple templates
      const simpleEngagement = await createSimpleEngagementTemplate(db, folderId)
      template2Id = simpleEngagement.id
      engagementHtml = simpleEngagement.html
      const simpleTrust = await createSimpleTrustTemplate(db, folderId)
      template3Id = simpleTrust.id
      trustHtml = simpleTrust.html
    }
  } else {
    // No blob storage - create simple HTML templates
    console.log('No blob storage provided, creating simple HTML templates')
    const simpleEngagement = await createSimpleEngagementTemplate(db, folderId)
    template2Id = simpleEngagement.id
    engagementHtml = simpleEngagement.html
    const simpleTrust = await createSimpleTrustTemplate(db, folderId)
    template3Id = simpleTrust.id
    trustHtml = simpleTrust.html
  }

  console.log('Created template folder and document templates')

  // ============================================
  // SERVICE CATEGORIES
  // ============================================

  await db.insert(schema.serviceCategories).values({
    id: generateId(),
    name: 'Estate Planning',
    description: 'End-of-life planning and related services',
    displayOrder: 1,
    isActive: true
  })

  await db.insert(schema.serviceCategories).values({
    id: generateId(),
    name: 'Entity Formation',
    description: 'LLCs, corporations, and business entities',
    displayOrder: 2,
    isActive: true
  })

  await db.insert(schema.serviceCategories).values({
    id: generateId(),
    name: 'Maintenance',
    description: 'Ongoing administration and compliance services',
    displayOrder: 3,
    isActive: true
  })

  await db.insert(schema.serviceCategories).values({
    id: generateId(),
    name: 'Asset Protection',
    description: 'DAPTs, Asset Protection Trusts, Spendthrift Trusts, etc.',
    displayOrder: 4,
    isActive: true
  })

  console.log('Created service categories')

  // ============================================
  // SERVICE CATALOG
  // ============================================

  const service1Id = generateId()
  await db.insert(schema.serviceCatalog).values({
    id: service1Id,
    name: 'Wyoming Asset Protection Trust',
    description: 'Complete trust formation with asset protection',
    category: 'Trust Formation',
    type: 'SINGLE',
    price: 1850000, // $18,500 in cents
    engagementLetterId: template2Id
  })

  const service2Id = generateId()
  await db.insert(schema.serviceCatalog).values({
    id: service2Id,
    name: 'Annual Trust Maintenance',
    description: 'Ongoing trust administration and compliance',
    category: 'Maintenance',
    type: 'RECURRING',
    price: 50000, // $500 in cents
    duration: 'ANNUALLY'
  })

  const service3Id = generateId()
  await db.insert(schema.serviceCatalog).values({
    id: service3Id,
    name: 'LLC Formation - Wyoming',
    description: 'Wyoming LLC formation and setup',
    category: 'Entity Formation',
    type: 'SINGLE',
    price: 250000 // $2,500 in cents
  })

  console.log('Created service catalog items')

  // ============================================
  // MATTERS
  // ============================================

  // Matter 1: Jane Doe - Active WYDAPT
  const matter1Id = generateId()
  await db.insert(schema.matters).values({
    id: matter1Id,
    clientId: client1Id,
    title: 'Doe Family Trust Formation',
    description: 'Wyoming Asset Protection Trust for the Doe family',
    status: 'OPEN',
    createdAt: twoMonthsAgo,
    updatedAt: now
  })

  // Matter 2: Michael Johnson - Pending (prospect)
  const matter2Id = generateId()
  await db.insert(schema.matters).values({
    id: matter2Id,
    clientId: client2Id,
    title: 'Johnson Estate Planning',
    description: 'Initial consultation for estate planning services',
    status: 'PENDING',
    createdAt: oneWeekAgo,
    updatedAt: oneWeekAgo
  })

  // Matter 3: Sarah Williams - Completed
  const matter3Id = generateId()
  await db.insert(schema.matters).values({
    id: matter3Id,
    clientId: client3Id,
    title: 'Williams Family Trust',
    description: 'Wyoming Asset Protection Trust - Completed',
    status: 'CLOSED',
    createdAt: threeMonthsAgo,
    updatedAt: oneMonthAgo
  })

  console.log('Created matters')

  // ============================================
  // MATTERS TO SERVICES (Junction)
  // ============================================

  // Jane Doe's matter - WYDAPT service (active)
  await db.insert(schema.mattersToServices).values({
    matterId: matter1Id,
    catalogId: service1Id,
    engagedAt: twoMonthsAgo,
    assignedAttorneyId: lawyerId,
    status: 'ACTIVE',
    startDate: twoMonthsAgo
  })

  // Sarah Williams' matter - WYDAPT service (completed)
  await db.insert(schema.mattersToServices).values({
    matterId: matter3Id,
    catalogId: service1Id,
    engagedAt: threeMonthsAgo,
    assignedAttorneyId: lawyer2Id,
    status: 'COMPLETED',
    startDate: threeMonthsAgo,
    endDate: oneMonthAgo
  })

  console.log('Created matter-service relationships')

  // ============================================
  // PHASE 2: JOURNEY TEMPLATE & STEPS
  // ============================================

  const journeyId = generateId()
  await db.insert(schema.journeys).values({
    id: journeyId,
    name: 'Wyoming Asset Protection Trust',
    description: 'Complete WYDAPT engagement workflow from initial consultation to trust completion',
    journeyType: 'SERVICE',
    isActive: true,
    estimatedDurationDays: 90,
    createdAt: threeMonthsAgo,
    updatedAt: threeMonthsAgo
  })

  // Link journey to catalog item via junction table
  await db.insert(schema.journeysToCatalog).values({
    journeyId,
    catalogId: service1Id,
    createdAt: threeMonthsAgo
  })

  console.log('Created WYDAPT journey template')

  // Journey Steps
  const step1Id = generateId()
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
  })

  const step2Id = generateId()
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
  })

  const step3Id = generateId()
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
  })

  const step4Id = generateId()
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
  })

  const step5Id = generateId()
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
  })

  const step6Id = generateId()
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
  })

  const step7Id = generateId()
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
  })

  console.log('Created 7 journey steps')

  // ============================================
  // PHASE 3: CLIENT JOURNEYS & PROGRESS
  // ============================================

  // Jane Doe's journey - IN_PROGRESS at Step 4
  const clientJourney1Id = generateId()
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
  })

  // Sarah Williams' journey - COMPLETED
  const clientJourney2Id = generateId()
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
  })

  // Michael Johnson's journey - NOT_STARTED
  const clientJourney3Id = generateId()
  await db.insert(schema.clientJourneys).values({
    id: clientJourney3Id,
    clientId: client2Id,
    matterId: matter2Id,
    catalogId: null, // Not yet engaged
    journeyId,
    currentStepId: step1Id,
    status: 'NOT_STARTED',
    priority: 'MEDIUM',
    createdAt: oneWeekAgo,
    updatedAt: oneWeekAgo
  })

  console.log('Created 3 client journeys')

  // Journey Step Progress for Jane Doe
  const progress1Id = generateId()
  await db.insert(schema.journeyStepProgress).values({
    id: progress1Id,
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
  })

  const progress2Id = generateId()
  await db.insert(schema.journeyStepProgress).values({
    id: progress2Id,
    clientJourneyId: clientJourney1Id,
    stepId: step2Id,
    status: 'COMPLETE',
    clientApproved: true,
    attorneyApproved: true,
    clientApprovedAt: new Date(twoMonthsAgo.getTime() + 5 * 24 * 60 * 60 * 1000),
    attorneyApprovedAt: new Date(twoMonthsAgo.getTime() + 5 * 24 * 60 * 60 * 1000),
    startedAt: twoMonthsAgo,
    completedAt: new Date(twoMonthsAgo.getTime() + 5 * 24 * 60 * 60 * 1000),
    createdAt: twoMonthsAgo,
    updatedAt: new Date(twoMonthsAgo.getTime() + 5 * 24 * 60 * 60 * 1000)
  })

  const progress3Id = generateId()
  await db.insert(schema.journeyStepProgress).values({
    id: progress3Id,
    clientJourneyId: clientJourney1Id,
    stepId: step3Id,
    status: 'COMPLETE',
    clientApproved: true,
    attorneyApproved: true,
    iterationCount: 2, // Had 2 revision cycles
    notes: 'Client requested changes to beneficiary designations',
    clientApprovedAt: oneMonthAgo,
    attorneyApprovedAt: oneMonthAgo,
    startedAt: new Date(twoMonthsAgo.getTime() + 7 * 24 * 60 * 60 * 1000),
    completedAt: oneMonthAgo,
    createdAt: new Date(twoMonthsAgo.getTime() + 7 * 24 * 60 * 60 * 1000),
    updatedAt: oneMonthAgo
  })

  const progress4Id = generateId()
  await db.insert(schema.journeyStepProgress).values({
    id: progress4Id,
    clientJourneyId: clientJourney1Id,
    stepId: step4Id,
    status: 'IN_PROGRESS',
    clientApproved: false,
    attorneyApproved: false,
    notes: 'LLC filed, waiting for EIN',
    startedAt: oneMonthAgo,
    createdAt: oneMonthAgo,
    updatedAt: now
  })

  const progress5Id = generateId()
  await db.insert(schema.journeyStepProgress).values({
    id: progress5Id,
    clientJourneyId: clientJourney1Id,
    stepId: step5Id,
    status: 'PENDING',
    clientApproved: false,
    attorneyApproved: false,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  })

  const progress6Id = generateId()
  await db.insert(schema.journeyStepProgress).values({
    id: progress6Id,
    clientJourneyId: clientJourney1Id,
    stepId: step6Id,
    status: 'PENDING',
    clientApproved: false,
    attorneyApproved: false,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  })

  const progress7Id = generateId()
  await db.insert(schema.journeyStepProgress).values({
    id: progress7Id,
    clientJourneyId: clientJourney1Id,
    stepId: step7Id,
    status: 'PENDING',
    clientApproved: false,
    attorneyApproved: false,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  })

  console.log('Created journey step progress for Jane Doe')

  // Journey Step Progress for Sarah Williams (all complete)
  for (const stepId of [step1Id, step2Id, step3Id, step4Id, step5Id, step6Id, step7Id]) {
    await db.insert(schema.journeyStepProgress).values({
      id: generateId(),
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
    })
  }

  console.log('Created journey step progress for Sarah Williams')

  // ============================================
  // PHASE 4: ACTION ITEMS
  // ============================================

  // Action items for Jane Doe's journey (mix of complete and pending)

  // Step 1 actions (completed)
  await db.insert(schema.actionItems).values({
    id: generateId(),
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
  })

  await db.insert(schema.actionItems).values({
    id: generateId(),
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
  })

  // Step 2 actions (completed)
  await db.insert(schema.actionItems).values({
    id: generateId(),
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
  })

  await db.insert(schema.actionItems).values({
    id: generateId(),
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
  })

  // Step 3 actions (completed)
  await db.insert(schema.actionItems).values({
    id: generateId(),
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
  })

  // Step 4 actions (in progress)
  await db.insert(schema.actionItems).values({
    id: generateId(),
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
  })

  await db.insert(schema.actionItems).values({
    id: generateId(),
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
  })

  await db.insert(schema.actionItems).values({
    id: generateId(),
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
  })

  // Step 5 actions (pending)
  await db.insert(schema.actionItems).values({
    id: generateId(),
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
  })

  await db.insert(schema.actionItems).values({
    id: generateId(),
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
  })

  console.log('Created action items for Jane Doe')

  // ============================================
  // PHASE 5: PEOPLE & RELATIONSHIPS
  // ============================================

  // People for Jane Doe's trust
  const person1Id = generateId() // Robert Doe (spouse)
  await db.insert(schema.people).values({
    id: person1Id,
    firstName: 'Robert',
    lastName: 'Doe',
    fullName: 'Robert Doe',
    email: 'robert.doe@test.com',
    phone: '(555) 123-4568',
    dateOfBirth: new Date('1973-09-20'),
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  })

  const person2Id = generateId() // Emily Doe (daughter)
  await db.insert(schema.people).values({
    id: person2Id,
    firstName: 'Emily',
    lastName: 'Doe',
    fullName: 'Emily Doe',
    email: 'emily.doe@test.com',
    dateOfBirth: new Date('1998-04-12'),
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  })

  const person3Id = generateId() // James Doe (son)
  await db.insert(schema.people).values({
    id: person3Id,
    firstName: 'James',
    lastName: 'Doe',
    fullName: 'James Doe',
    email: 'james.doe@test.com',
    dateOfBirth: new Date('2001-11-05'),
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  })

  const person4Id = generateId() // Margaret Smith (mother)
  await db.insert(schema.people).values({
    id: person4Id,
    firstName: 'Margaret',
    lastName: 'Smith',
    fullName: 'Margaret Smith',
    phone: '(555) 987-6543',
    dateOfBirth: new Date('1948-12-01'),
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  })

  console.log('Created 4 people records')

  // Client Relationships for Jane Doe
  await db.insert(schema.clientRelationships).values({
    id: generateId(),
    clientId: client1Id,
    personId: person1Id,
    relationshipType: 'SPOUSE',
    ordinal: 1,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  })

  await db.insert(schema.clientRelationships).values({
    id: generateId(),
    clientId: client1Id,
    personId: person2Id,
    relationshipType: 'CHILD',
    ordinal: 1,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  })

  await db.insert(schema.clientRelationships).values({
    id: generateId(),
    clientId: client1Id,
    personId: person3Id,
    relationshipType: 'CHILD',
    ordinal: 2,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  })

  await db.insert(schema.clientRelationships).values({
    id: generateId(),
    clientId: client1Id,
    personId: person4Id,
    relationshipType: 'PARENT',
    ordinal: 1,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  })

  console.log('Created client relationships')

  // Matter Relationships for Jane Doe's trust
  // Create a person record for Jane herself (for matter roles)
  const janePersonId = generateId()
  await db.insert(schema.people).values({
    id: janePersonId,
    firstName: 'Jane',
    lastName: 'Doe',
    fullName: 'Jane Doe',
    email: 'jane.doe@test.com',
    phone: '(555) 123-4567',
    dateOfBirth: new Date('1975-06-15'),
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  })

  await db.insert(schema.matterRelationships).values({
    id: generateId(),
    matterId: matter1Id,
    personId: janePersonId,
    relationshipType: 'GRANTOR',
    ordinal: 1,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  })

  await db.insert(schema.matterRelationships).values({
    id: generateId(),
    matterId: matter1Id,
    personId: person1Id,
    relationshipType: 'CO_TRUSTEE',
    ordinal: 1,
    notes: 'Serves as co-trustee with Jane',
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  })

  await db.insert(schema.matterRelationships).values({
    id: generateId(),
    matterId: matter1Id,
    personId: person2Id,
    relationshipType: 'BENEFICIARY',
    ordinal: 1,
    notes: 'Primary beneficiary - 50% share',
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  })

  await db.insert(schema.matterRelationships).values({
    id: generateId(),
    matterId: matter1Id,
    personId: person3Id,
    relationshipType: 'BENEFICIARY',
    ordinal: 2,
    notes: 'Primary beneficiary - 50% share',
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo
  })

  console.log('Created matter relationships')

  // ============================================
  // PHASE 6: DOCUMENTS
  // ============================================

  // Initialize template renderer for rendering documents with variables
  const renderer = useTemplateRenderer()

  // Variable values for Jane Doe's documents
  const janeEngagementVars = {
    clientName: 'Jane Doe',
    clientFullName: 'Jane Elizabeth Doe',
    clientAddress: '123 Oak Street',
    clientCity: 'Denver',
    clientState: 'Colorado',
    clientZipCode: '80202',
    serviceName: 'Wyoming Asset Protection Trust',
    fee: '$18,500',
    currentDate: twoMonthsAgo.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    effectiveDate: twoMonthsAgo.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const janeTrustVars = {
    trustName: 'Doe Family Asset Protection Trust',
    grantorName: 'Jane Doe',
    grantorFullName: 'Jane Elizabeth Doe',
    grantorState: 'Colorado',
    trusteeName: 'Jane Doe and Robert Doe',
    effectiveDate: oneMonthAgo.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  // Variable values for Sarah Williams' documents
  const sarahEngagementVars = {
    clientName: 'Sarah Williams',
    clientFullName: 'Sarah Marie Williams',
    clientAddress: '456 Pine Avenue',
    clientCity: 'Cheyenne',
    clientState: 'Wyoming',
    clientZipCode: '82001',
    serviceName: 'Wyoming Asset Protection Trust',
    fee: '$18,500',
    currentDate: threeMonthsAgo.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    effectiveDate: threeMonthsAgo.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const sarahTrustVars = {
    trustName: 'Williams Family Asset Protection Trust',
    grantorName: 'Sarah Williams',
    grantorFullName: 'Sarah Marie Williams',
    grantorState: 'Wyoming',
    trusteeName: 'Sarah Williams',
    effectiveDate: twoMonthsAgo.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  // Render document content from templates (with fallback to simple content if template rendering fails)
  let janeEngagementContent: string
  let janeTrustContent: string
  let sarahEngagementContent: string
  let sarahTrustContent: string

  try {
    janeEngagementContent = engagementHtml ? renderer.render(engagementHtml, janeEngagementVars) : '<h1>Engagement Agreement</h1><p>Client: Jane Doe</p>'
    janeTrustContent = trustHtml ? renderer.render(trustHtml, janeTrustVars) : '<h1>Declaration of Trust</h1><p>Trust Name: Doe Family Asset Protection Trust</p>'
    sarahEngagementContent = engagementHtml ? renderer.render(engagementHtml, sarahEngagementVars) : '<h1>Engagement Agreement</h1><p>Client: Sarah Williams</p>'
    sarahTrustContent = trustHtml ? renderer.render(trustHtml, sarahTrustVars) : '<h1>Declaration of Trust</h1><p>Trust Name: Williams Family Asset Protection Trust</p>'
    console.log('Rendered document content from templates')
  } catch (error) {
    console.warn('Template rendering failed, using simple content:', error)
    janeEngagementContent = '<h1>Engagement Agreement</h1><p>Client: Jane Doe</p><p>Service: Wyoming Asset Protection Trust</p><p>Fee: $18,500</p>'
    janeTrustContent = '<h1>Declaration of Trust</h1><p>Trust Name: Doe Family Asset Protection Trust</p><p>Grantor: Jane Doe</p><p>Trustee: Jane Doe and Robert Doe</p>'
    sarahEngagementContent = '<h1>Engagement Agreement</h1><p>Client: Sarah Williams</p><p>Service: Wyoming Asset Protection Trust</p><p>Fee: $18,500</p>'
    sarahTrustContent = '<h1>Declaration of Trust</h1><p>Trust Name: Williams Family Asset Protection Trust</p><p>Grantor: Sarah Williams</p><p>Trustee: Sarah Williams</p>'
  }

  // Helper to create document with DOCX blob
  async function createDocumentWithBlob(
    docData: {
      title: string
      description: string
      templateId: string
      matterId: string
      content: string
      variableValues: any
      clientId: string
      status: 'DRAFT' | 'SENT' | 'VIEWED' | 'SIGNED' | 'COMPLETED'
      sentAt?: Date
      viewedAt?: Date
      signedAt?: Date
      readyForSignature?: boolean
      readyForSignatureAt?: Date
    },
    docxBuffer: ArrayBuffer | null,
    filename: string
  ) {
    const docId = generateId()
    let docxBlobKey: string | null = null

    // Store DOCX blob if we have the buffer and blob storage
    if (docxBuffer && blob) {
      docxBlobKey = `documents/${docId}/${filename}`
      await blob.put(docxBlobKey, docxBuffer)
      console.log(`  Stored DOCX blob: ${docxBlobKey}`)
    }

    await db.insert(schema.documents).values({
      id: docId,
      title: docData.title,
      description: docData.description,
      templateId: docData.templateId,
      matterId: docData.matterId,
      content: docData.content,
      variableValues: JSON.stringify(docData.variableValues),
      clientId: docData.clientId,
      status: docData.status,
      docxBlobKey,
      sentAt: docData.sentAt,
      viewedAt: docData.viewedAt,
      signedAt: docData.signedAt,
      readyForSignature: docData.readyForSignature ?? false,
      readyForSignatureAt: docData.readyForSignatureAt
    })

    return docId
  }

  // Document 1: Engagement Agreement for Jane (signed)
  await createDocumentWithBlob(
    {
      title: 'Engagement Agreement - Doe Family Trust',
      description: 'WYDAPT engagement agreement for Jane Doe',
      templateId: template2Id,
      matterId: matter1Id,
      content: janeEngagementContent,
      variableValues: janeEngagementVars,
      clientId: client1Id,
      status: 'SIGNED',
      sentAt: twoMonthsAgo,
      viewedAt: twoMonthsAgo,
      signedAt: twoMonthsAgo,
      readyForSignature: true,
      readyForSignatureAt: twoMonthsAgo
    },
    engagementDocxBuffer,
    'Engagement-Agreement-Doe-Family.docx'
  )

  // Document 2: Trust Declaration for Jane (draft)
  await createDocumentWithBlob(
    {
      title: 'Trust Declaration - Doe Family Trust',
      description: 'Draft trust declaration document',
      templateId: template3Id,
      matterId: matter1Id,
      content: janeTrustContent,
      variableValues: janeTrustVars,
      clientId: client1Id,
      status: 'DRAFT'
    },
    trustDocxBuffer,
    'Trust-Declaration-Doe-Family.docx'
  )

  // Document 3: Engagement Agreement for Sarah (completed)
  await createDocumentWithBlob(
    {
      title: 'Engagement Agreement - Williams Family Trust',
      description: 'WYDAPT engagement agreement for Sarah Williams',
      templateId: template2Id,
      matterId: matter3Id,
      content: sarahEngagementContent,
      variableValues: sarahEngagementVars,
      clientId: client3Id,
      status: 'COMPLETED',
      sentAt: threeMonthsAgo,
      viewedAt: threeMonthsAgo,
      signedAt: threeMonthsAgo,
      readyForSignature: true,
      readyForSignatureAt: threeMonthsAgo
    },
    engagementDocxBuffer,
    'Engagement-Agreement-Williams-Family.docx'
  )

  // Document 4: Trust Documents for Sarah (completed)
  await createDocumentWithBlob(
    {
      title: 'Trust Declaration - Williams Family Trust',
      description: 'Completed trust declaration document',
      templateId: template3Id,
      matterId: matter3Id,
      content: sarahTrustContent,
      variableValues: sarahTrustVars,
      clientId: client3Id,
      status: 'COMPLETED',
      sentAt: twoMonthsAgo,
      viewedAt: twoMonthsAgo,
      signedAt: twoMonthsAgo,
      readyForSignature: true,
      readyForSignatureAt: twoMonthsAgo
    },
    trustDocxBuffer,
    'Trust-Declaration-Williams-Family.docx'
  )

  console.log('Created documents with rendered template content and DOCX blobs')

  // ============================================
  // QUESTIONNAIRES
  // ============================================

  const questionnaireId = generateId()
  await db.insert(schema.questionnaires).values({
    id: questionnaireId,
    name: 'Initial Consultation Questionnaire',
    description: 'Pre-consultation questions for prospects',
    questions: JSON.stringify([
      {
        id: 'q1',
        type: 'text',
        question: 'What is your primary reason for seeking asset protection?',
        required: true
      },
      {
        id: 'q2',
        type: 'number',
        question: 'Estimated net worth (USD)',
        required: true
      },
      {
        id: 'q3',
        type: 'select',
        question: 'What type of assets do you need to protect?',
        options: ['Real Estate', 'Business Assets', 'Investment Portfolio', 'Cryptocurrency', 'Other'],
        required: true
      },
      {
        id: 'q4',
        type: 'text',
        question: 'Do you currently have any legal structures in place (trusts, LLCs, etc.)?',
        required: false
      },
      {
        id: 'q5',
        type: 'select',
        question: 'What is your timeline for implementation?',
        options: ['Immediate (within 1 month)', '1-3 months', '3-6 months', '6+ months'],
        required: true
      }
    ])
  })

  console.log('Created questionnaire')

  // ============================================
  // SUMMARY
  // ============================================

  console.log('')
  console.log('='.repeat(50))
  console.log('DATABASE SEEDED SUCCESSFULLY')
  console.log('='.repeat(50))
  console.log('')
  console.log('Test Accounts:')
  console.log('  ADMIN:   admin@trustandlegacy.test / password123')
  console.log('  LAWYER:  john.meuli@yourtrustedplanner.com / password123')
  console.log('  LAWYER:  mary.parker@trustandlegacy.test / password123')
  console.log('  STAFF:   lisa.chen@trustandlegacy.test / password123')
  console.log('  ADVISOR: bob.advisor@external.test / password123')
  console.log('  CLIENT:  jane.doe@test.com / password123 (active matter)')
  console.log('  CLIENT:  michael.johnson@test.com / password123 (prospect)')
  console.log('  CLIENT:  sarah.williams@test.com / password123 (completed)')
  console.log('')
  console.log('Data Created:')
  console.log('  - 8 users (all roles)')
  console.log('  - 3 client profiles')
  console.log('  - 3 matters (open, pending, closed)')
  console.log('  - 2 matter-service engagements')
  console.log('  - 1 journey template with 7 steps')
  console.log('  - 3 client journeys')
  console.log('  - 14 journey step progress records')
  console.log('  - 11 action items')
  console.log('  - 5 people records')
  console.log('  - 4 client relationships')
  console.log('  - 4 matter relationships')
  console.log('  - 4 documents')
  console.log('  - 3 document templates')
  console.log('  - 3 service catalog items')
  console.log('')
}

// Helper function to create simple engagement template (fallback when no blob)
async function createSimpleEngagementTemplate(db: any, folderId: string): Promise<{ id: string; html: string }> {
  const templateId = generateId()
  const html = `<h1>ENGAGEMENT AGREEMENT</h1>
<h2>Wyoming Asset Protection Trust</h2>
<p><strong>Client:</strong> {{clientName}}</p>
<p><strong>Date:</strong> {{currentDate}}</p>
<hr/>
<p>This Engagement Agreement ("Agreement") is entered into between:</p>
<p><strong>Attorney:</strong> Your Trusted Planner, LLC</p>
<p><strong>Client:</strong> {{clientName}}</p>
<p><strong>Address:</strong> {{clientAddress}}, {{clientCity}}, {{clientState}} {{clientZipCode}}</p>
<h3>SCOPE OF SERVICES</h3>
<p>Attorney agrees to provide the following legal services:</p>
<ul>
<li>Formation of Wyoming Asset Protection Trust</li>
<li>Preparation of trust documents</li>
<li>Asset protection planning consultation</li>
</ul>
<h3>FEES</h3>
<p><strong>Total Fee:</strong> {{fee}}</p>
<p><strong>Payment Terms:</strong> 50% due upon signing, 50% due upon completion</p>
<h3>SIGNATURES</h3>
<p>Client Signature: {{clientSignature}}</p>
<p>Date: {{signatureDate}}</p>`
  await db.insert(schema.documentTemplates).values({
    id: templateId,
    name: 'Engagement Agreement - WAPA',
    description: 'Wyoming Asset Protection Trust engagement letter',
    category: 'Engagement Letter',
    folderId,
    content: html,
    variables: JSON.stringify([
      'clientName', 'currentDate', 'clientAddress', 'clientCity',
      'clientState', 'clientZipCode', 'fee', 'clientSignature', 'signatureDate'
    ]),
    requiresNotary: false
  })
  return { id: templateId, html }
}

// Helper function to create simple trust template (fallback when no blob)
async function createSimpleTrustTemplate(db: any, folderId: string): Promise<{ id: string; html: string }> {
  const templateId = generateId()
  const html = `<h1>DECLARATION OF TRUST</h1>
<h2>{{trustName}}</h2>
<p><strong>Effective Date:</strong> {{effectiveDate}}</p>
<hr/>
<h3>ARTICLE I - ESTABLISHMENT OF TRUST</h3>
<p>{{grantorName}} ("Grantor"), being a resident of {{grantorState}}, hereby establishes this irrevocable trust to be known as the "{{trustName}}" (the "Trust").</p>
<h3>ARTICLE II - TRUSTEE</h3>
<p>The initial Trustee of this Trust shall be {{trusteeName}}.</p>
<h3>ARTICLE III - BENEFICIARIES</h3>
<p>The beneficiaries of this Trust shall be as designated in Schedule A attached hereto.</p>
<h3>ARTICLE IV - TRUST PROPERTY</h3>
<p>The Grantor hereby transfers and assigns to the Trustee all property listed in Schedule B attached hereto.</p>
<h3>ARTICLE V - GOVERNING LAW</h3>
<p>This Trust shall be governed by and construed in accordance with the laws of the State of Wyoming.</p>
<h3>SIGNATURES</h3>
<p>Grantor Signature: {{grantorSignature}}</p>
<p>Date: {{signatureDate}}</p>
<p>Trustee Signature: {{trusteeSignature}}</p>
<p>Date: {{signatureDate}}</p>`
  await db.insert(schema.documentTemplates).values({
    id: templateId,
    name: 'Trust Declaration',
    description: 'Wyoming Asset Protection Trust Declaration',
    category: 'Trust',
    folderId,
    content: html,
    variables: JSON.stringify([
      'trustName', 'effectiveDate', 'grantorName', 'grantorState',
      'trusteeName', 'grantorSignature', 'trusteeSignature', 'signatureDate'
    ]),
    requiresNotary: true
  })
  return { id: templateId, html }
}
