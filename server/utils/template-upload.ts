import { nanoid } from 'nanoid'
import { parseDocx } from './docx-parser'

export interface TemplateUploadOptions {
  /** DOCX file buffer */
  buffer: ArrayBuffer
  /** Original filename */
  filename: string
  /** Optional template name (defaults to filename without extension) */
  name?: string
  /** Optional description */
  description?: string
  /** Optional category (auto-detected if not provided) */
  category?: string
  /** Optional folder ID to place template in */
  folderId?: string
  /** Skip variable validation (for templates with complex syntax) */
  skipVariableValidation?: boolean
}

export interface TemplateUploadResult {
  id: string
  name: string
  description: string
  category: string
  variables: string[]
  variableCount: number
  paragraphCount: number
  requiresNotary: boolean
  originalFileName: string
  docxBlobKey: string
  html: string
}

/**
 * Extract variables from text content using handlebars syntax
 */
export function extractVariables(text: string): Set<string> {
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

/**
 * Validate variable names - only allow letters, numbers, underscores, and hyphens
 */
export function validateVariableNames(variables: Set<string>): { valid: boolean, invalidVars: string[], message?: string } {
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
      message: `Invalid variable names found. Variables can only contain letters, numbers, underscores (_), and hyphens (-).`
    }
  }

  return { valid: true, invalidVars: [] }
}

/**
 * Auto-detect document category from filename
 */
export function detectCategory(filename: string): string {
  const lowerFilename = filename.toLowerCase()

  if (lowerFilename.includes('operating agreement')) return 'LLC'
  if (lowerFilename.includes('meeting') || lowerFilename.includes('minutes')) return 'Meeting Minutes'
  if (lowerFilename.includes('questionnaire')) return 'Questionnaire'
  if (lowerFilename.includes('affidavit')) return 'Affidavit'
  if (lowerFilename.includes('certification')) return 'Certificate'
  if (lowerFilename.includes('engagement')) return 'Engagement Letter'
  if (lowerFilename.includes('trust')) return 'Trust'
  if (lowerFilename.includes('will')) return 'Will'

  return 'General'
}

/**
 * Detect if document requires notarization
 */
export function detectNotaryRequirement(text: string, filename: string): boolean {
  const lowerText = text.toLowerCase()
  const lowerFilename = filename.toLowerCase()

  return (
    lowerText.includes('notary') ||
    lowerText.includes('notarized') ||
    lowerFilename.includes('affidavit') ||
    lowerFilename.includes('certification')
  )
}

/**
 * Process and store a DOCX template
 *
 * This function:
 * 1. Parses the DOCX file to extract HTML and text
 * 2. Extracts and validates variables
 * 3. Auto-detects category and notary requirements
 * 4. Stores the original DOCX in blob storage
 * 5. Creates the database record
 *
 * @param options Upload options including buffer and metadata
 * @param db Drizzle database instance
 * @param schema Database schema
 * @param blob Blob storage instance (hubBlob)
 * @returns Created template details
 */
export async function processTemplateUpload(
  options: TemplateUploadOptions,
  db: any,
  schema: any,
  blob: any
): Promise<TemplateUploadResult> {
  const { buffer, filename, name, description, category, folderId, skipVariableValidation } = options

  // Validate file extension
  const extension = filename.split('.').pop()?.toLowerCase() || ''
  if (extension !== 'docx') {
    throw new Error('Only DOCX files are supported')
  }

  // Parse DOCX file
  const { text, html, paragraphs } = parseDocx(buffer)

  // Extract variables from the content
  const variables = extractVariables(text)

  // Validate variable names (unless skipped)
  if (!skipVariableValidation) {
    const validation = validateVariableNames(variables)
    if (!validation.valid) {
      throw new Error(
        `${validation.message}\n\nInvalid variables found:\n${validation.invalidVars.map(v => `  - {{${v}}}`).join('\n')}`
      )
    }
  }

  // Auto-detect category if not provided
  const finalCategory = category || detectCategory(filename)

  // Detect notary requirement
  const requiresNotary = detectNotaryRequirement(text, filename)

  // Use provided name or filename without extension
  const templateName = name || filename.replace('.docx', '')

  // Generate template ID
  const templateId = nanoid()

  // Store original DOCX file in blob storage
  const blobKey = `templates/${templateId}/${filename}`
  await blob.put(blobKey, buffer)

  const now = new Date()

  // Create database record
  await db.insert(schema.documentTemplates).values({
    id: templateId,
    name: templateName,
    description: description || `Imported from ${filename}`,
    category: finalCategory,
    folderId: folderId || null,
    content: html,
    variables: JSON.stringify(Array.from(variables)),
    requiresNotary,
    isActive: true,
    originalFileName: filename,
    fileExtension: 'docx',
    docxBlobKey: blobKey,
    createdAt: now,
    updatedAt: now
  })

  return {
    id: templateId,
    name: templateName,
    description: description || `Imported from ${filename}`,
    category: finalCategory,
    variables: Array.from(variables),
    variableCount: variables.size,
    paragraphCount: paragraphs.length,
    requiresNotary,
    originalFileName: filename,
    docxBlobKey: blobKey,
    html
  }
}
