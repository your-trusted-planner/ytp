// Document parser utility for extracting and processing DOCX files
import mammoth from 'mammoth'
import { readFile } from 'fs/promises'
import { join } from 'path'

export interface ParsedDocument {
  filename: string
  html: string
  text: string
  variables: string[]
  metadata: {
    category: string
    group: string
    order: number
    requiresSignature: boolean
    requiresNotary: boolean
  }
}

export class DocumentParser {
  // Parse a DOCX file and extract content
  async parseDocx(filePath: string): Promise<{ html: string; text: string }> {
    try {
      const buffer = await readFile(filePath)
      const result = await mammoth.convertToHtml({ buffer })
      const textResult = await mammoth.extractRawText({ buffer })
      
      return {
        html: result.value,
        text: textResult.value
      }
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error)
      throw error
    }
  }

  // Extract variables from document text (looking for patterns like [[Variable]] or {Variable})
  extractVariables(text: string): string[] {
    const variables = new Set<string>()
    
    // Pattern 1: [[Variable]]
    const pattern1 = /\[\[([^\]]+)\]\]/g
    let match1
    while ((match1 = pattern1.exec(text)) !== null) {
      variables.add(match1[1].trim())
    }
    
    // Pattern 2: {Variable}
    const pattern2 = /\{([^}]+)\}/g
    let match2
    while ((match2 = pattern2.exec(text)) !== null) {
      // Filter out likely non-variable braces (like dates, numbers)
      const content = match2[1].trim()
      if (!content.match(/^\d+$/) && !content.match(/^[0-9\/\-]+$/)) {
        variables.add(content)
      }
    }
    
    // Pattern 3: <<Variable>>
    const pattern3 = /<<([^>]+)>>/g
    let match3
    while ((match3 = pattern3.exec(text)) !== null) {
      variables.add(match3[1].trim())
    }
    
    // Pattern 4: ___________ (underscores for filling in)
    const pattern4 = /_{3,}/g
    let match4
    let blankCount = 0
    while ((match4 = pattern4.exec(text)) !== null) {
      blankCount++
      variables.add(`Blank_${blankCount}`)
    }
    
    return Array.from(variables)
  }

  // Convert document text to use template variables
  convertToTemplate(html: string, variableMap: Record<string, string>): string {
    let template = html
    
    // Replace [[Variable]] with {{variable}}
    template = template.replace(/\[\[([^\]]+)\]\]/g, (match, varName) => {
      const normalizedName = this.normalizeVariableName(varName.trim())
      return `{{${variableMap[normalizedName] || normalizedName}}}`
    })
    
    // Replace {Variable} with {{variable}}
    template = template.replace(/\{([^}]+)\}/g, (match, varName) => {
      const content = varName.trim()
      // Skip numbers and dates
      if (content.match(/^\d+$/) || content.match(/^[0-9\/\-]+$/)) {
        return match
      }
      const normalizedName = this.normalizeVariableName(content)
      return `{{${variableMap[normalizedName] || normalizedName}}}`
    })
    
    // Replace <<Variable>> with {{variable}}
    template = template.replace(/<<([^>]+)>>/g, (match, varName) => {
      const normalizedName = this.normalizeVariableName(varName.trim())
      return `{{${variableMap[normalizedName] || normalizedName}}}`
    })
    
    return template
  }

  // Normalize variable names to camelCase
  normalizeVariableName(name: string): string {
    return name
      .replace(/[^\w\s]/g, '') // Remove special chars
      .split(/\s+/) // Split by whitespace
      .map((word, index) => {
        word = word.toLowerCase()
        if (index === 0) return word
        return word.charAt(0).toUpperCase() + word.slice(1)
      })
      .join('')
  }

  // Determine document metadata from filename and content
  determineMetadata(filename: string, group: string, text: string): ParsedDocument['metadata'] {
    const lowerFilename = filename.toLowerCase()
    const lowerText = text.toLowerCase()
    
    // Extract order number from filename
    const orderMatch = filename.match(/^(\d+[a-z]?)\./)
    const order = orderMatch ? parseInt(orderMatch[1]) : 999
    
    // Determine category from filename/content
    let category = 'General'
    if (lowerFilename.includes('trust') || lowerText.includes('trust agreement')) {
      category = 'Trust'
    } else if (lowerFilename.includes('operating agreement')) {
      category = 'LLC'
    } else if (lowerFilename.includes('meeting') || lowerFilename.includes('minutes')) {
      category = 'Meeting Minutes'
    } else if (lowerFilename.includes('questionnaire')) {
      category = 'Questionnaire'
    } else if (lowerFilename.includes('affidavit')) {
      category = 'Affidavit'
    } else if (lowerFilename.includes('certification') || lowerFilename.includes('certificate')) {
      category = 'Certificate'
    } else if (lowerFilename.includes('distribution')) {
      category = 'Distribution'
    } else if (lowerFilename.includes('contribution')) {
      category = 'Contribution'
    } else if (lowerFilename.includes('engagement')) {
      category = 'Engagement'
    }
    
    // Determine if requires signature
    const requiresSignature = 
      lowerText.includes('signature') ||
      lowerText.includes('signed by') ||
      lowerFilename.includes('agreement') ||
      lowerFilename.includes('affidavit') ||
      category === 'Trust' ||
      category === 'LLC'
    
    // Determine if requires notary
    const requiresNotary = 
      lowerText.includes('notary') ||
      lowerText.includes('notarized') ||
      lowerFilename.includes('affidavit') ||
      lowerFilename.includes('certificate') ||
      lowerFilename.includes('certification')
    
    return {
      category,
      group,
      order,
      requiresSignature,
      requiresNotary
    }
  }
}

// Export singleton
export function useDocumentParser() {
  return new DocumentParser()
}

