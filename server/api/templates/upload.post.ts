import { nanoid } from 'nanoid'
import { requireRole } from '../../utils/auth'

// Extract variables from text content
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

  if (text.toLowerCase().includes('date')) {
    variables.add('currentDate')
  }

  return variables
}

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])
  
  const form = await readMultipartFormData(event)
  
  if (!form) {
    throw createError({
      statusCode: 400,
      message: 'No file uploaded'
    })
  }

  // Extract form data
  let fileData: any = null
  let name = ''
  let description = ''
  let category = 'General'

  for (const item of form) {
    if (item.name === 'file') {
      fileData = item
    } else if (item.name === 'name') {
      name = item.data.toString()
    } else if (item.name === 'description') {
      description = item.data.toString()
    } else if (item.name === 'category') {
      category = item.data.toString()
    }
  }

  if (!fileData) {
    throw createError({
      statusCode: 400,
      message: 'No file provided'
    })
  }

  // Get filename and extension
  const filename = fileData.filename || 'template'
  const extension = filename.split('.').pop()?.toLowerCase() || ''
  
  // Only allow DOCX files
  if (extension !== 'docx') {
    throw createError({
      statusCode: 400,
      message: 'Only DOCX files are supported'
    })
  }

  try {
    // Parse DOCX file
    const buffer = fileData.data.buffer
    const { text, html, paragraphs } = parseDocx(buffer)

    // Extract variables from the content
    const variables = extractVariables(text)

    // Determine if requires notary
    const lowerText = text.toLowerCase()
    const lowerFilename = filename.toLowerCase()
    
    const requiresNotary =
      lowerText.includes('notary') ||
      lowerText.includes('notarized') ||
      lowerFilename.includes('affidavit') ||
      lowerFilename.includes('certification')

    // Auto-detect category if not provided
    if (category === 'General') {
      if (lowerFilename.includes('operating agreement')) category = 'LLC'
      else if (lowerFilename.includes('meeting') || lowerFilename.includes('minutes')) category = 'Meeting Minutes'
      else if (lowerFilename.includes('questionnaire')) category = 'Questionnaire'
      else if (lowerFilename.includes('affidavit')) category = 'Affidavit'
      else if (lowerFilename.includes('certification')) category = 'Certificate'
      else if (lowerFilename.includes('engagement')) category = 'Engagement'
      else if (lowerFilename.includes('trust')) category = 'Trust'
    }

    // Use provided name or filename without extension
    const templateName = name || filename.replace('.docx', '')

    // Create template in database
    const db = hubDatabase()
    const templateId = nanoid()

    await db.prepare(`
      INSERT INTO document_templates (
        id, name, description, category, content, variables, requires_notary,
        is_active, original_file_name, file_extension, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      templateId,
      templateName,
      description || `Imported from ${filename}`,
      category,
      html, // Store HTML content with variable placeholders
      JSON.stringify(Array.from(variables)),
      requiresNotary ? 1 : 0,
      1, // Active by default
      filename,
      'docx',
      Date.now(),
      Date.now()
    ).run()

    return {
      success: true,
      template: {
        id: templateId,
        name: templateName,
        description: description || `Imported from ${filename}`,
        category,
        variables: Array.from(variables),
        variableCount: variables.size,
        paragraphCount: paragraphs.length,
        requiresNotary,
        originalFileName: filename
      }
    }
  } catch (error) {
    console.error('Error processing template upload:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
})

