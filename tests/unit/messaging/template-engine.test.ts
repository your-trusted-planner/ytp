/**
 * TDD Tests for server/utils/template-engine.ts
 *
 * Written BEFORE implementation. These tests define the contract
 * for the template variable substitution engine and email shell wrapper.
 */

import { describe, it, expect } from 'vitest'

// Import the functions we'll implement
// These will fail until the implementation exists
import {
  renderTemplateString,
  wrapInEmailShell
} from '../../../server/utils/template-engine'

describe('Template Engine', () => {
  describe('renderTemplateString', () => {
    it('replaces all {{variables}} with provided values', () => {
      const template = 'Hello {{recipientName}}, your appointment is on {{date}}.'
      const variables = { recipientName: 'John Smith', date: 'April 5, 2026' }
      const result = renderTemplateString(template, variables)

      expect(result.rendered).toBe('Hello John Smith, your appointment is on April 5, 2026.')
      expect(result.unresolvedVariables).toEqual([])
    })

    it('replaces the same variable used multiple times', () => {
      const template = '{{name}} called. Please call {{name}} back.'
      const result = renderTemplateString(template, { name: 'Jane' })

      expect(result.rendered).toBe('Jane called. Please call Jane back.')
    })

    it('HTML-escapes variable values when escapeHtml is true', () => {
      const template = 'Message: {{content}}'
      const variables = { content: '<script>alert("xss")</script>' }
      const result = renderTemplateString(template, variables, { escapeHtml: true })

      expect(result.rendered).toBe('Message: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    })

    it('escapes ampersands and single quotes in HTML mode', () => {
      const template = '{{text}}'
      const result = renderTemplateString(template, { text: "Tom & Jerry's" }, { escapeHtml: true })

      expect(result.rendered).toBe('Tom &amp; Jerry&#39;s')
    })

    it('does not escape in plain text mode (default)', () => {
      const template = 'Message: {{content}}'
      const variables = { content: '<b>bold</b>' }
      const result = renderTemplateString(template, variables)

      expect(result.rendered).toBe('Message: <b>bold</b>')
    })

    it('reports unresolved variables without failing', () => {
      const template = 'Hello {{recipientName}}, your code is {{code}}.'
      const variables = { recipientName: 'John' }
      const result = renderTemplateString(template, variables)

      expect(result.rendered).toBe('Hello John, your code is .')
      expect(result.unresolvedVariables).toEqual(['code'])
    })

    it('handles empty string variable values', () => {
      const template = 'Name: {{name}}'
      const result = renderTemplateString(template, { name: '' })

      expect(result.rendered).toBe('Name: ')
      expect(result.unresolvedVariables).toEqual([])
    })

    it('handles undefined variable values as unresolved', () => {
      const template = 'Hello {{name}}'
      const result = renderTemplateString(template, {})

      expect(result.rendered).toBe('Hello ')
      expect(result.unresolvedVariables).toEqual(['name'])
    })

    it('ignores malformed {{ patterns without closing }}', () => {
      const template = 'Hello {{name}}, balance is {{ not closed'
      const result = renderTemplateString(template, { name: 'John' })

      expect(result.rendered).toBe('Hello John, balance is {{ not closed')
    })

    it('handles template with no variables', () => {
      const template = 'This is plain text with no variables.'
      const result = renderTemplateString(template, {})

      expect(result.rendered).toBe('This is plain text with no variables.')
      expect(result.unresolvedVariables).toEqual([])
    })

    it('handles empty template string', () => {
      const result = renderTemplateString('', { name: 'John' })

      expect(result.rendered).toBe('')
      expect(result.unresolvedVariables).toEqual([])
    })

    it('handles variables with spaces in the braces', () => {
      const template = 'Hello {{ recipientName }}'
      const result = renderTemplateString(template, { recipientName: 'John' })

      // Should handle whitespace inside braces gracefully
      expect(result.rendered).toBe('Hello John')
    })

    it('does not recursively resolve variables', () => {
      // If a variable value itself contains {{...}}, it should NOT be re-processed
      const template = 'Message: {{content}}'
      const result = renderTemplateString(template, { content: '{{nested}}' })

      expect(result.rendered).toBe('Message: {{nested}}')
      expect(result.unresolvedVariables).toEqual([])
    })
  })

  describe('wrapInEmailShell', () => {
    it('produces valid HTML with doctype', () => {
      const result = wrapInEmailShell({
        title: 'Test Email',
        headerText: 'Welcome',
        bodyHtml: '<p>Hello there.</p>'
      })

      expect(result).toContain('<!DOCTYPE html>')
      expect(result).toContain('<html>')
      expect(result).toContain('</html>')
    })

    it('inserts the header text into the dark header bar', () => {
      const result = wrapInEmailShell({
        title: 'Test',
        headerText: 'Important Update',
        bodyHtml: '<p>Content</p>'
      })

      expect(result).toContain('Important Update')
      expect(result).toContain('#0A2540') // Dark header background color
    })

    it('inserts body content into the body section', () => {
      const result = wrapInEmailShell({
        title: 'Test',
        headerText: 'Header',
        bodyHtml: '<p>This is the body content.</p>'
      })

      expect(result).toContain('<p>This is the body content.</p>')
    })

    it('renders CTA button when actionUrl and actionLabel provided', () => {
      const result = wrapInEmailShell({
        title: 'Test',
        headerText: 'Header',
        bodyHtml: '<p>Content</p>',
        actionUrl: 'https://example.com/action',
        actionLabel: 'Click Here'
      })

      expect(result).toContain('href="https://example.com/action"')
      expect(result).toContain('Click Here')
      expect(result).toContain('#C41E3A') // CTA button color
    })

    it('omits CTA section when no actionUrl', () => {
      const result = wrapInEmailShell({
        title: 'Test',
        headerText: 'Header',
        bodyHtml: '<p>Content</p>'
      })

      expect(result).not.toContain('#C41E3A') // No CTA button
    })

    it('includes unsubscribe link when provided', () => {
      const result = wrapInEmailShell({
        title: 'Test',
        headerText: 'Header',
        bodyHtml: '<p>Content</p>',
        unsubscribeUrl: 'https://example.com/unsubscribe'
      })

      expect(result).toContain('href="https://example.com/unsubscribe"')
      expect(result).toContain('nsubscribe') // "Unsubscribe" or "unsubscribe"
    })

    it('omits unsubscribe link when not provided', () => {
      const result = wrapInEmailShell({
        title: 'Test',
        headerText: 'Header',
        bodyHtml: '<p>Content</p>'
      })

      expect(result).not.toContain('unsubscribe')
    })

    it('includes the firm name in the footer', () => {
      const result = wrapInEmailShell({
        title: 'Test',
        headerText: 'Header',
        bodyHtml: '<p>Content</p>',
        firmName: 'Acme Law Firm'
      })

      expect(result).toContain('Acme Law Firm')
    })

    it('defaults firm name to Your Trusted Planner', () => {
      const result = wrapInEmailShell({
        title: 'Test',
        headerText: 'Header',
        bodyHtml: '<p>Content</p>'
      })

      expect(result).toContain('Your Trusted Planner')
    })

    it('uses responsive table-based layout', () => {
      const result = wrapInEmailShell({
        title: 'Test',
        headerText: 'Header',
        bodyHtml: '<p>Content</p>'
      })

      expect(result).toContain('role="presentation"')
      expect(result).toContain('width="600"')
    })

    it('allows custom header color', () => {
      const result = wrapInEmailShell({
        title: 'Test',
        headerText: 'Success!',
        headerColor: '#059669',
        bodyHtml: '<p>Content</p>'
      })

      expect(result).toContain('#059669')
    })
  })
})
