// NuxtHub 0.10.x: Import the pre-configured Drizzle instance
import { db } from '@nuxthub/db'
import * as schema from './schema/index'

export { schema }

// For backwards compatibility with existing code using useDrizzle()
export function useDrizzle() {
  return db
}

export function isDatabaseAvailable() {
  try {
    // If db is defined, database is available
    return !!db
  } catch (e: any) {
    console.log('[isDatabaseAvailable] Error:', e.message)
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

