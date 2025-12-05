import { schema } from './index'
import { hashPassword, generateId } from '../utils/auth'
import type { DrizzleD1Database } from 'drizzle-orm/d1'

export async function seedDatabase(db: DrizzleD1Database<typeof schema>) {
  
  console.log('🌱 Seeding database...')
  
  // Create admin/lawyer user
  const lawyerId = generateId()
  const lawyerPassword = await hashPassword('password123')
  
  await db.insert(schema.users).values({
    id: lawyerId,
    email: 'lawyer@yourtrustedplanner.com',
    password: lawyerPassword,
    role: 'LAWYER',
    firstName: 'John',
    lastName: 'Meuli',
    status: 'ACTIVE'
  })
  
  console.log('✅ Created lawyer account: lawyer@yourtrustedplanner.com / password123')
  
  // Create test client
  const clientId = generateId()
  const clientPassword = await hashPassword('password123')
  
  await db.insert(schema.users).values({
    id: clientId,
    email: 'client@test.com',
    password: clientPassword,
    role: 'CLIENT',
    firstName: 'Jane',
    lastName: 'Doe',
    status: 'ACTIVE'
  })
  
  console.log('✅ Created client account: client@test.com / password123')
  
  // Create client profile
  await db.insert(schema.clientProfiles).values({
    id: generateId(),
    userId: clientId,
    assignedLawyerId: lawyerId
  })
  
  console.log('✅ Created client profile')
  
  // Create sample template folder
  const folderId = generateId()
  await db.insert(schema.templateFolders).values({
    id: folderId,
    name: 'Estate Planning',
    description: 'Estate planning documents'
  })
  
  console.log('✅ Created template folder')
  
  // Create sample template
  const templateId = generateId()
  await db.insert(schema.documentTemplates).values({
    id: templateId,
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
  
  console.log('✅ Created sample template')
  
  // Create engagement letter template
  const engagementTemplateId = generateId()
  await db.insert(schema.documentTemplates).values({
    id: engagementTemplateId,
    name: 'Engagement Agreement - WAPA',
    description: 'Wyoming Asset Protection Trust engagement letter',
    category: 'Engagement Letter',
    folderId,
    content: '<h1>Engagement Agreement</h1><p>Client: {{clientName}}</p><p>Service: {{serviceName}}</p><p>Fee: {{fee}}</p>',
    variables: JSON.stringify([
      { name: 'clientName', description: 'Client full name' },
      { name: 'serviceName', description: 'Service description' },
      { name: 'fee', description: 'Total fee amount' }
    ]),
    requiresNotary: false
  })
  
  console.log('✅ Created engagement letter template')
  
  // Create sample matters (products/services)
  const matter1Id = generateId()
  await db.insert(schema.matters).values({
    id: matter1Id,
    name: 'Wyoming Asset Protection Trust',
    description: 'Complete trust formation with asset protection',
    category: 'Trust Formation',
    type: 'SINGLE',
    price: 1850000, // $18,500 in cents
    engagementLetterId: engagementTemplateId
  })
  
  const matter2Id = generateId()
  await db.insert(schema.matters).values({
    id: matter2Id,
    name: 'Annual Trust Maintenance',
    description: 'Ongoing trust administration and compliance',
    category: 'Maintenance',
    type: 'RECURRING',
    price: 50000, // $500 in cents
    duration: 'ANNUALLY'
  })
  
  const matter3Id = generateId()
  await db.insert(schema.matters).values({
    id: matter3Id,
    name: 'LLC Formation - Wyoming',
    description: 'Wyoming LLC formation and setup',
    category: 'Entity Formation',
    type: 'SINGLE',
    price: 250000 // $2,500 in cents
  })
  
  console.log('✅ Created sample matters')
  
  // Create sample consultation questionnaire
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
  
  console.log('✅ Created sample questionnaire')
  
  // Create a sample document for the client to sign
  const sampleDocId = generateId()
  await db.insert(schema.documents).values({
    id: sampleDocId,
    title: 'Trust Purpose Questionnaire',
    description: 'Please fill out and sign this document',
    templateId,
    matterId: matter1Id,
    content: '<h1>Trust Purpose Declaration</h1><p>I, {{fullName}}, declare that the purpose of this trust is: {{trustPurpose}}</p><p>Address: {{address}}</p><p>Date: {{date}}</p>',
    variableValues: null,
    clientId,
    status: 'SENT',
    sentAt: new Date()
  })
  
  console.log('✅ Created sample document for client to sign')
  
  console.log('🎉 Database seeded successfully!')
}

