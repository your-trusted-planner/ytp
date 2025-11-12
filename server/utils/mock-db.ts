// Mock database for local testing when D1 is not available
import { hashPassword } from './auth'

let mockUsers: any[] = []
let mockClientProfiles: any[] = []
let mockDocuments: any[] = []
let mockTemplates: any[] = []
let mockAppointments: any[] = []
let mockActivities: any[] = []

let isInitialized = false

export async function initMockDb() {
  if (isInitialized) return
  
  const lawyerPassword = await hashPassword('password123')
  const clientPassword = await hashPassword('password123')
  
  // Create lawyer
  mockUsers.push({
    id: 'lawyer-1',
    email: 'lawyer@yourtrustedplanner.com',
    password: lawyerPassword,
    role: 'LAWYER',
    firstName: 'John',
    lastName: 'Meuli',
    phone: '555-0100',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date()
  })
  
  // Create test client
  mockUsers.push({
    id: 'client-1',
    email: 'client@test.com',
    password: clientPassword,
    role: 'CLIENT',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '555-0101',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date()
  })
  
  // Create client profile
  mockClientProfiles.push({
    id: 'profile-1',
    userId: 'client-1',
    assignedLawyerId: 'lawyer-1',
    createdAt: new Date(),
    updatedAt: new Date()
  })
  
  // Create sample template
  mockTemplates.push({
    id: 'template-1',
    name: 'Simple Will',
    description: 'Basic will template',
    category: 'Will',
    content: '<h1>Last Will and Testament</h1><p>I, {{fullName}}, being of sound mind...</p>',
    variables: JSON.stringify([
      { name: 'fullName', description: 'Full legal name' },
      { name: 'address', description: 'Current address' }
    ]),
    isActive: true,
    requiresNotary: false,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  })
  
  // Create engagement letter template
  mockTemplates.push({
    id: 'template-2',
    name: 'Engagement Agreement - WAPA',
    description: 'Wyoming Asset Protection Trust engagement letter',
    category: 'Engagement Letter',
    content: '<h1>Engagement Agreement</h1><p>Client: {{clientName}}</p><p>Service: {{serviceName}}</p><p>Fee: {{fee}}</p>',
    variables: JSON.stringify([
      { name: 'clientName', description: 'Client full name' },
      { name: 'serviceName', description: 'Service description' },
      { name: 'fee', description: 'Total fee amount' }
    ]),
    isActive: true,
    requiresNotary: false,
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  })
  
  isInitialized = true
  console.log('✅ Mock database initialized with test data')
}

let mockMatters: any[] = []
let mockClientMatters: any[] = []
let mockQuestionnaires: any[] = []

// Initialize mock matters
export async function initMockMatters() {
  if (mockMatters.length > 0) return
  
  mockMatters.push({
    id: 'matter-1',
    name: 'Wyoming Asset Protection Trust',
    description: 'Complete trust formation with asset protection',
    category: 'Trust Formation',
    type: 'SINGLE',
    price: 1850000, // $18,500
    engagementLetterId: 'template-2',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  })
  
  mockMatters.push({
    id: 'matter-2',
    name: 'Annual Trust Maintenance',
    description: 'Ongoing trust administration and compliance',
    category: 'Maintenance',
    type: 'RECURRING',
    price: 50000, // $500
    duration: 'ANNUALLY',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  })
  
  mockMatters.push({
    id: 'matter-3',
    name: 'LLC Formation - Wyoming',
    description: 'Wyoming LLC formation and setup',
    category: 'Entity Formation',
    type: 'SINGLE',
    price: 250000, // $2,500
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  })
  
  console.log('✅ Mock matters initialized')
}

export const mockDb = {
  users: {
    findByEmail: (email: string) => mockUsers.find(u => u.email === email),
    findById: (id: string) => mockUsers.find(u => u.id === id),
    getAll: () => mockUsers,
    getAllClients: () => mockUsers.filter(u => u.role === 'CLIENT'),
    create: (user: any) => {
      mockUsers.push(user)
      return user
    },
    update: (id: string, data: any) => {
      const index = mockUsers.findIndex(u => u.id === id)
      if (index !== -1) {
        mockUsers[index] = { ...mockUsers[index], ...data, updatedAt: new Date() }
      }
    }
  },
  clientProfiles: {
    create: (profile: any) => {
      mockClientProfiles.push(profile)
      return profile
    },
    findByUserId: (userId: string) => mockClientProfiles.find(p => p.userId === userId)
  },
  documents: {
    getAll: () => mockDocuments,
    getByClientId: (clientId: string) => mockDocuments.filter(d => d.clientId === clientId),
    create: (doc: any) => {
      mockDocuments.push(doc)
      return doc
    },
    findById: (id: string) => mockDocuments.find(d => d.id === id),
    update: (id: string, data: any) => {
      const index = mockDocuments.findIndex(d => d.id === id)
      if (index !== -1) {
        mockDocuments[index] = { ...mockDocuments[index], ...data, updatedAt: new Date() }
      }
    }
  },
  templates: {
    getAll: () => mockTemplates
  },
  matters: {
    getAll: async () => {
      await initMockMatters()
      return mockMatters
    },
    create: (matter: any) => {
      mockMatters.push(matter)
      return matter
    },
    update: (id: string, data: any) => {
      const index = mockMatters.findIndex(m => m.id === id)
      if (index !== -1) {
        mockMatters[index] = { ...mockMatters[index], ...data, updatedAt: new Date() }
      }
    }
  },
  appointments: {
    getAll: () => mockAppointments,
    getByClientId: (clientId: string) => mockAppointments.filter(a => a.clientId === clientId),
    create: (appointment: any) => {
      mockAppointments.push(appointment)
      return appointment
    }
  },
  activities: {
    getRecent: (limit = 10) => mockActivities.slice(0, limit),
    create: (activity: any) => {
      mockActivities.unshift(activity)
      return activity
    }
  }
}

