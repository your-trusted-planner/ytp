/**
 * Tests for server/utils/auth.ts
 * Covers password hashing, verification, and ID generation
 */

import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, generateId } from '../../../server/utils/auth'

describe('Auth Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123!'
      const hash = await hashPassword(password)

      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(0)
    })

    it('should produce different hashes for the same password (salting)', async () => {
      const password = 'testPassword123!'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).not.toBe(hash2)
    })

    it('should produce bcrypt-formatted hash', async () => {
      const password = 'testPassword123!'
      const hash = await hashPassword(password)

      // bcrypt hashes start with $2a$ or $2b$
      expect(hash).toMatch(/^\$2[ab]\$/)
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testPassword123!'
      const hash = await hashPassword(password)

      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'testPassword123!'
      const wrongPassword = 'wrongPassword456!'
      const hash = await hashPassword(password)

      const isValid = await verifyPassword(wrongPassword, hash)
      expect(isValid).toBe(false)
    })

    it('should reject empty password against valid hash', async () => {
      const password = 'testPassword123!'
      const hash = await hashPassword(password)

      const isValid = await verifyPassword('', hash)
      expect(isValid).toBe(false)
    })

    it('should handle case-sensitive passwords', async () => {
      const password = 'TestPassword'
      const hash = await hashPassword(password)

      const isValidLower = await verifyPassword('testpassword', hash)
      const isValidUpper = await verifyPassword('TESTPASSWORD', hash)
      const isValidCorrect = await verifyPassword('TestPassword', hash)

      expect(isValidLower).toBe(false)
      expect(isValidUpper).toBe(false)
      expect(isValidCorrect).toBe(true)
    })

    it('should handle special characters in passwords', async () => {
      const password = 'P@$$w0rd!#%^&*()_+-=[]{}|;:\'",.<>?/`~'
      const hash = await hashPassword(password)

      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should handle unicode characters in passwords', async () => {
      const password = 'пароль密码🔐'
      const hash = await hashPassword(password)

      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })
  })

  describe('generateId', () => {
    it('should generate a non-empty string', () => {
      const id = generateId()

      expect(id).toBeDefined()
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })

    it('should generate unique IDs', () => {
      const ids = new Set<string>()

      for (let i = 0; i < 100; i++) {
        ids.add(generateId())
      }

      expect(ids.size).toBe(100)
    })

    it('should generate IDs with reasonable length', () => {
      const id = generateId()

      // Should be at least 20 characters (two random parts + timestamp)
      expect(id.length).toBeGreaterThanOrEqual(20)
    })

    it('should contain only alphanumeric characters', () => {
      const id = generateId()

      expect(id).toMatch(/^[a-z0-9]+$/)
    })
  })
})
