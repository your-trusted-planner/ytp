/**
 * Converts a snake_case string to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Converts a camelCase string to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * Recursively transforms all keys in an object from snake_case to camelCase
 */
export function keysToCamel<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => keysToCamel(item)) as T
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = snakeToCamel(key)
      result[camelKey] = keysToCamel(value)
    }
    return result as T
  }

  return obj
}

/**
 * Recursively transforms all keys in an object from camelCase to snake_case
 */
export function keysToSnake<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => keysToSnake(item)) as T
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = camelToSnake(key)
      result[snakeKey] = keysToSnake(value)
    }
    return result as T
  }

  return obj
}
