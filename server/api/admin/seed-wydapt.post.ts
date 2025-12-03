// API endpoint to seed WYDAPT documents
import { readdir } from 'fs/promises'
import { join } from 'path'
import { nanoid } from 'nanoid'
import mammoth from 'mammoth'
import { readFile } from 'fs/promises'

interface DocumentGroup {
  name: string
  path: string
  journeyStepName: string
  stepOrder: number
  stepType: 'MILESTONE' | 'BRIDGE'
  responsibleParty: 'CLIENT' | 'COUNCIL' | 'BOTH'
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
    responsibleParty: 'COUNCIL',
    expectedDurationDays: 5,
    helpContent: 'Your Private Family Trust Company documents establish the trustee entity.'
  },
  {
    name: 'Non Charitable Specific Purpose Trust Documents',
    path: 'Non Charitable Specific Purpose Trust Documents',
    journeyStepName: 'Special Purpose Trust (if applicable)',
    stepOrder: 4,
    stepType: 'MILESTONE',
    responsibleParty: 'COUNCIL',
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
  
  // These documents use Jinja-style templating, so we need to extract {{ variable }} patterns
  // Pattern 1: {{ variable }} or {{ variable.subfield }}
  const pattern1 = /\{\{\s*([^}]+?)\s*\}\}/g
  let match
  while ((match = pattern1.exec(text)) !== null) {
    const varName = match[1].trim()
    // Don't include Jinja control statements
    if (!varName.includes('%') && !varName.startsWith('if ') && !varName.startsWith('for ')) {
      variables.add(varName)
    }
  }
  
  // Pattern 2: [[Variable]]
  const pattern2 = /\[\[([^\]]+)\]\]/g
  while ((match = pattern2.exec(text)) !== null) {
    variables.add(match[1].trim())
  }
  
  // Pattern 3: <<Variable>>
  const pattern3 = /<<([^>]+)>>/g
  while ((match = pattern3.exec(text)) !== null) {
    variables.add(match[1].trim())
  }
  
  // Pattern 4: Underscores (blank fill-in fields)
  const underscoreMatches = text.match(/_{5,}/g)
  if (underscoreMatches && underscoreMatches.length > 0) {
    for (let i = 0; i < underscoreMatches.length; i++) {
      variables.add(`blankField${i + 1}`)
    }
  }
  
  // Common fields in legal documents
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
  // These documents already use Jinja/Django templating syntax {{ variable }}
  // We'll keep that format and just ensure it's clean
  let template = html
  
  // The documents already have {{ variable }} format, which is compatible with our system
  // We just need to ensure they're properly formatted
  
  // Replace [[Variable]] with {{variable}} if any exist
  template = template.replace(/\[\[([^\]]+)\]\]/g, (match, varName) => {
    return `{{${varName.trim()}}}`
  })
  
  // Replace <<Variable>> with {{variable}} if any exist
  template = template.replace(/<<([^>]+)>>/g, (match, varName) => {
    return `{{${varName.trim()}}}`
  })
  
  // Keep Jinja {% if %} and {{ variable }} syntax as-is
  // Our template parser will need to handle these
  
  return template
}

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  
  // Only admins can seed
  if (user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized - admin only'
    })
  }

  const db = hubDatabase()
  const WYDAPT_DOCS_PATH = join(process.cwd(), '..', 'WYDAPT DOCS')
  
  const log: string[] = []
  log.push('🚀 Starting WYDAPT Document Seeding...')
  
  try {
    // 1. Create WYDAPT Matter
    log.push('📋 Creating WYDAPT Matter...')
    const matterId = nanoid()
    await db.prepare(`
      INSERT INTO matters (
        id, name, description, category, type, price, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      matterId,
      'Wyoming Asset Protection Trust (WYDAPT)',
      'Comprehensive asset protection trust formation and ongoing management for Wyoming Asset Protection Trusts',
      'Trust Formation',
      'SINGLE',
      1850000, // $18,500
      1,
      Date.now(),
      Date.now()
    ).run()
    log.push(`✅ Matter created: ${matterId}`)
    
    // 2. Create WYDAPT Journey
    log.push('🗺️  Creating WYDAPT Journey...')
    const journeyId = nanoid()
    await db.prepare(`
      INSERT INTO journeys (
        id, matter_id, name, description, is_template, is_active, estimated_duration_days, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      journeyId,
      matterId,
      'Wyoming Asset Protection Trust Journey',
      'Complete workflow for setting up and managing a Wyoming Asset Protection Trust, including all required documents and ongoing processes.',
      1, // This is a template
      1,
      60, // ~2 months estimated
      Date.now(),
      Date.now()
    ).run()
    log.push(`✅ Journey created: ${journeyId}`)
    
    // 3. Process each document group
    let totalDocs = 0
    for (const group of DOCUMENT_GROUPS) {
      log.push(`\n📂 Processing: ${group.name}`)
      log.push(`   Creating step: ${group.journeyStepName}`)
      
      // Create journey step
      const stepId = nanoid()
      await db.prepare(`
        INSERT INTO journey_steps (
          id, journey_id, step_type, name, description, step_order, responsible_party,
          expected_duration_days, help_content, allow_multiple_iterations, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
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
      ).run()
      log.push(`   ✅ Step created: ${stepId}`)
      
      // Get all DOCX files in this group
      const groupPath = join(WYDAPT_DOCS_PATH, group.path)
      const files = await readdir(groupPath)
      const docxFiles = files.filter(f => f.endsWith('.docx')).sort()
      
      log.push(`   Found ${docxFiles.length} documents to import`)
      
      // Process each document
      for (const filename of docxFiles) {
        const filePath = join(groupPath, filename)
        log.push(`   📄 Parsing: ${filename}`)
        
        try {
          // Parse DOCX
          const { html, text } = await parseDocx(filePath)
          
          // Extract variables using the enhanced renderer
          const renderer = useTemplateRenderer()
          const variables = renderer.extractVariableNames(text)
          log.push(`      Variables found: ${variables.size}`)
          
          // Log some sample variables for debugging
          if (variables.size > 0) {
            const sampleVars = Array.from(variables).slice(0, 5)
            log.push(`      Sample: ${sampleVars.join(', ')}`)
          }
          
          // For Jinja-templated documents, we keep the original HTML
          // They already have {{ variable }} and {% if %} syntax
          const templateContent = html
          
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
          await db.prepare(`
            INSERT INTO document_templates (
              id, name, description, category, content, variables, requires_notary,
              is_active, original_file_name, file_extension, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
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
          ).run()
          
          log.push(`      ✅ Template created: ${templateId}`)
          log.push(`         - Requires Notary: ${requiresNotary}`)
          totalDocs++
          
        } catch (error) {
          log.push(`      ❌ Error parsing ${filename}: ${error.message}`)
        }
      }
      
      log.push(`   ✅ Completed ${group.name}`)
    }
    
    log.push('\n\n🎉 WYDAPT Document Seeding Complete!')
    log.push(`\n📊 Summary:`)
    log.push(`   - Matter ID: ${matterId}`)
    log.push(`   - Journey ID: ${journeyId}`)
    log.push(`   - Steps Created: ${DOCUMENT_GROUPS.length}`)
    log.push(`   - Total Documents: ${totalDocs}`)
    
    return {
      success: true,
      matterId,
      journeyId,
      stepsCreated: DOCUMENT_GROUPS.length,
      documentsImported: totalDocs,
      log: log.join('\n')
    }
    
  } catch (error) {
    log.push(`\n❌ Seeding failed: ${error.message}`)
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }
})

