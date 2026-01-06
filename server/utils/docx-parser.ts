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

    // Parse the XML with preserveOrder to maintain document structure
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      preserveOrder: true,
      trimValues: false
    })

    const xmlString = new TextDecoder().decode(documentXml)
    const docArray = parser.parse(xmlString)

    // With preserveOrder, result is an array of elements
    // Find w:document > w:body
    let bodyElements: any[] = []

    for (const elem of docArray) {
      if (elem['w:document']) {
        const docContent = elem['w:document']
        for (const bodyElem of docContent) {
          if (bodyElem['w:body']) {
            bodyElements = bodyElem['w:body']
            break
          }
        }
        break
      }
    }

    if (!bodyElements || bodyElements.length === 0) {
      throw new Error('Invalid DOCX structure: w:body not found')
    }

    // Process body content (paragraphs and tables)
    const processedParagraphs: Array<{ text: string; style?: string }> = []
    let fullText = ''
    let fullHtml = ''

    // Helper function to extract text from runs (preserveOrder format)
    function extractTextFromRuns(runElements: any[]): string {
      const texts: string[] = []

      for (const runElem of runElements) {
        if (!runElem || !runElem['w:r']) continue

        const runContent = runElem['w:r']

        for (const item of runContent) {
          if (item['w:t']) {
            // Text element found
            const textContent = item['w:t']
            for (const textItem of textContent) {
              if (textItem['#text']) {
                texts.push(textItem['#text'])
              }
            }
          }
        }
      }

      return texts.join('')
    }

    // Helper function to extract text from a paragraph (preserveOrder format)
    function extractParagraphText(paraContent: any[]): string {
      if (!paraContent) return ''

      const runs = paraContent.filter(item => item['w:r'])
      return extractTextFromRuns(runs)
    }

    // Helper function to process a table (preserveOrder format)
    function processTable(tableContent: any[]): void {
      if (!tableContent) return

      fullHtml += '<table border="1" style="border-collapse: collapse; width: 100%; margin: 1em 0;">\n'

      // Extract table rows (w:tr elements)
      const rowElements = tableContent.filter(item => item['w:tr'])

      for (const rowElem of rowElements) {
        const rowContent = rowElem['w:tr']

        fullHtml += '<tr>\n'

        // Extract table cells (w:tc elements)
        const cellElements = rowContent.filter((item: any) => item['w:tc'])

        for (const cellElem of cellElements) {
          const cellContent = cellElem['w:tc']

          // Each cell contains paragraphs
          const cellParaElements = cellContent.filter((item: any) => item['w:p'])

          let cellText = ''
          for (const cellParaElem of cellParaElements) {
            const cellParaContent = cellParaElem['w:p']
            const paraText = extractParagraphText(cellParaContent)
            if (paraText) {
              cellText += paraText + ' '
            }
          }

          cellText = cellText.trim()
          fullText += cellText + ' '
          fullHtml += `<td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(cellText)}</td>\n`
        }

        fullText += '\n'
        fullHtml += '</tr>\n'
      }

      fullHtml += '</table>\n'
      fullText += '\n'
    }

    // Process all body elements in document order
    // With preserveOrder, bodyElements is an array where each item represents an element
    for (const bodyElem of bodyElements) {
      // Check if it's a paragraph
      if (bodyElem['w:p']) {
        const paraContent = bodyElem['w:p']
        const paraText = extractParagraphText(paraContent)

        if (paraText.trim()) {
          processedParagraphs.push({ text: paraText })
          fullText += paraText + '\n'
          fullHtml += `<p>${escapeHtml(paraText)}</p>\n`
        }
      }
      // Check if it's a table
      else if (bodyElem['w:tbl']) {
        const tableContent = bodyElem['w:tbl']
        processTable(tableContent)
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
