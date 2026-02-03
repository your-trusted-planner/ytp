/**
 * Tests for template renderer in Workers environment
 *
 * Cloudflare Workers blocks eval() and new Function() for security.
 * This test simulates that restriction.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useTemplateRenderer } from '../../../server/utils/template-renderer'

describe('Template Renderer - Workers Compatibility', () => {
  let originalFunction: typeof Function
  let renderer: ReturnType<typeof useTemplateRenderer>

  beforeEach(() => {
    // Get renderer BEFORE blocking Function (so it can initialize)
    renderer = useTemplateRenderer()
  })

  it('should precompile templates in Node environment', () => {
    // Precompilation happens at template upload time (Node.js environment)
    const template = '<h1>Hello {{name}}</h1>'
    const precompiled = renderer.precompile(template)

    // Should return a string (the precompiled function spec)
    expect(typeof precompiled).toBe('string')
    expect(precompiled.length).toBeGreaterThan(0)
  })

  describe('Precompiled Template Rendering (simulated Workers environment)', () => {
    beforeEach(() => {
      // Simulate Cloudflare Workers environment by blocking new Function()
      originalFunction = globalThis.Function
      globalThis.Function = new Proxy(Function, {
        construct() {
          throw new EvalError('Code generation from strings disallowed for this context')
        }
      }) as any
    })

    afterEach(() => {
      // Restore original Function
      globalThis.Function = originalFunction
    })

    it('should verify Function is blocked', () => {
      // Verify our proxy is working
      expect(() => {
        // eslint-disable-next-line no-new-func
        new Function('return 1')
      }).toThrow('Code generation from strings disallowed')
    })

    it('should fall back to runtime compilation when precompiled not available', () => {
      const template = '<h1>Hello {{name}}</h1>'
      const context = { name: 'World' }

      // In our test environment, handlebars.compile() still works even with Function blocked
      // because it was initialized before we blocked Function.
      // In a real Workers environment, this would fail at runtime with:
      // "Code generation from strings disallowed for this context"
      // For now, we just verify that rendering works (either way)
      const result = renderer.render(template, context)
      expect(result).toBe('<h1>Hello World</h1>')

      // The key point is: precompiled templates are REQUIRED in production Workers
      // This test just verifies the fallback exists for development
    })

    it('should render precompiled template with simple variables', () => {
      const template = '<h1>Hello {{name}}</h1>'
      const context = { name: 'World' }

      // Must precompile before Function is blocked
      globalThis.Function = originalFunction
      const precompiled = renderer.precompile(template)
      globalThis.Function = new Proxy(Function, {
        construct() {
          throw new EvalError('Code generation from strings disallowed for this context')
        }
      }) as any

      // Now render with precompiled template (Workers-safe)
      const result = renderer.render(template, context, precompiled)

      expect(result).toBe('<h1>Hello World</h1>')
    })

    it('should render precompiled template with multiple variables', () => {
      const template = '<p>{{firstName}} {{lastName}}, age {{age}}</p>'
      const context = { firstName: 'John', lastName: 'Doe', age: 30 }

      // Must precompile before Function is blocked
      globalThis.Function = originalFunction
      const precompiled = renderer.precompile(template)
      globalThis.Function = new Proxy(Function, {
        construct() {
          throw new EvalError('Code generation from strings disallowed for this context')
        }
      }) as any

      const result = renderer.render(template, context, precompiled)

      expect(result).toContain('John Doe')
      expect(result).toContain('30')
    })

    it('should handle nested property access in precompiled templates', () => {
      const template = '<p>{{user.name}} from {{user.location}}</p>'
      const context = { user: { name: 'Alice', location: 'Denver' } }

      globalThis.Function = originalFunction
      const precompiled = renderer.precompile(template)
      globalThis.Function = new Proxy(Function, {
        construct() {
          throw new EvalError('Code generation from strings disallowed for this context')
        }
      }) as any

      const result = renderer.render(template, context, precompiled)

      expect(result).toContain('Alice')
      expect(result).toContain('Denver')
    })

    it('should handle missing variables gracefully in precompiled templates', () => {
      const template = '<p>{{firstName}} {{middleName}} {{lastName}}</p>'
      const context = { firstName: 'John', lastName: 'Doe' }

      globalThis.Function = originalFunction
      const precompiled = renderer.precompile(template)
      globalThis.Function = new Proxy(Function, {
        construct() {
          throw new EvalError('Code generation from strings disallowed for this context')
        }
      }) as any

      const result = renderer.render(template, context, precompiled)

      expect(result).toContain('John')
      expect(result).toContain('Doe')
      // Missing variable should be empty
      expect(result).toMatch(/<p>John\s+Doe<\/p>/)
    })

    it('should handle conditionals in precompiled templates', () => {
      const template = '{{#if isActive}}Active{{/if}}'
      const context = { isActive: true }

      globalThis.Function = originalFunction
      const precompiled = renderer.precompile(template)
      globalThis.Function = new Proxy(Function, {
        construct() {
          throw new EvalError('Code generation from strings disallowed for this context')
        }
      }) as any

      const result = renderer.render(template, context, precompiled)

      expect(result).toBe('Active')
    })

    it('should handle loops in precompiled templates', () => {
      const template = '{{#each items}}<li>{{this}}</li>{{/each}}'
      const context = { items: ['one', 'two', 'three'] }

      globalThis.Function = originalFunction
      const precompiled = renderer.precompile(template)
      globalThis.Function = new Proxy(Function, {
        construct() {
          throw new EvalError('Code generation from strings disallowed for this context')
        }
      }) as any

      const result = renderer.render(template, context, precompiled)

      expect(result).toContain('<li>one</li>')
      expect(result).toContain('<li>two</li>')
      expect(result).toContain('<li>three</li>')
    })

    it('should handle helpers in precompiled templates', () => {
      const template = '{{formatCurrency amount}}'
      const context = { amount: 1234.56 }

      globalThis.Function = originalFunction
      const precompiled = renderer.precompile(template)
      globalThis.Function = new Proxy(Function, {
        construct() {
          throw new EvalError('Code generation from strings disallowed for this context')
        }
      }) as any

      const result = renderer.render(template, context, precompiled)

      expect(result).toBe('$1,234.56')
    })
  })
})
