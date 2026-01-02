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
  responsibleParty: 'CLIENT' | 'COUNSEL' | 'BOTH'
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
    responsibleParty: 'COUNSEL',
    expectedDurationDays: 5,
    helpContent: 'Your Private Family Trust Company documents establish the trustee entity.'
  },
  {
    name: 'Non Charitable Specific Purpose Trust Documents',
    path: 'Non-Charitable-Specific-Purpose-Trust-Documents',
    journeyStepName: 'Special Purpose Trust (if applicable)',
    stepOrder: 4,
    stepType: 'MILESTONE',
    responsibleParty: 'COUNSEL',
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
  const { user } = await requireUserSession(event)

  // Only admins and lawyers can seed
  if (user.role !== 'ADMIN' && user.role !== 'LAWYER') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized - admin or lawyer only'
    })
  }

  const db = hubDatabase()
  const blob = hubBlob()

  const log: string[] = []
  log.push('🚀 Starting WYDAPT Document Seeding from R2...')

  try {
    // Check if WYDAPT service catalog entry already exists
    const existingCatalog = await db.prepare(`
      SELECT id FROM service_catalog WHERE name = 'Wyoming Asset Protection Trust (WYDAPT)' LIMIT 1
    `).first()

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
    await db.prepare(`
      INSERT INTO service_catalog (
        id, name, description, category, type, price, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      catalogId,
      'Wyoming Asset Protection Trust (WYDAPT)',
      'Comprehensive asset protection trust formation and ongoing management for Wyoming Asset Protection Trusts',
      'Trust Formation',
      'SINGLE',
      1850000, // $18,500
      1,
      Date.now(),
      Date.now()
    ).run()
    log.push(`✅ Service catalog entry created: ${catalogId}`)

    // 2. Create WYDAPT Journey
    log.push('🗺️  Creating WYDAPT Journey...')
    const journeyId = nanoid()
    await db.prepare(`
      INSERT INTO journeys (
        id, service_catalog_id, name, description, is_template, is_active, estimated_duration_days, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      journeyId,
      catalogId,
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
    const errors: string[] = []

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
              html, // Keep the HTML content with {{ variable }} syntax
              JSON.stringify(Array.from(variables)),
              requiresNotary ? 1 : 0,
              1,
              filename,
              'docx',
              Date.now(),
              Date.now()
            ).run()

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
