import Handlebars from 'handlebars'

// Template context interface (flexible to accept any data)
export interface TemplateContext {
  [key: string]: any
}

export class TemplateRenderer {
  private handlebars: typeof Handlebars

  constructor() {
    this.handlebars = Handlebars.create()
    this.registerHelpers()
  }

  // Register custom Handlebars helpers
  private registerHelpers() {
    // Helper for formatting dates
    this.handlebars.registerHelper('formatDate', (date: any) => {
      if (!date) return ''
      const d = new Date(date)
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    })

    // Helper for formatting currency
    this.handlebars.registerHelper('formatCurrency', (amount: any) => {
      if (amount === null || amount === undefined) return ''
      const num = typeof amount === 'string' ? parseFloat(amount) : amount
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
    })

    // Helper for uppercase
    this.handlebars.registerHelper('uppercase', (str: any) => {
      return str ? String(str).toUpperCase() : ''
    })

    // Helper for lowercase
    this.handlebars.registerHelper('lowercase', (str: any) => {
      return str ? String(str).toLowerCase() : ''
    })

    // Helper for default values
    this.handlebars.registerHelper('default', (value: any, defaultValue: any) => {
      return value !== null && value !== undefined && value !== '' ? value : defaultValue
    })
  }

  // Preprocess template to fix common syntax issues
  private preprocessTemplate(template: string): string {
    let processed = template

    // Convert Django/Jinja pipe syntax to Handlebars dot notation
    // {{variable|filter}} -> {{variable.filter}}
    processed = processed.replace(/\{\{\s*([^}|]+)\|([^}]+)\s*\}\}/g, (match, variable, filter) => {
      const cleanVar = variable.trim()
      const cleanFilter = filter.trim()
      // Convert to dot notation for property access
      return `{{${cleanVar}.${cleanFilter}}}`
    })

    return processed
  }

  // Render a template with context data using Handlebars
  render(template: string, context: TemplateContext): string {
    try {
      // Preprocess template to fix common syntax issues
      const processedTemplate = this.preprocessTemplate(template)

      const compiledTemplate = this.handlebars.compile(processedTemplate, {
        noEscape: true, // Don't escape HTML in rendered output
        strict: false   // Allow missing variables
      })
      return compiledTemplate(context)
    } catch (error) {
      console.error('Error rendering template:', error)

      // Provide helpful error message
      if (error instanceof Error && error.message.includes('Parse error')) {
        throw new Error(`Template contains invalid Handlebars syntax. Please check your template for unsupported syntax like pipes (|) or other non-Handlebars constructs. Original error: ${error.message}`)
      }

      throw new Error(`Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Extract all variable names from a template using Handlebars AST
  extractVariableNames(template: string): Set<string> {
    const variables = new Set<string>()

    try {
      // Preprocess template first
      const processedTemplate = this.preprocessTemplate(template)
      const ast = this.handlebars.parse(processedTemplate)

      // Traverse the AST to find all variable references
      const traverse = (node: any) => {
        if (!node) return

        // MustacheStatement: {{ variable }}
        if (node.type === 'MustacheStatement' && node.path) {
          const varName = this.getPathString(node.path)
          if (varName) variables.add(varName)
        }

        // BlockStatement: {{#if variable}} or {{#each items}}
        if (node.type === 'BlockStatement' && node.path) {
          const varName = this.getPathString(node.path)
          if (varName && !this.isBuiltinHelper(varName)) {
            variables.add(varName)
          }
        }

        // PathExpression in params
        if (node.params) {
          for (const param of node.params) {
            if (param.type === 'PathExpression') {
              const varName = this.getPathString(param)
              if (varName) variables.add(varName)
            }
          }
        }

        // Recursively traverse child nodes
        if (node.program) traverse(node.program)
        if (node.inverse) traverse(node.inverse)
        if (node.body) {
          for (const child of node.body) {
            traverse(child)
          }
        }
      }

      traverse(ast)
    } catch (error) {
      console.error('Error parsing template for variables:', error)
      // Fallback to regex if AST parsing fails
      const varPattern = /\{\{\s*([^}#/]+?)\s*\}\}/g
      let match
      while ((match = varPattern.exec(template)) !== null) {
        const varName = match[1].trim().split(/\s+/)[0] // Get first part before any spaces
        if (varName && !this.isBuiltinHelper(varName)) {
          variables.add(varName)
        }
      }
    }

    return variables
  }

  // Convert a Handlebars path to a string (e.g., "user.name" from path object)
  private getPathString(path: any): string | null {
    if (!path) return null

    if (path.type === 'PathExpression') {
      // Handle simple paths and nested paths
      if (path.original) return path.original
      if (path.parts) return path.parts.join('.')
    }

    return null
  }

  // Check if a name is a built-in Handlebars helper
  private isBuiltinHelper(name: string): boolean {
    const builtins = ['if', 'unless', 'each', 'with', 'lookup', 'log', 'formatDate', 'formatCurrency', 'uppercase', 'lowercase', 'default']
    return builtins.includes(name)
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



