import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export { schema }

export function useDrizzle() {
  // Check if we have D1 binding
  if (typeof hubDatabase === 'undefined') {
    throw new Error('Database not available - deploy to Cloudflare or use mock mode')
  }
  return drizzle(hubDatabase(), { schema })
}

export function isDatabaseAvailable() {
  try {
    if (typeof hubDatabase === 'undefined') return false
    const db = hubDatabase()
    return !!db
  } catch (e) {
    return false
  }
}

export type User = typeof schema.users.$inferSelect
export type NewUser = typeof schema.users.$inferInsert
export type ClientProfile = typeof schema.clientProfiles.$inferSelect
export type NewClientProfile = typeof schema.clientProfiles.$inferInsert
export type Appointment = typeof schema.appointments.$inferSelect
export type NewAppointment = typeof schema.appointments.$inferInsert
export type DocumentTemplate = typeof schema.documentTemplates.$inferSelect
export type NewDocumentTemplate = typeof schema.documentTemplates.$inferInsert
export type Document = typeof schema.documents.$inferSelect
export type NewDocument = typeof schema.documents.$inferInsert
export type Note = typeof schema.notes.$inferSelect
export type NewNote = typeof schema.notes.$inferInsert
export type Activity = typeof schema.activities.$inferSelect
export type NewActivity = typeof schema.activities.$inferInsert

