import { describe, it, expect } from 'vitest'
import { getCanonicalName, areNicknameVariants } from '../../../server/utils/record-matcher/nickname-table'

describe('getCanonicalName', () => {
  it('maps common male nicknames', () => {
    expect(getCanonicalName('Bob')).toBe('robert')
    expect(getCanonicalName('Bobby')).toBe('robert')
    expect(getCanonicalName('Rob')).toBe('robert')
    expect(getCanonicalName('Robert')).toBe('robert')
  })

  it('maps common female nicknames', () => {
    expect(getCanonicalName('Liz')).toBe('elizabeth')
    expect(getCanonicalName('Beth')).toBe('elizabeth')
    expect(getCanonicalName('Betty')).toBe('elizabeth')
    expect(getCanonicalName('Elizabeth')).toBe('elizabeth')
  })

  it('is case-insensitive', () => {
    expect(getCanonicalName('BOB')).toBe('robert')
    expect(getCanonicalName('bob')).toBe('robert')
    expect(getCanonicalName('Bob')).toBe('robert')
  })

  it('returns input unchanged for unknown names', () => {
    expect(getCanonicalName('Zephyr')).toBe('zephyr')
    expect(getCanonicalName('Xander')).toBe('xander')
  })

  it('handles empty input', () => {
    expect(getCanonicalName('')).toBe('')
  })
})

describe('areNicknameVariants', () => {
  it('detects nickname pairs', () => {
    expect(areNicknameVariants('Bob', 'Robert')).toBe(true)
    expect(areNicknameVariants('Bill', 'William')).toBe(true)
    expect(areNicknameVariants('Jim', 'James')).toBe(true)
    expect(areNicknameVariants('Liz', 'Elizabeth')).toBe(true)
    expect(areNicknameVariants('Maggie', 'Margaret')).toBe(true)
  })

  it('detects nickname pairs between diminutives', () => {
    expect(areNicknameVariants('Bob', 'Bobby')).toBe(true)
    expect(areNicknameVariants('Bill', 'Billy')).toBe(true)
    expect(areNicknameVariants('Liz', 'Beth')).toBe(true)
  })

  it('rejects unrelated names', () => {
    expect(areNicknameVariants('Bob', 'James')).toBe(false)
    expect(areNicknameVariants('John', 'Jane')).toBe(false)
  })

  it('handles empty/null input', () => {
    expect(areNicknameVariants('', 'Bob')).toBe(false)
    expect(areNicknameVariants('Bob', '')).toBe(false)
  })
})
