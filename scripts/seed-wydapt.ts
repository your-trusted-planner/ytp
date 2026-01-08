// Seed script to import WYDAPT documents and create journey
import { readdir } from 'fs/promises'
import { join } from 'path'
import Database from 'better-sqlite3'
import { nanoid } from 'nanoid'
import mammoth from 'mammoth'
import { readFile } from 'fs/promises'

const WYDAPT_DOCS_PATH = join(process.cwd(), '..', 'WYDAPT DOCS')

interface DocumentGroup {
  name: string
  path: string
  journeyStepName: string
  stepOrder: number
  stepType: 'MILESTONE' | 'BRIDGE'
  responsibleParty: 'CLIENT' | 'COUNSEL' | 'BOTH'
  expectedDurationDays: number
  helpContent?: string
}

const DOCUMENT_GROUPS: DocumentGroup[] = [
  {
    name: 'General Documents',
    path: 'General Documents',
    journeyStepName: 'Engagement & Initial Setup',
    stepOrder: 1,
    stepType: 'MILESTONE',
    responsibleParty: 'BOTH',
    expectedDurationDays: 3,
    helpContent: 'Review and sign the engagement agreement to get started with your Wyoming Asset Protection Trust.'
  },
  {
    name: 'Trust Documents',
    path: 'Trust Documents',
    journeyStepName: 'Trust Formation - Review & Sign',
    stepOrder: 2,
    stepType: 'BRIDGE',
    responsibleParty: 'BOTH',
    expectedDurationDays: 7,
    helpContent: 'These are your main trust documents. Review carefully with your attorney. Multiple revisions are normal.'
  },
  {
    name: 'Wyoming Private Family Trust Documents',
    path: 'Wyoming Private Family Trust Documents',
    journeyStepName: 'Private Trust Company Setup',
    stepOrder: 3,
    stepType: 'MILESTONE',
    responsibleParty: 'COUNSEL',
    expectedDurationDays: 5,
    helpContent: 'Your Private Family Trust Company documents establish the trustee entity.'
  },
  {
    name: 'Non Charitable Specific Purpose Trust Documents',
    path: 'Non Charitable Specific Purpose Trust Documents',
    journeyStepName: 'Special Purpose Trust (if applicable)',
    stepOrder: 4,
    stepType: 'MILESTONE',
    responsibleParty: 'COUNSEL',
    expectedDurationDays: 5,
    helpContent: 'Special purpose trust documents (only if your plan includes this structure).'
  },
  {
    name: 'Investment Decisions',
    path: 'Investment Decisions',
    journeyStepName: 'Investment Committee Formation',
    stepOrder: 5,
    stepType: 'MILESTONE',
    responsibleParty: 'CLIENT',
    expectedDurationDays: 5,
    helpContent: 'Establish your Investment Committee to manage trust assets.'
  },
  {
    name: 'Contributions to Trust',
    path: 'Contributions to Trust',
    journeyStepName: 'Asset Contribution Process',
    stepOrder: 6,
    stepType: 'BRIDGE',
    responsibleParty: 'BOTH',
    expectedDurationDays: 14,
    helpContent: 'Transfer assets into your trust. This process may require back-and-forth coordination.'
  },
  {
    name: 'Distributions From Trust',
    path: 'Distributions From Trust',
    journeyStepName: 'Distribution Management (Ongoing)',
    stepOrder: 7,
    stepType: 'BRIDGE',
    responsibleParty: 'BOTH',
    expectedDurationDays: 7,
    helpContent: 'Request and approve distributions from your trust when needed.'
  }
]

// Standard variable mappings
const VARIABLE_MAP: Record<string, string> = {
  'client': 'clientFirstName',
  'clientname': 'clientFirstName',
  'name': 'clientFirstName',
  'firstname': 'clientFirstName',
  'lastname': 'clientLastName',
  'fullname': 'clientFullName',
  'address': 'clientAddress',
  'city': 'clientCity',
  'state': 'clientState',
  'zip': 'clientZipCode',
  'zipcode': 'clientZipCode',
  'email': 'clientEmail',
  'phone': 'clientPhone',
  'spouse': 'spouseName',
  'spousename': 'spouseName',
  'spousefirstname': 'spouseFirstName',
  'spouselastname': 'spouseLastName',
  'trust': 'trustName',
  'trustname': 'trustName',
  'trustee': 'trusteeName',
  'trusteename': 'trusteeName',
  'trustee1': 'trustee1Name',
  'trustee2': 'trustee2Name',
  'settlor': 'settlorName',
  'settlorname': 'settlorName',
  'grantor': 'grantorName',
  'grantorname': 'grantorName',
  'grantor1': 'grantor1Name',
  'grantor2': 'grantor2Name',
  'beneficiary': 'beneficiaryName',
  'date': 'currentDate',
  'signaturedate': 'signatureDate',
  'today': 'currentDate',
  'trustdate': 'trustCreationDate',
  'contribution': 'contributionAmount',
  'distribution': 'distributionAmount',
  'amount': 'amount',
  'property': 'propertyDescription',
  'asset': 'assetDescription',
  'notary': 'notaryName',
  'notaryname': 'notaryName',
  'commission': 'notaryCommissionNumber',
  'expiration': 'notaryExpirationDate',
  'ddc': 'ddcName',
  'wapa': 'wapaName',
  'ptc': 'ptcName',
  'pftc': 'pftcName',
  'investmentcommittee': 'investmentCommitteeName',
  'member1': 'investmentCommitteeMember1',
  'member2': 'investmentCommitteeMember2',
  'member3': 'investmentCommitteeMember3'
}

