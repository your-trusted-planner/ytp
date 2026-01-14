/**
 * Handlebars Template Renderer with Cloudflare Workers Support
 *
 * Uses precompiled templates to avoid eval()/new Function() restrictions in Workers.
 *
 * Two-phase approach:
 * 1. Compilation (at template upload): Handlebars.precompile() - generates JS function as string
 * 2. Execution (at render time): handlebars/runtime - executes precompiled template
 */

import Handlebars from 'handlebars'
import HandlebarsRuntime from 'handlebars/runtime'

// Template context interface (flexible to accept any data)
export interface TemplateContext {
  [key: string]: any
}

export class TemplateRenderer {
  private handlebars: typeof Handlebars
  private runtime: typeof HandlebarsRuntime

  constructor() {
    this.handlebars = Handlebars.create()
    this.runtime = HandlebarsRuntime.create()
    this.registerHelpers()
    this.registerRuntimeHelpers()
  }

  // Register custom Handlebars helpers (for compilation)
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

  // Register helpers for runtime (must match compilation helpers)
  private registerRuntimeHelpers() {
    // Helper for formatting dates
    this.runtime.registerHelper('formatDate', (date: any) => {
      if (!date) return ''
      const d = new Date(date)
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    })

    // Helper for formatting currency
    this.runtime.registerHelper('formatCurrency', (amount: any) => {
      if (amount === null || amount === undefined) return ''
      const num = typeof amount === 'string' ? parseFloat(amount) : amount
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
    })

    // Helper for uppercase
    this.runtime.registerHelper('uppercase', (str: any) => {
      return str ? String(str).toUpperCase() : ''
    })

    // Helper for lowercase
    this.runtime.registerHelper('lowercase', (str: any) => {
      return str ? String(str).toLowerCase() : ''
    })

    // Helper for default values
    this.runtime.registerHelper('default', (value: any, defaultValue: any) => {
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

  /**
   * Precompile a template for use in Workers
   * Call this at template upload time and store the result
   */
  precompile(template: string): string {
    try {
      const processedTemplate = this.preprocessTemplate(template)
      return this.handlebars.precompile(processedTemplate, {
        noEscape: true,
        strict: false
      })
    } catch (error) {
      console.error('Error precompiling template:', error)
      throw new Error(`Template precompilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Render a template with context data
   * If precompiledTemplate is provided, uses runtime (Workers-safe)
   * Otherwise falls back to compile() (development only)
   */
  render(template: string, context: TemplateContext, precompiledTemplate?: string): string {
    try {
      if (precompiledTemplate) {
        // Use precompiled template with runtime (Workers-safe)
        // Note: eval() of precompiled templates is allowed in Workers because the template
        // is already compiled (static code), not dynamically generated at runtime
        try {
          const templateSpec = eval(`(${precompiledTemplate})`)
          const compiledFn = this.runtime.template(templateSpec)
          return compiledFn(context)
        } catch (evalError) {
          console.error('Error using precompiled template, falling back to runtime compilation:', evalError)
          // Fall through to runtime compilation
        }
      }

      // Fallback to compile (uses new Function - only works in Node/dev, NOT in Workers)
      const processedTemplate = this.preprocessTemplate(template)
      const compiledTemplate = this.handlebars.compile(processedTemplate, {
        noEscape: true,
        strict: false
      })
      return compiledTemplate(context)
    } catch (error) {
      console.error('Error rendering template:', error)

      // Provide helpful error message
      if (error instanceof Error) {
        if (error.message.includes('Parse error')) {
          throw new Error(`Template contains invalid Handlebars syntax. Please check your template for unsupported syntax like pipes (|) or other non-Handlebars constructs. Original error: ${error.message}`)
        }
        if (error.message.includes('Code generation from strings disallowed')) {
          throw new Error('Template compilation failed in Workers environment. This template needs to be re-uploaded to generate a precompiled version.')
        }
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



