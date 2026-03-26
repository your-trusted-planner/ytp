/**
 * Tests for app/utils/html-sanitize.ts
 *
 * Security-critical: ensures script injection, unauthorized iframes,
 * and event handlers are stripped from user-provided HTML content.
 */
import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from 'app/utils/html-sanitize'

describe('sanitizeHtml', () => {
  describe('script removal', () => {
    it('strips inline script tags', () => {
      expect(sanitizeHtml('<p>Hello</p><script>alert("xss")</script><p>World</p>'))
        .toBe('<p>Hello</p><p>World</p>')
    })

    it('strips script tags with attributes', () => {
      expect(sanitizeHtml('<script type="text/javascript" src="evil.js"></script>'))
        .toBe('')
    })

    it('strips script tags with multiline content', () => {
      const input = `<p>Before</p><script>
        var x = 1;
        alert(x);
      </script><p>After</p>`
      expect(sanitizeHtml(input)).toBe('<p>Before</p><p>After</p>')
    })

    it('strips multiple script tags', () => {
      expect(sanitizeHtml('<script>a</script>hello<script>b</script>'))
        .toBe('hello')
    })

    it('is case insensitive', () => {
      expect(sanitizeHtml('<SCRIPT>alert(1)</SCRIPT>')).toBe('')
      expect(sanitizeHtml('<Script>alert(1)</Script>')).toBe('')
    })
  })

  describe('event handler removal', () => {
    it('strips onclick handlers', () => {
      expect(sanitizeHtml('<div onclick="alert(1)">Click me</div>'))
        .toBe('<div>Click me</div>')
    })

    it('strips onload handlers', () => {
      expect(sanitizeHtml('<img src="x.jpg" onload="alert(1)">'))
        .toBe('<img src="x.jpg">')
    })

    it('strips onerror handlers', () => {
      expect(sanitizeHtml('<img src="x" onerror="alert(1)">'))
        .toBe('<img src="x">')
    })

    it('strips onmouseover handlers', () => {
      expect(sanitizeHtml('<a onmouseover="alert(1)" href="#">Link</a>'))
        .toBe('<a href="#">Link</a>')
    })

    it('handles single and double quoted values', () => {
      expect(sanitizeHtml("<div onclick='alert(1)'>test</div>"))
        .toBe('<div>test</div>')
    })

    it('handles unquoted values', () => {
      expect(sanitizeHtml('<div onclick=alert(1)>test</div>'))
        .toBe('<div>test</div>')
    })
  })

  describe('iframe whitelisting', () => {
    it('allows YouTube iframes', () => {
      const iframe = '<iframe src="https://www.youtube.com/embed/abc123" frameborder="0"></iframe>'
      expect(sanitizeHtml(iframe)).toBe(iframe)
    })

    it('allows YouTube no-cookie iframes', () => {
      const iframe = '<iframe src="https://www.youtube-nocookie.com/embed/abc123"></iframe>'
      expect(sanitizeHtml(iframe)).toBe(iframe)
    })

    it('allows Vimeo iframes', () => {
      const iframe = '<iframe src="https://player.vimeo.com/video/123456"></iframe>'
      expect(sanitizeHtml(iframe)).toBe(iframe)
    })

    it('allows own domain iframes', () => {
      const iframe = '<iframe src="https://app.trustandlegacy.com/embed/form"></iframe>'
      expect(sanitizeHtml(iframe)).toBe(iframe)
    })

    it('strips iframes from non-whitelisted domains', () => {
      expect(sanitizeHtml('<iframe src="https://evil.com/hack"></iframe>')).toBe('')
    })

    it('strips iframes with no src', () => {
      expect(sanitizeHtml('<iframe></iframe>')).toBe('')
    })

    it('strips iframes with javascript src', () => {
      // javascript: protocol is stripped by the href/src sanitizer
      const result = sanitizeHtml('<iframe src="javascript:alert(1)"></iframe>')
      expect(result).not.toContain('javascript:')
    })

    it('preserves content around stripped iframes', () => {
      expect(sanitizeHtml('<p>Before</p><iframe src="https://evil.com/x"></iframe><p>After</p>'))
        .toBe('<p>Before</p><p>After</p>')
    })
  })

  describe('javascript protocol removal', () => {
    it('strips javascript: from href', () => {
      const result = sanitizeHtml('<a href="javascript:alert(1)">Click</a>')
      expect(result).not.toContain('javascript:')
    })

    it('strips javascript: from src', () => {
      const result = sanitizeHtml('<img src="javascript:alert(1)">')
      expect(result).not.toContain('javascript:')
    })
  })

  describe('preserves safe content', () => {
    it('preserves inline styles', () => {
      const html = '<div style="color: red; font-size: 16px;">Styled</div>'
      expect(sanitizeHtml(html)).toBe(html)
    })

    it('preserves safe HTML structure', () => {
      const html = '<h1>Title</h1><p>Paragraph with <strong>bold</strong> and <em>italic</em></p>'
      expect(sanitizeHtml(html)).toBe(html)
    })

    it('preserves safe links', () => {
      const html = '<a href="https://example.com" target="_blank">Link</a>'
      expect(sanitizeHtml(html)).toBe(html)
    })

    it('preserves complex branded content', () => {
      const html = '<div style="background-color: #f8f9fa; border-left: 4px solid #2d7a8f; padding: 20px;"><p style="margin: 0;">Callout box</p></div>'
      expect(sanitizeHtml(html)).toBe(html)
    })

    it('returns empty string for empty input', () => {
      expect(sanitizeHtml('')).toBe('')
      expect(sanitizeHtml(null as any)).toBe('')
      expect(sanitizeHtml(undefined as any)).toBe('')
    })
  })
})
