/**
 * Tests for server/utils/template-renderer.ts
 * Covers Handlebars template rendering, helpers, and variable extraction
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TemplateRenderer, useTemplateRenderer } from '../../server/utils/template-renderer'

describe('TemplateRenderer', () => {
  let renderer: TemplateRenderer

  beforeEach(() => {
    renderer = new TemplateRenderer()
  })

  describe('Basic Rendering', () => {
    it('should render simple variable substitution', () => {
      const template = 'Hello, {{name}}!'
      const result = renderer.render(template, { name: 'John' })

      expect(result).toBe('Hello, John!')
    })

    it('should render multiple variables', () => {
      const template = '{{firstName}} {{lastName}} lives in {{city}}'
      const result = renderer.render(template, {
        firstName: 'John',
        lastName: 'Doe',
        city: 'New York'
      })

      expect(result).toBe('John Doe lives in New York')
    })

    it('should handle missing variables gracefully', () => {
      const template = 'Hello, {{name}}! Your email is {{email}}'
      const result = renderer.render(template, { name: 'John' })

      expect(result).toBe('Hello, John! Your email is ')
    })

    it('should handle nested object properties', () => {
      const template = '{{user.name}} - {{user.address.city}}'
      const result = renderer.render(template, {
        user: {
          name: 'John',
          address: {
            city: 'New York'
          }
        }
      })

      expect(result).toBe('John - New York')
    })

    it('should not escape HTML by default', () => {
      const template = '{{content}}'
      const result = renderer.render(template, {
        content: '<strong>Bold</strong>'
      })

      expect(result).toBe('<strong>Bold</strong>')
    })
  })

  describe('formatDate Helper', () => {
    it('should format a date object', () => {
      const template = '{{formatDate date}}'
      // Use explicit time to avoid timezone issues
      const date = new Date('2024-03-15T12:00:00')
      const result = renderer.render(template, { date })

      expect(result).toMatch(/March 15, 2024/)
    })

    it('should format a date string', () => {
      const template = '{{formatDate dateStr}}'
      // Use explicit time to avoid timezone issues
      const result = renderer.render(template, { dateStr: '2024-03-15T12:00:00' })

      expect(result).toMatch(/March 15, 2024/)
    })

    it('should handle null date', () => {
      const template = '{{formatDate date}}'
      const result = renderer.render(template, { date: null })

      expect(result).toBe('')
    })

    it('should handle undefined date', () => {
      const template = '{{formatDate date}}'
      const result = renderer.render(template, {})

      expect(result).toBe('')
    })
  })

  describe('formatCurrency Helper', () => {
    it('should format a number as USD currency', () => {
      const template = '{{formatCurrency amount}}'
      const result = renderer.render(template, { amount: 1234.56 })

      expect(result).toBe('$1,234.56')
    })

    it('should format integer amounts', () => {
      const template = '{{formatCurrency amount}}'
      const result = renderer.render(template, { amount: 1000 })

      expect(result).toBe('$1,000.00')
    })

    it('should format string amounts', () => {
      const template = '{{formatCurrency amount}}'
      const result = renderer.render(template, { amount: '99.99' })

      expect(result).toBe('$99.99')
    })

    it('should handle null amount', () => {
      const template = '{{formatCurrency amount}}'
      const result = renderer.render(template, { amount: null })

      expect(result).toBe('')
    })

    it('should handle zero amount', () => {
      const template = '{{formatCurrency amount}}'
      const result = renderer.render(template, { amount: 0 })

      expect(result).toBe('$0.00')
    })
  })

  describe('uppercase Helper', () => {
    it('should convert string to uppercase', () => {
      const template = '{{uppercase name}}'
      const result = renderer.render(template, { name: 'john doe' })

      expect(result).toBe('JOHN DOE')
    })

    it('should handle null value', () => {
      const template = '{{uppercase name}}'
      const result = renderer.render(template, { name: null })

      expect(result).toBe('')
    })

    it('should handle numbers', () => {
      const template = '{{uppercase value}}'
      const result = renderer.render(template, { value: 123 })

      expect(result).toBe('123')
    })
  })

  describe('lowercase Helper', () => {
    it('should convert string to lowercase', () => {
      const template = '{{lowercase name}}'
      const result = renderer.render(template, { name: 'JOHN DOE' })

      expect(result).toBe('john doe')
    })

    it('should handle null value', () => {
      const template = '{{lowercase name}}'
      const result = renderer.render(template, { name: null })

      expect(result).toBe('')
    })
  })

  describe('default Helper', () => {
    it('should return value if present', () => {
      const template = '{{default name "Unknown"}}'
      const result = renderer.render(template, { name: 'John' })

      expect(result).toBe('John')
    })

    it('should return default if value is null', () => {
      const template = '{{default name "Unknown"}}'
      const result = renderer.render(template, { name: null })

      expect(result).toBe('Unknown')
    })

    it('should return default if value is undefined', () => {
      const template = '{{default name "Unknown"}}'
      const result = renderer.render(template, {})

      expect(result).toBe('Unknown')
    })

    it('should return default if value is empty string', () => {
      const template = '{{default name "Unknown"}}'
      const result = renderer.render(template, { name: '' })

      expect(result).toBe('Unknown')
    })

    it('should return zero if value is 0', () => {
      const template = '{{default count "N/A"}}'
      const result = renderer.render(template, { count: 0 })

      expect(result).toBe('0')
    })
  })

  describe('Conditional Blocks', () => {
    it('should render if block when condition is truthy', () => {
      const template = '{{#if hasAccount}}Welcome back!{{/if}}'
      const result = renderer.render(template, { hasAccount: true })

      expect(result).toBe('Welcome back!')
    })

    it('should not render if block when condition is falsy', () => {
      const template = '{{#if hasAccount}}Welcome back!{{/if}}'
      const result = renderer.render(template, { hasAccount: false })

      expect(result).toBe('')
    })

    it('should render else block when condition is falsy', () => {
      const template = '{{#if hasAccount}}Welcome back!{{else}}Please register{{/if}}'
      const result = renderer.render(template, { hasAccount: false })

      expect(result).toBe('Please register')
    })
  })

  describe('Each Loops', () => {
    it('should iterate over arrays', () => {
      const template = '{{#each items}}{{this}},{{/each}}'
      const result = renderer.render(template, { items: ['a', 'b', 'c'] })

      expect(result).toBe('a,b,c,')
    })

    it('should iterate over array of objects', () => {
      const template = '{{#each users}}{{name}};{{/each}}'
      const result = renderer.render(template, {
        users: [{ name: 'Alice' }, { name: 'Bob' }]
      })

      expect(result).toBe('Alice;Bob;')
    })

    it('should handle empty arrays', () => {
      const template = '{{#each items}}{{this}}{{/each}}'
      const result = renderer.render(template, { items: [] })

      expect(result).toBe('')
    })
  })

  describe('Pipe Syntax Conversion', () => {
    it('should convert Django/Jinja pipe syntax to dot notation', () => {
      // This tests the preprocessTemplate functionality
      const template = '{{name|uppercase}}'
      const result = renderer.render(template, { name: { uppercase: 'JOHN' } })

      expect(result).toBe('JOHN')
    })
  })

  describe('Variable Extraction', () => {
    it('should extract simple variable names', () => {
      const template = 'Hello, {{name}}! Welcome to {{city}}.'
      const variables = renderer.extractVariableNames(template)

      expect(variables.has('name')).toBe(true)
      expect(variables.has('city')).toBe(true)
      expect(variables.size).toBe(2)
    })

    it('should extract nested variable names', () => {
      const template = '{{user.name}} lives at {{user.address.street}}'
      const variables = renderer.extractVariableNames(template)

      expect(variables.has('user.name')).toBe(true)
      expect(variables.has('user.address.street')).toBe(true)
    })

    it('should not include built-in helpers', () => {
      const template = '{{#if condition}}{{name}}{{/if}}'
      const variables = renderer.extractVariableNames(template)

      expect(variables.has('name')).toBe(true)
      expect(variables.has('if')).toBe(false)
    })

    it('should extract variables from each blocks', () => {
      const template = '{{#each items}}{{name}}{{/each}}'
      const variables = renderer.extractVariableNames(template)

      expect(variables.has('name')).toBe(true)
      expect(variables.has('items')).toBe(true)
      expect(variables.has('each')).toBe(false)
    })

    it('should handle templates with no variables', () => {
      const template = 'Hello, World!'
      const variables = renderer.extractVariableNames(template)

      expect(variables.size).toBe(0)
    })
  })

  describe('Error Handling', () => {
    // Suppress console.error for these tests since we're intentionally triggering errors
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should throw helpful error for invalid syntax', () => {
      const template = '{{#if}}{{/if}}' // Missing condition

      expect(() => renderer.render(template, {})).toThrow()
    })

    it('should handle unclosed blocks', () => {
      const template = '{{#if condition}}Hello'

      expect(() => renderer.render(template, { condition: true })).toThrow()
    })
  })

  describe('useTemplateRenderer Singleton', () => {
    it('should return the same instance', () => {
      const renderer1 = useTemplateRenderer()
      const renderer2 = useTemplateRenderer()

      expect(renderer1).toBe(renderer2)
    })

    it('should be usable for rendering', () => {
      const renderer = useTemplateRenderer()
      const result = renderer.render('Hello, {{name}}!', { name: 'World' })

      expect(result).toBe('Hello, World!')
    })
  })
})
