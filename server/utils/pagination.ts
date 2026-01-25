/**
 * Pagination utilities for consistent implementation across endpoints
 */

export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

export interface PaginationMeta {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

/**
 * Parse pagination parameters from query string
 * Returns sensible defaults if params are missing or invalid
 */
export function parsePaginationParams(query: Record<string, any>): PaginationParams {
  // Parse page number (1-indexed)
  let page = parseInt(query.page as string, 10)
  if (isNaN(page) || page < 1) {
    page = DEFAULT_PAGE
  }

  // Parse limit with max cap
  let limit = parseInt(query.limit as string, 10)
  if (isNaN(limit) || limit < 1) {
    limit = DEFAULT_LIMIT
  } else if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT
  }

  // Parse sort parameters
  const sortBy = query.sortBy as string | undefined
  let sortDirection: 'asc' | 'desc' | undefined
  if (query.sortDirection === 'asc' || query.sortDirection === 'desc') {
    sortDirection = query.sortDirection
  } else if (sortBy) {
    // Default to ascending if sortBy is provided but no direction
    sortDirection = 'asc'
  }

  return {
    page,
    limit,
    sortBy,
    sortDirection
  }
}

/**
 * Build pagination metadata from current state
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  totalCount: number
): PaginationMeta {
  const totalPages = Math.ceil(totalCount / limit)

  return {
    page,
    limit,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  }
}

/**
 * Check if pagination was requested
 * Returns true if either page or limit parameter is present
 */
export function isPaginationRequested(query: Record<string, any>): boolean {
  return query.page !== undefined || query.limit !== undefined
}

/**
 * Calculate offset for SQL queries
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit
}
