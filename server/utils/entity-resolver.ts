import { eq, inArray } from 'drizzle-orm'
import type { EntityType } from './activity-logger'

/**
 * Entity Name Resolver
 *
 * Resolves entity IDs to human-readable names for activity logging.
 * Used at LOG TIME to capture historical snapshots of entity names.
 * Also used at DISPLAY TIME to show current names for comparison.
 */

/**
 * Resolves a single entity ID to its current name
 */
export async function resolveEntityName(
  type: EntityType,
  id: string
): Promise<string | null> {
  const names = await resolveEntityNames([{ type, id }])
  return names.get(`${type}:${id}`) || null
}

/**
 * Batch resolves multiple entity IDs to their current names.
 * Returns a Map with keys in format "type:id" for easy lookup.
 *
 * @example
 * const names = await resolveEntityNames([
 *   { type: 'client', id: 'abc123' },
 *   { type: 'matter', id: 'def456' }
 * ])
 * names.get('client:abc123') // "John Smith"
 * names.get('matter:def456') // "Smith Family Trust 2024"
 */
export async function resolveEntityNames(
  refs: Array<{ type: EntityType; id: string }>
): Promise<Map<string, string>> {
  if (refs.length === 0) {
    return new Map()
  }

  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()
  const results = new Map<string, string>()

  // Group refs by type for efficient batched queries
  const byType = new Map<EntityType, string[]>()
  for (const ref of refs) {
    const ids = byType.get(ref.type) || []
    ids.push(ref.id)
    byType.set(ref.type, ids)
  }

  // Resolve each type in parallel
  const promises: Promise<void>[] = []

  // People (direct person lookups)
  const personIds = byType.get('person') || []
  if (personIds.length > 0) {
    promises.push(
      (async () => {
        const people = await db
          .select({
            id: schema.people.id,
            firstName: schema.people.firstName,
            lastName: schema.people.lastName,
            fullName: schema.people.fullName,
            email: schema.people.email
          })
          .from(schema.people)
          .where(inArray(schema.people.id, personIds))
          .all()

        for (const person of people) {
          const name = person.fullName || [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email || 'Unknown'
          results.set(`person:${person.id}`, name)
        }
      })()
    )
  }

  // Clients - Try new clients→people structure first, fallback to users table
  const clientIds = byType.get('client') || []
  if (clientIds.length > 0) {
    promises.push(
      (async () => {
        // First try new structure: clients → people
        const clientsWithPeople = await db
          .select({
            clientId: schema.clients.id,
            personId: schema.clients.personId,
            firstName: schema.people.firstName,
            lastName: schema.people.lastName,
            fullName: schema.people.fullName,
            email: schema.people.email
          })
          .from(schema.clients)
          .innerJoin(schema.people, eq(schema.clients.personId, schema.people.id))
          .where(inArray(schema.clients.id, clientIds))
          .all()

        const resolvedClientIds = new Set<string>()
        for (const client of clientsWithPeople) {
          const name = client.fullName || [client.firstName, client.lastName].filter(Boolean).join(' ') || client.email || 'Unknown'
          results.set(`client:${client.clientId}`, name)
          resolvedClientIds.add(client.clientId)
        }

        // Fallback: For any unresolved IDs, try legacy users table (backward compatibility)
        const unresolvedClientIds = clientIds.filter(id => !resolvedClientIds.has(id))
        if (unresolvedClientIds.length > 0) {
          const users = await db
            .select({
              id: schema.users.id,
              firstName: schema.users.firstName,
              lastName: schema.users.lastName,
              email: schema.users.email
            })
            .from(schema.users)
            .where(inArray(schema.users.id, unresolvedClientIds))
            .all()

          for (const user of users) {
            const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Unknown'
            results.set(`client:${user.id}`, name)
          }
        }
      })()
    )
  }

  // Users - Try new users→people structure first, fallback to users table
  const userIds = byType.get('user') || []
  if (userIds.length > 0) {
    promises.push(
      (async () => {
        // First try users with linked people records
        const usersWithPeople = await db
          .select({
            userId: schema.users.id,
            personId: schema.users.personId,
            userFirstName: schema.users.firstName,
            userLastName: schema.users.lastName,
            userEmail: schema.users.email,
            personFirstName: schema.people.firstName,
            personLastName: schema.people.lastName,
            personFullName: schema.people.fullName,
            personEmail: schema.people.email
          })
          .from(schema.users)
          .leftJoin(schema.people, eq(schema.users.personId, schema.people.id))
          .where(inArray(schema.users.id, userIds))
          .all()

        for (const user of usersWithPeople) {
          // Prefer person data if linked, otherwise use user data
          const name = user.personId
            ? (user.personFullName || [user.personFirstName, user.personLastName].filter(Boolean).join(' ') || user.personEmail)
            : ([user.userFirstName, user.userLastName].filter(Boolean).join(' ') || user.userEmail)
          results.set(`user:${user.userId}`, name || 'Unknown')
        }
      })()
    )
  }

  // Matters
  const matterIds = byType.get('matter') || []
  if (matterIds.length > 0) {
    promises.push(
      (async () => {
        const matters = await db
          .select({
            id: schema.matters.id,
            title: schema.matters.title
          })
          .from(schema.matters)
          .where(inArray(schema.matters.id, matterIds))
          .all()

        for (const matter of matters) {
          results.set(`matter:${matter.id}`, matter.title)
        }
      })()
    )
  }

  // Documents
  const documentIds = byType.get('document') || []
  if (documentIds.length > 0) {
    promises.push(
      (async () => {
        const documents = await db
          .select({
            id: schema.documents.id,
            title: schema.documents.title
          })
          .from(schema.documents)
          .where(inArray(schema.documents.id, documentIds))
          .all()

        for (const doc of documents) {
          results.set(`document:${doc.id}`, doc.title)
        }
      })()
    )
  }

  // Templates
  const templateIds = byType.get('template') || []
  if (templateIds.length > 0) {
    promises.push(
      (async () => {
        const templates = await db
          .select({
            id: schema.documentTemplates.id,
            name: schema.documentTemplates.name
          })
          .from(schema.documentTemplates)
          .where(inArray(schema.documentTemplates.id, templateIds))
          .all()

        for (const template of templates) {
          results.set(`template:${template.id}`, template.name)
        }
      })()
    )
  }

  // Journeys (client journeys reference the journey definition)
  const journeyIds = byType.get('journey') || []
  if (journeyIds.length > 0) {
    promises.push(
      (async () => {
        // First check if these are client journey IDs
        const clientJourneys = await db
          .select({
            id: schema.clientJourneys.id,
            journeyId: schema.clientJourneys.journeyId
          })
          .from(schema.clientJourneys)
          .where(inArray(schema.clientJourneys.id, journeyIds))
          .all()

        const journeyDefinitionIds = clientJourneys.map(cj => cj.journeyId)

        // Also check direct journey definition IDs
        const directJourneyIds = journeyIds.filter(id => !clientJourneys.find(cj => cj.id === id))
        const allJourneyDefIds = [...new Set([...journeyDefinitionIds, ...directJourneyIds])]

        if (allJourneyDefIds.length > 0) {
          const journeyDefs = await db
            .select({
              id: schema.journeys.id,
              name: schema.journeys.name
            })
            .from(schema.journeys)
            .where(inArray(schema.journeys.id, allJourneyDefIds))
            .all()

          const defNameMap = new Map(journeyDefs.map(j => [j.id, j.name]))

          // Map client journey IDs to names
          for (const cj of clientJourneys) {
            const name = defNameMap.get(cj.journeyId)
            if (name) {
              results.set(`journey:${cj.id}`, name)
            }
          }

          // Map direct journey definition IDs
          for (const id of directJourneyIds) {
            const name = defNameMap.get(id)
            if (name) {
              results.set(`journey:${id}`, name)
            }
          }
        }
      })()
    )
  }

  // Referral Partners
  const referralPartnerIds = byType.get('referral_partner') || []
  if (referralPartnerIds.length > 0) {
    promises.push(
      (async () => {
        const partners = await db
          .select({
            id: schema.referralPartners.id,
            name: schema.referralPartners.name
          })
          .from(schema.referralPartners)
          .where(inArray(schema.referralPartners.id, referralPartnerIds))
          .all()

        for (const partner of partners) {
          results.set(`referral_partner:${partner.id}`, partner.name)
        }
      })()
    )
  }

  // Services (service catalog)
  const serviceIds = byType.get('service') || []
  if (serviceIds.length > 0) {
    promises.push(
      (async () => {
        const services = await db
          .select({
            id: schema.serviceCatalog.id,
            name: schema.serviceCatalog.name
          })
          .from(schema.serviceCatalog)
          .where(inArray(schema.serviceCatalog.id, serviceIds))
          .all()

        for (const service of services) {
          results.set(`service:${service.id}`, service.name)
        }
      })()
    )
  }

  // Appointments
  const appointmentIds = byType.get('appointment') || []
  if (appointmentIds.length > 0) {
    promises.push(
      (async () => {
        const appointments = await db
          .select({
            id: schema.appointments.id,
            title: schema.appointments.title
          })
          .from(schema.appointments)
          .where(inArray(schema.appointments.id, appointmentIds))
          .all()

        for (const appointment of appointments) {
          results.set(`appointment:${appointment.id}`, appointment.title)
        }
      })()
    )
  }

  // Notes - Notes don't have names, use generic label
  const noteIds = byType.get('note') || []
  for (const noteId of noteIds) {
    results.set(`note:${noteId}`, 'Note')
  }

  // Settings - Use the key name
  const settingIds = byType.get('setting') || []
  if (settingIds.length > 0) {
    promises.push(
      (async () => {
        const settings = await db
          .select({
            id: schema.settings.id,
            key: schema.settings.key
          })
          .from(schema.settings)
          .where(inArray(schema.settings.id, settingIds))
          .all()

        for (const setting of settings) {
          results.set(`setting:${setting.id}`, setting.key)
        }
      })()
    )
  }

  // Estate Plans
  const estatePlanIds = byType.get('estate_plan') || []
  if (estatePlanIds.length > 0) {
    promises.push(
      (async () => {
        const plans = await db
          .select({
            id: schema.estatePlans.id,
            planName: schema.estatePlans.planName
          })
          .from(schema.estatePlans)
          .where(inArray(schema.estatePlans.id, estatePlanIds))
          .all()

        for (const plan of plans) {
          results.set(`estate_plan:${plan.id}`, plan.planName || 'Estate Plan')
        }
      })()
    )
  }

  await Promise.all(promises)
  return results
}

/**
 * Gets the URL path for an entity type and ID.
 * Returns null if the entity type doesn't have a corresponding page.
 */
export function getEntityLink(type: EntityType, id: string): string | null {
  const routes: Record<EntityType, string | null> = {
    user: `/users/${id}`,
    person: `/people/${id}`,
    client: `/clients/${id}`,
    matter: `/matters/${id}`,
    document: `/documents/${id}`,
    journey: `/journeys/${id}`,
    template: `/templates/${id}`,
    referral_partner: `/referral-partners/${id}`,
    service: `/services/${id}`,
    appointment: `/appointments/${id}`,
    note: null, // Notes don't have their own page
    setting: `/settings`, // Settings link to the settings page
    estate_plan: `/estate-plans/${id}`
  }

  return routes[type]
}

/**
 * Gets a human-readable label for an entity type.
 */
export function getEntityTypeLabel(type: EntityType): string {
  const labels: Record<EntityType, string> = {
    user: 'User',
    person: 'Person',
    client: 'Client',
    matter: 'Matter',
    document: 'Document',
    journey: 'Journey',
    template: 'Template',
    referral_partner: 'Referral Partner',
    service: 'Service',
    appointment: 'Appointment',
    note: 'Note',
    setting: 'Setting',
    estate_plan: 'Estate Plan'
  }

  return labels[type]
}
