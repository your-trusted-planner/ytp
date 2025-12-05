import { unzipSync } from 'fflate'
import { XMLParser } from 'fast-xml-parser'

export interface DocxContent {
  text: string
  html: string
  paragraphs: Array<{
    text: string
    style?: string
  }>
}

/**
 * Parse a DOCX file and extract text content
 *
 * DOCX files are ZIP archives containing XML files:
 * - word/document.xml: Main document content
 * - word/styles.xml: Style definitions
 * - word/numbering.xml: Numbering schemes
 *
 * This parser extracts text from the document.xml file.
 *
 * @param buffer ArrayBuffer containing the DOCX file data
 * @returns Extracted content (text, html, paragraphs)
 */
export function parseDocx(buffer: ArrayBuffer): DocxContent {
  try {
    // Convert ArrayBuffer to Uint8Array for fflate
    const uint8Array = new Uint8Array(buffer)

    // Unzip the DOCX file (it's a ZIP archive)
    const unzipped = unzipSync(uint8Array)

    // Main document content is in word/document.xml
    const documentXml = unzipped['word/document.xml']
    if (!documentXml) {
      throw new Error('Invalid DOCX file: word/document.xml not found')
    }

    // Parse the XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })

    const xmlString = new TextDecoder().decode(documentXml)
    const doc = parser.parse(xmlString)

    // Navigate to document body: w:document > w:body
    const body = doc['w:document']?.['w:body']
    if (!body) {
      throw new Error('Invalid DOCX structure: w:body not found')
    }

    // Extract paragraphs (w:p elements)
    const paragraphElements = body['w:p'] || []
    const paragraphs = Array.isArray(paragraphElements) ? paragraphElements : [paragraphElements]

    // Process paragraphs
    const processedParagraphs: Array<{ text: string; style?: string }> = []
    let fullText = ''
    let fullHtml = ''

    for (const para of paragraphs) {
      if (!para) continue

      const texts: string[] = []

      // Extract text from runs (w:r elements)
      // Each run can have formatting and contains text (w:t) elements
      const runs = para['w:r'] || []
      const runsArray = Array.isArray(runs) ? runs : [runs]

      for (const run of runsArray) {
        if (!run) continue

        // Get text element (w:t)
        const textElement = run['w:t']
        if (!textElement) continue

        // Extract text content
        let text = ''
        if (typeof textElement === 'string') {
          text = textElement
        } else if (textElement['#text']) {
          text = textElement['#text']
        }

        if (text) {
          texts.push(text)
        }
      }

      // Combine run texts into paragraph text
      const paraText = texts.join('')

      if (paraText.trim()) {
        processedParagraphs.push({ text: paraText })
        fullText += paraText + '\n'
        fullHtml += `<p>${escapeHtml(paraText)}</p>\n`
      }
    }

    return {
      text: fullText.trim(),
      html: fullHtml,
      paragraphs: processedParagraphs
    }
  } catch (error) {
    console.error('Error parsing DOCX:', error)
    throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }

  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char])
}
