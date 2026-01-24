/**
 * Simple template renderer compatible with Cloudflare Workers
 *
 * Cloudflare Workers block eval() and new Function() for security.
 * This renderer uses regex-based string replacement instead of compiling templates.
 *
 * Supports:
 * - Simple variables: {{variable}}
 * - Nested properties: {{user.name}}
 * - Helpers: {{formatDate date}}, {{formatCurrency amount}}
 * - Basic conditionals: {{#if condition}}...{{/if}}
 * - Basic loops: {{#each items}}...{{/each}}
 *
 * Does NOT support:
 * - Complex expressions
 * - Custom block helpers
 * - Partials
 */

// Template context interface (renamed to avoid conflict with template-renderer.ts)
export interface SimpleTemplateContext {
  [key: string]: any
}

export class SimpleTemplateRenderer {
  // Render a template with context data
  render(template: string, context: SimpleTemplateContext): string {
    try {
      let result = template

      // Process block helpers first (if, each)
      result = this.processConditionals(result, context)
      result = this.processLoops(result, context)

      // Process inline helpers (formatDate, formatCurrency, etc.)
      result = this.processHelpers(result, context)

      // Process simple variable substitution last
      result = this.processVariables(result, context)

      return result
    } catch (error) {
      console.error('Error rendering template:', error)
      throw new Error(`Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Process {{#if condition}}...{{/if}} blocks
  private processConditionals(template: string, context: SimpleTemplateContext): string {
    const ifPattern = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g

    return template.replace(ifPattern, (match, condition, content) => {
      const value = this.getValue(condition.trim(), context)
      // Truthy check
      return value ? content : ''
    })
  }

  // Process {{#each items}}...{{/each}} blocks
  private processLoops(template: string, context: SimpleTemplateContext): string {
    const eachPattern = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g

    return template.replace(eachPattern, (match, arrayName, content) => {
      const array = this.getValue(arrayName.trim(), context)

      if (!Array.isArray(array)) {
        return ''
      }

      return array.map((item) => {
        // Replace {{this}} with the current item
        // For simple values (strings, numbers)
        if (typeof item !== 'object') {
          return content.replace(/\{\{this\}\}/g, String(item))
        }

        // For objects, process variables with the item as context
        return this.processVariables(content, item)
      }).join('')
    })
  }

  // Process helper functions: {{formatDate date}}, {{formatCurrency amount}}, etc.
  private processHelpers(template: string, context: SimpleTemplateContext): string {
    // Match patterns like {{helperName argument}}
    const helperPattern = /\{\{(\w+)\s+([^}]+)\}\}/g

    return template.replace(helperPattern, (match, helperName, argument) => {
      const value = this.getValue(argument.trim(), context)

      switch (helperName) {
        case 'formatDate':
          return this.formatDate(value)
        case 'formatCurrency':
          return this.formatCurrency(value)
        case 'uppercase':
          return this.uppercase(value)
        case 'lowercase':
          return this.lowercase(value)
        case 'default':
          // For default helper, argument is "value defaultValue"
          const [val, defaultVal] = argument.split(/\s+/)
          const actualValue = this.getValue(val, context)
          return actualValue !== null && actualValue !== undefined && actualValue !== ''
            ? String(actualValue)
            : defaultVal || ''
        default:
          // Not a recognized helper, leave it as-is for variable substitution
          return match
      }
    })
  }

  // Process simple variable substitution: {{variable}} or {{user.name}}
  private processVariables(template: string, context: SimpleTemplateContext): string {
    // Match {{variableName}} but not {{#if}} or {{/if}} or helpers
    const variablePattern = /\{\{(?!#|\/|\w+\s+)([^}]+)\}\}/g

    return template.replace(variablePattern, (match, variableName) => {
      const value = this.getValue(variableName.trim(), context)
      return value !== null && value !== undefined ? String(value) : ''
    })
  }

  // Dangerous keys that could lead to prototype pollution
  private static readonly DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

  // Get a value from context using dot notation (e.g., "user.name")
  private getValue(path: string, context: SimpleTemplateContext): any {
    const parts = path.split('.')

    // Check for dangerous keys to prevent prototype pollution
    if (parts.some(part => SimpleTemplateRenderer.DANGEROUS_KEYS.has(part))) {
      return undefined
    }

    let value: any = context

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined
      }
      // Additional safety: only access own properties
      if (typeof value === 'object' && !Object.hasOwn(value, part)) {
        return undefined
      }
      value = value[part]
    }

    return value
  }

  // Helper functions
  private formatDate(date: any): string {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  private formatCurrency(amount: any): string {
    if (amount === null || amount === undefined) return ''
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
  }

  private uppercase(str: any): string {
    return str ? String(str).toUpperCase() : ''
  }

  private lowercase(str: any): string {
    return str ? String(str).toLowerCase() : ''
  }

  // Extract all variable names from a template
  extractVariableNames(template: string): Set<string> {
    const variables = new Set<string>()

    // Match simple variables: {{variableName}}
    const simplePattern = /\{\{(?!#|\/|\w+\s+)([^}]+)\}\}/g
    let match

    while ((match = simplePattern.exec(template)) !== null) {
      const varName = match[1].trim()
      // Get base variable name (before any dots)
      const baseName = varName.split('.')[0]
      if (baseName) {
        variables.add(baseName)
      }
    }

    // Match conditionals: {{#if variable}}
    const ifPattern = /\{\{#if\s+([^}]+)\}\}/g
    while ((match = ifPattern.exec(template)) !== null) {
      const varName = match[1].trim().split('.')[0]
      if (varName) {
        variables.add(varName)
      }
    }

    // Match loops: {{#each variable}}
    const eachPattern = /\{\{#each\s+([^}]+)\}\}/g
    while ((match = eachPattern.exec(template)) !== null) {
      const varName = match[1].trim().split('.')[0]
      if (varName) {
        variables.add(varName)
      }
    }

    // Match helper arguments: {{formatDate variable}}
    const helperPattern = /\{\{(?:formatDate|formatCurrency|uppercase|lowercase|default)\s+([^}\s]+)/g
    while ((match = helperPattern.exec(template)) !== null) {
      const varName = match[1].trim().split('.')[0]
      if (varName) {
        variables.add(varName)
      }
    }

    return variables
  }
}

// Export singleton (renamed to avoid conflict with template-renderer.ts)
let simpleRendererInstance: SimpleTemplateRenderer | null = null

export function useSimpleTemplateRenderer() {
  if (!simpleRendererInstance) {
    simpleRendererInstance = new SimpleTemplateRenderer()
  }
  return simpleRendererInstance
}

export default SimpleTemplateRenderer
