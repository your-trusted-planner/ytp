import { useDrizzle, schema } from './index'
import { hashPassword, generateId } from '../utils/auth'

export async function seedDatabase() {
  const db = useDrizzle()
  
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
  await db.insert(schema.documentTemplates).values({
    id: generateId(),
    name: 'Simple Will',
    description: 'Basic will template',
    category: 'Will',
    folderId,
    content: '<h1>Last Will and Testament</h1><p>I, {{fullName}}, being of sound mind...</p>',
    variables: JSON.stringify([
      { name: 'fullName', description: 'Full legal name' },
      { name: 'address', description: 'Current address' }
    ])
  })
  
  console.log('✅ Created sample template')
  
  console.log('🎉 Database seeded successfully!')
}

