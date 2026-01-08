/**
 * API endpoint to seed WYDAPT documents from R2
 *
 * Prerequisites: Documents must be uploaded to R2 first using /api/admin/upload-seed-documents
 *
 * This endpoint:
 * 1. Creates the WYDAPT matter and journey
 * 2. Reads uploaded DOCX files from R2
 * 3. Parses them using our Cloudflare-compatible parser
 * 4. Creates document templates
 */

import { nanoid } from 'nanoid'

interface DocumentGroup {
  name: string
  path: string
  journeyStepName: string
  stepOrder: number
  stepType: 'MILESTONE' | 'BRIDGE'
  responsibleParty: 'CLIENT' | 'ATTORNEY' | 'BOTH'
  expectedDurationDays: number
  helpContent?: string
}

const DOCUMENT_GROUPS: DocumentGroup[] = [
  {
    name: 'General Documents',
    path: 'General-Documents',
    journeyStepName: 'Engagement & Initial Setup',
    stepOrder: 1,
    stepType: 'MILESTONE',
    responsibleParty: 'BOTH',
    expectedDurationDays: 3,
    helpContent: 'Review and sign the engagement agreement to get started with your Wyoming Asset Protection Trust.'
  },
  {
    name: 'Trust Documents',
    path: 'Trust-Documents',
    journeyStepName: 'Trust Formation - Review & Sign',
    stepOrder: 2,
    stepType: 'BRIDGE',
    responsibleParty: 'BOTH',
    expectedDurationDays: 7,
    helpContent: 'These are your main trust documents. Review carefully with your attorney. Multiple revisions are normal.'
  },
  {
    name: 'Wyoming Private Family Trust Documents',
    path: 'Wyoming-Private-Family-Trust-Documents',
    journeyStepName: 'Private Trust Company Setup',
    stepOrder: 3,
    stepType: 'MILESTONE',
    responsibleParty: 'ATTORNEY',
    expectedDurationDays: 5,
    helpContent: 'Your Private Family Trust Company documents establish the trustee entity.'
  },
  {
    name: 'Non Charitable Specific Purpose Trust Documents',
    path: 'Non-Charitable-Specific-Purpose-Trust-Documents',
    journeyStepName: 'Special Purpose Trust (if applicable)',
    stepOrder: 4,
    stepType: 'MILESTONE',
    responsibleParty: 'ATTORNEY',
    expectedDurationDays: 5,
    helpContent: 'Special purpose trust documents (only if your plan includes this structure).'
  },
  {
    name: 'Investment Decisions',
    path: 'Investment-Decisions',
    journeyStepName: 'Investment Committee Formation',
    stepOrder: 5,
    stepType: 'MILESTONE',
    responsibleParty: 'CLIENT',
    expectedDurationDays: 5,
    helpContent: 'Establish your Investment Committee to manage trust assets.'
  },
  {
    name: 'Contributions to Trust',
    path: 'Contributions-to-Trust',
    journeyStepName: 'Asset Contribution Process',
    stepOrder: 6,
    stepType: 'BRIDGE',
    responsibleParty: 'BOTH',
    expectedDurationDays: 14,
    helpContent: 'Transfer assets into your trust. This process may require back-and-forth coordination.'
  },
  {
    name: 'Distributions From Trust',
    path: 'Distributions-From-Trust',
    journeyStepName: 'Distribution Management (Ongoing)',
    stepOrder: 7,
    stepType: 'BRIDGE',
    responsibleParty: 'BOTH',
    expectedDurationDays: 7,
    helpContent: 'Request and approve distributions from your trust when needed.'
  }
]

