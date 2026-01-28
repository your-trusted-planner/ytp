/**
 * Utility for safely deleting person records
 *
 * Handles all foreign key references to the people table to prevent
 * constraint failures. This accounts for schema drift and legacy data.
 */

import { eq, inArray } from 'drizzle-orm'
import { useDrizzle, schema } from '../db'

export interface PersonDeleteResult {
  personId: string
  deleted: boolean
  error?: string
  cleanedUp: {
    clients: number
    users: number
    planRoles: number
    estatePlans: number
    wills: number
    ancillaryDocuments: number
    relationships: number
    clientRelationships: number
    matterRelationships: number
    importDuplicates: number
  }
}

/**
 * Safely delete a person by first removing all references to them.
 *
 * This handles:
 * - clients.personId (no cascade)
 * - users.personId (no cascade)
 * - plan_roles.personId and forPersonId (no cascade)
 * - estate_plans.grantorPersonId1 and grantorPersonId2 (no cascade)
 * - wills.personId (no cascade)
 * - ancillary_documents.personId (no cascade)
 * - relationships (has cascade, but we track for reporting)
 * - client_relationships (has cascade)
 * - matter_relationships (has cascade)
 * - import_duplicates.existingPersonId (no cascade)
 */
export async function safeDeletePerson(personId: string): Promise<PersonDeleteResult> {
  const db = useDrizzle()

  const result: PersonDeleteResult = {
    personId,
    deleted: false,
    cleanedUp: {
      clients: 0,
      users: 0,
      planRoles: 0,
      estatePlans: 0,
      wills: 0,
      ancillaryDocuments: 0,
      relationships: 0,
      clientRelationships: 0,
      matterRelationships: 0,
      importDuplicates: 0
    }
  }

  try {
    // 1. Delete client records (no cascade)
    const clientsDeleted = await db.delete(schema.clients)
      .where(eq(schema.clients.personId, personId))
    result.cleanedUp.clients = clientsDeleted.rowsAffected || 0

    // 2. Unlink users (set personId to null rather than delete the user)
    const usersUpdated = await db.update(schema.users)
      .set({ personId: null })
      .where(eq(schema.users.personId, personId))
    result.cleanedUp.users = usersUpdated.rowsAffected || 0

    // 3. Delete plan roles where this person is referenced
    const rolesDeleted = await db.delete(schema.planRoles)
      .where(eq(schema.planRoles.personId, personId))
    result.cleanedUp.planRoles = rolesDeleted.rowsAffected || 0

    // Also delete roles where forPersonId matches
    await db.delete(schema.planRoles)
      .where(eq(schema.planRoles.forPersonId, personId))

    // 4. Unlink from estate plans (set to null rather than delete plans)
    const plansUpdatedGrantor1 = await db.update(schema.estatePlans)
      .set({ grantorPersonId1: null as any }) // TypeScript workaround - field is notNull but we need to clean up
      .where(eq(schema.estatePlans.grantorPersonId1, personId))
    const plansUpdatedGrantor2 = await db.update(schema.estatePlans)
      .set({ grantorPersonId2: null })
      .where(eq(schema.estatePlans.grantorPersonId2, personId))
    result.cleanedUp.estatePlans = (plansUpdatedGrantor1.rowsAffected || 0) + (plansUpdatedGrantor2.rowsAffected || 0)

    // 5. Delete wills where this person is the testator
    const willsDeleted = await db.delete(schema.wills)
      .where(eq(schema.wills.personId, personId))
    result.cleanedUp.wills = willsDeleted.rowsAffected || 0

    // 6. Delete ancillary documents for this person
    const ancDocsDeleted = await db.delete(schema.ancillaryDocuments)
      .where(eq(schema.ancillaryDocuments.personId, personId))
    result.cleanedUp.ancillaryDocuments = ancDocsDeleted.rowsAffected || 0

    // 7. Delete relationships (has cascade, but delete explicitly for reporting)
    const relFromDeleted = await db.delete(schema.relationships)
      .where(eq(schema.relationships.fromPersonId, personId))
    const relToDeleted = await db.delete(schema.relationships)
      .where(eq(schema.relationships.toPersonId, personId))
    result.cleanedUp.relationships = (relFromDeleted.rowsAffected || 0) + (relToDeleted.rowsAffected || 0)

    // 8. Delete client relationships (has cascade)
    const clientRelDeleted = await db.delete(schema.clientRelationships)
      .where(eq(schema.clientRelationships.personId, personId))
    result.cleanedUp.clientRelationships = clientRelDeleted.rowsAffected || 0

    // 9. Delete matter relationships (has cascade)
    const matterRelDeleted = await db.delete(schema.matterRelationships)
      .where(eq(schema.matterRelationships.personId, personId))
    result.cleanedUp.matterRelationships = matterRelDeleted.rowsAffected || 0

    // 10. Delete import duplicates referencing this person
    const importDupsDeleted = await db.delete(schema.importDuplicates)
      .where(eq(schema.importDuplicates.existingPersonId, personId))
    result.cleanedUp.importDuplicates = importDupsDeleted.rowsAffected || 0

    // Now safe to delete the person
    await db.delete(schema.people)
      .where(eq(schema.people.id, personId))

    result.deleted = true
    return result

  } catch (error: any) {
    result.error = error.message
    return result
  }
}

/**
 * Safely delete multiple people
 */
export async function safeDeletePeople(personIds: string[]): Promise<{
  deleted: number
  failed: number
  results: PersonDeleteResult[]
}> {
  const results: PersonDeleteResult[] = []

  for (const personId of personIds) {
    const result = await safeDeletePerson(personId)
    results.push(result)
  }

  return {
    deleted: results.filter(r => r.deleted).length,
    failed: results.filter(r => !r.deleted).length,
    results
  }
}
