// Common types and utilities shared across schema files
import { customType } from 'drizzle-orm/sqlite-core'

// Custom type for JSON string arrays
export const jsonArray = customType<{ data: string[]; driverData: string }>({
  dataType() {
    return 'text'
  },
  toDriver(value: string[]): string {
    return JSON.stringify(value)
  },
  fromDriver(value: string): string[] {
    if (!value) return []
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
})
