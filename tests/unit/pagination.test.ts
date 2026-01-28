import { describe, it, expect } from 'vitest'
import {
  parsePaginationParams,
  buildPaginationMeta,
  isPaginationRequested,
  calculateOffset
} from '../../server/utils/pagination'

describe('Pagination Utilities', () => {
  describe('parsePaginationParams', () => {
    it('should return defaults when no params provided', () => {
      const result = parsePaginationParams({})
      expect(result).toEqual({
        page: 1,
        limit: 25,
        sortBy: undefined,
        sortDirection: undefined
      })
    })

    it('should parse valid page and limit', () => {
      const result = parsePaginationParams({ page: '2', limit: '50' })
      expect(result.page).toBe(2)
      expect(result.limit).toBe(50)
    })

    it('should enforce max limit of 100', () => {
      const result = parsePaginationParams({ limit: '500' })
      expect(result.limit).toBe(100)
    })

    it('should default to page 1 for invalid page', () => {
      const result = parsePaginationParams({ page: '-1' })
      expect(result.page).toBe(1)

      const result2 = parsePaginationParams({ page: 'abc' })
      expect(result2.page).toBe(1)
    })

    it('should parse sort parameters', () => {
      const result = parsePaginationParams({
        sortBy: 'name',
        sortDirection: 'desc'
      })
      expect(result.sortBy).toBe('name')
      expect(result.sortDirection).toBe('desc')
    })

    it('should default sortDirection to asc if sortBy provided', () => {
      const result = parsePaginationParams({ sortBy: 'name' })
      expect(result.sortBy).toBe('name')
      expect(result.sortDirection).toBe('asc')
    })

    it('should ignore invalid sortDirection', () => {
      const result = parsePaginationParams({
        sortBy: 'name',
        sortDirection: 'invalid'
      })
      expect(result.sortDirection).toBe('asc')
    })
  })

  describe('buildPaginationMeta', () => {
    it('should calculate correct pagination metadata', () => {
      const result = buildPaginationMeta(1, 25, 150)
      expect(result).toEqual({
        page: 1,
        limit: 25,
        totalCount: 150,
        totalPages: 6,
        hasNextPage: true,
        hasPrevPage: false
      })
    })

    it('should correctly identify last page', () => {
      const result = buildPaginationMeta(6, 25, 150)
      expect(result.hasNextPage).toBe(false)
      expect(result.hasPrevPage).toBe(true)
    })

    it('should handle single page', () => {
      const result = buildPaginationMeta(1, 25, 10)
      expect(result.totalPages).toBe(1)
      expect(result.hasNextPage).toBe(false)
      expect(result.hasPrevPage).toBe(false)
    })

    it('should handle empty results', () => {
      const result = buildPaginationMeta(1, 25, 0)
      expect(result.totalPages).toBe(0)
      expect(result.hasNextPage).toBe(false)
      expect(result.hasPrevPage).toBe(false)
    })

    it('should handle middle page', () => {
      const result = buildPaginationMeta(3, 25, 150)
      expect(result.hasNextPage).toBe(true)
      expect(result.hasPrevPage).toBe(true)
    })
  })

  describe('isPaginationRequested', () => {
    it('should return false when no pagination params', () => {
      expect(isPaginationRequested({})).toBe(false)
    })

    it('should return true when page is present', () => {
      expect(isPaginationRequested({ page: '1' })).toBe(true)
    })

    it('should return true when limit is present', () => {
      expect(isPaginationRequested({ limit: '25' })).toBe(true)
    })

    it('should return true when both are present', () => {
      expect(isPaginationRequested({ page: '1', limit: '25' })).toBe(true)
    })
  })

  describe('calculateOffset', () => {
    it('should calculate correct offset for page 1', () => {
      expect(calculateOffset(1, 25)).toBe(0)
    })

    it('should calculate correct offset for page 2', () => {
      expect(calculateOffset(2, 25)).toBe(25)
    })

    it('should calculate correct offset for page 5', () => {
      expect(calculateOffset(5, 10)).toBe(40)
    })
  })
})