function extractVariables(text: string): Set<string> {
  const variables = new Set<string>()

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

export default defineEventHandler(async (event) => {
  requireRole(event, ['ADMIN', 'LAWYER'])

  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  const blob = hubBlob()

  const log: string[] = []
  log.push('🚀 Starting WYDAPT Document Seeding from R2...')

  try {
    // Check if WYDAPT service catalog entry already exists
    const existingCatalog = await db.select({ id: schema.serviceCatalog.id })
      .from(schema.serviceCatalog)
      .where(eq(schema.serviceCatalog.name, 'Wyoming Asset Protection Trust (WYDAPT)'))
      .limit(1)
      .get()

    if (existingCatalog) {
      return {
        success: false,
        message: 'WYDAPT service catalog entry already exists. Delete it first if you want to re-seed.',
        catalogId: existingCatalog.id
      }
    }

    // 1. Create WYDAPT Service Catalog Entry
    log.push('📋 Creating WYDAPT Service Catalog Entry...')
    const catalogId = nanoid()
    const now = new Date()

    await db.insert(schema.serviceCatalog).values({
      id: catalogId,
      name: 'Wyoming Asset Protection Trust (WYDAPT)',
      description: 'Comprehensive asset protection trust formation and ongoing management for Wyoming Asset Protection Trusts',
      category: 'Trust Formation',
      type: 'SINGLE',
      price: 1850000, // $18,500
      isActive: true,
      createdAt: now,
      updatedAt: now
    })
    log.push(`✅ Service catalog entry created: ${catalogId}`)

    // 2. Create WYDAPT Journey
    log.push('🗺️  Creating WYDAPT Journey...')
    const journeyId = nanoid()

    await db.insert(schema.journeys).values({
      id: journeyId,
      serviceCatalogId: catalogId,
      name: 'Wyoming Asset Protection Trust Journey',
      description: 'Complete workflow for setting up and managing a Wyoming Asset Protection Trust, including all required documents and ongoing processes.',
      isActive: true,
      estimatedDurationDays: 60, // ~2 months estimated
      createdAt: now,
      updatedAt: now
    })
    log.push(`✅ Journey created: ${journeyId}`)

    // 3. Process each document group
    let totalDocs = 0
    const errors: string[] = []

    for (const group of DOCUMENT_GROUPS) {
      log.push(`\n📂 Processing: ${group.name}`)
      log.push(`   Creating step: ${group.journeyStepName}`)

      // Create journey step
      const stepId = nanoid()
      const stepNow = new Date()

      await db.insert(schema.journeySteps).values({
        id: stepId,
        journeyId,
        stepType: group.stepType,
        name: group.journeyStepName,
        description: `Documents: ${group.name}`,
        stepOrder: group.stepOrder,
        responsibleParty: group.responsibleParty,
        expectedDurationDays: group.expectedDurationDays,
        helpContent: group.helpContent || '',
        allowMultipleIterations: group.stepType === 'BRIDGE',
        createdAt: stepNow,
        updatedAt: stepNow
      })
      log.push(`   ✅ Step created: ${stepId}`)

      // List all files in this group's R2 path
      const groupPath = `seed-documents/${group.path}/`

      try {
        // R2 list operation - get all blobs with the prefix
        const result = await blob.list({ prefix: groupPath })
        const blobs = result.blobs || []

        log.push(`   Found ${blobs.length} documents in R2`)

        // Process each document
        for (const obj of blobs) {
          const filename = obj.pathname.split('/').pop() || obj.pathname
          if (!filename.endsWith('.docx')) continue

          log.push(`   📄 Parsing: ${filename}`)

          try {
            // Fetch document from R2
            const file = await blob.get(obj.pathname)
            if (!file) {
              errors.push(`File not found: ${obj.pathname}`)
              continue
            }

            const buffer = await file.arrayBuffer()

            // Parse DOCX using our Cloudflare-compatible parser
            const { text, html, paragraphs } = parseDocx(buffer)

            // Extract variables
            const variables = extractVariables(text)
            log.push(`      Variables found: ${variables.size}`)

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
            const templateNow = new Date()

            await db.insert(schema.documentTemplates).values({
              id: templateId,
              name: filename.replace('.docx', ''),
              description: `From ${group.name}`,
              category,
              content: html, // Keep the HTML content with {{ variable }} syntax
              variables: JSON.stringify(Array.from(variables)),
              requiresNotary,
              isActive: true,
              originalFileName: filename,
              fileExtension: 'docx',
              createdAt: templateNow,
              updatedAt: templateNow
            })

            log.push(`      ✅ Template created: ${templateId}`)
            log.push(`         - Paragraphs: ${paragraphs.length}`)
            log.push(`         - Requires Notary: ${requiresNotary}`)
            totalDocs++
          } catch (error) {
            const errorMsg = `Error parsing ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`
            log.push(`      ❌ ${errorMsg}`)
            errors.push(errorMsg)
          }
        }

        log.push(`   ✅ Completed ${group.name}`)
      } catch (error) {
        const errorMsg = `Error listing files for ${group.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        log.push(`   ❌ ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    log.push('\n\n🎉 WYDAPT Document Seeding Complete!')
    log.push(`\n📊 Summary:`)
    log.push(`   - Service Catalog ID: ${catalogId}`)
    log.push(`   - Journey ID: ${journeyId}`)
    log.push(`   - Steps Created: ${DOCUMENT_GROUPS.length}`)
    log.push(`   - Total Documents: ${totalDocs}`)

    if (errors.length > 0) {
      log.push(`\n⚠️  Errors (${errors.length}):`)
      errors.forEach(err => log.push(`   - ${err}`))
    }

    return {
      success: true,
      catalogId,
      journeyId,
      stepsCreated: DOCUMENT_GROUPS.length,
      documentsImported: totalDocs,
      errors: errors.length > 0 ? errors : undefined,
      log: log.join('\n')
    }
  } catch (error) {
    log.push(`\n❌ Seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Seeding failed',
      data: { log: log.join('\n') }
    })
  }
})
