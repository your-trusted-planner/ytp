import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

export interface DocxGenerationOptions {
  templateBuffer: ArrayBuffer
  data: Record<string, any>
}

/**
 * Generate a DOCX file from a template using docxtemplater
 *
 * @param options Template buffer and data to fill in
 * @returns Generated DOCX file as ArrayBuffer
 */
export function generateDocx(options: DocxGenerationOptions): ArrayBuffer {
  const { templateBuffer, data } = options

  try {
    // Load the docx file as binary content
    const zip = new PizZip(templateBuffer)

    // Create docxtemplater instance with double-brace delimiters to match Handlebars
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '', // Return empty string for null/undefined values
      delimiters: {
        start: '{{',
        end: '}}'
      }
    })

    // Debug: Check what text docxtemplater sees
    const fullText = doc.getFullText()
    const tags = fullText.match(/\{\{[^}]+\}\}/g) || []
    console.log('[docx-generator] Full text length:', fullText.length)
    console.log('[docx-generator] Tags found by regex:', tags.length, tags.slice(0, 10))
    console.log('[docx-generator] Data keys being passed:', Object.keys(data))

    // Render the document (replace all variables)
    doc.render(data)
    console.log('[docx-generator] Document rendered successfully')

    // Get the output as ArrayBuffer
    const output = doc.getZip().generate({
      type: 'arraybuffer',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    return output
  } catch (error) {
    console.error('Error generating DOCX:', error)

    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('Multi error')) {
        throw new Error(`Template contains errors in multiple places. Please check your template syntax.`)
      }
      if (error.message.includes('Unclosed tag')) {
        throw new Error(`Template has unclosed tags. Make sure all {{#if}}, {{#each}} blocks are properly closed.`)
      }
      throw new Error(`DOCX generation failed: ${error.message}`)
    }

    throw new Error('DOCX generation failed: Unknown error')
  }
}

/**
 * Extract variable names from a DOCX template using docxtemplater
 *
 * @param templateBuffer Template DOCX as ArrayBuffer
 * @returns Set of variable names found in the template
 */
export function extractDocxVariables(templateBuffer: ArrayBuffer): Set<string> {
  const variables = new Set<string>()

  try {
    const zip = new PizZip(templateBuffer)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{{',
        end: '}}'
      }
    })

    // Get all tags (variables) from the template
    const tags = doc.getFullText().match(/\{\{([^}]+)\}\}/g) || []

    for (const tag of tags) {
      // Remove {{ }} and clean up
      const varName = tag.replace(/\{\{|\}\}/g, '').trim()

      // Skip Handlebars helpers and control structures
      if (!varName.startsWith('#') &&
          !varName.startsWith('/') &&
          !varName.startsWith('!')) {
        // Get the base variable name (before any dots or spaces)
        const baseName = varName.split(/[\s.]/)[0]
        if (baseName) {
          variables.add(baseName)
        }
      }
    }
  } catch (error) {
    console.error('Error extracting variables from DOCX:', error)
  }

  return variables
}
