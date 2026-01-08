import { nanoid } from 'nanoid'
import { requireRole } from '../../utils/auth'
import { blob } from 'hub:blob'

// Extract variables from text content using handlebars syntax only
function extractVariables(text: string): Set<string> {
  const variables = new Set<string>()

  // Only handlebars: {{ variable }}
  const pattern = /\{\{\s*([^}]+?)\s*\}\}/g
  let match
  while ((match = pattern.exec(text)) !== null) {
    const varName = match[1].trim()
    // Don't include Jinja control statements
    if (!varName.includes('%') &&
        !varName.startsWith('if ') &&
        !varName.startsWith('for ') &&
        !varName.startsWith('end')) {
      variables.add(varName)
    }
  }

  return variables
}

// Validate variable names - only allow letters, numbers, underscores, and hyphens
function validateVariableNames(variables: Set<string>): { valid: boolean, invalidVars: string[], message?: string } {
  const invalidVars: string[] = []
  const validPattern = /^[a-zA-Z0-9_-]+$/

  for (const variable of variables) {
    if (!validPattern.test(variable)) {
      invalidVars.push(variable)
    }
  }

  if (invalidVars.length > 0) {
    return {
      valid: false,
      invalidVars,
      message: `Invalid variable names found. Variables can only contain letters, numbers, underscores (_), and hyphens (-). Please remove special characters like pipes (|), dots (.), spaces, or other symbols.`
    }
  }

  return { valid: true, invalidVars: [] }
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

    // Validate variable names
    const validation = validateVariableNames(variables)
    if (!validation.valid) {
      throw createError({
        statusCode: 400,
        message: `${validation.message}\n\nInvalid variables found:\n${validation.invalidVars.map(v => `  • {{${v}}}`).join('\n')}\n\nPlease update your template and use only letters, numbers, underscores, and hyphens in variable names.\n\nExample: {{trustee_name}} or {{trustee-name}} instead of {{trustee|name}}`
      })
    }

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
    const { useDrizzle, schema } = await import('../../db')
    const db = useDrizzle()
    const templateId = nanoid()

    // Store original DOCX file in blob storage
    const blobKey = `templates/${templateId}/${filename}`
    await blob.put(blobKey, buffer)

    const now = new Date()

    await db.insert(schema.documentTemplates).values({
      id: templateId,
      name: templateName,
      description: description || `Imported from ${filename}`,
      category,
      content: html, // Store HTML content for preview
      variables: JSON.stringify(Array.from(variables)),
      requiresNotary,
      isActive: true, // Active by default
      originalFileName: filename,
      fileExtension: 'docx',
      docxBlobKey: blobKey, // Store blob storage path
      createdAt: now,
      updatedAt: now
    })

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