async function parseDocx(filePath: string): Promise<{ html: string; text: string }> {
  const buffer = await readFile(filePath)
  const result = await mammoth.convertToHtml({ buffer })
  const textResult = await mammoth.extractRawText({ buffer })
  return {
    html: result.value,
    text: textResult.value
  }
}

function extractVariables(text: string): Set<string> {
  const variables = new Set<string>()
  
  // Pattern 1: [[Variable]]
  const pattern1 = /\[\[([^\]]+)\]\]/g
  let match
  while ((match = pattern1.exec(text)) !== null) {
    const varName = match[1].trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    variables.add(VARIABLE_MAP[varName] || match[1].trim())
  }
  
  // Pattern 2: {Variable} - but filter out dates/numbers
  const pattern2 = /\{([^}]+)\}/g
  while ((match = pattern2.exec(text)) !== null) {
    const content = match[1].trim()
    if (!content.match(/^\d+$/) && !content.match(/^[0-9\/\-]+$/)) {
      const varName = content.toLowerCase().replace(/[^a-z0-9]/g, '')
      variables.add(VARIABLE_MAP[varName] || content.trim())
    }
  }
  
  // Pattern 3: <<Variable>>
  const pattern3 = /<<([^>]+)>>/g
  while ((match = pattern3.exec(text)) !== null) {
    const varName = match[1].trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    variables.add(VARIABLE_MAP[varName] || match[1].trim())
  }
  
  // Common fields in legal documents (add standard ones)
  if (text.toLowerCase().includes('signature') || text.toLowerCase().includes('sign')) {
    variables.add('clientSignature')
    variables.add('signatureDate')
  }
  
  if (text.toLowerCase().includes('notary')) {
    variables.add('notaryName')
    variables.add('notaryCommissionNumber')
    variables.add('notaryExpirationDate')
    variables.add('notaryState')
  }
  
  return variables
}

function convertToTemplate(html: string): string {
  let template = html
  
  // Replace [[Variable]] with {{variable}}
  template = template.replace(/\[\[([^\]]+)\]\]/g, (match, varName) => {
    const normalized = varName.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    return `{{${VARIABLE_MAP[normalized] || varName.trim()}}}`
  })
  
  // Replace {Variable} with {{variable}} - but not dates/numbers
  template = template.replace(/\{([^}]+)\}/g, (match, varName) => {
    const content = varName.trim()
    if (content.match(/^\d+$/) || content.match(/^[0-9\/\-]+$/)) {
      return match
    }
    const normalized = content.toLowerCase().replace(/[^a-z0-9]/g, '')
    return `{{${VARIABLE_MAP[normalized] || content.trim()}}}`
  })
  
  // Replace <<Variable>> with {{variable}}
  template = template.replace(/<<([^>]+)>>/g, (match, varName) => {
    const normalized = varName.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    return `{{${VARIABLE_MAP[normalized] || varName.trim()}}}`
  })
  
  return template
}

