// Enhanced template renderer for Jinja-style variables
// Handles {{ variable }}, {{ object.property }}, and {% if %} logic

export interface TemplateContext {
  // Client info
  clientFirstName?: string
  clientLastName?: string
  clientFullName?: string
  clientAddress?: string
  clientCity?: string
  clientState?: string
  clientZipCode?: string
  clientEmail?: string
  clientPhone?: string
  clientSignature?: string
  
  // Spouse info
  spouseName?: string
  spouseFirstName?: string
  spouseLastName?: string
  
  // Trust info
  trustName?: string
  alternateCompanyName?: string // Alias for trust name
  companyName?: string // Alias for trust name
  settlorName?: string
  grantorName?: string
  grantor1Name?: string
  grantor2Name?: string
  trusteeName?: string
  trustee1Name?: string
  trustee2Name?: string
  beneficiaryName?: string
  trustCreationDate?: string
  
  // Committees and advisors
  ddcName?: string
  wapaName?: string
  ptcName?: string
  pftcName?: string
  investmentCommitteeName?: string
  investmentCommitteeMember1?: string
  investmentCommitteeMember2?: string
  investmentCommitteeMember3?: string
  
  // Financial
  contributionAmount?: string | number
  distributionAmount?: string | number
  amount?: string | number
  propertyDescription?: string
  assetDescription?: string
  
  // Notary
  notaryName?: string
  notaryCommissionNumber?: string
  notaryExpirationDate?: string
  notaryState?: string
  
  // Dates
  currentDate?: string
  signatureDate?: string
  today?: string
  signedOn?: string
  
  // Signatures
  signature?: string
  
  // Complex objects from questionnaires
  questionnaireItems?: Record<string, any>
  managers?: any[]
  members?: any[]
  memberCount?: number
  
  // Any other dynamic fields
  [key: string]: any
}

export class TemplateRenderer {
  // Render a template with context data
  render(template: string, context: TemplateContext): string {
    let rendered = template
    
    // First, handle {% if %} conditionals
    rendered = this.processConditionals(rendered, context)
    
    // Then, handle {% for %} loops
    rendered = this.processLoops(rendered, context)
    
    // Finally, replace {{ variables }}
    rendered = this.replaceVariables(rendered, context)
    
    return rendered
  }

  // Process {% if condition %} ... {% endif %} blocks
  private processConditionals(template: string, context: TemplateContext): string {
    const ifPattern = /\{%\s*if\s+([^%]+)\s*%\}(.*?)\{%\s*(?:endif|else)\s*%\}/gs
    
    return template.replace(ifPattern, (match, condition, content) => {
      const conditionValue = this.evaluateCondition(condition.trim(), context)
      return conditionValue ? content : ''
    })
  }

  // Process {% for item in items %} ... {% endfor %} loops
  private processLoops(template: string, context: TemplateContext): string {
    const forPattern = /\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}(.*?)\{%\s*endfor\s*%\}/gs
    
    return template.replace(forPattern, (match, itemName, arrayName, content) => {
      const array = context[arrayName]
      if (!Array.isArray(array)) return ''
      
      return array.map(item => {
        const loopContext = { ...context, [itemName]: item }
        return this.replaceVariables(content, loopContext)
      }).join('')
    })
  }

  // Evaluate a conditional expression
  private evaluateCondition(condition: string, context: TemplateContext): boolean {
    try {
      // Simple variable existence check
      const varName = condition.trim()
      const value = this.getNestedValue(varName, context)
      return Boolean(value)
    } catch {
      return false
    }
  }

  // Replace {{ variable }} and {{ object.property }} patterns
  private replaceVariables(template: string, context: TemplateContext): string {
    const varPattern = /\{\{\s*([^}]+?)\s*\}\}/g
    
    return template.replace(varPattern, (match, varName) => {
      const value = this.getNestedValue(varName.trim(), context)
      return value !== null && value !== undefined ? String(value) : match
    })
  }

  // Get nested property value (e.g., "questionnaire_items.field_name[1]")
  private getNestedValue(path: string, context: TemplateContext): any {
    try {
      // Handle array indexing like "questionnaire_items.field[1]"
      const arrayMatch = path.match(/^(.+)\[(\d+)\]$/)
      if (arrayMatch) {
        const [, basePath, index] = arrayMatch
        const array = this.getNestedValue(basePath, context)
        return Array.isArray(array) ? array[parseInt(index)] : null
      }
      
      // Handle dot notation
      const parts = path.split('.')
      let value: any = context
      
      for (const part of parts) {
        if (value === null || value === undefined) return null
        value = value[part]
      }
      
      return value
    } catch {
      return null
    }
  }

  // Extract all variable names from a template (for the variables list)
  extractVariableNames(template: string): Set<string> {
    const variables = new Set<string>()
    
    // Extract from {{ variable }} patterns
    const varPattern = /\{\{\s*([^}]+?)\s*\}\}/g
    let match
    while ((match = varPattern.exec(template)) !== null) {
      const varName = match[1].trim()
      // Skip Jinja control flow
      if (!varName.includes('%')) {
        variables.add(varName)
      }
    }
    
    // Extract from {% if variable %} patterns
    const ifPattern = /\{%\s*if\s+([^%]+?)\s*%\}/g
    while ((match = ifPattern.exec(template)) !== null) {
      const condition = match[1].trim()
      variables.add(condition)
    }
    
    // Extract from {% for item in array %} patterns
    const forPattern = /\{%\s*for\s+\w+\s+in\s+(\w+)\s*%\}/g
    while ((match = forPattern.exec(template)) !== null) {
      variables.add(match[1].trim())
    }
    
    return variables
  }
}

// Export singleton
let rendererInstance: TemplateRenderer | null = null

export function useTemplateRenderer() {
  if (!rendererInstance) {
    rendererInstance = new TemplateRenderer()
  }
  return rendererInstance
}

export default TemplateRenderer