async function seedWYDAPTDocuments() {
  console.log('🚀 Starting WYDAPT Document Seeding...\n')
  
  // Connect to database
  const dbPath = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/local.sqlite'
  const db = new Database(dbPath)
  
  try {
    // 1. Create WYDAPT Service Catalog Entry
    console.log('📋 Creating WYDAPT Service Catalog Entry...')
    const catalogId = nanoid()
    db.prepare(`
      INSERT INTO service_catalog (
        id, name, description, category, type, price, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      catalogId,
      'Wyoming Asset Protection Trust (WYDAPT)',
      'Comprehensive asset protection trust formation and ongoing management for Wyoming Asset Protection Trusts',
      'Trust Formation',
      'SINGLE',
      1850000, // $18,500
      1,
      Date.now(),
      Date.now()
    )
    console.log(`✅ Service catalog entry created: ${catalogId}\n`)

    // 2. Create WYDAPT Journey
    console.log('🗺️  Creating WYDAPT Journey...')
    const journeyId = nanoid()
    db.prepare(`
      INSERT INTO journeys (
        id, service_catalog_id, name, description, is_active, estimated_duration_days, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      journeyId,
      catalogId,
      'Wyoming Asset Protection Trust Journey',
      'Complete workflow for setting up and managing a Wyoming Asset Protection Trust, including all required documents and ongoing processes.',
      1,
      60, // ~2 months estimated
      Date.now(),
      Date.now()
    )
    console.log(`✅ Journey created: ${journeyId}\n`)
    
    // 3. Process each document group
    for (const group of DOCUMENT_GROUPS) {
      console.log(`\n📂 Processing: ${group.name}`)
      console.log(`   Creating step: ${group.journeyStepName}`)
      
      // Create journey step
      const stepId = nanoid()
      db.prepare(`
        INSERT INTO journey_steps (
          id, journey_id, step_type, name, description, step_order, responsible_party,
          expected_duration_days, help_content, allow_multiple_iterations, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        stepId,
        journeyId,
        group.stepType,
        group.journeyStepName,
        `Documents: ${group.name}`,
        group.stepOrder,
        group.responsibleParty,
        group.expectedDurationDays,
        group.helpContent || '',
        group.stepType === 'BRIDGE' ? 1 : 0,
        Date.now(),
        Date.now()
      )
      console.log(`   ✅ Step created: ${stepId}`)
      
      // Get all DOCX files in this group
      const groupPath = join(WYDAPT_DOCS_PATH, group.path)
      const files = await readdir(groupPath)
      const docxFiles = files.filter(f => f.endsWith('.docx')).sort()
      
      console.log(`   Found ${docxFiles.length} documents to import`)
      
      // Process each document
      for (const filename of docxFiles) {
        const filePath = join(groupPath, filename)
        console.log(`   📄 Parsing: ${filename}`)
        
        try {
          // Parse DOCX
          const { html, text } = await parseDocx(filePath)
          
          // Extract variables
          const variables = extractVariables(text)
          console.log(`      Variables found: ${variables.size}`)
          
          // Convert to template
          const templateContent = convertToTemplate(html)
          
          // Determine document metadata
          const lowerFilename = filename.toLowerCase()
          const lowerText = text.toLowerCase()
          
          const requiresSignature = 
            lowerText.includes('signature') ||
            lowerText.includes('signed by') ||
            lowerFilename.includes('agreement') ||
            lowerFilename.includes('affidavit') ||
            lowerFilename.includes('trust')
          
          const requiresNotary = 
            lowerText.includes('notary') ||
            lowerText.includes('notarized') ||
            lowerFilename.includes('affidavit') ||
            lowerFilename.includes('certification')
          
          let category = 'Trust'
          if (lowerFilename.includes('operating agreement')) category = 'LLC'
          else if (lowerFilename.includes('meeting') || lowerFilename.includes('minutes')) category = 'Meeting Minutes'
          else if (lowerFilename.includes('questionnaire')) category = 'Questionnaire'
          else if (lowerFilename.includes('affidavit')) category = 'Affidavit'
          else if (lowerFilename.includes('certification')) category = 'Certificate'
          else if (lowerFilename.includes('engagement')) category = 'Engagement'
          
          // Create document template
          const templateId = nanoid()
          db.prepare(`
            INSERT INTO document_templates (
              id, name, description, category, content, variables, requires_notary,
              is_active, original_file_name, file_extension, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            templateId,
            filename.replace('.docx', ''),
            `From ${group.name}`,
            category,
            templateContent,
            JSON.stringify(Array.from(variables)),
            requiresNotary ? 1 : 0,
            1,
            filename,
            'docx',
            Date.now(),
            Date.now()
          )
          
          console.log(`      ✅ Template created: ${templateId}`)
          console.log(`         - Requires Signature: ${requiresSignature}`)
          console.log(`         - Requires Notary: ${requiresNotary}`)
          
        } catch (error) {
          console.error(`      ❌ Error parsing ${filename}:`, error.message)
        }
      }
      
      console.log(`   ✅ Completed ${group.name}`)
    }
    
    console.log('\n\n🎉 WYDAPT Document Seeding Complete!')
    console.log(`\n📊 Summary:`)
    console.log(`   - Matter ID: ${matterId}`)
    console.log(`   - Journey ID: ${journeyId}`)
    console.log(`   - Steps Created: ${DOCUMENT_GROUPS.length}`)
    console.log(`   - Total Documents: 28`)
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    throw error
  } finally {
    db.close()
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedWYDAPTDocuments().catch(console.error)
}

export { seedWYDAPTDocuments }

